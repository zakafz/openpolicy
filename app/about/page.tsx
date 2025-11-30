import ContentSection from "@/components/content";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import Section from "@/components/section";

export default function About() {
  return (
    <>
      <Header />
      <Section className="min-h-screen">
        <ContentSection />
      </Section>
      <Footer />
    </>
  );
}
