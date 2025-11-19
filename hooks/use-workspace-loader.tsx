import * as React from "react";
import { useWorkspace } from "@/context/workspace";
import { fetchWorkspaceById } from "@/lib/workspace";
import { readSelectedWorkspaceId } from "@/lib/workspace";
import type { WorkspaceRow } from "@/types/supabase";

/**
 * Hook: useWorkspaceLoader
 *
 * Centralizes workspace loading behavior used by UI shells:
 * - loads workspace row using `fetchWorkspaceById`
 * - exposes { workspace, loading, error, reload }
 * - listens for `workspace-changed` DOM events and `storage` events to react to selection changes
 *
 * Usage:
 *   const { workspace, loading, error, reload } = useWorkspaceLoader();
 *
 * The optional `overrideId` parameter lets callers force a specific workspace id
 * (useful for previews or editing other workspaces).
 */
export function useWorkspaceLoader(overrideId?: string | null) {
  const { selectedWorkspaceId: ctxSelectedId } = useWorkspace();
  const selectedId = overrideId ?? ctxSelectedId;

  const [workspace, setWorkspace] = React.useState<WorkspaceRow | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  // A monotonically-increasing request id avoids races between concurrent loads.
  const requestIdRef = React.useRef(0);

  const load = React.useCallback(
    async (id?: string | null) => {
      const wsId = id ?? selectedId;
      // Bump request id for this invocation
      const reqId = ++requestIdRef.current;

      if (!wsId) {
        // If there's no id, clear state
        setWorkspace(null);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const ws = await fetchWorkspaceById(wsId);
        // If a newer request started, abort applying results
        if (requestIdRef.current !== reqId) return;
        setWorkspace(ws ?? null);
      } catch (err: any) {
        if (requestIdRef.current !== reqId) return;
        // Keep message user-friendly; callers can inspect the thrown error when needed
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

  // Initial load + listeners for cross-tab / global events
  React.useEffect(() => {
    // Perform initial load
    load();

    function onWorkspaceChanged(e: any) {
      try {
        const detail = e?.detail ?? {};
        const idFromEvent = detail?.id ?? null;
        // Prefer id from event (allows publishers to specify), otherwise fall back to current selectedId
        load(idFromEvent ?? selectedId);
      } catch (err) {
        console.warn(
          "useWorkspaceLoader: workspace-changed handler error",
          err,
        );
      }
    }

    function onStorage(e: StorageEvent) {
      // When another tab updates selectedWorkspace in localStorage, reload that id.
      // Use the centralized parser/helper to ensure persisted shapes are interpreted consistently.
      if (e.key === "selectedWorkspace") {
        try {
          const idFromStorage = readSelectedWorkspaceId();
          load(idFromStorage);
        } catch {
          // If anything goes wrong reading/parsing persisted selection, reload without an id.
          load(null);
        }
      }
    }

    if (typeof window !== "undefined") {
      window.addEventListener("workspace-changed", onWorkspaceChanged);
      window.addEventListener("storage", onStorage);
    }

    return () => {
      // Invalidate any in-flight load by bumping request id
      requestIdRef.current++;
      if (typeof window !== "undefined") {
        window.removeEventListener("workspace-changed", onWorkspaceChanged);
        window.removeEventListener("storage", onStorage);
      }
    };
    // Intentionally depend on selectedId so we reload when the context selection changes.
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
