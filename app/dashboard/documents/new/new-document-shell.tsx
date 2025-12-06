"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { DocumentTemplateDialog } from "@/components/document-template-dialog";
import { documentTemplates } from "@/components/document-templates";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { FieldGroup } from "@/components/ui/field-shadcn";
import { Input } from "@/components/ui/input";
import {
  readSelectedWorkspaceId,
  writeSelectedWorkspaceId,
} from "@/lib/workspace";
import type { DocumentType } from "@/types/documents";

export default function NewDocumentShell({
  workspaceId: propWorkspaceId,
}: {
  workspaceId?: string;
  ownerId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [_slugDirty, setSlugDirty] = useState(false);
  const [type, setType] = useState<DocumentType>("blank");
  const [parentId, _setParentId] = useState<string | null>(null);
  const [version] = useState<number>(1);
  const [dialogOpen, setDialogOpen] = useState(false);

  function getTemplateForType(t: DocumentType, titleText: string) {
    const template =
      documentTemplates.find((dt) => dt.id === t) ||
      documentTemplates.find((dt) => dt.id === "blank");
    const base = template?.content || [];
    const copy = JSON.parse(JSON.stringify(base));
    try {
      if (Array.isArray(copy) && copy.length > 0) {
        const first = copy[0];
        if (
          first &&
          first.type === "h1" &&
          Array.isArray(first.children) &&
          first.children.length > 0
        ) {
          first.children[0].text = titleText || "Document";
        }
      }
    } catch {}
    return copy;
  }

  const [error, setError] = useState<string | null>(null);
  const [_successUrl, setSuccessUrl] = useState<string | null>(null);

  const workspaceId =
    propWorkspaceId ??
    (typeof window !== "undefined"
      ? (readSelectedWorkspaceId() ??
        searchParams?.get("workspaceId") ??
        undefined)
      : (searchParams?.get("workspaceId") ?? undefined));

  const SLUG_REGEX = /^[a-z0-9-]+$/;

  function handleSlugChange(value: string) {
    const raw = String(value ?? "");
    const lower = raw.toLowerCase();
    const withSpacesToDashes = lower.replace(/\s+/g, "-");
    const cleaned = withSpacesToDashes.replace(/[^a-z0-9-]/g, "");
    setSlug(cleaned);
    setSlugDirty(true);
  }

  function handleSlugBlur() {
    const normalized = String(slug ?? "")
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-");
    if (normalized !== slug) setSlug(normalized);
  }

  function validate(): string | null {
    if (!workspaceId) return "Missing workspace. Provide a Workspace ID.";
    if (!title.trim()) return "Title is required.";
    if (!slug.trim()) return "Slug is required.";
    if (!SLUG_REGEX.test(slug)) {
      return "Slug can only contain lowercase letters, numbers and dashes.";
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const clientValidation = validate();
    if (clientValidation) {
      setError(clientValidation);
      return;
    }

    const payload: Record<string, any> = {
      title: title.trim(),
      slug: slug.trim(),
      type,
      published: false,
      version,
      workspace_id: workspaceId,
      parent_id: parentId || null,
      status: "draft",
      content: JSON.stringify(getTemplateForType(type, title.trim())),
    };

    startTransition(async () => {
      try {
        const res = await fetch("/api/documents", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const text = await res.text();
        let data: any;
        try {
          data = JSON.parse(text);
        } catch (_e) {
          // ignore
        }

        if (res.ok && data) {
          const doc = data.document || data;
          const docId = doc?.id;
          const docSlug = doc?.slug ?? slug;

          const targetUrl = `/dashboard/d/${docSlug || docId}`;

          setSuccessUrl(`/dashboard/documents/${docSlug || docId}`);
          try {
            if (typeof window !== "undefined") {
              writeSelectedWorkspaceId(workspaceId);
              try {
                window.dispatchEvent(
                  new CustomEvent("workspace-changed", {
                    detail: { id: workspaceId ?? null },
                  }),
                );
                window.dispatchEvent(new CustomEvent("document-updated"));
              } catch (evErr) {
                console.warn(
                  "NewDocumentShell: failed to dispatch events",
                  evErr,
                );
              }
            }
          } catch (e) {
            console.warn(
              "NewDocumentShell: failed to persist workspace selection",
              e,
            );
          }
          router.push(targetUrl);
        } else {
          console.error("Create failed response:", data || text);
          if (res.status === 409) {
            setError(
              data?.message ??
                "Slug already in use. Pick a different slug and try again.",
            );
          } else {
            setError(
              data?.message ?? data?.error ?? "Failed to create document.",
            );
          }
        }
      } catch (err: any) {
        console.error("Create error:", err);
        setError(err?.message ?? "Network error while creating document.");
      }
    });
  }

  useEffect(() => {
    if (!workspaceId) {
      setError(
        "No workspace selected. Add ?workspaceId=... to the URL or pass it as a prop.",
      );
    } else {
      setError(null);
    }
  }, [workspaceId]);

  const selectedTemplate =
    documentTemplates.find((t) => t.id === type) || documentTemplates[0];

  return (
    <form
      className="w-full max-w-[500px] rounded-xl border bg-card"
      onSubmit={handleSubmit}
    >
      <DocumentTemplateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSelect={(t) => setType(t.id)}
        selectedTemplateId={type}
      />
      <div className="flex flex-col items-center justify-center gap-6 rounded-t-xl border-b bg-accent/60 py-8">
        <div className="flex flex-col items-center space-y-1">
          <h2 className="font-medium text-2xl">Create a document</h2>
          <p className="max-w-[80%] text-center text-muted-foreground text-sm">
            Create a new document for this workspace (policies, terms, etc.).
          </p>
        </div>
      </div>

      <FieldGroup className="flex gap-4 p-4">
        <Field className="gap-2">
          <FieldLabel htmlFor="title">Document Title</FieldLabel>
          <Input
            autoComplete="off"
            id="title"
            placeholder="e.g. Privacy Policy"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <FieldDescription>
            The human friendly name for your document.
          </FieldDescription>
        </Field>

        <Field className="gap-2">
          <FieldLabel htmlFor="slug">Slug (URL)</FieldLabel>
          <Input
            id="slug"
            placeholder="e.g. privacy-policy"
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            onBlur={handleSlugBlur}
            autoComplete="off"
          />
          <FieldDescription>
            The slug will be used in the document URL. Lowercase letters,
            numbers and dashes only.
          </FieldDescription>
        </Field>

        <Field className="flex flex-col gap-2">
          <FieldLabel>Document Template</FieldLabel>
          <div className="flex w-full items-center justify-between gap-2 rounded-xl border p-1 px-2">
            <div className="flex w-full items-center gap-3 overflow-hidden">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent">
                <selectedTemplate.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex flex-col overflow-hidden truncate">
                <div className="truncate font-medium text-sm">
                  {selectedTemplate.label}
                </div>
                <div className="truncate text-muted-foreground text-xs">
                  {selectedTemplate.description}
                </div>
              </div>
            </div>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => setDialogOpen(true)}
            >
              Change
            </Button>
          </div>
        </Field>
      </FieldGroup>

      <div className="w-full rounded-b-xl border-t bg-accent/60 p-4">
        {error ? (
          <div className="mb-2 text-destructive text-sm">{error}</div>
        ) : null}

        <div className="flex w-full justify-end gap-2">
          <Link href={"/dashboard"}>
            <Button variant={"outline"}>Cancel</Button>
          </Link>
          <Button
            type="submit"
            disabled={
              isPending ||
              Boolean(validate()) ||
              !workspaceId ||
              slug.length === 0 ||
              title.length === 0
            }
          >
            {isPending ? "Creating…" : "Create Document"}
          </Button>
        </div>
      </div>
    </form>
  );
}
