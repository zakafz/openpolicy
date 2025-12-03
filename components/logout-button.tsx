"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton({ children }: React.PropsWithChildren) {
  const router = useRouter();

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

    router.push("/auth/login");
  };

  return (
    <button type="button" onClick={logout} className="w-full text-left">
      {children}
    </button>
  );
}
