/**
 * Central document helpers
 *
 * Provides reusable functions for working with `documents` rows across the app.
 * - Normalization / slug helpers
 * - Query helpers (client+server friendly)
 * - CRUD helpers that use the service-role client
 *
 * Functions throw Supabase error objects on query failures so callers can handle
 * errors consistently.
 */

import { createClient } from "@/lib/supabase/client";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Permissive DocumentRow alias
 *
 * The generated `types/supabase` in this repository does not currently
 * export a `DocumentRow` interface. Use a permissive `any` alias here so
 * the helper functions remain usable while keeping type-checking lax.
 *
 * Replace with the concrete `DocumentRow` type from `types/supabase`
 * when it becomes available.
 */
type DocumentRow = any;

/**
 * Normalize a human-friendly raw string into a URL-safe slug candidate.
 */
export function normalizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Validate slug format: starts with alnum then alnum or dash; max 64 chars.
 */
export function isValidSlug(s: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,63}$/.test(s);
}

/**
 * Try to produce a unique slug by appending a counter when needed.
 *
 * Uses a case-insensitive search scoped to a workspace when provided.
 * Returns a candidate even if uniqueness-check fails (best-effort).
 */
export async function makeUniqueSlug(
  svc: ReturnType<typeof createServiceClient>,
  base: string,
  workspaceId?: string | null,
): Promise<string> {
  let candidate = base;
  let attempt = 0;
  const maxAttempts = 20;

  while (attempt < maxAttempts) {
    const q = svc.from("documents").select("id").ilike("slug", candidate);
    if (typeof workspaceId === "string" && workspaceId) {
      q.eq("workspace_id", workspaceId);
    }

    const { data, error } = await q.limit(1);
    if (error) {
      // On check error, return the current candidate so we don't block creation.
      console.warn(
        "makeUniqueSlug: uniqueness check failed, returning candidate",
        { error, candidate },
      );
      return candidate;
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
      return candidate;
    }

    attempt += 1;
    candidate = `${base}-${attempt}`;
  }

  // Fallback: append timestamp
  return `${base}-${Date.now()}`;
}

/**
 * Fetch a single document by id (client-friendly).
 * If a Supabase client is provided it will be used; otherwise createClient() is used.
 *
 * Throws Supabase error on query failure.
 */
export async function fetchDocumentById(
  id?: string | null,
  supabaseClient?: ReturnType<typeof createClient>,
): Promise<DocumentRow | null> {
  if (!id) return null;
  const supabase = supabaseClient ?? createClient();

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as DocumentRow) ?? null;
}

/**
 * Fetch a single document by slug (optionally scoped to workspaceId).
 * Uses provided client if available, otherwise createClient().
 *
 * Throws Supabase error on query failure.
 */
export async function fetchDocumentBySlug(
  slug?: string | null,
  workspaceId?: string | null,
  supabaseClient?: ReturnType<typeof createClient>,
): Promise<DocumentRow | null> {
  if (!slug) return null;
  const supabase = supabaseClient ?? createClient();

  const q = supabase.from("documents").select("*").eq("slug", slug);
  if (workspaceId) q.eq("workspace_id", workspaceId);

  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  return (data as DocumentRow) ?? null;
}

/**
 * Fetch published documents for a given workspace id (most recent first).
 * Use client param for client-side fetching, otherwise will use service client if called server-side.
 *
 * Throws Supabase error on query failure.
 */
export async function fetchPublishedDocumentsForWorkspace(
  workspaceId?: string | null,
  supabaseClient?: ReturnType<typeof createClient>,
  limit = 100,
): Promise<DocumentRow[]> {
  if (!workspaceId) return [];

  const client = supabaseClient ?? createClient();
  const { data, error } = await client
    .from("documents")
    .select(
      "id,title,slug,updated_at,created_at,version,type,status,published,workspace_id",
    )
    .eq("workspace_id", workspaceId)
    .eq("published", true)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as DocumentRow[]) ?? [];
}

/**
 * Fetch documents for a workspace with optional status filtering.
 *
 * - If `status` is omitted or `status === 'all'`, no status filter is applied.
 * - If `status` is provided (e.g. 'draft', 'published', 'archived'), the query
 *   will filter by `status`. When `status === 'published'`, the helper will
 *   also ensure `published = true` for safety.
 *
 * The `orderBy` behavior mirrors parts of the UI:
 * - when `status === 'all'` order by `updated_at`
 * - otherwise order by `created_at`
 */
export async function fetchDocumentsForWorkspace(
  workspaceId?: string | null,
  status?: string | null,
  supabaseClient?: ReturnType<typeof createClient>,
  limit = 100,
): Promise<DocumentRow[]> {
  if (!workspaceId) return [];

  const client = supabaseClient ?? createClient();
  try {
    let q = client
      .from("documents")
      .select(
        "id,title,slug,type,status,version,created_at,updated_at,published,workspace_id",
      )
      .eq("workspace_id", workspaceId);

    if (status && status !== "all") {
      q = q.eq("status", status);
      if (status === "published") {
        q = q.eq("published", true);
      }
    }

    const orderField = status === "all" ? "updated_at" : "created_at";
    q = q.order(orderField, { ascending: false }).limit(limit);

    const { data, error } = await q;
    if (error) throw error;
    return (data as DocumentRow[]) ?? [];
  } catch (err) {
    throw err;
  }
}

/**
 * Create a new document (server-side, uses service-role client unless svc provided).
 * Accepts a minimal payload; normalizes/validates slug externally if needed.
 *
 * Returns the created document row on success.
 * Throws Supabase error on failure.
 */
export async function createDocument(
  payload: {
    title: string;
    slug: string;
    content?: string | null;
    type?: string | null;
    version?: number | null;
    published?: boolean | null;
    workspace_id: string;
    parent_id?: string | null;
    status?: string | null;
    owner_id?: string | null;
  },
  svc?: ReturnType<typeof createServiceClient>,
): Promise<DocumentRow> {
  const service = svc ?? createServiceClient();

  const insertPayload: Record<string, any> = {
    title: payload.title?.trim(),
    slug: payload.slug,
    content:
      typeof payload.content !== "undefined" && payload.content !== null
        ? payload.content
        : "",
    type: payload.type ?? "other",
    version: Number(payload.version) || 1,
    published: !!payload.published,
    workspace_id: payload.workspace_id,
    parent_id: payload.parent_id ?? null,
    status: payload.status ?? "draft",
    owner_id: payload.owner_id ?? null,
  };

  const { data: created, error: insertErr } = await service
    .from("documents")
    .insert(insertPayload)
    .select()
    .single();

  if (insertErr) throw insertErr;
  return created as DocumentRow;
}

/**
 * Update an existing document by id (server-side; uses service client by default).
 * `updates` is a partial set of columns to update. Returns the updated row.
 */
export async function updateDocument(
  id: string,
  updates: Record<string, any>,
  svc?: ReturnType<typeof createServiceClient>,
): Promise<DocumentRow> {
  if (!id) throw new Error("updateDocument: id required");
  const service = svc ?? createServiceClient();

  const { data: updated, error } = await service
    .from("documents")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return updated as DocumentRow;
}

/**
 * Permanently delete a document by id (server-side).
 * Returns the deleted row on success.
 */
export async function deleteDocumentPermanently(
  id: string,
  svc?: ReturnType<typeof createServiceClient>,
): Promise<DocumentRow> {
  if (!id) throw new Error("deleteDocumentPermanently: id required");
  const service = svc ?? createServiceClient();

  const { data: deleted, error } = await service
    .from("documents")
    .delete()
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return deleted as DocumentRow;
}

/**
 * Server-side variant to fetch published documents for a workspace.
 *
 * This helper is intended for server code and accepts an optional service-role
 * Supabase client. It mirrors `fetchPublishedDocumentsForWorkspace` but uses the
 * provided `svc` (or creates one via `createServiceClient()`) to ensure server
 * privileges are available when needed.
 */
export async function fetchPublishedDocumentsForWorkspaceServer(
  workspaceId?: string | null,
  svc?: ReturnType<typeof createServiceClient>,
  limit = 100,
): Promise<DocumentRow[]> {
  if (!workspaceId) return [];

  const client = svc ?? createServiceClient();
  const { data, error } = await client
    .from("documents")
    .select(
      "id,title,slug,updated_at,created_at,version,type,status,published,workspace_id",
    )
    .eq("workspace_id", workspaceId)
    .eq("published", true)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as DocumentRow[]) ?? [];
}

/**
 * Fetch workspace document counts (total, published, drafts, archived).
 *
 * Returns an object with numeric counts. Uses head queries with exact counts for
 * efficiency. Throws on underlying query errors.
 */
export async function fetchWorkspaceDocumentCounts(
  workspaceId?: string | null,
  supabaseClient?: ReturnType<typeof createClient>,
): Promise<{
  all: number;
  published: number;
  drafts: number;
  archived: number;
}> {
  if (!workspaceId) {
    return { all: 0, published: 0, drafts: 0, archived: 0 };
  }

  const client = supabaseClient ?? createClient();

  // Perform head/count queries in sequence. Using parallel requests is possible
  // but sequencing keeps error-handling straightforward and matches existing patterns.
  const totalRes = await client
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);

  if (totalRes.error) throw totalRes.error;
  const allCount = Number(totalRes.count ?? 0);

  const publishedRes = await client
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("status", "published");

  if (publishedRes.error) throw publishedRes.error;
  const publishedCount = Number(publishedRes.count ?? 0);

  const draftsRes = await client
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("status", "draft");

  if (draftsRes.error) throw draftsRes.error;
  const draftsCount = Number(draftsRes.count ?? 0);

  const archivedRes = await client
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("status", "archived");

  if (archivedRes.error) throw archivedRes.error;
  const archivedCount = Number(archivedRes.count ?? 0);

  return {
    all: allCount,
    published: publishedCount,
    drafts: draftsCount,
    archived: archivedCount,
  };
}
