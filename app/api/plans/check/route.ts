import { type NextRequest, NextResponse } from "next/server";
import { isFreePlan } from "@/lib/plans";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const planId = searchParams.get("planId");

  if (!planId) {
    return NextResponse.json({ isFree: true });
  }

  try {
    const isFree = await isFreePlan(planId);
    return NextResponse.json({ isFree });
  } catch (_error) {
    return NextResponse.json({ isFree: true });
  }
}
