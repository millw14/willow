import "server-only";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import bs58 from "bs58";

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

// The token that gets bought & burned every N wishes.
export const WISH_TOKEN_MINT = new PublicKey(
  process.env.WISH_TOKEN_MINT || "2VkpEcZ7zUVWZ8RUPuhKjaARw2vPUnhV2dcmco7spump",
);

// Price per wish, in whole USDC. Default 6.99.
export const WISH_PRICE_USDC = Number(process.env.WISH_PRICE_USDC || "6.99");
export const WISH_PRICE_BASE = Math.round(WISH_PRICE_USDC * 10 ** USDC_DECIMALS);

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
