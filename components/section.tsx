import { Plus } from "lucide-react";
import { Footer } from "./footer";

export default function Section({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className="flex">
      <div className="h-[full] w-30 min-w-30 border-b" />
      <div
        className={`border border-t-0 w-full h-full p-4 relative ${className || ""}`}
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
      <div className="h-[full] w-30 min-w-30 border-b" />
    </section>
  );
}
