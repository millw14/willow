import "server-only";
import { PublicKey } from "@solana/web3.js";
import {
  getConnection,
  getTreasuryAddress,
  getSolPriceUsd,
  wishPriceLamports,
  USDC_MINT,
  WISH_PRICE_BASE,
  type WishCurrency,
} from "@/lib/solana";

export interface PaymentCheck {
  ok: boolean;
  reason?: string;
  amount?: number; // base units actually received by treasury (USDC) or lamports (SOL)
  payer?: string;
}

// Grace for SOL price drift between client build and server verification.
const SOL_TOLERANCE = 0.1; // accept >= 90% of the live-priced amount

/**
 * Verify that `signature` is a confirmed transaction in which `expectedPayer`
 * paid at least the wish price to the treasury — in USDC (SPL transfer) or SOL
 * (native transfer), depending on `currency`.
 *
 * Replay protection (one signature = one wish) is enforced separately in the
 * store via a unique constraint on payment_signature.
 */
export async function verifyPayment(
  signature: string,
  expectedPayer: string,
  currency: WishCurrency = "usdc",
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

  // The payer must have signed the transaction.
  const accountKeys = tx.transaction.message.accountKeys;
  const signers = accountKeys.filter((k) => k.signer).map((k) => k.pubkey.toBase58());
  if (!signers.includes(payerKey.toBase58())) {
    return { ok: false, reason: "This offering was made by another soul." };
  }

  const treasuryStr = treasury.toBase58();

  if (currency === "sol") {
    const idx = accountKeys.findIndex((k) => k.pubkey.toBase58() === treasuryStr);
    if (idx < 0) return { ok: false, reason: "The willow was not paid in this offering." };

    const pre = tx.meta?.preBalances?.[idx] ?? 0;
    const post = tx.meta?.postBalances?.[idx] ?? 0;
    const received = post - pre;

    const solPrice = await getSolPriceUsd();
    if (!solPrice) return { ok: false, reason: "Could not price the SOL offering. Try USDC." };
    const expected = Math.floor(wishPriceLamports(solPrice) * (1 - SOL_TOLERANCE));

    if (received < expected) {
      return { ok: false, reason: "The willow did not receive the full offering.", amount: received };
    }
    return { ok: true, amount: received, payer: payerKey.toBase58() };
  }

  // ── USDC ──
  const usdcStr = USDC_MINT.toBase58();
  const pre = tx.meta?.preTokenBalances ?? [];
  const post = tx.meta?.postTokenBalances ?? [];

  const before = BigInt(
    pre.find((b) => b.owner === treasuryStr && b.mint === usdcStr)?.uiTokenAmount.amount ?? "0",
  );
  const after = BigInt(
    post.find((b) => b.owner === treasuryStr && b.mint === usdcStr)?.uiTokenAmount.amount ?? "0",
  );
  const received = after - before;

  if (received < BigInt(WISH_PRICE_BASE)) {
    return {
      ok: false,
      reason: "The willow did not receive the full offering.",
      amount: Number(received),
    };
  }
  return { ok: true, amount: Number(received), payer: payerKey.toBase58() };
}
