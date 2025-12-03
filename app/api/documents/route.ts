import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import {
  createDocument,
  deleteDocumentPermanently,
  fetchDocumentById,
  fetchDocumentBySlug,
  isValidSlug,
  makeUniqueSlug,
  normalizeSlug,
  updateDocument,
} from "@/lib/documents";
import { FREE_PLAN_LIMITS, isFreePlan, PRO_PLAN_LIMITS } from "@/lib/limits";
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
  id?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const {
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

    const sessionSupabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await sessionSupabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

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

    const { canCreateDocuments } = await import("@/lib/subscription");
    if (!canCreateDocuments(workspace)) {
      return NextResponse.json(
        {
          error: "Subscription payment required",
          message:
            "Your subscription has a payment issue. Please update your payment method to continue creating documents.",
        },
        { status: 402 }, // Payment Required
      );
    }

    const isFree = await isFreePlan(workspace.plan);
    const limit = isFree
      ? FREE_PLAN_LIMITS.documents
      : PRO_PLAN_LIMITS.documents;

    if (Number.isFinite(limit)) {
      const { count, error: countError } = await svc
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspace.id)
        .neq("status", "archived"); // Don't count archived docs

      if (countError) {
        console.error("Error counting documents:", countError);
        return NextResponse.json(
          { error: "Failed to validate plan limits" },
          { status: 500 },
        );
      }

      if ((count ?? 0) >= limit) {
        const planName = isFree ? "Free" : "Pro";
        const upgradeMessage = isFree
          ? " Please upgrade to Pro for unlimited documents."
          : "";
        return NextResponse.json(
          {
            error: "Plan limit reached",
            message: `${planName} plan is limited to ${limit} documents.${upgradeMessage}`,
          },
          { status: 403 },
        );
      }
    }

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
      const base = normalizeSlug(title);
      if (!base) {
        finalSlug = `doc-${Date.now()}`;
      } else {
        const candidate = base.substring(0, 64);
        const unique = await makeUniqueSlug(svc, candidate, workspace_id);
        finalSlug = unique;
      }
    }

    const insertPayload: Record<string, any> = {
      title: title.trim(),
      slug: finalSlug,
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

    let created: any;
    let insertErr: any = null;

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
    } catch (e) {
      insertErr = e;
    }

    if (insertErr) {
      const msg = insertErr?.message ?? String(insertErr);
      if (
        String(msg).toLowerCase().includes("duplicate") ||
        String(msg).toLowerCase().includes("unique")
      ) {
        try {
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
        } catch (_e) {}

        try {
          if (workspace_id) {
            const baseCandidate =
              typeof finalSlug === "string" && finalSlug.trim().length > 0
                ? finalSlug
                : normalizeSlug(title) || `doc-${Date.now()}`;
            const candidate = baseCandidate.substring(0, 64);

            const unique = await makeUniqueSlug(svc, candidate, workspace_id);
            if (unique && unique !== finalSlug) {
              insertPayload.slug = unique;

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
        }

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

    try {
      const createdWorkspaceId = created?.workspace_id ?? null;
      if (!created || String(createdWorkspaceId) !== String(workspace_id)) {
        console.warn(
          "POST /api/documents - created document workspace mismatch, attempting cleanup",
          { expected: workspace_id, got: createdWorkspaceId, created },
        );
        try {
          if (created?.id) {
            await deleteDocumentPermanently(String(created.id), svc);
          }
        } catch (delErr) {
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
      console.error(
        "POST /api/documents - verification check failed",
        verifyErr,
      );
      try {
        if (created?.id) {
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
    Sentry.captureException(err, {
      tags: { api_route: "documents", method: "POST" },
    });
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

export async function PUT(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;

    let docId: string | undefined;
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
      } catch {}
    }

    if (!docId) {
      return NextResponse.json(
        { error: "Missing document id. Provide `id` in body." },
        { status: 400 },
      );
    }

    const sessionSupabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await sessionSupabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const svc = createServiceClient();

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

    if (String(existing.owner_id) !== String(user.id)) {
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

    const { data: workspace, error: workspaceError } = await svc
      .from("workspaces")
      .select("id, plan")
      .eq("id", currentDoc?.workspace_id)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 },
      );
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof body.content !== "undefined" && body.content !== null) {
      updatePayload.content = body.content;
    }

    if (typeof body.title === "string" && body.title.trim().length > 0) {
      updatePayload.title = body.title.trim();
    }

    if (typeof body.status === "string" && body.status.trim().length > 0) {
      const newStatus = body.status;
      const currentStatus = currentDoc?.status;

      if (currentStatus === "archived" && newStatus !== "archived") {
        const isFree = await isFreePlan(workspace.plan);

        if (isFree) {
          const { count } = await svc
            .from("documents")
            .select("*", { count: "exact", head: true })
            .eq("workspace_id", workspace.id)
            .neq("status", "archived");

          if ((count ?? 0) >= FREE_PLAN_LIMITS.documents) {
            return NextResponse.json(
              {
                error: "Free plan limit reached",
                message:
                  "Free plan is limited to 3 active documents. Archive other documents first or upgrade to Pro.",
              },
              { status: 403 },
            );
          }
        }
      }

      updatePayload.status = body.status;
    }

    if (typeof body.published === "boolean") {
      const requestedPublished = !!body.published;
      const currentlyPublished = !!currentDoc?.published;

      updatePayload.published = requestedPublished;
      if (requestedPublished && !currentlyPublished) {
        updatePayload.published_at = new Date().toISOString();
      }
      if (!requestedPublished && currentlyPublished) {
        updatePayload.published_at = null;
      }
    }

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
    Sentry.captureException(err, {
      tags: { api_route: "documents", method: "PUT" },
    });
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
export async function DELETE(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;

    let docId: string | undefined;
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
      } catch {}
    }

    if (!docId) {
      return NextResponse.json(
        { error: "Missing document id" },
        { status: 400 },
      );
    }

    const sessionSupabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await sessionSupabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const svc = createServiceClient();

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

    if (existing.status !== "archived") {
      return NextResponse.json(
        { error: "Can only delete archived documents" },
        { status: 400 },
      );
    }

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
    Sentry.captureException(err, {
      tags: { api_route: "documents", method: "DELETE" },
    });
    return NextResponse.json(
      { error: "Server error", detail: String(err) },
      { status: 500 },
    );
  }
}
