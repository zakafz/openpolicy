import { updateSession } from "@/lib/supabase/proxy";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy handler used by Next.js `proxy.ts` convention.
 *
 * Responsibilities:
 *  - Ensure Supabase session cookies are refreshed / updated (delegate to updateSession).
 *  - Convert workspace subdomain requests into a path prefix rewrite so public
 *    pages can be served via `/{workspace}/{document_slug}` routes.
 *
 * Example:
 *  - acme.openpolicyhq.com/privacy -> /acme/privacy
 *  - acme.lvh.me:3000/privacy       -> /acme/privacy  (useful in dev)
 *
 * IMPORTANT:
 *  - We call `updateSession(request)` first to build the "supabaseResponse" which
 *    may set cookies. If we create a new NextResponse to rewrite, we must copy
 *    cookies from the supabaseResponse to the newly-created response to avoid
 *    session desynchronization.
 */
export async function proxy(request: NextRequest) {
  // Let session proxy run first (it may set cookies on the response)
  const supabaseResponse = await updateSession(request);

  try {
    const host = request.headers.get("host") ?? "";
    const hostname = host.split(":")[0]; // strip port if present

    // Domains considered "root" for which we interpret the first label as workspace
    // Add or remove as needed for your environment.
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
        // Attempt to detect subdomain even for two-label hosts like 'openstatus.localhost'
        // Determine potentialRoot by checking last two labels and, if that doesn't
        // match, fall back to the last label (useful for hosts like 'openstatus.localhost').
        let potentialRoot = parts.slice(-2).join("."); // try last two labels first
        let subdomain = parts.slice(0, -2).join(".") || null;

        if (!rootDomains.includes(potentialRoot)) {
          // try last label as root (useful for hosts like 'openstatus.localhost')
          potentialRoot = parts.slice(-1).join(".");
          subdomain = parts.slice(0, -1).join(".") || null;
        }

        const pathname = request.nextUrl.pathname;

        // Skip API routes — do not rewrite requests targeting Next.js API or internal API endpoints.
        // This prevents the proxy from rewriting /api/* requests which should be handled directly.
        if (pathname.startsWith("/api")) {
          return supabaseResponse;
        }

        // Only rewrite when:
        // - we detected a subdomain
        // - the root domain is one we want to handle
        // - the path does not already start with /{subdomain} (avoid loop)
        if (
          subdomain &&
          rootDomains.includes(potentialRoot) &&
          !pathname.startsWith(`/${subdomain}`)
        ) {
          const target = new URL(
            `/${subdomain}${pathname}${request.nextUrl.search}`,
            request.url,
          );

          // Build a rewrite response and add debug headers to help diagnose routing/404s.
          const rewriteRes = NextResponse.rewrite(target, { request });

          // Debug headers (helpful when diagnosing why rewrites return 404).
          // Debug headers removed for production builds.

          // Copy cookies (preserve any cookies that updateSession set)
          try {
            const cookieList = supabaseResponse.cookies.getAll();
            // Some runtimes return cookie attributes flattened on each item (e.g. { name, value, httpOnly, maxAge, ... })
            // rather than a single `options` object. Normalize by building an options object.
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
              // Set the cookie with normalized options
              rewriteRes.cookies.set(name, value, options);
            });
          } catch (e) {
            // If cookies cannot be copied for some reason, still return the rewrite.
            // We intentionally avoid throwing here to keep the proxy robust.
            console.warn("Failed to copy cookies to rewrite response:", e);
          }

          return rewriteRes;
        }
      }
    }
  } catch (err) {
    // Don't fail the whole proxy if rewrite logic errors; fall back to the
    // supabase-proxied next response so session handling continues.
    console.warn(
      "proxy handler error (falling back to session response):",
      err,
    );
  }

  // Default: return the response produced by updateSession
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
