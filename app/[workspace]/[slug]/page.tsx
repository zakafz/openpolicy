import { notFound } from "next/navigation";
import { Editor as TiptapEditor } from "@/components/tiptap/editor/editor";
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
import { fmtAbsolute, timeAgo } from "@/lib/utils";

type Props = {
  params: {
    workspace: string;
    slug: string;
  };
};

export default async function Page({ params }: Props) {
  // Next 16: `params` may be a Promise — unwrap it before accessing properties.
  const { workspace, slug } = (await params) as unknown as {
    workspace: string;
    slug: string;
  };

  // Create privileged server client
  const svc = createServiceClient();

  const { data: ws, error: wsErr } = await svc
    .from("workspaces")
    .select("id,name,slug")
    .eq("slug", workspace)
    .maybeSingle();

  if (wsErr || !ws) return notFound();

  // Fetch document by slug + workspace_id using centralized helper
  let doc = null;
  try {
    doc = await fetchDocumentBySlug(slug, ws.id, svc);
  } catch {
    return notFound();
  }

  // Ensure the public page only serves published documents.
  // Return 404 for unpublished or archived documents.
  if (!doc || doc.status !== "published" || !doc.published) return notFound();

  // 3) Parse stored content. Stored content is usually a stringified Tiptap JSON.
  let parsedInitialContent: any = null;
  if (doc.content) {
    if (typeof doc.content === "string") {
      try {
        parsedInitialContent = JSON.parse(doc.content);
      } catch {
        parsedInitialContent = doc.content;
      }
    } else {
      parsedInitialContent = doc.content;
    }
  }

  return (
    <>
      <Frame className="w-full">
        <FrameHeader className="flex flex-row max-md:flex-col md:items-center justify-between">
          <FrameTitle className="text-md font-mono">{doc.title}</FrameTitle>
          <FrameDescription>
            <Badge variant={"secondary"} className="font-mono mt-1">
              Last update: <span>{fmtAbsolute(doc.updated_at)}</span>
            </Badge>
          </FrameDescription>
        </FrameHeader>
        <FramePanel className="py-20!">
          <TiptapEditor
            docId={doc.id}
            initialContent={parsedInitialContent}
            initialIsJson={typeof parsedInitialContent !== "string"}
            docTitle={doc.title}
            documentSlug={doc.slug}
            readOnly={true}
          />
        </FramePanel>
      </Frame>
    </>
  );
}
