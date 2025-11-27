import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addDomainToVercel, removeDomainFromVercel } from "@/lib/vercel";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId, domain, oldDomain } = await req.json();

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID is required" }, { status: 400 });
    }

    // Verify user owns this workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", workspaceId)
      .eq("owner", user.id)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json({ error: "Workspace not found or unauthorized" }, { status: 404 });
    }

    // If there's an old domain that's different from the new one, remove it from Vercel
    if (oldDomain && oldDomain !== domain) {
      try {
        await removeDomainFromVercel(oldDomain);
      } catch (e) {
        console.warn("Failed to remove old domain from Vercel:", e);
        // Continue anyway - the old domain might not exist in Vercel
      }
    }

    // Add new domain to Vercel if provided
    if (domain) {
      try {
        const vercelResponse = await addDomainToVercel(domain);
        
        if (vercelResponse.error) {
          return NextResponse.json(
            { error: `Vercel error: ${vercelResponse.error.message}` },
            { status: 400 }
          );
        }
      } catch (e: any) {
        console.error("Failed to add domain to Vercel:", e);
        return NextResponse.json(
          { error: "Failed to add domain to Vercel" },
          { status: 500 }
        );
      }
    } else if (!domain && oldDomain) {
      // Removing domain entirely
      try {
        await removeDomainFromVercel(oldDomain);
      } catch (e) {
        console.warn("Failed to remove domain from Vercel:", e);
      }
    }

    // Update database
    const { error: updateError } = await supabase
      .from("workspaces")
      .update({
        custom_domain: domain || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", workspaceId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update workspace" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Domain management error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
