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
      <Header />

      <Section className="p-0! -mt-14">
        <div className="w-full min-h-screen flex justify-center items-center">
          <LoginForm />
        </div>
      </Section>
      <Footer />
    </>
  );
}
