import { createServiceClient } from "@/lib/supabase/service";
import { notFound } from "next/navigation";
import { Editor as TiptapEditor } from "@/components/tiptap/editor/editor";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/ui/frame";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/utils";
/**
 * Public document page
 *
 * Route: /[workspace]/[slug]
 *
 * Server-rendered page that:
 *  - Resolves the workspace by slug
 *  - Loads a published document (published = true) for that workspace and slug
 *  - Renders the document title and the Tiptap editor in read-only mode
 *
 * Notes:
 *  - Uses the service-role Supabase client so it can read private metadata if needed.
 *  - Returns `notFound()` for any missing workspace or document (or non-published).
 */

type Props = {
  params: {
    workspace: string;
    slug: string;
  };
};

export default async function Page({ params }: Props) {
  const { workspace, slug } = (await params) as unknown as {
    workspace: string;
    slug: string;
  };

  // Create privileged server client
  const svc = createServiceClient();

  // 1) fetch workspace by slug
  const { data: ws, error: wsErr } = await svc
    .from("workspaces")
    .select("id,name,slug")
    .eq("slug", workspace)
    .maybeSingle();

  if (wsErr || !ws) {
    return notFound();
  }

  // 2) fetch published document by slug + workspace_id
  const { data: doc, error: docErr } = await svc
    .from("documents")
    .select(
      "id,title,slug,content,type,version,created_at,updated_at,published,workspace_id",
    )
    .eq("slug", slug)
    .eq("workspace_id", ws.id)
    .eq("published", true)
    .maybeSingle();

  if (docErr || !doc) {
    return notFound();
  }

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
        <FrameHeader className="flex flex-row items-center justify-between">
          <FrameTitle className="text-md font-mono">{doc.title}</FrameTitle>
          <FrameDescription>
            <Badge variant={"secondary"} className="font-mono mt-1">
              Last update: {timeAgo(doc.updated_at)}
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
