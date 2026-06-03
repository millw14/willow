export type WishCategory = "recent" | "popular" | "strange" | "funny";

export interface Wish {
  id: string;
  wallet_address: string;
  wish_text: string;
  wish_hash: string;
  wish_number: number;
  oracle_response: string | null;
  wallet_status: "spent";
  payment_signature: string | null;
  created_at: string;
}

export type WishCurrency = "usdc" | "sol";

export interface TreasuryConfig {
  paymentsEnabled: boolean;
  treasury: string | null;
  usdcMint: string;
  priceUsdc: number;
  priceBase: number;
  usdcDecimals: number;
  burnEvery: number;
  rpcUrl: string;
  acceptsUsdc: boolean;
  acceptsSol: boolean;
  /** Live SOL/USD price, null if unavailable (then SOL is unavailable). */
  solPriceUsd: number | null;
  /** Lamports equal to the wish price right now, null if SOL price unavailable. */
  priceLamports: number | null;
}

export interface WishStatus {
  hasWished: boolean;
  wish?: Pick<Wish, "wish_text" | "oracle_response" | "wish_number" | "created_at">;
}

export interface CreateWishResult {
  ok: boolean;
  alreadyWished: boolean;
  wish?: Wish;
  oracle?: string;
  error?: string;
  /** True when this wish tripped the buy-and-burn threshold. */
  burnTriggered?: boolean;
}
