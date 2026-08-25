import { toMediaDeliveryUrl } from "../../../lib/media-egress";
import { supabase } from "../../../lib/supabase";

import { getLocaleSearchParam } from "@/i18n";
import {
  PeopleDirectoryDashboardContent,
  type PeopleDirectoryProfile,
} from "../../components/figma-dashboard/people-dashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type PeoplePageSearchParams = Record<
  string,
  string | string[] | undefined
>;

type PeoplePageProps = {
  readonly searchParams?: Promise<PeoplePageSearchParams>;
};

function getFirstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PeopleAndAvatarsPage({
  searchParams,
}: PeoplePageProps) {
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

  const { data, error } = await supabase
    .from("actor_public_profiles")
    .select(
      "id, public_slug, display_name, bio, image_url, category_label, profile_kind, published_at, created_at, updated_at",
    )
    .eq("is_public", true)
    .order("published_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const profiles = (data ?? []).map((row) => ({
    ...row,
    image_url: toMediaDeliveryUrl(
      row.image_url,
      `/api/profiles/${encodeURIComponent(String(row.id))}/image`,
      typeof row.updated_at === "string" ? row.updated_at : null,
    ),
  })) as PeopleDirectoryProfile[];

  return (
    <PeopleDirectoryDashboardContent
      initialLocale={getLocaleSearchParam(localeSearchParams)}
      profiles={profiles}
    />
  );
}
