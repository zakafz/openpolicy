import { NextResponse } from "next/server";
import { api as polar } from "@/lib/polar";

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
          try {
            const createRes: any = await polar.customers.create({
              externalId: String(customerExternalId!),
              email: customerEmail ?? "",
            });
            const created = createRes?.data ?? createRes;
            customerId = created?.id ?? null;
          } catch (createErr: any) {
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

    try {
      const subscription: any = await polar.subscriptions.create({
        productId: String(productId),
        customerId: String(customerId),
        metadata: { pendingWorkspaceId: String(pendingWorkspaceId) },
      });

      console.info("Polar subscription created", {
        subscriptionId: subscription?.id ?? subscription?.data?.id,
        productId: productId,
        customerId: customerId,
      });

      return NextResponse.json({ ok: true, subscription }, { status: 201 });
    } catch (err: any) {
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
