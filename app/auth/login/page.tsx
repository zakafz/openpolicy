import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { LoginForm } from "@/components/login-form";
import Section from "@/components/section";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Login({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();

  // Determine desired redirect after login (if provided)
  const rawNext = (searchParams?.next as string) ?? undefined;
  const plan = (searchParams?.plan as string) ?? undefined;
  let next = "/dashboard";
  if (rawNext && typeof rawNext === "string" && rawNext.startsWith("/")) {
    next = rawNext;
  }

  // If already authenticated, redirect to the requested next path (or dashboard)
  if (error || data?.claims) {
    redirect(next);
  }

  return (
    <>
      <Header />

      <Section className="p-0! -mt-14">
        <div className="w-full min-h-screen flex justify-center items-center">
          {/* Pass the next and plan params to the client LoginForm so it can use them */}
          <LoginForm next={next} plan={plan} />
        </div>
      </Section>
      <Footer />
    </>
  );
}
