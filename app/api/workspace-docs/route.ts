import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/workspace-docs?workspace={workspace_slug}
 *
 * Returns published documents for the given workspace slug.
 *
 * Query params:
 *  - workspace (required): workspace slug (string)
 *
 * Response:
 *  - 200: { documents: [...] }
 *  - 400: { error: "workspace query param required" }
 *  - 404: { error: "Workspace not found" }
 *  - 500: { error: "Unexpected error" }
 */
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

    // Fetch published documents for the workspace
    const { data: documents, error: docsErr } = await svc
      .from("documents")
      .select("id,title,slug,updated_at,created_at,version,type,status,published,workspace_id")
      .eq("workspace_id", workspace.id)
      .eq("published", true)
      .order("updated_at", { ascending: false })
      .limit(200);

    if (docsErr) {
      console.error("workspace-docs: failed fetching documents", docsErr);
      return NextResponse.json(
        { error: "Failed to fetch documents" },
        { status: 500 },
      );
    }

    return NextResponse.json({ workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug }, documents: documents ?? [] });
  } catch (err) {
    console.error("workspace-docs: unexpected error", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
