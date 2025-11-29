import { Plus } from "lucide-react";

export default function Section({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className="flex w-full">
      <div className="h-[full] min-w-4 grow border-b" />
      <div
        className={`border border-t-0 w-full max-w-6xl h-full p-4 relative ${className || ""}`}
      >
        {children}
        {/*Left*/}
        <div className="bg-background text-ring p-1 absolute -bottom-[14.5px] -left-[14.5px] z-10">
          <Plus className="size-5" />
        </div>
        {/*Right*/}
        <div className="bg-background text-ring p-1 absolute -bottom-[14.5px] -right-[14.5px] z-10">
          <Plus className="size-5" />
        </div>
      </div>
      <div className="h-[full] min-w-4 grow border-b" />
    </section>
  );
}
