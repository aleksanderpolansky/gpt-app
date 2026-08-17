import { redirect } from "next/navigation";

type OrganizationsPageSearchParams = Record<
  string,
  string | string[] | undefined
>;

type OrganizationsPageProps = {
  readonly searchParams?: Promise<OrganizationsPageSearchParams>;
};

function getFirstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function OrganizationsPage({
  searchParams,
}: OrganizationsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const targetSearchParams = new URLSearchParams();

  targetSearchParams.set("scope", "mine");

  const locale = getFirstSearchParam(resolvedSearchParams?.locale);
  const lang = getFirstSearchParam(resolvedSearchParams?.lang);

  if (locale) {
    targetSearchParams.set("locale", locale);
  }

  if (lang) {
    targetSearchParams.set("lang", lang);
  }

  redirect(`/directory?${targetSearchParams.toString()}`);
}
