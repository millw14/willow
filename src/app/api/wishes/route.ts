import { NextResponse } from "next/server";
import { listWishes, createWish } from "@/lib/store";
import type { WishCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID: WishCategory[] = ["recent", "popular", "strange", "funny"];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = (searchParams.get("category") || "recent") as WishCategory;
  const category = VALID.includes(raw) ? raw : "recent";
  const limit = Math.min(Number(searchParams.get("limit")) || 60, 120);

  const wishes = await listWishes(category, limit);
  return NextResponse.json({ wishes });
}

export async function POST(req: Request) {
  let body: {
    wallet?: string;
    wish?: string;
    wish_hash?: string;
    payment_signature?: string;
    currency?: "usdc" | "sol";
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed offering." }, { status: 400 });
  }

  const { wallet, wish, wish_hash, payment_signature, currency } = body;
  if (!wallet || !wish || !wish_hash) {
    return NextResponse.json(
      { ok: false, error: "A wish requires a soul, words, and a sigil." },
      { status: 400 },
    );
  }

  const result = await createWish(
    wallet,
    wish,
    wish_hash,
    payment_signature,
    currency === "sol" ? "sol" : "usdc",
  );
  if (!result.ok) {
    return NextResponse.json(result, { status: result.alreadyWished ? 409 : 400 });
  }
  return NextResponse.json(result);
}
