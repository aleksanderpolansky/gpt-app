import { redirect } from "next/navigation";

type LegacyCertificateListPageProps = {
  readonly searchParams?: Promise<{
    readonly locale?: string | string[];
    readonly lang?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LegacyCertificateListPage({
  searchParams,
}: LegacyCertificateListPageProps) {
  const resolved = await searchParams;
  const query = new URLSearchParams({ view: "participants" });
  const locale = firstParam(resolved?.locale);
  const lang = firstParam(resolved?.lang);
  if (locale) query.set("locale", locale);
  if (lang) query.set("lang", lang);
  redirect(`/certificates?${query.toString()}`);
}
