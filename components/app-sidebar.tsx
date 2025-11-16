"use client";

import {
  AudioWaveform,
  ChevronsUpDown,
  Cog,
  Command,
  Cookie,
  Cuboid,
  Folder,
  GalleryVerticalEnd,
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
import { useEffect, useState } from "react";
import { WorkspaceRow } from "@/types/supabase";
import { Skeleton } from "./ui/skeleton";
import { Product } from "@polar-sh/sdk/models/components/product.js";

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
      url: "/dashboard/documents/active",
      icon: Folder,
      items: [
        {
          title: "Active",
          url: "/dashboard/documents/active",
        },
        {
          title: "Archived",
          url: "/dashboard/documents/archived",
        },
        {
          title: "Draft",
          url: "/dashboard/documents/draft",
        },
      ],
    },
    {
      title: "Settings",
      url: "/settings/general",
      icon: Cog,
      items: [
        {
          title: "General",
          url: "/settings/general",
        },
        {
          title: "Account",
          url: "/settings/account",
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
  const supabase = createClient();
  const [workspaces, setWorkspaces] = useState<Array<any>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchWorkspaces = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch workspaces owned by the current user
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
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message ?? String(err));
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    };

    fetchWorkspaces();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        {loading ? (
          <Skeleton className="w-full h-12 flex justify-between items-center p-2">
            <Skeleton className="h-full aspect-square bg-ring" />
            <div className="flex flex-col w-full ml-2 gap-1">
              <Skeleton className="h-3 w-24 bg-ring/70" />
              <Skeleton className="h-3 w-16 bg-ring/70" />
            </div>
            <ChevronsUpDown className="ml-auto size-5.5" />
          </Skeleton>
        ) : (
          <WorkspaceSwitcher workspaces={workspaces} products={props.products} />
        )}
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments documents={data.documents} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={props.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
