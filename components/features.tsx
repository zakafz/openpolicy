import { BookOpenCheck, Layout, Scale, Sparkles } from "lucide-react";
import Image from "next/image";
import { Card } from "@/components/ui/card";

export default function FeaturesSection() {
  return (
    <section>
      <div className="py-8">
        <div className="mx-auto w-full">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="col-span-full overflow-hidden rounded-none pt-6 pl-6 shadow-none">
              <div className="flex w-fit items-center justify-center border bg-accent p-2">
                <Layout className="size-5 text-primary" />
              </div>
              <h3 className="mt-5 font-semibold text-foreground text-lg">
                Simple & Fast
              </h3>
              <p className="mt-3 w-full max-w-xl text-balance pr-6 text-muted-foreground">
                Our dashboard is designed to be simple and fast to use. You can
                manage all your documents in one place. Our team is always
                working on new features to make your experience even better.
              </p>
              <div className="mask-b-from-95% -ml-2 -mt-2 mr-0.5 pt-2 pl-2">
                <div className="relative mx-auto mt-8 h-96 overflow-hidden border border-transparent bg-background shadow ring-1 ring-foreground/5">
                  <Image
                    src="/demo-1.png"
                    alt="app screen"
                    width={2880}
                    height={1842}
                    className="h-full object-cover object-top-left"
                  />
                </div>
              </div>
            </Card>
            <Card className="rounded-none p-6 shadow-none">
              <div className="flex w-fit items-center justify-center border bg-accent p-2">
                <Scale className="size-5 text-primary" />
              </div>
              <h3 className="mt-5 font-semibold text-foreground text-lg">
                Legal Documents
              </h3>
              <p className="mt-3 text-balance text-muted-foreground">
                Host and manage your legal documents with ease. A central
                repository for all your legal documents.
              </p>
            </Card>

            <Card className="rounded-none p-6 shadow-none">
              <div className="flex w-fit items-center justify-center border bg-accent p-2">
                <BookOpenCheck className="size-5 text-primary" />
              </div>
              <h3 className="mt-5 font-semibold text-foreground text-lg">
                Policies & Compliance
              </h3>
              <p className="mt-3 text-balance text-muted-foreground">
                Stop getting lost in your policies and compliance documents.
                Stop searching for the right document and start using
                OpenPolicy.
              </p>
            </Card>
            <Card className="rounded-none p-6 shadow-none">
              <div className="flex w-fit items-center justify-center border bg-accent p-2">
                <Sparkles className="size-5 text-primary" />
              </div>
              <h3 className="mt-5 font-semibold text-foreground text-lg">
                Other types of documents
              </h3>
              <p className="mt-3 text-balance text-muted-foreground">
                From guides to onboarding documents, OpenPolicy helps you manage
                all your documents in one place.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
