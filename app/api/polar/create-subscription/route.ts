import { NextResponse } from "next/server";
import { api as polar } from "@/lib/polar";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      productId,
      customerId: providedCustomerId,
      customerExternalId,
      pendingWorkspaceId,
      customerEmail,
    } = body as {
      productId?: string;
      customerId?: string | null;
      customerExternalId?: string | null;
      pendingWorkspaceId?: string | null;
      customerEmail?: string | null;
    };

    if (!productId || !pendingWorkspaceId) {
      return NextResponse.json(
        { error: "Missing required fields: productId and pendingWorkspaceId" },
        { status: 400 },
      );
    }

    const svc = createServiceClient();

    // Resolve or create Polar customer
    let customerId: string | null = providedCustomerId ?? null;

    if (!customerId && customerExternalId) {
      try {
        const res: any = await polar.customers.getExternal({
          externalId: String(customerExternalId!),
        });
        const customer = res?.data ?? res;
        customerId = customer?.id ?? null;
      } catch (err: any) {
        const status = err?.statusCode ?? err?.status ?? null;
        if (status === 404) {
          // Not found - try to create the Polar customer with externalId
          try {
            const createRes: any = await polar.customers.create({
              externalId: String(customerExternalId!),
              // If customerEmail is nullish, omit or pass undefined so SDK does not send empty string.
              email: customerEmail ?? "",
            });
            const created = createRes?.data ?? createRes;
            customerId = created?.id ?? null;
          } catch (createErr: any) {
            // If Polar returns 422 because a customer with this email already exists,
            // attempt to locate the existing customer by email and use its id.
            const createStatus =
              createErr?.statusCode ?? createErr?.status ?? null;
            if (createStatus === 422 && customerEmail) {
              try {
                const listRes: any = await polar.customers.list({});
                const list = listRes?.data ?? listRes;
                if (Array.isArray(list)) {
                  const existing = list.find(
                    (c: any) =>
                      String(c?.email ?? "") === String(customerEmail),
                  );
                  if (existing) {
                    customerId = existing?.id ?? existing?.customerId ?? null;
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
                { error: "Failed to create or resolve Polar customer" },
                { status: 500 },
              );
            }
          }
        } else {
          console.error("Error looking up Polar customer by externalId:", err);
          return NextResponse.json(
            { error: "Polar customer lookup error" },
            { status: 500 },
          );
        }
      }
    }

    if (!customerId) {
      return NextResponse.json(
        {
          error:
            "No customerId available. Provide customerId or customerExternalId.",
        },
        { status: 400 },
      );
    }

    // Create the subscription on Polar for free product.
    try {
      const subscription: any = await polar.subscriptions.create({
        productId: String(productId),
        customerId: String(customerId),
        metadata: { pendingWorkspaceId: String(pendingWorkspaceId) },
      });

      // IMPORTANT: Do not perform privileged DB updates here. Avoid updating
      // `pending_workspaces` from this request to prevent service-role exposure
      // in a request path that may be retried or raced. The webhook handler is
      // responsible for finalizing the pending workspace using the metadata we
      // include above (pendingWorkspaceId).
      console.info("Polar subscription created", {
        subscriptionId: subscription?.id ?? subscription?.data?.id,
        productId: productId,
        customerId: customerId,
      });

      return NextResponse.json({ ok: true, subscription }, { status: 201 });
    } catch (err: any) {
      // Surface Polar error details where available to aid debugging.
      console.error("Polar subscriptions.create error:", err);
      const status = err?.statusCode ?? err?.status ?? 500;
      const message =
        err?.body ??
        err?.message ??
        (typeof err === "string" ? err : "Polar subscription creation failed");
      return NextResponse.json({ error: message }, { status });
    }
  } catch (err) {
    console.error("Server error in /api/polar/create-subscription:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
