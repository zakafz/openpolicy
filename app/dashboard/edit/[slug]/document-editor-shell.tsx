"use client";

import { Notebook } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import { TextShimmer } from "@/components/motion-primitives/text-shimmer";
import { Editor } from "@/components/tiptap/editor/editor";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { fetchDocumentBySlug } from "@/lib/documents";
import { createClient } from "@/lib/supabase/client";
import { readSelectedWorkspaceId } from "@/lib/workspace";

export default function DocumentEditorShell() {
  const pathname = usePathname();
  const slug = pathname
    ? pathname.replace(/^\/dashboard\/edit\//, "").split("/")[0] || null
    : null;

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [docId, setDocId] = useState<string | null>(null);
  const [docSlug, setDocSlug] = useState<string | null>(null);
  const [docTitle, setDocTitle] = useState<string | null>(null);
  const [initialContent, setInitialContent] = useState<any>(null);
  const [initialIsJson, setInitialIsJson] = useState<boolean>(true);
  const [docWorkspaceId, setDocWorkspaceId] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<boolean>(false);

  useEffect(() => {
    if (!slug) return;

    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const supabase = createClient();

        let selectedWorkspaceId: string | null = null;
        try {
          selectedWorkspaceId = readSelectedWorkspaceId();
        } catch {
          selectedWorkspaceId = null;
        }

        let data: any = null;
        let fetchErr: any = null;
        try {
          data = await fetchDocumentBySlug(slug, selectedWorkspaceId, supabase);
        } catch (e: any) {
          fetchErr = e;
        }

        if (cancelled) return;

        if (fetchErr) {
          console.error("Failed to fetch document for editing:", fetchErr);
          setError(fetchErr.message ?? "Failed to load document");
          setDocId(null);
          setDocSlug(null);
          setInitialContent(null);
          return;
        }

        if (!data) {
          if (selectedWorkspaceId) {
            try {
              let fallbackData: any = null;
              let fallbackErr: any = null;
              try {
                fallbackData = await fetchDocumentBySlug(
                  slug,
                  undefined,
                  supabase,
                );
              } catch (e: any) {
                fallbackErr = e;
              }

              if (cancelled) return;

              if (fallbackErr) {
                console.error("Fallback fetch error:", fallbackErr);
                setError(fallbackErr.message ?? "Failed to load document");
                setDocId(null);
                setDocSlug(null);
                setInitialContent(null);
                return;
              }

              if (fallbackData) {
                setBlocked(true);
                setError(
                  "You cannot edit this document from the selected workspace. Switch to the document's workspace to edit it.",
                );
                setDocId(null);
                setDocSlug(null);
                setInitialContent(null);
                return;
              }

              setError("Document not found");
              setDocId(null);
              setDocSlug(null);
              setInitialContent(null);
              return;
            } catch (e: any) {
              console.error("Fallback fetch unexpected error:", e);
              setError("Failed to load document");
              setDocId(null);
              setDocSlug(null);
              setInitialContent(null);
              return;
            }
          } else {
            setError("Document not found");
            setDocId(null);
            setDocSlug(null);
            setInitialContent(null);
            return;
          }
        }

        const content = data.content ?? "";
        if (typeof content === "string" && content.trim().length > 0) {
          try {
            const parsed = JSON.parse(content);
            setInitialContent(parsed);
            setInitialIsJson(true);
          } catch {
            setInitialContent(content);
            setInitialIsJson(false);
          }
        } else if (typeof content === "object" && content !== null) {
          setInitialContent(content);
          setInitialIsJson(true);
        } else {
          setInitialContent("");
          setInitialIsJson(false);
        }

        setDocSlug(String(data.slug));
        setDocId(String(data.id));
        setDocWorkspaceId(data.workspace_id ? String(data.workspace_id) : null);

        setDocTitle(
          typeof data.title === "string"
            ? data.title
            : String(data.title ?? ""),
        );

        try {
          if (
            selectedWorkspaceId &&
            data.workspace_id &&
            String(selectedWorkspaceId) !== String(data.workspace_id)
          ) {
            setBlocked(true);
            setError(
              "You cannot edit this document from the selected workspace. Switch to the document's workspace to edit it.",
            );
            setInitialContent(null);
            return;
          } else {
            setBlocked(false);
          }
        } catch (e) {
          setBlocked(false);
        }
      } catch (e: any) {
        if (cancelled) return;
        console.error("Unexpected error loading document:", e);
        setError(e?.message ?? "Unexpected error");
        setDocId(null);
        setDocSlug(null);
        setInitialContent(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (!slug) {
    return (
      <div className="w-full justify-center flex items-center h-full">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Notebook />
            </EmptyMedia>
            <EmptyTitle>No document selected</EmptyTitle>
            <EmptyDescription>
              Open a document from Documents to edit it.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full justify-center flex items-center h-full">
        <TextShimmer className="font-mono text-sm" duration={1}>
          Loading editor...
        </TextShimmer>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full justify-center flex items-center h-full">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Notebook />
            </EmptyMedia>
            <EmptyTitle>Unable to load document</EmptyTitle>
            <EmptyDescription>{error}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="w-full justify-center flex items-center h-full">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Notebook />
            </EmptyMedia>
            <EmptyTitle>Editing not allowed</EmptyTitle>
            <EmptyDescription>
              This document belongs to a different workspace and cannot be
              edited from your current workspace selection.
            </EmptyDescription>
          </EmptyHeader>
          <div className="p-4">
            <Link href="/dashboard">
              <a className="inline-flex items-center rounded bg-muted-foreground/5 px-3 py-1 text-sm">
                Back to dashboard
              </a>
            </Link>
          </div>
        </Empty>
      </div>
    );
  }

  return (
    <>
      <Editor
        docId={docId ?? undefined}
        docTitle={docTitle ?? undefined}
        initialContent={initialContent}
        initialIsJson={initialIsJson}
        documentSlug={docSlug ?? null}
      />
    </>
  );
}
