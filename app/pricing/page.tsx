import type { Metadata } from "next";
import { FaqsSection } from "@/components/faqs-section";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import PricingComparator from "@/components/pricing-comparator";
import { PricingSection } from "@/components/pricing-section";
import Section from "@/components/section";
import { api } from "@/lib/polar";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Choose the perfect plan for your team. Flexible pricing for organizations of all sizes. Start free and scale as you grow.",
  openGraph: {
    title: "OpenPolicy Pricing - Plans That Scale With You",
    description:
      "Flexible pricing for teams of all sizes. Start free today, upgrade later.",
    url: "/pricing",
  },
  twitter: {
    title: "OpenPolicy Pricing",
    description:
      "Choose the perfect plan for your team. Start free and scale as you grow.",
  },
};

export default async function Pricing() {
  const products = await api.products.list({ isArchived: false });
  return (
    <>
      <Header />
      <Section className="p-4 py-16">
        <div className="flex min-h-screen w-full items-center justify-center">
          <PricingSection
            heading="Plans that Scale with You"
            description="All plans. Start free today, upgrade later."
            plans={products.result.items}
          />
        </div>
      </Section>
      <div className="max-md:hidden">
        <Section className="p-0!">
          <PricingComparator plans={products.result.items} />
        </Section>
      </div>
      <Section>
        <FaqsSection />
      </Section>
      <Footer />
    </>
  );
}
