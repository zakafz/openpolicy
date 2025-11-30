import type { Node as TiptapNode } from "@tiptap/pm/model";
import type { Transaction } from "@tiptap/pm/state";
import {
  AllSelection,
  NodeSelection,
  Selection,
  TextSelection,
} from "@tiptap/pm/state";
import type { Editor, NodeWithPos } from "@tiptap/react";

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const MAC_SYMBOLS: Record<string, string> = {
  mod: "⌘",
  command: "⌘",
  meta: "⌘",
  ctrl: "⌃",
  control: "⌃",
  alt: "⌥",
  option: "⌥",
  shift: "⇧",
  backspace: "Del",
  delete: "⌦",
  enter: "⏎",
  escape: "⎋",
  capslock: "⇪",
} as const;

export const SR_ONLY = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  borderWidth: 0,
} as const;

export function cn(
  ...classes: (string | boolean | undefined | null)[]
): string {
  return classes.filter(Boolean).join(" ");
}

/** Check if platform is macOS. */
export function isMac(): boolean {
  return (
    typeof navigator !== "undefined" &&
    navigator.platform.toLowerCase().includes("mac")
  );
}

/** Format shortcut key based on platform. */
export const formatShortcutKey = (
  key: string,
  isMac: boolean,
  capitalize: boolean = true,
) => {
  if (isMac) {
    const lowerKey = key.toLowerCase();
    return MAC_SYMBOLS[lowerKey] || (capitalize ? key.toUpperCase() : key);
  }

  return capitalize ? key.charAt(0).toUpperCase() + key.slice(1) : key;
};

/** Parse shortcut key string into formatted symbols. */
export const parseShortcutKeys = (props: {
  shortcutKeys: string | undefined;
  delimiter?: string;
  capitalize?: boolean;
}) => {
  const { shortcutKeys, delimiter = "+", capitalize = true } = props;

  if (!shortcutKeys) return [];

  return shortcutKeys
    .split(delimiter)
    .map((key) => key.trim())
    .map((key) => formatShortcutKey(key, isMac(), capitalize));
};

/** Check if mark exists in editor schema. */
export const isMarkInSchema = (
  markName: string,
  editor: Editor | null,
): boolean => {
  if (!editor?.schema) return false;
  return editor.schema.spec.marks.get(markName) !== undefined;
};

/** Check if node exists in editor schema. */
export const isNodeInSchema = (
  nodeName: string,
  editor: Editor | null,
): boolean => {
  if (!editor?.schema) return false;
  return editor.schema.spec.nodes.get(nodeName) !== undefined;
};

/** Move focus to next node in editor. */
export function focusNextNode(editor: Editor) {
  const { state, view } = editor;
  const { doc, selection } = state;

  const nextSel = Selection.findFrom(selection.$to, 1, true);
  if (nextSel) {
    view.dispatch(state.tr.setSelection(nextSel).scrollIntoView());
    return true;
  }

  const paragraphType = state.schema.nodes.paragraph;
  if (!paragraphType) {
    console.warn("No paragraph node type found in schema.");
    return false;
  }

  const end = doc.content.size;
  const para = paragraphType.create();
  let tr = state.tr.insert(end, para);

  // Insert new paragraph at end
  const $inside = tr.doc.resolve(end + 1);
  tr = tr.setSelection(TextSelection.near($inside)).scrollIntoView();
  view.dispatch(tr);
  return true;
}

/** Check if value is a valid position number. */
export function isValidPosition(pos: number | null | undefined): pos is number {
  return typeof pos === "number" && pos >= 0;
}

/** Check if extensions are registered in editor. */
export function isExtensionAvailable(
  editor: Editor | null,
  extensionNames: string | string[],
): boolean {
  if (!editor) return false;

  const names = Array.isArray(extensionNames)
    ? extensionNames
    : [extensionNames];

  const found = names.some((name) =>
    editor.extensionManager.extensions.some((ext) => ext.name === name),
  );

  if (!found) {
    console.warn(
      `None of the extensions [${names.join(", ")}] were found in the editor schema. Ensure they are included in the editor configuration.`,
    );
  }

  return found;
}

/** Find node at position with error handling. */
export function findNodeAtPosition(editor: Editor, position: number) {
  try {
    const node = editor.state.doc.nodeAt(position);
    if (!node) {
      console.warn(`No node found at position ${position}`);
      return null;
    }
    return node;
  } catch (error) {
    console.error(`Error getting node at position ${position}:`, error);
    return null;
  }
}

/** Find position and instance of node in document. */
export function findNodePosition(props: {
  editor: Editor | null;
  node?: TiptapNode | null;
  nodePos?: number | null;
}): { pos: number; node: TiptapNode } | null {
  const { editor, node, nodePos } = props;

  if (!editor || !editor.state?.doc) return null;

  // Zero is valid position
  const hasValidNode = node !== undefined && node !== null;
  const hasValidPos = isValidPosition(nodePos);

  if (!hasValidNode && !hasValidPos) {
    return null;
  }

  // Search for node in document
  if (hasValidNode) {
    let foundPos = -1;
    let foundNode: TiptapNode | null = null;

    editor.state.doc.descendants((currentNode, pos) => {
      if (currentNode === node) {
        foundPos = pos;
        foundNode = currentNode;
        return false;
      }
      return true;
    });

    if (foundPos !== -1 && foundNode !== null) {
      return { pos: foundPos, node: foundNode };
    }
  }

  // Use position if available
  if (hasValidPos) {
    const nodeAtPos = findNodeAtPosition(editor, nodePos!);
    if (nodeAtPos) {
      return { pos: nodePos!, node: nodeAtPos };
    }
  }

  return null;
}

/** Check if selection contains specified node types. */
export function isNodeTypeSelected(
  editor: Editor | null,
  nodeTypeNames: string[] = [],
  checkAncestorNodes: boolean = false,
): boolean {
  if (!editor || !editor.state.selection) return false;

  const { selection } = editor.state;
  if (selection.empty) return false;

  // Check direct node selection
  if (selection instanceof NodeSelection) {
    const selectedNode = selection.node;
    return selectedNode
      ? nodeTypeNames.includes(selectedNode.type.name)
      : false;
  }

  // Check ancestor nodes if requested
  if (checkAncestorNodes) {
    const { $from } = selection;
    for (let depth = $from.depth; depth > 0; depth--) {
      const ancestorNode = $from.node(depth);
      if (nodeTypeNames.includes(ancestorNode.type.name)) {
        return true;
      }
    }
  }

  return false;
}

/** Check if selection is within convertible node types. */
export function selectionWithinConvertibleTypes(
  editor: Editor,
  types: string[] = [],
): boolean {
  if (!editor || types.length === 0) return false;

  const { state } = editor;
  const { selection } = state;
  const allowed = new Set(types);

  if (selection instanceof NodeSelection) {
    const nodeType = selection.node?.type?.name;
    return !!nodeType && allowed.has(nodeType);
  }

  if (selection instanceof TextSelection || selection instanceof AllSelection) {
    let valid = true;
    state.doc.nodesBetween(selection.from, selection.to, (node) => {
      if (node.isTextblock && !allowed.has(node.type.name)) {
        valid = false;
        return false;
      }
      return valid;
    });
    return valid;
  }

  return false;
}

/** Handle image upload with progress tracking. */
export const handleImageUpload = async (
  file: File,
  onProgress?: (event: { progress: number }) => void,
  abortSignal?: AbortSignal,
): Promise<string> => {
  if (!file) {
    throw new Error("No file provided");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File size exceeds maximum allowed (${MAX_FILE_SIZE / (1024 * 1024)}MB)`,
    );
  }

  // Simulate upload progress (replace with real implementation)
  for (let progress = 0; progress <= 100; progress += 10) {
    if (abortSignal?.aborted) {
      throw new Error("Upload cancelled");
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
    onProgress?.({ progress });
  }

  return "/images/tiptap-ui-placeholder-image.jpg";
};

type ProtocolOptions = {
  /**
   * The protocol scheme to be registered.
   * @default '''
   * @example 'ftp'
   * @example 'git'
   */
  scheme: string;

  /**
   * If enabled, it allows optional slashes after the protocol.
   * @default false
   * @example true
   */
  optionalSlashes?: boolean;
};

type ProtocolConfig = Array<ProtocolOptions | string>;

const ATTR_WHITESPACE =
  // eslint-disable-next-line no-control-regex
  /[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g;

export function isAllowedUri(
  uri: string | undefined,
  protocols?: ProtocolConfig,
) {
  const allowedProtocols: string[] = [
    "http",
    "https",
    "ftp",
    "ftps",
    "mailto",
    "tel",
    "callto",
    "sms",
    "cid",
    "xmpp",
  ];

  if (protocols) {
    protocols.forEach((protocol) => {
      const nextProtocol =
        typeof protocol === "string" ? protocol : protocol.scheme;

      if (nextProtocol) {
        allowedProtocols.push(nextProtocol);
      }
    });
  }

  return (
    !uri ||
    uri.replace(ATTR_WHITESPACE, "").match(
      new RegExp(
        // eslint-disable-next-line no-useless-escape
        `^(?:(?:${allowedProtocols.join("|")}):|[^a-z]|[a-z0-9+.-]+(?:[^a-z+.-:]|$))`,
        "i",
      ),
    )
  );
}

export function sanitizeUrl(
  inputUrl: string,
  baseUrl: string,
  protocols?: ProtocolConfig,
): string {
  try {
    const url = new URL(inputUrl, baseUrl);

    if (isAllowedUri(url.href, protocols)) {
      return url.href;
    }
  } catch {
    // If URL creation fails, it's considered invalid
  }
  return "#";
}

/** Update attribute on multiple nodes. */
export function updateNodesAttr<A extends string = string, V = unknown>(
  tr: Transaction,
  targets: readonly NodeWithPos[],
  attrName: A,
  next: V | ((prev: V | undefined) => V | undefined),
): boolean {
  if (!targets.length) return false;

  let changed = false;

  for (const { pos } of targets) {
    // Re-read from transaction's current doc
    const currentNode = tr.doc.nodeAt(pos);
    if (!currentNode) continue;

    const prevValue = (currentNode.attrs as Record<string, unknown>)[
      attrName
    ] as V | undefined;
    const resolvedNext =
      typeof next === "function"
        ? (next as (p: V | undefined) => V | undefined)(prevValue)
        : next;

    if (prevValue === resolvedNext) continue;

    const nextAttrs: Record<string, unknown> = { ...currentNode.attrs };
    if (resolvedNext === undefined) {
      // Remove attribute
      delete nextAttrs[attrName];
    } else {
      nextAttrs[attrName] = resolvedNext;
    }

    tr.setNodeMarkup(pos, undefined, nextAttrs);
    changed = true;
  }

  return changed;
}

/** Select entire content of current block node. */
export function selectCurrentBlockContent(editor: Editor) {
  const { selection, doc } = editor.state;

  if (!selection.empty) return;

  const $pos = selection.$from;
  let blockNode = null;
  let blockPos = -1;

  for (let depth = $pos.depth; depth >= 0; depth--) {
    const node = $pos.node(depth);
    const pos = $pos.start(depth);

    if (node.isBlock && node.textContent.trim()) {
      blockNode = node;
      blockPos = pos;
      break;
    }
  }

  if (blockNode && blockPos >= 0) {
    const from = blockPos;
    const to = blockPos + blockNode.nodeSize - 2; // -2 to exclude the closing tag

    if (from < to) {
      const $from = doc.resolve(from);
      const $to = doc.resolve(to);
      const newSelection = TextSelection.between($from, $to, 1);

      if (newSelection && !selection.eq(newSelection)) {
        editor.view.dispatch(editor.state.tr.setSelection(newSelection));
      }
    }
  }
}
