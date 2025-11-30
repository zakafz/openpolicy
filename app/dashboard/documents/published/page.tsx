import type { Metadata } from "next";
import Container from "@/components/dashboard-container";
import DocumentsShell from "../documents-shell";

export const metadata: Metadata = {
  title: "Published documents",
  description: "View all of your published policy documents.",
};

export default function PublishedDocuments() {
  return (
    <Container>
      <DocumentsShell type="published" />
    </Container>
  );
}
