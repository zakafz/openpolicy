import { createClient } from "@/lib/supabase/client";
import { createServiceClient } from "@/lib/supabase/service";
import type { WorkspaceRow } from "@/types/supabase";

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
    throw error;
  }

  return data ?? null;
}

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

export function parseSelectedWorkspaceId(raw?: string | null): string | null {
  if (!raw) return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object") {
        if (typeof parsed.id === "string") return parsed.id;
        if (typeof parsed.workspaceId === "string") return parsed.workspaceId;
        if (typeof parsed.selectedWorkspace === "string")
          return parsed.selectedWorkspace;
      }

      if (typeof parsed === "string") return parsed;
    } catch {
      // ignore parse errors
    }

    return null;
  }

  return trimmed;
}

export function readSelectedWorkspaceId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("selectedWorkspace");
    return parseSelectedWorkspaceId(raw);
  } catch {
    return null;
  }
}

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
