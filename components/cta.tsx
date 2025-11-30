import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import Section from "./section";
import { Button } from "./ui/button";

export default function CTA() {
  return (
    <Section className="flex flex-col gap-8 py-16!">
      <div className="flex flex-col items-center gap-2">
        <h2 className="text-center font-semibold text-xl md:text-3xl">
          Start for Free Today
        </h2>
        <p className="mx-auto max-w-[720px] text-balance text-center text-muted-foreground text-sm md:text-base">
          Start with a free account, free for life. No credit card required.
          Then upgrade to a paid plan when you're ready.
        </p>
      </div>
      <div className="flex items-center justify-center gap-2">
        <Link href="/auth/login">
          <Button>
            Get Started <ArrowRightIcon />
          </Button>
        </Link>
      </div>
    </Section>
  );
}
