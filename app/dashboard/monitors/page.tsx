import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { api } from "@/lib/polar";
import MonitorsShell from "./monitors-shell";
import Container from "@/components/dashboard-container";

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

    const { count: totalUsers } = await svc
        .from("users")
        .select("*", { count: "exact", head: true });

    const { count: githubSignups } = await svc
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("provider", "github");

    const { count: googleSignups } = await svc
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("provider", "google");

    // Fetch all workspaces to determine paid/free status based on Polar products
    const { data: allWorkspaces, count: totalWorkspaces } = await svc
        .from("workspaces")
        .select("id, plan", { count: "exact" });

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

    const { count: totalDocuments } = await svc
        .from("documents")
        .select("*", { count: "exact", head: true });

    const { count: publishedDocuments } = await svc
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("published", true);

    const { count: draftDocuments } = await svc
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("published", false);

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
                }}
            />
        </Container>
    );
}
