"use client";

import { createPlatePlugin } from "platejs/react";

import { FixedToolbar } from "@/components/ui/fixed-toolbar";
import { ShowcaseToolbarButtons } from "@/components/ui/showcase-toolbar-buttons";

export const ShowcaseFixedToolbarKit = [
  createPlatePlugin({
    key: "fixed-toolbar",
    render: {
      beforeEditable: () => (
        <FixedToolbar>
          <ShowcaseToolbarButtons />
        </FixedToolbar>
      ),
    },
  }),
];
