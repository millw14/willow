import "server-only";
import {
  PublicKey,
  VersionedTransaction,
  TransactionMessage,
} from "@solana/web3.js";
import { createBurnInstruction } from "@solana/spl-token";
import {
  getConnection,
  getTreasury,
  getTokenProgramId,
  ataFor,
  USDC_MINT,
  WISH_TOKEN_MINT,
  FEE_RESERVE_RATIO,
} from "@/lib/solana";

export interface BurnEvent {
  id: string;
  spent_usdc: number; // base units of USDC swapped
  burned: number; // base units of token burned
  swap_signature: string | null;
  burn_signature: string | null;
  status: "completed" | "skipped" | "failed";
  reason?: string;
  created_at: string;
}

const JUP_BASE = process.env.JUPITER_API_URL || "https://lite-api.jup.ag/swap/v1";
const JUP_API_KEY = process.env.JUPITER_API_KEY || "";
const SLIPPAGE_BPS = Number(process.env.JUP_SLIPPAGE_BPS || "500");
// Don't bother swapping dust or risking a run without gas.
const MIN_SWAP_BASE = Number(process.env.MIN_SWAP_USDC || "0.05") * 1_000_000;
const MIN_SOL_LAMPORTS = 5_000_000; // ~0.005 SOL for fees

let running = false;

function jupHeaders(): HeadersInit {
  const h: HeadersInit = { "Content-Type": "application/json" };
  if (JUP_API_KEY) (h as Record<string, string>)["x-api-key"] = JUP_API_KEY;
  return h;
}

async function pollConfirm(signature: string, timeoutMs = 60_000): Promise<boolean> {
  const conn = getConnection();
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { value } = await conn.getSignatureStatuses([signature]);
    const st = value[0];
    if (st?.err) return false;
    if (st && (st.confirmationStatus === "confirmed" || st.confirmationStatus === "finalized")) {
      return true;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

async function tokenBalance(ata: PublicKey): Promise<bigint> {
  try {
    const bal = await getConnection().getTokenAccountBalance(ata);
    return BigInt(bal.value.amount);
  } catch {
    return 0n;
  }
}

/**
 * Buy & burn: swap 90% of the treasury's USDC into the wish token, then burn
 * every token received. Leaves FEE_RESERVE_RATIO (default 10%) of USDC behind
 * for fees. Safe to call repeatedly; a lock prevents overlapping runs.
 */
export async function buyAndBurn(): Promise<BurnEvent> {
  const now = new Date().toISOString();
  const base: BurnEvent = {
    id: `burn-${Date.now()}`,
    spent_usdc: 0,
    burned: 0,
    swap_signature: null,
    burn_signature: null,
    status: "skipped",
    created_at: now,
  };

  const treasury = getTreasury();
  if (!treasury) return { ...base, reason: "Treasury not configured." };

  if (running) return { ...base, reason: "A burn is already in progress." };
  running = true;

  try {
    const conn = getConnection();

    // Gas check — never strand the treasury without fees.
    const sol = await conn.getBalance(treasury.publicKey);
    if (sol < MIN_SOL_LAMPORTS) {
      return { ...base, reason: "Treasury low on SOL for fees." };
    }

    // How much USDC can we spend? Leave the reserve behind.
    const usdcAta = ataFor(USDC_MINT, treasury.publicKey);
    const usdcBalance = await tokenBalance(usdcAta);
    const spendable = (usdcBalance * BigInt(Math.round((1 - FEE_RESERVE_RATIO) * 1000))) / 1000n;

    if (spendable < BigInt(Math.floor(MIN_SWAP_BASE))) {
      return { ...base, reason: "Not enough USDC to buy & burn yet." };
    }

    // ── 1. Jupiter quote (USDC -> wish token, exact in) ──
    const quoteUrl =
      `${JUP_BASE}/quote?inputMint=${USDC_MINT.toBase58()}` +
      `&outputMint=${WISH_TOKEN_MINT.toBase58()}` +
      `&amount=${spendable.toString()}` +
      `&slippageBps=${SLIPPAGE_BPS}&swapMode=ExactIn`;

    const quoteRes = await fetch(quoteUrl, { headers: jupHeaders() });
    if (!quoteRes.ok) {
      return { ...base, status: "failed", reason: `Quote failed (${quoteRes.status}).` };
    }
    const quote = await quoteRes.json();
    if (quote.error) {
      return { ...base, status: "failed", reason: `Quote: ${quote.error}` };
    }

    // ── 2. Jupiter swap transaction ──
    const swapRes = await fetch(`${JUP_BASE}/swap`, {
      method: "POST",
      headers: jupHeaders(),
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey: treasury.publicKey.toBase58(),
        wrapAndUnwrapSol: false,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: {
          priorityLevelWithMaxLamports: {
            maxLamports: 1_000_000,
            priorityLevel: "medium",
          },
        },
      }),
    });
    if (!swapRes.ok) {
      return { ...base, status: "failed", reason: `Swap build failed (${swapRes.status}).` };
    }
    const swapJson = await swapRes.json();
    if (!swapJson.swapTransaction) {
      return { ...base, status: "failed", reason: "Swap: no transaction returned." };
    }

    const swapTx = VersionedTransaction.deserialize(
      Buffer.from(swapJson.swapTransaction, "base64"),
    );
    swapTx.sign([treasury]);

    const swapSig = await conn.sendRawTransaction(swapTx.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    });
    const swapOk = await pollConfirm(swapSig);
    if (!swapOk) {
      return {
        ...base,
        status: "failed",
        swap_signature: swapSig,
        spent_usdc: Number(spendable),
        reason: "Swap did not confirm.",
      };
    }

    // ── 3. Burn everything we just bought ──
    const tokenProgram = await getTokenProgramId(WISH_TOKEN_MINT);
    const wishAta = ataFor(WISH_TOKEN_MINT, treasury.publicKey, tokenProgram);
    const toBurn = await tokenBalance(wishAta);

    if (toBurn <= 0n) {
      return {
        ...base,
        status: "completed",
        swap_signature: swapSig,
        spent_usdc: Number(spendable),
        burned: 0,
        reason: "Swapped, but no tokens to burn (already routed?).",
      };
    }

    const burnIx = createBurnInstruction(
      wishAta,
      WISH_TOKEN_MINT,
      treasury.publicKey,
      toBurn,
      [],
      tokenProgram,
    );

    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
    const msg = new TransactionMessage({
      payerKey: treasury.publicKey,
      recentBlockhash: blockhash,
      instructions: [burnIx],
    }).compileToV0Message();
    const burnTx = new VersionedTransaction(msg);
    burnTx.sign([treasury]);

    const burnSig = await conn.sendRawTransaction(burnTx.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    });
    void lastValidBlockHeight;
    const burnOk = await pollConfirm(burnSig);

    return {
      ...base,
      status: burnOk ? "completed" : "failed",
      swap_signature: swapSig,
      burn_signature: burnSig,
      spent_usdc: Number(spendable),
      burned: Number(toBurn),
      reason: burnOk ? undefined : "Burn did not confirm.",
    };
  } catch (err) {
    return {
      ...base,
      status: "failed",
      reason: err instanceof Error ? err.message : "Unknown buy & burn error.",
    };
  } finally {
    running = false;
  }
}
