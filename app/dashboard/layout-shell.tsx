"use client";

import type { Product } from "@polar-sh/sdk/models/components/product.js";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { createClient } from "@/lib/supabase/client";
import { fetchWorkspacesForOwner } from "@/lib/workspace";
import type { UsersRow } from "@/types/supabase";

export default function LayoutShell({
  children,
  products,
  isAdmin,
}: {
  children: React.ReactNode;
  products: Product[];
  isAdmin?: boolean;
}) {
  const [profile, setProfile] = useState<UsersRow | null>(null);
  const [_loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [_checkingWorkspaces, setCheckingWorkspaces] = useState(true);
  const [ownerWorkspaces, setOwnerWorkspaces] = useState<any[] | null>(null);
  const [firstWorkspaceId, setFirstWorkspaceId] = useState<string | null>(null);

  const pathname = usePathname();
  const isDocumentDetail = pathname?.startsWith("/dashboard/d/") ?? false;
  const isDocumentEdit = pathname?.startsWith("/dashboard/edit/") ?? false;
  const router = useRouter();

  function getBreadcrumbTitle(path: string) {
    switch (pathname) {
      case "/dashboard":
        return "Overview";
      case "/dashboard/documents/all":
        return "All Documents";
      case "/dashboard/documents/published":
        return "Published Documents";
      case "/dashboard/documents/draft":
        return "Drafts";
      case "/dashboard/documents/archived":
        return "Archived Documents";
      case "/dashboard/documents/new":
        return "Create a New Document";
      case "/dashboard/settings/general":
        return "General Settings";
      case "/dashboard/settings/account":
        return "Account Settings";

      default: {
        const segments = path.split("/").filter(Boolean);
        if (segments.length === 0) return "Page";
        const last = decodeURIComponent(segments[segments.length - 1]);
        return last.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      }
    }
  }

  const breadcrumbTitle = getBreadcrumbTitle(pathname);

  useEffect(() => {
    const fetchAuthAndProfile = async () => {
      try {
        const supabase = createClient();

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!user) throw new Error("No authenticated user");

        const { data: profileData, error: profileError } = await supabase
          .from("users")
          .select("*")
          .eq("auth_id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        setProfile(profileData as UsersRow | null);
        const ownerWorkspaces = await fetchWorkspacesForOwner(
          user.id,
          supabase,
        );
        setOwnerWorkspaces(ownerWorkspaces ?? []);
        const hasWorkspace =
          Array.isArray(ownerWorkspaces) && ownerWorkspaces.length > 0;

        if (hasWorkspace) {
          try {
            const firstId = ownerWorkspaces[0]?.id ?? null;
            if (firstId) setFirstWorkspaceId(firstId);
          } catch {
            // ignore
          }
        } else {
          if (pathname !== "/create") {
            router.push("/create");
          }
        }
      } catch (err: any) {
        setError(err);
      } finally {
        setLoading(false);
        setCheckingWorkspaces(false);
      }
    };

    fetchAuthAndProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, router.push]);

  if (error) throw error;

  return (
    <SidebarProvider>
      <AppSidebar
        user={profile}
        products={products}
        workspaces={ownerWorkspaces ?? []}
        isAdmin={isAdmin}
      />
      <SidebarInset className="bg-card">
        {!isDocumentEdit && (
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-card transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{breadcrumbTitle}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            {pathname ===
            "/dashboard/documents/new" ? null : isDocumentDetail ? null : (
              <Link
                href={
                  firstWorkspaceId
                    ? `/dashboard/documents/new?workspaceId=${firstWorkspaceId}`
                    : "/dashboard/documents/new"
                }
                className="mr-4 ml-auto"
              >
                <Button size={"sm"}>Create Document</Button>
              </Link>
            )}
          </header>
        )}
        <div className="flex h-full flex-1 flex-col gap-4 overflow-scroll px-4">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
