import type { Metadata } from "next";
import Container from "@/components/dashboard-container";
import WorkspaceShell from "./workspace-shell";

export const metadata: Metadata = {
  title: "Workspace",
  description: "Manage your workspace settings.",
};

export default function WorkspacePage() {
  return (
    <Container>
      <WorkspaceShell />
    </Container>
  );
}
