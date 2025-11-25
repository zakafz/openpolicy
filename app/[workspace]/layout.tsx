import { notFound } from "next/navigation";
import { fetchPublishedDocumentsForWorkspace } from "@/lib/documents";
import { createServiceClient } from "@/lib/supabase/service";
import LayoutShell from "./layout-shell";

export default async function Layout({ children, params }: any) {
  const { workspace } = (await params) as { workspace?: string | undefined };

  const svc = createServiceClient();

  const { data: ws, error: wsErr } = await svc
    .from("workspaces")
    .select("id,name,logo,support_email,return_url,disable_icon,slug,owner_id")
    .eq("slug", workspace)
    .maybeSingle();

  if (wsErr || !ws) {
    return notFound();
  }

  let documents = [];
  try {
    documents = await fetchPublishedDocumentsForWorkspace(ws.id, svc, 100);
  } catch (e) {
    documents = [];
  }

  return (
    <LayoutShell workspace={ws} documents={documents}>
      {children}
    </LayoutShell>
  );
}
