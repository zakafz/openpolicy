import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DocumentsTable from "./documents-table";

vi.mock("@/context/workspace", () => ({
  useWorkspace: () => ({
    selectedWorkspaceId: "workspace-1",
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({})),
}));

vi.mock("@/lib/documents", () => ({
  fetchDocumentsForWorkspace: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

import { fetchDocumentsForWorkspace } from "@/lib/documents";

describe("DocumentsTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    vi.mocked(fetchDocumentsForWorkspace).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    render(<DocumentsTable />);
    expect(screen.getByText(/Loading documents/i)).toBeInTheDocument();
  });

  it("renders empty state when no documents", async () => {
    vi.mocked(fetchDocumentsForWorkspace).mockResolvedValue([]);

    render(<DocumentsTable />);

    await waitFor(() => {
      expect(screen.getByText(/No documents/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Create a document/i)).toBeInTheDocument();
  });

  it("renders document list with correct data", async () => {
    const mockDocuments = [
      {
        id: "doc-1",
        title: "Privacy Policy",
        slug: "privacy-policy",
        type: "privacy",
        status: "published",
        version: 1,
        created_at: "2024-01-01T00:00:00Z",
      },
      {
        id: "doc-2",
        title: "Terms of Service",
        slug: "terms",
        type: "terms",
        status: "draft",
        version: 2,
        created_at: "2024-01-02T00:00:00Z",
      },
    ];

    vi.mocked(fetchDocumentsForWorkspace).mockResolvedValue(mockDocuments);

    render(<DocumentsTable />);

    const privacyPolicyElements = await screen.findAllByText("Privacy Policy");
    expect(privacyPolicyElements.length).toBeGreaterThan(0);
    const termsElements = await screen.findAllByText("Terms of Service");
    expect(termsElements.length).toBeGreaterThan(0);

    expect(screen.getByText("2 documents")).toBeInTheDocument();
  });

  it("filters documents by type", async () => {
    const mockDocuments = [
      {
        id: "doc-1",
        title: "Privacy Policy",
        type: "privacy",
        status: "published",
        created_at: "2024-01-01T00:00:00Z",
      },
    ];

    vi.mocked(fetchDocumentsForWorkspace).mockResolvedValue(mockDocuments);

    render(<DocumentsTable type="published" />);

    await waitFor(() => {
      expect(fetchDocumentsForWorkspace).toHaveBeenCalledWith(
        "workspace-1",
        "published",
        expect.anything(),
      );
    });
  });
});
