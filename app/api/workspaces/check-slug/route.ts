import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return NextResponse.json(
      { available: false, error: "Slug is required" },
      { status: 400 },
    );
  }

  const svc = createServiceClient();

  try {
    const { data: wsData, error: wsErr } = await svc
      .from("workspaces")
      .select("id")
      .ilike("slug", slug)
      .limit(1);

    if (wsErr) {
      console.error("Error checking workspaces slug:", wsErr);
      return NextResponse.json(
        { available: false, error: "Database error" },
        { status: 500 },
      );
    }

    const wsConflict = (wsData && wsData.length > 0) ?? false;

    const { data: pendingData, error: pendingErr } = await svc
      .from("pending_workspaces")
      .select("id")
      .ilike("slug", slug)
      .limit(1);

    if (pendingErr) {
      console.error("Error checking pending_workspaces slug:", pendingErr);
      return NextResponse.json(
        { available: false, error: "Database error" },
        { status: 500 },
      );
    }

    const pendingConflict = (pendingData && pendingData.length > 0) ?? false;

    const available = !wsConflict && !pendingConflict;

    return NextResponse.json({ available });
  } catch (error) {
    console.error("Error checking slug availability:", error);
    return NextResponse.json(
      { available: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
