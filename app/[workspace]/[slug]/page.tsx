import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/ui/frame";
import { fetchDocumentBySlug } from "@/lib/documents";
import { createServiceClient } from "@/lib/supabase/service";
import { fmtAbsolute } from "@/lib/utils";

type Props = {
  params: {
    workspace: string;
    slug: string;
  };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspace, slug } = (await params) as unknown as {
    workspace: string;
    slug: string;
  };

  const svc = createServiceClient();

  const { data: ws } = await svc
    .from("workspaces")
    .select("id,name,slug")
    .eq("slug", workspace)
    .maybeSingle();

  if (!ws) {
    return {
      title: "Document Not Found",
    };
  }

  let doc = null;
  try {
    doc = await fetchDocumentBySlug(slug, ws.id, svc);
  } catch {
    return {
      title: "Document Not Found",
    };
  }

  if (!doc || doc.status !== "published" || !doc.published) {
    return {
      title: "Document Not Found",
    };
  }

  const workspaceName = ws.name || ws.slug || "Document Repository";
  const documentName = doc.title || doc.slug || "Document";
  const title = `${documentName} | ${workspaceName}`;
  const description = `View ${documentName} from ${workspaceName}. Last updated: ${doc.updated_at ? new Date(doc.updated_at).toLocaleDateString() : "recently"}.`;

  return {
    title: {
      absolute: title,
    },
    description,
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: doc.published_at || doc.created_at,
      modifiedTime: doc.updated_at,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function Page({ params }: Props) {
  // Next 16: `params` may be a Promise, unwrap it before accessing properties.
  const { workspace, slug } = (await params) as unknown as {
    workspace: string;
    slug: string;
  };

  const svc = createServiceClient();

  const { data: ws, error: wsErr } = await svc
    .from("workspaces")
    .select("id,name,slug")
    .eq("slug", workspace)
    .maybeSingle();

  if (wsErr || !ws) return notFound();

  let doc = null;
  try {
    doc = await fetchDocumentBySlug(slug, ws.id, svc);
  } catch {
    return notFound();
  }

  if (!doc || doc.status !== "published" || !doc.published) return notFound();

  // let parsedInitialContent: any = null;
  // if (doc.content) {
  //   if (typeof doc.content === "string") {
  //     try {
  //       parsedInitialContent = JSON.parse(doc.content);
  //     } catch {
  //       parsedInitialContent = doc.content;
  //     }
  //   } else {
  //     parsedInitialContent = doc.content;
  //   }
  // }

  return (
    <Frame className="w-full border">
      <FrameHeader className="flex flex-row justify-between max-md:flex-col md:items-center">
        <FrameTitle className="font-mono text-md">{doc.title}</FrameTitle>
        <FrameDescription>
          <Badge variant={"secondary"} className="mt-1 font-mono">
            Last update: <span>{fmtAbsolute(doc.updated_at)}</span>
          </Badge>
        </FrameDescription>
      </FrameHeader>
      <FramePanel className="py-10! md:py-20!">
        {/* <TiptapEditor
          docId={doc.id}
          initialContent={parsedInitialContent}
          initialIsJson={typeof parsedInitialContent !== "string"}
          docTitle={doc.title}
          documentSlug={doc.slug}
          readOnly={true}
        /> */}
      </FramePanel>
    </Frame>
  );
}
