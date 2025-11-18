import LayoutShell from "./layout-shell";
import { createServiceClient } from "@/lib/supabase/service";
import { notFound } from "next/navigation";

export default async function Layout({ children, params }: any) {
  // Unwrap params (Next.js may provide params as a Promise)
  const { workspace } = (await params) as { workspace?: string | undefined };

  // Create privileged service client (server-side)
  const svc = createServiceClient();

  // Resolve workspace by slug (same logic as app/[workspace]/page.tsx)
  const { data: ws, error: wsErr } = await svc
    .from("workspaces")
    .select("id,name,logo,support_email,return_url,disable_icon,slug,owner_id")
    .eq("slug", workspace)
    .maybeSingle();

  if (wsErr || !ws) {
    return notFound();
  }

  // Fetch published documents for this workspace (same filters as the page)
  const { data: docs, error: docsErr } = await svc
    .from("documents")
    .select("id,title,slug,updated_at,created_at")
    .eq("workspace_id", ws.id)
    .eq("published", true)
    .order("updated_at", { ascending: false })
    .limit(100);

  const documents = Array.isArray(docs) ? docs : [];

  return (
    <LayoutShell workspace={ws} documents={documents}>
      {children}
    </LayoutShell>
  );
}
