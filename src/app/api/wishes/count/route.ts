import { NextResponse } from "next/server";
import { getCount } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const count = await getCount();
  return NextResponse.json({ count });
}
