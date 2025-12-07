"use client";

import { Cog } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, use as useReact, useRef, useState } from "react";
import {
  DocumentEditor,
  type DocumentEditorRef,
} from "@/components/editor/document-editor";
import { TextShimmer } from "@/components/motion-primitives/text-shimmer";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Textarea } from "@/components/ui/textarea";
import { toastManager } from "@/components/ui/toast";
import { useTemplatesContext } from "@/context/templates-context";
import {
  type DocumentTemplate,
  deleteTemplate,
  fetchTemplate,
  saveTemplate,
} from "@/lib/templates";

export default function TemplateEditorPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = useReact(props.params);
  const router = useRouter();
  const { refreshTemplates } = useTemplatesContext();
  const [template, setTemplate] = useState<DocumentTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<DocumentEditorRef>(null);

  const [id, setId] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("File");

  const isNew = params.id === "new";

  useEffect(() => {
    async function load() {
      if (isNew) {
        setTemplate({
          id: "",
          label: "",
          description: "",
          icon: "File",
          content: [
            {
              type: "h1",
              children: [{ text: "Untitled Template" }],
            },
          ],
        });
        setLoading(false);
        return;
      }

      try {
        const data = await fetchTemplate(params.id);
        if (data) {
          setTemplate(data);
          setId(data.id);
          setLabel(data.label);
          setDescription(data.description);
          setIcon(String(data.icon));
        } else {
          toastManager.add({
            title: "Error",
            description: "Template not found",
            type: "error",
          });
          router.push("/dashboard/templates");
        }
      } catch (error) {
        console.error(error);
        toastManager.add({
          title: "Error",
          description: "Failed to load template",
          type: "error",
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id, isNew, router]);

  const handleSave = async () => {
    if (!label) {
      toastManager.add({
        title: "Validation Error",
        description: "Label is required",
        type: "error",
      });
      return;
    }
    if (!id) {
      toastManager.add({
        title: "Validation Error",
        description: "ID is required",
        type: "error",
      });
      return;
    }

    setSaving(true);
    try {
      const content = editorRef.current?.getContent() || [];

      const newTemplate: DocumentTemplate = {
        id,
        label,
        description,
        icon,
        content,
      };

      await saveTemplate(newTemplate);
      await refreshTemplates();
      toastManager.add({
        title: "Success",
        description: "Template saved successfully",
        type: "success",
      });

      if (isNew) {
        router.push(`/dashboard/templates/${id}`);
      }
    } catch (error: any) {
      console.error(error);
      toastManager.add({
        title: "Error",
        description: error.message || "Failed to save template",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isNew) return;
    try {
      await deleteTemplate(id);
      await refreshTemplates();
      toastManager.add({
        title: "Success",
        description: "Template deleted",
        type: "success",
      });
      router.push("/dashboard/templates");
    } catch (error) {
      console.error(error);
      toastManager.add({
        title: "Error",
        description: "Failed to delete template",
        type: "error",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <TextShimmer className="font-mono text-sm">
          Loading template...
        </TextShimmer>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex h-full w-full items-center justify-center font-mono text-sm">
        Template not found
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden overflow-y-scroll">
      <div className="flex h-14 min-h-14 items-center justify-between border-b bg-card px-4">
        <div className="flex items-center gap-1">
          <SidebarTrigger />
          <h1 className="font-medium text-sm">
            {isNew ? "New Template" : label}
          </h1>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon-sm" className="ml-1">
                <Cog />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Template Settings</SheetTitle>
                <SheetDescription>
                  Configure template metadata.
                </SheetDescription>
              </SheetHeader>
              <div className="grid gap-4 px-4">
                <div className="space-y-2">
                  <Label htmlFor="id">Template ID</Label>
                  <Input
                    id="id"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    disabled={!isNew}
                    placeholder="e.g., privacy-policy"
                    className="font-mono text-sm"
                  />
                  <p className="text-[0.8rem] text-muted-foreground">
                    Unique identifier. Cannot be changed after creation.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="label">Template Name</Label>
                  <Input
                    id="label"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g., Privacy Policy"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="icon">Icon</Label>
                  <Input
                    id="icon"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    placeholder="e.g., File, Shield, Lock"
                  />
                  <p className="text-[0.8rem] text-muted-foreground">
                    Name of the Lucide icon to use.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of when to use this template..."
                  />
                </div>
              </div>
              <SheetFooter>
                <SheetClose asChild>
                  <Button type="submit">Done</Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button variant="destructive-outline" size="sm">
                    Delete
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Template</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{label}"? This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogClose
                    render={<Button variant="ghost">Cancel</Button>}
                  />
                  <AlertDialogClose
                    render={
                      <Button variant="destructive" onClick={handleDelete}>
                        Delete
                      </Button>
                    }
                  />
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button size={"sm"} onClick={handleSave} disabled={saving}>
            {saving ? "Saving" : "Save Template"}
          </Button>
        </div>
      </div>

      <div className="h-[calc(100vh-56px)] max-h-[calc(100vh-56px)] flex-1">
        <DocumentEditor
          ref={editorRef}
          initialContent={template.content}
          readOnly={false}
          isEditMode={true}
          doc={{ title: label }}
        />
      </div>
    </div>
  );
}
