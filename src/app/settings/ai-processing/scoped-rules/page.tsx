import type { Metadata } from "next";
import ScopedRulesClient from "./scoped-rules-client";

export const metadata: Metadata = {
  title: "Personal structured rules | ARCTor",
  description: "Actor-scoped draft rule editor (no runtime activation)",
};
export const dynamic = "force-dynamic";

export default function ScopedRulesPage() {
  return <main className="min-h-screen bg-[#f6f8fc] px-4 py-8 text-[#1a1d2e]">
    <div className="mx-auto max-w-5xl"><ScopedRulesClient /></div>
  </main>;
}
