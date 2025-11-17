import { ReactNode } from "react";

export default function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`px-40 pt-12 pb-32 w-full min-h-full ${className || ""}`}>
      {children}
    </div>
  );
}
