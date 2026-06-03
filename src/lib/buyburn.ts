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
  SOL_MINT,
  WISH_TOKEN_MINT,
  FEE_RESERVE_RATIO,
} from "@/lib/solana";

export interface BurnEvent {
  id: string;
  spent_usdc: number; // base units of USDC swapped
  spent_sol: number; // lamports of SOL swapped
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
const MIN_SWAP_USDC_BASE = Number(process.env.MIN_SWAP_USDC || "0.05") * 1_000_000;
const MIN_SWAP_SOL_LAMPORTS = Number(process.env.MIN_SWAP_SOL || "0.005") * 1_000_000_000;
const MIN_SOL_LAMPORTS = 8_000_000; // ~0.008 SOL kept for fees at minimum

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

/** Swap `amount` base units of `inputMint` into the wish token, into treasury. */
async function swapToToken(
  inputMint: PublicKey,
  amount: bigint,
  wrapAndUnwrapSol: boolean,
): Promise<{ ok: boolean; signature: string | null; reason?: string }> {
  const treasury = getTreasury()!;
  const conn = getConnection();

  const quoteUrl =
    `${JUP_BASE}/quote?inputMint=${inputMint.toBase58()}` +
    `&outputMint=${WISH_TOKEN_MINT.toBase58()}` +
    `&amount=${amount.toString()}` +
    `&slippageBps=${SLIPPAGE_BPS}&swapMode=ExactIn`;

  const quoteRes = await fetch(quoteUrl, { headers: jupHeaders() });
  if (!quoteRes.ok) return { ok: false, signature: null, reason: `Quote failed (${quoteRes.status}).` };
  const quote = await quoteRes.json();
  if (quote.error) return { ok: false, signature: null, reason: `Quote: ${quote.error}` };

  const swapRes = await fetch(`${JUP_BASE}/swap`, {
    method: "POST",
    headers: jupHeaders(),
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: treasury.publicKey.toBase58(),
      wrapAndUnwrapSol,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: {
        priorityLevelWithMaxLamports: { maxLamports: 1_000_000, priorityLevel: "medium" },
      },
    }),
  });
  if (!swapRes.ok) return { ok: false, signature: null, reason: `Swap build failed (${swapRes.status}).` };
  const swapJson = await swapRes.json();
  if (!swapJson.swapTransaction) return { ok: false, signature: null, reason: "No swap transaction." };

  const swapTx = VersionedTransaction.deserialize(Buffer.from(swapJson.swapTransaction, "base64"));
  swapTx.sign([treasury]);
  const sig = await conn.sendRawTransaction(swapTx.serialize(), { skipPreflight: false, maxRetries: 3 });
  const ok = await pollConfirm(sig);
  return { ok, signature: sig, reason: ok ? undefined : "Swap did not confirm." };
}

/**
 * Buy & burn: swap the treasury's spendable USDC *and* SOL into the wish token,
 * then burn every token received. Leaves FEE_RESERVE_RATIO (default 10%) of each
 * balance behind for fees. Safe to call repeatedly; a lock prevents overlapping
 * runs.
 */
export async function buyAndBurn(): Promise<BurnEvent> {
  const base: BurnEvent = {
    id: `burn-${Date.now()}`,
    spent_usdc: 0,
    spent_sol: 0,
    burned: 0,
    swap_signature: null,
    burn_signature: null,
    status: "skipped",
    created_at: new Date().toISOString(),
  };

  const treasury = getTreasury();
  if (!treasury) return { ...base, reason: "Treasury not configured." };
  if (running) return { ...base, reason: "A burn is already in progress." };
  running = true;

  try {
    const conn = getConnection();

    const solBalance = await conn.getBalance(treasury.publicKey);
    if (solBalance < MIN_SOL_LAMPORTS) {
      return { ...base, reason: "Treasury low on SOL for fees." };
    }

    // Spendable USDC: 90% of balance.
    const usdcAta = ataFor(USDC_MINT, treasury.publicKey);
    const usdcBalance = await tokenBalance(usdcAta);
    const usdcSpendable = (usdcBalance * BigInt(Math.round((1 - FEE_RESERVE_RATIO) * 1000))) / 1000n;

    // Spendable SOL: balance minus a reserve (max of 10% or the fee floor).
    const reserve = Math.max(Math.floor(solBalance * FEE_RESERVE_RATIO), MIN_SOL_LAMPORTS);
    const solSpendable = BigInt(Math.max(0, solBalance - reserve));

    const doUsdc = usdcSpendable >= BigInt(Math.floor(MIN_SWAP_USDC_BASE));
    const doSol = solSpendable >= BigInt(Math.floor(MIN_SWAP_SOL_LAMPORTS));

    if (!doUsdc && !doSol) {
      return { ...base, reason: "Not enough USDC or SOL to buy & burn yet." };
    }

    let spentUsdc = 0;
    let spentSol = 0;
    let lastSwapSig: string | null = null;
    let anySwapOk = false;
    const reasons: string[] = [];

    if (doUsdc) {
      const r = await swapToToken(USDC_MINT, usdcSpendable, false);
      lastSwapSig = r.signature ?? lastSwapSig;
      if (r.ok) {
        anySwapOk = true;
        spentUsdc = Number(usdcSpendable);
      } else if (r.reason) reasons.push(`USDC: ${r.reason}`);
    }

    if (doSol) {
      const r = await swapToToken(SOL_MINT, solSpendable, true);
      lastSwapSig = r.signature ?? lastSwapSig;
      if (r.ok) {
        anySwapOk = true;
        spentSol = Number(solSpendable);
      } else if (r.reason) reasons.push(`SOL: ${r.reason}`);
    }

    if (!anySwapOk) {
      return {
        ...base,
        status: "failed",
        swap_signature: lastSwapSig,
        reason: reasons.join(" ") || "Swaps did not confirm.",
      };
    }

    // ── Burn everything we just bought ──
    const tokenProgram = await getTokenProgramId(WISH_TOKEN_MINT);
    const wishAta = ataFor(WISH_TOKEN_MINT, treasury.publicKey, tokenProgram);
    const toBurn = await tokenBalance(wishAta);

    if (toBurn <= 0n) {
      return {
        ...base,
        status: "completed",
        swap_signature: lastSwapSig,
        spent_usdc: spentUsdc,
        spent_sol: spentSol,
        burned: 0,
        reason: "Swapped, but no tokens to burn.",
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

    const { blockhash } = await conn.getLatestBlockhash("confirmed");
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
    const burnOk = await pollConfirm(burnSig);

    return {
      ...base,
      status: burnOk ? "completed" : "failed",
      swap_signature: lastSwapSig,
      burn_signature: burnSig,
      spent_usdc: spentUsdc,
      spent_sol: spentSol,
      burned: Number(toBurn),
      reason: burnOk ? (reasons.length ? reasons.join(" ") : undefined) : "Burn did not confirm.",
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
