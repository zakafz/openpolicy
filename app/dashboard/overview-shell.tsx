"use client";

import * as React from "react";
import { useWorkspace } from "@/context/workspace";
import useWorkspaceLoader from "@/hooks/use-workspace-loader";
import {
  ErrorWorkspace,
  LoadingWorkspace,
  NoSelectedWorkspace,
  NoWorkspace,
} from "@/components/workspace-states";
import PageTitle from "@/components/dashboard-page-title";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import RecentDocumentsTable from "@/components/recent-documents-table";
// Supabase client for fetching real stats
import { createClient } from "@/lib/supabase/client";

export default function OverviewShell(): React.ReactElement {
  const { selectedWorkspaceId } = useWorkspace();
  const { workspace, loading, error, reload } = useWorkspaceLoader();
  // Live stats fetched for the selected workspace
  const [stats, setStats] = React.useState({
    all: 0,
    published: 0,
    drafts: 0,
    archived: 0,
  });
  const [statsLoading, setStatsLoading] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    async function loadStats() {
      if (!selectedWorkspaceId) {
        setStats({ all: 0, published: 0, drafts: 0, archived: 0 });
        return;
      }
      setStatsLoading(true);
      try {
        const supabase = createClient();

        // total count
        const totalRes = await supabase
          .from("documents")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", selectedWorkspaceId);

        // published
        const publishedRes = await supabase
          .from("documents")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", selectedWorkspaceId)
          .eq("status", "published");

        // drafts
        const draftRes = await supabase
          .from("documents")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", selectedWorkspaceId)
          .eq("status", "draft");

        // archived
        const archivedRes = await supabase
          .from("documents")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", selectedWorkspaceId)
          .eq("status", "archived");

        const allCount = totalRes.count ?? 0;
        const publishedCount = publishedRes.count ?? 0;
        const draftsCount = draftRes.count ?? 0;
        const archivedCount = archivedRes.count ?? 0;

        if (!cancelled) {
          setStats({
            all: Number(allCount),
            published: Number(publishedCount),
            drafts: Number(draftsCount),
            archived: Number(archivedCount),
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
    // While loading, show an ellipsis for all stats
    if (statsLoading) {
      return [
        { name: "All Documents", value: "…" },
        { name: "Published Docs", value: "…" },
        { name: "Drafts", value: "…" },
        { name: "Archived Docs", value: "…" },
      ];
    }

    // For Published/Drafts/Archived show "none" when count is 0.
    // For All Documents show the numeric value (including 0).
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
  }, [stats, statsLoading]);
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
      <PageTitle
        title={workspace.name || "Workspace Name"}
        description="Here's an overview of your workspace."
      />
      {/*Stats*/}
      <div className="mx-auto mb-10 grid grid-cols-1 gap-px rounded-xl bg-border sm:grid-cols-2 lg:grid-cols-4">
        {data.map((stat, index) => (
          <Card
            key={stat.name}
            className={cn(
              "rounded-none bg-muted border-0 shadow-none py-0",
              index === 0 && "rounded-l-xl",
              index === data.length - 1 && "rounded-r-xl",
            )}
          >
            <CardContent className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 p-4 sm:p-6">
              <div className="text-sm font-medium text-muted-foreground">
                {stat.name}
              </div>

              <div className="w-full flex-none text-3xl font-medium tracking-tight text-foreground">
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {/*Recent documents*/}
      <PageTitle
        title={"Recent Documents"}
        description="Recently edited documents."
      />
      <RecentDocumentsTable />
    </>
  );
}
