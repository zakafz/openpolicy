import { NextResponse } from "next/server";
import { api as polar } from "@/lib/polar";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { productId, workspaceId, successUrl } = body as {
      productId?: string;
      workspaceId?: string;
      successUrl?: string;
    };

    if (!productId || !workspaceId) {
      return NextResponse.json(
        { error: "Missing required fields: productId and workspaceId" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify workspace ownership
    const { data: workspace, error: wsErr } = await supabase
      .from("workspaces")
      .select("id, owner_id, name")
      .eq("id", workspaceId)
      .single();

    if (wsErr || !workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 },
      );
    }

    if (workspace.owner_id !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized: You do not own this workspace" },
        { status: 403 },
      );
    }

    try {
      const checkout = await polar.checkouts.create({
        products: [productId],
        successUrl:
          successUrl ??
          `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/workspace`,
        metadata: {
          workspaceId: workspace.id,
          userId: user.id,
          workspaceName: workspace.name,
        },
        customerEmail: user.email,
      });

      return NextResponse.json({ url: checkout.url });
    } catch (polarErr: any) {
      console.error("Polar checkout creation failed:", polarErr);
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 500 },
      );
    }
  } catch (err) {
    console.error("Server error in /api/polar/create-checkout:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
