import { File } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { createClient } from "@/lib/supabase/server";

export default async function TemplatesPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("document_templates").select("*");

  if (data && data.length > 0) {
    const sortedData = [...data].sort((a, b) => {
      if (a.position !== b.position) {
        return (a.position || 0) - (b.position || 0);
      }
      if (a.id === "blank") return -1;
      if (b.id === "blank") return 1;
      return a.label.localeCompare(b.label);
    });

    if (sortedData.length > 0) {
      redirect(`/dashboard/templates/${sortedData[0].id}`);
    }
  }

  return (
    <div className="flex h-full w-full items-center justify-center p-5">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <File />
          </EmptyMedia>
          <EmptyTitle>Select a Template</EmptyTitle>
          <EmptyDescription>
            Select a template from the sidebar to edit, or create a new one.
          </EmptyDescription>
          <div className="pt-4">
            <Link href="/dashboard/templates/new">
              <Button>Create New Template</Button>
            </Link>
          </div>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
