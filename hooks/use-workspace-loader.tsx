import * as React from "react";
import { useWorkspace } from "@/context/workspace";
import { fetchWorkspaceById, readSelectedWorkspaceId } from "@/lib/workspace";
import type { WorkspaceRow } from "@/types/supabase";

export function useWorkspaceLoader(overrideId?: string | null) {
  const { selectedWorkspaceId: ctxSelectedId } = useWorkspace();
  const selectedId = overrideId ?? ctxSelectedId;

  const [workspace, setWorkspace] = React.useState<WorkspaceRow | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  const requestIdRef = React.useRef(0);

  const load = React.useCallback(
    async (id?: string | null) => {
      const wsId = id ?? selectedId;
      const reqId = ++requestIdRef.current;

      if (!wsId) {
        setWorkspace(null);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const ws = await fetchWorkspaceById(wsId);
        if (requestIdRef.current !== reqId) return;
        setWorkspace(ws ?? null);
      } catch (err: any) {
        if (requestIdRef.current !== reqId) return;

        if (err?.code === "PGRST116") {
          setWorkspace(null);
          setLoading(false);
          return;
        }

        console.error("useWorkspaceLoader: fetchWorkspaceById error", err);
        setError(err?.message ?? String(err) ?? "Failed to load workspace");
        setWorkspace(null);
      } finally {
        if (requestIdRef.current === reqId) {
          setLoading(false);
        }
      }
    },
    [selectedId],
  );

  React.useEffect(() => {
    load();

    function onWorkspaceChanged(e: any) {
      try {
        const detail = e?.detail ?? {};
        const idFromEvent = detail?.id ?? null;
        load(idFromEvent ?? selectedId);
      } catch (err) {
        console.warn(
          "useWorkspaceLoader: workspace-changed handler error",
          err,
        );
      }
    }

    function onStorage(e: StorageEvent) {
      if (e.key === "selectedWorkspace") {
        try {
          const idFromStorage = readSelectedWorkspaceId();
          load(idFromStorage);
        } catch {
          load(null);
        }
      }
    }

    if (typeof window !== "undefined") {
      window.addEventListener("workspace-changed", onWorkspaceChanged);
      window.addEventListener("storage", onStorage);
    }

    return () => {
      requestIdRef.current++;
      if (typeof window !== "undefined") {
        window.removeEventListener("workspace-changed", onWorkspaceChanged);
        window.removeEventListener("storage", onStorage);
      }
    };
  }, [load, selectedId]);

  const reload = React.useCallback(() => load(selectedId), [load, selectedId]);

  return {
    workspace,
    loading,
    error,
    reload,
  } as const;
}

export default useWorkspaceLoader;
