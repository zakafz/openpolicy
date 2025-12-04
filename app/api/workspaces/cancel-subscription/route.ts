import { NextResponse } from "next/server";
import { api as polar } from "@/lib/polar";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { workspaceId } = await req.json();

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID is required" },
        { status: 400 },
      );
    }

    // Verify ownership
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .select("id, subscription_id, owner_id")
      .eq("id", workspaceId)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 },
      );
    }

    if (workspace.owner_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (workspace.subscription_id) {
      try {
        await polar.subscriptions.revoke({
          id: workspace.subscription_id,
        });
        console.log(
          `Cancelled subscription ${workspace.subscription_id} for workspace ${workspaceId}`,
        );
      } catch (polarError: any) {
        console.error("Failed to cancel Polar subscription:", polarError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Cancel subscription error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err.message },
      { status: 500 },
    );
  }
}
