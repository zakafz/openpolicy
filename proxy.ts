import { createClient } from "@supabase/supabase-js";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  analytics: true,
});

export default async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api")) {
    if (
      process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN
    ) {
      const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
      try {
        const { success, limit, reset, remaining } = await ratelimit.limit(ip);

        if (!success) {
          return NextResponse.json(
            { error: "Too Many Requests" },
            {
              status: 429,
              headers: {
                "X-RateLimit-Limit": limit.toString(),
                "X-RateLimit-Remaining": remaining.toString(),
                "X-RateLimit-Reset": reset.toString(),
              },
            },
          );
        }
      } catch (e) {
        console.warn("Rate limiting failed:", e);
      }
    }
  }

  const supabaseResponse = await updateSession(request);

  try {
    const host = request.headers.get("host") ?? "";
    const hostname = host.split(":")[0]; // strip port if present

    const rootDomains = [
      "openpolicyhq.com",
      "localhost",
      "lvh.me",
      "127.0.0.1",
      "nip.io",
    ];

    if (hostname) {
      const parts = hostname.split(".");
      if (parts.length >= 2) {
        let potentialRoot = parts.slice(-2).join(".");
        let subdomain = parts.slice(0, -2).join(".") || null;

        if (!rootDomains.includes(potentialRoot)) {
          potentialRoot = parts.slice(-1).join(".");
          subdomain = parts.slice(0, -1).join(".") || null;
        }
        if (
          !rootDomains.includes(hostname) &&
          !request.nextUrl.pathname.startsWith("/api")
        ) {
          let workspaceSlug: string | null = null;
          const cacheKey = `custom_domain:${hostname}`;

          if (
            process.env.UPSTASH_REDIS_REST_URL &&
            process.env.UPSTASH_REDIS_REST_TOKEN
          ) {
            try {
              workspaceSlug = await redis.get(cacheKey);
            } catch (e) {
              console.warn("Redis error:", e);
            }
          }

          if (!workspaceSlug) {
            try {
              const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
              const serviceKey =
                process.env.SUPABASE_SERVICE_ROLE_KEY ||
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

              if (!url || !serviceKey) {
                console.error("Missing Supabase environment variables");
                return NextResponse.next({ request });
              }

              const supabase = createClient(url, serviceKey, {
                auth: {
                  autoRefreshToken: false,
                  persistSession: false,
                },
              });
              const { data } = await supabase
                .from("workspaces")
                .select("slug")
                .eq("custom_domain", hostname)
                .single();

              if (data?.slug) {
                workspaceSlug = data.slug;
                // Cache for 1 hour
                if (
                  process.env.UPSTASH_REDIS_REST_URL &&
                  process.env.UPSTASH_REDIS_REST_TOKEN
                ) {
                  await redis.set(cacheKey, workspaceSlug, { ex: 3600 });
                }
              }
            } catch (e) {
              console.warn("Supabase lookup error:", e);
            }
          }

          if (workspaceSlug) {
            const url = request.nextUrl.clone();
            url.pathname = `/${workspaceSlug}${url.pathname}`;
            return NextResponse.rewrite(url);
          }
        }

        const pathname = request.nextUrl.pathname;

        if (pathname.startsWith("/api")) {
          return supabaseResponse;
        }

        if (subdomain && rootDomains.includes(potentialRoot)) {
          const target = new URL(
            `/${subdomain}${pathname}${request.nextUrl.search}`,
            request.url,
          );

          const rewriteRes = NextResponse.rewrite(target, { request });

          try {
            const cookieList = supabaseResponse.cookies.getAll();
            cookieList.forEach(({ name, value, ...rest }) => {
              const options: Record<string, any> = {};
              if ((rest as any).maxAge !== undefined)
                options.maxAge = (rest as any).maxAge;
              if ((rest as any).httpOnly !== undefined)
                options.httpOnly = (rest as any).httpOnly;
              if ((rest as any).priority !== undefined)
                options.priority = (rest as any).priority;
              if ((rest as any).path !== undefined)
                options.path = (rest as any).path;
              if ((rest as any).domain !== undefined)
                options.domain = (rest as any).domain;
              if ((rest as any).secure !== undefined)
                options.secure = (rest as any).secure;
              if ((rest as any).sameSite !== undefined)
                options.sameSite = (rest as any).sameSite;

              rewriteRes.cookies.set(name, value, options);
            });
          } catch (e) {
            console.warn("Failed to copy cookies to rewrite response:", e);
          }

          return rewriteRes;
        }
      }
    }
  } catch (err) {
    console.warn("middleware error (falling back to session response):", err);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
