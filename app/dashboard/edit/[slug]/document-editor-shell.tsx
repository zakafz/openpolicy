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
  // store the workspace_id of the loaded document and a blocked state
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

        // Determine selected workspace from localStorage similar to other components.
        // If a selected workspace exists, scope the document fetch to that workspace.
        let selectedWorkspaceId: string | null = null;
        try {
          // Use centralized helper to parse persisted selected workspace.
          selectedWorkspaceId = readSelectedWorkspaceId();
        } catch {
          selectedWorkspaceId = null;
        }

        // Use centralized helper to fetch the document by slug (scoped to workspace when provided).
        // Wrap in try/catch to mirror previous pattern where `fetchErr` was available.
        let data: any = null;
        let fetchErr: any = null;
        try {
          data = await fetchDocumentBySlug(slug, selectedWorkspaceId, supabase);
        } catch (e: any) {
          // Preserve previous behavior: downstream logic expects `fetchErr` when queries fail.
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
            // Fallback: try fetching without workspace scoping to check if the document
            // exists in a different workspace and should therefore be blocked.
            try {
              // Fallback: try fetching without workspace scoping to check if the document
              // exists in a different workspace and should therefore be blocked.
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
                // Document exists but in a different workspace — block editing.
                setBlocked(true);
                setError(
                  "You cannot edit this document from the selected workspace. Switch to the document's workspace to edit it.",
                );
                setDocId(null);
                setDocSlug(null);
                setInitialContent(null);
                return;
              }

              // Not found at all
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

        // Determine whether content is JSON (Tiptap JSON) or HTML/plain string.
        const content = data.content ?? "";
        if (typeof content === "string" && content.trim().length > 0) {
          try {
            const parsed = JSON.parse(content);
            // If parse succeeds and looks like a Tiptap doc (has type/key) we treat as JSON
            setInitialContent(parsed);
            setInitialIsJson(true);
          } catch {
            // not JSON — treat as HTML/string
            setInitialContent(content);
            setInitialIsJson(false);
          }
        } else if (typeof content === "object" && content !== null) {
          // content already an object (JSON stored as JSONB or similar)
          setInitialContent(content);
          setInitialIsJson(true);
        } else {
          // empty content
          setInitialContent("");
          setInitialIsJson(false);
        }

        // set basic doc fields
        setDocSlug(String(data.slug));
        setDocId(String(data.id));
        setDocWorkspaceId(data.workspace_id ? String(data.workspace_id) : null);

        // Capture document title so the editor can use it for the default heading
        setDocTitle(
          typeof data.title === "string"
            ? data.title
            : String(data.title ?? ""),
        );

        // If we previously resolved a selected workspace, check it against the loaded document.
        // Block editing if the selected workspace doesn't match the document's workspace.
        try {
          if (
            selectedWorkspaceId &&
            data.workspace_id &&
            String(selectedWorkspaceId) !== String(data.workspace_id)
          ) {
            // The currently selected workspace is different from the document's workspace.
            setBlocked(true);
            setError(
              "You cannot edit this document from the selected workspace. Switch to the document's workspace to edit it.",
            );
            // Clear any loaded content to be safe
            setInitialContent(null);
            return;
          } else {
            setBlocked(false);
          }
        } catch (e) {
          // if any error occurs while checking localStorage, do not block by default
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

  // If blocked due to workspace mismatch, show an informative message and prevent editing
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

  // Render the editor and pass docId + initial content.
  // Editor performs a debounced autosave when docId is provided.
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
