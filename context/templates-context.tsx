"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { type DocumentTemplate, fetchTemplates } from "@/lib/templates";

interface TemplatesContextType {
  templates: DocumentTemplate[];
  loading: boolean;
  refreshTemplates: () => Promise<void>;
  reorderTemplates: (newOrder: DocumentTemplate[]) => Promise<void>;
}

const TemplatesContext = createContext<TemplatesContextType | undefined>(
  undefined,
);

export function TemplatesProvider({ children }: { children: ReactNode }) {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshTemplates = useCallback(async () => {
    if (templates.length === 0) setLoading(true);

    try {
      const data = await fetchTemplates();
      // Sorting: position (asc), then by specific ID (blank), then label
      const sortedData = [...data].sort((a, b) => {
        if (a.position !== b.position) {
          return (a.position || 0) - (b.position || 0);
        }
        if (a.id === "blank") return -1;
        if (b.id === "blank") return 1;
        return a.label.localeCompare(b.label);
      });
      setTemplates(sortedData);
    } catch (error) {
      console.error("Failed to fetch templates", error);
    } finally {
      setLoading(false);
    }
  }, [templates.length]);

  const reorderTemplates = async (newOrder: DocumentTemplate[]) => {
    // Optimistic update
    setTemplates(newOrder);

    // Prepare updates for DB
    const updates = newOrder.map((t, index) => ({
      id: t.id,
      position: index,
    }));

    try {
      // In a real app we would import updateTemplatePositions
      const { updateTemplatePositions } = await import("@/lib/templates");
      await updateTemplatePositions(updates);
    } catch (error) {
      console.error("Failed to update template order", error);
      // Revert on failure (could be improved with previous state)
      refreshTemplates();
    }
  };

  useEffect(() => {
    refreshTemplates();
  }, [refreshTemplates]);

  return (
    <TemplatesContext.Provider
      value={{ templates, loading, refreshTemplates, reorderTemplates }}
    >
      {children}
    </TemplatesContext.Provider>
  );
}

export function useTemplatesContext() {
  const context = useContext(TemplatesContext);
  if (context === undefined) {
    throw new Error(
      "useTemplatesContext must be used within a TemplatesProvider",
    );
  }
  return context;
}
