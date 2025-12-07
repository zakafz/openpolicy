import { TemplateSidebar } from "@/components/template-sidebar";

export default function TemplatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full w-full overflow-hidden">
      <TemplateSidebar />
      <div className="flex h-full flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
