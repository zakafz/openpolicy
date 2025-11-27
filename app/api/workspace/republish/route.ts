import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId } = await req.json();

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID is required" }, { status: 400 });
    }

    // Verify user owns this workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", workspaceId)
      .eq("owner_id", user.id)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json({ error: "Workspace not found or unauthorized" }, { status: 404 });
    }

    // Trigger Vercel deployment via deploy hook
    if (!process.env.VERCEL_DEPLOY_HOOK_URL) {
      return NextResponse.json(
        { error: "Deploy hook not configured. Please set VERCEL_DEPLOY_HOOK_URL environment variable." },
        { status: 500 }
      );
    }

    try {
      const deployResponse = await fetch(process.env.VERCEL_DEPLOY_HOOK_URL, {
        method: "POST",
      });

      if (!deployResponse.ok) {
        throw new Error("Failed to trigger deployment");
      }

      return NextResponse.json({ 
        success: true, 
        message: "Deployment triggered successfully" 
      });
    } catch (e: any) {
      return NextResponse.json(
        { error: "Failed to trigger deployment" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
