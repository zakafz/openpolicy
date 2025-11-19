import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

// POST /api/workspace/upload-logo — upload workspace logo.
// Expects JSON: { workspaceId, filename, contentType?, fileBase64 }.
// Authenticates session, verifies workspace ownership, uploads to 'workspace-logos', and updates workspace record.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { workspaceId, filename, contentType, fileBase64 } = body as any;

    if (!workspaceId || !filename || !fileBase64) {
      return NextResponse.json(
        { error: "Missing required fields: workspaceId, filename, fileBase64" },
        { status: 400 },
      );
    }

    // Basic filename sanitization
    const safeFilename = String(filename).replace(/[^a-zA-Z0-9_.\-]/g, "-");
    if (safeFilename.length === 0) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    // Strip optional data URL prefix if present
    let base64 = String(fileBase64);
    const dataUrlMatch = base64.match(/^data:(.+);base64,(.+)$/);
    let inferredContentType = contentType;
    if (dataUrlMatch) {
      inferredContentType = inferredContentType || dataUrlMatch[1];
      base64 = dataUrlMatch[2];
    }

    // Convert base64 to Buffer
    let buffer: Buffer;
    try {
      buffer = Buffer.from(base64, "base64");
    } catch (err) {
      return NextResponse.json(
        { error: "Invalid base64 data" },
        { status: 400 },
      );
    }

    // Optional size limit (e.g. 8MB)
    const MAX_BYTES = Number(
      process.env.WORKSPACE_LOGO_MAX_BYTES ?? 8 * 1024 * 1024,
    );
    if (buffer.length > MAX_BYTES) {
      return NextResponse.json({ error: "File too large" }, { status: 413 });
    }

    // Authenticate current user (session-aware client)
    const sessionClient = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await sessionClient.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Service client for privileged actions
    const svc = createServiceClient();

    // Verify workspace ownership
    const { data: wsData, error: wsErr } = await svc
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .limit(1)
      .maybeSingle();

    if (wsErr) {
      console.error("upload-logo: failed to fetch workspace", wsErr);
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

    // Prepare storage path and upload
    const bucket = "workspace-logos";
    const timestamp = Date.now();
    const destPath = `logos/${workspaceId}/${timestamp}-${safeFilename}`;

    // Upload buffer to Supabase Storage (upsert so repeated uploads replace)
    const uploadOptions: any = { upsert: true };
    if (inferredContentType) uploadOptions.contentType = inferredContentType;

    const { error: uploadError } = await svc.storage
      .from(bucket)
      .upload(destPath, buffer, uploadOptions);

    if (uploadError) {
      console.error("upload-logo: storage upload error", uploadError);
      return NextResponse.json(
        { error: "Storage upload failed", detail: uploadError },
        { status: 500 },
      );
    }

    // Retrieve public URL (bucket is public)
    const { data: publicUrlData } = svc.storage
      .from(bucket)
      .getPublicUrl(destPath);
    // supabase client returns { data: { publicUrl } }
    const publicURL =
      (publicUrlData as any)?.publicUrl ??
      (publicUrlData as any)?.publicURL ??
      "";

    // Persist workspace record update (logo and logo_path)
    const { error: updateErr } = await svc
      .from("workspaces")
      .update({
        logo: publicURL || null,
        logo_path: destPath,
        updated_at: new Date().toISOString(),
      })
      .eq("id", workspaceId);

    if (updateErr) {
      console.error("upload-logo: failed to update workspace", updateErr);
      return NextResponse.json(
        { error: "Failed to update workspace", detail: updateErr },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, publicURL, path: destPath });
  } catch (err) {
    console.error("/api/workspace/upload-logo error:", err);
    return NextResponse.json(
      { error: "Server error", detail: String(err) },
      { status: 500 },
    );
  }
}
