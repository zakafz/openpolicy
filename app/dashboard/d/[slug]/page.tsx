import type { Metadata } from "next";
import DocumentShell from "./document-shell";

export const metadata: Metadata = {
  title: "Document",
  description: "View a specific policy document.",
};

export default function Page() {
  return (
    <div className="w-[calc(100vw-16rem)] group-has-data-[state=collapsed]/sidebar-wrapper:w-[calc(100vw-3rem)] h-screen overflow-hidden flex flex-col">
      <DocumentShell />
    </div>
  );
}
