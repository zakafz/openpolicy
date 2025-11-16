import { Webhooks } from "@polar-sh/nextjs";
import { createServiceClient } from "@/lib/supabase/service";

// Finalize a pending workspace by correlating webhook payload to pending_workspaces.
// Correlation priority: metadata.pendingWorkspaceId -> customer.externalId -> customer.email -> customer.id
async function finalizePendingWorkspace({
  svc,
  pendingWorkspaceId,
  customerExternalId,
  customerEmail,
  customerId,
}: {
  svc: ReturnType<typeof createServiceClient>;
  pendingWorkspaceId?: string | null;
  customerExternalId?: string | null;
  customerEmail?: string | null;
  customerId?: string | null;
}) {
  try {
    // Build query using first available identifier
    let q;
    if (pendingWorkspaceId) {
      q = svc
        .from("pending_workspaces")
        .select("*")
        .eq("id", pendingWorkspaceId)
        .limit(1);
    } else if (customerExternalId) {
      q = svc
        .from("pending_workspaces")
        .select("*")
        .eq("customer_external_id", customerExternalId)
        .order("created_at", { ascending: true })
        .limit(1);
    } else if (customerEmail) {
      q = svc
        .from("pending_workspaces")
        .select("*")
        .eq("customer_email", customerEmail)
        .order("created_at", { ascending: true })
        .limit(1);
    } else if (customerId) {
      q = svc
        .from("pending_workspaces")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: true })
        .limit(1);
    } else {
      return;
    }

    const { data: rows, error } = await q;
    if (error || !rows || rows.length === 0) return;
    const pending = rows[0];

    // Prevent duplicates
    const { data: existing, error: existsErr } = await svc
      .from("workspaces")
      .select("id")
      .eq("owner_id", pending.owner_id)
      .eq("name", pending.name)
      .limit(1);

    if (existsErr || (existing && existing.length > 0)) {
      console.log("pending already has workspace, deleting pending", {
        pendingId: pending.id,
        owner: pending.owner_id,
        name: pending.name,
      });
      await svc.from("pending_workspaces").delete().eq("id", pending.id);
      return;
    }

    // Create workspace
    // Choose a logo: prefer any logo that was stored on the pending row metadata,
    // otherwise pick a random one from the curated list (same as free-flow).
    const logos = [
      "https://unblast.com/wp-content/uploads/2018/08/Gradient-Mesh-27.jpg",
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRbSkfgIzrobEXcqjh4iQEKOx9XN3dwebM24ZH6HtGH_cwiiGKrdT86DPAMqVINbAUjPnw&usqp=CAU",
      "https://static.vecteezy.com/system/resources/thumbnails/020/414/382/small/colorful-gradient-soft-background-video.jpg",
      "https://cdn.pixabay.com/video/2022/09/18/131766-751014982_tiny.jpg",
    ];
    const chosenLogo =
      (pending?.metadata && (pending.metadata as any)?.logo) ??
      logos[Math.floor(Math.random() * logos.length)];

    const { data: workspace, error: createErr } = await svc
      .from("workspaces")
      .insert({
        name: pending.name,
        owner_id: pending.owner_id,
        plan: pending.plan,
        logo: chosenLogo,
      })
      .select()
      .single();

    if (createErr || !workspace) return;

    // Mark pending as completed
    console.log("workspace created, deleting pending", {
      pendingId: pending.id,
      workspaceId: workspace.id,
    });
    await svc.from("pending_workspaces").delete().eq("id", pending.id);
  } catch (e) {
    console.error("finalizePendingWorkspace error:", e);
  }
}

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,

  // Fired when a subscription is first created (could be free creation or via checkout)
  onSubscriptionCreated: async (payload: any) => {
    console.log("Polar webhook: subscription.created", {
      id: payload?.data?.subscription?.id ?? payload?.data?.id,
      metadata:
        payload?.data?.subscription?.metadata ?? payload?.data?.metadata,
    });

    const svc = createServiceClient();

    const pendingWorkspaceId =
      payload?.data?.metadata?.pendingWorkspaceId ??
      payload?.data?.subscription?.metadata?.pendingWorkspaceId ??
      null;
    const customer =
      payload?.data?.customer ?? payload?.data?.subscription?.customer ?? null;

    await finalizePendingWorkspace({
      svc,
      pendingWorkspaceId,
      customerExternalId: customer?.externalId ?? null,
      customerEmail: customer?.email ?? null,
      customerId: customer?.id ?? null,
    });
  },

  // subscription.updated is a catch-all for status changes, cancellations, etc.
  onSubscriptionUpdated: async (payload: any) => {
    console.log("Polar webhook: subscription.updated", {
      id: payload?.data?.subscription?.id ?? payload?.data?.id,
      status: payload?.data?.subscription?.status ?? payload?.data?.status,
      metadata:
        payload?.data?.subscription?.metadata ?? payload?.data?.metadata,
    });

    const svc = createServiceClient();

    const pendingWorkspaceId =
      payload?.data?.metadata?.pendingWorkspaceId ??
      payload?.data?.subscription?.metadata?.pendingWorkspaceId ??
      null;
    const customer =
      payload?.data?.customer ?? payload?.data?.subscription?.customer ?? null;

    // If the subscription transitioned to active (or was updated to a paid state),
    // try to finalize the pending workspace.
    await finalizePendingWorkspace({
      svc,
      pendingWorkspaceId,
      customerExternalId: customer?.externalId ?? null,
      customerEmail: customer?.email ?? null,
      customerId: customer?.id ?? null,
    });
  },

  // subscription.active (keeps previous behavior) -- ensure we log for visibility
  onSubscriptionActive: async (payload: any) => {
    console.log("Polar webhook: subscription.active", {
      id: payload?.data?.subscription?.id ?? payload?.data?.id,
      metadata:
        payload?.data?.subscription?.metadata ?? payload?.data?.metadata,
    });

    const svc = createServiceClient();

    const pendingWorkspaceId =
      payload?.data?.metadata?.pendingWorkspaceId ??
      payload?.data?.subscription?.metadata?.pendingWorkspaceId ??
      null;
    const customer =
      payload?.data?.customer ?? payload?.data?.subscription?.customer ?? null;

    await finalizePendingWorkspace({
      svc,
      pendingWorkspaceId,
      customerExternalId: customer?.externalId ?? null,
      customerEmail: customer?.email ?? null,
      customerId: customer?.id ?? null,
    });
  },

  // order.created can be used to detect subscription creation/renewal depending on billing_reason
  onOrderCreated: async (payload: any) => {
    console.log("Polar webhook: order.created", {
      id: payload?.data?.order?.id ?? payload?.data?.id,
      billing_reason: payload?.data?.order?.billing_reason,
      metadata: payload?.data?.order?.metadata ?? payload?.data?.metadata,
    });

    const svc = createServiceClient();

    const pendingWorkspaceId =
      payload?.data?.order?.metadata?.pendingWorkspaceId ??
      payload?.data?.metadata?.pendingWorkspaceId ??
      null;
    const customer =
      payload?.data?.order?.customer ?? payload?.data?.customer ?? null;

    // If this order was created for subscription creation, finalize
    if (
      payload?.data?.order?.billing_reason === "subscription_create" ||
      payload?.data?.order?.billing_reason === "purchase"
    ) {
      await finalizePendingWorkspace({
        svc,
        pendingWorkspaceId,
        customerExternalId: customer?.externalId ?? null,
        customerEmail: customer?.email ?? null,
        customerId: customer?.id ?? null,
      });
    }
  },

  // order.paid remains important for paid checkouts
  onOrderPaid: async (payload: any) => {
    console.log("Polar webhook: order.paid", {
      id: payload?.data?.order?.id ?? payload?.data?.id,
      metadata: payload?.data?.order?.metadata ?? payload?.data?.metadata,
    });

    const svc = createServiceClient();

    const pendingWorkspaceId =
      payload?.data?.order?.metadata?.pendingWorkspaceId ??
      payload?.data?.metadata?.pendingWorkspaceId ??
      null;
    const customer =
      payload?.data?.order?.customer ?? payload?.data?.customer ?? null;

    await finalizePendingWorkspace({
      svc,
      pendingWorkspaceId,
      customerExternalId: customer?.externalId ?? null,
      customerEmail: customer?.email ?? null,
      customerId: customer?.id ?? null,
    });
  },

  // Handle cancellation / revocation events in a consistent way
  onSubscriptionCanceled: async (payload: any) => {
    console.log("Polar webhook: subscription.canceled", {
      id: payload?.data?.subscription?.id ?? payload?.data?.id,
      customer:
        payload?.data?.customer ?? payload?.data?.subscription?.customer,
    });

    const svc = createServiceClient();
    const customer =
      payload?.data?.customer ?? payload?.data?.subscription?.customer ?? null;
    const customerExternalId = customer?.externalId ?? null;
    const customerEmail = customer?.email ?? null;
    const customerId = customer?.id ?? null;

    try {
      if (customerExternalId) {
        await svc
          .from("pending_workspaces")
          .update({ metadata: { canceled_at: new Date().toISOString() } })
          .eq("customer_external_id", customerExternalId);
      } else if (customerEmail) {
        await svc
          .from("pending_workspaces")
          .update({ metadata: { canceled_at: new Date().toISOString() } })
          .eq("customer_email", customerEmail);
      } else if (customerId) {
        await svc
          .from("pending_workspaces")
          .update({ metadata: { canceled_at: new Date().toISOString() } })
          .eq("customer_id", customerId);
      }
    } catch (err) {
      console.error("Error marking pending_workspaces as canceled:", err);
    }
  },

  // subscription.revoked -> treat similar to canceled: mark pending as canceled
  onSubscriptionRevoked: async (payload: any) => {
    console.log("Polar webhook: subscription.revoked", {
      id: payload?.data?.subscription?.id ?? payload?.data?.id,
      customer:
        payload?.data?.customer ?? payload?.data?.subscription?.customer,
    });

    const svc = createServiceClient();
    const customer =
      payload?.data?.customer ?? payload?.data?.subscription?.customer ?? null;
    const customerExternalId = customer?.externalId ?? null;
    const customerEmail = customer?.email ?? null;
    const customerId = customer?.id ?? null;

    try {
      if (customerExternalId) {
        await svc
          .from("pending_workspaces")
          .update({ metadata: { canceled_at: new Date().toISOString() } })
          .eq("customer_external_id", customerExternalId);
      } else if (customerEmail) {
        await svc
          .from("pending_workspaces")
          .update({ metadata: { canceled_at: new Date().toISOString() } })
          .eq("customer_email", customerEmail);
      } else if (customerId) {
        await svc
          .from("pending_workspaces")
          .update({ metadata: { canceled_at: new Date().toISOString() } })
          .eq("customer_id", customerId);
      }
    } catch (err) {
      console.error(
        "Error marking pending_workspaces as revoked/canceled:",
        err,
      );
    }
  },

  // customer.updated - sometimes Polar updates customer externalId/email later; try to finalize if possible
  onCustomerUpdated: async (payload: any) => {
    console.log("Polar webhook: customer.updated", {
      id: payload?.data?.customer?.id ?? payload?.data?.id,
      email: payload?.data?.customer?.email,
      externalId: payload?.data?.customer?.externalId,
    });

    const svc = createServiceClient();
    const customer = payload?.data?.customer ?? null;
    await finalizePendingWorkspace({
      svc,
      pendingWorkspaceId: null,
      customerExternalId: customer?.externalId ?? null,
      customerEmail: customer?.email ?? null,
      customerId: customer?.id ?? null,
    });
  },

  // Generic catch-all logging for events not explicitly handled by the SDK wrapper:
  // The Webhooks helper will still verify signature; if new events appear, they'll at least be logged.
  // Note: if the SDK supports other handlers you can add them similarly.
});
