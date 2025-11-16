"use client";

import * as React from "react";
import { ChevronsUpDown, Plus } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { WorkspaceRow } from "@/types/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Product } from "@polar-sh/sdk/models/components/product.js";

export function WorkspaceSwitcher({
  workspaces,
  products,
}: {
  workspaces: WorkspaceRow[];
  products: Product[];
}) {
  const { isMobile } = useSidebar();
  const [workspace, setWorkspace] = React.useState<WorkspaceRow | null>(() => {
    try {
      if (typeof window !== "undefined") {
        const storedId = localStorage.getItem("selectedWorkspace");
        if (storedId && workspaces && workspaces.length > 0) {
          const found = workspaces.find((w) => w.id === storedId);
          if (found) return found;
        }
      }
    } catch (e) {
      // ignore localStorage errors
    }
    return workspaces && workspaces.length > 0 ? workspaces[0] : null;
  });

  React.useEffect(() => {
    // Keep selected workspace in sync when the prop changes (e.g. first load / updates)
    if (workspaces && workspaces.length > 0) {
      setWorkspace((prev) => {
        // Try to restore a stored selection first if present.
        try {
          if (typeof window !== "undefined") {
            const storedId = localStorage.getItem("selectedWorkspace");
            if (storedId) {
              const foundStored = workspaces.find((w) => w.id === storedId);
              if (foundStored) return foundStored;
            }
          }
        } catch (e) {
          // ignore localStorage errors
        }

        // If current selected is missing or no longer in the list, pick the first.
        if (!prev) return workspaces[0];
        const found = workspaces.find((w) => w.id === prev.id);
        if (!found) return workspaces[0];
        return prev;
      });
    } else {
      setWorkspace(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaces]);

  // Persist selected workspace id to localStorage so selection survives refreshes / navigation
  React.useEffect(() => {
    try {
      if (workspace && typeof window !== "undefined") {
        localStorage.setItem("selectedWorkspace", workspace.id);
      } else if (typeof window !== "undefined") {
        localStorage.removeItem("selectedWorkspace");
      }
    } catch (e) {
      // ignore localStorage write errors
    }
  }, [workspace]);

  if (!workspace) {
    return null;
  }
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="border text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                {workspace.logo ? (
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage
                      src={
                        workspace.logo ||
                        "https://unblast.com/wp-content/uploads/2018/08/Gradient-Mesh-27.jpg"
                      }
                      alt={workspace.name || "Unknown"}
                    />
                    <AvatarFallback className="rounded-lg uppercase text-primary">
                      {workspace.name?.charAt(0) || "NA"}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="size-4 flex items-center justify-center rounded bg-muted-foreground text-muted-foreground/80">
                    {workspace.name?.charAt(0) ?? ""}
                  </div>
                )}
              </div>
              <div className="flex flex-col leading-4">
                <span className="truncate font-medium">{workspace.name}</span>
                <span className="truncate text-xs font-mono text-muted-foreground">
                  {products.find((product) => product.id === workspace.plan)
                    ?.name || "Unknown"}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Workspace
            </DropdownMenuLabel>
            {workspaces.map((item: WorkspaceRow, index: number) => (
              <DropdownMenuItem
                key={item.id ?? item.name ?? index}
                onClick={() => setWorkspace(item)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-md border">
                  {item.logo ? (
                    <Avatar className="size-8 min-h-8 min-w-8 rounded-lg">
                      <AvatarImage
                        src={
                          item.logo ||
                          "https://unblast.com/wp-content/uploads/2018/08/Gradient-Mesh-27.jpg"
                        }
                        alt={item.name || "Unknown"}
                      />
                      <AvatarFallback className="rounded-lg uppercase text-primary">
                        {item.name?.charAt(0) || "NA"}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="size-3.5 shrink-0 flex items-center justify-center rounded bg-muted-foreground text-muted-foreground/80">
                      {item.name?.charAt(0) ?? ""}
                    </div>
                  )}
                </div>
                <div className="flex flex-col leading-4 ml-1 w-full">
                  <span className="truncate font-medium">{item.name}</span>
                  <span className="truncate text-xs font-mono text-muted-foreground">
                    {products.find((product) => product.id === item.plan)
                      ?.name || "Unknown"}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <a href="/create">
              <DropdownMenuItem className="gap-2 p-2">
                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                  <Plus className="size-4" />
                </div>
                <div className="text-muted-foreground font-medium">
                  Add workspace
                </div>
              </DropdownMenuItem>
            </a>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
