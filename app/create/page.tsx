import { CreateWorkspaceForm } from "@/components/create-workspace-form";
import { LogoutButton } from "@/components/logout-button";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/polar";

export default async function Page() {
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
