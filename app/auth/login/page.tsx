import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { LoginForm } from "@/components/login-form";
import Section from "@/components/section";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Login() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || data?.claims) {
    redirect("/dashboard");
  }
  return (
    <>
      <Section className="p-0!">
        <Header />
        <div className="w-full min-h-[calc(100vh-56px)] flex justify-center items-center">
          <LoginForm />
        </div>
      </Section>
      <Footer />
    </>
  );
}
