import { redirect } from "next/navigation";

import { supabase } from "../../../../lib/supabase";

export const dynamic = "force-dynamic";

type OrganizationLegacyRedirectPageProps = {
  readonly params: Promise<{
    id: string;
  }>;
  readonly searchParams?: Promise<
    Record<string, string | string[] | undefined>
  >;
};

type OrganizationRouteRow = {
  public_slug: string | null;
  status: string | null;
  directory_status: string | null;
  is_public_profile_enabled: boolean | null;
  is_listed_in_directory: boolean | null;
};

function getFirstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function appendLocaleParams(
  pathname: string,
  searchParams: Record<string, string | string[] | undefined> | undefined,
) {
  const targetSearchParams = new URLSearchParams();
  const locale = getFirstSearchParam(searchParams?.locale);
  const lang = getFirstSearchParam(searchParams?.lang);

  if (locale) {
    targetSearchParams.set("locale", locale);
  }

  if (lang) {
    targetSearchParams.set("lang", lang);
  }

  const queryString = targetSearchParams.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

export default async function OrganizationLegacyRedirectPage({
  params,
  searchParams,
}: OrganizationLegacyRedirectPageProps) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const { data } = await supabase
    .from("organizations")
    .select(
      "public_slug, status, directory_status, is_public_profile_enabled, is_listed_in_directory",
    )
    .eq("id", id)
    .maybeSingle();

  const organization = (data as OrganizationRouteRow | null) ?? null;
  const canOpenDirectoryProfile = Boolean(
    organization?.public_slug &&
      organization.status === "active" &&
      organization.directory_status === "published" &&
      organization.is_public_profile_enabled === true &&
      organization.is_listed_in_directory === true,
  );

  if (canOpenDirectoryProfile && organization?.public_slug) {
    redirect(
      appendLocaleParams(
        `/directory/${encodeURIComponent(organization.public_slug)}`,
        resolvedSearchParams,
      ),
    );
  }

  redirect(
    appendLocaleParams(
      `/organizations/${encodeURIComponent(id)}/edit`,
      resolvedSearchParams,
    ),
  );
}
