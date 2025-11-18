import { Webhooks } from "@polar-sh/nextjs";
import { createServiceClient } from "@/lib/supabase/service";
import { fetchWorkspacesForOwner } from "@/lib/workspace";

// Helper: fetch a remote image and upload to Supabase Storage (server-side)
// This uses the service-role Supabase client (svc) passed in to perform the upload.
// Bucket is expected to be configured (public in your case).
async function uploadRemoteImageToBucket(
  supabaseServiceClient: any,
  remoteUrl: string,
  bucketName: string,
  destPath: string,
) {
  // fetch remote image
  const res = await fetch(remoteUrl);
  if (!res.ok) throw new Error(`Failed to fetch remote image: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  // Buffer is available in Node.js runtime for Next.js server functions
  const buffer = Buffer.from(arrayBuffer);
  const contentType =
    res.headers.get("content-type") || "application/octet-stream";

  // upload to storage (upsert true to overwrite)
  const { error: uploadError } = await supabaseServiceClient.storage
    .from(bucketName)
    .upload(destPath, buffer, { contentType, upsert: true });

  if (uploadError) throw uploadError;

  // get public URL (bucket is public)
  const { publicURL } = supabaseServiceClient.storage
    .from(bucketName)
    .getPublicUrl(destPath);

  return { publicURL, path: destPath };
}

// Finalize a pending workspace by correlating webhook payload to pending_workspaces.
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
    // Build candidate queries in priority order
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

    // Try all candidates in order
    let pending: any = null;
    for (const { query, label } of candidateQueries) {
      const { data, error } = await query;
      if (error) {
        console.warn(`finalizePendingWorkspace: query error (${label})`, error);
        continue;
      }
      if (Array.isArray(data) && data.length > 0) {
        pending = data[0];
        console.log(`finalizePendingWorkspace: matched pending via ${label}`, {
          id: pending.id,
          label,
        });
        break;
      }
    }

    // Final fallback: try heuristics if still not found but identifiers present
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
          // metadata-based
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
          console.log(
            "finalizePendingWorkspace: heuristic matched recent pending",
            { pendingId: pending.id },
          );
        }
      }
    }

    if (!pending) {
      console.log(
        "finalizePendingWorkspace: no pending_workspaces row matched",
        {
          pendingWorkspaceId,
          customerExternalId,
          customerEmail,
          customerId,
        },
      );
      return;
    }

    // Prevent duplicates (fetch workspaces for owner)
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
      console.error(
        "Error checking existing workspaces via helper:",
        existsErr,
      );
    }

    if (duplicateFound) {
      console.log("pending already has workspace, deleting pending", {
        pendingId: pending.id,
        owner: pending.owner_id,
        name: pending.name,
      });
      await svc.from("pending_workspaces").delete().eq("id", pending.id);
      return;
    }

    // Pick a logo
    const logos: any = [
      "https://unblast.com/wp-content/uploads/2018/08/Gradient-Mesh-27.jpg",
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRbSkfgIzrobEXcqjh4iQEKOx9XN3dwebM24ZH6HtGH_cwiiGKrdT86DPAMqVINbAUjPnw&usqp=CAU",
      "https://static.vecteezy.com/system/resources/thumbnails/020/414/382/small/colorful-gradient-soft-background-video.jpg",
      "https://cdn.pixabay.com/video/2022/09/18/131766-751014982_tiny.jpg",
    ];
    const chosenLogo =
      pending?.metadata?.logo ??
      logos[Math.floor(Math.random() * logos.length)];

    // Try to create the workspace
    let workspace = null;
    let createErr = null;
    try {
      const { data, error } = await svc
        .from("workspaces")
        .insert({
          name: pending.name,
          owner_id: pending.owner_id,
          plan: pending.plan,
          // store the chosen remote URL initially; we'll attempt to upload it to storage below
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
      console.error("Failed to create workspace in DB (webhook):", createErr);
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
        console.error(
          "Failed to annotate pending_workspaces after create failure:",
          annotateErr,
        );
      }
      return;
    }

    // Successfully created workspace; attempt to upload chosen remote logo into storage and update DB
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

        // Update workspace record with public URL and storage path
        await svc
          .from("workspaces")
          .update({ logo: publicURL, logo_path: path })
          .eq("id", workspace.id);
      } catch (logoErr) {
        // If upload fails, keep workspace created with the original chosenLogo URL.
        console.warn("Uploading remote logo to storage failed:", logoErr);
      }
    } catch (e) {
      console.warn("Logo storage step failed:", e);
    }

    // Delete pending row now that workspace is created
    console.log("workspace created, deleting pending", {
      pendingId: pending.id,
      workspaceId: workspace.id,
    });
    try {
      await svc.from("pending_workspaces").delete().eq("id", pending.id);
    } catch (delErr) {
      console.error(
        "Failed to delete pending_workspaces after workspace creation:",
        delErr,
      );
    }
  } catch (e) {
    console.error("finalizePendingWorkspace error:", e);
  }
}

// POST webhook handler
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
    await finalizePendingWorkspace({
      svc,
      pendingWorkspaceId,
      customerExternalId: customer?.externalId ?? null,
      customerEmail: customer?.email ?? null,
      customerId: customer?.id ?? null,
    });
  },

  onSubscriptionUpdated: async (payload: any) => {
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

  onSubscriptionActive: async (payload: any) => {
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

  onOrderCreated: async (payload: any) => {
    const svc = createServiceClient();
    const pendingWorkspaceId =
      payload?.data?.order?.metadata?.pendingWorkspaceId ??
      payload?.data?.metadata?.pendingWorkspaceId ??
      null;
    const customer =
      payload?.data?.order?.customer ?? payload?.data?.customer ?? null;

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

  onSubscriptionRevoked: async (payload: any) => {
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
