import * as LucideIcons from "lucide-react";
import { File, LayersIcon } from "lucide-react";
import { useMemo } from "react";
import { useTemplatesContext } from "@/context/templates-context";
import type { DocumentTemplate as DBDocumentTemplate } from "@/lib/templates";

export interface UIDocumentTemplate extends Omit<DBDocumentTemplate, "icon"> {
  icon: any;
  rawIcon: any;
}

export function useDocumentTemplates() {
  const {
    templates: rawTemplates,
    loading,
    refreshTemplates,
  } = useTemplatesContext();

  const templates: UIDocumentTemplate[] = useMemo(() => {
    return rawTemplates.map((t) => {
      let IconComponent: any = File;
      if (typeof t.icon === "string") {
        let Found = (LucideIcons as any)[t.icon];

        if (!Found) {
          const capitalized = t.icon.charAt(0).toUpperCase() + t.icon.slice(1);
          Found = (LucideIcons as any)[capitalized];
        }

        if (Found) IconComponent = Found;
      }
      return {
        ...t,
        rawIcon: t.icon,
        icon: IconComponent,
      };
    });
  }, [rawTemplates]);

  const getTemplate = (id: string) => templates.find((t) => t.id === id);

  const getTemplateIcon = (id: string) => {
    const template = getTemplate(id);
    return template?.icon ?? LayersIcon;
  };

  const getTemplateLabel = (id: string) => {
    return getTemplate(id)?.label ?? id;
  };

  return {
    templates,
    loading,
    getTemplate,
    getTemplateIcon,
    getTemplateLabel,
    refreshTemplates,
  };
}
