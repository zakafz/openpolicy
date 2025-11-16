"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Product } from "@polar-sh/sdk/models/components/product.js";
import Link from "next/link";

export function CreateWorkspaceForm({ products }: { products: Product[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | undefined>(() => {
    const freePlan = products.find(
      (product) => product.prices?.[0]?.amountType === "free",
    );
    return (freePlan ?? products[0])?.id ?? undefined;
  });

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
        const { data: existingWs } = await supabase
          .from("workspaces")
          .select("id")
          .eq("owner_id", owner_id)
          .ilike("name", nameTrim)
          .limit(1);

        if (existingWs && existingWs.length > 0) {
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
        // If the check fails for any reason, log and continue to avoid blocking the user
        console.error(
          "Error checking for existing workspace names:",
          dbCheckErr,
        );
      }

      let customerId: string | undefined = undefined;
      let customerExternalId: string | undefined = undefined;
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

      if (isFreePlan) {
        // Create free workspace + subscription directly on the server and DO NOT create a pending_workspaces row.
        try {
          const resp = await fetch("/api/polar/create-free-workspace", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId: planId, name: name.trim() }),
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
        })
        .select()
        .single();

      if (pendingError) {
        setError(pendingError.message || "Failed to create pending workspace.");
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
          <h2 className="font-medium text-2xl">Create your workspace</h2>
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
            <a href="/pricing" target="_blank">
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
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Workspace"}
          </Button>
        </div>
      </div>
    </form>
  );
}
