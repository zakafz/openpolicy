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
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center gap-2 bg-card p-4">
      <div className="flex flex-col items-end">
        <CreateWorkspaceForm products={products.result.items} />
        <span className="flex w-fit items-center pr-4 text-muted-foreground text-xs">
          Want to{" "}
          <LogoutButton>
            <Button
              variant="link"
              className="px-0.5 pr-0 text-muted-foreground text-xs hover:text-red-500"
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
