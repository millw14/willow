import "server-only";
import { PublicKey } from "@solana/web3.js";
import {
  getConnection,
  getTreasuryAddress,
  USDC_MINT,
  WISH_PRICE_BASE,
} from "@/lib/solana";

export interface PaymentCheck {
  ok: boolean;
  reason?: string;
  amount?: number; // base units actually received by treasury
  payer?: string;
}

/**
 * Verify that `signature` is a confirmed transaction in which `expectedPayer`
 * sent at least the wish price in USDC to the treasury wallet.
 *
 * Replay protection (one signature = one wish) is enforced separately in the
 * store via a unique constraint on payment_signature.
 */
export async function verifyPayment(
  signature: string,
  expectedPayer: string,
): Promise<PaymentCheck> {
  const treasury = getTreasuryAddress();
  if (!treasury) return { ok: false, reason: "Treasury not configured." };

  if (!/^[1-9A-HJ-NP-Za-km-z]{64,96}$/.test(signature)) {
    return { ok: false, reason: "Malformed signature." };
  }

  let payerKey: PublicKey;
  try {
    payerKey = new PublicKey(expectedPayer);
  } catch {
    return { ok: false, reason: "Invalid payer address." };
  }

  const conn = getConnection();
  const tx = await conn.getParsedTransaction(signature, {
    maxSupportedTransactionVersion: 0,
    commitment: "confirmed",
  });

  if (!tx) return { ok: false, reason: "Offering not found on chain yet." };
  if (tx.meta?.err) return { ok: false, reason: "The offering failed on chain." };

  const pre = tx.meta?.preTokenBalances ?? [];
  const post = tx.meta?.postTokenBalances ?? [];
  const treasuryStr = treasury.toBase58();
  const usdcStr = USDC_MINT.toBase58();

  const treasuryBefore = pre.find(
    (b) => b.owner === treasuryStr && b.mint === usdcStr,
  );
  const treasuryAfter = post.find(
    (b) => b.owner === treasuryStr && b.mint === usdcStr,
  );

  const before = BigInt(treasuryBefore?.uiTokenAmount.amount ?? "0");
  const after = BigInt(treasuryAfter?.uiTokenAmount.amount ?? "0");
  const received = after - before;

  if (received < BigInt(WISH_PRICE_BASE)) {
    return {
      ok: false,
      reason: "The willow did not receive the full offering.",
      amount: Number(received),
    };
  }

  // The payer must have signed the transaction.
  const signers = tx.transaction.message.accountKeys
    .filter((k) => k.signer)
    .map((k) => k.pubkey.toBase58());
  if (!signers.includes(payerKey.toBase58())) {
    return { ok: false, reason: "This offering was made by another soul." };
  }

  return { ok: true, amount: Number(received), payer: payerKey.toBase58() };
}
