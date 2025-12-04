"use client";

import { TrailingBlockPlugin } from "platejs";

import { AlignKit } from "@/components/editor/plugins/align-kit";
import { AutoformatKit } from "@/components/editor/plugins/autoformat-kit";
import { BasicBlocksKit } from "@/components/editor/plugins/basic-blocks-kit";
import { BasicMarksKit } from "@/components/editor/plugins/basic-marks-kit";
import { BlockPlaceholderKit } from "@/components/editor/plugins/block-placeholder-kit";
import { CalloutKit } from "@/components/editor/plugins/callout-kit";
import { CodeBlockKit } from "@/components/editor/plugins/code-block-kit";
import { ColumnKit } from "@/components/editor/plugins/column-kit";
import { DateKit } from "@/components/editor/plugins/date-kit";
import { EmojiKit } from "@/components/editor/plugins/emoji-kit";
import { ExitBreakKit } from "@/components/editor/plugins/exit-break-kit";
import { createFloatingToolbarKit } from "@/components/editor/plugins/floating-toolbar-kit";
import { FontKit } from "@/components/editor/plugins/font-kit";
import { LineHeightKit } from "@/components/editor/plugins/line-height-kit";
import { LinkKit } from "@/components/editor/plugins/link-kit";
import { ListKit } from "@/components/editor/plugins/list-kit";
import { MarkdownKit } from "@/components/editor/plugins/markdown-kit";
import { MathKit } from "@/components/editor/plugins/math-kit";
import { ShowcaseFixedToolbarKit } from "@/components/editor/plugins/showcase-fixed-toolbar-kit";
import { TableKit } from "@/components/editor/plugins/table-kit";
import { TocKit } from "@/components/editor/plugins/toc-kit";
import { ToggleKit } from "@/components/editor/plugins/toggle-kit";

// Simplified editor kit for landing page showcase - no uploads, no AI
export const createShowcaseEditorKit = () => [
  // Elements
  ...BasicBlocksKit,
  ...CodeBlockKit,
  ...TableKit,
  ...ToggleKit,
  ...TocKit,
  ...CalloutKit,
  ...ColumnKit,
  ...MathKit,
  ...DateKit,
  ...LinkKit,

  // Marks
  ...BasicMarksKit,
  ...FontKit,

  // Block Style
  ...ListKit,
  ...AlignKit,
  ...LineHeightKit,

  // Editing
  ...AutoformatKit,
  ...EmojiKit,
  ...ExitBreakKit,
  TrailingBlockPlugin,

  // Parsers
  ...MarkdownKit,

  // UI
  ...BlockPlaceholderKit,
  ...ShowcaseFixedToolbarKit,
  ...createFloatingToolbarKit({ disableAI: true }),
];

export const ShowcaseEditorKit = createShowcaseEditorKit();
