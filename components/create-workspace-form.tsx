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
import { FREE_PLAN_LIMITS, PRO_PLAN_LIMITS } from "@/lib/limits";
import { ButtonGroup, ButtonGroupText } from "./ui/button-group";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./ui/input-group";
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

  // Validate slug format and check availability (debounced).
  useEffect(() => {
    // If empty, reset state
    if (!slug || slug.length === 0) {
      setSlugValid(false);
      setSlugAvailable(null);
      setSlugErrorMessage(null);
      return;
    }

    // Slug rules: lowercase letters, numbers, hyphens, cannot start/end with hyphen,
    // length reasonable (1-64; allow up to 64 with internal hyphens)
    const re = /^[a-z0-9]([a-z0-9-]{0,62}[a-z0-9])?$/;
    const isValid = re.test(slug);
    setSlugValid(isValid);

    if (!isValid) {
      // mark unavailable if invalid (prevents showing green)
      setSlugAvailable(false);
      setSlugErrorMessage(
        "Only lowercase letters, numbers and dashes allowed (start with a letter/number).",
      );
      return;
    } else {
      setSlugErrorMessage(null);
    }

    // Debounce availability check
    if (slugCheckRef.current) {
      clearTimeout(slugCheckRef.current);
    }

    slugCheckRef.current = window.setTimeout(async () => {
      setCheckingSlug(true);
      try {
        // Check existing workspaces
        const { data: wsData, error: wsErr } = await supabase
          .from("workspaces")
          .select("id")
          .ilike("slug", slug)
          .limit(1);

        if (wsErr) {
          console.error("Error checking workspaces slug:", wsErr);
        }
        const wsConflict = (wsData && (wsData as any).length > 0) ?? false;

        // Check pending workspaces
        const { data: pendingData, error: pendingErr } = await supabase
          .from("pending_workspaces")
          .select("id")
          .ilike("slug", slug)
          .limit(1);

        if (pendingErr) {
          console.error("Error checking pending_workspaces slug:", pendingErr);
        }
        const pendingConflict =
          (pendingData && (pendingData as any).length > 0) ?? false;

        const available = !wsConflict && !pendingConflict;
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
        // Use centralized helper to fetch the owner's workspaces (keeps logic in one place).
        // The helper may throw on error, so let the catch below handle logging.
        const ownerWorkspaces = await fetchWorkspacesForOwner(
          owner_id,
          supabase,
        );

        // Check case-insensitively whether a workspace with the same name already exists.
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

        // Still check pending_workspaces as before (pending rows are separate)
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
        // If the check fails for any reason, log and continue to avoid blocking the user
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
      // Determine if the selected product is a free plan before creating any pending row
      const selectedProduct = products.find((p) => p.id === planId);
      const price = (selectedProduct?.prices &&
        selectedProduct.prices[0]) as any;
      const isFreePlan = price ? price.amountType === "free" : false;

      // Enforce workspace limits for ALL plans
      try {
        const currentWorkspaces = await fetchWorkspacesForOwner(owner_id, supabase);
        const limit = isFreePlan ? FREE_PLAN_LIMITS.workspaces : PRO_PLAN_LIMITS.workspaces;

        if (currentWorkspaces.length >= limit) {
          const planName = isFreePlan ? "Free" : "Pro";
          const upgradeMessage = isFreePlan ? " Please upgrade to Pro for more workspaces." : "";
          setError(
            `${planName} plan is limited to ${limit} workspace(s).${upgradeMessage}`,
          );
          setLoading(false);
          return;
        }
      } catch (limitErr) {
        console.error("Error checking workspace limits:", limitErr);
        // Fail closed
        setError("Failed to validate plan limits.");
        setLoading(false);
        return;
      }

      if (isFreePlan) {
        // Create free workspace + subscription directly on the server and DO NOT create a pending_workspaces row.
        try {
          // include slug in the request body so server can persist/validate
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
            // Try to parse JSON body for a helpful message, otherwise fall back to text.
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

          // Success: workspace and free subscription were created server-side.
          // Parse response and persist the new workspace id so the workspace
          // switcher will select it as the current workspace.
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

      // Not a free plan: create pending_workspaces and proceed to checkout as before.
      // Ensure we send a normalized slug (collapse consecutive dashes and trim edges)
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
      // If DB returns a uniqueness constraint violation, surface that message to the user
      if (pendingError) {
        const msg =
          pendingError?.message ??
          (pendingError?.details ? String(pendingError.details) : null) ??
          "Failed to create pending workspace.";
        // If it's a unique violation on slug, give a clearer message
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
      // include pending workspace id for correlation in the webhook handler
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
      className="w-full max-w-md rounded-xl border bg-card"
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
            A workspace is a place where you can collaborate with your team.
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
          <ButtonGroup>
            <InputGroup>
              <InputGroupAddon align="inline-start">
                {checkingSlug ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : slugValid && slugAvailable ? (
                  <CircleCheckIcon className="text-green-500" />
                ) : !slugValid && slug.length > 0 ? (
                  <CircleAlertIcon className="text-rose-500" />
                ) : slugValid && slugAvailable === false ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex">
                        <CircleAlertIcon className="text-rose-500" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Slug already in use</TooltipContent>
                  </Tooltip>
                ) : (
                  <CircleCheckIcon className="text-muted-foreground" />
                )}
              </InputGroupAddon>
              <InputGroupInput
                className="ring-0!"
                id="slug"
                placeholder="e.g., acme"
                value={slug}
                onChange={(e) => {
                  const raw = String(e.target.value ?? "");
                  // Convert to lowercase and replace whitespace with dashes immediately,
                  // allow user to type dashes freely (do not trim on input).
                  const lower = raw.toLowerCase();
                  const withSpacesToDashes = lower.replace(/\s+/g, "-");
                  // Remove characters except a-z, 0-9 and dash.
                  const cleaned = withSpacesToDashes.replace(/[^a-z0-9-]/g, "");
                  setSlug(cleaned);
                }}
                onBlur={() => {
                  // On blur, collapse consecutive dashes but do NOT trim leading/trailing dashes,
                  // so ending with a dash is allowed.
                  const normalized = String(slug ?? "")
                    .toLowerCase()
                    .replace(/\s+/g, "-")
                    .replace(/[^a-z0-9-]/g, "")
                    .replace(/-+/g, "-");
                  if (normalized !== slug) setSlug(normalized);
                }}
                aria-invalid={!slugValid && slug.length > 0}
                aria-describedby="slug-desc"
              />
            </InputGroup>
            <ButtonGroupText asChild>
              <Label htmlFor="slug">.openpolicyhq.com</Label>
            </ButtonGroupText>
          </ButtonGroup>
          <FieldDescription id="slug-desc">
            This is your workspace's unique slug on OpenPolicy.
            {slug && slug.length > 0 ? (
              <>
                {" "}
                {!slugValid
                  ? " Only lowercase letters, numbers and hyphens are allowed."
                  : slugAvailable === false
                    ? " That slug is already taken."
                    : slugAvailable === true
                      ? " That slug is available."
                      : ""}
              </>
            ) : null}
            {slugErrorMessage ? (
              <div className="text-sm text-rose-500 mt-1" role="alert">
                {slugErrorMessage}
              </div>
            ) : null}
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
