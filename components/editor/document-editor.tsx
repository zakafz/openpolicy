"use client";

import { normalizeNodeId } from "platejs";
import { Plate, usePlateEditor } from "platejs/react";
import { forwardRef, useEffect, useImperativeHandle, useMemo } from "react";
import { EditorProvider } from "@/components/editor/editor-context";
import { EditorKit } from "@/components/editor/editor-kit";
import { Editor, EditorContainer } from "@/components/ui/editor";
import { convertTiptapToSlate } from "@/lib/tiptap-to-slate-converter";

interface DocumentEditorProps {
  docId?: string;
  docTitle?: string;
  initialContent?: any;
  initialIsJson?: boolean;
  documentSlug?: string | null;
  readOnly?: boolean;
  onContentChange?: (content: any) => void;
  doc?: any;
  isEditMode?: boolean;
  isSaving?: boolean;
  onEditModeToggle?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  onRename?: () => void;
  workspace?: any;
}

export interface DocumentEditorRef {
  getContent: () => any;
  save: () => Promise<void>;
}

export const DocumentEditor = forwardRef<
  DocumentEditorRef,
  DocumentEditorProps
>(
  (
    {
      docId,
      docTitle,
      initialContent,
      initialIsJson = true,
      documentSlug,
      readOnly = false,
      onContentChange,
      doc,
      isEditMode,
      isSaving,
      onEditModeToggle,
      onSave,
      onCancel,
      onRename,
      workspace,
    },
    ref,
  ) => {
    const parsedInitialValue = useMemo(() => {
      if (!initialContent) {
        return normalizeNodeId([
          {
            children: [{ text: "" }],
            type: "p",
          },
        ]);
      }

      const converted = convertTiptapToSlate(initialContent);
      return normalizeNodeId(converted);
    }, [initialContent]);

    const editor = usePlateEditor({
      plugins: EditorKit,
      value: parsedInitialValue,
      readOnly,
    });

    useImperativeHandle(ref, () => ({
      getContent: () => editor.children,
      save: async () => {
        return Promise.resolve();
      },
    }));

    useEffect(() => {
      if (!readOnly && onContentChange) {
        onContentChange(editor.children);
      }
    }, [editor.children, onContentChange, readOnly]);

    return (
      <EditorProvider
        value={{
          doc,
          isEditMode,
          isSaving,
          onEditModeToggle,
          onSave,
          onCancel,
          onRename,
          workspace,
        }}
      >
        <Plate editor={editor} readOnly={readOnly}>
          <EditorContainer variant="default">
            <Editor variant="default" readOnly={readOnly} />
          </EditorContainer>
        </Plate>
      </EditorProvider>
    );
  },
);

DocumentEditor.displayName = "DocumentEditor";
