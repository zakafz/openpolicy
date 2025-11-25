import { Receipt } from "lucide-react";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import Section from "@/components/section";
import { Button } from "@/components/ui/button";

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
      <Section className="p-0! -mt-14">
        <div className="w-full min-h-screen flex justify-center items-center">
          <div className="w-full max-w-md flex justify-center items-center flex-col">
            <div className="size-16 mb-2 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center justify-center">
              <Receipt className="size-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-medium mb-2">Success!</h1>
            <p className="text-base mb-2 text-muted-foreground">
              Your payment was successful, thank you.
            </p>
            <p className="text-sm mb-5 bg p-1 rounded-lg bg-border/60 px-3 text-muted-foreground">
              Checkout ID: {checkoutId}
            </p>
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
