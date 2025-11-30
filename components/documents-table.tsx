"use client";

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
import Link from "next/link";
import type React from "react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { readSelectedWorkspaceId } from "@/lib/workspace";
import { TextShimmer } from "./motion-primitives/text-shimmer";

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

type Props = {
  type?: "published" | "draft" | "archived";
  workspaceId?: string;
};

function normalizeTypeValue(val: any) {
  if (val === undefined || val === null) return "other";
  const s = String(val).trim().toLowerCase();
  return s || "other";
}

function extractType(row: any) {
  if (!row) return "other";
  const keys = ["type", "doc_type", "document_type", "documentType"];
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null) return normalizeTypeValue(v);
  }

  try {
    const meta = row.metadata ?? row.raw ?? null;
    if (meta && typeof meta === "object") {
      const mv = meta.type ?? meta.document_type ?? meta.documentType;
      if (mv !== undefined && mv !== null) return normalizeTypeValue(mv);
    }
  } catch {
    // ignore
  }

  return "other";
}

export default function DocumentsTable({ type, workspaceId }: Props) {
  const { selectedWorkspaceId } = useWorkspace();
  const effectiveWorkspaceId = workspaceId ?? selectedWorkspaceId;

  const [documents, setDocuments] = useState<any[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!effectiveWorkspaceId) {
      setDocuments([]);
      setLoading(false);
      setError(
        "No workspace selected. Choose a workspace to view its documents.",
      );
      return;
    }

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const workspaceIdToUse =
          effectiveWorkspaceId ?? readSelectedWorkspaceId();

        const docs = await fetchDocumentsForWorkspace(
          workspaceIdToUse,
          type ?? null,
          createClient(),
        );

        const data = docs ?? [];
        const fetchErr = null;
        if (fetchErr) {
          console.error("Failed to load documents:", fetchErr);
          setError("Failed to load documents");
          setDocuments([]);
        } else {
          const rows = (data as any[] | null) ?? [];
          const normalized = rows.map((r) => ({
            ...r,
            __normalized_type: extractType(r),
          }));
          setDocuments(normalized);
        }
      } catch (e) {
        console.error("Unexpected error loading documents:", e);
        setError("Unexpected error loading documents");
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [effectiveWorkspaceId, type]);

  function fmt(date?: string | null) {
    if (!date) return "";
    try {
      return new Date(date).toLocaleString();
    } catch {
      return String(date);
    }
  }

  const createHref = effectiveWorkspaceId
    ? `/dashboard/documents/new?workspaceId=${effectiveWorkspaceId}`
    : `/dashboard/documents/new`;

  return (
    <Frame className="w-full">
      <FramePanel>
        {loading ? (
          <TextShimmer className="font-mono text-sm">
            Loading documents…
          </TextShimmer>
        ) : error ? (
          <div className="p-8 text-center text-destructive text-sm">
            {error}
          </div>
        ) : !documents || documents.length === 0 ? (
          <div className="p-10 text-center">
            <h3 className="font-medium text-lg">No {type ?? "documents"}</h3>
            <p className="mt-2 text-muted-foreground text-sm">
              You don't have any {type ?? "documents"} yet.
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
                <TableHead>Type</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Version</TableHead>
                <TableHead className="text-right">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((d) => {
                const typeKey = d?.__normalized_type ?? extractType(d);
                const _Icon = typeIconMap[typeKey] ?? LayersIcon;
                const typeLabel = typeLabelMap[typeKey] ?? typeKey;
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">
                      <Link href={`/dashboard/documents/${d.id ?? d.slug}`}>
                        <span className="underline">{d.title}</span>
                      </Link>
                    </TableCell>

                    <TableCell>{typeLabel}</TableCell>

                    <TableCell>{d.slug ?? "—"}</TableCell>

                    <TableCell>
                      <Badge variant="outline">
                        <span
                          className={`mr-2 size-1.5 rounded-full ${
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
                    <TableCell className="text-right">
                      {fmt(d.created_at)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={4}>Total</TableCell>
                <TableCell className="text-right font-medium">
                  {documents.length} documents
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </FramePanel>
    </Frame>
  );
}
