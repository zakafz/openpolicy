"use client";
import { CheckCircleIcon, StarIcon } from "lucide-react";
import React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Product } from "@polar-sh/sdk/models/components/product.js";

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

      <div className="mx-auto grid w-full max-w-4xl mt-5 grid-cols-1 md:grid-cols-3">
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

  // Determine if product should be visually highlighted from metadata (optional)
  const highlighted =
    plan.metadata?.["highlighted"] === true ||
    plan.metadata?.["highlighted"] === "true";

  const buttonText =
    (plan.metadata && (plan.metadata["buttonText"] as string)) ?? "Choose";

  return (
    <div
      className={cn(
        "relative flex w-full flex-col rounded-none border first:md:border-r-0 last:md:border-l-0",
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
                    <p className={cn(tooltip && "cursor-pointer border-b")}>
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
          onClick={async () => {
            const supabase = createClient();
            try {
              // Check if user is authenticated in the browser
              // Using the browser auth method to determine current user/session
              const { data, error } = await supabase.auth.getUser();
              const user = data?.user;
              // If no user, send them to the login page and include the plan + desired next path
              if (error || !user) {
                const next = encodeURIComponent(
                  `/checkout?products=${plan.id}`,
                );
                router.push(
                  `/auth/login?plan=${encodeURIComponent(plan.id)}&next=${next}`,
                );
                return;
              }
            } catch {
              // fallback: send to login with plan info
              const next = encodeURIComponent(`/checkout?products=${plan.id}`);
              router.push(
                `/auth/login?plan=${encodeURIComponent(plan.id)}&next=${next}`,
              );
              return;
            }
            // If authenticated, go straight to checkout
            router.push(`/checkout?products=${plan.id}`);
          }}
        >
          {buttonText}
        </Button>
      </div>
    </div>
  );
}
