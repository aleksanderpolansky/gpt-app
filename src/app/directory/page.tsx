import { getLocaleSearchParam } from "@/i18n";
import { DirectoryDashboardContent } from "../../components/figma-dashboard/directory-dashboard";

export const dynamic = "force-dynamic";

type DirectoryPageSearchParams = Record<string, string | string[] | undefined>;

type DirectoryPageProps = {
  readonly searchParams?: Promise<DirectoryPageSearchParams>;
};

function getFirstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DirectoryPage({ searchParams }: DirectoryPageProps) {
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
    <DirectoryDashboardContent
      initialLocale={getLocaleSearchParam(localeSearchParams)}
    />
  );
}
