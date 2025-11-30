import Link from "next/link";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import Section from "@/components/section";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <>
      <Header />

      <Section className="flex min-h-screen flex-col items-center justify-center gap-8 p-0!">
        <div className="gap-3 text-center">
          <h1 className="font-semibold text-8xl">404</h1>
          <p className="text-muted-foreground">Page not found</p>
        </div>
        <Link href="/">
          <Button>Back home</Button>
        </Link>
      </Section>
      <Footer />
    </>
  );
}
