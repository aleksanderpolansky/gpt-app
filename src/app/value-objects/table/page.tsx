import type { Metadata } from "next";

import { ActualValueObjectsList } from "@/components/workspace/value-objects/actual-value-objects-list";

export const metadata: Metadata = {
  title: "Observation objects table | ARCTor.app",
  description: "Standalone full-screen observation object table workspace.",
};

export default function ValueObjectsTableWorkspacePage() {
  return (
    <main className="min-h-screen min-w-0 overflow-hidden bg-[#f5f6fb] p-2 text-[#1a1d2e]">
      <ActualValueObjectsList tableWorkspaceOnly />
    </main>
  );
}
