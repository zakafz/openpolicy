"use client";

import {
  Cookie,
  Folder,
  Forward,
  GlobeIcon,
  Handshake,
  LayersIcon,
  type LucideIcon,
  MoreHorizontal,
  NotebookPen,
  Shield,
  TicketX,
  Trash2,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useWorkspace } from "@/context/workspace";
import { fetchDocumentsForWorkspace } from "@/lib/documents";
import { createClient } from "@/lib/supabase/client";

export function NavDocuments() {
  const { isMobile } = useSidebar();
  const { selectedWorkspaceId } = useWorkspace();
  const [docs, setDocs] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // map document type to corresponding icon for the sidebar
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

    // If no workspace selected, do not fetch
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
        // Use centralized helper to fetch recent documents for the selected workspace.
        // Request the top 3 most-recent documents; the helper keeps query logic consistent.
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

    return () => {
      cancelled = true;
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
          <>
            {docs.map((d) => (
              <SidebarMenuItem key={d.id}>
                <SidebarMenuButton asChild>
                  <Link
                    href={`/dashboard/d/${d.slug}`}
                    className="flex items-center gap-2"
                  >
                    {(() => {
                      // Narrow the key to the known literal union so TypeScript can
                      // safely index `typeIconMap` without an `any` cast.
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
                          className="w-4 h-4 opacity-80"
                          aria-hidden="true"
                        />
                      );
                    })()}
                    <span className="truncate">{d.title}</span>
                  </Link>
                </SidebarMenuButton>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuAction showOnHover>
                      <span className="sr-only">More...</span>
                    </SidebarMenuAction>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-48 rounded-lg"
                    side={isMobile ? "bottom" : "right"}
                    align={isMobile ? "end" : "start"}
                  >
                    <DropdownMenuItem>
                      <Folder className="text-muted-foreground" />
                      <span>View</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Forward className="text-muted-foreground" />
                      <span>Share</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Trash2 className="text-muted-foreground" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            ))}
          </>
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
