import { notFound } from "next/navigation";

import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import { ActivityTemplateImpactProfileEditor } from "./activity-template-impact-profile-editor";

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

function normalizeLocale(value: string | string[] | undefined): LocaleCode {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "pl" || raw === "ru" || raw === "uk" || raw === "de" || raw === "es" || raw === "cs"
    ? raw
    : "en";
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ActivityTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) notFound();

  const params = await searchParams;
  return <ActivityTemplateImpactProfileEditor locale={normalizeLocale(params.locale)} />;
}
