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

/**
 * Parse a persisted "selectedWorkspace" value and return a workspace id string or null.
 *
 * The app historically stores the selected workspace in localStorage in several shapes:
 * - a plain string workspace id
 * - a JSON string containing the id: { "id": "..." }
 * - a JSON string containing workspaceId: { "workspaceId": "..." }
 * - a JSON string containing selectedWorkspace: { "selectedWorkspace": "..." }
 *
 * This helper centralizes parsing logic so all components interpret the stored value consistently.
 *
 * @param raw - raw value from localStorage (may be null)
 * @returns workspace id string or null
 */
export function parseSelectedWorkspaceId(raw?: string | null): string | null {
  if (!raw) return null;

  // fast path: if it's a simple id-looking string (no JSON braces), return it
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // If it doesn't look like JSON, treat as plain string id
  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) {
    return trimmed;
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed) return null;
    if (typeof parsed === "string") return parsed;
    if (parsed && typeof parsed.id === "string") return parsed.id;
    if (parsed && typeof parsed.workspaceId === "string")
      return parsed.workspaceId;
    if (parsed && typeof parsed.selectedWorkspace === "string")
      return parsed.selectedWorkspace;
    return null;
  } catch {
    // If JSON.parse fails, fall back to returning the raw string
    return trimmed;
  }
}

/**
 * Read the selected workspace id from browser localStorage (if available).
 * Returns null when not available or running server-side.
 */
export function readSelectedWorkspaceId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("selectedWorkspace");
    return parseSelectedWorkspaceId(raw);
  } catch {
    return null;
  }
}

/**
 * Persist a selected workspace id into localStorage using the minimal string form.
 * No-op in non-browser environments.
 */
export function writeSelectedWorkspaceId(id?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!id) {
      window.localStorage.removeItem("selectedWorkspace");
    } else {
      window.localStorage.setItem("selectedWorkspace", String(id));
    }
  } catch {
    // ignore storage errors
  }
}
