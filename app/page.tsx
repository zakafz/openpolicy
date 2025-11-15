import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import {
  Announcement,
  AnnouncementTag,
  AnnouncementTitle,
} from "@/components/kibo-ui/announcement";
import Section from "@/components/section";
import { Button } from "@/components/ui/button";
import { ArrowUpRightIcon } from "lucide-react";
import { FeatureCard } from "@/components/feature-card";

export default function Home() {
  const features = [
    {
      title: "Faaast",
      icon: (
        <div className="w-fit size-7! justify-center flex items-center rounded-lg bg-border/60">
          1
        </div>
      ),
      description: "It supports an entire helping developers and innovate.",
    },
    {
      title: "Powerful",
      icon: (
        <div className="w-fit size-7! justify-center flex items-center rounded-lg bg-border/60">
          2
        </div>
      ),
      description: "It supports an entire helping developers and businesses.",
    },
    {
      title: "Security",
      icon: (
        <div className="w-fit size-7! justify-center flex items-center rounded-lg bg-border/60">
          3
        </div>
      ),
      description: "It supports an helping developers businesses.",
    },
  ];
  return (
    <>
      <Header />

      <Section className="p-0! -mt-14">
        <div className="flex flex-col items-center justify-center max-w-[700px] mx-auto pt-32 pb-32">
          <Announcement className="mb-3 cursor-pointer">
            <AnnouncementTag>Latest update</AnnouncementTag>
            <AnnouncementTitle>
              New feature added
              <ArrowUpRightIcon
                className="shrink-0 text-muted-foreground"
                size={16}
              />
            </AnnouncementTitle>
          </Announcement>

          <h1 className="text-5xl font-medium text-center mb-5 leading-15">
            The Better Way to Handle Your Policies and Documents
          </h1>
          <p className="text-lg text-center max-w-[550px] mx-auto text-muted-foreground">
            Effortlessly host, manage, and update your policies and documents.
            All in one secure platform, ensuring your users always see the
            latest version and your business stays compliant.
          </p>
          <div className="mx-auto flex gap-2 mt-5">
            <Button size="lg">Get Started</Button>
            <Button size="lg" variant={"outline"}>
              Learn More
            </Button>
          </div>
        </div>
      </Section>
      <Section className="py-8">
        <h2 className="text-balance font-medium text-3xl text-center">
          With us, appointment scheduling is easy
        </h2>
        <p className="mt-2 text-balance text-muted-foreground text-sm mb-10 text-center">
          Everything you need to build fast, secure, scalable apps.
        </p>
        <div className="grid grid-cols-1 divide-x divide-y border-t border-l sm:grid-cols-2 md:grid-cols-3">
          {features.map((feature) => (
            <FeatureCard
              className="last:border-r last:border-b"
              feature={feature}
              key={feature.title}
            />
          ))}
        </div>
      </Section>
      <Footer />
    </>
  );
}
