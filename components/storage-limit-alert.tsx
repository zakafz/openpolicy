"use client";

import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/utils";

interface StorageLimitAlertProps {
  usage: number;
  limit: number;
}

export function StorageLimitAlert({ usage, limit }: StorageLimitAlertProps) {
  // Show alert if usage is above 90% of limit
  if (usage < limit * 0.9) return null;

  const isFull = usage >= limit;

  return (
    <Alert variant="error" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>
        {isFull ? "Storage Limit Reached" : "Storage Limit Near"}
      </AlertTitle>
      <AlertDescription className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <span>
          {isFull
            ? `You have reached your storage limit of ${formatBytes(limit)}. You cannot upload more files.`
            : `You are nearing your storage limit. You have used ${formatBytes(usage)} of ${formatBytes(limit)}.`}
          Upgrade to Pro for more storage.
        </span>
        <Link href="/portal">
          <Button
            size="sm"
            variant="outline"
            className="bg-background text-foreground hover:bg-accent"
          >
            Upgrade to Pro
          </Button>
        </Link>
      </AlertDescription>
    </Alert>
  );
}
