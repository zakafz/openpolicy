import { redirect } from "next/navigation";
import { api } from "@/lib/polar";
import { createClient } from "@/lib/supabase/server";
import LayoutShell from "./layout-shell";

export default async function Layout({ children }: any) {
  const supabase = await createClient();
  const products = await api.products.list({ isArchived: false });

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }
  return <LayoutShell products={products.result.items}>{children}</LayoutShell>;
}
