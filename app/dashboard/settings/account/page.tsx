import Container from "@/components/dashboard-container";
import AccountShell from "./account-shell";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Account',
  description: 'Manage your account settings.',
};

export default function AccountPage() {
  return (
    <Container>
      <AccountShell />
    </Container>
  );
}
