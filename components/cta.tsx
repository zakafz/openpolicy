import Link from "next/link";
import Section from "./section";
import { Button } from "./ui/button";
import { ArrowRightIcon } from "lucide-react";

export default function CTA() {
  return (
    <Section className="flex gap-8 flex-col py-16!">
      <div className="flex flex-col items-center gap-2">
        <h2 className="text-center font-semibold text-xl md:text-3xl">
          Start for Free Today
        </h2>
        <p className="text-balance text-center text-muted-foreground max-w-[720px] mx-auto text-sm md:text-base">
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
