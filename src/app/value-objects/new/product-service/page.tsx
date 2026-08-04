import { redirect } from "next/navigation";

type ProductServicePageProps = {
  readonly searchParams?: Promise<{
    readonly locale?: string | string[];
  }>;
};

function firstLocale(value: string | string[] | undefined) {
  const locale = Array.isArray(value) ? value[0] : value;

  return locale === "pl" ||
    locale === "ru" ||
    locale === "uk" ||
    locale === "de" ||
    locale === "es" ||
    locale === "cs"
    ? locale
    : "en";
}

export default async function LegacyProductServiceCreatePage({
  searchParams,
}: ProductServicePageProps) {
  const resolvedSearchParams = await searchParams;
  const locale = firstLocale(resolvedSearchParams?.locale);
  const params = new URLSearchParams({ mode: "new" });

  if (locale !== "en") {
    params.set("locale", locale);
  }

  redirect(`/offers/new?${params.toString()}`);
}
