"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { DocumentEditor } from "@/components/editor/document-editor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { UIDocumentTemplate } from "@/hooks/use-document-templates";
import { cn } from "@/lib/utils";

interface DocumentTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: UIDocumentTemplate) => void;
  selectedTemplateId?: string;
  templates: UIDocumentTemplate[];
}

export function DocumentTemplateDialog({
  open,
  onOpenChange,
  onSelect,
  selectedTemplateId,
  templates,
}: DocumentTemplateDialogProps) {
  const [search, setSearch] = useState("");
  const [internalSelectedId, setInternalSelectedId] = useState<string>(
    selectedTemplateId || templates[0]?.id || "privacy",
  );

  const filteredTemplates = useMemo(() => {
    if (!search.trim()) return templates;
    return templates.filter(
      (t) =>
        t.label.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase()),
    );
  }, [search, templates]);

  const activeTemplate =
    templates.find((t) => t.id === internalSelectedId) || templates[0];

  const handleConfirm = () => {
    onSelect(activeTemplate);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup
        showCloseButton={false}
        className="absolute top-0 left-0 flex h-dvh! max-h-dvh! w-dvw! max-w-dvw! flex-col gap-0 overflow-hidden rounded-none! border-none! p-0"
      >
        <DialogHeader className="border-b p-4">
          <DialogTitle className="text-start!">Choose a template</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex w-72 flex-col bg-sidebar max-md:w-full md:border-r">
            <div className="relative border-b">
              <InputGroup className="rounded-none! border-none shadow-none! ring-0!">
                <InputGroupInput
                  aria-label="Search"
                  className="font-mono before:hidden"
                  placeholder="Search templates..."
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <InputGroupAddon>
                  <Search />
                </InputGroupAddon>
              </InputGroup>
            </div>
            <ScrollArea className="flex-1">
              <div className="flex flex-col pb-10">
                {filteredTemplates.map((template, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => setInternalSelectedId(template.id)}
                    className={cn(
                      "flex items-start gap-3 border-b p-3 text-left hover:bg-accent/50",
                      internalSelectedId === template.id
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    <template.icon className="mt-0.5 h-5 w-5 shrink-0" />
                    <div className="flex flex-col gap-1 overflow-hidden">
                      <span
                        className={cn(
                          "font-medium text-sm",
                          internalSelectedId === template.id &&
                            "text-foreground",
                        )}
                      >
                        {template.label}
                      </span>
                      <span className="line-clamp-2 text-xs opacity-80">
                        {template.description}
                      </span>
                    </div>
                  </button>
                ))}
                {filteredTemplates.length === 0 && (
                  <div className="p-4 text-center font-mono text-muted-foreground text-sm">
                    No templates found
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
          {/* TODO: implement responsive for mobile */}
          <div className="relative flex flex-1 flex-col overflow-hidden bg-background max-md:hidden">
            <div className="flex-1 overflow-y-auto">
              <div className="pointer-events-none mx-auto select-none">
                <div className="mx-auto h-full w-full max-w-4xl origin-top px-5 md:px-10">
                  <DocumentEditor
                    key={activeTemplate.id}
                    initialContent={activeTemplate.content}
                    initialIsJson={true}
                    readOnly={true}
                    disableToolbar={true}
                    disableAI={true}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="m-0! border-t bg-background max-md:p-4!">
          <div className="flex w-full items-center justify-between">
            <div className="text-muted-foreground text-sm">
              <span className="font-medium text-foreground">
                {activeTemplate.label}
              </span>{" "}
              selected
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirm}>Use Template</Button>
            </div>
          </div>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
