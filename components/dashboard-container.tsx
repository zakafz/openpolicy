import type { ReactNode } from "react";

export default function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto min-h-full w-full max-w-4xl pt-12 pb-32 ${className || ""}`}
    >
      {children}
    </div>
  );
}
