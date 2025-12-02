"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import PageTitle from "@/components/dashboard-page-title";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

interface MonitorsShellProps {
  stats: {
    users: {
      total: number;
      github: number;
      google: number;
    };
    workspaces: {
      total: number;
      paid: number;
      free: number;
    };
    documents: {
      total: number;
      published: number;
      drafts: number;
    };
    performance: {
      avgResponseTime: number;
      dbQueryTime: number;
      cacheHitRate: number;
    };
  };
}

export default function MonitorsShell({
  stats,
}: MonitorsShellProps): React.ReactElement {
  const data = [
    { name: "Total Users", value: String(stats.users.total) },
    { name: "GitHub Signups", value: String(stats.users.github) },
    { name: "Google Signups", value: String(stats.users.google) },
    { name: "Total Workspaces", value: String(stats.workspaces.total) },
    { name: "Paid Workspaces", value: String(stats.workspaces.paid) },
    { name: "Free Workspaces", value: String(stats.workspaces.free) },
    { name: "Total Documents", value: String(stats.documents.total) },
    { name: "Published Docs", value: String(stats.documents.published) },
    { name: "Draft Docs", value: String(stats.documents.drafts) },
    {
      name: "Avg Response Time",
      value: `${stats.performance.avgResponseTime.toFixed(0)}ms`,
    },
    {
      name: "DB Query Time",
      value: `${stats.performance.dbQueryTime.toFixed(0)}ms`,
    },
    {
      name: "Cache Hit Rate",
      value: `${stats.performance.cacheHitRate.toFixed(1)}%`,
    },
  ];

  const userChartData = [
    {
      type: "GitHub",
      count: stats.users.github,
      fill: "var(--color-purple-500)",
    },
    { type: "Google", count: stats.users.google, fill: "var(--color-red-500)" },
  ];
  const userChartConfig = {
    count: {
      label: "Users",
    },
    github: {
      label: "GitHub",
      color: "hsl(var(--color-purple-500))",
    },
    google: {
      label: "Google",
      color: "hsl(var(--color-red-500))",
    },
  } satisfies ChartConfig;

  const workspaceChartData = [
    { type: "Paid", count: stats.workspaces.paid, fill: "var(--color-info)" },
    { type: "Free", count: stats.workspaces.free, fill: "var(--color-ring)" },
  ];
  const workspaceChartConfig = {
    count: {
      label: "Workspaces",
    },
    paid: {
      label: "Paid",
      color: "hsl(var(--color-info))",
    },
    free: {
      label: "Free",
      color: "hsl(var(--color-ring))",
    },
  } satisfies ChartConfig;

  const documentChartData = [
    {
      type: "Published",
      count: stats.documents.published,
      fill: "var(--color-info)",
    },
    {
      type: "Drafts",
      count: stats.documents.drafts,
      fill: "var(--color-warning)",
    },
  ];
  const documentChartConfig = {
    count: {
      label: "Documents",
    },
    published: {
      label: "Published",
      color: "hsl(var(--color-info))",
    },
    drafts: {
      label: "Drafts",
      color: "hsl(var(--color-warning))",
    },
  } satisfies ChartConfig;

  return (
    <>
      <PageTitle
        title="System Monitors"
        description="Overview of system statistics."
      />

      <div className="mx-auto mb-10 grid grid-cols-1 gap-px overflow-hidden border border-r-0 border-b-0 bg-accent sm:grid-cols-2 lg:grid-cols-3">
        {data.map((stat, _index) => (
          <Card
            key={stat.name}
            className={cn(
              "rounded-none border-0 bg-muted py-0 shadow-none",
              "border-r border-b",
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

      <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="rounded-none shadow-none">
          <CardHeader>
            <CardTitle>User Signups</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={userChartConfig}>
              <BarChart accessibilityLayer data={userChartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="type"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Bar dataKey="count" radius={0} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="rounded-none shadow-none">
          <CardHeader>
            <CardTitle>Workspace Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={workspaceChartConfig}>
              <BarChart accessibilityLayer data={workspaceChartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="type"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Bar dataKey="count" radius={0} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="rounded-none shadow-none">
          <CardHeader>
            <CardTitle>Document Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={documentChartConfig}>
              <BarChart accessibilityLayer data={documentChartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="type"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Bar dataKey="count" radius={0} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
