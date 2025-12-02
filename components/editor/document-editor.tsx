'use client';

import * as React from 'react';
import { useCallback, useImperativeHandle } from 'react';

import { normalizeNodeId } from 'platejs';
import { Plate, usePlateEditor } from 'platejs/react';

import { EditorKit } from '@/components/editor/editor-kit';
import { Editor, EditorContainer } from '@/components/ui/editor';
import { convertTiptapToSlate } from '@/lib/tiptap-to-slate-converter';
import { EditorProvider } from '@/components/editor/editor-context';

interface DocumentEditorProps {
    docId?: string;
    docTitle?: string;
    initialContent?: any;
    initialIsJson?: boolean;
    documentSlug?: string | null;
    readOnly?: boolean;
    onContentChange?: (content: any) => void;
    // Toolbar control props
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

export const DocumentEditor = React.forwardRef<DocumentEditorRef, DocumentEditorProps>(
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
        ref
    ) => {
        // Parse initial content
        const parsedInitialValue = React.useMemo(() => {
            if (!initialContent) {
                return normalizeNodeId([
                    {
                        children: [{ text: '' }],
                        type: 'p',
                    },
                ]);
            }

            // Try to convert from Tiptap format if needed
            const converted = convertTiptapToSlate(initialContent);
            return normalizeNodeId(converted);
        }, [initialContent]);

        const editor = usePlateEditor({
            plugins: EditorKit,
            value: parsedInitialValue,
            readOnly,
        });

        // Expose methods to parent via ref
        useImperativeHandle(ref, () => ({
            getContent: () => editor.children,
            save: async () => {
                // This will be handled by the parent component
                return Promise.resolve();
            },
        }));

        // Notify parent of content changes
        React.useEffect(() => {
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
                <Plate editor={editor}>
                    <EditorContainer variant="default">
                        <Editor variant="default" readOnly={readOnly} />
                    </EditorContainer>
                </Plate>
            </EditorProvider>
        );
    }
);

DocumentEditor.displayName = 'DocumentEditor';
