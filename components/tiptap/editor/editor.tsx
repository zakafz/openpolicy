"use client";

import { Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function Editor() {
  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <Alert variant="info" className="max-w-2xl">
        <Info />
        <AlertTitle>Editor Temporarily Unavailable</AlertTitle>
        <AlertDescription>
          The editor is being migrated from Tiptap to Plate.js. This feature
          will be available again soon.
        </AlertDescription>
      </Alert>
    </div>
  );
}
