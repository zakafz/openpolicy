"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { WorkspaceRow } from "@/types/supabase";
import { AlertCircle, CreditCard, Info } from "lucide-react";
import Link from "next/link";

interface SubscriptionAlertProps {
    workspace: WorkspaceRow;
}

export function SubscriptionAlert({ workspace }: SubscriptionAlertProps) {
    const status = workspace.subscription_status;

    if (status === "past_due") {
        return (
            <Alert variant="error" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Payment Failed</AlertTitle>
                <AlertDescription className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <span>
                        Your payment method failed. Please update your payment method to avoid service interruption.
                    </span>
                    <Link href="/dashboard/settings/workspace">
                        <Button size="sm" variant="outline">
                            <CreditCard className="mr-2 h-4 w-4" />
                            Update Payment Method
                        </Button>
                    </Link>
                </AlertDescription>
            </Alert>
        );
    }

    if (status === "canceled") {
        const periodEnd = workspace.subscription_current_period_end
            ? new Date(workspace.subscription_current_period_end)
            : null;
        const hasAccess = periodEnd && periodEnd > new Date();

        return (
            <Alert variant="error" className="mb-4">
                <Info className="h-4 w-4" />
                <AlertTitle>Subscription Canceled</AlertTitle>
                <AlertDescription className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    {hasAccess ? (
                        <>
                            <span>
                                Your subscription has been canceled. You have access until{" "}
                                <strong>{periodEnd.toLocaleDateString()}</strong>.
                            </span>
                            <Link href="/portal">
                                <Button size="sm" variant="outline">
                                    Renew Subscription
                                </Button>
                            </Link>
                        </>
                    ) : (
                        <>
                            <span>
                                Your subscription has ended. Renew to continue using premium
                                features.
                            </span>
                            <Link href="/portal">
                                <Button size="sm">
                                    Renew Subscription
                                </Button>
                            </Link>
                        </>
                    )}
                </AlertDescription>
            </Alert>
        );
    }

    if (status === "incomplete" || status === "incomplete_expired") {
        return (
            <Alert variant="error" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Subscription Setup Incomplete</AlertTitle>
                <AlertDescription className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <span>
                        Your subscription setup is incomplete. Please complete the payment
                        process.
                    </span>
                    <Link href="/dashboard/settings/workspace">
                        <Button size="sm">
                            <CreditCard className="mr-2 h-4 w-4" />
                            Update Payment Method
                        </Button>
                    </Link>
                </AlertDescription>
            </Alert>
        );
    }

    if (status === "unpaid") {
        return (
            <Alert variant="error" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Payment Required</AlertTitle>
                <AlertDescription className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <span>
                        Your subscription is unpaid. Please update your payment method to
                        continue.
                    </span>
                    <Link href="/dashboard/settings/workspace">
                        <Button size="sm">
                            <CreditCard className="mr-2 h-4 w-4" />
                            Update Payment Method
                        </Button>
                    </Link>
                </AlertDescription>
            </Alert>
        );
    }

    return null;
}
