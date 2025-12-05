"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function createPendingWorkspace(data: {
  name: string;
  owner_id: string;
  plan: string;
  metadata?: any;
  customer_id?: string | null;
  customer_email?: string | null;
  customer_external_id?: string;
  slug?: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Not authenticated" };
  }

  if (user.id !== data.owner_id) {
    return { error: "Unauthorized: Owner ID mismatch" };
  }

  const svc = createServiceClient();

  try {
    const { data: pending, error } = await svc
      .from("pending_workspaces")
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error("Error creating pending workspace:", error);
      return { error: error.message };
    }

    return { data: pending };
  } catch (err: any) {
    console.error("Unexpected error creating pending workspace:", err);
    return { error: err.message || "Unexpected error" };
  }
}
