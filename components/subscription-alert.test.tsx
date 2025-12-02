import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { WorkspaceRow } from "@/types/supabase";
import { SubscriptionAlert } from "./subscription-alert";

const mockWorkspace: WorkspaceRow = {
  id: "1",
  name: "Test Workspace",
  logo: null,
  logo_path: null,
  owner_id: "user-1",
  created_at: "2023-01-01",
  updated_at: null,
  plan: "free",
  slug: "test-workspace",
  metadata: null,
  support_email: null,
  disable_icon: false,
  return_url: null,
  custom_domain: null,
  subscription_id: null,
  subscription_status: "active",
  subscription_current_period_end: null,
};

describe("SubscriptionAlert", () => {
  it("renders nothing when status is active", () => {
    const { container } = render(
      <SubscriptionAlert workspace={mockWorkspace} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders Payment Failed alert when status is past_due", () => {
    const pastDueWorkspace = {
      ...mockWorkspace,
      subscription_status: "past_due",
    };
    render(<SubscriptionAlert workspace={pastDueWorkspace} />);
    expect(screen.getByText("Payment Failed")).toBeInTheDocument();
    expect(screen.getByText(/Your payment method failed/)).toBeInTheDocument();
  });

  it("renders Subscription Canceled alert when status is canceled", () => {
    const canceledWorkspace = {
      ...mockWorkspace,
      subscription_status: "canceled",
    };
    render(<SubscriptionAlert workspace={canceledWorkspace} />);
    expect(screen.getByText("Subscription Canceled")).toBeInTheDocument();
  });

  it("renders Subscription Setup Incomplete alert when status is incomplete", () => {
    const incompleteWorkspace = {
      ...mockWorkspace,
      subscription_status: "incomplete",
    };
    render(<SubscriptionAlert workspace={incompleteWorkspace} />);
    expect(
      screen.getByText("Subscription Setup Incomplete"),
    ).toBeInTheDocument();
  });

  it("renders Payment Required alert when status is unpaid", () => {
    const unpaidWorkspace = { ...mockWorkspace, subscription_status: "unpaid" };
    render(<SubscriptionAlert workspace={unpaidWorkspace} />);
    expect(screen.getByText("Payment Required")).toBeInTheDocument();
  });
});
