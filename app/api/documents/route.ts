import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  createDocument,
  fetchDocumentBySlug,
  fetchDocumentById,
  makeUniqueSlug,
  updateDocument,
  deleteDocumentPermanently,
  normalizeSlug,
  isValidSlug,
} from "@/lib/documents";
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
  id?: string;
};

// (normalizeSlug/isValidSlug import merged above)

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
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
        return NextResponse.json(
          {
            error: "Invalid slug format",
            message:
              "Slug must start with a letter or number and contain only lowercase letters, numbers, and dashes (max 64 chars)",
          },
          { status: 400 },
        );
      }

      // Check uniqueness across documents using centralized helper.
      // Use fetchDocumentBySlug which scopes to workspace when provided.
      let existing: any = null;
      let checkErr: any = null;
      try {
        existing = await fetchDocumentBySlug(normalized, workspace_id, svc);
      } catch (e: any) {
        checkErr = e;
      }

      if (checkErr) {
        console.error("Error checking documents slug uniqueness:", checkErr);
        return NextResponse.json(
          { error: "Failed to validate slug" },
          { status: 500 },
        );
      }

      // fetchDocumentBySlug returns a single row or null
      if (existing) {
        return NextResponse.json(
          {
            error: "Slug already in use",
            message:
              "The provided slug is already taken by another document in this workspace",
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
        const unique = await makeUniqueSlug(svc, candidate, workspace_id);
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

    // Use centralized helper to create a document using the service client.
    // This preserves behavior while consolidating creation logic in lib/documents.
    let created;
    let insertErr: any = null;

    // Debug: log the insertion context to help isolate workspace mismatch issues.
    // This will show what workspace_id we expect, what payload is sent, and the authenticated user id.
    // debug logs removed

    try {
      created = await createDocument(
        {
          title: insertPayload.title,
          slug: insertPayload.slug,
          content: insertPayload.content,
          type: insertPayload.type,
          version: insertPayload.version,
          published: insertPayload.published,
          workspace_id: insertPayload.workspace_id,
          parent_id: insertPayload.parent_id,
          status: insertPayload.status,
          owner_id: insertPayload.owner_id,
        },
        svc,
      );

      // Debug: log the created row returned from createDocument
      // debug logs removed
    } catch (e) {
      // Capture the Supabase error for downstream inspection/handling (preserve previous behavior).
      insertErr = e;
      // debug logs removed
    }

    if (insertErr) {
      // handle unique constraint race (slug) — try to detect whether the conflict
      // originates from a document in another workspace (global unique constraint),
      // and advise a DB migration; otherwise attempt a workspace-scoped retry.
      const msg = insertErr?.message ?? String(insertErr);
      if (
        String(msg).toLowerCase().includes("duplicate") ||
        String(msg).toLowerCase().includes("unique")
      ) {
        // Try to inspect the conflicting row (best-effort). If the conflicting row
        // belongs to a different workspace, this likely indicates a global unique
        // constraint on `slug` is present in the DB (e.g. `slug UNIQUE`) and you'll
        // need the composite (workspace_id, lower(slug)) migration to allow per-workspace slugs.
        try {
          // Inspect the conflicting row using centralized helper (best-effort).
          let conflictRow: any = null;
          let conflictErr: any = null;
          try {
            conflictRow = await fetchDocumentBySlug(
              String(finalSlug),
              undefined,
              svc,
            );
          } catch (e: any) {
            conflictErr = e;
          }

          if (!conflictErr && conflictRow) {
            // If conflicting row exists in a different workspace, return explanatory error
            if (
              workspace_id &&
              String(conflictRow.workspace_id) !== String(workspace_id)
            ) {
              console.warn(
                "POST /api/documents - conflict appears to come from another workspace",
                { conflictRow, workspace_id },
              );
              return NextResponse.json(
                {
                  error: "Slug conflict with document in another workspace",
                  message:
                    "The database has a unique constraint on `slug` globally which prevents creating the same slug in different workspaces. Apply the migration to add a composite unique index on (workspace_id, lower(slug)) so slugs are unique per workspace, then retry. If you need help, run the migration file in /db/migrations.",
                  conflicting_workspace_id: conflictRow.workspace_id ?? null,
                },
                { status: 409 },
              );
            }
          }
        } catch (e) {
          // ignore errors from conflict inspection and fall back to retry logic below
        }

        // If we reach here, either the conflict came from the same workspace or we couldn't
        // determine the source. Attempt a single workspace-scoped retry if we have workspace_id.
        try {
          if (workspace_id) {
            const baseCandidate =
              typeof finalSlug === "string" && finalSlug.trim().length > 0
                ? finalSlug
                : normalizeSlug(title) || `doc-${Date.now()}`;
            const candidate = baseCandidate.substring(0, 64);

            // attempting workspace-scoped retry for slug

            const unique = await makeUniqueSlug(svc, candidate, workspace_id);
            if (unique && unique !== finalSlug) {
              insertPayload.slug = unique;

              // Attempt retry using centralized createDocument helper
              let retryCreated: any = null;
              let retryErr: any = null;
              try {
                retryCreated = await createDocument(
                  {
                    title: insertPayload.title,
                    slug: insertPayload.slug,
                    content: insertPayload.content,
                    type: insertPayload.type,
                    version: insertPayload.version,
                    published: insertPayload.published,
                    workspace_id: insertPayload.workspace_id,
                    parent_id: insertPayload.parent_id,
                    status: insertPayload.status,
                    owner_id: insertPayload.owner_id,
                  },
                  svc,
                );
              } catch (e: any) {
                retryErr = e;
              }

              if (!retryErr && retryCreated) {
                // Successful retry — return the created document
                return NextResponse.json(
                  { ok: true, document: retryCreated },
                  { status: 201 },
                );
              }
            } else {
            }
          }
        } catch (e) {
          console.error(
            "POST /api/documents - workspace-scoped retry failed:",
            e,
          );
          // continue to return conflict below
        }

        // Generic conflict fallback
        return NextResponse.json(
          {
            error: "Slug already in use",
            message:
              "A document with this slug already exists (race condition or constraint).",
          },
          { status: 409 },
        );
      } else {
        console.error("Error inserting document:", insertErr);
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
    }

    // Verify the created row belongs to the resolved workspace_id. This is a
    // defensive check: if the created row's `workspace_id` does not match the
    // workspace we validated earlier, remove the row and return an error so the
    // caller can retry. This guards against races or unexpected DB-level defaults.
    try {
      const createdWorkspaceId = created?.workspace_id ?? null;
      if (!created || String(createdWorkspaceId) !== String(workspace_id)) {
        console.warn(
          "POST /api/documents - created document workspace mismatch, attempting cleanup",
          { expected: workspace_id, got: createdWorkspaceId, created },
        );
        // Attempt best-effort deletion of the orphaned/incorrectly-scoped row.
        try {
          if (created && created.id) {
            await deleteDocumentPermanently(String(created.id), svc);
          }
        } catch (delErr) {
          // Log deletion failure but continue to return an error; do not attempt
          // further retries here to avoid unexpected side effects.
          console.error(
            "POST /api/documents - failed to delete mismatched created document",
            delErr,
          );
        }

        return NextResponse.json(
          {
            error: "Workspace mismatch",
            message:
              "Document was created but does not belong to the expected workspace. The created document was removed. Please retry the request.",
            created: created ?? null,
          },
          { status: 500 },
        );
      }
    } catch (verifyErr) {
      // If verification throws for any reason, try to clean up and return an error.
      console.error(
        "POST /api/documents - verification check failed",
        verifyErr,
      );
      try {
        if (created && created.id) {
          await deleteDocumentPermanently(String(created.id), svc);
        }
      } catch (delErr) {
        console.error(
          "POST /api/documents - cleanup after verification failure also failed",
          delErr,
        );
      }
      return NextResponse.json(
        {
          error: "Verification failure",
          message:
            "Document was created but there was an unexpected error verifying its workspace. The created document was removed. Please retry.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, document: created }, { status: 201 });
  } catch (err) {
    console.error("Server error in /api/documents:", err);
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

// PUT /api/documents — update a document (requires authentication and proper ownership)
export async function PUT(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;

    // Try to determine document id from body or URL path
    let docId: string | undefined = undefined;
    if (body && typeof body.id === "string" && body.id.trim().length > 0) {
      docId = body.id;
    } else {
      try {
        const url = new URL(req.url);
        const parts = url.pathname.split("/").filter(Boolean);
        // find last segment after 'documents'
        const idx = parts.lastIndexOf("documents");
        if (idx >= 0 && parts.length > idx + 1) {
          docId = parts[idx + 1];
        }
      } catch {
        // ignore URL parse errors
      }
    }

    if (!docId) {
      return NextResponse.json(
        { error: "Missing document id. Provide `id` in body." },
        { status: 400 },
      );
    }

    // content is optional; only add to updatePayload if provided in the request body

    // Ensure authenticated user
    const sessionSupabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await sessionSupabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const svc = createServiceClient();

    // Fetch the existing document so we can authorize the update
    // Fetch existing document using centralized helper
    let existing: any = null;
    let fetchErr: any = null;
    try {
      existing = await fetchDocumentById(docId, svc);
    } catch (e: any) {
      fetchErr = e;
    }

    if (fetchErr) {
      console.error("Failed to fetch document for update:", fetchErr);
      return NextResponse.json(
        { error: "Failed to fetch document" },
        { status: 500 },
      );
    }

    if (!existing) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    // Authorization: allow update if the user is the document owner or the workspace owner
    if (String(existing.owner_id) !== String(user.id)) {
      // verify workspace owner as a fallback
      try {
        const workspace = await fetchWorkspaceByIdServer(existing.workspace_id);
        if (!workspace || String(workspace.owner_id) !== String(user.id)) {
          return NextResponse.json(
            { error: "Forbidden: not document or workspace owner" },
            { status: 403 },
          );
        }
      } catch (e) {
        console.error("Failed to validate workspace ownership:", e);
        return NextResponse.json(
          { error: "Failed to validate permissions" },
          { status: 500 },
        );
      }
    }

    // Perform the update (persist content, status, published, published_at and updated_at)
    // Fetch current publication state to decide whether to set/clear published_at
    // Fetch current document state using centralized helper (returns full row)
    let currentDoc: any = null;
    let currentErr: any = null;
    try {
      currentDoc = await fetchDocumentById(docId, svc);
    } catch (e: any) {
      currentErr = e;
    }

    if (currentErr) {
      console.error("Failed to fetch current document state:", currentErr);
      return NextResponse.json(
        { error: "Failed to fetch document" },
        { status: 500 },
      );
    }

    const updatePayload: Record<string, any> = {
      // set updated_at to now so the "last edited" column reflects the save time
      updated_at: new Date().toISOString(),
    };

    // content (optional)
    if (typeof body.content !== "undefined" && body.content !== null) {
      updatePayload.content = body.content;
    }

    // Optional: update status if provided
    if (typeof body.status === "string" && body.status.trim().length > 0) {
      updatePayload.status = body.status;
    }

    // Optional: update published flag and manage published_at accordingly
    if (typeof body.published === "boolean") {
      const requestedPublished = !!body.published;
      const currentlyPublished = !!(currentDoc && currentDoc.published);

      updatePayload.published = requestedPublished;

      // if we're publishing now and it wasn't published before, set published_at
      if (requestedPublished && !currentlyPublished) {
        updatePayload.published_at = new Date().toISOString();
      }

      // if we're unpublishing and it was published before, clear published_at
      if (!requestedPublished && currentlyPublished) {
        updatePayload.published_at = null;
      }

      // if requestedPublished === currentlyPublished, we leave published_at untouched
    }

    // Perform update via centralized helper
    let updated: any = null;
    let updateErr: any = null;
    try {
      updated = await updateDocument(docId, updatePayload, svc);
    } catch (e: any) {
      updateErr = e;
    }

    if (updateErr) {
      console.error("Failed to update document:", updateErr);
      return NextResponse.json(
        {
          error: "Failed to update document",
          detail: updateErr?.message ?? String(updateErr),
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, document: updated }, { status: 200 });
  } catch (err) {
    console.error("Server error in /api/documents PUT:", err);
    return NextResponse.json(
      {
        error: "Server error",
        message: "Unexpected server error processing PUT request",
        detail: String(err),
      },
      { status: 500 },
    );
  }
}

// DELETE /api/documents - permanently delete an archived document
export async function DELETE(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;

    // Try to determine document id from body or URL path
    let docId: string | undefined = undefined;
    if (body && typeof body.id === "string" && body.id.trim().length > 0) {
      docId = body.id;
    } else {
      try {
        const url = new URL(req.url);
        const parts = url.pathname.split("/").filter(Boolean);
        const idx = parts.lastIndexOf("documents");
        if (idx >= 0 && parts.length > idx + 1) {
          docId = parts[idx + 1];
        }
      } catch {
        // ignore URL parse errors
      }
    }

    if (!docId) {
      return NextResponse.json(
        { error: "Missing document id" },
        { status: 400 },
      );
    }

    // Ensure authenticated user
    const sessionSupabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await sessionSupabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const svc = createServiceClient();

    // Fetch the existing document so we can authorize the deletion
    // Fetch document to delete using centralized helper
    let existing: any = null;
    let fetchErr: any = null;
    try {
      existing = await fetchDocumentById(docId, svc);
    } catch (e: any) {
      fetchErr = e;
    }

    if (fetchErr) {
      console.error("Failed to fetch document for deletion:", fetchErr);
      return NextResponse.json(
        { error: "Failed to fetch document" },
        { status: 500 },
      );
    }

    if (!existing) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    // Authorization: allow delete if the user is the document owner or the workspace owner
    if (String(existing.owner_id) !== String(user.id)) {
      try {
        const workspace = await fetchWorkspaceByIdServer(existing.workspace_id);
        if (!workspace || String(workspace.owner_id) !== String(user.id)) {
          return NextResponse.json(
            { error: "Forbidden: not owner" },
            { status: 403 },
          );
        }
      } catch (e) {
        console.error("Failed to validate workspace ownership:", e);
        return NextResponse.json(
          { error: "Failed to validate permissions" },
          { status: 500 },
        );
      }
    }

    // Only allow deletion when doc is archived to avoid accidental permanent deletes
    if (existing.status !== "archived") {
      return NextResponse.json(
        { error: "Can only delete archived documents" },
        { status: 400 },
      );
    }

    // Delete via centralized helper so any business logic and return shape are consistent.
    let deleted: any = null;
    let deleteErr: any = null;
    try {
      deleted = await deleteDocumentPermanently(docId, svc);
    } catch (e: any) {
      deleteErr = e;
    }

    if (deleteErr) {
      console.error("Failed to delete document:", deleteErr);
      return NextResponse.json(
        {
          error: "Failed to delete document",
          detail: deleteErr?.message ?? String(deleteErr),
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, document: deleted }, { status: 200 });
  } catch (err) {
    console.error("Server error in /api/documents DELETE:", err);
    return NextResponse.json(
      { error: "Server error", detail: String(err) },
      { status: 500 },
    );
  }
}
