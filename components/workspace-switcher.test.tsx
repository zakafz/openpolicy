import type { Product } from "@polar-sh/sdk/models/components/product.js";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceRow } from "@/types/supabase";
import { WorkspaceSwitcher } from "./workspace-switcher";

const mockSetSelectedWorkspaceId = vi.fn();
const mockSetSelectedWorkspace = vi.fn();

vi.mock("@/context/workspace", () => ({
  useWorkspace: () => ({
    selectedWorkspaceId: "workspace-1",
    setSelectedWorkspaceId: mockSetSelectedWorkspaceId,
    setSelectedWorkspace: mockSetSelectedWorkspace,
  }),
}));

vi.mock("@/components/ui/sidebar", () => ({
  useSidebar: () => ({
    isMobile: false,
  }),
  SidebarMenu: ({ children }: any) => <div>{children}</div>,
  SidebarMenuItem: ({ children }: any) => <div>{children}</div>,
  SidebarMenuButton: ({ children }: any) => (
    <button type="button">{children}</button>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

const mockWorkspaces: WorkspaceRow[] = [
  {
    id: "workspace-1",
    name: "Test Workspace",
    slug: "test-workspace",
    owner_id: "user-1",
    created_at: "2024-01-01",
    plan: "prod_1",
    logo: null,
    logo_path: null,
    support_email: null,
    disable_icon: false,
    return_url: null,
    custom_domain: null,
    subscription_id: null,
    subscription_status: null,
    subscription_current_period_end: null,
    updated_at: null,
    metadata: null,
  },
];

const mockProducts: Product[] = [
  {
    id: "prod_1",
    name: "Free Plan",
    description: "Basic features",
    prices: [],
    createdAt: new Date(),
    modifiedAt: null,
    isArchived: false,
    isRecurring: true,
    recurringIntervalCount: 1,
    trialInterval: "day",
    trialIntervalCount: 0,
    organizationId: "org_1",
    recurringInterval: "month",
    benefits: [],
    medias: [],
    metadata: {},
    attachedCustomFields: [],
  },
];

describe("WorkspaceSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders current workspace name", () => {
    render(
      <WorkspaceSwitcher workspaces={mockWorkspaces} products={mockProducts} />,
    );
    expect(screen.getByText("Test Workspace")).toBeInTheDocument();
  });

  it("displays workspace plan name", () => {
    render(
      <WorkspaceSwitcher workspaces={mockWorkspaces} products={mockProducts} />,
    );
    expect(screen.getByText("Free Plan")).toBeInTheDocument();
  });

  it("renders nothing when no workspaces", () => {
    const { container } = render(
      <WorkspaceSwitcher workspaces={[]} products={mockProducts} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows workspace initials when no logo", () => {
    render(
      <WorkspaceSwitcher workspaces={mockWorkspaces} products={mockProducts} />,
    );
    expect(screen.getByText("T")).toBeInTheDocument();
  });
});
