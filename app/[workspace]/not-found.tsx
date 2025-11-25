import { FileSearchCorner, SearchX } from "lucide-react";
import Link from "next/link";
import React from "react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

/**
 * Workspace-level not-found page
 *
 * This is rendered when a workspace segment (e.g. /{workspace}) cannot be resolved.
 * Keep this page lightweight and consistent with other Empty states in the app.
 */
export default function NotFound() {
  return (
    <Empty className="bg-accent">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchX />
        </EmptyMedia>
        <EmptyTitle>Document not found</EmptyTitle>
        <EmptyDescription>
          We couldn't find a document with that identifier. It may have been
          removed or the URL is incorrect.
        </EmptyDescription>
      </EmptyHeader>

      <EmptyContent>
        <div className="flex gap-2">
          <Link href="/">
            <Button size="sm">Back to home</Button>
          </Link>
        </div>
      </EmptyContent>
    </Empty>
  );
}
