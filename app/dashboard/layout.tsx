import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { api } from "@/lib/polar";
import { createClient } from "@/lib/supabase/server";
import LayoutShell from "./layout-shell";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function Layout({ children }: any) {
  const supabase = await createClient();
  const products = await api.products.list({ isArchived: false });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect("/auth/login");
  }
  const isAdmin = process.env.ADMIN_USER_ID === data.user.id;

  return (
    <LayoutShell products={products.result.items} isAdmin={isAdmin}>
      {children}
    </LayoutShell>
  );
}
