"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";

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
import { useWorkspace } from "@/context/workspace";
import { useRouter } from "next/navigation";

export function WorkspaceSwitcher({
  workspaces,
  products,
}: {
  workspaces: WorkspaceRow[];
  products: Product[];
}) {
  const { isMobile } = useSidebar();
  const { selectedWorkspaceId, setSelectedWorkspaceId, setSelectedWorkspace } =
    useWorkspace();
  const [workspace, setWorkspace] = React.useState<WorkspaceRow | null>(null);
  const router = useRouter();

  React.useEffect(() => {
    // Keep selected workspace in sync when the prop changes (e.g. first load / updates)
    if (!workspaces || workspaces.length === 0) {
      setWorkspace(null);
      return;
    }

    // Prefer the workspace selected in the global provider if available
    if (selectedWorkspaceId) {
      const found = workspaces.find((w) => w.id === selectedWorkspaceId);
      if (found) {
        // Only update local display state here. The provider already holds the
        // canonical selection; calling provider setters from this effect can
        // trigger the workspace-changed event and cause refetch loops.
        setWorkspace(found);
        return;
      }
    }

    // Otherwise default to the first workspace and persist that selection to the provider
    const first = workspaces[0];
    setWorkspace(first);
    if (!selectedWorkspaceId && first) {
      try {
        // Only set the provider selection once. Prefer writing the id so the
        // provider persists to localStorage and dispatches a single workspace-changed event.
        // Avoid calling the provider setter that may also attempt to write the workspace
        // object here, which can cause redundant events in some flows.
        if (setSelectedWorkspaceId) {
          setSelectedWorkspaceId(first.id);
        } else if (setSelectedWorkspace) {
          // Fallback if only the full setter is available.
          setSelectedWorkspace(first);
        }
      } catch (e) {
        // ignore
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    workspaces,
    selectedWorkspaceId,
    setSelectedWorkspaceId,
    setSelectedWorkspace,
  ]);

  // Selection persistence is handled by WorkspaceProvider (and the provider writes localStorage).
  // No local persistence required here — this effect intentionally left as a no-op.
  React.useEffect(() => {}, [workspace]);

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
                  <Avatar className="h-8 w-8 min-w-8 min-h-8 rounded-lg">
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
              Workspaces
            </DropdownMenuLabel>
            {workspaces.map((item: WorkspaceRow, index: number) => (
              <DropdownMenuItem
                key={item.id ?? item.name ?? index}
                onClick={() => {
                  // Update local display state immediately so the UI feels responsive.
                  setWorkspace(item);
                  try {
                    // Only update the provider when the selection actually changed.
                    if (selectedWorkspaceId !== item.id) {
                      // Prefer writing the id to persist selection and avoid double-dispatch.
                      if (setSelectedWorkspaceId) {
                        setSelectedWorkspaceId(item.id);
                      } else if (setSelectedWorkspace) {
                        // Fallback: set full workspace object if id-only setter isn't available.
                        setSelectedWorkspace(item);
                      }
                      // Navigate to the dashboard after switching workspaces so the user
                      // lands on the workspace homepage.
                      try {
                        router.push("/dashboard");
                      } catch {
                        // ignore router failures
                      }
                    }
                  } catch (e) {
                    // ignore provider errors
                  }
                }}
                className="gap-2 p-2"
              >
                <div className="flex items-center justify-center">
                  {item.logo ? (
                    <Avatar className="size-8 min-h-8 min-w-8 rounded-lg border">
                      <AvatarImage
                        src={
                          item.logo ||
                          "https://unblast.com/wp-content/uploads/2018/08/Gradient-Mesh-27.jpg"
                        }
                        alt={item.name || "Unknown"}
                      />
                      <AvatarFallback className="uppercase text-primary">
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
                {workspace?.id === item.id && (
                  <div className="p-1 bg-accent rounded-lg flex justify-center items-center">
                    <Check className="size-4 text-primary" />
                  </div>
                )}
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
