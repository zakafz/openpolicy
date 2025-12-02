import { Webhooks } from "@polar-sh/nextjs";
import * as Sentry from "@sentry/nextjs";
import { createServiceClient } from "@/lib/supabase/service";
import { fetchWorkspacesForOwner } from "@/lib/workspace";

async function uploadRemoteImageToBucket(
  supabaseServiceClient: any,
  remoteUrl: string,
  bucketName: string,
  destPath: string,
) {
  const res = await fetch(remoteUrl);
  if (!res.ok) throw new Error(`Failed to fetch remote image: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType =
    res.headers.get("content-type") || "application/octet-stream";

  const { error: uploadError } = await supabaseServiceClient.storage
    .from(bucketName)
    .upload(destPath, buffer, { contentType, upsert: true });

  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabaseServiceClient.storage
    .from(bucketName)
    .getPublicUrl(destPath);

  return { publicURL: publicUrlData.publicUrl, path: destPath };
}

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
    const candidateQueries = [];

    if (pendingWorkspaceId) {
      candidateQueries.push({
        query: svc
          .from("pending_workspaces")
          .select("*")
          .eq("id", pendingWorkspaceId)
          .limit(1),
        label: "id",
      });
    }
    if (customerExternalId) {
      candidateQueries.push({
        query: svc
          .from("pending_workspaces")
          .select("*")
          .eq("customer_external_id", customerExternalId)
          .order("created_at", { ascending: true })
          .limit(1),
        label: "customer_external_id",
      });
    }
    if (customerEmail) {
      candidateQueries.push({
        query: svc
          .from("pending_workspaces")
          .select("*")
          .eq("customer_email", customerEmail)
          .order("created_at", { ascending: true })
          .limit(1),
        label: "customer_email",
      });
    }
    if (customerId) {
      candidateQueries.push({
        query: svc
          .from("pending_workspaces")
          .select("*")
          .eq("customer_id", customerId)
          .order("created_at", { ascending: true })
          .limit(1),
        label: "customer_id",
      });
    }
    if (customerExternalId) {
      candidateQueries.push({
        query: svc
          .from("pending_workspaces")
          .select("*")
          .filter("metadata->>externalId", "eq", customerExternalId)
          .order("created_at", { ascending: true })
          .limit(1),
        label: "metadata->>externalId",
      });
      candidateQueries.push({
        query: svc
          .from("pending_workspaces")
          .select("*")
          .filter("metadata->>external_id", "eq", customerExternalId)
          .order("created_at", { ascending: true })
          .limit(1),
        label: "metadata->>external_id",
      });
    }
    if (customerEmail) {
      candidateQueries.push({
        query: svc
          .from("pending_workspaces")
          .select("*")
          .filter("metadata->>customer_email", "eq", customerEmail)
          .order("created_at", { ascending: true })
          .limit(1),
        label: "metadata->>customer_email",
      });
      candidateQueries.push({
        query: svc
          .from("pending_workspaces")
          .select("*")
          .filter("metadata->>email", "eq", customerEmail)
          .order("created_at", { ascending: true })
          .limit(1),
        label: "metadata->>email",
      });
    }

    let pending: any = null;
    for (const { query, label } of candidateQueries) {
      const { data, error } = await query;
      if (error) {
        Sentry.captureException(error, {
          tags: { context: "finalizePendingWorkspace", query_label: label },
        });
        continue;
      }
      if (Array.isArray(data) && data.length > 0) {
        pending = data[0];
        break;
      }
    }

    if (
      !pending &&
      (pendingWorkspaceId || customerExternalId || customerEmail || customerId)
    ) {
      const { data: recent, error: recentErr } = await svc
        .from("pending_workspaces")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      if (!recentErr && Array.isArray(recent) && recent.length > 0) {
        pending = recent.find((r: any) => {
          if (pendingWorkspaceId && r.id === pendingWorkspaceId) return true;
          if (
            customerExternalId &&
            String(r.customer_external_id) === String(customerExternalId)
          )
            return true;
          if (
            customerEmail &&
            String(r.customer_email) === String(customerEmail)
          )
            return true;
          if (customerId && String(r.customer_id) === String(customerId))
            return true;
          const md = r.metadata ?? {};
          if (
            customerExternalId &&
            (md.externalId === customerExternalId ||
              md.external_id === customerExternalId)
          )
            return true;
          if (
            customerEmail &&
            (md.email === customerEmail || md.customer_email === customerEmail)
          )
            return true;
          return false;
        });
        if (pending) {
        }
      }
    }

    if (!pending) {
      return;
    }

    let duplicateFound = false;
    try {
      const ownerWorkspaces = await fetchWorkspacesForOwner(
        pending.owner_id,
        svc,
      );
      if (Array.isArray(ownerWorkspaces) && ownerWorkspaces.length > 0) {
        duplicateFound = ownerWorkspaces.some(
          (w: any) =>
            typeof w?.name === "string" &&
            String(w.name).toLowerCase() === String(pending.name).toLowerCase(),
        );
      }
    } catch (existsErr) {
      Sentry.captureException(existsErr, {
        tags: { context: "finalizePendingWorkspace", step: "check_duplicates" },
      });
    }

    if (duplicateFound) {
      await svc.from("pending_workspaces").delete().eq("id", pending.id);
      return;
    }

    const logos: any = [
      "https://unblast.com/wp-content/uploads/2018/08/Gradient-Mesh-27.jpg",
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRbSkfgIzrobEXcqjh4iQEKOx9XN3dwebM24ZH6HtGH_cwiiGKrdT86DPAMqVINbAUjPnw&usqp=CAU",
      "https://static.vecteezy.com/system/resources/thumbnails/020/414/382/small/colorful-gradient-soft-background-video.jpg",
      "https://cdn.pixabay.com/video/2022/09/18/131766-751014982_tiny.jpg",
    ];
    const chosenLogo =
      pending?.metadata?.logo ??
      logos[Math.floor(Math.random() * logos.length)];

    let workspace = null;
    let createErr = null;
    try {
      const { data, error } = await svc
        .from("workspaces")
        .insert({
          name: pending.name,
          owner_id: pending.owner_id,
          plan: pending.plan,
          logo: chosenLogo,
          slug: pending.slug ?? pending.metadata?.slug ?? null,
        })
        .select()
        .single();
      workspace = data;
      createErr = error;
    } catch (e) {
      createErr = e;
    }

    if (createErr || !workspace) {
      Sentry.captureException(createErr, {
        tags: { context: "finalizePendingWorkspace", step: "create_workspace" },
        extra: { pendingId: pending.id, workspaceName: pending.name },
      });
      try {
        await svc
          .from("pending_workspaces")
          .update({
            metadata: {
              ...(pending?.metadata ?? {}),
              finalized_error: String(createErr),
              finalized_at: new Date().toISOString(),
            },
          })
          .eq("id", pending.id);
      } catch (annotateErr) {
        Sentry.captureException(annotateErr, {
          tags: { context: "finalizePendingWorkspace", step: "annotate_error" },
        });
      }
      return;
    }

    try {
      const bucketName = "workspace-logos";
      const ext = String(chosenLogo).split(".").pop()?.split("?")[0] ?? "jpg";
      const destPath = `logos/${workspace.id}/logo-${Date.now()}.${ext}`;

      try {
        const { publicURL, path } = await uploadRemoteImageToBucket(
          svc,
          chosenLogo,
          bucketName,
          destPath,
        );

        await svc
          .from("workspaces")
          .update({ logo: publicURL, logo_path: path })
          .eq("id", workspace.id);
      } catch (_logoErr) {}
    } catch (_e) {}

    try {
      await svc.from("pending_workspaces").delete().eq("id", pending.id);
    } catch (delErr) {
      Sentry.captureException(delErr, {
        tags: { context: "finalizePendingWorkspace", step: "cleanup_pending" },
      });
    }
  } catch (e) {
    Sentry.captureException(e, {
      tags: { context: "finalizePendingWorkspace", step: "general_error" },
    });
  }
}

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,

  onSubscriptionCreated: async (payload: any) => {
    const svc = createServiceClient();
    const pendingWorkspaceId =
      payload?.data?.metadata?.pendingWorkspaceId ??
      payload?.data?.subscription?.metadata?.pendingWorkspaceId ??
      null;
    const customer =
      payload?.data?.customer ?? payload?.data?.subscription?.customer ?? null;

    const subscription = payload?.data?.subscription ?? payload?.data;
    const subscriptionId = subscription?.id ?? null;
    const status = subscription?.status ?? null;
    const currentPeriodEnd = subscription?.current_period_end ?? null;

    await finalizePendingWorkspace({
      svc,
      pendingWorkspaceId,
      customerExternalId: customer?.externalId ?? null,
      customerEmail: customer?.email ?? null,
      customerId: customer?.id ?? null,
    });

    if (subscriptionId && customer?.externalId) {
      try {
        await svc
          .from("workspaces")
          .update({
            subscription_id: subscriptionId,
            subscription_status: status,
            subscription_current_period_end: currentPeriodEnd,
          })
          .eq("owner_id", customer.externalId);
      } catch (err) {
        Sentry.captureException(err, {
          tags: {
            context: "onSubscriptionCreated",
            step: "update_subscription",
          },
        });
      }
    }
  },

  onSubscriptionUpdated: async (payload: any) => {
    const svc = createServiceClient();
    const pendingWorkspaceId =
      payload?.data?.metadata?.pendingWorkspaceId ??
      payload?.data?.subscription?.metadata?.pendingWorkspaceId ??
      null;
    const customer =
      payload?.data?.customer ?? payload?.data?.subscription?.customer ?? null;

    const subscription = payload?.data?.subscription ?? payload?.data;
    const subscriptionId = subscription?.id ?? null;
    const status = subscription?.status ?? null;
    const currentPeriodEnd = subscription?.current_period_end ?? null;

    await finalizePendingWorkspace({
      svc,
      pendingWorkspaceId,
      customerExternalId: customer?.externalId ?? null,
      customerEmail: customer?.email ?? null,
      customerId: customer?.id ?? null,
    });

    if (subscriptionId) {
      try {
        await svc
          .from("workspaces")
          .update({
            subscription_status: status,
            subscription_current_period_end: currentPeriodEnd,
          })
          .eq("subscription_id", subscriptionId);
      } catch (err) {
        Sentry.captureException(err, {
          tags: { context: "onSubscriptionUpdated", step: "update_status" },
        });
      }
    }
  },

  onSubscriptionActive: async (payload: any) => {
    const svc = createServiceClient();
    const pendingWorkspaceId =
      payload?.data?.metadata?.pendingWorkspaceId ??
      payload?.data?.subscription?.metadata?.pendingWorkspaceId ??
      null;
    const customer =
      payload?.data?.customer ?? payload?.data?.subscription?.customer ?? null;

    const subscription = payload?.data?.subscription ?? payload?.data;
    const subscriptionId = subscription?.id ?? null;
    const currentPeriodEnd = subscription?.current_period_end ?? null;

    await finalizePendingWorkspace({
      svc,
      pendingWorkspaceId,
      customerExternalId: customer?.externalId ?? null,
      customerEmail: customer?.email ?? null,
      customerId: customer?.id ?? null,
    });

    if (subscriptionId) {
      try {
        await svc
          .from("workspaces")
          .update({
            subscription_status: "active",
            subscription_current_period_end: currentPeriodEnd,
          })
          .eq("subscription_id", subscriptionId);
      } catch (err) {
        Sentry.captureException(err, {
          tags: { context: "onSubscriptionActive", step: "update_active" },
        });
      }
    }
  },

  onOrderCreated: async (payload: any) => {
    const svc = createServiceClient();
    const pendingWorkspaceId =
      payload?.data?.order?.metadata?.pendingWorkspaceId ??
      payload?.data?.metadata?.pendingWorkspaceId ??
      null;
    const customer =
      payload?.data?.order?.customer ?? payload?.data?.customer ?? null;
    const billingReason = payload?.data?.order?.billing_reason;

    if (
      billingReason === "subscription_create" ||
      billingReason === "purchase"
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

  onOrderPaid: async (payload: any) => {
    const svc = createServiceClient();
    const pendingWorkspaceId =
      payload?.data?.order?.metadata?.pendingWorkspaceId ??
      payload?.data?.metadata?.pendingWorkspaceId ??
      payload?.data?.order?.subscription?.metadata?.pendingWorkspaceId ??
      payload?.data?.subscription?.metadata?.pendingWorkspaceId ??
      null;

    const orderCustomer = payload?.data?.order?.customer ?? null;
    const topCustomer = payload?.data?.customer ?? null;
    const subscriptionCustomer = payload?.data?.subscription?.customer ?? null;

    const customerObj =
      orderCustomer ?? subscriptionCustomer ?? topCustomer ?? null;

    const meta =
      payload?.data?.order?.metadata ?? payload?.data?.metadata ?? {};
    const metaCustomerExternal =
      meta?.customerExternalId ?? meta?.customer_external_id ?? null;
    const metaCustomerEmail =
      meta?.customerEmail ?? meta?.customer_email ?? meta?.email ?? null;
    const metaCustomerId =
      meta?.customerId ?? meta?.customer_id ?? meta?.customer ?? null;

    const customerExternalId =
      customerObj?.externalId ??
      customerObj?.external_id ??
      metaCustomerExternal ??
      null;
    const customerEmail =
      customerObj?.email ??
      customerObj?.email_address ??
      metaCustomerEmail ??
      null;
    const customerId =
      customerObj?.id ??
      customerObj?.customerId ??
      customerObj?.customer_id ??
      metaCustomerId ??
      null;

    await finalizePendingWorkspace({
      svc,
      pendingWorkspaceId,
      customerExternalId,
      customerEmail,
      customerId,
    });
  },

  onSubscriptionCanceled: async (payload: any) => {
    const svc = createServiceClient();
    const customer =
      payload?.data?.customer ?? payload?.data?.subscription?.customer ?? null;
    const subscription = payload?.data?.subscription ?? payload?.data;
    const subscriptionId = subscription?.id ?? null;

    if (subscriptionId) {
      try {
        const { data: workspace } = await svc
          .from("workspaces")
          .select("id, plan")
          .eq("subscription_id", subscriptionId)
          .single();

        if (workspace) {
          const { data: activeDocuments } = await svc
            .from("documents")
            .select("id, created_at")
            .eq("workspace_id", workspace.id)
            .neq("status", "archived")
            .order("created_at", { ascending: true });

          if (activeDocuments && activeDocuments.length > 3) {
            const toArchive = activeDocuments.slice(
              0,
              activeDocuments.length - 3,
            );
            const idsToArchive = toArchive.map((d) => d.id);

            await svc
              .from("documents")
              .update({ status: "archived" })
              .in("id", idsToArchive);
          }

          await svc
            .from("workspaces")
            .update({
              plan: null,
              subscription_status: "canceled",
            })
            .eq("id", workspace.id);
        }
      } catch (err) {
        Sentry.captureException(err, {
          tags: { context: "onSubscriptionCanceled", step: "downgrade" },
        });
      }
    }

    try {
      const customerExternalId = customer?.externalId ?? null;
      const customerEmail = customer?.email ?? null;
      const customerId = customer?.id ?? null;

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
      Sentry.captureException(err, {
        tags: { context: "onSubscriptionCanceled" },
      });
    }
  },

  onSubscriptionRevoked: async (payload: any) => {
    const svc = createServiceClient();
    const customer =
      payload?.data?.customer ?? payload?.data?.subscription?.customer ?? null;
    const subscription = payload?.data?.subscription ?? payload?.data;
    const subscriptionId = subscription?.id ?? null;

    if (subscriptionId) {
      try {
        const { data: workspace } = await svc
          .from("workspaces")
          .select("id, plan")
          .eq("subscription_id", subscriptionId)
          .single();

        if (workspace) {
          const { data: activeDocuments } = await svc
            .from("documents")
            .select("id, created_at")
            .eq("workspace_id", workspace.id)
            .neq("status", "archived")
            .order("created_at", { ascending: true });

          if (activeDocuments && activeDocuments.length > 3) {
            const toArchive = activeDocuments.slice(
              0,
              activeDocuments.length - 3,
            );
            const idsToArchive = toArchive.map((d) => d.id);

            await svc
              .from("documents")
              .update({ status: "archived" })
              .in("id", idsToArchive);
          }

          await svc
            .from("workspaces")
            .update({
              plan: null,
              subscription_status: "canceled",
            })
            .eq("id", workspace.id);
        }
      } catch (err) {
        Sentry.captureException(err, {
          tags: { context: "onSubscriptionRevoked", step: "downgrade" },
        });
      }
    }

    try {
      const customerExternalId = customer?.externalId ?? null;
      const customerEmail = customer?.email ?? null;
      const customerId = customer?.id ?? null;

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
      Sentry.captureException(err, {
        tags: { context: "onSubscriptionRevoked" },
      });
    }
  },

  onCustomerUpdated: async (payload: any) => {
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
});
