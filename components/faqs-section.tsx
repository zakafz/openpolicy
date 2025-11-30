import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function FaqsSection() {
  return (
    <div className="mx-auto w-full space-y-7 px-4 py-8">
      <div className="space-y-2">
        <h2 className="font-medium text-3xl">Frequently Asked Questions</h2>
        <p className="max-w-2xl text-muted-foreground text-sm">
          Here are some common questions and answers that you might encounter
          when using OpenPolicy. If you don't find the answer you're looking
          for, feel free to reach out.
        </p>
      </div>
      <Accordion
        className="-space-y-px w-full rounded-none bg-card"
        collapsible
        defaultValue="item-1"
        type="single"
      >
        {questions.map((item) => (
          <AccordionItem
            className="relative border-x first:border-t last:border-b"
            key={item.id}
            value={item.id}
          >
            <AccordionTrigger className="px-4 py-4 text-[15px] leading-6 hover:no-underline">
              {item.title}
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 text-muted-foreground">
              {item.content}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <p className="text-muted-foreground text-sm">
        Can't find what you're looking for? Contact our{" "}
        <a
          className="text-primary hover:underline"
          href="mailto:support@openpolicyhq.com"
        >
          customer support team
        </a>
      </p>
    </div>
  );
}

const questions = [
  {
    id: "item-1",
    title: "What is OpenPolicy?",
    content:
      "OpenPolicy is a modern platform designed to help organizations host, manage, and update their legal documents and policies. It provides an intuitive text editor and centralized repository for all your policy documentation.",
  },
  {
    id: "item-2",
    title: "Who can benefit from OpenPolicy?",
    content:
      "OpenPolicy is built for startups, small businesses, and enterprises that need to maintain privacy policies, terms of service, acceptable use policies, and other legal documentation without the complexity of traditional systems.",
  },
  {
    id: "item-3",
    title: "What features do I get with OpenPolicy?",
    content:
      "OpenPolicy offers a powerful rich text editor, instant publishing with SEO optimization, centralized document management, and a secure hosting platform.",
  },
  {
    id: "item-4",
    title: "Can I customize my documents?",
    content:
      "Yes. OpenPolicy provides a flexible text editor with formatting options, allowing you to create documents that match your brand and requirements. You have full control over the content and structure of your policies.",
  },
  {
    id: "item-5",
    title: "Is my data secure?",
    content:
      "Yes. OpenPolicy uses industry-standard security practices to protect your documents. All data is stored securely, and you maintain full control over who can access and edit your policies.",
  },
  {
    id: "item-6",
    title: "How do I get support?",
    content:
      "You can reach out through our contact page, or connect with us on GitHub and LinkedIn. We're committed to helping you get the most out of OpenPolicy.",
  },
  {
    id: "item-7",
    title: "How do I get started with OpenPolicy?",
    content:
      "Getting started is easy! Simply sign up for an account, create your first document, write your policy using our intuitive editor, and publish. Your document will be live instantly with a secure, SEO-optimized URL.",
  },
];
