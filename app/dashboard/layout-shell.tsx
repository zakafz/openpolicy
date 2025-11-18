"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { createClient } from "@/lib/supabase/client";
import { fetchWorkspacesForOwner } from "@/lib/workspace";
import type { UsersRow } from "@/types/supabase";
import { usePathname } from "next/navigation";
import { Product } from "@polar-sh/sdk/models/components/product.js";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function LayoutShell({
  children,
  products,
}: {
  children: React.ReactNode;
  products: Product[];
}) {
  const [profile, setProfile] = useState<UsersRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [checkingWorkspaces, setCheckingWorkspaces] = useState(true);
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
      case "/dashboard/documents/published":
        return "Published Documents";
      case "/dashboard/documents/draft":
        return "Draft Documents";
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

        // Now check workspaces owned by this user using the centralized helper
        try {
          const ownerWorkspaces = await fetchWorkspacesForOwner(
            user.id,
            supabase,
          );
          // store workspaces in local state for use elsewhere (e.g. links)
          setOwnerWorkspaces(ownerWorkspaces ?? []);
          const hasWorkspace =
            Array.isArray(ownerWorkspaces) && ownerWorkspaces.length > 0;

          if (hasWorkspace) {
            // store first workspace id for convenience so UI can pre-fill workspaceId when creating documents
            try {
              const firstId = ownerWorkspaces[0]?.id ?? null;
              if (firstId) setFirstWorkspaceId(firstId);
            } catch {
              // ignore unexpected shapes
            }
          } else {
            // If the current path is already /create, do nothing to avoid redirect loop
            if (pathname !== "/create") {
              router.push("/create");
            }
            // No need to render the app sidebar etc.
          }
        } catch (wError: any) {
          // Preserve previous behavior of surfacing DB errors
          throw wError;
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
  }, []);

  if (error) throw error;

  return (
    <SidebarProvider>
      <AppSidebar user={profile} products={products} />
      <SidebarInset className="bg-card">
        {!isDocumentEdit && (
          <header className="flex h-14 shrink-0 border-b items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex items-center  gap-2 px-4">
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
                className="ml-auto mr-4"
              >
                <Button size={"sm"}>Create Document</Button>
              </Link>
            )}
          </header>
        )}
        <div className="flex flex-1 flex-col gap-4 px-4 overflow-scroll h-full">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
