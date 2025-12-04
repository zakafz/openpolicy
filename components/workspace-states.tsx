import { RouteIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { TextShimmer } from "./motion-primitives/text-shimmer";

export function NoSelectedWorkspace() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <RouteIcon />
          </EmptyMedia>
          <EmptyTitle>No workspace selected</EmptyTitle>
          <EmptyDescription>
            Select or create a workspace to get started.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}

export function LoadingWorkspace() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <TextShimmer className="font-mono text-sm" duration={1}>
        Loading workspace...
      </TextShimmer>
    </div>
  );
}

export function ErrorWorkspace({ error }: { error: string }) {
  const handleTryAgain = () => {
    try {
      localStorage.clear();
      window.location.reload();
    } catch (e) {
      console.error("Failed to clear localStorage:", e);
      window.location.reload();
    }
  };

  return (
    <div className="flex h-full w-full items-center justify-center">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <RouteIcon />
          </EmptyMedia>
          <EmptyTitle>Failed to load workspace</EmptyTitle>
          <EmptyDescription>{error}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={handleTryAgain} variant="default" size="sm">
            Try Again
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}

export function NoWorkspace() {
  const _handleTryAgain = () => {
    try {
      localStorage.clear();
      window.location.reload();
    } catch (e) {
      console.error("Failed to clear localStorage:", e);
      window.location.reload();
    }
  };
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <RouteIcon />
          </EmptyMedia>
          <EmptyTitle>No Workspace</EmptyTitle>
          <EmptyDescription>
            Try refreshing, or create a new workspace.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="flex gap-2">
            <Link href="/create">
              <Button variant="outline" size="sm">
                Create Workspace
              </Button>
            </Link>
            <Button variant="default" size="sm" onClick={_handleTryAgain}>
              Refresh
            </Button>
          </div>
        </EmptyContent>
      </Empty>
    </div>
  );
}
