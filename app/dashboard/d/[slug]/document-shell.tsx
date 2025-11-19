"use client";

import React, { useEffect, useState } from "react";
import { Editor as TiptapEditor } from "@/components/tiptap/editor/editor";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { fetchDocumentBySlug } from "@/lib/documents";
import { readSelectedWorkspaceId } from "@/lib/workspace";
import { usePathname, useRouter } from "next/navigation";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Archive,
  ChevronDownIcon,
  Edit,
  Edit2,
  MoreVertical,
  Notebook,
  RouteIcon,
  Trash,
} from "lucide-react";
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
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

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
  const [blocked, setBlocked] = useState<boolean>(false);

  // Try to read selected workspace from localStorage (if not already set)
  useEffect(() => {
    if (workspaceId) return;

    try {
      // Use centralized helper for parsing the persisted selected workspace.
      const id = readSelectedWorkspaceId();
      if (id) setWorkspaceId(id);
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

        // debug logging removed

        // Use centralized helper to fetch the document by slug (scoped to workspace when provided).
        // Wrap in try/catch to mirror previous pattern where `fetchErr` was available.
        let data: any = null;
        let fetchErr: any = null;
        try {
          data = await fetchDocumentBySlug(slug, workspaceId, supabase);
        } catch (e: any) {
          // Preserve previous behavior: downstream logic expects `fetchErr` when queries fail.
          fetchErr = e;
        }
        if (cancelled) return;

        if (fetchErr) {
          console.error("Failed to load document:", fetchErr);
          setError(fetchErr.message ?? "Failed to load document");
          setDoc(null);
        } else if (!data && workspaceId) {
          // No document found with the workspace filter applied.
          // Try a fallback: fetch the document by slug without workspace scoping.
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
              setDoc(null);
            } else if (fallbackData) {
              // The document exists but belongs to a different workspace.
              // Block access when the selected workspace does not match.
              setDoc(null);
              setBlocked(true);
              setError(
                "Forbidden: this document belongs to a different workspace.",
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
          // If a selected workspace exists and it doesn't match the document's
          // workspace, block access. Use centralized helper to read the selected workspace.
          try {
            const selectedWorkspaceId = readSelectedWorkspaceId();
            if (
              selectedWorkspaceId &&
              data?.workspace_id &&
              String(selectedWorkspaceId) !== String(data.workspace_id)
            ) {
              setDoc(null);
              setBlocked(true);
              setError(
                "Forbidden: this document belongs to a different workspace.",
              );
            } else {
              setDoc(data ?? null);
              setBlocked(false);
            }
          } catch (e) {
            // If anything goes wrong reading localStorage, allow viewing by default.
            setDoc(data ?? null);
            setBlocked(false);
          }
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

  // If we determined the user is not allowed to access this document because
  // their selected workspace does not match the document's workspace, show a
  // clear informational page and prevent viewing/editing.
  if (blocked) {
    return (
      <div className="w-full justify-center flex items-center h-full">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Notebook />
            </EmptyMedia>
            <EmptyTitle>Access Denied</EmptyTitle>
            <EmptyDescription>
              This document belongs to a different workspace and cannot be
              viewed from your currently selected workspace. Switch to the
              document's workspace to view or edit it.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href="/dashboard">
              <Button>Back to dashboard</Button>
            </Link>
          </EmptyContent>
        </Empty>
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

              <Badge variant={"secondary"}>
                Slug: <span className="font-semibold">{doc.slug ?? "—"}</span>
              </Badge>

              <Badge variant="secondary" className="capitalize">
                <span
                  className={`size-1.5 rounded-full ${
                    doc.status === "published"
                      ? "bg-emerald-500"
                      : doc.status === "archived"
                        ? "bg-muted-foreground/60"
                        : "bg-amber-500"
                  }`}
                  aria-hidden="true"
                />
                {doc.status}
              </Badge>
              <Badge variant={"secondary"}>
                Version:{" "}
                <span className="font-semibold">
                  {String(doc.version ?? "1")}
                </span>
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <AlertDialog>
                <AlertDialogTrigger
                  render={<Button size={"sm"} variant="destructive-outline" />}
                >
                  {doc.status === "archived" ? <Trash /> : <Archive />}
                </AlertDialogTrigger>
                <AlertDialogPopup>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {doc.status === "archived" ? "Delete" : "Archive"} "
                      {doc.title}"
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will{" "}
                      {doc.status === "archived" ? "delete" : "archive"} "
                      {doc.title}"{" "}
                      {doc.status === "archived"
                        ? "and delete it permanently from this workspace"
                        : "and remove it from your drafts"}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogClose render={<Button variant="ghost" />}>
                      Cancel
                    </AlertDialogClose>
                    {doc.status === "archived" ? (
                      <AlertDialogClose
                        render={
                          <Button
                            variant="destructive-outline"
                            onClick={async () => {
                              setLoading(true);
                              try {
                                const res = await fetch("/api/documents", {
                                  method: "DELETE",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({ id: doc.id }),
                                });
                                const payload = await res.json();
                                if (res.ok && payload?.ok) {
                                  // navigate back to documents list after deletion
                                  try {
                                    router.push("/dashboard/documents/all");
                                  } catch {
                                    // fallback: clear local doc state
                                    setDoc(null);
                                  }
                                } else {
                                  setInfo(
                                    payload?.error ??
                                      "Failed to delete document",
                                  );
                                }
                              } catch (e: any) {
                                setInfo(String(e?.message ?? e));
                              } finally {
                                setLoading(false);
                              }
                            }}
                          />
                        }
                      >
                        Delete
                      </AlertDialogClose>
                    ) : (
                      <AlertDialogClose
                        render={
                          <Button
                            variant="destructive-outline"
                            onClick={async () => {
                              setLoading(true);
                              try {
                                const res = await fetch("/api/documents", {
                                  method: "PUT",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    id: doc.id,
                                    status: "archived",
                                    published: false,
                                  }),
                                });
                                const payload = await res.json();
                                if (res.ok && payload?.document) {
                                  setDoc(payload.document);
                                  setInfo("Document archived");
                                } else {
                                  setInfo(
                                    payload?.error ??
                                      "Failed to archive document",
                                  );
                                }
                              } catch (e: any) {
                                setInfo(String(e?.message ?? e));
                              } finally {
                                setLoading(false);
                              }
                            }}
                          />
                        }
                      >
                        Archive
                      </AlertDialogClose>
                    )}
                  </AlertDialogFooter>
                </AlertDialogPopup>
              </AlertDialog>

              <Separator orientation="vertical" className={"h-5 ml-2"} />
              {blocked ? (
                <Button aria-label="Edit" variant="ghost" size={"sm"} disabled>
                  Edit
                </Button>
              ) : (
                <Link href={`/dashboard/edit/${doc.slug}`}>
                  <Button aria-label="Edit" variant="ghost" size={"sm"}>
                    Edit
                  </Button>
                </Link>
              )}
              {doc.status === "draft" ? (
                <Button
                  aria-label="Publish"
                  className="mr-2"
                  size={"sm"}
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const res = await fetch("/api/documents", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          id: doc.id,
                          status: "published",
                          published: true,
                        }),
                      });
                      const payload = await res.json();
                      if (res.ok && payload?.document) {
                        setDoc(payload.document);
                        setInfo("Document published");
                      } else {
                        setInfo(payload?.error ?? "Failed to publish document");
                      }
                    } catch (e: any) {
                      setInfo(String(e?.message ?? e));
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  Publish
                </Button>
              ) : doc.status === "archived" ? (
                <Button
                  aria-label="Restore"
                  className="mr-2"
                  size={"sm"}
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const res = await fetch("/api/documents", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          id: doc.id,
                          // restoring archived -> put back into draft (no published)
                          status: "draft",
                          published: false,
                        }),
                      });
                      const payload = await res.json();
                      if (res.ok && payload?.document) {
                        setDoc(payload.document);
                        setInfo("Document restored to draft");
                      } else {
                        setInfo(payload?.error ?? "Failed to restore document");
                      }
                    } catch (e: any) {
                      setInfo(String(e?.message ?? e));
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  Restore
                </Button>
              ) : (
                <Button
                  aria-label="Unpublish"
                  className="mr-2"
                  size={"sm"}
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const res = await fetch("/api/documents", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          id: doc.id,
                          // unpublish -> leave as draft/unpublished
                          status: "draft",
                          published: false,
                        }),
                      });
                      const payload = await res.json();
                      if (res.ok && payload?.document) {
                        setDoc(payload.document);
                        setInfo("Document unpublished");
                      } else {
                        setInfo(
                          payload?.error ?? "Failed to unpublish document",
                        );
                      }
                    } catch (e: any) {
                      setInfo(String(e?.message ?? e));
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  Unpublish
                </Button>
              )}
            </div>
          </FrameHeader>
          <CollapsiblePanel>
            <FramePanel className="py-10!">
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
                <div className="text-sm text-muted-foreground">
                  No content yet.
                </div>
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
