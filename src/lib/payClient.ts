"use client";

import {
  Connection,
  PublicKey,
  Transaction,
  type TransactionSignature,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferInstruction,
} from "@solana/spl-token";
import type { TreasuryConfig } from "@/lib/types";

let cachedConfig: TreasuryConfig | null = null;

export async function getTreasuryConfig(): Promise<TreasuryConfig> {
  if (cachedConfig) return cachedConfig;
  const res = await fetch("/api/treasury");
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
}

/**
 * Transfer the wish price in USDC from the connected wallet to the treasury.
 * Creates the treasury's USDC token account if it doesn't exist (idempotent),
 * waits for confirmation, and returns the signature used to verify server-side.
 */
export async function payForWish({
  connection,
  payer,
  sendTransaction,
  config,
}: PayParams): Promise<string> {
  if (!config.treasury) throw new Error("The willow is not accepting offerings.");

  const mint = new PublicKey(config.usdcMint);
  const treasury = new PublicKey(config.treasury);
  const payerAta = getAssociatedTokenAddressSync(mint, payer);
  const treasuryAta = getAssociatedTokenAddressSync(mint, treasury, true);

  // Confirm the seeker actually holds enough USDC before prompting a signature.
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
  tx.add(
    createAssociatedTokenAccountIdempotentInstruction(payer, treasuryAta, treasury, mint),
  );
  tx.add(
    createTransferInstruction(payerAta, treasuryAta, payer, config.priceBase),
  );

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.feePayer = payer;

  const signature = await sendTransaction(tx, connection);
  const result = await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "confirmed",
  );
  if (result.value.err) {
    throw new Error("The offering failed to settle.");
  }
  return signature;
}
