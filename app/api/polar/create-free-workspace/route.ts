import { NextResponse } from "next/server";
import { api as polar } from "@/lib/polar";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  fetchWorkspacesForOwner,
  fetchWorkspaceByIdServer,
} from "@/lib/workspace";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { productId, name, slug } = body as {
      productId?: string;
      name?: string;
      slug?: string | null;
    };

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
      let wsCount = 0;
      try {
        // Use centralized helper to fetch the owner's workspaces so logic is consistent
        // across the codebase. We pass the service client so the helper uses the
        // privileged client in this server context.
        const ownerWorkspaces = await fetchWorkspacesForOwner(owner_id, svc);
        wsCount = Array.isArray(ownerWorkspaces) ? ownerWorkspaces.length : 0;
      } catch (wsErr) {
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

    // Normalize and validate slug server-side (if provided).
    // We perform uniqueness checks before creating the subscription so we fail fast.
    let normalizedSlug: string | null = null;
    try {
      const rawSlug = typeof slug === "string" ? String(slug) : "";
      const candidate = rawSlug.trim().length
        ? rawSlug
            .toLowerCase()
            .replace(/-+/g, "-")
            .replace(/^\-+|\-+$/g, "")
        : "";
      normalizedSlug = candidate || null;

      if (normalizedSlug) {
        // Validate format: must start with alphanumeric, then alnum or dash, max ~64 chars.
        const slugRe = /^[a-z0-9][a-z0-9-]{0,63}$/;
        if (!slugRe.test(normalizedSlug)) {
          return NextResponse.json(
            { error: "Invalid slug format" },
            { status: 400 },
          );
        }

        // Check uniqueness in workspaces
        const { data: existingWs, error: wsErr } = await svc
          .from("workspaces")
          .select("id")
          .ilike("slug", normalizedSlug)
          .limit(1);

        if (wsErr) {
          console.error("Error checking workspace slug uniqueness:", wsErr);
          return NextResponse.json(
            { error: "Failed to validate slug" },
            { status: 500 },
          );
        }

        // Check uniqueness in pending_workspaces
        const { data: existingPending, error: pendErr } = await svc
          .from("pending_workspaces")
          .select("id")
          .ilike("slug", normalizedSlug)
          .limit(1);

        if (pendErr) {
          console.error(
            "Error checking pending_workspaces slug uniqueness:",
            pendErr,
          );
          return NextResponse.json(
            { error: "Failed to validate slug" },
            { status: 500 },
          );
        }

        if (
          (existingWs && (existingWs as any).length > 0) ||
          (existingPending && (existingPending as any).length > 0)
        ) {
          return NextResponse.json(
            { error: "Slug already in use" },
            { status: 400 },
          );
        }
      }
    } catch (err) {
      console.error("Error validating slug before subscription:", err);
      return NextResponse.json(
        { error: "Failed to validate slug" },
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
      // Choose a random logo from a small curated list (we will upload this into the storage bucket)
      const logos = [
        "https://unblast.com/wp-content/uploads/2018/08/Gradient-Mesh-27.jpg",
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRbSkfgIzrobEXcqjh4iQEKOx9XN3dwebM24ZH6HtGH_cwiiGKrdT86DPAMqVINbAUjPnw&usqp=CAU",
        "https://static.vecteezy.com/system/resources/thumbnails/020/414/382/small/colorful-gradient-soft-background-video.jpg",
        "https://cdn.pixabay.com/video/2022/09/18/131766-751014982_tiny.jpg",
      ];
      const chosenLogo = logos[Math.floor(Math.random() * logos.length)];

      // Insert workspace using service client (privileged). We temporarily store the chosen remote URL
      // in the `logo` column and then attempt to upload that remote image into the storage bucket
      // and update the workspace with the storage path + public URL.
      const { data: workspace, error: createErr } = await svc
        .from("workspaces")
        .insert({
          name: name.trim(),
          owner_id,
          plan: productId,
          logo: chosenLogo,
          // persist normalized slug if provided, otherwise null
          slug: normalizedSlug || null,
        })
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

      // Best-effort: attach polar ids to workspace metadata. Use the server helper
      // to fetch/verify the created workspace before attempting the update so
      // callers have a consistent place to centralize workspace reads.
      try {
        const meta = {
          polar_subscription_id: subscription?.id ?? null,
          polar_customer_id: customerId,
        };

        // Verify the workspace exists via the server helper (uses service client)
        // and then update the metadata. If the helper fails or doesn't return a row,
        // we still attempt the update as a fallback.
        try {
          const latest = await fetchWorkspaceByIdServer(workspace.id as string);
          if (latest) {
            await svc
              .from("workspaces")
              .update({ metadata: meta })
              .eq("id", workspace.id as string);
          } else {
            // Fallback: attempt update anyway
            await svc
              .from("workspaces")
              .update({ metadata: meta })
              .eq("id", workspace.id as string);
          }
        } catch (fetchErr) {
          // If helper fails for any reason, attempt the update directly and log
          // the helper error for diagnostics.
          console.warn("fetchWorkspaceByIdServer failed:", fetchErr);
          await svc
            .from("workspaces")
            .update({ metadata: meta })
            .eq("id", workspace.id as string);
        }
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
