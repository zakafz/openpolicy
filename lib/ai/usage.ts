import { FREE_PLAN_LIMITS, PRO_PLAN_LIMITS } from "@/lib/limits";
import { isFreePlan } from "@/lib/plans";
import { api } from "@/lib/polar";
import { createClient } from "@/lib/supabase/server";

export async function trackAiUsage(
  userId: string,
  event: "copilot_usage" | "command_usage",
  tokens?: number,
) {
  try {
    await api.events.ingest({
      events: [
        {
          externalCustomerId: userId,
          name: event,
          metadata: {
            source: "openpolicy_ai",
            tokens: tokens ?? 0,
          },
        },
      ],
    });
  } catch (error) {
    console.error("Failed to track AI usage:", error);
  }
}

export async function checkAiUsage(userId: string) {
  const supabase = await createClient();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, plan, metadata")
    .eq("owner_id", userId)
    .single();

  if (!workspace) return true;

  const isFree = await isFreePlan(workspace.plan);
  const limit = isFree ? FREE_PLAN_LIMITS.ai : PRO_PLAN_LIMITS.ai;

  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const metadata = workspace.metadata || {};

  // Reset usage if month changed
  if (metadata.ai_usage_period !== currentMonth) {
    await supabase
      .from("workspaces")
      .update({
        metadata: {
          ...metadata,
          ai_usage_period: currentMonth,
          ai_usage_count: 0,
        },
      })
      .eq("id", workspace.id);
    return true;
  }

  const currentUsage = (metadata.ai_usage_count as number) || 0;

  if (currentUsage >= limit) {
    return false;
  }

  return true;
}

export async function incrementAiUsage(userId: string) {
  const supabase = await createClient();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, metadata")
    .eq("owner_id", userId)
    .single();

  if (!workspace) return;

  const metadata = workspace.metadata || {};
  const currentUsage = (metadata.ai_usage_count as number) || 0;

  await supabase
    .from("workspaces")
    .update({
      metadata: {
        ...metadata,
        ai_usage_count: currentUsage + 1,
      },
    })
    .eq("id", workspace.id);
}
