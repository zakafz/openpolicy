import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CreateWorkspaceForm } from "@/components/create-workspace-form";
import { LogoutButton } from "@/components/logout-button";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/polar";
import { createClient } from "@/lib/supabase/server";
import { fetchWorkspacesForOwner } from "@/lib/workspace";

export const metadata: Metadata = {
  title: "Create a Workspace",
  description:
    "Set up your new workspace and start managing your policy documents. Choose your plan and get started in minutes.",
  openGraph: {
    title: "Create Your OpenPolicy Workspace",
    description:
      "Set up your workspace and start managing policy documents today.",
    url: "/create",
  },
  twitter: {
    title: "Create a Workspace - OpenPolicy",
    description:
      "Set up your new workspace and start managing your policy documents.",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const workspaces = await fetchWorkspacesForOwner(user.id, supabase);
  if (workspaces.length > 0) {
    redirect("/dashboard");
  }

  const products = await api.products.list({ isArchived: false });

  return (
    <div className="relative flex min-h-screen flex-col gap-2 w-full items-center justify-center p-4 bg-card">
      <div className="flex items-end flex-col">
        <CreateWorkspaceForm products={products.result.items} />
        <span className="text-xs text-muted-foreground flex items-center w-fit pr-4">
          Want to{" "}
          <LogoutButton>
            <Button
              variant="link"
              className="text-xs px-0.5 text-muted-foreground pr-0 hover:text-red-500"
            >
              Logout
            </Button>
          </LogoutButton>
          ?
        </span>
      </div>
    </div>
  );
}
