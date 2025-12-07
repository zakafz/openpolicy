import { createClient } from "@/lib/supabase/client";

export interface DocumentTemplate {
  id: string;
  label: string;
  description: string;
  icon: string | any;
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

export async function saveTemplate(template: DocumentTemplate) {
  const supabase = createClient();
  const { icon: _icon, ...rest } = template;

  const { error } = await supabase
    .from("document_templates")
    .upsert({
      ...rest,
      icon: typeof template.icon === "string" ? template.icon : "File",
    })
    .eq("id", template.id);

  if (error) {
    console.error("Error saving template:", error);
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

  const { error: _error } = await supabase.from("document_templates").upsert(
    updates.map((u) => ({
      id: u.id,
      position: u.position,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "id", ignoreDuplicates: false },
  );
  for (const update of updates) {
    await supabase
      .from("document_templates")
      .update({ position: update.position })
      .eq("id", update.id);
  }
}
