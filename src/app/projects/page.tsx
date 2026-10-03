import ProjectMapStartClient from "./ProjectMapStartClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ProjectsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const params = (await searchParams) ?? {};
  const locale = getSearchParam(params, "locale") ?? "en";

  return <ProjectMapStartClient initialLocale={locale} />;
}
