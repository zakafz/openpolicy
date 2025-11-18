"use client";

import React, { useEffect, useState } from "react";
import { Editor as TiptapEditor } from "@/components/tiptap/editor/editor";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { usePathname, useRouter } from "next/navigation";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ChevronDownIcon, Notebook, RouteIcon } from "lucide-react";
import { TextShimmer } from "@/components/motion-primitives/text-shimmer";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Frame,
  FrameFooter,
  FrameHeader,
  FramePanel,
} from "@/components/ui/frame";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn, fmtAbsolute, timeAgo } from "@/lib/utils";
import PageTitle from "@/components/dashboard-page-title";

export default function DocumentShell() {
  const pathname = usePathname();
  const slug = pathname
    ? pathname.replace(/^\/dashboard\/d\//, "").split("/")[0] || null
    : null;
  const router = useRouter();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [doc, setDoc] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Try to read selected workspace from localStorage (if not already set)
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
        // not JSON, treat as plain string
        setWorkspaceId(raw);
      }
    } catch {
      // ignore localStorage errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If the selected workspace changes elsewhere (for example via the workspace
  // switcher which persists selection to localStorage), redirect to the main
  // dashboard so the user lands on the workspace homepage rather than staying
  // on a document that belonged to the previous selection.
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "selectedWorkspace") {
        try {
          router.push("/dashboard");
        } catch {
          // ignore router failures
        }
      }
    };

    const handleWorkspaceChanged = (e: Event) => {
      try {
        // Custom event dispatched by WorkspaceProvider — navigate to dashboard
        router.push("/dashboard");
      } catch {
        // ignore router failures
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorage);
      // listen for programmatic workspace changes dispatched as a CustomEvent
      // from the WorkspaceProvider
      window.addEventListener(
        "workspace-changed",
        handleWorkspaceChanged as EventListener,
      );
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener(
          "workspace-changed",
          handleWorkspaceChanged as EventListener,
        );
      }
    };
  }, [router]);

  // Load the document for the given slug (optionally scoped to workspace)
  useEffect(() => {
    if (!slug) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();

        // Debug: what we're about to query
        console.debug("DocumentShell: loading document", { slug, workspaceId });

        // build the query, apply filters before coercing to a single result
        let q: any = supabase
          .from("documents")
          .select(
            "id,title,slug,content,type,status,version,workspace_id,owner_id,created_at,updated_at,published",
          )
          .eq("slug", slug);

        if (workspaceId) {
          // apply workspace scoping if a workspace is selected
          q = q.eq("workspace_id", workspaceId);
          console.debug(
            "DocumentShell: applying workspace filter",
            workspaceId,
          );
        }

        // use maybeSingle() so we don't get an error when 0 rows are returned
        const { data, error: fetchErr } = await q.maybeSingle();
        if (cancelled) return;

        if (fetchErr) {
          console.error("Failed to load document:", fetchErr);
          setError(fetchErr.message ?? "Failed to load document");
          setDoc(null);
        } else if (!data && workspaceId) {
          // No document found with the workspace filter applied.
          // Try a fallback: fetch the document by slug without workspace scoping.
          try {
            const { data: fallbackData, error: fallbackErr } = await supabase
              .from("documents")
              .select(
                "id,title,slug,content,type,status,version,workspace_id,owner_id,created_at,updated_at,published",
              )
              .eq("slug", slug)
              .maybeSingle();

            if (cancelled) return;

            if (fallbackErr) {
              console.error("Fallback fetch error:", fallbackErr);
              setError(fallbackErr.message ?? "Failed to load document");
              setDoc(null);
            } else if (fallbackData) {
              // Allow opening the document even if it belongs to another workspace.
              // Instead of blocking the user, surface a non-blocking informational
              // message so they know the document is from a different workspace.
              setDoc(fallbackData);
              setInfo(
                `This document belongs to a different workspace (workspace_id=${fallbackData.workspace_id}). You can view it, but it is not part of your selected workspace.`,
              );
            } else {
              // Not found at all
              setDoc(null);
              setError("Document not found");
            }
          } catch (e: any) {
            if (cancelled) return;
            console.error("Unexpected error during fallback fetch:", e);
            setError(e?.message ?? "Unexpected error loading document");
            setDoc(null);
          }
        } else {
          // Found document (or no workspace scoping was requested)
          setDoc(data ?? null);
        }
      } catch (e: any) {
        if (cancelled) return;
        console.error("Unexpected error loading document:", e);
        setError(e?.message ?? "Unexpected error loading document");
        setDoc(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [workspaceId, slug]);
  if (!slug) {
    return (
      <div className="w-full justify-center flex items-center h-full">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Notebook />
            </EmptyMedia>
            <EmptyTitle>No Document Found</EmptyTitle>
            <EmptyDescription>
              No document matching that slug was found. Please check the URL or
              create a new document.
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
          Loading document...
        </TextShimmer>
      </div>
    );
  }

  if (!doc) {
    const message = String(error ?? "Document not found");
    return (
      <div className="w-full justify-center flex items-center h-full">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Notebook />
            </EmptyMedia>
            <EmptyTitle>Document not found</EmptyTitle>
            <EmptyDescription>Details: {message}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href="/dashboard/documents">
              <Button>Back to documents</Button>
            </Link>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  // Prepare initial content for the shared Editor: try to parse stored JSON,
  // otherwise pass the raw string. This value will be provided as
  // `initialContent` to the imported `TiptapEditor` component used below.
  let parsedInitialContent: any = null;
  if (doc && doc.content) {
    if (typeof doc.content === "string") {
      try {
        parsedInitialContent = JSON.parse(doc.content);
      } catch {
        parsedInitialContent = doc.content;
      }
    } else {
      parsedInitialContent = doc.content;
    }
  }

  return (
    <>
      <PageTitle
        title={doc.title.charAt(0).toUpperCase() + doc.title.slice(1)}
      />
      {info ? (
        <div className="p-3 mb-4 rounded border-l-4 border-amber-400 bg-amber-50 text-amber-800 text-sm">
          {info}
        </div>
      ) : null}
      <Frame className="w-full">
        <Collapsible defaultOpen>
          <FrameHeader className="flex-row items-center justify-between px-2 py-2">
            <div className="items-center flex gap-2">
              <CollapsibleTrigger
                className="data-panel-open:[&_svg]:rotate-180 capitalize"
                render={<Button variant="ghost" />}
              >
                <ChevronDownIcon className="size-4" />
                {doc.title}
              </CollapsibleTrigger>
              <Badge variant={"outline"}>
                Slug: <span className="font-semibold">{doc.slug ?? "—"}</span>{" "}
                <Separator orientation="vertical" />
                Status:{" "}
                <span
                  className={cn(
                    "font-semibold",
                    doc.status === "draft"
                      ? "text-orange-400"
                      : doc.status === "archived"
                        ? "text-muted-foreground"
                        : "text-blue-500",
                  )}
                >
                  {String(doc.status ?? "draft")}
                </span>{" "}
                <Separator orientation="vertical" />
                Version:{" "}
                <span className="font-semibold">
                  {String(doc.version ?? "1")}
                </span>
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/dashboard/edit/${doc.slug}`}>
                <Button aria-label="Edit" variant="ghost" size={"sm"}>
                  Edit
                </Button>
              </Link>
              <Button aria-label="Publish" className="mr-2" size={"sm"}>
                Publish
              </Button>
            </div>
          </FrameHeader>
          <CollapsiblePanel>
            <FramePanel>
              {doc.content ? (
                <TiptapEditor
                  docId={doc.id ?? null}
                  initialContent={parsedInitialContent}
                  initialIsJson={typeof parsedInitialContent !== "string"}
                  docTitle={doc.title ?? undefined}
                  documentSlug={doc.slug ?? null}
                  readOnly={true}
                />
              ) : (
                <div className="text-sm text-muted-foreground">No content.</div>
              )}
            </FramePanel>
          </CollapsiblePanel>
        </Collapsible>
        <FrameFooter className="flex flex-row justify-between">
          <div className="text-xs font-mono text-muted-foreground">
            Last updated:{" "}
            <Badge variant={"secondary"}>{timeAgo(doc.updated_at)}</Badge>
          </div>
          <div className="text-xs font-mono text-muted-foreground">
            Created:{" "}
            <Badge variant={"secondary"}>{fmtAbsolute(doc.created_at)}</Badge>
          </div>
        </FrameFooter>
      </Frame>
    </>
  );
}
