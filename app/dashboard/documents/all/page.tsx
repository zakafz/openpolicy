import Container from "@/components/dashboard-container";
import DocumentsShell from "../documents-shell";

export default function AllDocuments() {
  return (
    <Container>
      <DocumentsShell type="all" />
    </Container>
  );
}
