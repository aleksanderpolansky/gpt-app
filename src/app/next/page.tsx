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
  return <NextBestActionDashboard viewModel={nextBestActionFixture} />;
}
