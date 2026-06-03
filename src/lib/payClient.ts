"use client";

import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  type TransactionSignature,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferInstruction,
} from "@solana/spl-token";
import type { TreasuryConfig, WishCurrency } from "@/lib/types";

let cachedConfig: TreasuryConfig | null = null;

/** Fetch treasury config. Pass force=true to bypass cache (SOL price moves). */
export async function getTreasuryConfig(force = false): Promise<TreasuryConfig> {
  if (cachedConfig && !force) return cachedConfig;
  const res = await fetch("/api/treasury", { cache: "no-store" });
  cachedConfig = (await res.json()) as TreasuryConfig;
  return cachedConfig;
}

type SendFn = (
  transaction: Transaction,
  connection: Connection,
) => Promise<TransactionSignature>;

interface PayParams {
  connection: Connection;
  payer: PublicKey;
  sendTransaction: SendFn;
  config: TreasuryConfig;
  currency: WishCurrency;
}

async function sendAndConfirm(
  connection: Connection,
  tx: Transaction,
  payer: PublicKey,
  sendTransaction: SendFn,
): Promise<string> {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.feePayer = payer;
  const signature = await sendTransaction(tx, connection);
  const result = await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "confirmed",
  );
  if (result.value.err) throw new Error("The offering failed to settle.");
  return signature;
}

/**
 * Transfer the wish price from the connected wallet to the treasury, in USDC or
 * SOL, wait for confirmation, and return the signature used to verify server-side.
 */
export async function payForWish({
  connection,
  payer,
  sendTransaction,
  config,
  currency,
}: PayParams): Promise<string> {
  if (!config.treasury) throw new Error("The willow is not accepting offerings.");
  const treasury = new PublicKey(config.treasury);

  if (currency === "sol") {
    // Re-fetch fresh lamports so we charge the live SOL value of the price.
    const fresh = await getTreasuryConfig(true);
    const lamports = fresh.priceLamports;
    if (!lamports) throw new Error("Could not price SOL right now — try USDC.");

    const balance = await connection.getBalance(payer);
    if (balance < lamports + 5_000_000) {
      throw new Error(`You need ~${(lamports / 1e9).toFixed(4)} SOL (plus fees).`);
    }

    const tx = new Transaction().add(
      SystemProgram.transfer({ fromPubkey: payer, toPubkey: treasury, lamports }),
    );
    return sendAndConfirm(connection, tx, payer, sendTransaction);
  }

  // ── USDC ──
  const mint = new PublicKey(config.usdcMint);
  const payerAta = getAssociatedTokenAddressSync(mint, payer);
  const treasuryAta = getAssociatedTokenAddressSync(mint, treasury, true);

  let held = 0n;
  try {
    const bal = await connection.getTokenAccountBalance(payerAta);
    held = BigInt(bal.value.amount);
  } catch {
    throw new Error(`You need ${config.priceUsdc} USDC to make a wish.`);
  }
  if (held < BigInt(config.priceBase)) {
    throw new Error(`You need ${config.priceUsdc} USDC — your wallet holds less.`);
  }

  const tx = new Transaction();
  tx.add(createAssociatedTokenAccountIdempotentInstruction(payer, treasuryAta, treasury, mint));
  tx.add(createTransferInstruction(payerAta, treasuryAta, payer, config.priceBase));
  return sendAndConfirm(connection, tx, payer, sendTransaction);
}
