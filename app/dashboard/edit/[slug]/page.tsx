import Container from "@/components/dashboard-container";
import DocumentEditorShell from "./document-editor-shell";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Document editor',
  description: 'Edit a specific policy document.',
};

export default function Page() {
  return (
    <Container className="py-0! px-0!">
      <DocumentEditorShell />
    </Container>
  );
}
