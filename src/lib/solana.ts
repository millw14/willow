import "server-only";
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import bs58 from "bs58";

export type WishCurrency = "usdc" | "sol";

/**
 * Central Solana config for the wish economy.
 *
 * Real money lives here. The treasury secret key is read ONLY on the server
 * (never NEXT_PUBLIC) and is never returned to the client or logged.
 */

// USDC on Solana mainnet (6 decimals). Override for devnet testing.
export const USDC_MINT = new PublicKey(
  process.env.USDC_MINT || "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
);
export const USDC_DECIMALS = 6;

// Wrapped SOL mint — used for native SOL pricing and Jupiter SOL swaps.
export const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");

// The token that gets bought & burned every N wishes.
export const WISH_TOKEN_MINT = new PublicKey(
  process.env.WISH_TOKEN_MINT || "2VkpEcZ7zUVWZ8RUPuhKjaARw2vPUnhV2dcmco7spump",
);

// Price per wish, in whole USD. Default 6.99 (charged in USDC or SOL-equivalent).
export const WISH_PRICE_USDC = Number(process.env.WISH_PRICE_USDC || "6.99");
export const WISH_PRICE_BASE = Math.round(WISH_PRICE_USDC * 10 ** USDC_DECIMALS);

// Which currencies a seeker may pay with: "usdc", "sol", or "both".
const CURRENCY_MODE = (process.env.WISH_CURRENCY || "both").toLowerCase();
export const ACCEPTS_USDC = CURRENCY_MODE === "usdc" || CURRENCY_MODE === "both";
export const ACCEPTS_SOL = CURRENCY_MODE === "sol" || CURRENCY_MODE === "both";

const JUPITER_API_KEY = process.env.JUPITER_API_KEY || "";
const JUPITER_PRICE_URL =
  process.env.JUPITER_PRICE_URL || "https://lite-api.jup.ag/price/v3";

/** Live SOL/USD price from Jupiter Price API v3. Returns null on failure. */
export async function getSolPriceUsd(): Promise<number | null> {
  try {
    const url = `${JUPITER_PRICE_URL}?ids=${SOL_MINT.toBase58()}`;
    const headers: HeadersInit | undefined = JUPITER_API_KEY
      ? { "x-api-key": JUPITER_API_KEY }
      : undefined;
    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    const entry = json?.[SOL_MINT.toBase58()] ?? json?.data?.[SOL_MINT.toBase58()];
    const price =
      typeof entry?.usdPrice === "number"
        ? entry.usdPrice
        : entry?.price
          ? parseFloat(entry.price)
          : null;
    return typeof price === "number" && price > 0 ? price : null;
  } catch {
    return null;
  }
}

/** Lamports equal to the wish price at the given SOL/USD price. */
export function wishPriceLamports(solPriceUsd: number): number {
  return Math.round((WISH_PRICE_USDC / solPriceUsd) * LAMPORTS_PER_SOL);
}

// Buy & burn cadence and the fee buffer to leave behind.
export const BURN_EVERY = Number(process.env.BURN_EVERY || "3");
export const FEE_RESERVE_RATIO = Number(process.env.FEE_RESERVE_RATIO || "0.10");

export const RPC_URL =
  process.env.SOLANA_RPC ||
  process.env.NEXT_PUBLIC_SOLANA_RPC ||
  "https://api.mainnet-beta.solana.com";

let connection: Connection | null = null;
export function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(RPC_URL, "confirmed");
  }
  return connection;
}

let treasury: Keypair | null = null;
let treasuryResolved = false;

/** Parse a secret key from base58 or a JSON byte array. Returns null if absent/invalid. */
function parseSecret(raw: string | undefined): Keypair | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  try {
    if (trimmed.startsWith("[")) {
      const bytes = Uint8Array.from(JSON.parse(trimmed) as number[]);
      return Keypair.fromSecretKey(bytes);
    }
    return Keypair.fromSecretKey(bs58.decode(trimmed));
  } catch {
    return null;
  }
}

export function getTreasury(): Keypair | null {
  if (!treasuryResolved) {
    treasury = parseSecret(process.env.TREASURY_SECRET_KEY);
    treasuryResolved = true;
  }
  return treasury;
}

export function getTreasuryAddress(): PublicKey | null {
  return getTreasury()?.publicKey ?? null;
}

/** Payments are only required when a treasury wallet is configured. */
export function paymentsEnabled(): boolean {
  return getTreasuryAddress() !== null;
}

/** Resolve which token program owns a mint (classic SPL vs Token-2022). */
export async function getTokenProgramId(mint: PublicKey): Promise<PublicKey> {
  const info = await getConnection().getAccountInfo(mint);
  if (info?.owner.equals(TOKEN_2022_PROGRAM_ID)) return TOKEN_2022_PROGRAM_ID;
  return TOKEN_PROGRAM_ID;
}

export function ataFor(mint: PublicKey, owner: PublicKey, programId = TOKEN_PROGRAM_ID) {
  return getAssociatedTokenAddressSync(mint, owner, true, programId);
}

export function explorerTx(sig: string): string {
  return `https://solscan.io/tx/${sig}`;
}
