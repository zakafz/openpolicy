import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const fileField = form.get("file");
    const workspaceId = form.get("workspaceId") as string | null;
    const isLogo = form.get("isLogo");

    if (!fileField) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const incomingFile: File = fileField as File;
    const originalName = incomingFile.name ?? `upload-${Date.now()}`;
    const contentType = incomingFile.type || undefined;
    const arrayBuffer = await incomingFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const sessionClient = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await sessionClient.auth
      .getUser()
      .catch((e) => ({ data: { user: null }, error: e }));

    const svc = createServiceClient();

    if (workspaceId) {
      if (authErr || !user) {
        return NextResponse.json(
          { error: "Not authenticated" },
          { status: 401 },
        );
      }

      const { data: wsData, error: wsErr } = await svc
        .from("workspaces")
        .select("owner_id")
        .eq("id", workspaceId)
        .limit(1)
        .maybeSingle();

      if (wsErr) {
        console.error("uploads/multipart: failed to fetch workspace", wsErr);
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
    }

    const safeName = String(originalName).replace(/[^a-zA-Z0-9_.-]/g, "-");
    const timestamp = Date.now();
    const bucket = "workspace-logos";
    const destPath = workspaceId
      ? `uploads/${workspaceId}/${timestamp}-${safeName}`
      : `uploads/${timestamp}-${safeName}`;

    const MAX_BYTES = Number(process.env.UPLOAD_MAX_BYTES ?? 8 * 1024 * 1024);
    if (buffer.length > MAX_BYTES) {
      return NextResponse.json({ error: "File too large" }, { status: 413 });
    }

    const uploadOptions: any = { upsert: true };
    if (contentType) uploadOptions.contentType = contentType;

    const { error: uploadError } = await svc.storage
      .from(bucket)
      .upload(destPath, buffer, uploadOptions);
    if (uploadError) {
      console.error("uploads/multipart: upload error", uploadError);
      return NextResponse.json(
        { error: "Storage upload failed", detail: uploadError },
        { status: 500 },
      );
    }

    const { data: publicUrlData } = svc.storage
      .from(bucket)
      .getPublicUrl(destPath);
    const publicURL =
      (publicUrlData as any)?.publicUrl ??
      (publicUrlData as any)?.publicURL ??
      "";

    if (workspaceId && isLogo) {
      try {
        await svc
          .from("workspaces")
          .update({
            logo: publicURL || null,
            logo_path: destPath,
            updated_at: new Date().toISOString(),
          })
          .eq("id", workspaceId);
      } catch (e) {
        console.warn(
          "uploads/multipart: warning - failed to update workspace with logo",
          e,
        );
      }
    }

    return NextResponse.json({ ok: true, publicURL, path: destPath });
  } catch (err) {
    console.error("/api/uploads/multipart error:", err);
    return NextResponse.json(
      { error: "Server error", detail: String(err) },
      { status: 500 },
    );
  }
}
