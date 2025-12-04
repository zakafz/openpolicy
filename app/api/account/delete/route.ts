import { NextResponse } from "next/server";
import { api as polar } from "@/lib/polar";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(_req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = user.id;
    const userEmail = user.email;
    const svc = createServiceClient();

    try {
      let customerId: string | null = null;

      try {
        const res: any = await polar.customers.getExternal({
          externalId: userId,
        });
        const customer = res?.data ?? res;
        customerId = customer?.id ?? null;
      } catch (_err: any) {
        if (userEmail) {
          try {
            const listRes: any = await polar.customers.list({
              email: userEmail,
            });
            const list = listRes?.data ?? listRes ?? [];
            if (Array.isArray(list) && list.length > 0) {
              customerId = list[0].id;
            }
          } catch (listErr) {
            console.warn("Failed to list Polar customers by email:", listErr);
          }
        }
      }

      if (customerId) {
        await polar.customers.delete({ id: customerId });
        console.log(`Deleted Polar customer ${customerId} for user ${userId}`);
      }
    } catch (polarErr) {
      console.error("Error deleting Polar customer:", polarErr);
    }

    try {
      const { data: ownedWorkspaces, error: workspacesErr } = await svc
        .from("workspaces")
        .select("id")
        .eq("owner_id", userId);

      if (workspacesErr) throw workspacesErr;

      if (ownedWorkspaces && ownedWorkspaces.length > 0) {
        const workspaceIds = ownedWorkspaces.map((w) => w.id);

        const { error: docsErr } = await svc
          .from("documents")
          .delete()
          .in("workspace_id", workspaceIds);

        if (docsErr) throw docsErr;
      }

      const { error: workspacesDeleteErr } = await svc
        .from("workspaces")
        .delete()
        .eq("owner_id", userId);

      if (workspacesDeleteErr) throw workspacesDeleteErr;

      const { error: pendingErr } = await svc
        .from("pending_workspaces")
        .delete()
        .eq("owner_id", userId);

      if (pendingErr) throw pendingErr;

      const { error: deleteErr } = await svc
        .from("users")
        .delete()
        .eq("auth_id", userId);

      if (deleteErr) throw deleteErr;

      const { error: signOutErr } = await svc.auth.admin.deleteUser(userId);
      if (signOutErr) throw signOutErr;
    } catch (dbErr: any) {
      console.error("Database deletion error:", dbErr);
      return NextResponse.json(
        { error: "Failed to delete account data", details: dbErr.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Delete account error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err.message },
      { status: 500 },
    );
  }
}
