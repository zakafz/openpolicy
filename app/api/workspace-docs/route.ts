import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { fetchPublishedDocumentsForWorkspaceServer } from "@/lib/documents";

// GET /api/workspace-docs?workspace={workspace_slug} — returns published documents for a workspace
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const workspaceSlug = url.searchParams.get("workspace");

    if (!workspaceSlug || !workspaceSlug.trim()) {
      return NextResponse.json(
        { error: "workspace query param required" },
        { status: 400 },
      );
    }

    const svc = createServiceClient();

    // Resolve workspace by slug
    const { data: workspace, error: wsErr } = await svc
      .from("workspaces")
      .select("id, name, slug")
      .eq("slug", workspaceSlug)
      .maybeSingle();

    if (wsErr) {
      console.error("workspace-docs: failed fetching workspace", wsErr);
      return NextResponse.json(
        { error: "Failed to fetch workspace" },
        { status: 500 },
      );
    }

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 },
      );
    }

    // Fetch published documents for the workspace using centralized helper
    let documents: any[] = [];
    try {
      documents = await fetchPublishedDocumentsForWorkspaceServer(
        workspace.id,
        svc,
        200,
      );
      if (!Array.isArray(documents)) {
        documents = [];
      }
    } catch (e) {
      console.error("workspace-docs: failed fetching documents", e);
      return NextResponse.json(
        { error: "Failed to fetch documents" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
      },
      documents: documents ?? [],
    });
  } catch (err) {
    console.error("workspace-docs: unexpected error", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
