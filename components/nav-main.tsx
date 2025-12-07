"use client";

import type { LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { SafeLink } from "@/components/safe-link";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

export function NavMain({
  items,
  counts,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
  counts?: Record<string, number | string>;
}) {
  const pathname = usePathname();

  const isUrlActive = (url: string) => {
    const normalize = (p: string) => (p.endsWith("/") ? p.slice(0, -1) : p);
    const currentPath = normalize(pathname);
    const targetPath = normalize(url);

    if (targetPath === "/dashboard") {
      return currentPath === targetPath;
    }

    return (
      currentPath === targetPath || currentPath.startsWith(`${targetPath}/`)
    );
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Workspace</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const hasChildren =
            Array.isArray(item.items) && item.items.length > 0;

          if (!hasChildren) {
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  className={isUrlActive(item.url) ? "bg-sidebar-accent" : ""}
                >
                  <SafeLink href={item.url}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </SafeLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          }

          return (
            <Collapsible
              key={item.title}
              defaultOpen={true}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger
                  render={
                    <SidebarMenuButton
                      tooltip={item.title}
                      className={
                        item.items?.some((sub) => isUrlActive(sub.url))
                          ? "bg-sidebar-accent"
                          : ""
                      }
                    >
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  }
                />
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton
                          asChild
                          data-testid={`sidebar-nav-${subItem.title.toLowerCase()}`}
                          className={
                            isUrlActive(subItem.url) ? "bg-sidebar-accent" : ""
                          }
                        >
                          <SafeLink
                            href={subItem.url}
                            className="flex w-full items-center gap-2"
                          >
                            <span className="truncate">{subItem.title}</span>
                            <span className="ml-auto font-mono text-muted-foreground text-xs">
                              {(() => {
                                if (!counts) return null;
                                const key = String(
                                  subItem.title || "",
                                ).toLowerCase();
                                return counts[key] ?? null;
                              })()}
                            </span>
                          </SafeLink>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
