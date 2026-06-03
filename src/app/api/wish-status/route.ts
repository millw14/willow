import { NextResponse } from "next/server";
import { getStatus } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet");
  if (!wallet) {
    return NextResponse.json({ error: "No soul named." }, { status: 400 });
  }
  const status = await getStatus(wallet);
  return NextResponse.json(status);
}
