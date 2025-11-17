import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { RouteIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextShimmer } from "./motion-primitives/text-shimmer";
import Link from "next/link";

export function NoSelectedWorkspace() {
  return (
    <div className="w-full justify-center flex items-center h-full">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <RouteIcon />
          </EmptyMedia>
          <EmptyTitle>No workspace selected</EmptyTitle>
          <EmptyDescription>
            Select or create a workspace to see its dashboard.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}

export function LoadingWorkspace() {
  return (
    <div className="w-full justify-center flex items-center h-full">
      <TextShimmer className="font-mono text-sm" duration={1}>
        Loading workspace...
      </TextShimmer>
    </div>
  );
}

export function ErrorWorkspace({ error }: { error: string }) {
  return (
    <div className="w-full justify-center flex items-center h-full">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <RouteIcon />
          </EmptyMedia>
          <EmptyTitle>Failed to load workspace</EmptyTitle>
          <EmptyDescription>{error}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}

export function NoWorkspace() {
  return (
    <div className="w-full justify-center flex items-center h-full">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <RouteIcon />
          </EmptyMedia>
          <EmptyTitle>No Workspace</EmptyTitle>
          <EmptyDescription>
            Create a workspace to get started.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="flex gap-2">
            <Link href="/create">
              <Button variant="default" size="sm">
                Create Workspace
              </Button>
            </Link>
          </div>
        </EmptyContent>
      </Empty>
    </div>
  );
}
