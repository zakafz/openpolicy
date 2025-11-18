import { DocumentType } from "@/types/documents";

// Content templates per document type (Tiptap JSON)
export const contentTemplates: Record<DocumentType, any> = {
  privacy: {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { textAlign: null, level: 1 },
        content: [{ type: "text", text: "Document name" }],
      },
      {
        type: "paragraph",
        attrs: { textAlign: null },
        content: [
          {
            type: "text",
            text: "This Privacy Policy explains what personal data we collect, how we use it and how we protect it.",
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
        content: [{ type: "text", text: "Document name" }],
      },
      {
        type: "paragraph",
        attrs: { textAlign: null },
        content: [
          {
            type: "text",
            text: "These Terms of Service govern your use of our service. Please read them carefully.",
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
        content: [{ type: "text", text: "Document name" }],
      },
      {
        type: "paragraph",
        attrs: { textAlign: null },
        content: [
          {
            type: "text",
            text: "This Cookie Policy explains how cookies are used on our site.",
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
        content: [{ type: "text", text: "Document name" }],
      },
      {
        type: "paragraph",
        attrs: { textAlign: null },
        content: [
          {
            type: "text",
            text: "This Refund Policy explains our refund and return process.",
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
        content: [{ type: "text", text: "Document name" }],
      },
      {
        type: "paragraph",
        attrs: { textAlign: null },
        content: [
          {
            type: "text",
            text: "This Shipping Policy explains shipping times and costs.",
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
        content: [{ type: "text", text: "Document name" }],
      },
      {
        type: "paragraph",
        attrs: { textAlign: null },
        content: [
          {
            type: "text",
            text: "This Intellectual Property Policy describes ownership and copyright rules.",
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
        content: [{ type: "text", text: "Document name" }],
      },
      {
        type: "paragraph",
        attrs: { textAlign: null },
        content: [
          {
            type: "text",
            text: "This Data Protection Policy explains how data is handled and protected.",
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
        content: [{ type: "text", text: "Document name" }],
      },
      { type: "paragraph", attrs: { textAlign: null } },
    ],
  },
};