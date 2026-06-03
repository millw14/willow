import { NextResponse } from "next/server";
import { runOwedBurn, getPendingBurnCount } from "@/lib/store";

export const dynamic = "force-dynamic";
// Buy-and-burn can take a while (quote + swap + confirm + burn + confirm).
export const maxDuration = 60;

/**
 * Vercel Cron entry point. Vercel invokes this with GET and auto-attaches
 * `Authorization: Bearer $CRON_SECRET`. It flushes any buy-and-burn that is
 * owed (e.g. one whose serverless invocation was cut off). Idempotent and
 * safe to run frequently — it no-ops when nothing is owed.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const pendingBefore = await getPendingBurnCount();
  const event = await runOwedBurn();

  return NextResponse.json({
    ok: true,
    pendingBefore,
    ran: Boolean(event),
    event,
    pendingAfter: await getPendingBurnCount(),
  });
}
