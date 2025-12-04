"use client";

import Link, { type LinkProps } from "next/link";
import { forwardRef } from "react";
import { useUnsavedChanges } from "@/context/unsaved-changes";

interface SafeLinkProps extends LinkProps {
  children: React.ReactNode;
  className?: string;
}

export const SafeLink = forwardRef<HTMLAnchorElement, SafeLinkProps>(
  ({ onClick, href, ...props }, ref) => {
    const { isDirty, setShowDialog, setPendingUrl } = useUnsavedChanges();

    const handleClick = (
      e: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
    ) => {
      if (isDirty) {
        e.preventDefault();
        setPendingUrl(href.toString());
        setShowDialog(true);
      } else {
        onClick?.(e);
      }
    };

    return <Link ref={ref} href={href} onClick={handleClick} {...props} />;
  },
);

SafeLink.displayName = "SafeLink";
