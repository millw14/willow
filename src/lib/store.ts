import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Wish, WishCategory, WishStatus, CreateWishResult } from "@/lib/types";
import { SEED_WISHES, SEED_BASE_COUNT } from "@/data/seedWishes";
import { consultOracle } from "@/lib/oracle";
import { verifyPayment } from "@/lib/payments";
import { buyAndBurn, type BurnEvent } from "@/lib/buyburn";
import { paymentsEnabled, BURN_EVERY, type WishCurrency } from "@/lib/solana";

/**
 * Wish store. Uses Supabase when env keys are present; otherwise falls back to
 * an in-memory store seeded with curated wishes ("candlelight mode") so the
 * full experience runs with zero configuration.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;
export function hasSupabase(): boolean {
  return Boolean(SUPABASE_URL && (SERVICE_KEY || ANON_KEY));
}

function getClient(): SupabaseClient | null {
  if (!hasSupabase()) return null;
  if (!supabase) {
    supabase = createClient(SUPABASE_URL!, (SERVICE_KEY || ANON_KEY)!, {
      auth: { persistSession: false },
    });
  }
  return supabase;
}

// ── In-memory fallback ──
// Anchored on globalThis so every route handler in the same Node process shares
// one store (Next compiles each route into its own module graph in dev, and
// each would otherwise get a private copy). For multi-instance production,
// configure Supabase — that is the durable, shared source of truth.
interface MemStore {
  wishes: Wish[];
  counter: number;
  paidCount: number;
  usedSignatures: Set<string>;
  burns: BurnEvent[];
}
const g = globalThis as unknown as { __owwStore?: MemStore };
const store: MemStore = (g.__owwStore ??= {
  wishes: [],
  counter: SEED_BASE_COUNT,
  paidCount: 0,
  usedSignatures: new Set<string>(),
  burns: [],
});
const memory = store.wishes;

function normalize(addr: string) {
  return addr.trim();
}

export async function getCount(): Promise<number> {
  const client = getClient();
  if (client) {
    const { count } = await client
      .from("wishes")
      .select("*", { count: "exact", head: true });
    return SEED_BASE_COUNT + (count ?? 0);
  }
  return store.counter + memory.length;
}

export async function getStatus(wallet: string): Promise<WishStatus> {
  const address = normalize(wallet);
  const client = getClient();
  if (client) {
    const { data } = await client
      .from("wishes")
      .select("wish_text, oracle_response, wish_number, created_at")
      .eq("wallet_address", address)
      .maybeSingle();
    if (data) return { hasWished: true, wish: data as WishStatus["wish"] };
    return { hasWished: false };
  }
  const found = memory.find((w) => w.wallet_address === address);
  if (found) {
    return {
      hasWished: true,
      wish: {
        wish_text: found.wish_text,
        oracle_response: found.oracle_response,
        wish_number: found.wish_number,
        created_at: found.created_at,
      },
    };
  }
  return { hasWished: false };
}

export async function listWishes(
  category: WishCategory = "recent",
  limit = 60,
): Promise<Wish[]> {
  const client = getClient();
  let rows: Wish[] = [];
  if (client) {
    const { data } = await client
      .from("wishes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    rows = [...(data as Wish[] | null ?? []), ...SEED_WISHES];
  } else {
    rows = [...memory].reverse().concat(SEED_WISHES);
  }

  return applyCategory(rows, category).slice(0, limit);
}

function applyCategory(rows: Wish[], category: WishCategory): Wish[] {
  switch (category) {
    case "popular":
      // Deterministic pseudo-popularity from the hash so it is stable per wish.
      return [...rows].sort(
        (a, b) => popularity(b) - popularity(a),
      );
    case "strange": {
      const strangeKeys = ["moon", "forever", "dark", "ocean", "whale", "ghost", "dream", "snow", "regret"];
      return rows.filter((w) =>
        strangeKeys.some((k) => w.wish_text.toLowerCase().includes(k)),
      );
    }
    case "funny": {
      const funnyKeys = ["ex", "regret", "dog", "homework", "money", "lottery", "pizza", "boss"];
      return rows.filter((w) =>
        funnyKeys.some((k) => w.wish_text.toLowerCase().includes(k)),
      );
    }
    case "recent":
    default:
      return rows;
  }
}

function popularity(w: Wish): number {
  let h = 0;
  for (let i = 0; i < w.wish_hash.length; i++) h = (h * 17 + w.wish_hash.charCodeAt(i)) >>> 0;
  return h % 9999;
}

// ── Paid-wish accounting + buy/burn ──

export async function getPaidWishCount(): Promise<number> {
  const client = getClient();
  if (client) {
    const { count } = await client
      .from("wishes")
      .select("*", { count: "exact", head: true })
      .not("payment_signature", "is", null);
    return count ?? 0;
  }
  return store.paidCount;
}

async function isSignatureUsed(signature: string): Promise<boolean> {
  const client = getClient();
  if (client) {
    const { data } = await client
      .from("wishes")
      .select("id")
      .eq("payment_signature", signature)
      .maybeSingle();
    return Boolean(data);
  }
  return store.usedSignatures.has(signature);
}

export async function recordBurn(event: BurnEvent): Promise<void> {
  store.burns.unshift(event);
  const client = getClient();
  if (client) {
    await client.from("burns").insert({
      spent_usdc: event.spent_usdc,
      spent_sol: event.spent_sol,
      burned: event.burned,
      swap_signature: event.swap_signature,
      burn_signature: event.burn_signature,
      status: event.status,
      reason: event.reason ?? null,
    });
  }
}

export async function getBurns(limit = 20): Promise<BurnEvent[]> {
  const client = getClient();
  if (client) {
    const { data } = await client
      .from("burns")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (data) return data as unknown as BurnEvent[];
  }
  return store.burns.slice(0, limit);
}

/** How many buy-and-burns have actually completed on chain. */
export async function getCompletedBurnCount(): Promise<number> {
  const client = getClient();
  if (client) {
    const { count } = await client
      .from("burns")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed");
    return count ?? 0;
  }
  return store.burns.filter((b) => b.status === "completed").length;
}

/**
 * Burns owed = one per BURN_EVERY paid wishes, minus the ones already done.
 * This is the crash-safe trigger: a burn that gets cut off mid-flight stays
 * "owed" and is retried by the next wish or the cron, never double-counted.
 */
export async function getPendingBurnCount(): Promise<number> {
  if (BURN_EVERY <= 0) return 0;
  const [paid, done] = await Promise.all([getPaidWishCount(), getCompletedBurnCount()]);
  return Math.max(0, Math.floor(paid / BURN_EVERY) - done);
}

/** Run a single buy-and-burn if one is owed. Returns the event, or null. */
export async function runOwedBurn(): Promise<BurnEvent | null> {
  if ((await getPendingBurnCount()) <= 0) return null;
  const event = await buyAndBurn();
  await recordBurn(event);
  return event;
}

/** Fire-and-forget an owed burn so the wish response stays snappy. */
function triggerBurn(): void {
  void runOwedBurn().catch(() => {
    /* swallowed — surfaced via /api/buyburn status + retried by cron */
  });
}

export async function createWish(
  wallet: string,
  wishText: string,
  wishHashValue: string,
  paymentSignature?: string,
  currency: WishCurrency = "usdc",
): Promise<CreateWishResult> {
  const address = normalize(wallet);
  const text = wishText.trim();

  if (!address) return { ok: false, alreadyWished: false, error: "No wallet connected." };
  if (text.length < 2) return { ok: false, alreadyWished: false, error: "The Willow heard nothing." };
  if (text.length > 280) return { ok: false, alreadyWished: false, error: "The Willow asks for fewer words." };

  // Payment gate — only when a treasury is configured.
  const requirePayment = paymentsEnabled();
  if (requirePayment) {
    const sig = paymentSignature?.trim();
    if (!sig) {
      return { ok: false, alreadyWished: false, error: "An offering is required." };
    }
    if (await isSignatureUsed(sig)) {
      return { ok: false, alreadyWished: false, error: "That offering was already spent." };
    }
    const check = await verifyPayment(sig, address, currency);
    if (!check.ok) {
      return { ok: false, alreadyWished: false, error: check.reason ?? "The offering could not be verified." };
    }
  }

  // One wish per wallet — enforced before we ever call the oracle.
  const existing = await getStatus(address);
  if (existing.hasWished) {
    return { ok: false, alreadyWished: true, error: "The Willow remembers." };
  }

  const oracle = await consultOracle(text);
  const count = await getCount();
  const wishNumber = count + 1;

  const wish: Wish = {
    id: `${Date.now()}-${wishHashValue.slice(0, 6)}`,
    wallet_address: address,
    wish_text: text,
    wish_hash: wishHashValue,
    wish_number: wishNumber,
    oracle_response: oracle,
    wallet_status: "spent",
    payment_signature: requirePayment ? (paymentSignature?.trim() ?? null) : null,
    created_at: new Date().toISOString(),
  };

  const client = getClient();
  if (client) {
    const { data, error } = await client
      .from("wishes")
      .insert({
        wallet_address: wish.wallet_address,
        wish_text: wish.wish_text,
        wish_hash: wish.wish_hash,
        oracle_response: wish.oracle_response,
        wallet_status: wish.wallet_status,
        payment_signature: wish.payment_signature,
      })
      .select()
      .single();

    if (error) {
      // Unique-violation => wallet already wished, or this offering was reused.
      if (error.code === "23505") {
        return { ok: false, alreadyWished: true, error: "The Willow remembers." };
      }
      return { ok: false, alreadyWished: false, error: "The wood would not take it. Try once more." };
    }
    const saved = { ...wish, ...(data as Partial<Wish>) };
    let burnTriggered = false;
    if (requirePayment && (await getPendingBurnCount()) > 0) {
      burnTriggered = true;
      triggerBurn();
    }
    return { ok: true, alreadyWished: false, wish: saved, oracle, burnTriggered };
  }

  memory.push(wish);
  let burnTriggered = false;
  if (requirePayment && wish.payment_signature) {
    store.usedSignatures.add(wish.payment_signature);
    store.paidCount += 1;
    if ((await getPendingBurnCount()) > 0) {
      burnTriggered = true;
      triggerBurn();
    }
  }
  return { ok: true, alreadyWished: false, wish, oracle, burnTriggered };
}
