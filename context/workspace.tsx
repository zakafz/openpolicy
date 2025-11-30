"use client";

import React from "react";
import { readSelectedWorkspaceId } from "@/lib/workspace";
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

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [selectedWorkspaceId, setSelectedWorkspaceIdState] = React.useState<
    string | null
  >(null);
  const [selectedWorkspace, setSelectedWorkspaceState] =
    React.useState<WorkspaceRow | null>(null);

  React.useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const id = readSelectedWorkspaceId();
        if (id) {
          setSelectedWorkspaceIdState(id);
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("WorkspaceProvider: failed to read selectedWorkspace", e);
    }
  }, []);

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

  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        try {
          const id = readSelectedWorkspaceId();
          setSelectedWorkspaceIdState(id);
        } catch {
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

export function useWorkspace() {
  const ctx = React.useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return ctx;
}
