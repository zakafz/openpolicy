import { Polar } from "@polar-sh/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

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
                          await (polar.customers as any).update({
                            id: found.id,
                            externalId: user.id,
                          });
                        } catch (updateErr) {
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
      } catch (err) {}

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      let finalNext = next;
      if (next === "/dashboard") {
        try {
          const {
            data: { user },
          } = await sessionClient.auth.getUser();

          if (user) {
            const svc = createServiceClient();
            const { data: workspaces } = await svc
              .from("workspaces")
              .select("id")
              .eq("owner_id", user.id)
              .limit(1);

            if (!workspaces || workspaces.length === 0) {
              finalNext = "/create";
            }
          }
        } catch (err) {
          console.error("Error checking workspaces:", err);
        }
      }

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${finalNext}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${finalNext}`);
      } else {
        return NextResponse.redirect(`${origin}${finalNext}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`);
}
