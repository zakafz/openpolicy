"use client";
import type { Product } from "@polar-sh/sdk/models/components/product.js";
import {
  CircleAlertIcon,
  CircleCheckIcon,
  LoaderCircleIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field-shadcn";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createClient } from "@/lib/supabase/client";
import { fetchWorkspacesForOwner } from "@/lib/workspace";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "./ui/input-group-coss";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export function CreateWorkspaceForm({ products }: { products: Product[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugValid, setSlugValid] = useState<boolean>(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const slugCheckRef = useRef<number | null>(null);
  const [slugErrorMessage, setSlugErrorMessage] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | undefined>(() => {
    const freePlan = products.find(
      (product) => product.prices?.[0]?.amountType === "free",
    );
    return (freePlan ?? products[0])?.id ?? undefined;
  });

  useEffect(() => {
    if (!slug || slug.length === 0) {
      setSlugValid(false);
      setSlugAvailable(null);
      setSlugErrorMessage(null);
      return;
    }

    const re = /^[a-z0-9]([a-z0-9-]{0,62}[a-z0-9])?$/;
    const isValid = re.test(slug);
    setSlugValid(isValid);

    if (!isValid) {
      setSlugAvailable(false);
      setSlugErrorMessage(
        "Only lowercase letters, numbers and dashes allowed (start with a letter/number).",
      );
      return;
    } else {
      setSlugErrorMessage(null);
    }

    if (slugCheckRef.current) {
      clearTimeout(slugCheckRef.current);
    }

    slugCheckRef.current = window.setTimeout(async () => {
      setCheckingSlug(true);
      try {
        const res = await fetch(
          `/api/workspaces/check-slug?slug=${encodeURIComponent(slug)}`,
        );
        if (!res.ok) {
          throw new Error("Failed to check slug availability");
        }
        const { available } = await res.json();

        setSlugAvailable(available);
        if (!available) {
          setSlugErrorMessage("Slug already in use");
        } else {
          setSlugErrorMessage(null);
        }
      } catch (err: any) {
        console.error("Error checking slug availability", err);
        setSlugAvailable(null);
        setSlugErrorMessage("Error checking slug availability");
      } finally {
        setCheckingSlug(false);
      }
    }, 500);

    return () => {
      if (slugCheckRef.current) {
        clearTimeout(slugCheckRef.current);
      }
    };
  }, [slug, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Workspace name is required.");
      return;
    }

    if (!planId) {
      setError("Please select a plan for the workspace.");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !user) {
        setError("You must be signed in to create a workspace.");
        setLoading(false);
        return;
      }

      const owner_id = user.id;
      const customerEmail = user.email ?? undefined;
      const nameTrim = name.trim();

      try {
        const ownerWorkspaces = await fetchWorkspacesForOwner(
          owner_id,
          supabase,
        );

        const existingWsFound = ownerWorkspaces.find(
          (w: any) =>
            typeof w?.name === "string" &&
            String(w.name).toLowerCase() === nameTrim.toLowerCase(),
        );

        if (existingWsFound) {
          setError("You already have a workspace with this name.");
          setLoading(false);
          return;
        }

        const { data: existingPending } = await supabase
          .from("pending_workspaces")
          .select("id")
          .eq("owner_id", owner_id)
          .ilike("name", nameTrim)
          .limit(1);

        if (existingPending && existingPending.length > 0) {
          setError(
            "A workspace with this name is already pending creation. Complete the checkout or choose a different name.",
          );
          setLoading(false);
          return;
        }
      } catch (dbCheckErr: any) {
        console.error(
          "Error checking for existing workspace names:",
          dbCheckErr,
        );
      }

      let customerId: string | undefined;
      let customerExternalId: string | undefined;
      try {
        const res = await fetch("/api/polar/customer", {
          method: "GET",
          credentials: "include",
        });
        if (res.ok) {
          const body = await res.json();
          customerId = body?.customerId ?? undefined;
          customerExternalId =
            body?.externalId ?? body?.external_id ?? undefined;
        } else {
          const body = await res.text();
          console.warn(
            "Failed to retrieve Polar customer info:",
            res.status,
            body,
          );
        }
      } catch (fetchErr) {
        console.error("Error fetching Polar customer info:", fetchErr);
      }
      const selectedProduct = products.find((p) => p.id === planId);
      const price = (selectedProduct?.prices &&
        selectedProduct.prices[0]) as any;
      const isFreePlan = price ? price.amountType === "free" : false;

      try {
        const currentWorkspaces = await fetchWorkspacesForOwner(
          owner_id,
          supabase,
        );
        const limit = 1;

        if (currentWorkspaces.length >= limit) {
          setError(
            `You can only create ${limit} workspace. Please delete an existing workspace to create a new one.`,
          );
          setLoading(false);
          return;
        }
      } catch (limitErr) {
        console.error("Error checking workspace limits:", limitErr);
        setError("Failed to validate workspace limits.");
        setLoading(false);
        return;
      }

      if (isFreePlan) {
        try {
          const normalizedSlugForFree = String(slug ?? "")
            .toLowerCase()
            .replace(/-+/g, "-")
            .replace(/^-+|-+$/g, "");
          const resp = await fetch("/api/polar/create-free-workspace", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productId: planId,
              name: name.trim(),
              slug: normalizedSlugForFree || null,
            }),
          });

          if (!resp.ok) {
            let body: any = null;
            try {
              body = await resp.json();
            } catch {
              body = await resp.text().catch(() => null);
            }
            console.error(
              "Failed to create free workspace:",
              resp.status,
              body,
            );
            setError(
              body?.error ??
                "Failed to create free workspace. Please try again.",
            );
            setLoading(false);
            return;
          }

          let respBody: any = null;
          try {
            respBody = await resp.json().catch(() => null);
          } catch (e) {
            respBody = null;
          }
          const newWorkspaceId =
            respBody?.workspace?.id ??
            respBody?.workspaceId ??
            respBody?.data?.workspace?.id ??
            null;
          try {
            if (newWorkspaceId && typeof window !== "undefined") {
              localStorage.setItem("selectedWorkspace", String(newWorkspaceId));
            }
          } catch (e) {
            console.warn(
              "Failed to persist selected workspace to localStorage",
              e,
            );
          }
          setLoading(false);
          router.push("/dashboard");
          return;
        } catch (err: any) {
          console.error("Error creating free workspace:", err);
          setError(
            "Failed to create free workspace. Please try again or contact support.",
          );
          setLoading(false);
          return;
        }
      }

      const normalizedSlugForInsert = String(slug ?? "")
        .toLowerCase()
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");
      const { data: pending, error: pendingError } = await supabase
        .from("pending_workspaces")
        .insert({
          name: name.trim(),
          owner_id,
          plan: planId,
          metadata: {},
          customer_id: customerId ?? null,
          customer_email: customerEmail ?? null,
          customer_external_id: owner_id,
          slug: normalizedSlugForInsert || null,
        })
        .select()
        .single();
      if (pendingError) {
        const msg =
          pendingError?.message ??
          (pendingError?.details ? String(pendingError.details) : null) ??
          "Failed to create pending workspace.";
        if (
          String(msg).toLowerCase().includes("unique") &&
          String(msg).toLowerCase().includes("slug")
        ) {
          setError("That slug is already taken. Try another.");
        } else {
          setError(msg);
        }
        setLoading(false);
        return;
      }

      if (pendingError) {
        setError(pendingError || "Failed to create pending workspace.");
        setLoading(false);
        return;
      }

      setLoading(false);
      const encodedProduct = encodeURIComponent(planId);
      let url = `/checkout?products=${encodedProduct}`;
      if (customerId) {
        url += `&customerId=${encodeURIComponent(customerId)}`;
      }
      url += `&pendingWorkspaceId=${encodeURIComponent(pending.id)}`;
      if (customerEmail) {
        url += `&customerEmail=${encodeURIComponent(customerEmail)}`;
      }
      router.push(url);
    } catch (err: any) {
      setError(err.message || "Unexpected error");
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md rounded-xl border bg-accent"
    >
      <div className="flex flex-col items-center justify-center gap-6 rounded-t-xl border-b bg-background/60 py-12">
        <div className="flex gap-1 items-center">
          <Image
            src="/icon-openpolicy.svg"
            alt="Logo"
            width={32}
            height={32}
            className="h-7 w-fit"
          />
          <Image
            src="/logo.svg"
            alt="Logo"
            width={32}
            height={32}
            className="h-6 w-fit"
          />
        </div>
        <div className="flex flex-col items-center space-y-1">
          <h2 className="font-medium text-2xl">Create a workspace</h2>
          <p className="text-muted-foreground text-sm max-w-[80%] text-center">
            A workspace is a place where you can work on compliance, legal, and
            internal documentation (etc...).
          </p>
        </div>
      </div>

      <FieldGroup className="p-4">
        <Field className="gap-2">
          <FieldLabel htmlFor="name">Workspace Name</FieldLabel>
          <Input
            autoComplete="off"
            id="name"
            placeholder="Acme"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <FieldDescription className="">
            This is the name of your workspace.
          </FieldDescription>
        </Field>

        <Field className="gap-2">
          <FieldLabel htmlFor="slug">Workspace Slug</FieldLabel>
          <InputGroup className="flex-1">
            <InputGroupInput
              type="text"
              id="slug"
              placeholder="e.g. acme"
              value={slug}
              onChange={(e) => {
                const raw = String(e.target.value ?? "");
                const lower = raw.toLowerCase();
                const withSpacesToDashes = lower.replace(/\s+/g, "-");
                const cleaned = withSpacesToDashes.replace(/[^a-z0-9-]/g, "");
                setSlug(cleaned);
              }}
              onBlur={() => {
                const normalized = String(slug ?? "")
                  .toLowerCase()
                  .replace(/\s+/g, "-")
                  .replace(/[^a-z0-9-]/g, "")
                  .replace(/-+/g, "-");
                if (normalized !== slug) setSlug(normalized);
              }}
              aria-describedby="slug-desc"
            />
            <InputGroupAddon align={"inline-end"}>
              .openpolicyhq.com
            </InputGroupAddon>
            <InputGroupAddon align="inline-start">
              {checkingSlug ? (
                <LoaderCircleIcon className="animate-spin size-4" />
              ) : slugValid && slugAvailable ? (
                <CircleCheckIcon className="text-green-500 size-4" />
              ) : !slugValid && slug.length > 0 ? (
                <CircleAlertIcon className="text-rose-500 size-4" />
              ) : slugValid && slugAvailable === false ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <CircleAlertIcon className="text-rose-500 size-4" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Slug already in use</TooltipContent>
                </Tooltip>
              ) : (
                <CircleCheckIcon className="text-muted-foreground size-4" />
              )}
            </InputGroupAddon>
          </InputGroup>
          <FieldDescription id="slug-desc">
            {slugErrorMessage ? (
              <span className="text-sm mb-1 text-rose-500 block" role="alert">
                {slugErrorMessage}
              </span>
            ) : null}
            This is your workspace's unique slug on OpenPolicy.
          </FieldDescription>
        </Field>

        <Field className="gap-2">
          <FieldLabel htmlFor="plan">Workspace Plan</FieldLabel>
          <Select
            value={planId}
            onValueChange={(v: string) => setPlanId(v)}
            itemToStringValue={(item) =>
              typeof item === "string" ? item : ((item as any) ?? "")
            }
            aria-label="Select a plan"
          >
            <SelectTrigger className={"bg-card"}>
              <SelectValue>
                {(valueOrItem: any) => {
                  const selectedProduct: Product | undefined =
                    typeof valueOrItem === "string"
                      ? products.find((p) => p.id === valueOrItem)
                      : (valueOrItem as Product | undefined);

                  if (!selectedProduct) {
                    const fallback =
                      typeof valueOrItem === "string"
                        ? valueOrItem
                        : "Select a plan";
                    return (
                      <span className="flex items-center">
                        <span className="truncate text-primary">
                          {fallback}
                        </span>
                      </span>
                    );
                  }

                  const p = (selectedProduct.prices &&
                    selectedProduct.prices[0]) as any;
                  const priceLabel = (() => {
                    if (!p) {
                      return `(${selectedProduct.recurringInterval ?? ""})`;
                    }
                    if (p.amountType === "fixed") {
                      const cents = Number(p.priceAmount ?? 0);
                      const dollars = cents / 100;
                      if (cents % 100 === 0) {
                        return `($${Math.round(dollars)} / ${selectedProduct.recurringInterval})`;
                      }
                      return `($${dollars.toFixed(2)} / ${selectedProduct.recurringInterval})`;
                    }
                    return "(free)";
                  })();

                  return (
                    <span className="flex flex-col">
                      <span className="truncate text-primary">
                        {selectedProduct.name}{" "}
                        <span className="text-muted-foreground">
                          {priceLabel}
                        </span>
                      </span>
                      <span className="truncate text-xs">
                        {selectedProduct.description}
                      </span>
                    </span>
                  );
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectPopup>
              {products.map((item: Product) => (
                <SelectItem key={item.id} value={item.id}>
                  <span className="flex flex-col">
                    <span className="truncate">
                      {item.name}{" "}
                      <span className="text-muted-foreground">
                        {(() => {
                          const p = (item.prices && item.prices[0]) as any;
                          if (!p) {
                            return `(${item.recurringInterval ?? ""})`;
                          }
                          if (p.amountType === "fixed") {
                            const cents = Number(p.priceAmount ?? 0);
                            const dollars = cents / 100;
                            if (cents % 100 === 0) {
                              return `($${Math.round(dollars)} / ${item.recurringInterval})`;
                            }
                            return `($${dollars.toFixed(2)} / ${item.recurringInterval})`;
                          }
                          return "(free)";
                        })()}
                      </span>
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
          <FieldDescription>
            What plan your workspace will have.{" "}
            <a href="/pricing" target="_blank" rel="noopener">
              View Plans
            </a>
          </FieldDescription>
        </Field>
      </FieldGroup>

      <div className="rounded-b-xl border-t bg-background/60 p-4 w-full">
        {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
        <div className="flex gap-2 w-full justify-end">
          <Link href={"/dashboard"}>
            <Button variant={"outline"}>Back</Button>
          </Link>
          <Button
            type="submit"
            disabled={
              loading ||
              !slugValid ||
              slugAvailable === false ||
              slugAvailable === null
            }
          >
            {loading ? "Creating..." : "Create Workspace"}
          </Button>
        </div>
      </div>
    </form>
  );
}
