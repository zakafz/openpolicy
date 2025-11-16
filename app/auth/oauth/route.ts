// /auth/oauth/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { Polar } from "@polar-sh/sdk";

const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN ?? "",
  server: "sandbox",
});

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  let next = searchParams.get("next") ?? "/";

  if (!next.startsWith("/")) {
    next = "/";
  }

  if (code) {
    const sessionClient = await createClient();
    const { error } = await sessionClient.auth.exchangeCodeForSession(code);

    if (!error) {
      try {
        const {
          data: { session },
          error: sessionErr,
        } = await sessionClient.auth.getSession();

        if (!sessionErr && session?.user) {
          const user = session.user as any;

          const profileInsert = {
            auth_id: user.id,
            full_name:
              user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
            avatar_url:
              user.user_metadata?.avatar_url ??
              user.user_metadata?.picture ??
              null,
            email: user.email ?? null,
            provider:
              user.app_metadata?.provider ??
              (user.identities && user.identities[0]
                ? user.identities[0].provider
                : null),
            provider_user_id:
              user.identities && user.identities[0]
                ? user.identities[0].id
                : null,
            raw_user: user.user_metadata ?? {},
            metadata: {},
          };

          const svc = createServiceClient();
          const { error: upsertErr } = await svc
            .from("users")
            .upsert(profileInsert, { onConflict: "auth_id" });

          if (!upsertErr && user.email) {
            try {
              await polar.customers.getExternal({
                externalId: user.id,
              });
            } catch (err: any) {
              if (err?.statusCode === 404 || err?.status === 404) {
                // Try to create the Polar customer. If creation fails because a customer
                // with this email already exists (422), attempt to look up the existing
                // customer by email and patch its externalId (best-effort).
                try {
                  await polar.customers.create({
                    email: user.email,
                    name: profileInsert.full_name ?? undefined,
                    externalId: user.id,
                    metadata: {
                      provider: profileInsert.provider,
                    },
                  });
                } catch (createErr: any) {
                  const createStatus =
                    createErr?.statusCode ?? createErr?.status ?? null;
                  // If email already exists, Polar may return 422. Try to find the
                  // existing customer and set its externalId so future lookups work.
                  if (createStatus === 422 && user.email) {
                    try {
                      const listRes: any = await polar.customers.list({});
                      const list = listRes?.data ?? listRes ?? [];
                      const found = (list || []).find(
                        (c: any) =>
                          String(c?.email ?? "") === String(user.email),
                      );
                      if (found?.id) {
                        try {
                          // Best-effort: set the externalId on the existing customer so
                          // polar.customers.getExternal will work for this user in future.
                          // The SDK types may not include `externalId` on update payload in some versions,
                          // so cast `polar.customers` to `any` to avoid a TypeScript error while still
                          // making the intended API call.
                          await (polar.customers as any).update({
                            id: found.id,
                            externalId: user.id,
                          });
                        } catch (updateErr) {
                          // Don't block the login flow — just log the failure.
                          console.warn(
                            "Failed to update existing Polar customer externalId:",
                            updateErr,
                          );
                        }
                      }
                    } catch (listErr) {
                      console.warn(
                        "Failed to lookup existing Polar customer by email after create 422:",
                        listErr,
                      );
                    }
                  } else {
                    // Other errors creating customer shouldn't block the login flow — log and continue.
                    console.warn(
                      "Failed to create Polar customer in OAuth flow:",
                      createErr,
                    );
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        // Silent error handling
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`);
}
