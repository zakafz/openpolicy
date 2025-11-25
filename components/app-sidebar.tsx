"use client";

import type { Product } from "@polar-sh/sdk/models/components/product.js";
import {
  Cog,
  Cookie,
  Cuboid,
  Eye,
  EyeClosed,
  Folder,
  Handshake,
  Shield
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { NavDocuments } from "@/components/nav-documents";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useWorkspace } from "@/context/workspace";
import { fetchWorkspaceDocumentCounts } from "@/lib/documents";
import { createClient } from "@/lib/supabase/client";
import { fetchWorkspaceById, readSelectedWorkspaceId } from "@/lib/workspace";
import type { WorkspaceRow } from "@/types/supabase";
import { Button } from "./ui/button";
import { WorkspaceSwitcher } from "./workspace-switcher";

// This is sample data.
const data = {
  navMain: [
    {
      title: "Overview",
      url: "/dashboard/",
      icon: Cuboid,
    },
    {
      title: "Documents",
      url: "/dashboard/documents?state=active/",
      icon: Folder,
      items: [
        {
          title: "All",
          url: "/dashboard/documents/all/",
        },
        {
          title: "Published",
          url: "/dashboard/documents/published/",
        },
        {
          title: "Draft",
          url: "/dashboard/documents/draft/",
        },
        {
          title: "Archived",
          url: "/dashboard/documents/archived/",
        },
      ],
    },
    {
      title: "Settings",
      url: "/dashboard/settings/general/",
      icon: Cog,
      items: [
        {
          title: "Workspace",
          url: "/dashboard/settings/workspace/",
        },
        {
          title: "Account",
          url: "/dashboard/settings/account/",
        },
        {
          title: "Billing",
          url: "/portal",
        },
      ],
    },
  ],
  documents: [
    {
      name: "Privacy policy",
      url: "#",
      icon: Shield,
    },
    {
      name: "Terms of service",
      url: "#",
      icon: Handshake,
    },
    {
      name: "Cookie policy",
      url: "#",
      icon: Cookie,
    },
  ],
};

export function AppSidebar(props: {
  user: any;
  products: Product[];
  workspaces: WorkspaceRow[];
}) {
  const { selectedWorkspaceId } = useWorkspace();
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>(
    props.workspaces ?? [],
  );

  // document counts for sidebar (scoped to selected workspace)
  const [docCounts, setDocCounts] = useState({
    all: 0,
    published: 0,
    drafts: 0,
    archived: 0,
  });
  const [countsLoading, setCountsLoading] = useState(false);

  // Sync internal state with prop updates (e.g. if parent refetches)
  useEffect(() => {
    if (props.workspaces) {
      setWorkspaces(props.workspaces);
    }
  }, [props.workspaces]);

  useEffect(() => {
    let cancelled = false;

    async function loadCounts() {
      // Prefer context selection but fallback to persisted selection in localStorage.
      const workspaceIdToUse = selectedWorkspaceId ?? readSelectedWorkspaceId();

      if (!workspaceIdToUse) {
        setDocCounts({ all: 0, published: 0, drafts: 0, archived: 0 });
        return;
      }

      setCountsLoading(true);
      try {
        // Use centralized helper which performs the head/count queries and returns
        // a structured object. Pass a client instance for client-side execution.
        const counts = await fetchWorkspaceDocumentCounts(
          workspaceIdToUse,
          createClient(),
        );

        if (cancelled) return;

        setDocCounts({
          all: Number(counts.all ?? 0),
          published: Number(counts.published ?? 0),
          drafts: Number(counts.drafts ?? 0),
          archived: Number(counts.archived ?? 0),
        });
      } catch (e) {
        console.error("Failed to load sidebar document counts", e);
        if (!cancelled)
          setDocCounts({ all: 0, published: 0, drafts: 0, archived: 0 });
      } finally {
        if (!cancelled) setCountsLoading(false);
      }
    }

    loadCounts();

    // Listen for global "document-updated" events to re-fetch counts
    function handleDocUpdate() {
      loadCounts();
    }
    window.addEventListener("document-updated", handleDocUpdate);

    return () => {
      cancelled = true;
      window.removeEventListener("document-updated", handleDocUpdate);
    };
  }, [selectedWorkspaceId]);

  // memoized counts map for passing to NavMain
  const navCounts = useMemo(
    () => ({
      all: docCounts.all,
      published: docCounts.published,
      draft: docCounts.drafts,
      archived: docCounts.archived,
    }),
    [docCounts],
  );

  useEffect(() => {
    // Ensure selected workspace details (slug) are available.
    // If the selectedWorkspaceId exists but we don't have its slug in the
    // `workspaces` state (for example because the initial fetch didn't include it),
    // fetch the single workspace by id and merge it into state so previewHref can
    // build a valid URL.
    let cancelled = false;

    async function ensureWorkspace() {
      if (!selectedWorkspaceId) return;
      const existing = workspaces.find(
        (w) => String(w.id) === String(selectedWorkspaceId),
      );
      if (existing && existing.slug) return;

      try {
        // Use a lightweight client and the central helper to fetch the workspace.
        const supabaseClient = createClient();
        const ws = await fetchWorkspaceById(
          selectedWorkspaceId,
          supabaseClient,
        );

        if (!cancelled && ws) {
          setWorkspaces((prev) => {
            const found = prev.find((p) => String(p.id) === String(ws.id));
            const mapped = {
              id: ws.id,
              name: (ws as any).name ?? "Untitled",
              logo: (ws as any).logo ?? "",
              plan: (ws as any).plan ?? "Free",
              slug: (ws as any).slug ?? null,
            } as WorkspaceRow; // cast to match type
            if (found) {
              // update existing entry with any missing slug field
              return prev.map((p) =>
                String(p.id) === String(ws.id) ? { ...p, ...mapped } : p,
              );
            }
            return [...prev, mapped];
          });
        }
      } catch (e) {
        // Non-fatal; if this fails the preview button will remain disabled.
        console.warn("[AppSidebar] ensureWorkspace fetch failed", e);
      }
    }

    ensureWorkspace();

    return () => {
      cancelled = true;
    };
  }, [selectedWorkspaceId, workspaces]);

  const previewHref = useMemo(() => {
    if (!selectedWorkspaceId) return "#";
    const ws = workspaces.find(
      (w) => String(w.id) === String(selectedWorkspaceId),
    );
    const workspaceSlug = ws?.slug ?? null;
    if (!workspaceSlug) return "#";

    if (process.env.NODE_ENV === "production") {
      return `https://${workspaceSlug}.openpolicyhq.com/`;
    }

    return `http://${workspaceSlug}.localhost:3000/`;
  }, [selectedWorkspaceId, workspaces]);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <WorkspaceSwitcher workspaces={workspaces} products={props.products} />
      </SidebarHeader>
      <Tooltip delayDuration={500}>
        <TooltipTrigger asChild>
          {/* If previewHref is not available we render a non-link wrapper so the trigger still works */}
          {previewHref && previewHref !== "#" ? (
            <a
              href={previewHref}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full px-2 group-data-[collapsible=icon]:hidden"
            >
              <Button variant="outline" size={"sm"} className="w-full">
                <Eye />
                Open Workspace
              </Button>
            </a>
          ) : (
            <div className="w-full px-2">
              <Button
                variant="outline"
                size={"sm"}
                className="w-full group-data-[collapsible=icon]:hidden"
                disabled
              >
                <EyeClosed />
                Open Workspace
              </Button>
            </div>
          )}
        </TooltipTrigger>
        <TooltipContent className="text-xs" side="bottom">
          {previewHref && previewHref !== "#" ? (
            <>View Your Workspace</>
          ) : (
            <>No Workspace Available</>
          )}
        </TooltipContent>
      </Tooltip>
      <SidebarContent>
        <NavMain items={data.navMain} counts={navCounts} />
        <NavDocuments />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={props.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
