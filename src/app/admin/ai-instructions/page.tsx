import type { Metadata } from "next";
import { Suspense } from "react";

import AiInstructionsAdminClient from "./ai-instructions-admin-client";

export const metadata: Metadata = {
  title: "AI Instructions | ARCTor Admin",
  description: "Versioned operational instructions used by ARCTor AI processing.",
};

export default function AiInstructionsAdminPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <Suspense fallback={null}>
          <AiInstructionsAdminClient />
        </Suspense>
      </div>
    </main>
  );
}
