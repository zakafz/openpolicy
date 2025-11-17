/**
 * Workspace helpers
 *
 * Provides a small set of reusable functions to fetch workspace rows from the DB.
 * - `fetchWorkspaceById` is a client-friendly helper (accepts an optional Supabase client).
 * - `fetchWorkspaceByIdServer` is a server-side wrapper that uses the service-role client.
 *
 * These helpers throw the Supabase error object on failure so callers can handle errors
 * consistently (catch the thrown error and inspect `error.message` / `error.status`).
 */

import { createClient } from "@/lib/supabase/client";
import { createServiceClient } from "@/lib/supabase/service";
import type { WorkspaceRow } from "@/types/supabase";

/**
 * Fetch a single workspace by id (client-friendly).
 *
 * Usage (client component):
 *   const workspace = await fetchWorkspaceById(workspaceId);
 *
 * Usage (if you already have a Supabase client instance):
 *   const workspace = await fetchWorkspaceById(workspaceId, supabase);
 *
 * @param id - Workspace id to fetch
 * @param supabaseClient - Optional Supabase client (client-side createClient() or server client)
 * @returns WorkspaceRow | null
 * @throws Supabase error when the query fails
 */
export async function fetchWorkspaceById(
  id: string | null | undefined,
  supabaseClient?: ReturnType<typeof createClient>,
): Promise<WorkspaceRow | null> {
  if (!id) return null;

  const supabase = supabaseClient ?? createClient();

  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    // Let the caller decide how to handle errors
    throw error;
  }

  return data ?? null;
}

/**
 * Server-side variant that always uses the service-role client.
 *
 * Use this inside server (API/route) code where elevated privileges are needed
 * (e.g. reading private metadata) and you don't want to pass a client around.
 *
 * Example (server/edge):
 *   const workspace = await fetchWorkspaceByIdServer(workspaceId);
 *
 * @param id - Workspace id to fetch
 * @returns WorkspaceRow | null
 * @throws Supabase error when the query fails
 */
export async function fetchWorkspaceByIdServer(
  id: string | null | undefined,
): Promise<WorkspaceRow | null> {
  if (!id) return null;

  const svc = createServiceClient();

  const { data, error } = await svc
    .from("workspaces")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  }

  return data ?? null;
}

/**
 * Convenience: fetch workspaces for an owner.
 *
 * This is useful when you need to list a user's workspaces in multiple places.
 *
 * @param ownerId - owner (user) id
 * @param supabaseClient - optional client
 * @returns WorkspaceRow[] (possibly empty)
 * @throws Supabase error when the query fails
 */
export async function fetchWorkspacesForOwner(
  ownerId: string,
  supabaseClient?: ReturnType<typeof createClient>,
): Promise<WorkspaceRow[]> {
  const supabase = supabaseClient ?? createClient();

  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("owner_id", ownerId);

  if (error) {
    throw error;
  }

  return data ?? [];
}
