import { Receipt } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import Section from "@/components/section";
import { SuccessWorkspaceHandler } from "@/components/success-workspace-handler";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Payment Successful",
  description:
    "Your payment was successful. Thank you for choosing OpenPolicy.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function Success({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const checkoutId = params.checkoutId as string;
  return (
    <>
      <Header />
      <Section className="p-0!">
        <div className="flex min-h-screen w-full items-center justify-center">
          <div className="flex w-full max-w-md flex-col items-center justify-center">
            <div className="mb-2 flex size-16 items-center justify-center rounded-2xl border border-green-500/20 bg-green-500/10">
              <Receipt className="size-10 text-green-600" />
            </div>
            <h1 className="mb-2 font-medium text-3xl">Success!</h1>
            <p className="mb-2 text-base text-muted-foreground">
              Your payment was successful, thank you.
            </p>
            <p className="bg mb-5 rounded-lg bg-border/60 p-1 px-3 text-muted-foreground text-sm">
              Checkout ID: {checkoutId}
            </p>
            <SuccessWorkspaceHandler />
            <Link href="/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
          </div>
        </div>
      </Section>
      <Footer />
    </>
  );
}
