import type { Metadata } from "next";

import AiProcessingSettingsClient from "./ai-processing-settings-client";

export const metadata: Metadata = {
  title: "AI Processing Settings | ARCTor.app",
  description:
    "Personal rules used by ARCTor when interpreting your messages.",
};

export default function AiProcessingSettingsPage() {
  return (
    <main className="min-h-screen bg-[#f6f8fc] px-4 py-8 text-[#1a1d2e]">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#315ee7]">
            Settings
          </p>
          <h1 className="mt-2 text-3xl font-black">
            Personal AI processing
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#667091]">
            Add personal defaults that help ARCTor interpret your messages.
            Explicit information in the current message always wins over a
            personal default.
          </p>
        </header>

        <AiProcessingSettingsClient />
      </div>
    </main>
  );
}
