import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Wish, WishCategory, WishStatus, CreateWishResult } from "@/lib/types";
import { SEED_WISHES, SEED_BASE_COUNT } from "@/data/seedWishes";
import { consultOracle } from "@/lib/oracle";

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
}
const g = globalThis as unknown as { __owwStore?: MemStore };
const store: MemStore = (g.__owwStore ??= { wishes: [], counter: SEED_BASE_COUNT });
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

export async function createWish(
  wallet: string,
  wishText: string,
  wishHashValue: string,
): Promise<CreateWishResult> {
  const address = normalize(wallet);
  const text = wishText.trim();

  if (!address) return { ok: false, alreadyWished: false, error: "No wallet connected." };
  if (text.length < 2) return { ok: false, alreadyWished: false, error: "The Willow heard nothing." };
  if (text.length > 280) return { ok: false, alreadyWished: false, error: "The Willow asks for fewer words." };

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
      })
      .select()
      .single();

    if (error) {
      // Unique-violation => this wallet already wished (race / retry).
      if (error.code === "23505") {
        return { ok: false, alreadyWished: true, error: "The Willow remembers." };
      }
      return { ok: false, alreadyWished: false, error: "The wood would not take it. Try once more." };
    }
    const saved = { ...wish, ...(data as Partial<Wish>) };
    return { ok: true, alreadyWished: false, wish: saved, oracle };
  }

  memory.push(wish);
  return { ok: true, alreadyWished: false, wish, oracle };
}
