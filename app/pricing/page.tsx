import { FaqsSection } from "@/components/faqs-section";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { PricingSection } from "@/components/pricing-section";
import Section from "@/components/section";
import { api } from "@/lib/polar";

export default async function Pricing() {
  const products = await api.products.list({ isArchived: false });
  return (
    <>
      <Header />
      <Section className="p-0! -mt-14">
        <div className="w-full min-h-screen flex justify-center items-center">
          <PricingSection
            heading="Plans that Scale with You"
            description="All plans. Start free today, upgrade later."
            plans={products.result.items}
          />
        </div>
      </Section>
      <Section>
        <FaqsSection />
      </Section>
      <Footer />
    </>
  );
}
