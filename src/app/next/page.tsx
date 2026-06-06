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
  return (
    <div className="min-h-0">
      <div className="min-w-0">
        <NextBestActionDashboard viewModel={nextBestActionFixture} />
      </div>
</div>
  );
}


