"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
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
          .select("id,slug,content,title")
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
        setDocSlug(String(data.slug));
        setDocId(String(data.id));
        // Capture document title so the editor can use it for the default heading
        setDocTitle(
          typeof data.title === "string"
            ? data.title
            : String(data.title ?? ""),
        );
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
