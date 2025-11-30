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
        className={`relative h-full w-full max-w-6xl border border-t-0 p-4 ${className || ""}`}
      >
        {children}
        {/*Left*/}
        <div className="-bottom-[14.5px] -left-[14.5px] absolute z-10 bg-background p-1 text-ring">
          <Plus className="size-5" />
        </div>
        {/*Right*/}
        <div className="-bottom-[14.5px] -right-[14.5px] absolute z-10 bg-background p-1 text-ring">
          <Plus className="size-5" />
        </div>
      </div>
      <div className="h-[full] min-w-4 grow border-b" />
    </section>
  );
}
