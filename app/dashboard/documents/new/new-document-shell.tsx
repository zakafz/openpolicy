"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { contentTemplates } from "@/components/document-templates";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { FieldGroup } from "@/components/ui/field-shadcn";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  readSelectedWorkspaceId,
  writeSelectedWorkspaceId,
} from "@/lib/workspace";
import type { DocumentType } from "@/types/documents";
import {
  DOCUMENT_TYPE_ICON_MAP,
  DOCUMENT_TYPE_LABEL_MAP,
} from "@/lib/constants";

const documentTypes: {
  value: DocumentType;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
}[] = [
  {
    value: "privacy",
    label: DOCUMENT_TYPE_LABEL_MAP.privacy,
    description:
      "Details what personal data is collected, how it's used, and how it's protected.",
    icon: DOCUMENT_TYPE_ICON_MAP.privacy,
  },
  {
    value: "terms",
    label: DOCUMENT_TYPE_LABEL_MAP.terms,
    description:
      "An agreement that outlines the rules users must follow to use a website and service, which can include limitations on liability.",
    icon: DOCUMENT_TYPE_ICON_MAP.terms,
  },
  {
    value: "cookie",
    label: DOCUMENT_TYPE_LABEL_MAP.cookie,
    description: "Explains the use of cookies, what they are for.",
    icon: DOCUMENT_TYPE_ICON_MAP.cookie,
  },
  {
    value: "refund",
    label: DOCUMENT_TYPE_LABEL_MAP.refund,
    description: "Explains the refund policy for the product.",
    icon: DOCUMENT_TYPE_ICON_MAP.refund,
  },
  {
    value: "shipping",
    label: DOCUMENT_TYPE_LABEL_MAP.shipping,
    description: "Explains the shipping policy for the product.",
    icon: DOCUMENT_TYPE_ICON_MAP.shipping,
  },
  {
    value: "intellectual-property",
    label: DOCUMENT_TYPE_LABEL_MAP["intellectual-property"],
    description: "Explains the intellectual property policy for the product.",
    icon: DOCUMENT_TYPE_ICON_MAP["intellectual-property"],
  },
  {
    value: "data-protection",
    label: DOCUMENT_TYPE_LABEL_MAP["data-protection"],
    description: "Explains the data protection policy for the product.",
    icon: DOCUMENT_TYPE_ICON_MAP["data-protection"],
  },
  {
    value: "other",
    label: DOCUMENT_TYPE_LABEL_MAP.other,
    description: "Other type of document",
    icon: DOCUMENT_TYPE_ICON_MAP.other,
  },
];

export default function NewDocumentShell({
  // Optionally allow parent components to pass workspace/owner context
  workspaceId: propWorkspaceId,
  ownerId: propOwnerId,
}: {
  workspaceId?: string;
  ownerId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Basic form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugDirty, setSlugDirty] = useState(false);
  const [type, setType] = useState<DocumentType>("privacy");
  const [published, setPublished] = useState(false);
  const [parentId, setParentId] = useState<string | null>(null);
  const [status, setStatus] = useState<"draft" | "published" | "archived">(
    "draft",
  );
  const [version] = useState<number>(1);

  function getTemplateForType(t: DocumentType, titleText: string) {
    const base = contentTemplates[t] ?? contentTemplates.other;
    const copy = JSON.parse(JSON.stringify(base));
    try {
      if (copy && Array.isArray(copy.content) && copy.content.length > 0) {
        const first = copy.content[0];
        if (first && first.type === "heading") {
          first.content = [
            { type: "text", text: titleText || "Document name" },
          ];
        }
      }
    } catch {
      // fallback: do nothing
    }
    return copy;
  }

  const [error, setError] = useState<string | null>(null);
  const [successUrl, setSuccessUrl] = useState<string | null>(null);

  // derive workspaceId: prefer prop -> persisted selected workspace -> query param -> undefined
  // Use persisted selection (localStorage) when available so the New Document form opens
  // with the user's current workspace selection rather than an out-of-date query param.
  const workspaceId =
    propWorkspaceId ??
    (typeof window !== "undefined"
      ? (readSelectedWorkspaceId() ??
        searchParams?.get("workspaceId") ??
        undefined)
      : (searchParams?.get("workspaceId") ?? undefined));

  // Slug validation (allow lowercase letters, numbers and dashes)
  const SLUG_REGEX = /^[a-z0-9-]+$/;

  // On input: convert to lowercase, replace spaces with dashes and remove invalid chars.
  // This mirrors the workspace slug behavior: do not collapse dashes or trim here so users
  // can continue typing freely.
  function handleSlugChange(value: string) {
    const raw = String(value ?? "");
    const lower = raw.toLowerCase();
    const withSpacesToDashes = lower.replace(/\s+/g, "-");
    const cleaned = withSpacesToDashes.replace(/[^a-z0-9-]/g, "");
    setSlug(cleaned);
    setSlugDirty(true);
  }

  // On blur: collapse consecutive dashes but DO NOT trim leading/trailing dashes.
  // This matches the workspace form behavior where an ending dash is allowed.
  function handleSlugBlur() {
    const normalized = String(slug ?? "")
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-");
    if (normalized !== slug) setSlug(normalized);
  }

  // Basic client-side validation:
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

    // Prepare payload matching the `documents` table columns we care about
    const payload: Record<string, any> = {
      title: title.trim(),
      slug: slug.trim(),
      type,
      published,
      version,
      workspace_id: workspaceId,
      parent_id: parentId || null,
      status,
      // Set initial content using the template for the selected type. Persist as a JSON string
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

        if (res.ok) {
          const data = await res.json();
          // Expect server to return created document (id/slug/etc)
          const docId = data?.id;
          const docSlug = data?.slug ?? slug;
          setSuccessUrl(`/dashboard/documents/${docId ?? docSlug}`);
          // Persist the selected workspace and broadcast change so other tabs/components pick it up.
          // Do this before navigation to ensure the UI is in the correct workspace when the new
          // document page loads (prevents immediate "Access Denied" caused by stale selection).
          try {
            if (typeof window !== "undefined") {
              writeSelectedWorkspaceId(workspaceId);
              try {
                window.dispatchEvent(
                  new CustomEvent("workspace-changed", {
                    detail: { id: workspaceId ?? null },
                  }),
                );
                // Dispatch document-updated to refresh sidebar counts
                window.dispatchEvent(new CustomEvent("document-updated"));
              } catch (evErr) {
                // Non-fatal: dispatch failure should not block navigation.
                console.warn(
                  "NewDocumentShell: failed to dispatch events",
                  evErr,
                );
              }
            }
          } catch (e) {
            // Non-fatal: do not surface to user; preserve navigation success.
            console.warn(
              "NewDocumentShell: failed to persist workspace selection",
              e,
            );
          }
          // navigate to the new document or documents list
          router.push(`/dashboard/d/${docId ?? docSlug}`);
        } else if (res.status === 409) {
          // Conflict, slug taken
          const body = await res.json().catch(() => null);
          setError(
            body?.message ??
              "Slug already in use. Pick a different slug and try again.",
          );
        } else {
          const body = await res.json().catch(() => null);
          setError(body?.message ?? "Failed to create document.");
        }
      } catch (err: any) {
        setError(err?.message ?? "Network error while creating document.");
      }
    });
  }

  // Show a helpful message (when workspaceId is missing)
  useEffect(() => {
    if (!workspaceId) {
      setError(
        "No workspace selected. Add ?workspaceId=... to the URL or pass it as a prop.",
      );
    } else {
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const selectedType = documentTypes.find((t) => t.value === type);

  return (
    <form
      className="w-full max-w-3xl rounded-xl border bg-card"
      onSubmit={handleSubmit}
    >
      <div className="flex flex-col items-center justify-center gap-6 rounded-t-xl border-b bg-background/60 py-8">
        <div className="flex flex-col items-center space-y-1">
          <h2 className="font-medium text-2xl">Create a document</h2>
          <p className="text-muted-foreground text-sm max-w-[80%] text-center">
            Create a new document for this workspace (policies, terms, etc.).
          </p>
        </div>
      </div>

      <FieldGroup className="p-4 flex gap-4">
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
          <FieldLabel htmlFor="type">Document Type</FieldLabel>
          <Select
            aria-label="Select a document type"
            value={type}
            onValueChange={(val) => setType(val as DocumentType)}
          >
            <SelectTrigger className="bg-card">
              <SelectValue>
                <span className="flex flex-col">
                  <div className="flex items-center gap-2">
                    {selectedType ? (
                      <>
                        <selectedType.icon className="w-4 h-4 opacity-72" />
                        <span className="truncate">{selectedType.label}</span>
                      </>
                    ) : (
                      <span className="truncate">Select a document</span>
                    )}
                  </div>
                  <span className="truncate text-xs text-muted-foreground">
                    {selectedType ? selectedType.description : ""}
                  </span>
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectPopup>
              {documentTypes.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  <span className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <t.icon className="w-4 h-4 opacity-72" />
                      <span className="truncate">{t.label}</span>
                    </div>
                    <span className="truncate text-xs text-muted-foreground max-w-[500px] whitespace-pre-wrap">
                      {t.description}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
          <FieldDescription>
            Choose the type that best fits this document.
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

        <div className="grid grid-cols-2 gap-4">
          <Field className="gap-2">
            <FieldLabel htmlFor="status">Status</FieldLabel>
            <Select
              aria-label="Select status"
              value={status}
              onValueChange={(val) => setStatus(val as any)}
            >
              <SelectTrigger className="bg-card">
                <SelectValue className={"capitalize"}>{status}</SelectValue>
              </SelectTrigger>
              <SelectPopup>
                <SelectItem value="draft" className={"capitalize"}>
                  draft
                </SelectItem>
                <SelectItem value="published" className={"capitalize"}>
                  published
                </SelectItem>
                <SelectItem value="archived" className={"capitalize"}>
                  archived
                </SelectItem>
              </SelectPopup>
            </Select>
            <FieldDescription>Document workflow status</FieldDescription>
          </Field>

          <Field className="gap-2">
            <FieldLabel htmlFor="parent">Parent Document (optional)</FieldLabel>
            <Input
              id="parent"
              placeholder="Parent document id (optional)"
              value={parentId ?? ""}
              onChange={(e) => setParentId(e.target.value || null)}
            />
            <FieldDescription>
              If this is a revision or child document, provide the parent's ID.
            </FieldDescription>
          </Field>
        </div>
      </FieldGroup>

      <div className="rounded-b-xl border-t bg-background/60 p-4 w-full">
        {error ? (
          <div className="mb-2 text-sm text-destructive">{error}</div>
        ) : null}

        <div className="flex gap-2 w-full justify-end">
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
