import { notFound } from "next/navigation";

import { normalizeLocale } from "@/i18n";
import { getPersonalProfileMessages } from "@/i18n/messages/personal-profile";
import { auth0 } from "../../../../lib/auth0";
import { supabase } from "../../../../lib/supabase";
import PersonalProfileEditor, {
  type PersonalProfileEditorInitialData,
} from "../[id]/edit/PersonalProfileEditor";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type AppUserRow = {
  id: string;
};

function readLocale(searchParams: Record<string, string | string[] | undefined>) {
  const value = searchParams.locale ?? searchParams.lang;
  return normalizeLocale(Array.isArray(value) ? value[0] : value);
}

export default async function CreateAvatarPage({ searchParams }: PageProps) {
  const [resolvedSearchParams, session] = await Promise.all([
    searchParams ?? Promise.resolve({}),
    auth0.getSession(),
  ]);
  const locale = readLocale(resolvedSearchParams);
  const messages = getPersonalProfileMessages(locale);

  if (!session?.user?.sub) {
    notFound();
  }

  const { data: appUserData, error: appUserError } = await supabase
    .from("app_users")
    .select("id")
    .eq("auth0_sub", session.user.sub)
    .maybeSingle();

  if (appUserError || !appUserData) {
    notFound();
  }

  const appUser = appUserData as AppUserRow;
  const { data: profilesData, error: profilesError } = await supabase
    .from("actor_public_profiles")
    .select("id, public_slug, display_name, profile_kind")
    .eq("owner_user_id", appUser.id)
    .order("profile_kind", { ascending: true })
    .order("created_at", { ascending: true });

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const initialData: PersonalProfileEditorInitialData = {
    locale,
    profile: {
      id: "new-avatar",
      actorId: "",
      profileKind: "avatar",
      publicSlug: "",
      displayName: "",
      bio: null,
      imageUrl: null,
      categoryLabel: null,
      publicPhone: null,
      websiteUrl: null,
      messengerUrl: null,
      isPublic: false,
    },
    ownedProfiles: [
      {
        id: "new-avatar",
        publicSlug: "",
        displayName: messages.createAvatar,
        profileKind: "avatar",
      },
      ...(profilesData ?? []).map((profile) => ({
        id: String(profile.id),
        publicSlug: String(profile.public_slug),
        displayName: String(profile.display_name),
        profileKind:
          profile.profile_kind === "avatar"
            ? ("avatar" as const)
            : ("personal" as const),
      })),
    ],
  };

  return <PersonalProfileEditor initialData={initialData} mode="create-avatar" />;
}
