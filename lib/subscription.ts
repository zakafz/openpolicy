import type { WorkspaceRow } from "@/types/supabase";

export function isSubscriptionActive(workspace: WorkspaceRow): boolean {
  const status = workspace.subscription_status;

  if (!status) return true;

  if (status === "active" || status === "trialing" || status === "past_due")
    return true;

  if (status === "canceled" && workspace.subscription_current_period_end) {
    const periodEnd = new Date(workspace.subscription_current_period_end);
    return periodEnd > new Date();
  }

  return false;
}

export function canCreateDocuments(workspace: WorkspaceRow): boolean {
  return isSubscriptionActive(workspace);
}

export function getSubscriptionStatusMessage(
  workspace: WorkspaceRow,
): string | null {
  const status = workspace.subscription_status;

  if (!status) return null;

  if (status === "past_due") {
    return "Payment failed. Please update your payment method to avoid service interruption.";
  }

  if (status === "canceled" && workspace.subscription_current_period_end) {
    const periodEnd = new Date(workspace.subscription_current_period_end);
    if (periodEnd > new Date()) {
      return `Subscription canceled. Access until ${periodEnd.toLocaleDateString()}.`;
    }
    return "Subscription has ended.";
  }

  if (status === "incomplete" || status === "incomplete_expired") {
    return "Subscription setup incomplete.";
  }

  if (status === "unpaid") {
    return "Subscription unpaid.";
  }

  return null;
}
