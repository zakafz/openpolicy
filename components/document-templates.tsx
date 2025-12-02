import type { DocumentType } from "@/types/documents";

// Document templates (Slate/Plate JSON format)
export const contentTemplates: Record<DocumentType, any> = {
  privacy: [
    {
      type: "h1",
      children: [{ text: "Privacy Policy" }],
    },
    {
      type: "h2",
      children: [{ text: "1. Introduction" }],
    },
    {
      type: "p",
      children: [
        {
          text: "Welcome to [Company Name]. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website (regardless of where you visit it from) and tell you about your privacy rights and how the law protects you.",
        },
      ],
    },
    {
      type: "h2",
      children: [{ text: "2. Data We Collect" }],
    },
    {
      type: "p",
      children: [
        {
          text: "We may collect, use, store and transfer different kinds of personal data about you which we have grouped together follows: Identity Data, Contact Data, Technical Data, Usage Data, and Marketing and Communications Data.",
        },
      ],
    },
  ],
  terms: [
    {
      type: "h1",
      children: [{ text: "Terms of Service" }],
    },
    {
      type: "h2",
      children: [{ text: "1. Agreement to Terms" }],
    },
    {
      type: "p",
      children: [
        {
          text: "By accessing or using our website, you agree to be bound by these Terms of Service and our Privacy Policy.",
        },
      ],
    },
    {
      type: "h2",
      children: [{ text: "2. Use of Service" }],
    },
    {
      type: "p",
      children: [
        {
          text: "You agree to use the service only for lawful purposes and in accordance with these Terms. You are responsible for maintaining the confidentiality of your account.",
        },
      ],
    },
  ],
  cookie: [
    {
      type: "h1",
      children: [{ text: "Cookie Policy" }],
    },
    {
      type: "p",
      children: [
        {
          text: "This Cookie Policy explains how [Company Name] uses cookies and similar technologies to recognize you when you visit our website.",
        },
      ],
    },
    {
      type: "h2",
      children: [{ text: "What are cookies?" }],
    },
    {
      type: "p",
      children: [
        {
          text: "Cookies are small data files that are placed on your computer or mobile device when you visit a website. Cookies are widely used by website owners in order to make their websites work, or to work more efficiently, as well as to provide reporting information.",
        },
      ],
    },
  ],
  refund: [
    {
      type: "h1",
      children: [{ text: "Refund Policy" }],
    },
    {
      type: "p",
      children: [
        {
          text: "Thank you for shopping at [Company Name].",
        },
      ],
    },
    {
      type: "p",
      children: [
        {
          text: "If you are not entirely satisfied with your purchase, we're here to help.",
        },
      ],
    },
    {
      type: "h2",
      children: [{ text: "Returns" }],
    },
    {
      type: "p",
      children: [
        {
          text: "You have [number] calendar days to return an item from the date you received it.",
        },
      ],
    },
  ],
  shipping: [
    {
      type: "h1",
      children: [{ text: "Shipping Policy" }],
    },
    {
      type: "p",
      children: [
        {
          text: "This Shipping Policy describes how [Company Name] handles shipping and delivery of orders.",
        },
      ],
    },
    {
      type: "h2",
      children: [{ text: "Processing Time" }],
    },
    {
      type: "p",
      children: [
        {
          text: "All orders are processed within [number] business days.",
        },
      ],
    },
  ],
  "intellectual-property": [
    {
      type: "h1",
      children: [{ text: "Intellectual Property Policy" }],
    },
    {
      type: "p",
      children: [
        {
          text: "This policy outlines the intellectual property rights of [Company Name] and third parties.",
        },
      ],
    },
    {
      type: "h2",
      children: [{ text: "Copyright" }],
    },
    {
      type: "p",
      children: [
        {
          text: "All content included on this site, such as text, graphics, logos, button icons, images, audio clips, digital downloads, data compilations, and software, is the property of [Company Name] or its content suppliers and protected by international copyright laws.",
        },
      ],
    },
  ],
  "data-protection": [
    {
      type: "h1",
      children: [{ text: "Data Protection Policy" }],
    },
    {
      type: "p",
      children: [
        {
          text: "This Data Protection Policy sets out how [Company Name] handles personal data in compliance with data protection laws.",
        },
      ],
    },
    {
      type: "h2",
      children: [{ text: "Principles" }],
    },
    {
      type: "p",
      children: [
        {
          text: "We will comply with data protection law. This says that the personal information we hold about you must be: 1. Used lawfully, fairly and in a transparent way. 2. Collected only for valid purposes that we have clearly explained to you and not used in any way that is incompatible with those purposes.",
        },
      ],
    },
  ],
  other: [
    {
      type: "h1",
      children: [{ text: "Document" }],
    },
    {
      type: "p",
      children: [{ text: "" }],
    },
  ],
};
