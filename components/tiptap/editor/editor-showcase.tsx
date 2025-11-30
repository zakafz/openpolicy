"use client";

import { SidebarProvider } from "@/components/ui/sidebar";
import { Editor } from "./editor";

type EditorShowcaseProps = {
  initialContent?: any;
  initialIsJson?: boolean;
};

export function EditorShowcase({
  initialContent,
  initialIsJson = true,
}: EditorShowcaseProps) {
  return (
    <SidebarProvider className="flex items-center justify-center max-md:hidden">
      <Editor
        className="h-fit! max-h-none! min-h-none! w-full"
        documentSlug={null}
        initialContent={initialContent}
        initialIsJson={initialIsJson}
        hideActions={true}
      />
    </SidebarProvider>
  );
}
