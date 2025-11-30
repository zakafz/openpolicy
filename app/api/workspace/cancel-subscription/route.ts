import { api } from "@/lib/polar";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { workspaceId } = await req.json();

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .select("subscription_id, owner_id")
      .eq("id", workspaceId)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 },
      );
    }

    if (workspace.owner_id !== user.id) {
      return NextResponse.json(
        { error: "Not authorized to delete this workspace" },
        { status: 403 },
      );
    }

    if (workspace.subscription_id) {
      try {
        await api.subscriptions.revoke({
          id: workspace.subscription_id,
        });
      } catch (polarError: any) {
        console.error("Failed to cancel Polar subscription:", polarError);
        if (polarError?.status !== 404) {
          return NextResponse.json(
            {
              error: "Failed to cancel subscription",
              detail: polarError?.message ?? String(polarError),
            },
            { status: 500 },
          );
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in cancel-subscription:", error);
    return NextResponse.json(
      { error: "Internal server error", detail: error?.message ?? String(error) },
      { status: 500 },
    );
  }
}
