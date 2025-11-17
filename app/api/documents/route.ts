import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { fetchWorkspaceByIdServer } from "@/lib/workspace";

type Body = {
  title?: string;
  slug?: string | null;
  content?: string;
  type?: string;
  workspace_id?: string;
  parent_id?: string | null;
  published?: boolean;
  version?: number;
  status?: string;
};

function normalizeSlug(raw: string) {
  return raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isValidSlug(s: string) {
  // start with alnum, then alnum or dash, max 64 chars
  return /^[a-z0-9][a-z0-9-]{0,63}$/.test(s);
}

// Try to produce a unique slug by appending a counter when needed.
async function makeUniqueSlug(
  svc: ReturnType<typeof createServiceClient>,
  base: string,
): Promise<string> {
  let candidate = base;
  let attempt = 0;
  while (attempt < 20) {
    // case-insensitive check
    const { data, error } = await svc
      .from("documents")
      .select("id")
      .ilike("slug", candidate)
      .limit(1);

    if (error) {
      // if the check fails for any reason, give up and return the base candidate
      console.warn(
        "Slug uniqueness check failed, proceeding with candidate:",
        error,
      );
      return candidate;
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
      return candidate;
    }

    attempt += 1;
    candidate = `${base}-${attempt}`;
  }

  return `${base}-${Date.now()}`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    console.debug("POST /api/documents - received body:", body);
    let {
      title,
      slug: rawSlug,
      content,
      type,
      workspace_id,
      parent_id,
      published = false,
      version = 1,
      status = "draft",
    } = body;

    // Basic validation (content is optional)
    if (!title || !title.trim()) {
      console.debug("POST /api/documents - validation failed: missing title");
      return NextResponse.json(
        {
          error: "Missing required field",
          field: "title",
          message: "Title is required",
        },
        { status: 400 },
      );
    }
    // `workspace_id` may be omitted. If it is not provided we will attempt to
    // resolve the user's first workspace after authentication so the UI can
    // simply call this endpoint without pre-populating workspaceId.
    // Note: `content` is optional for documents. If omitted, the document will be created without a body.

    // Get the authenticated user (server session)
    const sessionSupabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await sessionSupabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify workspace exists and user is the owner (authorization)
    const workspace = await fetchWorkspaceByIdServer(workspace_id as string);
    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 },
      );
    }
    if (String(workspace.owner_id) !== String(user.id)) {
      return NextResponse.json(
        { error: "Forbidden: not workspace owner" },
        { status: 403 },
      );
    }

    const svc = createServiceClient();

    // Slug handling: use provided slug or generate from title
    let finalSlug: string | null = null;
    if (typeof rawSlug === "string" && rawSlug.trim().length > 0) {
      const normalized = normalizeSlug(rawSlug);
      if (!isValidSlug(normalized)) {
        console.debug("POST /api/documents - invalid slug format:", {
          rawSlug,
          normalized,
        });
        return NextResponse.json(
          {
            error: "Invalid slug format",
            message:
              "Slug must start with a letter or number and contain only lowercase letters, numbers, and dashes (max 64 chars)",
          },
          { status: 400 },
        );
      }

      // Check uniqueness across documents
      const { data: existing, error: checkErr } = await svc
        .from("documents")
        .select("id")
        .ilike("slug", normalized)
        .limit(1);

      if (checkErr) {
        console.error("Error checking documents slug uniqueness:", checkErr);
        return NextResponse.json(
          { error: "Failed to validate slug" },
          { status: 500 },
        );
      }

      if (existing && Array.isArray(existing) && existing.length > 0) {
        console.debug(
          "POST /api/documents - slug conflict (existing document found):",
          { normalized },
        );
        return NextResponse.json(
          {
            error: "Slug already in use",
            message: "The provided slug is already taken by another document",
          },
          { status: 409 },
        );
      }

      finalSlug = normalized;
    } else {
      // generate from title
      const base = normalizeSlug(title);
      if (!base) {
        // fallback to timestamp-based slug
        finalSlug = `doc-${Date.now()}`;
      } else {
        const candidate = base.substring(0, 64);
        const unique = await makeUniqueSlug(svc, candidate);
        finalSlug = unique;
      }
    }

    // Insert into documents
    const insertPayload: Record<string, any> = {
      title: title.trim(),
      slug: finalSlug,
      // Ensure `content` is always a non-null string to satisfy the DB NOT NULL constraint.
      // If the client did not provide content, default to an empty string.
      content:
        typeof content !== "undefined" && content !== null ? content : "",
      type: type ?? "other",
      published: !!published,
      version: Number(version) || 1,
      workspace_id,
      parent_id: parent_id ?? null,
      status: status ?? "draft",
      owner_id: user.id,
    };

    const { data: created, error: insertErr } = await svc
      .from("documents")
      .insert(insertPayload)
      .select()
      .single();

    if (insertErr) {
      // handle unique constraint race (slug) — return 409 so caller can retry
      const msg = insertErr?.message ?? String(insertErr);
      if (
        String(msg).toLowerCase().includes("duplicate") ||
        String(msg).toLowerCase().includes("unique")
      ) {
        console.debug(
          "POST /api/documents - slug unique constraint race detected:",
          { msg, insertPayload },
        );
        return NextResponse.json(
          {
            error: "Slug already in use",
            message:
              "A document with this slug already exists (race condition)",
          },
          { status: 409 },
        );
      }

      console.error("Error inserting document:", insertErr);
      console.debug(
        "POST /api/documents - failed insert payload:",
        insertPayload,
      );
      // Return a clearer error payload for easier client debugging (include message)
      return NextResponse.json(
        {
          error: "Failed to create document",
          message: "Database insertion failed when creating document",
          detail: insertErr?.message ?? String(insertErr),
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, document: created }, { status: 201 });
  } catch (err) {
    console.error("Server error in /api/documents:", err);
    console.debug("POST /api/documents - full error", err);
    return NextResponse.json(
      {
        error: "Server error",
        message: "Unexpected server error processing request",
        detail: String(err),
      },
      { status: 500 },
    );
  }
}
