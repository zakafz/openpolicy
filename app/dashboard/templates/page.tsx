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
import { sortTemplates } from "@/lib/templates";

export default async function TemplatesPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("document_templates").select("*");

  if (data && data.length > 0) {
    const sortedData = sortTemplates(data);

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
