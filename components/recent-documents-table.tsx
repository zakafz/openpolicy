"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
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
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useWorkspace } from "@/context/workspace";
import {
  Clock,
  Cookie,
  GlobeIcon,
  Handshake,
  LayersIcon,
  NotebookPen,
  Shield,
  TicketX,
  Truck,
} from "lucide-react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "./ui/empty";

/**
 * Map document `type` values to lucide-react icons and human labels.
 */
const typeIconMap: Record<string, React.ComponentType<any>> = {
  privacy: Shield,
  terms: Handshake,
  cookie: Cookie,
  refund: TicketX,
  shipping: Truck,
  "intellectual-property": NotebookPen,
  "data-protection": GlobeIcon,
  other: LayersIcon,
};

const typeLabelMap: Record<string, string> = {
  privacy: "Privacy Policy",
  terms: "Terms of Service",
  cookie: "Cookie Policy",
  refund: "Refund Policy",
  shipping: "Shipping Policy",
  "intellectual-property": "Intellectual Property",
  "data-protection": "Data Protection",
  other: "Other",
};

function timeAgo(date?: string | null) {
  if (!date) return "—";
  const then = new Date(date).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  if (diffSec < 60) return `${diffSec}s`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
  return `${Math.floor(diffSec / 86400)}d`;
}

/**
 * RecentDocumentsTable
 * - Loads the top 5 most recently updated documents (ordered by updated_at desc)
 * - Shows icon, title, type label, last edited (relative) and status
 */
export default function RecentDocumentsTable({
  workspaceId,
}: {
  workspaceId?: string;
}) {
  // Scope the recent documents to the provided workspaceId prop, or fall back
  // to the currently-selected workspace from context to ensure the recent
  // lists only show documents belonging to the active workspace.
  const { selectedWorkspaceId } = useWorkspace();
  const effectiveWorkspaceId = workspaceId ?? selectedWorkspaceId;

  const [docs, setDocs] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // If there's no effective workspace to scope to, don't fetch unscoped data.
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
        const supabase = createClient();
        let q = supabase
          .from("documents")
          .select("id,title,slug,type,status,updated_at")
          .order("updated_at", { ascending: false })
          .limit(5);

        // Always scope recent documents to the effective workspace id
        q = q.eq("workspace_id", effectiveWorkspaceId);

        const { data, error: fetchErr } = await q;
        if (fetchErr) {
          console.error("Failed to load recent documents:", fetchErr);
          if (!cancelled) {
            setError("Failed to load recent documents");
            setDocs([]);
          }
        } else {
          if (!cancelled) setDocs((data as any[]) ?? []);
        }
      } catch (e) {
        console.error("Unexpected error loading recent documents:", e);
        if (!cancelled) {
          setError("Unexpected error loading recent documents");
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
          <div className="p-6 text-center text-sm text-muted-foreground">
            Loading recent documents…
          </div>
        ) : error ? (
          <div className="p-6 text-center text-sm text-destructive">
            {error}
          </div>
        ) : !docs || docs.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
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
                <TableHead className="flex justify-end items-center">
                  Last edited
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((d) => {
                const Icon =
                  (d?.type && typeIconMap[String(d.type)]) ?? LayersIcon;
                const typeLabel =
                  typeLabelMap[String(d.type)] ?? String(d.type ?? "other");
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/dashboard/d/${d.slug}`}
                        className="flex items-center gap-2"
                      >
                        <Icon
                          className="w-4 h-4 opacity-80"
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
                              ? "bg-emerald-500"
                              : d.status === "archived"
                                ? "bg-muted-foreground/60"
                                : "bg-amber-500"
                          }`}
                          aria-hidden="true"
                        />
                        {d.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex justify-end">
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
                  className="text-right text-xs font-mono text-muted-foreground"
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
