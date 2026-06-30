import { getLocaleSearchParam } from "@/i18n";
import { CommercialListDashboardContent } from "../../components/figma-dashboard/commercial-list-dashboard";

export const dynamic = "force-dynamic";

type OffersPageSearchParams = Record<string, string | string[] | undefined>;

type OffersPageProps = {
  readonly searchParams?: Promise<OffersPageSearchParams>;
};

function getFirstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function OffersPage({ searchParams }: OffersPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const localeSearchParams = new URLSearchParams();

  const locale = getFirstSearchParam(resolvedSearchParams?.locale);
  const lang = getFirstSearchParam(resolvedSearchParams?.lang);

  if (locale) {
    localeSearchParams.set("locale", locale);
  }

  if (lang) {
    localeSearchParams.set("lang", lang);
  }

  return (
    <CommercialListDashboardContent
      mode="offers"
      initialLocale={getLocaleSearchParam(localeSearchParams)}
    />
  );
}
