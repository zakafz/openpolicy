import Container from "@/components/dashboard-container";
import DocumentsShell from "../documents-shell";

export default function PublishedDocuments() {
  return (
    <Container>
      <DocumentsShell type="published" />
    </Container>
  );
}
