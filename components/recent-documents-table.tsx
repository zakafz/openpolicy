"use client";

import { Clock, File } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { documentTemplates } from "@/components/document-templates";
import { RecentDocumentsSkeleton } from "@/components/skeletons";
import { Badge } from "@/components/ui/badge";
import { Frame, FramePanel } from "@/components/ui/frame";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useWorkspace } from "@/context/workspace";
import { fetchDocumentsForWorkspace } from "@/lib/documents";
import { createClient } from "@/lib/supabase/client";
import { fmtAbsolute, timeAgo } from "@/lib/utils";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "./ui/empty";

export default function RecentDocumentsTable({
  workspaceId,
}: {
  workspaceId?: string;
}) {
  const { selectedWorkspaceId } = useWorkspace();
  const effectiveWorkspaceId = workspaceId ?? selectedWorkspaceId;

  const [docs, setDocs] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!effectiveWorkspaceId) {
      setDocs([]);
      setLoading(false);
      setError(
        "No workspace selected. Choose a workspace to view recent documents.",
      );
      return;
    }

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const docs = await fetchDocumentsForWorkspace(
          effectiveWorkspaceId,
          "all",
          createClient(),
          5,
        );
        if (!cancelled) {
          setDocs(docs ?? []);
        }
      } catch (fetchErr) {
        console.error("Failed to load recent documents:", fetchErr);
        if (!cancelled) {
          setError("Failed to load recent documents");
          setDocs([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [effectiveWorkspaceId]);

  return (
    <Frame className="w-full">
      <FramePanel>
        {loading ? (
          <RecentDocumentsSkeleton />
        ) : error ? (
          <div className="p-6 text-center text-destructive text-sm">
            {error}
          </div>
        ) : !docs || docs.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Clock />
                </EmptyMedia>
                <EmptyTitle>No Recent documents</EmptyTitle>
                <EmptyDescription>
                  No recently edited documents found.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>{" "}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="flex items-center justify-end">
                  Last edited
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((d) => {
                const template = documentTemplates.find((t) => t.id === d.type);
                const Icon = template?.icon ?? File;
                const typeLabel = template?.label ?? String(d.type ?? "blank");
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/dashboard/d/${d.slug}`}
                        className="flex items-center gap-2"
                      >
                        <Icon
                          className="h-4 w-4 opacity-80"
                          aria-hidden="true"
                        />
                        <span className="underline">{d.title}</span>
                      </Link>
                    </TableCell>
                    <TableCell>{typeLabel}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        <span
                          className={`size-1.5 rounded-full ${
                            d.status === "published"
                              ? "bg-info"
                              : d.status === "archived"
                                ? "bg-muted-foreground/60"
                                : "bg-warning"
                          }`}
                          aria-hidden="true"
                        />
                        {d.status}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className="flex justify-end"
                      title={fmtAbsolute(d.updated_at)}
                    >
                      <Badge variant="secondary">{timeAgo(d.updated_at)}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-right font-mono text-muted-foreground text-xs"
                >
                  Showing {docs.length} recently edited document
                  {docs?.length === 1 ? "" : "s"}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </FramePanel>
    </Frame>
  );
}
