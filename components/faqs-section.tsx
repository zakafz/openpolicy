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
        <p className="max-w-2xl text-sm text-muted-foreground">
          Here are some common questions and answers that you might encounter
          when using Efferd. If you don't find the answer you're looking for,
          feel free to reach out.
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
    title: "What is Efferd?",
    content:
      "Efferd is a collection of beautifully crafted Shadcn UI blocks and components, designed to help developers build modern websites with ease.",
  },
  {
    id: "item-2",
    title: "Who can benefit from Efferd?",
    content:
      "Efferd is built for founders, product teams, and agencies that want to accelerate idea validation and delivery.",
  },
  {
    id: "item-3",
    title: "What features does Efferd include?",
    content:
      "Efferd offers a collaborative workspace where you can design and build beautiful web applications, with reusable UI blocks, deployment automation, and comprehensive analytics all in one place. With Efferd, you can streamline your team’s workflow and deliver high-quality websites quickly and efficiently.",
  },
  {
    id: "item-4",
    title: "Can I customize components in Efferd?",
    content:
      "Yes. Efferd offers editable design systems and code scaffolding so you can tailor blocks to your brand and workflow.",
  },
  {
    id: "item-5",
    title: "Does Efferd integrate with my existing tools?",
    content:
      "Efferd connects with popular source control, design tools, and cloud providers to fit into your current stack.",
  },
  {
    id: "item-6",
    title: "How do I get support while using Efferd?",
    content:
      "You can access detailed docs, community forums, and dedicated customer success channels for help at any time.",
  },
  {
    id: "item-7",
    title: "How do I get started with Efferd?",
    content:
      "You can access detailed docs, community forums, and dedicated customer success channels for help at any time.",
  },
];
