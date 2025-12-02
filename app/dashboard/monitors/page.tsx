import { notFound, redirect } from "next/navigation";
import Container from "@/components/dashboard-container";
import { api } from "@/lib/polar";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import MonitorsShell from "./monitors-shell";

export default async function MonitorsPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  const adminId = process.env.ADMIN_USER_ID;

  if (!adminId || user.id !== adminId) {
    return notFound();
  }

  const svc = createServiceClient();

  // Track query performance
  const queryTimes: number[] = [];
  const startTime = performance.now();

  const startUsers = performance.now();
  const { count: totalUsers } = await svc
    .from("users")
    .select("*", { count: "exact", head: true });
  queryTimes.push(performance.now() - startUsers);

  const startGithub = performance.now();
  const { count: githubSignups } = await svc
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("provider", "github");
  queryTimes.push(performance.now() - startGithub);

  const startGoogle = performance.now();
  const { count: googleSignups } = await svc
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("provider", "google");
  queryTimes.push(performance.now() - startGoogle);

  const startWorkspaces = performance.now();
  const { data: allWorkspaces, count: totalWorkspaces } = await svc
    .from("workspaces")
    .select("id, plan", { count: "exact" });
  queryTimes.push(performance.now() - startWorkspaces);

  const products = await api.products.list({ isArchived: false });
  const freePlanIds = new Set(
    products.result.items
      .filter((p) => p.prices.some((price) => price.amountType === "free"))
      .map((p) => p.id),
  );

  let paidWorkspaces = 0;
  let freeWorkspaces = 0;

  if (allWorkspaces) {
    for (const ws of allWorkspaces) {
      if (!ws.plan) {
        freeWorkspaces++;
      } else if (freePlanIds.has(ws.plan)) {
        freeWorkspaces++;
      } else {
        paidWorkspaces++;
      }
    }
  }

  const startDocs = performance.now();
  const { count: totalDocuments } = await svc
    .from("documents")
    .select("*", { count: "exact", head: true });
  queryTimes.push(performance.now() - startDocs);

  const startPublished = performance.now();
  const { count: publishedDocuments } = await svc
    .from("documents")
    .select("*", { count: "exact", head: true })
    .eq("published", true);
  queryTimes.push(performance.now() - startPublished);

  const startDrafts = performance.now();
  const { count: draftDocuments } = await svc
    .from("documents")
    .select("*", { count: "exact", head: true })
    .eq("published", false);
  queryTimes.push(performance.now() - startDrafts);

  const totalTime = performance.now() - startTime;

  // Calculate real performance metrics
  const avgDbQueryTime =
    queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;
  const performanceMetrics = {
    avgResponseTime: totalTime, // Total time for all queries
    dbQueryTime: avgDbQueryTime, // Average individual query time
    cacheHitRate: 0, // No caching implemented yet
  };

  return (
    <Container>
      <MonitorsShell
        stats={{
          users: {
            total: totalUsers || 0,
            github: githubSignups || 0,
            google: googleSignups || 0,
          },
          workspaces: {
            total: totalWorkspaces || 0,
            paid: paidWorkspaces || 0,
            free: freeWorkspaces || 0,
          },
          documents: {
            total: totalDocuments || 0,
            published: publishedDocuments || 0,
            drafts: draftDocuments || 0,
          },
          performance: {
            avgResponseTime: performanceMetrics.avgResponseTime,
            dbQueryTime: performanceMetrics.dbQueryTime,
            cacheHitRate: performanceMetrics.cacheHitRate,
          },
        }}
      />
    </Container>
  );
}
