"use client";

import { SidebarProvider } from "@/components/ui/sidebar";
import { Editor } from "./editor";

type EditorShowcaseProps = {
    initialContent?: any;
    initialIsJson?: boolean;
};

export function EditorShowcase({
    initialContent,
    initialIsJson = true
}: EditorShowcaseProps) {
    return (
        <SidebarProvider className="flex items-center justify-center">
            <Editor
                className="w-full h-fit! min-h-none! max-h-none!"
                documentSlug={null}
                initialContent={initialContent}
                initialIsJson={initialIsJson}
                hideActions={true}
            />
        </SidebarProvider>
    );
}
