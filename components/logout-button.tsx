"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton({ children }: React.PropsWithChildren) {
  const _router = useRouter();

  const logout = async () => {
    const supabase = createClient();

    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Error signing out:", err);
    }

    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("selectedWorkspace");
      }
    } catch (e) {
      console.warn("Failed to remove selectedWorkspace from localStorage", e);
    }

    // Force a hard reload to clear all memory state (TanStack Query, etc.)
    window.location.href = "/auth/login";
  };

  return (
    <div onClick={logout} className="w-full text-left">
      {children}
    </div>
  );
}
