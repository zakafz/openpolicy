import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import CTA from "@/components/cta";
import { ShowcaseEditor } from "@/components/editor/showcase-editor";
import { FeatureCard } from "@/components/feature-card";
import FeaturesSection from "@/components/features";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import {
  Announcement,
  AnnouncementTag,
  AnnouncementTitle,
} from "@/components/kibo-ui/announcement";
import Section from "@/components/section";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Safari } from "@/components/ui/safari";

export const metadata: Metadata = {
  title: "OpenPolicy - The Better Way to Handle Your Policies",
  description:
    "The better way to handle your policies and documents. Effortlessly host, manage, and update your policies in one secure platform.",
  twitter: {
    title: "OpenPolicy - Modern Policy Documentation Platform",
    description: "The better way to handle your policies and documents.",
  },
};

export default function Home() {
  const features = [
    {
      title: "Create",
      icon: (
        <div className="flex size-7! w-fit items-center justify-center border bg-border/60">
          1
        </div>
      ),
      description: "Create a new document in seconds.",
    },
    {
      title: "Write",
      icon: (
        <div className="flex size-7! w-fit items-center justify-center border bg-border/60">
          2
        </div>
      ),
      description: "Write your document in a easy to use text editor.",
    },
    {
      title: "Publish",
      icon: (
        <div className="flex size-7! w-fit items-center justify-center border bg-border/60">
          3
        </div>
      ),
      description:
        "Your document is live, secure, and optimized for SEO instantly.",
    },
  ];
  return (
    <>
      <Header />

      <Section className="p-4">
        <div className="mx-auto flex max-w-[800px] flex-col items-center justify-center pt-32 pb-32">
          <Announcement className="pointer-events-none mb-3">
            <AnnouncementTag>Latest update</AnnouncementTag>
            <AnnouncementTitle>OpenPolicy v0.1.0 is now live</AnnouncementTitle>
          </Announcement>

          <h1 className="mb-5 text-center font-medium text-5xl leading-15">
            The Easiest Way to Host Your Policies
          </h1>
          <p className="mx-auto max-w-[600px] text-center text-lg text-muted-foreground">
            Stop messing with PDF uploads and complex CMSs. OpenPolicy lets you
            write, host, and manage your public legal documents in minutes.
          </p>
          <div className="mx-auto mt-5 flex gap-2">
            <Link href="/auth/login">
              <Button size="lg">Get Started</Button>
            </Link>
            <Link href="/about">
              <Button size="lg" variant={"outline"}>
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </Section>
      <Section className="py-8">
        <h2 className="text-balance text-center font-medium text-3xl">
          Document management doesn't have to be complicated
        </h2>
        <p className="mt-2 mb-10 text-balance text-center text-muted-foreground text-sm">
          Get your policies, public documents, and other legal documents live in
          three simple steps.
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
      <Section>
        <FeaturesSection />
      </Section>
      <Section className="py-8">
        <h2 className="text-balance text-start font-medium text-3xl">
          Centralized document repository for your organization
        </h2>
        <p className="mt-2 mb-5 text-balance text-start text-muted-foreground text-sm">
          View and manage all your documents in one place. Never lose track of
          your documents again. Neither you or your clients will have to search
          through multiple systems to find the documents they need.
        </p>
        <Link href="https://more.openpolicyhq.com/">
          <Button className="mb-10">View demo</Button>
        </Link>
        <Safari url="policies.yourapp.com" imageSrc="/demo-2.png" />
      </Section>

      <Section className="px-0! pt-8 md:pb-0!">
        <h2 className="text-balance px-5 text-start font-medium text-3xl">
          A simple and straightforward editor
        </h2>
        <p className="mt-2 mb-7 text-balance px-5 text-start text-muted-foreground text-sm">
          Focus on the content, not the formatting. Our intuitive text editor
          provides all the tools you need to write comprehensive, easy-to-read
          document.
        </p>
        <div className="mx-auto flex w-full items-center justify-center">
          <Card className="col-span-full mx-5 overflow-hidden rounded-none pl-6 shadow-none md:hidden">
            <div className="mask-b-from-95% -ml-2 pt-2 pl-2">
              <div className="relative mx-auto h-96 overflow-hidden border border-border border-px border-r-0 border-b-0 bg-background">
                <Image
                  src="/demo-5.png"
                  alt="app screen"
                  width={2880}
                  height={1842}
                  className="h-full object-cover object-top-left"
                />
              </div>
            </div>
          </Card>
          <div className="hidden w-[calc(100vw-34px)] max-w-[calc(1152px-2px)] border-t md:block">
            <ShowcaseEditor
              initialContent={[
                {
                  type: "h1",
                  children: [{ text: "What is OpenPolicy?" }],
                },
                {
                  type: "p",
                  children: [
                    {
                      text: "OpenPolicy is a modern platform designed to simplify how organizations create, manage, and publish their legal documents and policies. We believe that policy management shouldn't require complex systems or technical expertise.",
                    },
                  ],
                },
                {
                  type: "p",
                  children: [{ text: "" }],
                },
                {
                  type: "h2",
                  children: [{ text: "Key Features" }],
                },
                {
                  type: "ul",
                  children: [
                    {
                      type: "li",
                      children: [
                        {
                          type: "p",
                          children: [
                            { text: "Rich Text Editor", bold: true },
                            {
                              text: " - Write policies with a powerful, easy-to-use editor that supports formatting, lists, and more",
                            },
                          ],
                        },
                      ],
                    },
                    {
                      type: "li",
                      children: [
                        {
                          type: "p",
                          children: [
                            { text: "Instant Publishing", bold: true },
                            {
                              text: " - Your documents go live immediately with SEO optimization built-in",
                            },
                          ],
                        },
                      ],
                    },
                    {
                      type: "li",
                      children: [
                        {
                          type: "p",
                          children: [
                            { text: "Centralized Management", bold: true },
                            {
                              text: " - Keep all your documents organized in one secure location",
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "h2",
                  children: [{ text: "Perfect For" }],
                },
                {
                  type: "p",
                  children: [
                    {
                      text: "OpenPolicy is ideal for startups, small businesses, and enterprises that need to maintain ",
                    },
                    { text: "privacy policies", italic: true },
                    { text: ", " },
                    { text: "terms of service", italic: true },
                    { text: ", " },
                    { text: "acceptable use policies", italic: true },
                    {
                      text: ", and other legal documentation without the hassle.",
                    },
                  ],
                },
                {
                  type: "blockquote",
                  children: [
                    {
                      type: "p",
                      children: [
                        {
                          text: '"Stop wrestling with PDFs and complex CMSs. Start managing your policies the modern way."',
                          italic: true,
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "p",
                  children: [
                    {
                      text: "Get started today and experience the difference of ",
                    },
                    {
                      text: "streamlined policy management",
                      backgroundColor: "#fef08a",
                    },
                    { text: "." },
                  ],
                },
              ]}
            />
          </div>
        </div>
      </Section>
      <CTA />
      <Footer />
    </>
  );
}
