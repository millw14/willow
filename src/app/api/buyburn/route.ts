import { NextResponse } from "next/server";
import { getBurns, getPaidWishCount, getPendingBurnCount, recordBurn } from "@/lib/store";
import { buyAndBurn } from "@/lib/buyburn";
import { BURN_EVERY, paymentsEnabled } from "@/lib/solana";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const [burns, paid, pending] = await Promise.all([
    getBurns(),
    getPaidWishCount(),
    getPendingBurnCount(),
  ]);
  const remainder = BURN_EVERY === 0 ? 0 : paid % BURN_EVERY;
  return NextResponse.json({
    enabled: paymentsEnabled(),
    paidWishes: paid,
    burnEvery: BURN_EVERY,
    wishesUntilNextBurn: remainder === 0 ? 0 : BURN_EVERY - remainder,
    pendingBurns: pending,
    burns,
  });
}

/**
 * Manually trigger a buy & burn. Guard with CRON_SECRET in production so only
 * a scheduler (e.g. Vercel Cron) or operator can flush a pending burn.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }
  }
  const event = await buyAndBurn();
  await recordBurn(event);
  return NextResponse.json({ ok: event.status !== "failed", event });
}
