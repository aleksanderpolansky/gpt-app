import { ActivityTemplateImpactProfileEditor } from "./activity-template-impact-profile-editor";

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

function normalizeLocale(value: string | string[] | undefined): LocaleCode {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "pl" || raw === "ru" || raw === "uk" || raw === "de" || raw === "es" || raw === "cs"
    ? raw
    : "en";
}

export default async function ActivityTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return <ActivityTemplateImpactProfileEditor locale={normalizeLocale(params.locale)} />;
}
