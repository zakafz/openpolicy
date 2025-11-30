"use client";
import {
  ArrowRight,
  Check,
  ChevronsUpDown,
  MessageCircleMore,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MenuToggleIcon } from "@/components/menu-toggle-icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Button as ButtonShadcn } from "@/components/ui/button-shadcn";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { fetchPublishedDocumentsForWorkspace } from "@/lib/documents";
import { createClient } from "@/lib/supabase/client";
import { cn, resolveWorkspaceFromRequest } from "@/lib/utils";

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (
      (!documents || documents.length === 0) &&
      workspace?.slug &&
      workspace?.id
    ) {
      let cancelled = false;
      (async () => {
        try {
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

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <div className="bg-card ">
      <div className="w-screen bg-background h-11 fixed z-40 top-0 left-0" />
      <div className="h-12" />
      <header className="w-[95%] z-50 top-5 left-1/2 -translate-x-1/2 fixed max-w-4xl mx-auto bg-accent backdrop-blur-lg supports-backdrop-filter:bg-accent/80 border h-12 rounded-2xl flex flex-row justify-between p-1 items-center">
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
        <div className="md:hidden">
          <Button
            aria-controls="mobile-menu"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle menu"
            variant="ghost"
            className="size-10 rounded-xl"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <MenuToggleIcon
              className="size-5"
              duration={300}
              open={mobileMenuOpen}
            />
          </Button>
        </div>
        <MobileMenu
          className="flex flex-col justify-between gap-2"
          open={mobileMenuOpen}
        >
          <div className="grid gap-y-2 overflow-y-auto max-h-[calc(100vh-8rem)]">
            <a
              className={buttonVariants({
                variant: "ghost",
                className: "justify-start",
              })}
              href="/"
            >
              Home
            </a>
            <div className="text-muted-foreground text-xs font-medium ml-3">
              Documents
            </div>
            {clientDocs.map((doc) => (
              <a
                className={buttonVariants({
                  variant: "ghost",
                  className: "justify-start",
                })}
                href={`/${doc.slug}`}
                key={doc.slug}
              >
                {doc.title ?? doc.slug}
              </a>
            ))}
          </div>
          {workspace?.support_email && (
            <Link href={`mailto:${workspace.support_email}`}>
              <Button className="mt-auto w-full">Contact Us</Button>
            </Link>
          )}
        </MobileMenu>
        <div className="flex-row gap-1 items-center hidden md:flex">
          <a href={`/`}>
            <Button
              onClick={() => router.push("/")}
              variant={"ghost"}
              className="text-muted-foreground hover:text-primary"
            >
              Home
            </Button>
          </a>
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
      <div className="w-[95%] max-w-4xl mx-auto mt-10 pb-10 min-h-[calc(100vh-60px)]">
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

      <div className="w-full border-t py-8 bg-accent">
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
              <CommandItem
                className="rounded-lg"
                key="__all__"
                value="__all__"
                onSelect={() => {
                  setValue("__all__");
                  setSelectedName("All documents");
                  setOpen(false);
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

type MobileMenuProps = React.ComponentProps<"div"> & {
  open: boolean;
};

function MobileMenu({ open, children, className, ...props }: MobileMenuProps) {
  if (!open || typeof window === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className={cn(
        "bg-background backdrop-blur-lg supports-[backdrop-filter]:bg-background/50",
        "fixed top-18 w-[95%] max-w-4xl mb-5 mx-auto right-0 bottom-0 left-0 z-40 flex flex-col overflow-hidden border rounded-xl md:hidden",
      )}
      id="mobile-menu"
    >
      <div
        className={cn(
          "data-[slot=open]:zoom-in-97 ease-out data-[slot=open]:animate-in",
          "size-full p-4",
          className,
        )}
        data-slot={open ? "open" : "closed"}
        {...props}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
