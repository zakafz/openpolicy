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
import type { UsersRow } from "@/types/supabase";
import { usePathname } from "next/navigation";
import { Product } from "@polar-sh/sdk/models/components/product.js";

export default function LayoutShell({ children, products }: { children: React.ReactNode; products: Product[] }) {
  const [profile, setProfile] = useState<UsersRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [checkingWorkspaces, setCheckingWorkspaces] = useState(true);

  const pathname = usePathname();
  const router = useRouter();

  function getBreadcrumbTitle(path: string) {
    switch (pathname) {
      case "/dashboard":
        return "Overview";
      case "/dashboard/documents/active":
        return "Active Documents";
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

        // Now check workspaces owned by this user
        const { data: wData, error: wError } = await supabase
          .from("workspaces")
          .select("id")
          .eq("owner_id", user.id)
          .limit(1);

        if (wError) throw wError;

        const hasWorkspace = Array.isArray(wData) && wData.length > 0;

        if (!hasWorkspace) {
          // If the current path is already /create, do nothing to avoid redirect loop
          if (pathname !== "/create") {
            router.push("/create");
          }
          // No need to render the app sidebar etc.
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

  if (loading || checkingWorkspaces) {
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar user={profile} products={products} />
      <SidebarInset className="bg-card">
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
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
