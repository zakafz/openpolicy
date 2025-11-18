"use client";

import {
  ChevronsUpDown,
  Cog,
  Cookie,
  Cuboid,
  Folder,
  Handshake,
  Shield,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavDocuments } from "@/components/nav-documents";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useMemo, useRef } from "react";
import { useWorkspace } from "@/context/workspace";
import { WorkspaceRow } from "@/types/supabase";
import { Skeleton } from "./ui/skeleton";
import { Product } from "@polar-sh/sdk/models/components/product.js";
import { Button } from "./ui/button";

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

export function AppSidebar(props: { user: any; products: Product[] }) {
  const supabase = useMemo(() => createClient(), []);
  const { selectedWorkspaceId } = useWorkspace();
  const [workspaces, setWorkspaces] = useState<Array<any>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // track mounted state to avoid setting state after unmount
  const isMountedRef = useRef<boolean>(true);

  // document counts for sidebar (scoped to selected workspace)
  const [docCounts, setDocCounts] = useState({
    all: 0,
    published: 0,
    draft: 0,
    archived: 0,
  });
  const [countsLoading, setCountsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadCounts() {
      if (!selectedWorkspaceId) {
        setDocCounts({ all: 0, published: 0, draft: 0, archived: 0 });
        return;
      }
      setCountsLoading(true);
      try {
        const sb = createClient();
        const total = await sb
          .from("documents")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", selectedWorkspaceId);
        const published = await sb
          .from("documents")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", selectedWorkspaceId)
          .eq("status", "published");
        const draft = await sb
          .from("documents")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", selectedWorkspaceId)
          .eq("status", "draft");
        const archived = await sb
          .from("documents")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", selectedWorkspaceId)
          .eq("status", "archived");

        if (cancelled) return;

        setDocCounts({
          all: Number(total.count ?? 0),
          published: Number(published.count ?? 0),
          draft: Number(draft.count ?? 0),
          archived: Number(archived.count ?? 0),
        });
      } catch (e) {
        console.error("Failed to load sidebar document counts", e);
        if (!cancelled)
          setDocCounts({ all: 0, published: 0, draft: 0, archived: 0 });
      } finally {
        if (!cancelled) setCountsLoading(false);
      }
    }

    loadCounts();
    return () => {
      cancelled = true;
    };
  }, [selectedWorkspaceId]);

  // memoized counts map for passing to NavMain
  const navCounts = useMemo(
    () => ({
      all: docCounts.all,
      published: docCounts.published,
      draft: docCounts.draft,
      archived: docCounts.archived,
    }),
    [docCounts],
  );

  useEffect(() => {
    // Track mount state to avoid updating after unmount
    let isMounted = true;
    // A timeout id used to cancel a stuck request (fallback)
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const fetchWorkspaces = async (showLoader = false) => {
      if (!isMounted) return;
      if (showLoader) setLoading(true);
      setError(null);

      // Start a safety timeout: if the fetch hangs, stop the loader and surface a message
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      timeoutId = setTimeout(() => {
        if (!isMounted) return;
        console.warn("[AppSidebar] fetchWorkspaces timed out");
        setLoading(false);
        setError("Request timed out. Please try again.");
      }, 10000); // 10s fallback

      try {
        const { data, error: fetchError } = await supabase
          .from<string, WorkspaceRow>("workspaces")
          .select("id, name, logo, plan")
          .order("created_at", { ascending: true });

        if (fetchError) throw fetchError;

        const mapped = (data ?? []).map((w) => ({
          id: w.id,
          name: w.name ?? "Untitled",
          logo: w.logo ?? "",
          plan: w.plan ?? "Free",
        }));

        if (!isMounted) return;
        setWorkspaces(mapped);
        setError(null);
      } catch (err: any) {
        if (!isMounted) return;
        console.error("[AppSidebar] fetchWorkspaces error", err);
        setError(err?.message ?? String(err));
        setWorkspaces([]);
      } finally {
        if (!isMounted) return;
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        setLoading(false);
      }
    };

    // initial fetch and show loader
    fetchWorkspaces(true);

    // Re-fetch when other parts of the app signal the workspace changed.
    // A small debounce prevents rapid refetch loops.
    let lastHandled = 0;
    const onWorkspaceChanged = (_ev?: Event) => {
      if (!isMounted) return;
      const now = Date.now();
      if (now - lastHandled < 500) {
        // ignore events within 500ms
        return;
      }
      lastHandled = now;
      // Subsequent refetch should not show the big loader to avoid UI flicker
      fetchWorkspaces(false).catch((e) => {
        console.warn("[AppSidebar] workspace-changed handler fetch failed", e);
      });
    };

    if (typeof window !== "undefined") {
      window.addEventListener(
        "workspace-changed",
        onWorkspaceChanged as EventListener,
      );
    }

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (typeof window !== "undefined") {
        try {
          window.removeEventListener(
            "workspace-changed",
            onWorkspaceChanged as EventListener,
          );
        } catch {
          // ignore
        }
      }
    };
    // intentionally only run on mount/unmount
  }, [supabase]);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        {error ? (
          <div className="flex items-center gap-3 p-3">
            <div className="flex-1">
              <div className="text-sm font-medium text-destructive">
                Could not load workspaces
              </div>
              <div className="text-xs text-muted-foreground mt-1">{error}</div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  // Retry by dispatching the same event the sidebar listens to
                  try {
                    window.dispatchEvent(
                      new CustomEvent("workspace-changed", { detail: {} }),
                    );
                  } catch {
                    // fallback: reload page
                    window.location.reload();
                  }
                }}
              >
                Retry
              </Button>
            </div>
          </div>
        ) : loading ? (
          <Skeleton className="w-full h-12 flex justify-between items-center p-2">
            <Skeleton className="h-full aspect-square bg-ring" />
            <div className="flex flex-col w-full ml-2 gap-1">
              <Skeleton className="h-3 w-24 bg-ring/70" />
              <Skeleton className="h-3 w-16 bg-ring/70" />
            </div>
            <ChevronsUpDown className="ml-auto size-5.5" />
          </Skeleton>
        ) : (
          <WorkspaceSwitcher
            workspaces={workspaces}
            products={props.products}
          />
        )}
      </SidebarHeader>
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
