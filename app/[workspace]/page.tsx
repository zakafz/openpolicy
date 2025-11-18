import Container from "@/components/dashboard-container";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { notFound } from "next/navigation";
import { fmtAbsolute, timeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight } from "lucide-react";

type Props = {
  params:
    | {
        workspace: string;
      }
    | Promise<{
        workspace: string;
      }>;
};

/**
 * Workspace index page
 *
 * Route: /[workspace]
 *
 * Server-rendered page that:
 *  - Resolves the workspace by slug
 *  - Lists published documents for that workspace (most-recent first)
 *
 * Notes:
 *  - Uses the service-role Supabase client so it can read workspace metadata.
 *  - Returns `notFound()` when the workspace doesn't exist.
 */
export default async function Page({ params }: Props) {
  const { workspace } = (await params) as { workspace: string };

  const svc = createServiceClient();

  // Fetch workspace (to validate it exists and to get display name)
  const { data: ws, error: wsErr } = await svc
    .from("workspaces")
    .select("id,name,slug")
    .eq("slug", workspace)
    .maybeSingle();

  if (wsErr || !ws) {
    return notFound();
  }

  // Fetch published documents for the workspace, most recent first
  const { data: docs, error: docsErr } = await svc
    .from("documents")
    .select("id,title,slug,updated_at,created_at")
    .eq("workspace_id", ws.id)
    .eq("published", true)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (docsErr) {
    // On error, show notFound to avoid leaking details. Could render an error UI instead.
    return notFound();
  }

  const docList = Array.isArray(docs) ? docs : [];

  return (
    <div>
      <header className="mb-6">
        <Badge
          variant={"secondary"}
          className="text-sm font-mono text-muted-foreground"
        >
          Published documents ({docList.length})
        </Badge>
      </header>

      <main>
        {docList.length === 0 ? (
          <div className="rounded-2xl p-6 bg-accent text-muted-foreground">
            No published documents found.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {docList.map((d: any) => (
              <Link
                href={`/${d.slug}`}
                key={d.id}
                className="p-4 rounded-2xl bg-accent group overflow-hidden"
              >
                <div className="flex items-start justify-between gap-4 relative">
                  <div>
                    <div className="text-lg font-medium w-fit">
                      {d.title ?? d.slug}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {/* show pretty timestamp if available */}
                      {d.updated_at
                        ? `Updated ${timeAgo(d.updated_at)} • ${fmtAbsolute(
                            d.updated_at,
                          )}`
                        : d.created_at
                          ? `Created ${fmtAbsolute(d.created_at)}`
                          : ""}
                    </div>
                  </div>
                  <div className="absolute transition-all duration-200 -right-5 -top-5 opacity-0 group-hover:opacity-100 group-hover:right-0 group-hover:top-0">
                    <ArrowUpRight className="text-muted-foreground size-5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
