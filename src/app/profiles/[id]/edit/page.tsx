import { notFound } from "next/navigation";

import { auth0 } from "../../../../../lib/auth0";
import { supabase } from "../../../../../lib/supabase";
import { normalizeLocale } from "@/i18n";
import PersonalProfileEditor, {
  type PersonalProfileEditorInitialData,
} from "./PersonalProfileEditor";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type ProfileRow = {
  id: string;
  owner_user_id: string;
  actor_id: string;
  profile_kind: "personal" | "avatar";
  public_slug: string;
  display_name: string;
  bio: string | null;
  image_url: string | null;
  category_label: string | null;
  public_phone: string | null;
  website_url: string | null;
  messenger_url: string | null;
  is_public: boolean;
};

function readLocale(searchParams: Record<string, string | string[] | undefined>) {
  const value = searchParams.locale ?? searchParams.lang;
  return normalizeLocale(Array.isArray(value) ? value[0] : value);
}
export default async function PersonalProfileEditPage({
  params,
  searchParams,
}: PageProps) {
  const [{ id }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({}),
  ]);
  const locale = readLocale(resolvedSearchParams);
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    notFound();
  }

  const { data: appUser, error: appUserError } = await supabase
    .from("app_users")
    .select("id")
    .eq("auth0_sub", session.user.sub)
    .maybeSingle();

  if (appUserError || !appUser) {
    notFound();
  }

  const [{ data: profileData, error: profileError }, { data: profilesData, error: profilesError }] =
    await Promise.all([
      supabase
        .from("actor_public_profiles")
        .select("id, owner_user_id, actor_id, profile_kind, public_slug, display_name, bio, image_url, category_label, public_phone, website_url, messenger_url, is_public")
        .eq("id", id)
        .eq("owner_user_id", appUser.id)
        .limit(1),
      supabase
        .from("actor_public_profiles")
        .select("id, public_slug, display_name, profile_kind")
        .eq("owner_user_id", appUser.id)
        .order("profile_kind", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const profile = ((profileData ?? [])[0] as ProfileRow | undefined) ?? null;

  if (!profile) {
    notFound();
  }

  const initialData: PersonalProfileEditorInitialData = {
    locale,
    profile: {
      id: profile.id,
      actorId: profile.actor_id,
      profileKind: profile.profile_kind,
      publicSlug: profile.public_slug,
      displayName: profile.display_name,
      bio: profile.bio,
      imageUrl: profile.image_url,
      categoryLabel: profile.category_label,
      publicPhone: profile.public_phone,
      websiteUrl: profile.website_url,
      messengerUrl: profile.messenger_url,
      isPublic: profile.is_public,
    },
    ownedProfiles: (profilesData ?? []).map((row) => ({
      id: String(row.id),
      publicSlug: String(row.public_slug),
      displayName: String(row.display_name),
      profileKind: row.profile_kind === "avatar" ? "avatar" : "personal",
    })),
  };

  return <PersonalProfileEditor initialData={initialData} />;
}
