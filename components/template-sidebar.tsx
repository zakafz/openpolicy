"use client";

import { GripVertical, Search } from "lucide-react";
import type { DragControls } from "motion/react";
import { Reorder, useDragControls } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useTemplatesContext } from "@/context/templates-context";
import {
  type UIDocumentTemplate,
  useDocumentTemplates,
} from "@/hooks/use-document-templates";
import { cn } from "@/lib/utils";

export function TemplateSidebar() {
  const pathname = usePathname();
  const { templates, loading } = useDocumentTemplates();
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<UIDocumentTemplate[]>([]);

  useEffect(() => {
    setItems(templates);
  }, [templates]);

  const { reorderTemplates } = useTemplatesContext();

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    return items.filter(
      (t) =>
        t.label.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase()),
    );
  }, [items, search]);

  const handleReorder = (newOrder: UIDocumentTemplate[]) => {
    setItems(newOrder);

    if (!search.trim()) {
      reorderTemplates(
        newOrder.map((u) => ({ ...u, icon: u.rawIcon || "File" })),
      );
    }
  };

  const currentTemplateId = pathname?.split("/").pop();
  const isSearching = search.trim().length > 0;

  return (
    <div className="flex h-full w-72 flex-col border-r bg-sidebar">
      <div className="flex h-14 items-center justify-center border-b p-2">
        <Link href="/dashboard/templates/new" className="w-full">
          <Button className="w-full" size={"sm"} variant="default">
            New Template
          </Button>
        </Link>
      </div>
      <div className="relative border-b pb-1">
        <InputGroup className="rounded-none! border-none shadow-none! ring-0!">
          <InputGroupInput
            aria-label="Search"
            className="bg-transparent font-mono before:hidden"
            placeholder="Search templates..."
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <InputGroupAddon>
            <Search className="h-4 w-4 text-muted-foreground" />
          </InputGroupAddon>
        </InputGroup>
      </div>
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex flex-col gap-2 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col">
            {isSearching ? (
              <div className="flex flex-col">
                {filteredItems.map((template) => (
                  <TemplateItem
                    key={template.id}
                    template={template}
                    currentId={currentTemplateId}
                  />
                ))}
              </div>
            ) : (
              <Reorder.Group
                axis="y"
                values={filteredItems}
                onReorder={handleReorder}
                className="flex flex-col"
              >
                {filteredItems.map((template) => (
                  <DraggableTemplateItem
                    key={template.id}
                    template={template}
                    currentId={currentTemplateId}
                  />
                ))}
              </Reorder.Group>
            )}

            {filteredItems.length === 0 && (
              <div className="p-4 text-center font-mono text-muted-foreground text-sm">
                No templates found
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function DraggableTemplateItem({
  template,
  currentId,
}: {
  template: UIDocumentTemplate;
  currentId?: string;
}) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={template}
      dragListener={false}
      dragControls={dragControls}
      className="relative"
    >
      <TemplateItem
        template={template}
        currentId={currentId}
        isDraggable
        dragControls={dragControls}
      />
    </Reorder.Item>
  );
}

function TemplateItem({
  template,
  currentId,
  isDraggable,
  dragControls,
}: {
  template: UIDocumentTemplate;
  currentId?: string;
  isDraggable?: boolean;
  dragControls?: DragControls;
}) {
  return (
    <Link
      href={`/dashboard/templates/${template.id}`}
      className={cn(
        "group relative flex select-none items-start gap-3 border-b p-3 text-left transition-colors hover:bg-accent/50",
        currentId === template.id
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground",
      )}
      draggable={false}
    >
      {isDraggable && dragControls && (
        <div
          aria-label="Drag to reorder"
          role="button"
          className="-translate-y-1/2 absolute top-1/2 right-2 z-20 flex cursor-grab items-center justify-center p-2 opacity-0 transition-opacity active:cursor-grabbing group-hover:opacity-100"
          onPointerDown={(e) => {
            e.preventDefault();
            dragControls.start(e);
          }}
          onClick={(e) => e.preventDefault()}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      <template.icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div
        className={cn(
          "flex flex-col gap-1 overflow-hidden",
          isDraggable && "pr-6",
        )}
      >
        <span
          className={cn(
            "font-medium text-sm",
            currentId === template.id && "text-foreground",
          )}
        >
          {template.label}
        </span>
        <span className="line-clamp-2 text-xs opacity-80">
          {template.description}
        </span>
      </div>
    </Link>
  );
}
