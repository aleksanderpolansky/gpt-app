import type { Metadata } from "next";
import ScopedActivityExecutorClient from "./scoped-activity-executor-client";

export const metadata: Metadata = {
  title: "Scoped activity confirmation | ARCTor",
  description: "P3.4 deterministic proposal and existing Quick Capture confirmation",
};
export const dynamic = "force-dynamic";

export default function ScopedActivityExecutorPage() {
  return <main className="min-h-screen bg-[#f6f8fc] px-4 py-8 text-[#1a1d2e]">
    <div className="mx-auto max-w-5xl"><ScopedActivityExecutorClient /></div>
  </main>;
}
