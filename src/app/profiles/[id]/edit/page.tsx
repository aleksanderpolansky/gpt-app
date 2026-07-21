import { notFound } from "next/navigation";

import { normalizeLocale } from "@/i18n";
import { auth0 } from "../../../../../lib/auth0";
import {
  ProfileOwnerContextError,
  resolveProfileOwnerContext,
} from "../../../../../lib/profile-owner-context";
import { supabase } from "../../../../../lib/supabase";
import PersonalProfileEditor, {
  type PersonalProfileEditorInitialData,
} from "./PersonalProfileEditor";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readLocale(
  searchParams: Record<string, string | string[] | undefined>,
) {
  const value = searchParams.locale ?? searchParams.lang;
  return normalizeLocale(Array.isArray(value) ? value[0] : value);
}

export default async function PersonalProfileEditPage({
  params,
  searchParams,
}: PageProps) {
  const [{ id }, resolvedSearchParams, session] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({}),
    auth0.getSession(),
  ]);
  const locale = readLocale(resolvedSearchParams);

  if (!session?.user?.sub) {
    notFound();
  }

  let ownerContext: Awaited<ReturnType<typeof resolveProfileOwnerContext>>;

  try {
    ownerContext = await resolveProfileOwnerContext(session.user.sub, id);
  } catch (error) {
    if (
      error instanceof ProfileOwnerContextError &&
      error.status >= 400 &&
      error.status < 500
    ) {
      notFound();
    }

    throw error;
  }

  const { data: profilesData, error: profilesError } = await supabase
    .from("actor_public_profiles")
    .select("id, public_slug, display_name, profile_kind")
    .eq("owner_user_id", ownerContext.appUserId)
    .order("profile_kind", { ascending: true })
    .order("created_at", { ascending: true });

  if (profilesError) {
    throw new Error("Could not load owned profiles.");
  }

  const profile = ownerContext.profile;
  const initialData: PersonalProfileEditorInitialData = {
    locale,
    profile: {
      id: profile.profileId,
      actorId: profile.actorId,
      profileKind: profile.profileKind,
      publicSlug: profile.publicSlug,
      displayName: profile.displayName,
      bio: profile.bio,
      imageUrl: profile.imageUrl,
      categoryLabel: profile.categoryLabel,
      publicPhone: profile.publicPhone,
      websiteUrl: profile.websiteUrl,
      messengerUrl: profile.messengerUrl,
      isPublic: profile.isPublic,
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
