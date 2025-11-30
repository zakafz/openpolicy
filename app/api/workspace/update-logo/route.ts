import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { workspaceId, publicURL, path } = body as {
      workspaceId?: string;
      publicURL?: string;
      path?: string;
    };

    if (!workspaceId || (!publicURL && !path)) {
      return NextResponse.json(
        {
          error: "Missing required fields: workspaceId and (publicURL or path)",
        },
        { status: 400 },
      );
    }

    const sessionClient = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await sessionClient.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const svc = createServiceClient();

    const { data: wsData, error: wsErr } = await svc
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .limit(1)
      .maybeSingle();

    if (wsErr) {
      console.error(
        "/api/workspace/update-logo - failed to fetch workspace:",
        wsErr,
      );
      return NextResponse.json(
        { error: "Failed to fetch workspace" },
        { status: 500 },
      );
    }
    if (!wsData) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 },
      );
    }

    if (String(wsData.owner_id) !== String(user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };
    if (publicURL) updatePayload.logo = publicURL;
    if (path) updatePayload.logo_path = path;

    const { error: updateErr } = await svc
      .from("workspaces")
      .update(updatePayload)
      .eq("id", workspaceId);

    if (updateErr) {
      console.error("/api/workspace/update-logo - update failed:", updateErr);
      return NextResponse.json(
        { error: "Failed to update workspace" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("/api/workspace/update-logo error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
