import { NextRequest, NextResponse } from "next/server";
import { api } from "@/lib/polar";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const planId = searchParams.get("planId");

  if (!planId) {
    // No plan ID usually means free in some contexts, or we can't verify.
    // Let's assume true for "isFree" if no plan ID is provided? 
    // Or false? The user said "workspace has a plan column called plan that is equal to the plan id".
    // So if it's missing, it might be an error or legacy free.
    return NextResponse.json({ isFree: true });
  }

  try {
    const product = await api.products.get({ id: planId });
    const isFree = product.prices.some((price) => price.amountType === "free");
    return NextResponse.json({ isFree });
  } catch (error) {
    console.error("Error checking plan status:", error);
    // Default to false (paid) on error to avoid showing upgrade UI incorrectly?
    // Or true? Let's default to false to be safe.
    return NextResponse.json({ isFree: false }, { status: 500 });
  }
}
