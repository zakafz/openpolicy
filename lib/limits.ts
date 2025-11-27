import { api } from "@/lib/polar";

export const FREE_PLAN_LIMITS = {
  documents: 3,
};

export const PRO_PLAN_LIMITS = {
  documents: Infinity,
};

export async function isFreePlan(planId: string | null): Promise<boolean> {
  if (!planId) return true;

  try {
    const product = await api.products.get({ id: planId });
    const isFree = product.prices.some(price => price.amountType === 'free');
    return isFree;
  } catch (e) {
    // On error, default to free plan to be safe
    return true;
  }
}
