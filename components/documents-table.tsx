"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchDocumentsForWorkspace } from "@/lib/documents";
import { readSelectedWorkspaceId } from "@/lib/workspace";
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
import { TextShimmer } from "./motion-primitives/text-shimmer";
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
import { useWorkspace } from "@/context/workspace";

/**
 * Map document `type` values to icons and human-readable labels.
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

type Props = {
  type?: "published" | "draft" | "archived";
  workspaceId?: string;
};

/**
 * Normalize a type-like value: coerce to string, trim and lowercase.
 * Returns 'other' when the value is empty or not present.
 */
function normalizeTypeValue(val: any) {
  if (val === undefined || val === null) return "other";
  const s = String(val).trim().toLowerCase();
  return s || "other";
}

/**
 * Extract a document type from a row using several possible keys.
 * This is defensive: some payloads may contain `type`, `doc_type`, `document_type`,
 * `documentType`, or it may be embedded inside `metadata`. Returns a normalized key.
 */
function extractType(row: any) {
  if (!row) return "other";
  const keys = ["type", "doc_type", "document_type", "documentType"];
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null) return normalizeTypeValue(v);
  }

  // Check common metadata locations as a fallback
  try {
    const meta = row.metadata ?? row.raw ?? null;
    if (meta && typeof meta === "object") {
      const mv = meta.type ?? meta.document_type ?? meta.documentType;
      if (mv !== undefined && mv !== null) return normalizeTypeValue(mv);
    }
  } catch {
    // ignore metadata parsing errors
  }

  return "other";
}

export default function DocumentsTable({ type, workspaceId }: Props) {
  // If the caller didn't pass a workspaceId prop, use the selected workspace
  // from the global provider. This ensures the table always shows documents
  // scoped to the current workspace.
  const { selectedWorkspaceId } = useWorkspace();
  const effectiveWorkspaceId = workspaceId ?? selectedWorkspaceId;

  const [documents, setDocuments] = useState<any[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If we don't have a workspace to scope to, show a helpful message rather
    // than fetching unscoped documents.
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
        // Prefer the effective workspace id but fall back to the persisted value.
        const workspaceIdToUse =
          effectiveWorkspaceId ?? readSelectedWorkspaceId();

        // Use centralized helper to fetch documents for the workspace. This
        // keeps query behavior consistent across the app.
        const docs = await fetchDocumentsForWorkspace(
          workspaceIdToUse,
          type ?? null,
          createClient(),
        );

        // normalize to the same variable names used downstream
        const data = docs ?? [];
        const fetchErr = null;
        if (fetchErr) {
          console.error("Failed to load documents:", fetchErr);
          setError("Failed to load documents");
          setDocuments([]);
        } else {
          // Normalize type for each row and store on a non-conflicting field to avoid
          // repeatedly normalizing during render.
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
          <div className="p-8 text-center text-sm text-destructive">
            {error}
          </div>
        ) : !documents || documents.length === 0 ? (
          <div className="p-10 text-center">
            <h3 className="text-lg font-medium">No {type ?? "documents"}</h3>
            <p className="text-sm text-muted-foreground mt-2">
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
                // Normalize the type value from the database to be robust against
                // casing/whitespace differences, then look up icon/label based on the normalized key.
                // Prefer a pre-normalized type (set during load). Otherwise extract on-the-fly.
                const typeKey = d?.__normalized_type ?? extractType(d);
                const Icon = typeIconMap[typeKey] ?? LayersIcon;
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
                          className={`size-1.5 rounded-full mr-2 ${
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
