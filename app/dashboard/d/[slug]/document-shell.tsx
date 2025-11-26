"use client";

import {
  Archive,
  BookCheck,
  BookDashed,
  ChevronDownIcon,
  Edit,
  ExternalLink,
  FileEdit,
  MoreVertical,
  Notebook,
  PackageOpen,
  Trash,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PageTitle from "@/components/dashboard-page-title";
import { TextShimmer } from "@/components/motion-primitives/text-shimmer";
import { Editor as TiptapEditor } from "@/components/tiptap/editor/editor";
import { Alert, AlertTitle } from "@/components/ui/alert";
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
import { Badge } from "@/components/ui/badge";
import { Badge as BadgeCoss } from "@/components/ui/badge-coss";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Frame,
  FrameFooter,
  FrameHeader,
  FramePanel,
} from "@/components/ui/frame";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu";
import { fetchDocumentBySlug } from "@/lib/documents";
import { createClient } from "@/lib/supabase/client";
import { fmtAbsolute, timeAgo } from "@/lib/utils";
import { readSelectedWorkspaceId } from "@/lib/workspace";
import useWorkspaceLoader from "@/hooks/use-workspace-loader";
import { Input } from "@/components/ui/input";
import { toastManager } from "@/components/ui/toast";

export default function DocumentShell() {
  const pathname = usePathname();
  const slug = pathname
    ? pathname.replace(/^\/dashboard\/d\//, "").split("/")[0] || null
    : null;
  const router = useRouter();
  const { workspace } = useWorkspaceLoader();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [doc, setDoc] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<boolean>(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [renamingInProgress, setRenamingInProgress] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

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

  const handleRename = async () => {
    const trimmedTitle = newTitle.trim();

    if (!trimmedTitle) {
      setRenameError("Document name cannot be empty");
      return;
    }

    if (trimmedTitle === doc.title) {
      setRenameDialogOpen(false);
      return;
    }

    setRenamingInProgress(true);
    setRenameError(null);

    try {
      const supabase = createClient();

      // Check for duplicate names in the same workspace
      const { data: existingDocs, error: checkError } = await supabase
        .from("documents")
        .select("id, title")
        .eq("workspace_id", doc.workspace_id)
        .ilike("title", trimmedTitle)
        .neq("id", doc.id);

      if (checkError) {
        console.error("Error checking for duplicate names:", checkError);
        setRenameError("Failed to validate document name");
        setRenamingInProgress(false);
        return;
      }

      if (existingDocs && existingDocs.length > 0) {
        setRenameError("A document with this name already exists in this workspace");
        setRenamingInProgress(false);
        return;
      }

      // Update the document
      const res = await fetch("/api/documents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: doc.id,
          title: trimmedTitle,
        }),
      });

      const payload = await res.json();

      if (res.ok && payload?.document) {
        setDoc(payload.document);
        toastManager.add({
          title: "Success!",
          description: `Document renamed to "${trimmedTitle}"`,
          type: "success",
        });
        setRenameDialogOpen(false);
        // Dispatch event to update sidebar
        window.dispatchEvent(new CustomEvent("document-updated"));
      } else {
        setRenameError(payload?.error ?? "Failed to rename document");
      }
    } catch (e: any) {
      console.error("Error renaming document:", e);
      setRenameError(String(e?.message ?? e ?? "Failed to rename document"));
    } finally {
      setRenamingInProgress(false);
    }
  };

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
            <Link href="/dashboard/documents/all">
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
        <Alert
          variant={
            doc?.status === "archived"
              ? "error"
              : doc.status === "draft"
                ? "warning"
                : "info"
          }
          className="mb-5"
        >
          {doc?.status === "archived" ? (
            <PackageOpen />
          ) : doc.status === "draft" ? (
            <BookDashed />
          ) : (
            <BookCheck />
          )}

          <AlertTitle>{info}</AlertTitle>
        </Alert>
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

              <BadgeCoss
                variant={
                  doc.status === "published"
                    ? "info"
                    : doc.status === "archived"
                      ? "secondary"
                      : "warning"
                }
                className="capitalize"
                size={"lg"}
              >
                <span
                  className={`size-1.5 rounded-full ${doc.status === "published"
                    ? "bg-info"
                    : doc.status === "archived"
                      ? "bg-muted-foreground/60"
                      : "bg-warning"
                    }`}
                  aria-hidden="true"
                />
                {doc.status}
              </BadgeCoss>
              <BadgeCoss variant={"outline"} size={"lg"}>
                Slug: <span className="font-semibold">{doc.slug ?? "—"}</span>
              </BadgeCoss>

              {/* <BadgeCoss variant={"outline"} size={"lg"}>
                Version:{" "}
                <span className="font-semibold">
                  {String(doc.version ?? "1")}
                </span>
              </BadgeCoss> */}
            </div>
            <div className="flex items-center gap-2">
              <AlertDialog>
                <Menu openOnHover>
                  <MenuTrigger
                    render={<Button size="icon-sm" variant="ghost" />}
                  >
                    <MoreVertical />
                  </MenuTrigger>
                  <MenuPopup>
                    {/*<MenuItem>
                      <Eye /> Preview
                    </MenuItem>*/}
                    {blocked ? (
                      <MenuItem aria-label="Edit" disabled>
                        <Edit />
                        Edit
                      </MenuItem>
                    ) : (
                      <Link href={`/dashboard/edit/${doc.slug}`}>
                        <MenuItem aria-label="Edit">
                          <Edit />
                          Edit
                        </MenuItem>
                      </Link>
                    )}
                    {doc.status !== "archived" && (
                      <MenuItem
                        onClick={() => {
                          setNewTitle(doc.title);
                          setRenameError(null);
                          setRenameDialogOpen(true);
                        }}
                      >
                        <FileEdit />
                        Rename
                      </MenuItem>
                    )}
                    {doc.status === "published" && workspace?.slug && (
                      <MenuItem
                        onClick={() => {
                          const workspaceSlug = workspace.slug;
                          let url: string;

                          if (process.env.NODE_ENV === "production") {
                            url = `https://${workspaceSlug}.openpolicyhq.com/${doc.slug}`;
                          } else {
                            url = `http://${workspaceSlug}.localhost:3000/${doc.slug}`;
                          }

                          window.open(url, "_blank");
                        }}
                      >
                        <ExternalLink />
                        Open
                      </MenuItem>
                    )}
                    <MenuSeparator />
                    <AlertDialogTrigger
                      nativeButton={false}
                      render={<MenuItem variant="destructive" />}
                    >
                      {doc.status === "archived" ? (
                        <div className="flex gap-2 items-center">
                          <Trash />
                          Delete
                        </div>
                      ) : (
                        <div className="flex gap-2 items-center">
                          <Archive />
                          Archive
                        </div>
                      )}
                    </AlertDialogTrigger>
                  </MenuPopup>
                </Menu>

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
                                  // Dispatch event to update sidebar counts
                                  window.dispatchEvent(new CustomEvent("document-updated"));
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
                                  // Dispatch event to update sidebar counts
                                  window.dispatchEvent(new CustomEvent("document-updated"));
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

              {/* Rename Dialog */}
              <AlertDialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
                <AlertDialogPopup>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Rename Document</AlertDialogTitle>
                    <AlertDialogDescription>
                      Enter a new name for "{doc.title}". Document names must be unique within the workspace.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <Input
                    type="text"
                    value={newTitle}
                    onChange={(e) => {
                      setNewTitle(e.target.value);
                      setRenameError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !renamingInProgress) {
                        e.preventDefault();
                        handleRename();
                      }
                    }}
                    placeholder={doc.title}
                    autoFocus
                  />
                  {renameError && (
                    <p className="text-sm text-destructive mt-2">{renameError}</p>
                  )}
                  <AlertDialogFooter>
                    <AlertDialogClose render={<Button variant="ghost" />}>
                      Cancel
                    </AlertDialogClose>
                    <Button
                      onClick={handleRename}
                      disabled={renamingInProgress || !newTitle.trim()}
                    >
                      {renamingInProgress ? "Renaming..." : "Rename"}
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogPopup>
              </AlertDialog>

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
                        // Dispatch event to update sidebar counts
                        window.dispatchEvent(new CustomEvent("document-updated"));
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
                        // Dispatch event to update sidebar counts
                        window.dispatchEvent(new CustomEvent("document-updated"));
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
                        // Dispatch event to update sidebar counts
                        window.dispatchEvent(new CustomEvent("document-updated"));
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
