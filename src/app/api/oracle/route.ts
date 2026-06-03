import { NextResponse } from "next/server";
import { consultOracle } from "@/lib/oracle";

export const dynamic = "force-dynamic";

// Standalone oracle endpoint — used by the Oracle phone line stub and for testing.
export async function POST(req: Request) {
  let body: { wish?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed offering." }, { status: 400 });
  }
  const wish = (body.wish || "").trim();
  if (!wish) return NextResponse.json({ error: "Speak your wish." }, { status: 400 });
  const prophecy = await consultOracle(wish);
  return NextResponse.json({ prophecy });
}
