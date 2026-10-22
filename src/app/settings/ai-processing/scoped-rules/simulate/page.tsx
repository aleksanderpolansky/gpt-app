import type { Metadata } from "next";
import ScopedRuleSimulatorClient from "./scoped-rule-simulator-client";

export const metadata: Metadata = {
  title: "Personal rule simulator | ARCTor",
  description: "Preview-only P3.3 rule regression tests; no activity or fact persistence",
};
export const dynamic = "force-dynamic";

export default function ScopedRuleSimulatorPage() {
  return <main className="min-h-screen bg-[#f6f8fc] px-4 py-8 text-[#1a1d2e]">
    <div className="mx-auto max-w-5xl"><ScopedRuleSimulatorClient /></div>
  </main>;
}
