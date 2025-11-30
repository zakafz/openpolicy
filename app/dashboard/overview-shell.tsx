"use client";

import Link from "next/link";
import * as React from "react";
import PageTitle from "@/components/dashboard-page-title";
import RecentDocumentsTable from "@/components/recent-documents-table";
import { StatsSkeleton } from "@/components/skeletons";
import { SubscriptionAlert } from "@/components/subscription-alert";
import { FreePlanLimitAlert } from "@/components/free-plan-limit-alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ErrorWorkspace,
  LoadingWorkspace,
  NoSelectedWorkspace,
  NoWorkspace,
} from "@/components/workspace-states";
import { useWorkspace } from "@/context/workspace";
import useWorkspaceLoader from "@/hooks/use-workspace-loader";
import { fetchWorkspaceDocumentCounts } from "@/lib/documents";
import { FREE_PLAN_LIMITS, PRO_PLAN_LIMITS } from "@/lib/limits";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export default function OverviewShell(): React.ReactElement {
  const { selectedWorkspaceId } = useWorkspace();
  const { workspace, loading, error } = useWorkspaceLoader();
  const [stats, setStats] = React.useState({
    all: 0,
    published: 0,
    drafts: 0,
    archived: 0,
  });
  const [statsLoading, setStatsLoading] = React.useState(true);
  const [isFreePlanState, setIsFreePlanState] = React.useState(false);
  const [planLimit, setPlanLimit] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!workspace?.plan) {
      if (workspace) {
        setIsFreePlanState(true);
        setPlanLimit(FREE_PLAN_LIMITS.documents);
      }
      return;
    }

    async function checkPlan() {
      try {
        const res = await fetch(`/api/plans/check?planId=${workspace?.plan}`);
        if (res.ok) {
          const data = await res.json();
          setIsFreePlanState(data.isFree);
          const limit = data.isFree
            ? FREE_PLAN_LIMITS.documents
            : PRO_PLAN_LIMITS.documents;
          setPlanLimit(Number.isFinite(limit) ? limit : null);
        }
      } catch (e) {
        console.error("Failed to check plan status", e);
      }
    }

    checkPlan();
  }, [workspace?.plan, workspace]);

  React.useEffect(() => {
    let cancelled = false;
    async function loadStats() {
      if (!selectedWorkspaceId) {
        setStats({ all: 0, published: 0, drafts: 0, archived: 0 });
        setStatsLoading(false);
        return;
      }
      setStatsLoading(true);
      try {
        const counts = await fetchWorkspaceDocumentCounts(
          selectedWorkspaceId,
          createClient(),
        );

        if (!cancelled) {
          setStats({
            all: Number(counts.all ?? 0),
            published: Number(counts.published ?? 0),
            drafts: Number(counts.drafts ?? 0),
            archived: Number(counts.archived ?? 0),
          });
        }
      } catch (e) {
        console.error("Failed to load workspace stats", e);
        if (!cancelled) {
          setStats({ all: 0, published: 0, drafts: 0, archived: 0 });
        }
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    }

    loadStats();

    return () => {
      cancelled = true;
    };
  }, [selectedWorkspaceId]);

  const data = React.useMemo(() => {
    return [
      { name: "All Documents", value: String(stats.all ?? 0) },
      {
        name: "Published Docs",
        value:
          Number(stats.published ?? 0) === 0 ? "none" : String(stats.published),
      },
      {
        name: "Drafts",
        value: Number(stats.drafts ?? 0) === 0 ? "none" : String(stats.drafts),
      },
      {
        name: "Archived Docs",
        value:
          Number(stats.archived ?? 0) === 0 ? "none" : String(stats.archived),
      },
    ];
  }, [stats]);

  if (!selectedWorkspaceId) {
    return <NoSelectedWorkspace />;
  }
  if (loading) {
    return <LoadingWorkspace />;
  }
  if (error) {
    return <ErrorWorkspace error={error} />;
  }
  if (!workspace) {
    return <NoWorkspace />;
  }

  return (
    <>
      <SubscriptionAlert workspace={workspace} />
      {isFreePlanState && planLimit !== null && (
        <FreePlanLimitAlert documentCount={stats.all} limit={planLimit} />
      )}
      {planLimit !== null && (
        <div
          className={cn(
            "mb-8 rounded-xl p-6",
            stats.all >= planLimit ? "bg-destructive/5" : "bg-accent",
          )}
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-medium">
                {isFreePlanState ? "Free" : "Pro"} Plan Usage
              </h3>
              <p className="text-muted-foreground text-sm">
                {isFreePlanState
                  ? "You are on the Free plan. Upgrade to Pro for more documents."
                  : `Your Pro plan is limited to ${planLimit} documents.`}
              </p>
            </div>
            {isFreePlanState && (
              <Link href="/portal">
                <Button size="sm" variant="outline">
                  Upgrade
                </Button>
              </Link>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Documents</span>
              <span>
                {stats.all} / {planLimit}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-background">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  stats.all >= planLimit ? "bg-destructive/90" : "bg-primary",
                )}
                style={{
                  width: `${Math.min(100, (stats.all / planLimit) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}
      <PageTitle
        title={workspace.name || "Workspace Name"}
        description="Here's an overview of your workspace."
      />

      {statsLoading ? (
        <StatsSkeleton />
      ) : (
        <div className="mx-auto mb-10 grid grid-cols-1 gap-px rounded-xl bg-border sm:grid-cols-2 lg:grid-cols-4">
          {data.map((stat, index) => (
            <Card
              key={stat.name}
              className={cn(
                "rounded-none border-0 bg-muted py-0 shadow-none",
                index === 0 && "rounded-l-xl",
                index === data.length - 1 && "rounded-r-xl",
              )}
            >
              <CardContent className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 p-4 sm:p-6">
                <div className="font-medium text-muted-foreground text-sm">
                  {stat.name}
                </div>

                <div className="w-full flex-none font-medium text-3xl text-foreground tracking-tight">
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PageTitle
        title={"Recent Documents"}
        description="Recently edited documents."
      />
      <RecentDocumentsTable />
    </>
  );
}
