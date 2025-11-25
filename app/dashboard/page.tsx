import type { Metadata } from "next";
import Container from "@/components/dashboard-container";
import OverviewShell from "./overview-shell";

export const metadata: Metadata = {
  title: 'Overview',
  description: 'Manage your policy documents, workspaces, and team settings.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function Dashboard() {
  return (
    <Container>
      <OverviewShell />
    </Container>
  );
}
