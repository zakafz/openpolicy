"use client";

import { Highlight } from "@tiptap/extension-highlight";
import { Image } from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
import { Selection } from "@tiptap/extensions";
import { EditorContent, EditorContext, useEditor } from "@tiptap/react";
// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit";
import { useEffect, useRef, useState } from "react";
// --- Tiptap Node ---
import { HorizontalRule } from "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension";
// --- UI Primitives ---
import { Button } from "@/components/tiptap-ui-primitive/button";
import { Spacer } from "@/components/tiptap-ui-primitive/spacer";
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "@/components/tiptap-ui-primitive/toolbar";
import "@/components/tiptap-node/blockquote-node/blockquote-node.scss";
import "@/components/tiptap-node/code-block-node/code-block-node.scss";
import "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss";
import "@/components/tiptap-node/list-node/list-node.scss";
import "@/components/tiptap-node/image-node/image-node.scss";
import "@/components/tiptap-node/heading-node/heading-node.scss";
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss";

// --- Icons ---
import { ArrowLeftIcon } from "@/components/tiptap-icons/arrow-left-icon";
import { HighlighterIcon } from "@/components/tiptap-icons/highlighter-icon";
import { LinkIcon } from "@/components/tiptap-icons/link-icon";
import { BlockquoteButton } from "@/components/tiptap-ui/blockquote-button";
import { CodeBlockButton } from "@/components/tiptap-ui/code-block-button";
import {
  ColorHighlightPopover,
  ColorHighlightPopoverButton,
  ColorHighlightPopoverContent,
} from "@/components/tiptap-ui/color-highlight-popover";
// --- Tiptap UI ---
import { HeadingDropdownMenu } from "@/components/tiptap-ui/heading-dropdown-menu";
import {
  LinkButton,
  LinkContent,
  LinkPopover,
} from "@/components/tiptap-ui/link-popover";
import { ListDropdownMenu } from "@/components/tiptap-ui/list-dropdown-menu";
import { MarkButton } from "@/components/tiptap-ui/mark-button";
import { TextAlignButton } from "@/components/tiptap-ui/text-align-button";
import { UndoRedoButton } from "@/components/tiptap-ui/undo-redo-button";
import { useCursorVisibility } from "@/hooks/use-cursor-visibility";
// --- Hooks ---
import { useIsBreakpoint } from "@/hooks/use-is-breakpoint";
import { useWindowSize } from "@/hooks/use-window-size";

// --- Styles ---
import "@/components/tiptap/editor/editor.scss";

import { CircleCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { Frame, FrameHeader, FramePanel } from "@/components/ui/frame";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Editor component
 *
 * Changes made:
 * - Accept `docId`, `initialContent`, and `initialIsJson` props so the page
 *   can pass DB content into the editor.
 * - Add a debounced autosave that sends the editor JSON to PUT /api/documents/:id
 *   when `docId` is provided.
 * - Disable image-upload UI and the image-upload node/handler. The `Image`
 *   extension remains so existing images render if present in content.
 *
 * Notes:
 * - This component doesn't implement server-side auth/permission checks; the
 *   server endpoint should validate the request.
 * - Save strategy: editor.getJSON() is used. If you'd prefer HTML, replace
 *   usage of getJSON() with getHTML() and update server handling accordingly.
 */

type Props = {
  docId?: string | null;
  // initialContent can be either Tiptap JSON (recommended) or an HTML string
  initialContent?: any;
  // true => initialContent is Tiptap JSON; false => initialContent is HTML string
  initialIsJson?: boolean;
  // optional document title to populate the heading when no content exists
  docTitle?: string | null;
  // document slug to populate the URL when no content exists
  documentSlug: string | null;
  // when true the editor will be rendered read-only and toolbar hidden
  readOnly?: boolean;
  // when true, hide save and back buttons (for showcase mode)
  hideActions?: boolean;

  className?: string;
};

const MainToolbarContent = ({
  onHighlighterClick,
  onLinkClick,
  isMobile,
  onSave,
  isSaved,
  documentSlug,
  hideActions,
}: {
  onHighlighterClick: () => void;
  onLinkClick: () => void;
  isMobile: boolean;
  onSave?: () => void;
  isSaved?: boolean;
  documentSlug: string | null;
  hideActions?: boolean;
}) => {
  const router = useRouter();
  return (
    <>
      <ToolbarGroup>
        <Spacer />
        {!hideActions && <SidebarTrigger className="size-8" />}

        {!hideActions && <ToolbarSeparator />}

        <ToolbarGroup>
          <UndoRedoButton action="undo" />
          <UndoRedoButton action="redo" />
        </ToolbarGroup>

        <ToolbarSeparator />

        <ToolbarGroup>
          <HeadingDropdownMenu levels={[1, 2, 3, 4]} portal={isMobile} />
          <ListDropdownMenu
            types={["bulletList", "orderedList", "taskList"]}
            portal={isMobile}
          />
          <BlockquoteButton />
          <CodeBlockButton />
        </ToolbarGroup>

        <ToolbarSeparator />

        <ToolbarGroup>
          <MarkButton type="bold" />
          <MarkButton type="italic" />
          <MarkButton type="strike" />
          <MarkButton type="code" />
          <MarkButton type="underline" />
          {!isMobile ? (
            <ColorHighlightPopover />
          ) : (
            <ColorHighlightPopoverButton onClick={onHighlighterClick} />
          )}
          {!isMobile ? <LinkPopover /> : <LinkButton onClick={onLinkClick} />}
        </ToolbarGroup>

        <ToolbarSeparator />

        <ToolbarGroup>
          <MarkButton type="superscript" />
          <MarkButton type="subscript" />
        </ToolbarGroup>

        <ToolbarSeparator />

        <ToolbarGroup>
          <TextAlignButton align="left" />
          <TextAlignButton align="center" />
          <TextAlignButton align="right" />
          <TextAlignButton align="justify" />
        </ToolbarGroup>

        {/* Image upload intentionally removed / disabled for now */}

        <Spacer />
      </ToolbarGroup>

      {isMobile && <ToolbarSeparator />}

      {!hideActions && (
        <ToolbarGroup>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label="Edit"
                disabled={!isSaved}
                onClick={() => router.push(`/dashboard/d/${documentSlug}`)}
              >
                Back
              </Button>
            </TooltipTrigger>
            {!isSaved ? (
              <TooltipContent>
                <p className="text-xs">Save the document to enable editing</p>
              </TooltipContent>
            ) : null}
          </Tooltip>
          <Spacer />
          {/* Top-right save button: uses parent-provided handler & state */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onSave}
                className={isSaved ? "bg-green-500/10!" : "bg-gray-200!"}
              >
                {isSaved ? (
                  <CircleCheck
                    className={`size-4 ${isSaved ? "text-green-500" : "text-gray-600"}`}
                  />
                ) : (
                  <Spinner className="size-4 text-gray-600" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Save document</p>
            </TooltipContent>
          </Tooltip>
        </ToolbarGroup>
      )}
    </>
  );
};

const MobileToolbarContent = ({
  type,
  onBack,
}: {
  type: "highlighter" | "link";
  onBack: () => void;
}) => (
  <>
    <ToolbarGroup>
      <Button data-style="ghost" onClick={onBack}>
        <ArrowLeftIcon className="tiptap-button-icon" />
        {type === "highlighter" ? (
          <HighlighterIcon className="tiptap-button-icon" />
        ) : (
          <LinkIcon className="tiptap-button-icon" />
        )}
      </Button>
    </ToolbarGroup>

    <ToolbarSeparator />

    {type === "highlighter" ? (
      <ColorHighlightPopoverContent />
    ) : (
      <LinkContent />
    )}
  </>
);

export function Editor({
  docId = null,
  initialContent = null,
  initialIsJson = true,
  docTitle = undefined,
  documentSlug = null,
  readOnly = false,
  hideActions = false,
  className = "",
}: Props) {
  const isMobile = useIsBreakpoint();
  const { height } = useWindowSize();
  const [mobileView, setMobileView] = useState<"main" | "highlighter" | "link">(
    "main",
  );
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const saveTimeout = useRef<number | null>(null);

  // Build the editor with the same extensions as before, but without the
  // ImageUploadNode and without any upload handler wiring.
  const editor = useEditor({
    immediatelyRender: false,
    // set editable based on readOnly prop
    editable: !readOnly,
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        "aria-label": "Main content area, start typing to enter text.",
        class: "simple-editor",
      },
    },
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
        link: {
          openOnClick: false,
          enableClickSelection: true,
        },
      }),
      HorizontalRule,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Image, // keep image extension so existing images render
      Typography,
      Superscript,
      Subscript,
      Selection,
      // Image upload node removed intentionally
    ],
    // We'll set initial content below via effect to handle both JSON and HTML cases.
    content: undefined,
  });

  const DEFAULT_DOC = {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { textAlign: null, level: 1 },
        content: [
          {
            type: "text",
            text:
              docTitle && String(docTitle).trim().length
                ? String(docTitle)
                : "Document name",
          },
        ],
      },
      { type: "paragraph", attrs: { textAlign: null } },
    ],
  };

  // Set/replace content when initialContent changes or when editor is first ready.
  useEffect(() => {
    if (!editor) return;

    // Determine the content to set: prefer provided initialContent, otherwise use the default doc
    const useDefault = initialContent == null;
    const contentToSet = useDefault ? DEFAULT_DOC : initialContent;
    const treatAsJson = useDefault ? true : initialIsJson;

    try {
      if (treatAsJson) {
        // If the content is a JSON Tiptap document
        editor.commands.setContent(contentToSet);
      } else {
        // Treat as an HTML/string content
        editor.commands.setContent(contentToSet);
      }
    } catch (e) {
      // Best-effort fallback: attempt setContent again and swallow errors
      try {
        editor.commands.setContent(contentToSet);
      } catch {
        // swallow
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, initialContent, initialIsJson]);

  // Save helper: sends editor JSON to the server for the provided docId.
  async function performSave(payload: any) {
    if (!docId) return;
    setIsSaving(true);
    try {
      // The server expects `content` to be a string; stringify the Tiptap JSON so
      // it can be stored in the `documents.content` text column and parsed later.
      const res = await fetch(`/api/documents`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: docId, content: JSON.stringify(payload) }),
      });

      // Try to parse the response body as JSON (server returns updated document)
      let body: any = null;
      try {
        body = await res.json().catch(() => null);
      } catch {
        body = null;
      }

      if (!res.ok) {
        // Surface server-side error to console for now.
        console.error(
          "Failed to save document content (server):",
          res.status,
          body,
        );
      } else {
        // If server returned the updated document, prefer its updated_at to set lastSavedAt.
        const updatedDoc = body?.document ?? body;
        if (updatedDoc && updatedDoc.updated_at) {
          const parsed = Date.parse(String(updatedDoc.updated_at));
          if (!Number.isNaN(parsed)) {
            setLastSavedAt(parsed);
          } else {
            setLastSavedAt(Date.now());
          }
        } else {
          // Fallback: set last saved to now
          setLastSavedAt(Date.now());
        }

        // Mark document as clean after successful save
        setIsDirty(false);

        // Dispatch a custom event so other parts of the app (sidebar, recent lists, etc.)
        // can react to the fact that the document was saved and potentially refresh.
        try {
          window.dispatchEvent(
            new CustomEvent("document-saved", {
              detail: {
                id: docId,
                updated_at: updatedDoc?.updated_at ?? new Date().toISOString(),
              },
            }),
          );
        } catch (e) {
          // ignore event dispatch errors
        }
      }
    } catch (err) {
      // For now, log the error. Server-side should return meaningful responses.
      console.error("Failed to save document content (network):", err);
    } finally {
      setIsSaving(false);
    }
  }

  // Debounced autosave on editor updates. Uses editor.getJSON().
  useEffect(() => {
    if (!editor) return;

    const onUpdate = () => {
      if (!docId) return; // only autosave if we have a document id to update

      // Mark as dirty when editor changes
      setIsDirty(true);

      if (saveTimeout.current) {
        window.clearTimeout(saveTimeout.current);
      }

      // Schedule a save 1s after the last update
      saveTimeout.current = window.setTimeout(async () => {
        try {
          const payload = editor.getJSON();
          await performSave(payload);
        } catch (e) {
          console.error("Autosave failed:", e);
        } finally {
          saveTimeout.current = null;
        }
      }, 1000) as unknown as number;
    };

    editor.on("update", onUpdate);

    return () => {
      editor.off("update", onUpdate);
      if (saveTimeout.current) {
        window.clearTimeout(saveTimeout.current);
        saveTimeout.current = null;
      }
    };
  }, [editor, docId]);

  // Expose an explicit save button action for manual save as well
  const handleManualSave = async () => {
    if (!editor) return;
    try {
      const payload = editor.getJSON();
      await performSave(payload);
    } catch (e) {
      console.error("Manual save failed:", e);
    }
  };

  const rect = useCursorVisibility({
    editor,
    overlayHeight: toolbarRef.current?.getBoundingClientRect().height ?? 0,
  });

  useEffect(() => {
    if (!isMobile && mobileView !== "main") {
      setMobileView("main");
    }
  }, [isMobile, mobileView]);

  return (
    <EditorContext.Provider value={{ editor }}>
      {readOnly ? (
        <EditorContent
          editor={editor}
          role="presentation"
          className="simple-editor-content"
        />
      ) : (
        <Frame className={cn("max-h-[calc(100vh-24px)] h-[calc(100vh-24px)] mt-3 flex", className)}>
          <FrameHeader className="flex flex-row justify-between py-1!">
            {!readOnly && (
              <Toolbar
                className="bg-transparent! border-b-0! p-0! flex justify-between!"
                ref={toolbarRef}
                style={{
                  ...(isMobile
                    ? {
                      bottom: `calc(100% - ${height - rect.y}px)`,
                    }
                    : {}),
                }}
              >
                {mobileView === "main" ? (
                  <MainToolbarContent
                    onHighlighterClick={() => setMobileView("highlighter")}
                    onLinkClick={() => setMobileView("link")}
                    isMobile={isMobile}
                    onSave={handleManualSave}
                    isSaved={!isDirty && !isSaving}
                    documentSlug={documentSlug}
                    hideActions={hideActions}
                  />
                ) : (
                  <MobileToolbarContent
                    type={mobileView === "highlighter" ? "highlighter" : "link"}
                    onBack={() => setMobileView("main")}
                  />
                )}
              </Toolbar>
            )}
          </FrameHeader>
          <FramePanel className="flex-1 p-0 overflow-scroll">
            <EditorContent
              editor={editor}
              role="presentation"
              className={cn("py-20!", hideActions ? "simple-editor-content" : "simple-editor-content-edit ")}
            />
          </FramePanel>
        </Frame>
      )}
    </EditorContext.Provider>
  );
}
