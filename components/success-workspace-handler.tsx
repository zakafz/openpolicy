"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * SuccessWorkspaceHandler - Client component that handles workspace selection after payment
 * 
 * After a successful payment, this component:
 * 1. Waits for the webhook to create the workspace (polls for a few seconds)
 * 2. Finds the newly created workspace
 * 3. Sets it as the selected workspace in localStorage
 * 4. Redirects to dashboard
 */
export function SuccessWorkspaceHandler() {
    const router = useRouter();
    const [status, setStatus] = useState<"checking" | "found" | "timeout">("checking");

    useEffect(() => {
        let mounted = true;
        let attempts = 0;
        const maxAttempts = 10; // Poll for up to 10 seconds

        async function checkForNewWorkspace() {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();

                if (!user || !mounted) return;

                // Fetch all workspaces for the user
                const { data: workspaces, error } = await supabase
                    .from("workspaces")
                    .select("*")
                    .eq("owner_id", user.id)
                    .order("created_at", { ascending: false });

                if (error || !workspaces || workspaces.length === 0) {
                    attempts++;
                    if (attempts < maxAttempts && mounted) {
                        // Try again in 1 second
                        setTimeout(checkForNewWorkspace, 1000);
                    } else if (mounted) {
                        setStatus("timeout");
                    }
                    return;
                }

                // Get the most recently created workspace
                const newestWorkspace = workspaces[0];

                // Set it as selected in localStorage
                try {
                    localStorage.setItem("selectedWorkspace", String(newestWorkspace.id));
                    if (mounted) {
                        setStatus("found");
                        // Small delay before redirect to ensure localStorage is persisted
                        setTimeout(() => {
                            if (mounted) {
                                router.push("/dashboard");
                            }
                        }, 500);
                    }
                } catch (e) {
                    console.error("Failed to set selectedWorkspace:", e);
                    if (mounted) {
                        setStatus("timeout");
                    }
                }
            } catch (err) {
                console.error("Error checking for new workspace:", err);
                attempts++;
                if (attempts < maxAttempts && mounted) {
                    setTimeout(checkForNewWorkspace, 1000);
                } else if (mounted) {
                    setStatus("timeout");
                }
            }
        }

        // Start checking after a short delay to give webhook time to process
        const initialDelay = setTimeout(checkForNewWorkspace, 1000);

        return () => {
            mounted = false;
            clearTimeout(initialDelay);
        };
    }, [router]);

    return (
        <div className="text-sm text-muted-foreground mt-2">
            {status === "checking" && "Setting up your workspace..."}
            {status === "found" && "Workspace ready! Redirecting..."}
            {status === "timeout" && "Taking longer than expected. Click the button above to continue."}
        </div>
    );
}
