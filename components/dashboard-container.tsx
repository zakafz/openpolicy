import { ReactNode } from "react";

export default function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`pt-12 pb-32 max-w-4xl w-full mx-auto min-h-full ${className || ""}`}>
      {children}
    </div>
  );
}
