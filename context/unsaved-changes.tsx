"use client";

import { createContext, type ReactNode, useContext, useState } from "react";

interface UnsavedChangesContextType {
  isDirty: boolean;
  setIsDirty: (value: boolean) => void;
  showDialog: boolean;
  setShowDialog: (value: boolean) => void;
  pendingUrl: string | null;
  setPendingUrl: (url: string | null) => void;
  confirmLeave: () => void;
  cancelLeave: () => void;
}

const UnsavedChangesContext = createContext<
  UnsavedChangesContextType | undefined
>(undefined);

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const [isDirty, setIsDirty] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  const confirmLeave = () => {
    if (pendingUrl) {
      setIsDirty(false); // Reset dirty state to allow navigation
      window.location.href = pendingUrl; // Force navigation
    }
    setShowDialog(false);
    setPendingUrl(null);
  };

  const cancelLeave = () => {
    setShowDialog(false);
    setPendingUrl(null);
  };

  return (
    <UnsavedChangesContext.Provider
      value={{
        isDirty,
        setIsDirty,
        showDialog,
        setShowDialog,
        pendingUrl,
        setPendingUrl,
        confirmLeave,
        cancelLeave,
      }}
    >
      {children}
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChanges() {
  const context = useContext(UnsavedChangesContext);
  if (context === undefined) {
    throw new Error(
      "useUnsavedChanges must be used within a UnsavedChangesProvider",
    );
  }
  return context;
}
