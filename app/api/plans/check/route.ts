import { type NextRequest, NextResponse } from "next/server";
import { api } from "@/lib/polar";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const planId = searchParams.get("planId");

  if (!planId) {
    return NextResponse.json({ isFree: true });
  }

  try {
    const product = await api.products.get({ id: planId });
    const isFree = product.prices.some((price) => price.amountType === "free");
    return NextResponse.json({ isFree });
  } catch (error) {
    console.error("Error checking plan status:", error);
    return NextResponse.json({ isFree: false }, { status: 500 });
  }
}
