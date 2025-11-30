import type { Metadata } from "next";
import Container from "@/components/dashboard-container";
import DocumentShell from "./document-shell";

export const metadata: Metadata = {
  title: "Document",
  description: "View a specific policy document.",
};

export default function Page() {
  return (
    <Container>
      <DocumentShell />
    </Container>
  );
}
