export type WishCategory = "recent" | "popular" | "strange" | "funny";

export interface Wish {
  id: string;
  wallet_address: string;
  wish_text: string;
  wish_hash: string;
  wish_number: number;
  oracle_response: string | null;
  wallet_status: "spent";
  created_at: string;
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
}
