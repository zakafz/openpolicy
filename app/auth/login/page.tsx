import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { LoginForm } from "@/components/login-form";
import Section from "@/components/section";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Login",
  description:
    "Sign in to your OpenPolicy account to manage your policy documents and workspaces.",
  robots: {
    index: false,
    follow: true,
  },
};

export default async function Login() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || data?.claims) {
    redirect("/dashboard");
  }
  return (
    <>
      <Header />

      <Section className="p-4">
        <div className="w-full min-h-screen flex justify-center items-center">
          <LoginForm />
        </div>
      </Section>
      <Footer />
    </>
  );
}
