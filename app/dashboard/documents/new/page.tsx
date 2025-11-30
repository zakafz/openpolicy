import type { Metadata } from "next";
import Container from "@/components/dashboard-container";
import NewDocumentShell from "./new-document-shell";

export const metadata: Metadata = {
  title: "New document",
  description: "Create a new policy document.",
};

export default function NewDocumentPage() {
  return (
    <Container className="flex items-center justify-center">
      <NewDocumentShell />
    </Container>
  );
}
