"use client";

import React, { useEffect, useState } from "react";
import PageTitle from "@/components/dashboard-page-title";
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
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Cookie,
  GlobeIcon,
  Handshake,
  LayersIcon,
  NotebookPen,
  Shield,
  TicketX,
  Truck,
} from "lucide-react";
import { TextShimmer } from "@/components/motion-primitives/text-shimmer";
import { timeAgo } from "@/lib/utils";

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

export default function DocumentsShell(props: {
  type: "published" | "draft" | "archived" | "all";
}) {
  const searchParams = useSearchParams();
  const initialWorkspaceId = searchParams?.get("workspaceId") ?? null;

  const [workspaceId, setWorkspaceId] = useState<string | null>(
    initialWorkspaceId,
  );
  const [documents, setDocuments] = useState<any[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // On mount: if workspaceId wasn't provided in the url, attempt to read from localStorage
  useEffect(() => {
    if (workspaceId) return;
    try {
      const raw =
        typeof window !== "undefined"
          ? window.localStorage.getItem("selectedWorkspace")
          : null;
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed === "string") setWorkspaceId(parsed);
        else if (parsed && typeof parsed.id === "string")
          setWorkspaceId(parsed.id);
        else if (parsed && typeof parsed.workspaceId === "string")
          setWorkspaceId(parsed.workspaceId);
        else if (parsed && typeof parsed.selectedWorkspace === "string")
          setWorkspaceId(parsed.selectedWorkspace);
      } catch {
        setWorkspaceId(raw);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load documents ONLY when workspaceId is present
  useEffect(() => {
    // Don't run query if workspaceId isn't loaded yet
    if (!workspaceId) {
      setDocuments(null); // clear out old docs if switching workspace
      setLoading(false);
      return;
    }

    let cancelled = false; // in-flight fetch protection
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const supabase = createClient();
        // Build query and conditionally filter by status. For the 'all' view we
        // do not apply a status filter and we order by updated_at desc so the
        // most recently edited documents appear first.
        let q = supabase
          .from("documents")
          .select(
            "id,title,slug,type,status,version,created_at,updated_at,published",
          )
          .eq("workspace_id", workspaceId);

        if (props.type !== "all") {
          q = q.eq("status", props.type);
        }

        q = q.order(props.type === "all" ? "updated_at" : "created_at", {
          ascending: false,
        });

        const { data, error: fetchErr } = await q;

        if (cancelled) return;

        if (fetchErr) {
          setError("Failed to load documents");
          setDocuments([]);
        } else {
          setDocuments(data ?? []);
        }
      } catch (e) {
        setError("Unexpected error loading documents");
        setDocuments([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [workspaceId, props.type]);

  const title =
    props.type === "all"
      ? "All Documents"
      : props.type.charAt(0).toUpperCase() + props.type.slice(1) + " Documents";

  // Href for creating a new document
  const createHref = workspaceId
    ? `/dashboard/documents/new?workspaceId=${workspaceId}`
    : `/dashboard/documents/new`;

  return (
    <>
      <PageTitle
        title={title}
        description={`Manage your ${props.type} documents`}
      />

      <Frame className="w-full">
        <FramePanel>
          {loading ? (
            <TextShimmer className="font-mono text-sm">
              Loading documents…
            </TextShimmer>
          ) : error ? (
            <div className="p-8 text-center text-sm text-destructive">
              {error}
            </div>
          ) : !documents || documents.length === 0 ? (
            <div className="p-10 text-center">
              <h3 className="text-lg font-medium">
                No {props.type !== "all" ? props.type : ""} documents
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                You don't have any {props.type !== "all" ? props.type : ""}{" "}
                documents yet.
              </p>
              <div className="mt-4 flex justify-center">
                <Link href={createHref}>
                  <Button>Create a document</Button>
                </Link>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Last edited</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/dashboard/d/${d.slug}`}
                        className="flex items-center gap-2"
                      >
                        {(() => {
                          const Icon =
                            (d?.type && typeIconMap[String(d.type)]) ??
                            LayersIcon;
                          return (
                            <Icon
                              className="w-4 h-4 opacity-80"
                              aria-hidden="true"
                            />
                          );
                        })()}
                        <span className="underline">{d.title}</span>
                      </Link>
                    </TableCell>
                    <TableCell>{d.slug ?? "—"}</TableCell>
                    <TableCell>
                      {(() => {
                        const label =
                          typeLabelMap[String(d.type)] ??
                          String(d.type ?? "other");
                        return label;
                      })()}
                    </TableCell>
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
                    <TableCell>{d.version ?? "1"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{timeAgo(d.updated_at)}</Badge>
                    </TableCell>
                    <TableCell
                      className="text-right"
                      title={new Date(d.created_at).toLocaleString()}
                    >
                      {timeAgo(d.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={6} className="font-mono">
                    Total
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {documents.length} documents
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </FramePanel>
      </Frame>
    </>
  );
}
