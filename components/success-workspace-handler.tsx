"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function SuccessWorkspaceHandler() {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "found" | "timeout">(
    "checking",
  );

  useEffect(() => {
    let mounted = true;
    let attempts = 0;
    const maxAttempts = 10;

    async function checkForNewWorkspace() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user || !mounted) return;

        const { data: workspaces, error } = await supabase
          .from("workspaces")
          .select("*")
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false });

        if (error || !workspaces || workspaces.length === 0) {
          attempts++;
          if (attempts < maxAttempts && mounted) {
            setTimeout(checkForNewWorkspace, 1000);
          } else if (mounted) {
            setStatus("timeout");
          }
          return;
        }

        const newestWorkspace = workspaces[0];

        try {
          localStorage.setItem("selectedWorkspace", String(newestWorkspace.id));
          if (mounted) {
            setStatus("found");
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

    const initialDelay = setTimeout(checkForNewWorkspace, 1000);

    return () => {
      mounted = false;
      clearTimeout(initialDelay);
    };
  }, [router]);

  return (
    <div className="mt-2 mb-5 text-muted-foreground text-sm">
      {status === "checking" && "Setting up your workspace..."}
      {status === "found" && "Workspace ready! Redirecting..."}
      {status === "timeout" &&
        "Taking longer than expected. Click the button above to continue."}
    </div>
  );
}
