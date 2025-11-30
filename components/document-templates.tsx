import type { DocumentType } from "@/types/documents";

// Docs templates (Tiptap JSON)
// TODO: Make them way better
export const contentTemplates: Record<DocumentType, any> = {
  privacy: {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { textAlign: null, level: 1 },
        content: [{ type: "text", text: "Privacy Policy" }],
      },
      {
        type: "heading",
        attrs: { textAlign: null, level: 2 },
        content: [{ type: "text", text: "1. Introduction" }],
      },
      {
        type: "paragraph",
        attrs: { textAlign: null },
        content: [
          {
            type: "text",
            text: "Welcome to [Company Name]. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website (regardless of where you visit it from) and tell you about your privacy rights and how the law protects you.",
          },
        ],
      },
      {
        type: "heading",
        attrs: { textAlign: null, level: 2 },
        content: [{ type: "text", text: "2. Data We Collect" }],
      },
      {
        type: "paragraph",
        attrs: { textAlign: null },
        content: [
          {
            type: "text",
            text: "We may collect, use, store and transfer different kinds of personal data about you which we have grouped together follows: Identity Data, Contact Data, Technical Data, Usage Data, and Marketing and Communications Data.",
          },
        ],
      },
    ],
  },
  terms: {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { textAlign: null, level: 1 },
        content: [{ type: "text", text: "Terms of Service" }],
      },
      {
        type: "heading",
        attrs: { textAlign: null, level: 2 },
        content: [{ type: "text", text: "1. Agreement to Terms" }],
      },
      {
        type: "paragraph",
        attrs: { textAlign: null },
        content: [
          {
            type: "text",
            text: "By accessing or using our website, you agree to be bound by these Terms of Service and our Privacy Policy.",
          },
        ],
      },
      {
        type: "heading",
        attrs: { textAlign: null, level: 2 },
        content: [{ type: "text", text: "2. Use of Service" }],
      },
      {
        type: "paragraph",
        attrs: { textAlign: null },
        content: [
          {
            type: "text",
            text: "You agree to use the service only for lawful purposes and in accordance with these Terms. You are responsible for maintaining the confidentiality of your account.",
          },
        ],
      },
    ],
  },
  cookie: {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { textAlign: null, level: 1 },
        content: [{ type: "text", text: "Cookie Policy" }],
      },
      {
        type: "paragraph",
        attrs: { textAlign: null },
        content: [
          {
            type: "text",
            text: "This Cookie Policy explains how [Company Name] uses cookies and similar technologies to recognize you when you visit our website.",
          },
        ],
      },
      {
        type: "heading",
        attrs: { textAlign: null, level: 2 },
        content: [{ type: "text", text: "What are cookies?" }],
      },
      {
        type: "paragraph",
        attrs: { textAlign: null },
        content: [
          {
            type: "text",
            text: "Cookies are small data files that are placed on your computer or mobile device when you visit a website. Cookies are widely used by website owners in order to make their websites work, or to work more efficiently, as well as to provide reporting information.",
          },
        ],
      },
    ],
  },
  refund: {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { textAlign: null, level: 1 },
        content: [{ type: "text", text: "Refund Policy" }],
      },
      {
        type: "paragraph",
        attrs: { textAlign: null },
        content: [
          {
            type: "text",
            text: "Thank you for shopping at [Company Name].",
          },
        ],
      },
      {
        type: "paragraph",
        attrs: { textAlign: null },
        content: [
          {
            type: "text",
            text: "If you are not entirely satisfied with your purchase, we're here to help.",
          },
        ],
      },
      {
        type: "heading",
        attrs: { textAlign: null, level: 2 },
        content: [{ type: "text", text: "Returns" }],
      },
      {
        type: "paragraph",
        attrs: { textAlign: null },
        content: [
          {
            type: "text",
            text: "You have [number] calendar days to return an item from the date you received it.",
          },
        ],
      },
    ],
  },
  shipping: {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { textAlign: null, level: 1 },
        content: [{ type: "text", text: "Shipping Policy" }],
      },
      {
        type: "paragraph",
        attrs: { textAlign: null },
        content: [
          {
            type: "text",
            text: "This Shipping Policy describes how [Company Name] handles shipping and delivery of orders.",
          },
        ],
      },
      {
        type: "heading",
        attrs: { textAlign: null, level: 2 },
        content: [{ type: "text", text: "Processing Time" }],
      },
      {
        type: "paragraph",
        attrs: { textAlign: null },
        content: [
          {
            type: "text",
            text: "All orders are processed within [number] business days.",
          },
        ],
      },
    ],
  },
  "intellectual-property": {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { textAlign: null, level: 1 },
        content: [{ type: "text", text: "Intellectual Property Policy" }],
      },
      {
        type: "paragraph",
        attrs: { textAlign: null },
        content: [
          {
            type: "text",
            text: "This policy outlines the intellectual property rights of [Company Name] and third parties.",
          },
        ],
      },
      {
        type: "heading",
        attrs: { textAlign: null, level: 2 },
        content: [{ type: "text", text: "Copyright" }],
      },
      {
        type: "paragraph",
        attrs: { textAlign: null },
        content: [
          {
            type: "text",
            text: "All content included on this site, such as text, graphics, logos, button icons, images, audio clips, digital downloads, data compilations, and software, is the property of [Company Name] or its content suppliers and protected by international copyright laws.",
          },
        ],
      },
    ],
  },
  "data-protection": {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { textAlign: null, level: 1 },
        content: [{ type: "text", text: "Data Protection Policy" }],
      },
      {
        type: "paragraph",
        attrs: { textAlign: null },
        content: [
          {
            type: "text",
            text: "This Data Protection Policy sets out how [Company Name] handles personal data in compliance with data protection laws.",
          },
        ],
      },
      {
        type: "heading",
        attrs: { textAlign: null, level: 2 },
        content: [{ type: "text", text: "Principles" }],
      },
      {
        type: "paragraph",
        attrs: { textAlign: null },
        content: [
          {
            type: "text",
            text: "We will comply with data protection law. This says that the personal information we hold about you must be: 1. Used lawfully, fairly and in a transparent way. 2. Collected only for valid purposes that we have clearly explained to you and not used in any way that is incompatible with those purposes.",
          },
        ],
      },
    ],
  },
  other: {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { textAlign: null, level: 1 },
        content: [{ type: "text", text: "Document" }],
      },
      { type: "paragraph", attrs: { textAlign: null } },
    ],
  },
};
