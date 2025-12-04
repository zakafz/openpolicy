"use client";

import { createPlatePlugin } from "platejs/react";

import { FloatingToolbar } from "@/components/ui/floating-toolbar";
import { FloatingToolbarButtons } from "@/components/ui/floating-toolbar-buttons";

export const createFloatingToolbarKit = ({
  disableAI = false,
}: {
  disableAI?: boolean;
} = {}) => [
  createPlatePlugin({
    key: "floating-toolbar",
    render: {
      afterEditable: () => (
        <FloatingToolbar>
          <FloatingToolbarButtons disableAI={disableAI} />
        </FloatingToolbar>
      ),
    },
  }),
];

export const FloatingToolbarKit = createFloatingToolbarKit();
