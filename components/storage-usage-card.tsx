"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn, formatBytes } from "@/lib/utils";

interface StorageUsageCardProps {
  usage: number;
  limit: number;
  isFreePlan: boolean;
}

export function StorageUsageCard({
  usage,
  limit,
  isFreePlan,
}: StorageUsageCardProps) {
  const percentage = Math.min(100, (usage / limit) * 100);

  return (
    <div
      className={cn(
        "mb-5 rounded-xl p-6",
        percentage >= 100 ? "bg-destructive/5" : "bg-accent",
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-medium">Storage Usage</h3>
          <p className="text-muted-foreground text-sm">
            {isFreePlan
              ? "You are on the Free plan. Upgrade to Scale for more storage."
              : `You have ${formatBytes(limit)} of storage on your Scale plan.`}
          </p>
        </div>
        {isFreePlan && (
          <Link href="/portal">
            <Button size="sm" variant="outline">
              Upgrade
            </Button>
          </Link>
        )}
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Used Storage</span>
          <span>
            {formatBytes(usage)} / {formatBytes(limit)}
          </span>
        </div>
        <div className="h-2 w-full bg-background">
          <div
            className={cn(
              "h-full transition-all",
              percentage >= 100 ? "bg-destructive/90" : "bg-primary",
            )}
            style={{
              width: `${percentage}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
