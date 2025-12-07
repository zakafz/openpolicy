import { createClient } from "@/lib/supabase/client";

export interface DocumentTemplate {
  id: string;
  label: string;
  description: string;
  icon: string;
  content: any[];
  position?: number;
}

export async function fetchTemplates() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("document_templates")
    .select("*")
    .order("position", { ascending: true })
    .order("label", { ascending: true });

  if (error) {
    console.error("Error fetching templates:", error);
    return [];
  }

  return data as DocumentTemplate[];
}

export async function fetchTemplate(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("document_templates")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching template:", error);
    return null;
  }

  return data as DocumentTemplate;
}

export async function createTemplate(template: DocumentTemplate) {
  const supabase = createClient();
  const { icon: _icon, ...rest } = template;

  const { error } = await supabase.from("document_templates").insert({
    ...rest,
    icon: typeof template.icon === "string" ? template.icon : "File",
  });

  if (error) {
    console.error("Error creating template:", error);
    throw error;
  }
}

export async function updateTemplate(
  id: string,
  template: Partial<DocumentTemplate>,
) {
  const supabase = createClient();
  const { id: _id, icon: _icon, ...rest } = template;

  const { error } = await supabase
    .from("document_templates")
    .update({
      ...rest,
      icon: typeof template.icon === "string" ? template.icon : "File",
    })
    .eq("id", id);

  if (error) {
    console.error("Error updating template:", error);
    throw error;
  }
}

export async function deleteTemplate(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("document_templates")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting template:", error);
    throw error;
  }
}

export async function updateTemplatePositions(
  updates: { id: string; position: number }[],
) {
  const supabase = createClient();

  const { error } = await supabase.rpc("reorder_templates", {
    items: updates,
  });

  if (error) {
    console.error("Error updating template positions:", error);
    throw error;
  }
}

export function sortTemplates(templates: DocumentTemplate[]) {
  return [...templates].sort((a, b) => {
    if (a.position !== b.position) {
      return (a.position || 0) - (b.position || 0);
    }
    if (a.id === "blank") return -1;
    if (b.id === "blank") return 1;
    return a.label.localeCompare(b.label);
  });
}
