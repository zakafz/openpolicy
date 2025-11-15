"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { GithubLight } from "./ui/svgs/githubLight";
import { Spinner } from "./ui/spinner";
import { Google } from "./ui/svgs/google";

export function LoginForm({
  className,
  next,
  plan,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & { next?: string; plan?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [loadingProvider, setLoadingProvider] = useState<
    "github" | "google" | null
  >(null);

  // determine redirect after OAuth exchange:
  // - prefer explicit `next` if provided and is a relative path
  // - otherwise, if `plan` is provided, send user to checkout for that plan
  // - fallback to dashboard
  const desiredNext =
    typeof next === "string" && next && next.startsWith("/") ? next : undefined;
  const nextPath =
    desiredNext ??
    (typeof plan === "string" && plan
      ? `/checkout?products=${encodeURIComponent(plan)}`
      : "/dashboard");

  const handleSocialLogin =
    (provider: "github" | "google") => async (e: React.FormEvent) => {
      e.preventDefault();
      const supabase = createClient();
      setLoadingProvider(provider);
      setError(null);

      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: `${window.location.origin}/auth/oauth?next=${encodeURIComponent(nextPath)}`,
          },
        });

        if (error) throw error;
      } catch (error: unknown) {
        setError(error instanceof Error ? error.message : "An error occurred");
        setLoadingProvider(null);
      }
    };

  return (
    <>
      <div className="flex flex-1 flex-col justify-center px-4 py-10 lg:px-6">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <h2 className="text-center text-xl mb-2 font-semibold text-foreground">
            Log into OpenPolicy
          </h2>
          <p className="text-sm text-center text-muted-foreground mb-5">
            Get started now. Log in or create account.
          </p>

          <form onSubmit={(e) => e.preventDefault()}>
            <div className="flex flex-col gap-2">
              {error && <p className="text-sm text-destructive-500">{error}</p>}
              <Button
                type="button"
                onClick={handleSocialLogin("github")}
                size={"lg"}
                variant="outline"
                className="inline-flex w-full items-center justify-center space-x-2"
                disabled={loadingProvider === "github"}
              >
                {loadingProvider === "github" ? (
                  <Spinner className="size-5" aria-hidden={true} />
                ) : (
                  <GithubLight className="size-5" aria-hidden={true} />
                )}
                <span className="text-sm font-medium">
                  {loadingProvider === "github"
                    ? "Logging in..."
                    : "Continue with GitHub"}
                </span>
              </Button>
              <Button
                type="button"
                onClick={handleSocialLogin("google")}
                size={"lg"}
                variant="outline"
                className="inline-flex w-full items-center justify-center space-x-2"
                disabled={loadingProvider === "google"}
              >
                {loadingProvider === "google" ? (
                  <Spinner className="size-5" aria-hidden={true} />
                ) : (
                  <Google className="size-5" aria-hidden={true} />
                )}
                <span className="text-sm font-medium">
                  {loadingProvider === "google"
                    ? "Logging in..."
                    : "Continue with Google"}
                </span>
              </Button>
            </div>
          </form>

          <p className="mt-4 text-xs text-muted-foreground">
            By signing in, you agree to our{" "}
            <a href="#" className="underline underline-offset-4">
              terms of service
            </a>{" "}
            and{" "}
            <a href="#" className="underline underline-offset-4">
              privacy policy
            </a>
            .
          </p>
        </div>
      </div>
    </>
  );
}
