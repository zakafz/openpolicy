"use client";
import type { Product } from "@polar-sh/sdk/models/components/product.js";
import { CheckCircleIcon, StarIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createClient } from "@/lib/supabase/client";
import { fetchWorkspacesForOwner } from "@/lib/workspace";
import { cn } from "@/lib/utils";

interface PricingSectionProps extends React.ComponentProps<"div"> {
  plans: Product[];
  heading: string;
  description?: string;
}

export function PricingSection({
  plans,
  heading,
  description,
  ...props
}: PricingSectionProps) {
  const [frequency, setFrequency] = React.useState<"monthly">("monthly");

  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center space-y-7 p-4",
        props.className,
      )}
      {...props}
    >
      <div className="mx-auto max-w-xl space-y-2">
        <h2 className="text-center font-medium text-2xl md:text-3xl lg:text-4xl">
          {heading}
        </h2>
        {description && (
          <p className="text-center text-muted-foreground text-sm">
            {description}
          </p>
        )}
      </div>

      <div className="mx-auto grid w-full max-w-4xl mt-5 gap-5 grid-cols-1 md:grid-cols-2">
        {plans.map((plan) => (
          <PricingCard frequency={frequency} key={plan.id} plan={plan} />
        ))}
      </div>
    </div>
  );
}

type PricingCardProps = React.ComponentProps<"div"> & {
  plan: Product;
  frequency?: "monthly";
};

export function PricingCard({
  plan,
  className,
  frequency = "monthly",
  ...props
}: PricingCardProps) {
  const router = useRouter();
  const [currentPlanId, setCurrentPlanId] = React.useState<string | null>(null);
  const [hasWorkspace, setHasWorkspace] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchUserWorkspace() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.getUser();
        const user = data?.user;

        if (error || !user) {
          setLoading(false);
          return;
        }

        const workspaces = await fetchWorkspacesForOwner(user.id, supabase);
        if (workspaces && workspaces.length > 0) {
          setHasWorkspace(true);
          setCurrentPlanId(workspaces[0].plan);
        }
      } catch (err) {
        console.error("Error fetching workspace:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchUserWorkspace();
  }, []);

  // Determine if product should be visually highlighted from metadata (optional)
  const highlighted =
    plan.metadata?.["highlighted"] === true ||
    plan.metadata?.["highlighted"] === "true";

  const buttonText =
    (plan.metadata && (plan.metadata["buttonText"] as string)) ?? "Choose";

  // Determine if this is the current plan
  const isCurrentPlan = hasWorkspace && currentPlanId === plan.id;

  // Determine button text based on plan relationship
  let displayButtonText = buttonText;
  if (isCurrentPlan) {
    displayButtonText = "Current Plan";
  } else if (hasWorkspace && currentPlanId) {
    // Simple heuristic: if the plan price is higher, it's an upgrade
    // You could make this more sophisticated based on plan metadata
    const currentPrice = plan.prices?.[0] as any;
    const isFree = currentPrice?.amountType === "free";

    if (isFree) {
      displayButtonText = "Downgrade";
    } else {
      displayButtonText = "Upgrade";
    }
  }

  return (
    <div
      className={cn(
        "relative flex w-full flex-col rounded-none border",
        highlighted && "scale-105",
        className,
      )}
      key={plan.id}
      {...props}
    >
      <div
        className={cn(
          "rounded-t-lg border-b p-4",
          highlighted && "bg-card dark:bg-card/80",
        )}
      >
        <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
          {highlighted && (
            <p className="flex items-center gap-1 rounded-md border bg-background px-2 py-0.5 text-xs">
              <StarIcon className="h-3 w-3 fill-current" />
              Popular
            </p>
          )}
        </div>

        <div className="font-normal text-xl">{plan.name}</div>
        <p className="font-normal text-muted-foreground text-sm">
          {plan.description ?? ""}
        </p>
        <h3 className="mt-6 mb-2 flex items-end gap-1">
          <span className="font-medium text-3xl">
            {(() => {
              const p = (plan.prices && plan.prices[0]) as any;
              if (!p) return "";
              if (p.amountType === "fixed") {
                const cents = Number(p.priceAmount ?? 0);
                const dollars = cents / 100;
                if (cents % 100 === 0) {
                  return `$${Math.round(dollars)}`;
                }
                return `$${dollars.toFixed(2)}`;
              }
              return "free";
            })()}
          </span>
          <span className="text-muted-foreground">
            {plan.isRecurring ? "/month" : ""}
          </span>
        </h3>
      </div>
      <div
        className={cn(
          "space-y-4 px-4 pt-6 pb-8 text-muted-foreground text-sm",
          highlighted && "bg-muted/10",
        )}
      >
        {plan.benefits?.map((benefit, index) => {
          const b = benefit as any;
          const text =
            b.name ?? b.title ?? b.description ?? String(b) ?? "Benefit";
          const tooltip = b.tooltip ?? b.description ?? undefined;
          return (
            <div className="flex items-center gap-2" key={index}>
              <CheckCircleIcon className="h-4 w-4 text-foreground" />
              <TooltipProvider>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <p className={cn(tooltip && "cursor-default! border-b")}>
                      {text}
                    </p>
                  </TooltipTrigger>
                  {tooltip && (
                    <TooltipContent>
                      <p>{tooltip}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          );
        })}
      </div>
      <div
        className={cn(
          "mt-auto w-full rounded-b-lg border-t p-3",
          highlighted && "bg-card dark:bg-card/80",
        )}
      >
        <Button
          className="w-full"
          variant={highlighted ? "default" : "outline"}
          disabled={isCurrentPlan || loading}
          onClick={async () => {
            try {
              const supabase = createClient();
              const { data, error } = await supabase.auth.getUser();
              const user = data?.user;
              if (error || !user) {
                router.push(`/auth/login`);
                return;
              }

              // If user has workspace, go to portal, otherwise go to create
              if (hasWorkspace) {
                router.push(`/portal`);
              } else {
                router.push(`/create`);
              }
            } catch (err) {
              router.push(`/auth/login`);
            }
          }}
        >
          {displayButtonText}
        </Button>
      </div>
    </div>
  );
}
