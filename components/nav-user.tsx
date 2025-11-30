"use client";

import {
  ArrowUpRight,
  CreditCard,
  Home,
  LogOut,
  MoreVertical,
  Sparkles,
  User,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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
import { useWorkspace } from "@/context/workspace";
import type { UsersRow } from "@/types/supabase";
import { LogoutButton } from "./logout-button";

export function NavUser({ user }: { user: UsersRow }) {
  const { isMobile } = useSidebar();
  const { selectedWorkspaceId } = useWorkspace();
  const [isFreePlan, setIsFreePlan] = React.useState(false);

  const [localUser, setLocalUser] = React.useState<UsersRow | null>(
    user ?? null,
  );
  React.useEffect(() => {
    setLocalUser(user ?? null);
  }, [user]);

  React.useEffect(() => {
    if (!selectedWorkspaceId) {
      setIsFreePlan(false);
      return;
    }

    async function checkPlan() {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: workspace } = await supabase
          .from("workspaces")
          .select("plan")
          .eq("id", selectedWorkspaceId)
          .single();

        if (!workspace?.plan) {
          setIsFreePlan(true);
          return;
        }

        const res = await fetch(`/api/plans/check?planId=${workspace.plan}`);
        if (res.ok) {
          const data = await res.json();
          setIsFreePlan(data.isFree);
        }
      } catch (e) {
        console.error("Failed to check plan status", e);
      }
    }

    checkPlan();
  }, [selectedWorkspaceId]);

  React.useEffect(() => {
    const handler = (ev: Event) => {
      try {
        const custom = ev as CustomEvent<Record<string, any> | null>;
        const detail = custom?.detail;
        if (!detail) return;

        setLocalUser((prev) => {
          if (!prev) {
            const newUser: UsersRow = {
              id: detail.id ?? "",
              auth_id: detail.auth_id ?? "",
              full_name: detail.full_name ?? null,
              first_name: detail.first_name ?? null,
              last_name: detail.last_name ?? null,
              avatar_url: detail.avatar_url ?? null,
              email: detail.email ?? null,
              provider: detail.provider ?? null,
              provider_user_id: detail.provider_user_id ?? null,
              raw_user: detail.raw_user ?? null,
              metadata: detail.metadata ?? null,
              created_at: detail.created_at ?? null,
              updated_at: detail.updated_at ?? null,
            };
            return newUser;
          }
          return {
            ...prev,
            full_name: detail.full_name ?? prev.full_name,
            avatar_url: detail.avatar_url ?? prev.avatar_url,
            email: detail.email ?? prev.email,
            raw_user: detail.raw_user ?? prev.raw_user,
            metadata: detail.metadata ?? prev.metadata,
            updated_at: detail.updated_at ?? prev.updated_at,
          };
        });
      } catch {
        // ignore
      }
    };

    window.addEventListener("user:updated", handler as EventListener);
    return () => {
      window.removeEventListener("user:updated", handler as EventListener);
    };
  }, []);

  const displayName = localUser?.full_name ?? "Unknown";
  const displayEmail = localUser?.email ?? "";
  const displayAvatar = localUser?.avatar_url ?? "";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg border">
                <AvatarImage
                  src={displayAvatar || ""}
                  alt={displayName || "Unknown"}
                />
                <AvatarFallback className="rounded-lg uppercase">
                  {displayName?.charAt(0) || "NA"}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{displayName}</span>
                <span className="truncate text-xs">{displayEmail}</span>
              </div>
              <MoreVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg border">
                  <AvatarImage
                    src={displayAvatar || ""}
                    alt={displayName || "Unknown"}
                  />
                  <AvatarFallback className="rounded-lg uppercase">
                    {displayName?.charAt(0) || "NA"}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{displayName}</span>
                  <span className="truncate text-xs">{displayEmail}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {isFreePlan && (
              <>
                <DropdownMenuGroup>
                  <Link href="/portal">
                    <DropdownMenuItem>
                      <Sparkles />
                      Upgrade Workspace
                    </DropdownMenuItem>
                  </Link>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuGroup>
              <Link href={"/dashboard/settings/account"}>
                <DropdownMenuItem>
                  <User />
                  Account
                </DropdownMenuItem>
              </Link>
              <Link href={"/portal"}>
                <DropdownMenuItem>
                  <CreditCard />
                  Billing
                </DropdownMenuItem>
              </Link>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <Link href={"/"}>
              <DropdownMenuItem>
                <Home />
                Home
                <DropdownMenuShortcut>
                  <ArrowUpRight />
                </DropdownMenuShortcut>
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <LogoutButton>
              <DropdownMenuItem variant="destructive">
                <LogOut />
                Log out
              </DropdownMenuItem>
            </LogoutButton>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
