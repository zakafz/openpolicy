"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
                  className={
                    `${pathname}/` === item.url ? "bg-sidebar-accent" : ""
                  }
                >
                  <Link href={item.url}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </Link>
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
                        item.items?.some((sub) => `${pathname}/` === sub.url)
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
                          className={
                            `${pathname}/` === subItem.url
                              ? "bg-sidebar-accent"
                              : ""
                          }
                        >
                          <Link
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
                          </Link>
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
