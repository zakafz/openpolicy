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
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { TextShimmer } from "./motion-primitives/text-shimmer";

type Props = {
  type?: "published" | "draft" | "archived";
  workspaceId?: string;
};

export default function DocumentsTable({ type, workspaceId }: Props) {
  const [documents, setDocuments] = useState<any[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();
        let q = supabase
          .from("documents")
          .select(
            "id,title,slug,status,version,created_at,updated_at,published",
          )
          .order("created_at", { ascending: false });

        if (workspaceId) q = q.eq("workspace_id", workspaceId);
        if (type) q = q.eq("status", type);

        const { data, error: fetchErr } = await q;
        if (fetchErr) {
          console.error("Failed to load documents:", fetchErr);
          setError("Failed to load documents");
          setDocuments([]);
        } else {
          setDocuments((data as any[]) ?? []);
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
  }, [workspaceId, type]);

  function fmt(date?: string | null) {
    if (!date) return "";
    try {
      return new Date(date).toLocaleString();
    } catch {
      return String(date);
    }
  }

  const createHref = workspaceId
    ? `/dashboard/documents/new?workspaceId=${workspaceId}`
    : `/dashboard/documents/new`;

  return (
    <Frame className="w-full">
      <FramePanel>
        {loading ? (
          <TextShimmer className="font-mono text-sm" >
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
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Version</TableHead>
                <TableHead className="text-right">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">
                    <Link href={`/dashboard/documents/${d.id ?? d.slug}`}>
                      <span className="underline">{d.title}</span>
                    </Link>
                  </TableCell>
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
              ))}
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
