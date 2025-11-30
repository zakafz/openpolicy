import { ArrowUpRight, FileSearchCorner } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { fetchPublishedDocumentsForWorkspaceServer } from "@/lib/documents";
import { createServiceClient } from "@/lib/supabase/service";
import { fmtAbsolute, timeAgo } from "@/lib/utils";

type Props = {
  params:
    | {
        workspace: string;
      }
    | Promise<{
        workspace: string;
      }>;
};

export default async function Page({ params }: Props) {
  const { workspace } = (await params) as { workspace: string };

  const svc = createServiceClient();

  const { data: ws, error: wsErr } = await svc
    .from("workspaces")
    .select("id,name,return_url,slug")
    .eq("slug", workspace)
    .maybeSingle();

  if (wsErr || !ws) {
    return notFound();
  }

  let docList: any[] = [];
  try {
    const docs = await fetchPublishedDocumentsForWorkspaceServer(
      ws.id,
      svc,
      100,
    );
    docList = Array.isArray(docs) ? docs : [];
  } catch (_e) {
    return notFound();
  }

  return (
    <div>
      <header className="mb-6">
        <Badge
          variant={"secondary"}
          className="font-mono text-muted-foreground text-sm"
        >
          Published documents ({docList.length})
        </Badge>
      </header>

      <main>
        {docList.length === 0 ? (
          <Empty className="bg-accent">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileSearchCorner />
              </EmptyMedia>
              <EmptyTitle>No published documents</EmptyTitle>
              <EmptyDescription>
                This workspace has no published documents.
              </EmptyDescription>
            </EmptyHeader>
            {ws?.return_url && (
              <EmptyContent>
                <div className="flex gap-2">
                  <Link href={ws?.return_url}>
                    <Button size="sm">Back to website</Button>
                  </Link>
                </div>
              </EmptyContent>
            )}
          </Empty>
        ) : (
          <div className="flex flex-col gap-2">
            {docList.map((d: any) => (
              <Link
                href={`/${d.slug}`}
                key={d.id}
                className="group overflow-hidden rounded-2xl bg-accent p-4"
              >
                <div className="relative flex items-start justify-between gap-4">
                  <div>
                    <div className="w-fit font-medium text-lg">
                      {d.title ?? d.slug}
                    </div>
                    <div className="mt-1 text-muted-foreground text-sm">
                      {d.updated_at
                        ? `Updated ${timeAgo(d.updated_at)} • ${fmtAbsolute(
                            d.updated_at,
                          )}`
                        : d.created_at
                          ? `Created ${fmtAbsolute(d.created_at)}`
                          : ""}
                    </div>
                  </div>
                  <div className="-right-5 -top-5 absolute opacity-0 transition-all duration-200 group-hover:top-0 group-hover:right-0 group-hover:opacity-100">
                    <ArrowUpRight className="size-5 text-muted-foreground" />
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
