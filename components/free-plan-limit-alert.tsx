"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

interface FreePlanLimitAlertProps {
    documentCount: number;
    limit: number;
}

export function FreePlanLimitAlert({
    documentCount,
    limit,
}: FreePlanLimitAlertProps) {
    if (documentCount < limit) return null;

    return (
        <Alert variant="warning" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Free Plan Document Limit Reached</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <span>
                    You have reached the free plan limit of {limit} active documents.
                    Archive documents or upgrade to Pro for unlimited documents.
                </span>
                <Link href="/portal">
                    <Button size="sm">Upgrade to Pro</Button>
                </Link>
            </AlertDescription>
        </Alert>
    );
}
