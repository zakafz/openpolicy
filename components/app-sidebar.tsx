"use client";

import type { Product } from "@polar-sh/sdk/models/components/product.js";
import {
  Cog,
  Cookie,
  Cuboid,
  Eye,
  EyeClosed,
  Folder,
  Globe,
  Handshake,
  Monitor,
  Shield,
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
import { isFreePlan } from "@/lib/limits";
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
  isAdmin?: boolean;
}) {
  const { selectedWorkspaceId } = useWorkspace();
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>(
    props.workspaces ?? [],
  );

  const navMainItems = useMemo(() => {
    const items = [...data.navMain];
    if (props.isAdmin) {
      return [
        {
          title: "Monitors",
          url: "/dashboard/monitors",
          icon: Monitor,
        },
        ...items,
      ];
    }
    return items;
  }, [props.isAdmin]);

  const [docCounts, setDocCounts] = useState({
    all: 0,
    published: 0,
    drafts: 0,
    archived: 0,
  });
  const [countsLoading, setCountsLoading] = useState(false);
  const [isFree, setIsFree] = useState(true);

  useEffect(() => {
    if (props.workspaces) {
      setWorkspaces(props.workspaces);
    }
  }, [props.workspaces]);

  useEffect(() => {
    let cancelled = false;

    async function loadCounts() {
      const workspaceIdToUse = selectedWorkspaceId ?? readSelectedWorkspaceId();

      if (!workspaceIdToUse) {
        setDocCounts({ all: 0, published: 0, drafts: 0, archived: 0 });
        return;
      }

      setCountsLoading(true);
      try {
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

    function handleDocUpdate() {
      loadCounts();
    }
    window.addEventListener("document-updated", handleDocUpdate);

    return () => {
      cancelled = true;
      window.removeEventListener("document-updated", handleDocUpdate);
    };
  }, [selectedWorkspaceId]);

  useEffect(() => {
    async function checkPlan() {
      const ws = workspaces.find(
        (w) => String(w.id) === String(selectedWorkspaceId),
      );
      if (!ws) {
        setIsFree(true);
        return;
      }
      try {
        const result = await isFreePlan(ws.plan ?? null);
        setIsFree(result);
      } catch (e) {
        setIsFree(true);
      }
    }
    checkPlan();
  }, [selectedWorkspaceId, workspaces]);

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
    let cancelled = false;

    async function ensureWorkspace() {
      if (!selectedWorkspaceId) return;
      const existing = workspaces.find(
        (w) => String(w.id) === String(selectedWorkspaceId),
      );
      if (existing && existing.slug) return;

      try {
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
              custom_domain: (ws as any).custom_domain ?? null,
            } as WorkspaceRow;
            if (found) {
              return prev.map((p) =>
                String(p.id) === String(ws.id) ? { ...p, ...mapped } : p,
              );
            }
            return [...prev, mapped];
          });
        }
      } catch (e) {
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

  const customDomainHref = useMemo(() => {
    if (!selectedWorkspaceId) return null;
    const ws = workspaces.find(
      (w) => String(w.id) === String(selectedWorkspaceId),
    );
    const customDomain = (ws as any)?.custom_domain;
    if (!customDomain) return null;
    return `https://${customDomain}`;
  }, [selectedWorkspaceId, workspaces]);

  return (
    <Sidebar collapsible="icon" className="z-100">
      <SidebarHeader>
        <WorkspaceSwitcher workspaces={workspaces} products={props.products} />
      </SidebarHeader>
      <div className="w-full px-2 group-data-[collapsible=icon]:hidden flex gap-2">
        {customDomainHref ? (
          <>
            <Tooltip delayDuration={500}>
              <TooltipTrigger asChild>
                <a
                  href={customDomainHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button variant="outline" size={"sm"} className="w-full">
                    <Globe />
                    Published Domain
                  </Button>
                </a>
              </TooltipTrigger>
              <TooltipContent className="text-xs" side="bottom">
                <>View your published domain</>
              </TooltipContent>
            </Tooltip>
            {previewHref && previewHref !== "#" && (
              <Tooltip delayDuration={500}>
                <TooltipTrigger asChild>
                  <a
                    href={previewHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size={"icon-sm"} className="px-2">
                      <Eye />
                    </Button>
                  </a>
                </TooltipTrigger>
                <TooltipContent className="text-xs" side="bottom">
                  <>View OpenPolicy hosted workspace</>
                </TooltipContent>
              </Tooltip>
            )}
          </>
        ) : (
          <Tooltip delayDuration={500}>
            <TooltipTrigger asChild>
              {previewHref && previewHref !== "#" ? (
                <a
                  href={previewHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button variant="outline" size={"sm"} className="w-full">
                    <Eye />
                    View Workspace
                  </Button>
                </a>
              ) : (
                <div className="flex-1">
                  <Button
                    variant="outline"
                    size={"sm"}
                    className="w-full"
                    disabled
                  >
                    <EyeClosed />
                    View Workspace
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
        )}
      </div>
      <SidebarContent>
        <NavMain items={navMainItems} counts={navCounts} />
        <NavDocuments />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={props.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
