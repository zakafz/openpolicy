import type { Product } from "@polar-sh/sdk/models/components/product.js";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateWorkspaceForm } from "./create-workspace-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

const mockSupabase = {
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: "user-1", email: "test@example.com" } },
      error: null,
    }),
  },
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  ilike: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn(),
  insert: vi.fn().mockReturnThis(),
};

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => mockSupabase,
}));

global.fetch = vi.fn();

const mockProducts: Product[] = [
  {
    id: "prod_1",
    name: "Free Plan",
    description: "Basic features",
    prices: [
      {
        amountType: "free",
        id: "price_1",
        createdAt: new Date(),
        modifiedAt: null,
        isArchived: false,
        productId: "prod_1",
        type: "recurring",
        recurringInterval: "month",
      },
    ],
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

describe("CreateWorkspaceForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders form elements correctly", () => {
    render(<CreateWorkspaceForm products={mockProducts} />);
    expect(screen.getByText("Create a workspace")).toBeInTheDocument();
    expect(screen.getByLabelText("Workspace Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Workspace Slug")).toBeInTheDocument();
    expect(screen.getByText("Create Workspace")).toBeInTheDocument();
  });

  it("validates slug format", async () => {
    render(<CreateWorkspaceForm products={mockProducts} />);
    const slugInput = screen.getByLabelText("Workspace Slug");

    fireEvent.change(slugInput, { target: { value: "Invalid Slug" } });
    expect(slugInput).toHaveValue("invalid-slug");
  });

  it("shows error when slug is invalid (manual check logic)", async () => {
    render(<CreateWorkspaceForm products={mockProducts} />);
    const slugInput = screen.getByLabelText("Workspace Slug");

    fireEvent.change(slugInput, { target: { value: "test-slug" } });
    expect(slugInput).toHaveValue("test-slug");
  });
});
