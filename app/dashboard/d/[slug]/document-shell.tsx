"use client";

import { Archive, Edit2, MoreVertical, Notebook, Trash } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { useEffect, useState } from "react";
import {
  DocumentEditor,
  type DocumentEditorRef,
} from "@/components/editor/document-editor";
import { TextShimmer } from "@/components/motion-primitives/text-shimmer";
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
import { Badge } from "@/components/ui/badge-coss";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { toastManager } from "@/components/ui/toast";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import useWorkspaceLoader from "@/hooks/use-workspace-loader";
import { fetchDocumentBySlug } from "@/lib/documents";
import { createClient } from "@/lib/supabase/client";
import { readSelectedWorkspaceId } from "@/lib/workspace";

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
  const [_info, _setInfo] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<boolean>(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [renamingInProgress, setRenamingInProgress] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const editorRef = React.useRef<DocumentEditorRef>(null);
  const ignoreNextChange = React.useRef(false);

  useEffect(() => {
    if (workspaceId) return;

    try {
      const id = readSelectedWorkspaceId();
      if (id) setWorkspaceId(id);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "selectedWorkspace") {
        try {
          router.push("/dashboard");
        } catch {}
      }
    };

    const handleWorkspaceChanged = (_e: Event) => {
      try {
        router.push("/dashboard");
      } catch {}
    };

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorage);
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

  useEffect(() => {
    if (!slug) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();

        let data: any = null;
        let fetchErr: any = null;
        try {
          data = await fetchDocumentBySlug(slug, workspaceId, supabase);
        } catch (e: any) {
          fetchErr = e;
        }
        if (cancelled) return;

        if (fetchErr) {
          console.error("Failed to load document:", fetchErr);
          setError(fetchErr.message ?? "Failed to load document");
          setDoc(null);
        } else if (!data && workspaceId) {
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
              setDoc(null);
            } else if (fallbackData) {
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
          } catch (_e) {
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

  const toggleEditMode = (enable: boolean) => {
    if (enable) {
      ignoreNextChange.current = true;
      setIsEditMode(true);
    } else {
      setIsEditMode(false);
      setIsDirty(false);
    }
  };

  const handleContentChange = () => {
    if (ignoreNextChange.current) {
      ignoreNextChange.current = false;
      return;
    }
    setIsDirty(true);
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

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
        setRenameError(
          "A document with this name already exists in this workspace",
        );
        setRenamingInProgress(false);
        return;
      }

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
      <div className="flex h-full w-full items-center justify-center">
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
      <div className="flex h-full w-full items-center justify-center">
        <TextShimmer className="font-mono text-sm" duration={1}>
          Loading document...
        </TextShimmer>
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="flex h-full w-full items-center justify-center">
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
      <div className="flex h-full w-full items-center justify-center">
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

  let parsedInitialContent: any = null;
  if (doc?.content) {
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

  const handleSave = async () => {
    if (!editorRef.current) return;
    setIsSaving(true);
    try {
      const content = editorRef.current.getContent();
      const contentJson = JSON.stringify(content);

      const res = await fetch("/api/documents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: doc.id,
          content: contentJson,
        }),
      });

      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch (_e) {
        // ignore
      }

      if (res.ok && data) {
        toastManager.add({
          title: "Saved",
          description: "Document saved successfully",
          type: "success",
        });
        setIsEditMode(false);
        setIsDirty(false);
        // Reload to get fresh content
        window.location.reload();
      } else {
        console.error("Save failed response:", data || text);
        toastManager.add({
          title: "Save failed",
          description:
            data?.error ||
            data?.message ||
            "Failed to save document. Check console for details.",
          type: "error",
        });
      }
    } catch (error: any) {
      console.error("Save error:", error);
      toastManager.add({
        title: "Save failed",
        description: `An error occurred while saving: ${
          error?.message || String(error)
        }`,
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/documents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: doc.id,
          status: "archived",
          published: false,
        }),
      });
      const payload = await res.json();
      if (res.ok && payload?.document) {
        setDoc(payload.document);
        toastManager.add({
          title: "Archived",
          description: "Document archived successfully",
          type: "success",
        });
        window.dispatchEvent(new CustomEvent("document-updated"));
      } else {
        toastManager.add({
          title: "Archive failed",
          description: payload?.error ?? "Failed to archive document",
          type: "error",
        });
      }
    } catch (e: any) {
      toastManager.add({
        title: "Error",
        description: String(e?.message ?? e),
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/documents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: doc.id }),
      });
      if (res.ok) {
        toastManager.add({
          title: "Deleted",
          description: "Document deleted successfully",
          type: "success",
        });
        window.dispatchEvent(new CustomEvent("document-updated"));
        router.push("/dashboard");
      } else {
        const payload = await res.json();
        toastManager.add({
          title: "Delete failed",
          description: payload?.error ?? "Failed to delete document",
          type: "error",
        });
      }
    } catch (e: any) {
      toastManager.add({
        title: "Error",
        description: String(e?.message ?? e),
        type: "error",
      });
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  const modes = [
    { label: "Viewing", value: "viewing" },
    { label: "Editing", value: "editing" },
  ];

  return (
    <>
      <div className="flex items-center justify-between gap-4 border-b bg-sidebar px-4 py-2">
        <div className="flex gap-2">
          <SidebarTrigger />
          <AlertDialog
            open={renameDialogOpen}
            onOpenChange={setRenameDialogOpen}
          >
            <AlertDialogTrigger className="ring-0!">
              <h1 className="flex cursor-pointer items-center justify-center gap-1 rounded-lg bg-border/40 p-1 px-2 font-semibold text-sm hover:bg-border/60">
                {doc.title} <Edit2 className="h-3 w-3" />
              </h1>
            </AlertDialogTrigger>
            <AlertDialogPopup>
              <AlertDialogHeader>
                <AlertDialogTitle>Rename Document</AlertDialogTitle>
                <AlertDialogDescription>
                  Enter a new name for "{doc.title}". Document names must be
                  unique within the workspace.
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
                <p className="mt-2 text-destructive text-sm">{renameError}</p>
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

          <AlertDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
          >
            <AlertDialogPopup>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Document</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{doc.title}"? This action
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogClose render={<Button variant="ghost" />}>
                  Cancel
                </AlertDialogClose>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  {loading ? "Deleting..." : "Delete"}
                </Button>
              </AlertDialogFooter>
            </AlertDialogPopup>
          </AlertDialog>

          <Select
            items={modes}
            value={isEditMode ? "editing" : "viewing"}
            onValueChange={(value) => {
              if (
                value === "editing" &&
                !isEditMode &&
                doc.status !== "archived"
              ) {
                toggleEditMode(true);
              } else if (value === "viewing" && isEditMode) {
                toggleEditMode(false);
              }
            }}
          >
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {modes.map(({ label, value }) => (
                <SelectItem
                  key={value}
                  value={value}
                  className="flex flex-row items-center gap-2"
                  disabled={value === "editing" && doc.status === "archived"}
                >
                  <span className="flex items-center gap-1.5">{label}</span>
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              doc.status === "published"
                ? "info"
                : doc.status === "archived"
                  ? "secondary"
                  : "warning"
            }
            className="rounded-lg capitalize"
            size="lg"
          >
            <span
              className={`size-1.5 rounded-full ${
                doc.status === "published"
                  ? "bg-info"
                  : doc.status === "archived"
                    ? "bg-muted-foreground/60"
                    : "bg-warning"
              }`}
              aria-hidden="true"
            />
            {doc.status}
          </Badge>

          <Badge variant="outline" className="rounded-lg" size="lg">
            Slug: <span className="font-mono">{doc.slug ?? "—"}</span>
          </Badge>

          {!isEditMode && (
            <Menu>
              <MenuTrigger render={<Button size="icon-sm" variant="ghost" />}>
                <MoreVertical className="size-4" />
              </MenuTrigger>
              <MenuPopup>
                {doc.status === "archived" ? (
                  <MenuItem
                    variant="destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash className="size-4" />
                    Delete
                  </MenuItem>
                ) : (
                  <MenuItem onClick={handleArchive}>
                    <Archive className="size-4" />
                    Archive
                  </MenuItem>
                )}
              </MenuPopup>
            </Menu>
          )}

          {isEditMode && doc.status !== "archived" && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      toggleEditMode(false);
                      window.location.reload();
                    }}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Cancel editing</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Save changes</TooltipContent>
              </Tooltip>
            </>
          )}

          {!isEditMode && (
            <>
              {doc.status === "draft" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
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
                            toastManager.add({
                              title: "Published",
                              description: "Document published successfully",
                              type: "success",
                            });
                            window.dispatchEvent(
                              new CustomEvent("document-updated"),
                            );
                          } else {
                            toastManager.add({
                              title: "Publish failed",
                              description:
                                payload?.error ?? "Failed to publish document",
                              type: "error",
                            });
                          }
                        } catch (e: any) {
                          toastManager.add({
                            title: "Error",
                            description: String(e?.message ?? e),
                            type: "error",
                          });
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                    >
                      Publish
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Publish document</TooltipContent>
                </Tooltip>
              )}

              {doc.status === "archived" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      onClick={async () => {
                        setLoading(true);
                        try {
                          const res = await fetch("/api/documents", {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              id: doc.id,
                              status: "draft",
                              published: false,
                            }),
                          });
                          const payload = await res.json();
                          if (res.ok && payload?.document) {
                            setDoc(payload.document);
                            toastManager.add({
                              title: "Restored",
                              description: "Document restored to draft",
                              type: "success",
                            });
                            window.dispatchEvent(
                              new CustomEvent("document-updated"),
                            );
                          } else {
                            toastManager.add({
                              title: "Restore failed",
                              description:
                                payload?.error ?? "Failed to restore document",
                              type: "error",
                            });
                          }
                        } catch (e: any) {
                          toastManager.add({
                            title: "Error",
                            description: String(e?.message ?? e),
                            type: "error",
                          });
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                    >
                      Restore
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Restore to draft</TooltipContent>
                </Tooltip>
              )}

              {doc.status === "published" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        setLoading(true);
                        try {
                          const res = await fetch("/api/documents", {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              id: doc.id,
                              status: "draft",
                              published: false,
                            }),
                          });
                          const payload = await res.json();
                          if (res.ok && payload?.document) {
                            setDoc(payload.document);
                            toastManager.add({
                              title: "Unpublished",
                              description: "Document unpublished",
                              type: "success",
                            });
                            window.dispatchEvent(
                              new CustomEvent("document-updated"),
                            );
                          } else {
                            toastManager.add({
                              title: "Unpublish failed",
                              description:
                                payload?.error ??
                                "Failed to unpublish document",
                              type: "error",
                            });
                          }
                        } catch (e: any) {
                          toastManager.add({
                            title: "Error",
                            description: String(e?.message ?? e),
                            type: "error",
                          });
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                    >
                      Unpublish
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Unpublish document</TooltipContent>
                </Tooltip>
              )}
            </>
          )}
        </div>
      </div>

      {doc.content ? (
        <DocumentEditor
          ref={editorRef}
          docId={doc.id ?? undefined}
          initialContent={parsedInitialContent}
          initialIsJson={typeof parsedInitialContent !== "string"}
          docTitle={doc.title ?? undefined}
          documentSlug={doc.slug ?? null}
          readOnly={!isEditMode}
          onContentChange={handleContentChange}
          doc={doc}
          isEditMode={isEditMode}
          isSaving={isSaving}
          onEditModeToggle={() => toggleEditMode(!isEditMode)}
          onSave={handleSave}
          onCancel={() => {
            toggleEditMode(false);
            window.location.reload();
          }}
          onRename={() => {
            setNewTitle(doc.title);
            setRenameError(null);
            setRenameDialogOpen(true);
          }}
          workspace={workspace}
        />
      ) : (
        <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
          No content yet.
        </div>
      )}
    </>
  );
}
