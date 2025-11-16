import { NextResponse } from "next/server";
import { api as polar } from "@/lib/polar";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { productId, name } = body as { productId?: string; name?: string };

    if (!productId || !name) {
      return NextResponse.json(
        { error: "Missing required fields: productId and name" },
        { status: 400 },
      );
    }

    // Server-side session client (reads cookies)
    const sessionSupabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await sessionSupabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const owner_id = user.id;
    const customerEmail = user.email ?? undefined;

    // Service-role client for privileged writes
    const svc = createServiceClient();

    // Resolve or create Polar customer using externalId = supabase user id
    let customerId: string | null = null;
    try {
      const res: any = await polar.customers.getExternal({
        externalId: String(owner_id),
      });
      const customer = res?.data ?? res;
      customerId = customer?.id ?? null;
    } catch (err: any) {
      const status = err?.statusCode ?? err?.status ?? null;
      if (status === 404) {
        // Customer does not exist in Polar. Try to create one.
        try {
          const createRes: any = await polar.customers.create({
            externalId: String(owner_id),
            email: customerEmail ?? "",
          });
          const created = createRes?.data ?? createRes;
          customerId = created?.id ?? null;
        } catch (createErr: any) {
          // If creation fails due to existing email (422), try to find existing customer by email
          const createStatus =
            createErr?.statusCode ?? createErr?.status ?? null;
          if (createStatus === 422 && customerEmail) {
            try {
              // list customers and match by email (best-effort)
              const listRes: any = await polar.customers.list({});
              const list = listRes?.data ?? listRes ?? [];
              if (Array.isArray(list) && list.length > 0) {
                const found = list.find(
                  (c: any) => String(c?.email ?? "") === String(customerEmail),
                );
                if (found) {
                  customerId = found?.id ?? found?.customerId ?? null;
                }
              }
            } catch (listErr) {
              console.warn(
                "Failed to list Polar customers after 422:",
                listErr,
              );
            }
          }

          if (!customerId) {
            console.error(
              "Failed to create or resolve Polar customer:",
              createErr,
            );
            return NextResponse.json(
              {
                error: "Failed to create or resolve Polar customer",
                detail:
                  createErr?.body ?? createErr?.message ?? String(createErr),
              },
              { status: 500 },
            );
          }
        }
      } else {
        console.error(
          "Error looking up Polar customer by externalId:",
          err?.body ?? err?.message ?? err,
        );
        return NextResponse.json(
          {
            error: "Polar customer lookup error",
            detail: err?.body ?? err?.message ?? String(err),
          },
          { status: 500 },
        );
      }
    }

    if (!customerId) {
      return NextResponse.json(
        { error: "No Polar customer id available" },
        { status: 500 },
      );
    }

    // Before creating a subscription, enforce workspace limits (existing + pending)
    const MAX_WORKSPACES = Number(process.env.MAX_WORKSPACES ?? 3);
    try {
      const { count: wsCount, error: wsErr } = await svc
        .from("workspaces")
        .select("id", { count: "exact" })
        .eq("owner_id", owner_id);

      if (wsErr) {
        console.error("Error checking existing workspaces:", wsErr);
        return NextResponse.json(
          { error: "Failed to check workspace limits" },
          { status: 500 },
        );
      }

      const { count: pendingCount, error: pendingErr } = await svc
        .from("pending_workspaces")
        .select("id", { count: "exact" })
        .eq("owner_id", owner_id);

      if (pendingErr) {
        console.error("Error checking pending workspaces:", pendingErr);
        return NextResponse.json(
          { error: "Failed to check pending workspace limits" },
          { status: 500 },
        );
      }

      const existingCount = Number(wsCount ?? 0) + Number(pendingCount ?? 0);
      if (existingCount >= MAX_WORKSPACES) {
        return NextResponse.json(
          {
            error: `Owner ${owner_id} already has ${existingCount} workspaces (max ${MAX_WORKSPACES}).`,
          },
          { status: 400 },
        );
      }
    } catch (err) {
      console.error(
        "Error validating workspace limits before subscription:",
        err,
      );
      return NextResponse.json(
        { error: "Failed to validate workspace limits" },
        { status: 500 },
      );
    }

    // Create subscription for free product. Include workspace info for traceability.
    let subscription: any = null;
    try {
      subscription = await polar.subscriptions.create({
        productId: String(productId),
        customerId: String(customerId),
        metadata: { workspaceName: String(name) },
      });
    } catch (err: any) {
      console.error(
        "Polar subscriptions.create error:",
        err?.body ?? err?.message ?? err,
      );
      return NextResponse.json(
        {
          error: "Polar subscription creation failed",
          detail: err?.body ?? err?.message ?? String(err),
        },
        { status: err?.statusCode ?? err?.status ?? 500 },
      );
    }

    // Create the workspace directly in DB (no pending_workspaces)
    try {
      // Choose a random logo from a small curated list
      const logos = [
        "https://unblast.com/wp-content/uploads/2018/08/Gradient-Mesh-27.jpg",
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRbSkfgIzrobEXcqjh4iQEKOx9XN3dwebM24ZH6HtGH_cwiiGKrdT86DPAMqVINbAUjPnw&usqp=CAU",
        "https://static.vecteezy.com/system/resources/thumbnails/020/414/382/small/colorful-gradient-soft-background-video.jpg",
        "https://cdn.pixabay.com/video/2022/09/18/131766-751014982_tiny.jpg",
      ];
      const logo = logos[Math.floor(Math.random() * logos.length)];

      // Insert workspace using service client (privileged), including the selected logo
      const { data: workspace, error: createErr } = await svc
        .from("workspaces")
        .insert({ name: name.trim(), owner_id, plan: productId, logo })
        .select()
        .single();

      if (createErr || !workspace) {
        console.error("Failed to create workspace in DB:", createErr);
        // Note: rollback of Polar subscription is intentionally not performed here.
        return NextResponse.json(
          { error: "Failed to create workspace in DB" },
          { status: 500 },
        );
      }

      // Best-effort: attach polar ids to workspace metadata
      try {
        const meta = {
          polar_subscription_id: subscription?.id ?? null,
          polar_customer_id: customerId,
        };
        await svc
          .from("workspaces")
          .update({ metadata: meta })
          .eq("id", workspace.id as string);
      } catch (metaErr) {
        console.warn(
          "Failed to update workspace metadata with polar info:",
          metaErr,
        );
      }

      return NextResponse.json(
        { ok: true, workspace, subscription },
        { status: 201 },
      );
    } catch (err) {
      console.error("DB error creating workspace:", err);
      return NextResponse.json(
        { error: "DB error creating workspace" },
        { status: 500 },
      );
    }
  } catch (err) {
    console.error("Server error in /api/polar/create-free-workspace:", err);
    return NextResponse.json(
      { error: "Server error", detail: String(err) },
      { status: 500 },
    );
  }
}
