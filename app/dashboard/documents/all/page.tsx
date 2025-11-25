import Container from "@/components/dashboard-container";
import DocumentsShell from "../documents-shell";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'All documents',
  description: 'View all of your policy documents.',
};


export default function AllDocuments() {
  return (
    <Container>
      <DocumentsShell type="all" />
    </Container>
  );
}
