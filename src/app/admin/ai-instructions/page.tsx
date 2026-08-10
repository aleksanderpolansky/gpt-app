import type { Metadata } from "next";

import AiInstructionsAdminClient from "./ai-instructions-admin-client";

export const metadata: Metadata = {
  title: "AI Instructions | ARCTor Admin",
  description:
    "Versioned operational instructions used by ARCTor AI processing.",
};

export default function AiInstructionsAdminPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
            ARCTor Admin
          </p>
          <h1 className="mt-2 text-3xl font-black">
            AI processing instructions
          </h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400">
            These are the versioned operational instructions injected into
            ARCTor AI processing. Immutable runtime guards remain in code and
            cannot be removed from this page.
          </p>
        </header>

        <AiInstructionsAdminClient />
      </div>
    </main>
  );
}
