import type { Metadata } from "next";
import Link from "next/link";
import ScopedRulesClient from "./scoped-rules-client";

export const metadata: Metadata = {
  title: "Personal structured rules | ARCTor",
  description: "Actor-scoped draft rule editor (no runtime activation)",
};
export const dynamic = "force-dynamic";

export default function ScopedRulesPage() {
  return <main className="min-h-screen bg-[#f6f8fc] px-4 py-8 text-[#1a1d2e]">
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 rounded-xl border border-blue-200 bg-white p-3 text-sm">
        <Link href="/settings/ai-processing/scoped-rules/simulate?locale=ru" className="font-semibold text-blue-700 underline">Открыть симулятор P3.3 — проверка и сравнение редакций (без записи)</Link>
      </div>
      <ScopedRulesClient />
    </div>
  </main>;
}
