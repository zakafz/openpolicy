"use client";

import { normalizeNodeId } from "platejs";
import { Plate, usePlateEditor } from "platejs/react";
import { forwardRef, useImperativeHandle, useMemo } from "react";
import { EditorProvider } from "@/components/editor/editor-context";
import { createEditorKit } from "@/components/editor/editor-kit";
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
  disableAI?: boolean;
  disableToolbar?: boolean;
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
      docId: _docId,
      docTitle: _docTitle,
      initialContent,
      initialIsJson: _initialIsJson = true,
      documentSlug: _documentSlug,
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
      disableAI = false,
      disableToolbar = false,
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
      plugins: createEditorKit({ disableAI, disableToolbar }),
      value: parsedInitialValue,
      readOnly,
    });

    useImperativeHandle(ref, () => ({
      getContent: () => editor.children,
      save: async () => {
        return Promise.resolve();
      },
    }));

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
        <Plate
          editor={editor}
          readOnly={readOnly}
          onChange={({ value }) => {
            if (!readOnly && onContentChange) {
              onContentChange(value);
            }
          }}
        >
          <EditorContainer variant="default">
            <Editor
              variant="default"
              readOnly={readOnly}
              className={
                readOnly && disableToolbar ? "px-0 py-0 sm:px-0" : undefined
              }
            />
          </EditorContainer>
        </Plate>
      </EditorProvider>
    );
  },
);

DocumentEditor.displayName = "DocumentEditor";
