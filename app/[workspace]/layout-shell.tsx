"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Button as ButtonShadcn } from "@/components/ui/button-shadcn";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowRight,
  MessageCircleMore,
  MessageCircleQuestionMark,
} from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePathname, useRouter } from "next/navigation";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn, resolveWorkspaceFromRequest } from "@/lib/utils";
import { fetchPublishedDocumentsForWorkspace } from "@/lib/documents";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";

export default function LayoutShell({
  children,
  workspace,
  documents,
}: {
  children: React.ReactNode;
  workspace?: any;
  documents?: any[];
}) {
  const wsName = workspace?.name ?? workspace?.slug ?? "OpenStatus";

  // Client-side documents state: initialize from server-provided `documents` prop if available.
  // Initialize with a minimal placeholder entry derived from the current URL (if present)
  // so the selector can display the current document immediately on refresh.
  const pathname = usePathname();
  const router = useRouter();
  const deriveInitialDocs = () => {
    if (Array.isArray(documents) && documents.length > 0) return documents;
    try {
      const res = resolveWorkspaceFromRequest({
        hostname:
          typeof window !== "undefined" ? window.location.hostname : undefined,
        pathname,
        workspaceSlug: workspace?.slug ?? null,
      });
      const slug = res.documentSlug;
      if (slug) return [{ id: `__placeholder__:${slug}`, title: slug, slug }];
    } catch {}
    return [];
  };
  const [clientDocs, setClientDocs] = useState<any[]>(deriveInitialDocs());
  const docCount = Array.isArray(clientDocs) ? clientDocs.length : 0;

  // If the layout did not receive documents from the server, attempt a client-side fetch.
  // This helps keep the header in sync if the server fetch was empty or transiently failed.
  useEffect(() => {
    if (
      (!documents || documents.length === 0) &&
      workspace?.slug &&
      workspace?.id
    ) {
      let cancelled = false;
      (async () => {
        try {
          // Use centralized helper to fetch published documents for a workspace.
          // This keeps query logic consistent across the app and delegates
          // Supabase interactions to `lib/documents`.
          const docs = await fetchPublishedDocumentsForWorkspace(
            workspace.id,
            createClient(),
            100,
          );
          if (!cancelled && Array.isArray(docs)) setClientDocs(docs);
        } catch (e) {
          console.warn("LayoutShell client fetch failed", e);
        }
      })();
      return () => {
        cancelled = true;
      };
    }
    if (documents && Array.isArray(documents) && documents.length > 0) {
      setClientDocs(documents);
    }
  }, [workspace?.id, documents]);

  return (
    <div className="bg-card min-h-screen pt-5">
      <header className="w-[95%] max-w-4xl mx-auto bg-accent h-12 rounded-2xl flex flex-row justify-between p-1 items-center">
        <a
          href={workspace?.return_url ? workspace.return_url : "/"}
          className="flex items-center"
        >
          {!workspace?.disable_icon && (
            <Avatar className="size-10 min-h-10 min-w-10 rounded-xl aspect-square">
              <AvatarImage src={workspace?.logo} alt="User avatar" />
              <AvatarFallback className="bg-card rounded-xl" />
            </Avatar>
          )}
          <div className="flex flex-row gap-2 ml-2">
            <div className="tracking-tight text-lg font-medium">{wsName}</div>
          </div>
        </a>
        <div className="flex flex-row gap-1 items-center">
          <DocumentSelect workspace={workspace} documents={clientDocs} />
          {workspace?.support_email ? (
            <Tooltip delayDuration={500}>
              <TooltipTrigger asChild>
                <a href={`mailto:${workspace.support_email}`}>
                  <Button
                    className="aspect-square rounded-xl h-full group"
                    variant={"ghost"}
                  >
                    <MessageCircleMore className="text-muted-foreground size-5 group-hover:text-primary" />
                  </Button>
                </a>
              </TooltipTrigger>
              <TooltipContent className="text-xs font-mono rounded p-1 px-2">
                Contact us
              </TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      </header>
      <div className="w-[95%] max-w-4xl mx-auto mt-10 pb-10 min-h-[calc(100vh-48px-60px)]">
        {children}
        {docCount > 1 && pathname !== "/" && (
          <div className="flex justify-end mt-5">
            <Button
              variant={"outline"}
              className="bg-card"
              onClick={() => {
                try {
                  const res = resolveWorkspaceFromRequest({
                    hostname:
                      typeof window !== "undefined"
                        ? window.location.hostname
                        : undefined,
                    pathname,
                    workspaceSlug: workspace?.slug ?? null,
                  });
                  const slugs = clientDocs.map((d) => d.slug).filter(Boolean);
                  if (slugs.length === 0) return;
                  let currentIndex = slugs.indexOf(res.documentSlug as any);
                  if (currentIndex === -1) currentIndex = -1;
                  const nextSlug = slugs[(currentIndex + 1) % slugs.length];
                  router.push(`/${nextSlug}`);
                } catch (e) {
                  console.warn("Next doc navigation failed", e);
                }
              }}
            >
              {(() => {
                try {
                  const res = resolveWorkspaceFromRequest({
                    hostname:
                      typeof window !== "undefined"
                        ? window.location.hostname
                        : undefined,
                    pathname,
                    workspaceSlug: workspace?.slug ?? null,
                  });
                  const slugs = clientDocs.map((d) => d.slug).filter(Boolean);
                  if (slugs.length === 0) return "Next document";
                  let currentIndex = slugs.indexOf(res.documentSlug as any);
                  if (currentIndex === -1) currentIndex = -1;
                  const nextSlug = slugs[(currentIndex + 1) % slugs.length];
                  const nextDocObj = clientDocs.find(
                    (d) => String(d.slug) === String(nextSlug),
                  );
                  return nextDocObj?.title ?? nextSlug ?? "Next document";
                } catch {
                  return "Next document";
                }
              })()}
              <ArrowRight />
            </Button>
          </div>
        )}
      </div>

      <div className="w-full border-t py-8 bg-background">
        <div className="mx-auto w-[95%] max-w-4xl text-muted-foreground flex gap-1 text-sm">
          Powered by{" "}
          <a
            href="https://openpolicyhq.com"
            className="text-primary font-mono flex gap-1"
          >
            <Image
              src="/icon-openpolicy.svg"
              alt="OpenPolicy Logo"
              width={20}
              height={20}
            />
            OpenPolicy
          </a>
        </div>
      </div>
    </div>
  );
}

function DocumentSelect({
  workspace,
  documents = [],
}: {
  workspace?: any;
  documents?: any[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [selectedName, setSelectedName] = useState<string | null>(null);

  const docList = Array.isArray(documents)
    ? documents.map((d) => ({ value: d.slug, label: d.title ?? d.slug }))
    : [];

  useEffect(() => {
    try {
      if (!pathname) {
        setValue("__all__");
        setSelectedName("All documents");
        return;
      }
      const res = resolveWorkspaceFromRequest({
        hostname:
          typeof window !== "undefined" ? window.location.hostname : undefined,
        pathname,
        workspaceSlug: workspace?.slug ?? null,
      });
      const current = res.documentSlug ?? "__all__";
      setValue(current ?? "__all__");
      if (current === "__all__") {
        setSelectedName("All documents");
      } else {
        const found = docList.find((d) => d.value === current);
        setSelectedName(found ? found.label : null);
      }
    } catch (e) {
      setValue("__all__");
      setSelectedName("All documents");
    }
  }, [pathname, workspace?.slug, documents]);

  // disable selector when there are no published documents
  const hasDocs = docList.length > 0;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <ButtonShadcn
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={!hasDocs}
          className={`min-w-[200px] bg-card h-10 justify-between ring-0 shadow-none rounded-xl font-mono ${!hasDocs ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          {selectedName ??
            (value
              ? value === "__all__"
                ? "All documents"
                : docList.find((d) => d.value === value)?.label
              : hasDocs
                ? "Select document..."
                : "No published documents")}
          <ChevronsUpDown className="opacity-50" />
        </ButtonShadcn>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0 rounded-xl overflow-hidden shadow-none">
        <Command>
          <CommandInput
            placeholder="Search documents..."
            className="h-9 font-mono"
          />
          <CommandList>
            <CommandEmpty>
              {hasDocs ? "No document found." : "No published documents."}
            </CommandEmpty>
            <CommandGroup>
              {/* Top: All documents option navigates to workspace index */}
              <CommandItem
                className="rounded-lg"
                key="__all__"
                value="__all__"
                onSelect={() => {
                  setValue("__all__");
                  setSelectedName("All documents");
                  setOpen(false);
                  // navigate to root (shows workspace index / list)
                  router.push(`/`);
                }}
              >
                <span>All documents</span>
                <Check
                  className={cn(
                    "ml-auto",
                    value === "__all__" ? "opacity-100" : "opacity-0",
                  )}
                />
              </CommandItem>
            </CommandGroup>
            <CommandSeparator className="my-1" />
            <CommandGroup title="Documents">
              {docList.map((d) => (
                <CommandItem
                  className="rounded-lg"
                  key={d.value}
                  value={d.value}
                  onSelect={(currentValue) => {
                    const newValue = currentValue === value ? "" : currentValue;
                    setValue(newValue);
                    setOpen(false);
                    setSelectedName(d.label);
                    if (!newValue) return;
                    const res = resolveWorkspaceFromRequest({
                      hostname:
                        typeof window !== "undefined"
                          ? window.location.hostname
                          : undefined,
                      pathname,
                      workspaceSlug: workspace?.slug ?? null,
                    });
                    router.push(`/${newValue}`);
                  }}
                >
                  {d.label}
                  <Check
                    className={cn(
                      "ml-auto",
                      value === d.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
