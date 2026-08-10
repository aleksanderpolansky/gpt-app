import type { Metadata } from "next";
import { Suspense } from "react";

import AiProcessingSettingsClient from "./ai-processing-settings-client";

export const metadata: Metadata = {
  title: "AI Processing Settings | ARCTor.app",
  description: "Personal rules used by ARCTor when interpreting your messages.",
};

export default function AiProcessingSettingsPage() {
  return (
    <main className="min-h-screen bg-[#f6f8fc] px-4 py-8 text-[#1a1d2e]">
      <div className="mx-auto max-w-5xl">
        <Suspense fallback={null}>
          <AiProcessingSettingsClient />
        </Suspense>
      </div>
    </main>
  );
}
