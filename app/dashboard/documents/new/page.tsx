import Container from "@/components/dashboard-container";
import NewDocumentShell from "./new-document-shell";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'New document',
  description: 'Create a new policy document.',
};

export default function NewDocumentPage() {
  return (
    <Container className="flex justify-center items-center">
      <NewDocumentShell />
    </Container>
  );
}
