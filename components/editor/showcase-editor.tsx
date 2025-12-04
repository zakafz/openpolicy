"use client";

import { normalizeNodeId } from "platejs";
import { Plate, usePlateEditor } from "platejs/react";
import { useMemo } from "react";
import { ShowcaseEditorKit } from "@/components/editor/showcase-editor-kit";
import { Editor, EditorContainer } from "@/components/ui/editor";

interface ShowcaseEditorProps {
  initialContent?: any;
}

export const ShowcaseEditor = ({ initialContent }: ShowcaseEditorProps) => {
  const parsedInitialValue = useMemo(() => {
    if (!initialContent) {
      return normalizeNodeId([
        {
          children: [{ text: "" }],
          type: "p",
        },
      ]);
    }

    return normalizeNodeId(initialContent);
  }, [initialContent]);

  const editor = usePlateEditor({
    plugins: ShowcaseEditorKit,
    value: parsedInitialValue,
  });

  return (
    <Plate editor={editor}>
      <EditorContainer variant="default">
        <Editor variant="default" />
      </EditorContainer>
    </Plate>
  );
};

ShowcaseEditor.displayName = "ShowcaseEditor";
