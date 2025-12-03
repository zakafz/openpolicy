import type { Metadata } from "next";
import DocumentShell from "./document-shell";

export const metadata: Metadata = {
  title: "Document",
  description: "View a specific policy document.",
};

export default function Page() {
  return (
    <div className="flex h-screen w-[calc(100vw-16rem)] flex-col overflow-hidden group-has-data-[state=collapsed]/sidebar-wrapper:w-[calc(100vw-3rem)] max-md:w-screen">
      <DocumentShell />
    </div>
  );
}
