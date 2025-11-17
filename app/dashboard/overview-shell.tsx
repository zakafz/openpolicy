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

export default function OverviewShell(): React.ReactElement {
  const { selectedWorkspaceId } = useWorkspace();
  const { workspace, loading, error, reload } = useWorkspaceLoader();
  const data = [
    {
      name: "Profit",
      value: "$287,654.00",
      change: "+8.32%",
      changeType: "positive",
    },
    {
      name: "Late payments",
      value: "$9,435.00",
      change: "-12.64%",
      changeType: "negative",
    },
    {
      name: "Pending orders",
      value: "$173,229.00",
      change: "+2.87%",
      changeType: "positive",
    },
    {
      name: "Operating costs",
      value: "$52,891.00",
      change: "-5.73%",
      changeType: "negative",
    },
  ];
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
              <div
                className={cn(
                  "text-xs font-medium",
                  stat.changeType === "positive"
                    ? "text-green-800 dark:text-green-400"
                    : "text-red-800 dark:text-red-400",
                )}
              >
                {stat.change}
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
