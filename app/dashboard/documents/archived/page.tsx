import Container from "@/components/dashboard-container";
import DocumentsShell from "../documents-shell";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Archived documents',
  description: 'View all of your archived policy documents.',
};

export default function ArchivedDocuments() {
  return (
    <Container>
      <DocumentsShell type="archived" />
    </Container>
  );
}
