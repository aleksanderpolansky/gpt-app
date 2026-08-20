import { FigmaDashboardContent } from "../components/figma-dashboard/figma-dashboard";
import { normalizeLocale } from "../i18n";

type HomeSearchParams = {
  readonly locale?: string | string[];
  readonly lang?: string | string[];
};

type HomeProps = {
  readonly searchParams: Promise<HomeSearchParams>;
};

function firstSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const initialLocale = normalizeLocale(
    firstSearchParam(params.locale) ?? firstSearchParam(params.lang),
  );

  return <FigmaDashboardContent initialLocale={initialLocale} />;
}
