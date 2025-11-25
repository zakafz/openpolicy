"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex h-screen flex-col items-center justify-center gap-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-500" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              Critical Error
            </h2>
            <p className="text-muted-foreground">
              A critical error occurred. Please try refreshing the page.
            </p>
          </div>
          <Button onClick={() => reset()}>Try again</Button>
        </div>
      </body>
    </html>
  );
}