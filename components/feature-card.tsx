import type React from "react";
import type { ReactNode } from "react";
import { GridPattern } from "@/components/ui/grid-pattern";
import { cn } from "@/lib/utils";

type FeatureType = {
  title: string;
  icon: ReactNode;
  description: string;
};

type FeatureCardPorps = React.ComponentProps<"div"> & {
  feature: FeatureType;
};

export function FeatureCard({
  feature,
  className,
  ...props
}: FeatureCardPorps) {
  return (
    <div className={cn("relative overflow-hidden p-6", className)} {...props}>
      <div className="-mt-2 -ml-20 mask-[radial-gradient(farthest-side_at_top,white,transparent)] pointer-events-none absolute top-0 left-1/2 size-full">
        <GridPattern
          className="absolute inset-0 size-full stroke-foreground/20"
          height={40}
          width={40}
          x={5}
        />
      </div>
      {feature.icon}
      <h3 className="mt-10 font-medium text-sm md:text-base">
        {feature.title}
      </h3>
      <p className="relative z-20 mt-2 font-light text-muted-foreground text-xs">
        {feature.description}
      </p>
    </div>
  );
}
