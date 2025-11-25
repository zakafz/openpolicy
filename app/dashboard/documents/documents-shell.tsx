"use client";

import {
  Archive,
  Edit,
  ExternalLink,
  LayersIcon,
  MoreVertical,
  RotateCcw,
  Trash,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import PageTitle from "@/components/dashboard-page-title";
import { DocumentsTableSkeleton } from "@/components/skeletons";
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
import { Button } from "@/components/ui/button";
import { Frame, FramePanel } from "@/components/ui/frame";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DOCUMENT_TYPE_ICON_MAP,
  DOCUMENT_TYPE_LABEL_MAP,
} from "@/lib/constants";
import { fetchDocumentsForWorkspace } from "@/lib/documents";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/utils";
import { readSelectedWorkspaceId } from "@/lib/workspace";
import useWorkspaceLoader from "@/hooks/use-workspace-loader";

export default function DocumentsShell(props: {
  type: "published" | "draft" | "archived" | "all";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialWorkspaceId = searchParams?.get("workspaceId") ?? null;
  const { workspace } = useWorkspaceLoader();

  const [workspaceId, setWorkspaceId] = useState<string | null>(
    initialWorkspaceId,
  );
  const [documents, setDocuments] = useState<any[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Reload documents function
  const reloadDocuments = async () => {
    if (!workspaceId) return;
    try {
      const docs = await fetchDocumentsForWorkspace(
        workspaceId,
        props.type,
        createClient(),
      );
      setDocuments(docs ?? []);
    } catch (e) {
      setError("Failed to reload documents");
    }
  };

  // On mount: if workspaceId wasn't provided in the url, attempt to read from localStorage
  useEffect(() => {
    if (workspaceId) return;
    try {
      const id = readSelectedWorkspaceId();
      if (!id) return;
      setWorkspaceId(id);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load documents ONLY when workspaceId is present
  useEffect(() => {
    // Don't run query if workspaceId isn't loaded yet
    if (!workspaceId) {
      setDocuments(null); // clear out old docs if switching workspace
      setLoading(false);
      return;
    }

    let cancelled = false; // in-flight fetch protection
    setLoading(true);
    setError(null);

    async function load() {
      try {
        // Use centralized helper for fetching documents to keep logic consistent.
        const docs = await fetchDocumentsForWorkspace(
          workspaceId,
          props.type,
          createClient(),
        );
        if (cancelled) return;
        setDocuments(docs ?? []);
      } catch (e) {
        if (cancelled) return;
        setError("Failed to load documents");
        setDocuments([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [workspaceId, props.type]);

  const title =
    props.type === "all"
      ? "All Documents"
      : props.type.charAt(0).toUpperCase() + props.type.slice(1) + " Documents";

  // Href for creating a new document
  const createHref = workspaceId
    ? `/dashboard/documents/new?workspaceId=${workspaceId}`
    : `/dashboard/documents/new`;

  return (
    <>
      <PageTitle
        title={title + (documents ? ` (${documents.length})` : "")}
        description={`Manage your ${props.type} documents`}
      />

      <Frame className="w-full">
        <FramePanel>
          {loading ? (
            <DocumentsTableSkeleton />
          ) : error ? (
            <div className="p-8 text-center text-sm text-destructive">
              {error}
            </div>
          ) : !documents || documents.length === 0 ? (
            <div className="p-10 text-center">
              <h3 className="text-lg font-medium">
                No {props.type !== "all" ? props.type : ""} documents
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                You don't have any {props.type !== "all" ? props.type : ""}{" "}
                documents yet.
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
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last edited</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[50px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/dashboard/d/${d.slug}`}
                        className="flex items-center gap-2"
                      >
                        {(() => {
                          const Icon =
                            (d?.type &&
                              DOCUMENT_TYPE_ICON_MAP[String(d.type)]) ??
                            LayersIcon;
                          return (
                            <Icon
                              className="w-4 h-4 opacity-80"
                              aria-hidden="true"
                            />
                          );
                        })()}
                        <span className="underline">{d.title}</span>
                      </Link>
                    </TableCell>
                    <TableCell>{d.slug ?? "—"}</TableCell>
                    <TableCell>
                      {DOCUMENT_TYPE_LABEL_MAP[String(d.type)] ??
                        String(d.type ?? "other")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        <span
                          className={`size-1.5 rounded-full ${d.status === "published"
                            ? "bg-info"
                            : d.status === "archived"
                              ? "bg-muted-foreground/60"
                              : "bg-amber-500"
                            }`}
                          aria-hidden="true"
                        />
                        {d.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{timeAgo(d.updated_at)}</Badge>
                    </TableCell>
                    <TableCell
                      title={new Date(d.created_at).toLocaleString()}
                    >
                      {timeAgo(d.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <Menu>
                          <MenuTrigger
                            render={<Button size="icon-sm" variant="ghost" />}
                            disabled={actionLoading === d.id}
                          >
                            <MoreVertical className="size-4" />
                          </MenuTrigger>
                          <MenuPopup>
                            <Link href={`/dashboard/edit/${d.slug}`}>
                              <MenuItem>
                                <Edit className="size-4" />
                                Edit
                              </MenuItem>
                            </Link>
                            {d.status === "published" && workspace?.slug && (
                              <MenuItem
                                onClick={() => {
                                  const workspaceSlug = workspace.slug;
                                  let url: string;

                                  if (process.env.NODE_ENV === "production") {
                                    url = `https://${workspaceSlug}.openpolicyhq.com/${d.slug}`;
                                  } else {
                                    url = `http://${workspaceSlug}.localhost:3000/${d.slug}`;
                                  }

                                  window.open(url, "_blank");
                                }}
                              >
                                <ExternalLink className="size-4" />
                                Open
                              </MenuItem>
                            )}
                            <MenuSeparator />
                            {d.status === "archived" ? (
                              <>
                                <MenuItem
                                  onClick={async () => {
                                    setActionLoading(d.id);
                                    try {
                                      const res = await fetch("/api/documents", {
                                        method: "PUT",
                                        headers: {
                                          "Content-Type": "application/json",
                                        },
                                        body: JSON.stringify({
                                          id: d.id,
                                          status: "draft",
                                          published: false,
                                        }),
                                      });
                                      if (res.ok) {
                                        window.dispatchEvent(
                                          new CustomEvent("document-updated"),
                                        );
                                        await reloadDocuments();
                                      }
                                    } catch (e) {
                                      console.error("Failed to restore:", e);
                                    } finally {
                                      setActionLoading(null);
                                    }
                                  }}
                                >
                                  <RotateCcw className="size-4" />
                                  Restore
                                </MenuItem>
                                <AlertDialogTrigger
                                  nativeButton={false}
                                  render={<MenuItem variant="destructive" />}
                                >
                                  <Trash className="size-4" />
                                  Delete
                                </AlertDialogTrigger>
                              </>
                            ) : (
                              <MenuItem
                                onClick={async () => {
                                  setActionLoading(d.id);
                                  try {
                                    const res = await fetch("/api/documents", {
                                      method: "PUT",
                                      headers: {
                                        "Content-Type": "application/json",
                                      },
                                      body: JSON.stringify({
                                        id: d.id,
                                        status: "archived",
                                        published: false,
                                      }),
                                    });
                                    if (res.ok) {
                                      window.dispatchEvent(
                                        new CustomEvent("document-updated"),
                                      );
                                      await reloadDocuments();
                                    }
                                  } catch (e) {
                                    console.error("Failed to archive:", e);
                                  } finally {
                                    setActionLoading(null);
                                  }
                                }}
                              >
                                <Archive className="size-4" />
                                Archive
                              </MenuItem>
                            )}
                          </MenuPopup>
                        </Menu>

                        <AlertDialogPopup>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete "{d.title}"
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{d.title}" from this
                              workspace. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogClose render={<Button variant="ghost" />}>
                              Cancel
                            </AlertDialogClose>
                            <AlertDialogClose
                              render={
                                <Button
                                  variant="destructive-outline"
                                  onClick={async () => {
                                    setActionLoading(d.id);
                                    try {
                                      const res = await fetch("/api/documents", {
                                        method: "DELETE",
                                        headers: {
                                          "Content-Type": "application/json",
                                        },
                                        body: JSON.stringify({ id: d.id }),
                                      });
                                      if (res.ok) {
                                        window.dispatchEvent(
                                          new CustomEvent("document-updated"),
                                        );
                                        await reloadDocuments();
                                      }
                                    } catch (e) {
                                      console.error("Failed to delete:", e);
                                    } finally {
                                      setActionLoading(null);
                                    }
                                  }}
                                />
                              }
                            >
                              Delete
                            </AlertDialogClose>
                          </AlertDialogFooter>
                        </AlertDialogPopup>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={6} className="font-mono">
                    Total
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {documents.length} documents
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </FramePanel>
      </Frame>
    </>
  );
}
