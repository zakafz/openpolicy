"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

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

  return <div onClick={logout}>{children}</div>;
}
