"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as Sentry from "@sentry/nextjs";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to Sentry
        console.error(error);
        Sentry.captureException(error);
    }, [error]);

    return (
        <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4">
            <div className="flex flex-col items-center gap-2 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                    <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-500" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Something went wrong!</h2>
                <p className="text-muted-foreground">
                    We apologize for the inconvenience. The error has been logged.
                </p>
                {error.digest && (
                    <p className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                        Error ID: {error.digest}
                    </p>
                )}
            </div>
            <div className="flex gap-2">
                <Button onClick={() => window.location.href = '/'} variant="outline">
                    Go Home
                </Button>
                <Button onClick={() => reset()}>Try again</Button>
            </div>
        </div>
    );
}
