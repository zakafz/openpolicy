import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId, filename, contentType, fileBase64 } = await req.json();

    if (!workspaceId || !filename || !fileBase64) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Verify ownership
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .single();

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 },
      );
    }

    const isAdmin = user.id === process.env.ADMIN_USER_ID;
    if (workspace.owner_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Decode base64
    const buffer = Buffer.from(fileBase64, "base64");

    // Upload to Supabase
    const path = `${workspaceId}/${Date.now()}-${filename}`;
    const { error: uploadError } = await supabase.storage
      .from("workspace-logos")
      .upload(path, buffer, {
        contentType: contentType || "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("workspace-logos").getPublicUrl(path);

    // Update workspace
    const { error: updateError } = await supabase
      .from("workspaces")
      .update({ logo: publicUrl })
      .eq("id", workspaceId);

    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update workspace" },
        { status: 500 },
      );
    }

    return NextResponse.json({ publicURL: publicUrl });
  } catch (error) {
    console.error("Internal error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
