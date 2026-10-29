import type { Metadata } from "next";
import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import { validLocale } from "@/lib/ontology-research/ontologyResearchV1";
import DiagnosticsClient from "./DiagnosticsClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "ARI-02.1 · ON search diagnostics · ARCTor",
  description: "Read-only quality trace for system observation-object search",
};

export default async function Ari02DiagnosticsPage({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string }>;
}) {
  const guard = await requirePlatformAdmin({ allowedRoles: ["owner", "admin", "viewer"] });
  if (!guard.ok) {
    return <section className="mx-auto max-w-3xl p-8">Administrator access required.</section>;
  }
  const requestedLocale = (await searchParams).locale;
  const locale = validLocale(requestedLocale) ? requestedLocale : "ru";
  return (
    <main className="mx-auto max-w-6xl space-y-5 px-4 py-8">
      <Link href={`/admin/ontology-research?locale=${locale}`} className="text-sm text-blue-600 underline">
        ← ONTO-AI · Конструктор объектов наблюдения
      </Link>
      <DiagnosticsClient locale={locale} />
    </main>
  );
}
