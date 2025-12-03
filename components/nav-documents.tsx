"use client";

import {
  Cookie,
  Folder,
  GlobeIcon,
  Handshake,
  LayersIcon,
  type LucideIcon,
  MoreHorizontal,
  NotebookPen,
  Shield,
  TicketX,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useWorkspace } from "@/context/workspace";
import { fetchDocumentsForWorkspace } from "@/lib/documents";
import { createClient } from "@/lib/supabase/client";

export function NavDocuments() {
  const { selectedWorkspaceId } = useWorkspace();
  const [docs, setDocs] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const typeIconMap: Record<
    | "privacy"
    | "terms"
    | "cookie"
    | "refund"
    | "shipping"
    | "intellectual-property"
    | "data-protection"
    | "other",
    LucideIcon
  > = {
    privacy: Shield,
    terms: Handshake,
    cookie: Cookie,
    refund: TicketX,
    shipping: Truck,
    "intellectual-property": NotebookPen,
    "data-protection": GlobeIcon,
    other: LayersIcon,
  };

  useEffect(() => {
    let cancelled = false;

    if (!selectedWorkspaceId) {
      setDocs([]);
      setLoading(false);
      setError(null);
      return;
    }

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const docs = await fetchDocumentsForWorkspace(
          selectedWorkspaceId,
          "all",
          createClient(),
          3,
        );
        if (!cancelled) {
          setDocs(docs ?? []);
        }
      } catch (fetchErr) {
        console.error("Failed to load recent documents:", fetchErr);
        if (!cancelled) {
          setError("Failed to load recent documents");
          setDocs([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    const handleDocumentUpdate = () => {
      if (!cancelled) {
        load();
      }
    };

    window.addEventListener("document-updated", handleDocumentUpdate);

    return () => {
      cancelled = true;
      window.removeEventListener("document-updated", handleDocumentUpdate);
    };
  }, [selectedWorkspaceId]);

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Documents</SidebarGroupLabel>
      <SidebarMenu>
        {loading ? (
          <SidebarMenuItem>
            <SidebarMenuButton className="text-muted-foreground">
              <Folder />
              <span>Loading…</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ) : error ? (
          <SidebarMenuItem>
            <SidebarMenuButton className="text-destructive">
              <span>{error}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ) : !docs || docs.length === 0 ? (
          <SidebarMenuItem className="pointer-events-none">
            <SidebarMenuButton className="text-muted-foreground">
              <Folder />
              <span>No recent documents</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ) : (
          docs.map((d) => (
            <SidebarMenuItem key={d.id}>
              <SidebarMenuButton asChild>
                <Link
                  href={`/dashboard/d/${d.slug}`}
                  className="flex w-full items-center justify-between gap-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {(() => {
                      const key = String(d?.type ?? "other") as
                        | "privacy"
                        | "terms"
                        | "cookie"
                        | "refund"
                        | "shipping"
                        | "intellectual-property"
                        | "data-protection"
                        | "other";
                      const Icon = typeIconMap[key] ?? Folder;
                      return (
                        <Icon
                          className="h-4 w-4 shrink-0 opacity-80"
                          aria-hidden="true"
                        />
                      );
                    })()}
                    <span className="truncate">{d.title}</span>
                  </div>
                  <Badge
                    className={`shrink-0 text-xs capitalize ${
                      d.status === "published"
                        ? "bg-info/15 text-info-foreground"
                        : d.status === "archived"
                          ? ""
                          : "bg-warning/20 text-warning-foreground"
                    }`}
                    variant={d.status === "archived" ? "secondary" : "default"}
                  >
                    {d.status || "draft"}
                  </Badge>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))
        )}

        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <Link
              href="/dashboard/documents/all"
              className="flex items-center gap-2 text-sidebar-foreground/80"
            >
              <MoreHorizontal />
              <span>All documents</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
