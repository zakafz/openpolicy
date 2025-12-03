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
  DOCUMENT_TYPE_ICON_MAP,
  DOCUMENT_TYPE_LABEL_MAP,
} from "@/lib/constants";
import {
  readSelectedWorkspaceId,
  writeSelectedWorkspaceId,
} from "@/lib/workspace";
import type { DocumentType } from "@/types/documents";

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
  const [type, setType] = useState<DocumentType>("privacy");
  const [parentId, _setParentId] = useState<string | null>(null);
  const [status, setStatus] = useState<"draft" | "published" | "archived">(
    "draft",
  );
  const [version] = useState<number>(1);

  function getTemplateForType(t: DocumentType, titleText: string) {
    const base = contentTemplates[t] ?? contentTemplates.other;
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
    } catch {
      // fallback: do nothing
    }
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
      published: status === "published",
      version,
      workspace_id: workspaceId,
      parent_id: parentId || null,
      status,
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
          const docId = data?.id;
          const docSlug = data?.slug ?? slug;
          setSuccessUrl(`/dashboard/documents/${docId ?? docSlug}`);
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
          router.push(`/dashboard/d/${docId ?? docSlug}`);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const selectedType = documentTypes.find((t) => t.value === type);

  return (
    <form
      className="w-full max-w-[500px] rounded-xl border bg-card"
      onSubmit={handleSubmit}
    >
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
                        <selectedType.icon className="h-4 w-4 opacity-72" />
                        <span className="truncate">{selectedType.label}</span>
                      </>
                    ) : (
                      <span className="truncate">Select a document</span>
                    )}
                  </div>
                  <span className="truncate text-muted-foreground text-xs">
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
                      <t.icon className="h-4 w-4 opacity-72" />
                      <span className="truncate">{t.label}</span>
                    </div>
                    <span className="max-w-[500px] truncate whitespace-pre-wrap text-muted-foreground text-xs">
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
