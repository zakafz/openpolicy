"use client";

import { createPlatePlugin } from "platejs/react";

import { FixedToolbar } from "@/components/ui/fixed-toolbar";
import { FixedToolbarButtons } from "@/components/ui/fixed-toolbar-buttons";

export const createFixedToolbarKit = ({
  disableAI = false,
}: {
  disableAI?: boolean;
} = {}) => [
  createPlatePlugin({
    key: "fixed-toolbar",
    render: {
      beforeEditable: () => (
        <FixedToolbar>
          <FixedToolbarButtons disableAI={disableAI} />
        </FixedToolbar>
      ),
    },
  }),
];

export const FixedToolbarKit = createFixedToolbarKit();
