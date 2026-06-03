import { NextResponse } from "next/server";
import {
  getTreasuryAddress,
  paymentsEnabled,
  USDC_MINT,
  USDC_DECIMALS,
  WISH_PRICE_USDC,
  WISH_PRICE_BASE,
  BURN_EVERY,
  RPC_URL,
} from "@/lib/solana";
import type { TreasuryConfig } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const treasury = getTreasuryAddress();
  const config: TreasuryConfig = {
    paymentsEnabled: paymentsEnabled(),
    treasury: treasury?.toBase58() ?? null,
    usdcMint: USDC_MINT.toBase58(),
    priceUsdc: WISH_PRICE_USDC,
    priceBase: WISH_PRICE_BASE,
    usdcDecimals: USDC_DECIMALS,
    burnEvery: BURN_EVERY,
    rpcUrl: RPC_URL,
  };
  return NextResponse.json(config);
}
