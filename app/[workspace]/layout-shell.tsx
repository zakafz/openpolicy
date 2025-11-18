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
import { cn } from "@/lib/utils";
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
      const parts = pathname?.split("/").filter(Boolean) ?? [];
      // detect host-based workspace slug
      const host =
        typeof window !== "undefined" ? window.location.hostname : null;
      const hostParts = host ? host.split(".") : [];
      const hostWs = hostParts.length >= 2 ? hostParts[0] : null;
      let slug: string | null = null;
      if (hostWs && workspace?.slug && hostWs === workspace.slug) {
        // subdomain case: /<document_slug>
        slug = parts.length >= 1 ? parts[0] : null;
      } else {
        // path case: /<workspace>/<document_slug>
        slug = parts.length >= 2 ? parts[1] : null;
      }
      if (slug) {
        // minimal placeholder doc so the selector shows the current document title immediately
        return [{ id: `__placeholder__:${slug}`, title: slug, slug }];
      }
    } catch (e) {
      // ignore
    }
    return [];
  };
  const [clientDocs, setClientDocs] = useState<any[]>(deriveInitialDocs());
  const docCount = Array.isArray(clientDocs) ? clientDocs.length : 0;

  // If the layout did not receive documents from the server, attempt a client-side fetch.
  // This helps keep the header in sync if the server fetch was empty or transiently failed.
  useEffect(() => {
    // Only attempt client fetch when there are no server-side docs and we have a workspace slug/id.
    if (
      (!documents || (Array.isArray(documents) && documents.length === 0)) &&
      workspace?.slug &&
      workspace?.id
    ) {
      let cancelled = false;

      const fetchDocs = async () => {
        try {
          const supabase = createClient();
          const { data: docs, error } = await supabase
            .from("documents")
            .select("id,title,slug,updated_at,created_at")
            .eq("workspace_id", workspace.id)
            .eq("published", true)
            .order("updated_at", { ascending: false })
            .limit(100);

          if (cancelled) return;
          if (!error && Array.isArray(docs)) {
            setClientDocs(docs);
          }
        } catch (e) {
          console.warn("LayoutShell client fetch failed", e);
        }
      };

      fetchDocs();

      return () => {
        cancelled = true;
      };
    } else {
      // Ensure client state mirrors server-provided docs when available.
      if (documents && Array.isArray(documents) && documents.length > 0) {
        setClientDocs(documents);
      }
    }
    // workspace.id and documents are primary dependencies for the client fetch.
  }, [workspace?.id, documents]);

  console.log(workspace?.name);
  return (
    <div className="bg-card min-h-screen pt-5">
      <header className="w-[95%] max-w-4xl mx-auto bg-accent h-12 rounded-2xl flex flex-row justify-between p-1 items-center">
        <a href={workspace?.return_url ? workspace.return_url : "/"} className="flex items-center">
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
        {docCount > 1 && (
          <div className="flex justify-end mt-5">
            <Button
              variant={"outline"}
              className="bg-card"
              onClick={() => {
                try {
                  // detect host/subdomain
                  const host =
                    typeof window !== "undefined"
                      ? window.location.hostname
                      : "";
                  const parts = host.split(".");
                  const subdomain = parts.length >= 2 ? parts[0] : null;

                  // detect current document slug from pathname (subdomain or path case)
                  const pathParts = pathname?.split("/").filter(Boolean) ?? [];
                  let currentSlug: string | null = null;
                  if (
                    subdomain &&
                    workspace?.slug &&
                    subdomain === workspace.slug
                  ) {
                    // subdomain case: /<document_slug>
                    currentSlug = pathParts.length >= 1 ? pathParts[0] : null;
                  } else {
                    // path case: /<workspace>/<document_slug>
                    currentSlug = pathParts.length >= 2 ? pathParts[1] : null;
                  }

                  // build list of slugs from current client docs
                  const slugs = clientDocs.map((d) => d.slug).filter(Boolean);
                  if (slugs.length === 0) return;

                  let currentIndex = slugs.indexOf(currentSlug as string);
                  // if current not found, default to -1 so nextIndex becomes 0
                  if (currentIndex === -1) currentIndex = -1;
                  const nextIndex = (currentIndex + 1) % slugs.length;
                  const nextSlug = slugs[nextIndex];

                  if (
                    subdomain &&
                    String(subdomain) === String(workspace?.slug)
                  ) {
                    router.push(`/${nextSlug}`);
                  } else if (workspace?.slug) {
                    router.push(`/${workspace.slug}/${nextSlug}`);
                  } else {
                    router.push(`/${nextSlug}`);
                  }
                } catch (e) {
                  console.warn("Next doc navigation failed", e);
                }
              }}
            >
              {(() => {
                try {
                  // compute next label for display without repeating the full logic above
                  const pathParts = pathname?.split("/").filter(Boolean) ?? [];
                  const host =
                    typeof window !== "undefined"
                      ? window.location.hostname
                      : "";
                  const hostParts = host.split(".");
                  const subdomain = hostParts.length >= 2 ? hostParts[0] : null;
                  let currentSlug: string | null = null;
                  if (
                    subdomain &&
                    workspace?.slug &&
                    subdomain === workspace.slug
                  ) {
                    currentSlug = pathParts.length >= 1 ? pathParts[0] : null;
                  } else {
                    currentSlug = pathParts.length >= 2 ? pathParts[1] : null;
                  }

                  const slugs = clientDocs.map((d) => d.slug).filter(Boolean);
                  if (slugs.length === 0) return "Next document";

                  let currentIndex = slugs.indexOf(currentSlug as string);
                  if (currentIndex === -1) currentIndex = -1;
                  const nextIndex = (currentIndex + 1) % slugs.length;
                  const nextSlug = slugs[nextIndex];

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

  // Derive selection purely from current pathname (no localStorage).
  // Behavior:
  // - If path is "/" (no path segments), select "__all__" (All documents).
  // - If using subdomain mode for this workspace (workspace.slug === subdomain) then:
  //     - "/" -> "__all__"
  //     - "/<doc>" -> select that doc slug
  // - Otherwise (path mode):
  //     - "/<workspace>" or "/" -> "__all__"
  //     - "/<workspace>/<doc>" -> select that doc slug
  useEffect(() => {
    try {
      if (!pathname) {
        setValue("__all__");
        setSelectedName("All documents");
        return;
      }
      const parts = pathname.split("/").filter(Boolean);
      const host =
        typeof window !== "undefined" ? window.location.hostname : "";
      const hostParts = host.split(".");
      const subdomain = hostParts.length >= 2 ? hostParts[0] : null;

      let current: string | null = null;

      if (
        subdomain &&
        workspace?.slug &&
        String(subdomain) === String(workspace.slug)
      ) {
        // subdomain mode: path "/" => all, path "/slug" => slug
        if (parts.length === 0) {
          current = "__all__";
        } else {
          current = parts[0];
        }
      } else {
        // path mode: "/" => all, "/workspace" => all, "/workspace/slug" => slug
        if (parts.length === 0) {
          current = "__all__";
        } else if (parts.length === 1) {
          // could be either workspace root or a top-level doc; treat matching workspace as root
          if (workspace?.slug && parts[0] === workspace.slug) {
            current = "__all__";
          } else {
            current = parts[0];
          }
        } else {
          // parts.length >= 2
          if (workspace?.slug && parts[0] === workspace.slug) {
            current = parts[1];
          } else {
            // not a workspace-scoped route; default to all
            current = "__all__";
          }
        }
      }

      setValue(current ?? "__all__");
      if (current === "__all__") {
        setSelectedName("All documents");
      } else {
        const found = docList.find((d) => d.value === current);
        setSelectedName(found ? found.label : null);
      }
    } catch (e) {
      // fallback
      setValue("__all__");
      setSelectedName("All documents");
    }
    // update when pathname, workspace slug or docs list change
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

                    // Update displayed name immediately
                    setSelectedName(d.label);

                    // Navigate to the selected document within the workspace
                    if (workspace?.slug && newValue) {
                      // If the current host uses the workspace as a subdomain,
                      // navigate to `/docslug` (no workspace prefix). Otherwise include the workspace slug.
                      const host =
                        typeof window !== "undefined"
                          ? window.location.hostname
                          : "";
                      const parts = host.split(".");
                      const subdomain = parts.length >= 2 ? parts[0] : null;
                      if (
                        subdomain &&
                        String(subdomain) === String(workspace.slug)
                      ) {
                        router.push(`/${newValue}`);
                      } else {
                        router.push(`/${workspace.slug}/${newValue}`);
                      }
                    } else if (newValue) {
                      // fallback: push top-level slug
                      router.push(`/${newValue}`);
                    }
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
