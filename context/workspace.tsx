"use client";

import React from "react";
import {
  readSelectedWorkspaceId
} from "@/lib/workspace";
import type { WorkspaceRow } from "@/types/supabase";

type WorkspaceContextValue = {
  selectedWorkspaceId: string | null;
  setSelectedWorkspaceId: (id: string | null) => void;
  selectedWorkspace: WorkspaceRow | null;
  setSelectedWorkspace: (ws: WorkspaceRow | null) => void;
};

const WorkspaceContext = React.createContext<WorkspaceContextValue | undefined>(
  undefined,
);

const STORAGE_KEY = "selectedWorkspace";

/**
 * WorkspaceProvider
 *
 * Keeps the currently-selected workspace id (and an optional cached workspace object)
 * in React context, persists the id to localStorage and syncs across tabs via the
 * storage event. Consumers should call `useWorkspace()` to access/set the selection.
 */
export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [selectedWorkspaceId, setSelectedWorkspaceIdState] = React.useState<
    string | null
  >(null);
  const [selectedWorkspace, setSelectedWorkspaceState] =
    React.useState<WorkspaceRow | null>(null);

  // Initialize from localStorage once on mount
  React.useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        // Use centralized reader which handles historical shapes and parsing.
        const id = readSelectedWorkspaceId();
        if (id) {
          setSelectedWorkspaceIdState(id);
        }
      }
    } catch (e) {
      // non-fatal, continue without persisted selection
      // eslint-disable-next-line no-console
      console.warn("WorkspaceProvider: failed to read selectedWorkspace", e);
    }
  }, []);

  // Persist id to localStorage when it changes
  React.useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        if (selectedWorkspaceId) {
          localStorage.setItem(STORAGE_KEY, selectedWorkspaceId);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("WorkspaceProvider: failed to write selectedWorkspace", e);
    }
  }, [selectedWorkspaceId]);

  // Sync across browser tabs/windows
  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        try {
          // Use centralized reader to interpret persisted value consistently.
          const id = readSelectedWorkspaceId();
          setSelectedWorkspaceIdState(id);
        } catch {
          // Fallback to the raw newValue when parsing fails to preserve previous behavior.
          setSelectedWorkspaceIdState(e.newValue ?? null);
        }
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    }
    return () => {};
  }, []);

  const setSelectedWorkspaceId = React.useCallback((id: string | null) => {
    setSelectedWorkspaceIdState(id);
    try {
      if (typeof window !== "undefined") {
        try {
          window.dispatchEvent(
            new CustomEvent("workspace-changed", {
              detail: { id: id ?? null },
            }),
          );
        } catch (e) {
          // Non-fatal: dispatch failure should not break app
          // eslint-disable-next-line no-console
          console.warn(
            "WorkspaceProvider: failed to dispatch workspace-changed event",
            e,
          );
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(
        "WorkspaceProvider: failed to dispatch workspace-changed event",
        e,
      );
    }
  }, []);

  const setSelectedWorkspace = React.useCallback((ws: WorkspaceRow | null) => {
    setSelectedWorkspaceState(ws);
    // Keep id in sync + persist to localStorage so the app can recover selection
    try {
      if (typeof window !== "undefined") {
        if (ws && (ws as any).id) {
          const idStr = String((ws as any).id);
          localStorage.setItem(STORAGE_KEY, idStr);
          setSelectedWorkspaceIdState(idStr);
          try {
            window.dispatchEvent(
              new CustomEvent("workspace-changed", {
                detail: { id: idStr, workspace: ws },
              }),
            );
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn(
              "WorkspaceProvider: failed to dispatch workspace-changed event",
              e,
            );
          }
        } else {
          localStorage.removeItem(STORAGE_KEY);
          setSelectedWorkspaceIdState(null);
          try {
            window.dispatchEvent(
              new CustomEvent("workspace-changed", {
                detail: { id: null, workspace: null },
              }),
            );
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn(
              "WorkspaceProvider: failed to dispatch workspace-changed event",
              e,
            );
          }
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(
        "WorkspaceProvider: failed to persist selected workspace",
        e,
      );
    }
  }, []);

  const value = React.useMemo(
    () => ({
      selectedWorkspaceId,
      setSelectedWorkspaceId,
      selectedWorkspace,
      setSelectedWorkspace,
    }),
    [
      selectedWorkspaceId,
      selectedWorkspace,
      setSelectedWorkspaceId,
      setSelectedWorkspace,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

/**
 * useWorkspace - hook for consuming the workspace context
 *
 * Example:
 *   const { selectedWorkspaceId, setSelectedWorkspaceId } = useWorkspace();
 */
export function useWorkspace() {
  const ctx = React.useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return ctx;
}
