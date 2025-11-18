"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Editor } from "@/components/tiptap/editor/editor";
import { createClient } from "@/lib/supabase/client";
import { TextShimmer } from "@/components/motion-primitives/text-shimmer";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Notebook } from "lucide-react";

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

        const { data, error: fetchErr } = await supabase
          .from("documents")
          .select("id,slug,content,title,workspace_id")
          .eq("slug", slug)
          .maybeSingle();

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
          setError("Document not found");
          setDocId(null);
          setDocSlug(null);
          setInitialContent(null);
          return;
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

        // Determine selected workspace from localStorage similar to other components.
        // If a selected workspace exists and does not match the document's workspace_id,
        // block editing.
        try {
          let raw =
            typeof window !== "undefined"
              ? window.localStorage.getItem("selectedWorkspace")
              : null;
          let selectedWorkspaceId: string | null = null;
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              if (typeof parsed === "string") selectedWorkspaceId = parsed;
              else if (parsed && typeof parsed.id === "string")
                selectedWorkspaceId = parsed.id;
              else if (parsed && typeof parsed.workspaceId === "string")
                selectedWorkspaceId = parsed.workspaceId;
              else if (parsed && typeof parsed.selectedWorkspace === "string")
                selectedWorkspaceId = parsed.selectedWorkspace;
            } catch {
              selectedWorkspaceId = raw;
            }
          }

          if (
            selectedWorkspaceId &&
            data.workspace_id &&
            selectedWorkspaceId !== String(data.workspace_id)
          ) {
            // The currently selected workspace is different from the document's workspace.
            // Block editing and show a helpful message.
            setBlocked(true);
            setError(
              "You cannot edit this document from the selected workspace. Switch to the document's workspace to edit it.",
            );
            // Clear any loaded content to be safe
            setInitialContent(null);
            return;
          } else {
            // clear blocked state if workspace matches or no selection
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
