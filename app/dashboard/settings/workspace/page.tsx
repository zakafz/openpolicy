import Container from "@/components/dashboard-container";
import WorkspaceShell from "./workspace-shell";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Workspace',
  description: 'Manage your workspace settings.',
};

export default function WorkspacePage() {
  return (
    <Container>
      <WorkspaceShell />
    </Container>
  );
}
