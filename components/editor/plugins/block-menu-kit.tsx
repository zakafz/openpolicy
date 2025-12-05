"use client";

import { BlockMenuPlugin } from "@platejs/selection/react";

import { BlockContextMenu } from "@/components/ui/block-context-menu";

import { BlockSelectionKit } from "./block-selection-kit";

export const createBlockMenuKit = ({
  disableAI,
}: {
  disableAI?: boolean;
} = {}) => [
  ...BlockSelectionKit,
  BlockMenuPlugin.configure({
    render: {
      aboveEditable: (props) => (
        <BlockContextMenu {...props} disableAI={disableAI} />
      ),
    },
  }),
];

export const BlockMenuKit = createBlockMenuKit();
