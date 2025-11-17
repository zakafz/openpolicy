import Container from "@/components/dashboard-container";
import DocumentsShell from "../documents-shell";

export default function DraftDocuments() {
  return (
    <Container>
      <DocumentsShell type="draft" />
    </Container>
  );
}
