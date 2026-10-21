import type { Metadata } from "next";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import { normalizeAiProcessingLocale } from "@/lib/ai/processingInstructions.server";
import GovernanceClient from "./GovernanceClient";
import GovernanceRuntimeEvidence from "./GovernanceRuntimeEvidence";

export const metadata: Metadata = {
  title: "AI Governance & Workflow Registry | ARCTor",
  description: "Read-only AI processing map and safe rule dry-run for administrators.",
};
export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ locale?: string }> };

export default async function GovernanceRegistryPage({ searchParams }: PageProps) {
  const guard = await requirePlatformAdmin({allowedRoles: ["owner", "admin", "viewer"]});
  if (!guard.ok) {
    return <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <h1 className="text-2xl font-semibold">ARCTor AI Governance</h1>
      <p className="mt-3 text-red-300">Доступ к внутреннему реестру ограничен.</p>
    </main>;
  }
  const locale = normalizeAiProcessingLocale((await searchParams)?.locale ?? "ru");
  return <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
    <div className="mx-auto max-w-6xl space-y-6">
      <GovernanceClient />
      <GovernanceRuntimeEvidence localeCode={locale} />
    </div>
  </main>;
}
