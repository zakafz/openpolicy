import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { domain } = await req.json();
    const { workspaceId } = await params;

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID is required" },
        { status: 400 },
      );
    }

    if (domain) {
      const { data: existingWorkspace } = await supabase
        .from("workspaces")
        .select("id")
        .eq("custom_domain", domain)
        .neq("id", workspaceId)
        .single();

      if (existingWorkspace) {
        return NextResponse.json(
          { error: "Domain is already in use by another workspace" },
          { status: 409 },
        );
      }
    }

    const { error: updateError } = await supabase
      .from("workspaces")
      .update({
        custom_domain: domain,
        updated_at: new Date().toISOString(),
      })
      .eq("id", workspaceId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Update domain error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update domain" },
      { status: 500 },
    );
  }
}
