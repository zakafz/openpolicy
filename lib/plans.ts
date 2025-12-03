import { api } from "@/lib/polar";

export async function isFreePlan(planId: string | null): Promise<boolean> {
  if (!planId) {
    return true;
  }

  try {
    const product = await api.products.get({ id: planId });
    const isFree = product.prices.some((price) => price.amountType === "free");
    return isFree;
  } catch (_e) {
    return true;
  }
}
