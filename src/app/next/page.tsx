import { ContextualAIColumn, getContextForRoute } from "@/components/workspace/contextual-ai";
import type { Metadata } from "next";

import {
  NextBestActionDashboard,
  nextBestActionFixture,
} from "@/components/workspace/next-best-action";

export const metadata: Metadata = {
  title: "Next Best Action | AI Navigator",
  description:
    "Fixture-first read-only preview for weak directions, constraints, explanations, and action candidates.",
};

export default function NextBestActionRoute() {
  const nextAIContext = getContextForRoute("/next");

  return (
    <div className="grid min-h-0 gap-4 xl:grid-cols-3">
      <div className="min-w-0 xl:col-span-2">
        <NextBestActionDashboard viewModel={nextBestActionFixture} />
      </div>

      <ContextualAIColumn
        context={nextAIContext}
        className="hidden xl:flex"
      />
    </div>
  );
}

