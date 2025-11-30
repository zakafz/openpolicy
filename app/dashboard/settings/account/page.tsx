import type { Metadata } from "next";
import Container from "@/components/dashboard-container";
import AccountShell from "./account-shell";

export const metadata: Metadata = {
  title: "Account",
  description: "Manage your account settings.",
};

export default function AccountPage() {
  return (
    <Container>
      <AccountShell />
    </Container>
  );
}
