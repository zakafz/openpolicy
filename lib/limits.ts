import { api } from "@/lib/polar";

export const FREE_PLAN_LIMITS = {
  documents: 3,
  workspaces: 1,
};

export const PRO_PLAN_LIMITS = {
  documents: Infinity,
  workspaces: 1,
};

// Helper to check if a plan ID corresponds to a free plan
export async function isFreePlan(planId: string | null): Promise<boolean> {
  if (!planId) return true; // No plan = Free

  try {
    const product = await api.products.get({ id: planId });
    // Check if any price is free
    const isFree = product.prices.some(price => price.amountType === 'free');
    return isFree;
  } catch (e) {
    console.error("Error fetching plan details:", e);
    return false; // Fail safe? Or fail open? Let's assume paid if we can't verify free.
  }
}
