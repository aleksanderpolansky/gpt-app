import { getLocaleSearchParam } from "@/i18n";
import { CommercialListDashboardContent } from "../../components/figma-dashboard/commercial-list-dashboard";

export const dynamic = "force-dynamic";

type CertificatesPageSearchParams = Record<string, string | string[] | undefined>;

type CertificatesPageProps = {
  readonly searchParams?: Promise<CertificatesPageSearchParams>;
};

function getFirstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CertificatesPage({ searchParams }: CertificatesPageProps) {
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
      mode="certificates"
      initialLocale={getLocaleSearchParam(localeSearchParams)}
    />
  );
}
