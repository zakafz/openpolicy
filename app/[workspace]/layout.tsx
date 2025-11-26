import { notFound } from "next/navigation";
import { fetchPublishedDocumentsForWorkspace } from "@/lib/documents";
import { createServiceClient } from "@/lib/supabase/service";
import type { Metadata } from "next";
import LayoutShell from "./layout-shell";

export async function generateMetadata({ params }: any): Promise<Metadata> {
  const { workspace } = (await params) as { workspace?: string | undefined };

  const svc = createServiceClient();
  const { data: ws } = await svc
    .from("workspaces")
    .select("name,slug")
    .eq("slug", workspace)
    .maybeSingle();

  if (!ws) {
    return {
      title: "Workspace Not Found",
    };
  }

  const workspaceName = ws.name || ws.slug || "Document Repository";
  const title = `${workspaceName} | Document repository`;
  const description = `Browse and access policy documents from ${workspaceName}. View privacy policies, terms of service, and other important documents.`;

  return {
    title: {
      absolute: title,
    },
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

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
