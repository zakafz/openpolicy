import type { Metadata } from "next";
import Container from "@/components/dashboard-container";
import DocumentsShell from "../documents-shell";

export const metadata: Metadata = {
  title: "Draft documents",
  description: "View all of your draft policy documents.",
};

export default function DraftDocuments() {
  return (
    <Container>
      <DocumentsShell type="draft" />
    </Container>
  );
}
