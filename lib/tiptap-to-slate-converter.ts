/**
 * Converts Tiptap/ProseMirror JSON to Slate/Plate JSON format
 */

interface TiptapNode {
  type: string;
  attrs?: Record<string, any>;
  content?: TiptapNode[];
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, any> }>;
}

interface SlateNode {
  type?: string;
  children?: SlateNode[];
  text?: string;
  [key: string]: any;
}

/**
 * Convert Tiptap marks to Slate leaf properties
 */
function convertMarks(marks?: Array<{ type: string; attrs?: Record<string, any> }>): Record<string, any> {
  if (!marks || marks.length === 0) return {};

  const leafProps: Record<string, any> = {};

  for (const mark of marks) {
    switch (mark.type) {
      case 'bold':
        leafProps.bold = true;
        break;
      case 'italic':
        leafProps.italic = true;
        break;
      case 'underline':
        leafProps.underline = true;
        break;
      case 'strike':
        leafProps.strikethrough = true;
        break;
      case 'code':
        leafProps.code = true;
        break;
      case 'link':
        // Links in Slate are elements, not marks
        // We'll handle this in the parent
        break;
      case 'textStyle':
        if (mark.attrs?.color) {
          leafProps.color = mark.attrs.color;
        }
        break;
      case 'highlight':
        if (mark.attrs?.color) {
          leafProps.backgroundColor = mark.attrs.color;
        }
        break;
      default:
        // Unknown mark, skip
        break;
    }
  }

  return leafProps;
}

/**
 * Convert Tiptap node type to Slate node type
 */
function convertNodeType(tiptapType: string, attrs?: Record<string, any>): string {
  switch (tiptapType) {
    case 'doc':
      return 'root';
    case 'paragraph':
      return 'p';
    case 'heading':
      return `h${attrs?.level || 1}`;
    case 'bulletList':
    case 'orderedList':
      return 'list';
    case 'listItem':
      return 'li';
    case 'blockquote':
      return 'blockquote';
    case 'codeBlock':
      return 'code_block';
    case 'horizontalRule':
      return 'hr';
    case 'image':
      return 'img';
    case 'hardBreak':
      return 'br';
    default:
      return tiptapType;
  }
}

/**
 * Convert a single Tiptap node to Slate format
 */
function convertNode(tiptapNode: TiptapNode): SlateNode | SlateNode[] {
  // Handle text nodes
  if (tiptapNode.text !== undefined) {
    const marks = convertMarks(tiptapNode.marks);
    return {
      text: tiptapNode.text,
      ...marks,
    };
  }

  // Handle element nodes
  const slateType = convertNodeType(tiptapNode.type, tiptapNode.attrs);
  
  // Convert children
  const children: SlateNode[] = [];
  if (tiptapNode.content && tiptapNode.content.length > 0) {
    for (const child of tiptapNode.content) {
      const converted = convertNode(child);
      if (Array.isArray(converted)) {
        children.push(...converted);
      } else {
        children.push(converted);
      }
    }
  }

  // If no children, add empty text node
  if (children.length === 0) {
    children.push({ text: '' });
  }

  const slateNode: SlateNode = {
    type: slateType,
    children,
  };

  // Add attributes
  if (tiptapNode.attrs) {
    // Handle specific attributes
    if (tiptapNode.attrs.textAlign) {
      slateNode.align = tiptapNode.attrs.textAlign;
    }
    if (tiptapNode.attrs.src) {
      slateNode.url = tiptapNode.attrs.src;
    }
    if (tiptapNode.attrs.alt) {
      slateNode.alt = tiptapNode.attrs.alt;
    }
    if (tiptapNode.attrs.language) {
      slateNode.lang = tiptapNode.attrs.language;
    }
  }

  return slateNode;
}

/**
 * Main conversion function
 * Converts Tiptap/ProseMirror JSON to Slate/Plate JSON
 */
export function convertTiptapToSlate(tiptapContent: any): any[] {
  // If it's already an array (Slate format), return as-is
  if (Array.isArray(tiptapContent)) {
    return tiptapContent;
  }

  // If it's a string, try to parse it
  if (typeof tiptapContent === 'string') {
    try {
      tiptapContent = JSON.parse(tiptapContent);
    } catch {
      // If parsing fails, return a paragraph with the text
      return [
        {
          type: 'p',
          children: [{ text: tiptapContent }],
        },
      ];
    }
  }

  // If it's null or undefined, return empty paragraph
  if (!tiptapContent) {
    return [
      {
        type: 'p',
        children: [{ text: '' }],
      },
    ];
  }

  // Check if it's Tiptap format (has type: "doc")
  if (tiptapContent.type === 'doc' && tiptapContent.content) {
    const converted = convertNode(tiptapContent);
    
    // If the root is a doc, return its children
    if (!Array.isArray(converted) && converted.type === 'root' && converted.children) {
      return converted.children;
    }
    
    // Otherwise wrap in array
    return Array.isArray(converted) ? converted : [converted];
  }

  // If it's already Slate format (array of nodes), return as-is
  if (Array.isArray(tiptapContent)) {
    return tiptapContent;
  }

  // Unknown format, wrap in paragraph
  return [
    {
      type: 'p',
      children: [{ text: JSON.stringify(tiptapContent) }],
    },
  ];
}

/**
 * Check if content is in Tiptap format
 */
export function isTiptapFormat(content: any): boolean {
  if (typeof content === 'string') {
    try {
      content = JSON.parse(content);
    } catch {
      return false;
    }
  }

  return content && typeof content === 'object' && content.type === 'doc';
}
