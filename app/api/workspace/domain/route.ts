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

    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", workspaceId)
      .eq("owner_id", user.id)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json({ error: "Workspace not found or unauthorized" }, { status: 404 });
    }

    if (domain && domain !== oldDomain) {
      const { data: existingDomain, error: checkError } = await supabase
        .from("workspaces")
        .select("id, name")
        .eq("custom_domain", domain)
        .neq("id", workspaceId)
        .maybeSingle();

      if (checkError) {
        return NextResponse.json(
          { error: "Failed to check domain availability" },
          { status: 500 }
        );
      }

      if (existingDomain) {
        return NextResponse.json(
          { error: `This domain is already in use by another workspace` },
          { status: 409 }
        );
      }
    }

    if (oldDomain && oldDomain !== domain) {
      try {
        await removeDomainFromVercel(oldDomain);
      } catch (e) {
      }
    }

    if (domain) {
      try {
        const vercelResponse = await addDomainToVercel(domain);
        
        if (vercelResponse.error) {
          const errorMsg = vercelResponse.error.message || "Unknown Vercel error";
          
          if (errorMsg.includes("already exists") || errorMsg.includes("in use")) {
            return NextResponse.json(
              { error: "This domain is already registered with Vercel. Please remove it from other projects first." },
              { status: 409 }
            );
          } else if (errorMsg.includes("invalid") || errorMsg.includes("domain")) {
            return NextResponse.json(
              { error: "Invalid domain format. Please enter a valid domain (e.g., docs.example.com)" },
              { status: 400 }
            );
          } else if (errorMsg.includes("forbidden") || errorMsg.includes("not authorized")) {
            return NextResponse.json(
              { error: "Vercel authorization failed. Please check your Vercel API configuration." },
              { status: 403 }
            );
          }
          
          return NextResponse.json(
            { error: `Vercel error: ${errorMsg}` },
            { status: 400 }
          );
        }
      } catch (e: any) {
        return NextResponse.json(
          { error: e.message || "Failed to add domain to Vercel" },
          { status: 500 }
        );
      }
    } else if (!domain && oldDomain) {
      try {
        await removeDomainFromVercel(oldDomain);
      } catch (e) {
      }
    }

    const { error: updateError } = await supabase
      .from("workspaces")
      .update({
        custom_domain: domain || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", workspaceId);

    if (updateError) {
      if (updateError.code === "23505") {
        return NextResponse.json(
          { error: "This domain is already in use by another workspace" },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: "Failed to update workspace" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
