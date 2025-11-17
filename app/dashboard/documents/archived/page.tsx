import Container from "@/components/dashboard-container";
import DocumentsShell from "../documents-shell";

export default function ArchivedDocuments() {
  return (
    <Container>
      <DocumentsShell type="archived" />
    </Container>
  );
}
