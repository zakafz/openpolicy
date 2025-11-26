import type { Metadata } from "next";
import { ArrowUpRightIcon, Text } from "lucide-react";
import { FeatureCard } from "@/components/feature-card";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import {
  Announcement,
  AnnouncementTag,
  AnnouncementTitle,
} from "@/components/kibo-ui/announcement";
import Section from "@/components/section";
import { Button } from "@/components/ui/button";
import CTA from "@/components/cta";
import { Safari } from "@/components/ui/safari";
import { EditorShowcase } from "@/components/tiptap/editor/editor-showcase";
import FeaturesSection from "@/components/features";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import Image from "next/image";

export const metadata: Metadata = {
  title: 'OpenPolicy - The Better Way to Handle Your Policies',
  description: 'The better way to handle your policies and documents. Effortlessly host, manage, and update your policies in one secure platform.',
  openGraph: {
    title: 'OpenPolicy - The Better Way to Handle Your Policies',
    description: 'Effortlessly host, manage, and update your policies and documents. All in one secure platform.',
    url: '/',
  },
  twitter: {
    title: 'OpenPolicy - Modern Policy Documentation Platform',
    description: 'The better way to handle your policies and documents.',
  },
};

export default function Home() {
  const features = [
    {
      title: "1. Create",
      icon: (
        <div className="w-fit size-7! justify-center flex items-center border bg-border/60">
          1
        </div>
      ),
      description: "Create a new document in seconds.",
    },
    {
      title: "2. Write",
      icon: (
        <div className="w-fit size-7! justify-center flex items-center border bg-border/60">
          2
        </div>
      ),
      description: "Write your document in a easy to use text editor.",
    },
    {
      title: "3. Publish",
      icon: (
        <div className="w-fit size-7! justify-center flex items-center border bg-border/60">
          3
        </div>
      ),
      description: "Your document is live, secure, and optimized for SEO instantly.",
    },
  ];
  return (
    <>
      <Header />

      <Section className="p-4">
        <div className="flex flex-col items-center justify-center max-w-[800px] mx-auto pt-32 pb-32">
          <Announcement className="mb-3 pointer-events-none">
            <AnnouncementTag>Latest update</AnnouncementTag>
            <AnnouncementTitle>
              OpenPolicy 1.0 is now live
            </AnnouncementTitle>
          </Announcement>

          <h1 className="text-5xl font-medium text-center mb-5 leading-15">
            The Easiest Way to Host Your Policies
          </h1>
          <p className="text-lg text-center max-w-[600px] mx-auto text-muted-foreground">
            Stop messing with PDF uploads and complex CMSs. OpenPolicy lets you write, host, and manage your public legal documents in minutes.
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
          Document management doesn't have to be complicated
        </h2>
        <p className="mt-2 text-balance text-muted-foreground text-sm mb-10 text-center">
          Get your policies, public documents, and other legal documents live in three simple steps.
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
        <h2 className="text-balance font-medium text-3xl text-start">
          Centralized document repository for your organization
        </h2>
        <p className="mt-2 text-balance text-muted-foreground text-sm mb-5 text-start">
          View and manage all your documents in one place. Never lose track of your documents again. Neither you or your clients will have to search through multiple systems to find the documents they need.
        </p>
        <Link href="https://more.openpolicyhq.com/" >
          <Button className="mb-10">View demo</Button>
        </Link>
        <Safari
          url="more.openpolicyhq.com"
          imageSrc="/demo-2.png"
        />
      </Section>

      <Section className="py-8">
        <h2 className="text-balance font-medium text-3xl text-start">
          A simple and straightforward editor
        </h2>
        <p className="mt-2 text-balance text-muted-foreground text-sm mb-7 text-start">
          Focus on the content, not the formatting. Our intuitive text editor provides all the tools you need to write comprehensive, easy-to-read document.
        </p>
        <div className="mx-auto w-full flex items-center justify-center">
          <Card
                    className="col-span-full md:hidden overflow-hidden rounded-none shadow-none pl-6">
                    <div className="mask-b-from-95% -ml-2 pl-2 pt-2">
                        <div className="bg-background relative mx-auto h-96 overflow-hidden border-px border border-border border-b-0 border-r-0">
                            <Image
                                src="/demo-3.png"
                                alt="app screen"
                                width={2880}
                                height={1842}
                                className="object-top-left h-full object-cover"
                            />
                        </div>
                    </div>
                </Card>
          <EditorShowcase
            initialContent={{
              type: "doc",
              content: [
                {
                  type: "heading",
                  attrs: { textAlign: null, level: 1 },
                  content: [{ type: "text", text: "What is OpenPolicy?" }]
                },
                {
                  type: "paragraph",
                  attrs: { textAlign: null },
                  content: [
                    { type: "text", text: "OpenPolicy is a modern platform designed to simplify how organizations create, manage, and publish their legal documents and policies. We believe that policy management shouldn't require complex systems or technical expertise." }
                  ]
                },
                {
                  type: 'paragraph',
                  attrs: { textAlign: null },
                },
                {
                  type: "heading",
                  attrs: { textAlign: null, level: 2 },
                  content: [{ type: "text", text: "Key Features" }]
                },
                {
                  type: "bulletList",
                  content: [
                    {
                      type: "listItem",
                      content: [
                        {
                          type: "paragraph",
                          attrs: { textAlign: null },
                          content: [
                            { type: "text", marks: [{ type: "bold" }], text: "Rich Text Editor" },
                            { type: "text", text: " - Write policies with a powerful, easy-to-use editor that supports formatting, lists, and more" }
                          ]
                        }
                      ]
                    },
                    {
                      type: "listItem",
                      content: [
                        {
                          type: "paragraph",
                          attrs: { textAlign: null },
                          content: [
                            { type: "text", marks: [{ type: "bold" }], text: "Instant Publishing" },
                            { type: "text", text: " - Your documents go live immediately with SEO optimization built-in" }
                          ]
                        }
                      ]
                    },
                    {
                      type: "listItem",
                      content: [
                        {
                          type: "paragraph",
                          attrs: { textAlign: null },
                          content: [
                            { type: "text", marks: [{ type: "bold" }], text: "Centralized Management" },
                            { type: "text", text: " - Keep all your documents organized in one secure location" }
                          ]
                        }
                      ]
                    },
                  ]
                },
                {
                  type: "heading",
                  attrs: { textAlign: null, level: 2 },
                  content: [{ type: "text", text: "Perfect For" }]
                },
                {
                  type: "paragraph",
                  attrs: { textAlign: null },
                  content: [
                    { type: "text", text: "OpenPolicy is ideal for startups, small businesses, and enterprises that need to maintain " },
                    { type: "text", marks: [{ type: "italic" }], text: "privacy policies" },
                    { type: "text", text: ", " },
                    { type: "text", marks: [{ type: "italic" }], text: "terms of service" },
                    { type: "text", text: ", " },
                    { type: "text", marks: [{ type: "italic" }], text: "acceptable use policies" },
                    { type: "text", text: ", and other legal documentation without the hassle." }
                  ]
                },
                {
                  type: "blockquote",
                  content: [
                    {
                      type: "paragraph",
                      attrs: { textAlign: null },
                      content: [
                        { type: "text", marks: [{ type: "italic" }], text: "\"Stop wrestling with PDFs and complex CMSs. Start managing your policies the modern way.\"" }
                      ]
                    }
                  ]
                },
                {
                  type: "paragraph",
                  attrs: { textAlign: null },
                  content: [
                    { type: "text", text: "Get started today and experience the difference of " },
                    { type: "text", marks: [{ type: "highlight", attrs: { color: "#fef08a" } }], text: "streamlined policy management" },
                    { type: "text", text: "." }
                  ]
                }
              ]
            }}
            initialIsJson={true}
          />
        </div>
      </Section>
      <CTA />
      <Footer />
    </>
  );
}