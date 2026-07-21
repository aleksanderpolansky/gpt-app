import { supabase } from "./supabase";

const PROFILE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AppUserRow = {
  id: string;
  access_status: string | null;
};

type OwnedProfileRow = {
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
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OwnedEditableProfile = {
  profileId: string;
  ownerUserId: string;
  actorId: string;
  profileKind: "personal" | "avatar";
  publicSlug: string;
  displayName: string;
  bio: string | null;
  imageUrl: string | null;
  categoryLabel: string | null;
  publicPhone: string | null;
  websiteUrl: string | null;
  messengerUrl: string | null;
  isPublic: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProfileOwnerContext = {
  appUserId: string;
  profile: OwnedEditableProfile;
};

export class ProfileOwnerContextError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ProfileOwnerContextError";
    this.status = status;
    this.code = code;
  }
}

function isOwnedProfileRow(value: unknown): value is OwnedProfileRow {
  if (!value || typeof value !== "object") {
    return false;
  }

  const row = value as Partial<OwnedProfileRow>;

  return (
    typeof row.id === "string" &&
    typeof row.owner_user_id === "string" &&
    typeof row.actor_id === "string" &&
    (row.profile_kind === "personal" || row.profile_kind === "avatar") &&
    typeof row.public_slug === "string" &&
    typeof row.display_name === "string" &&
    typeof row.is_public === "boolean" &&
    typeof row.created_at === "string" &&
    typeof row.updated_at === "string"
  );
}

function toEditableProfile(row: OwnedProfileRow): OwnedEditableProfile {
  return {
    profileId: row.id,
    ownerUserId: row.owner_user_id,
    actorId: row.actor_id,
    profileKind: row.profile_kind,
    publicSlug: row.public_slug,
    displayName: row.display_name,
    bio: row.bio,
    imageUrl: row.image_url,
    categoryLabel: row.category_label,
    publicPhone: row.public_phone,
    websiteUrl: row.website_url,
    messengerUrl: row.messenger_url,
    isPublic: row.is_public,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function isValidOwnedProfileId(value: unknown): value is string {
  return typeof value === "string" && PROFILE_ID_PATTERN.test(value);
}

export async function resolveProfileOwnerContext(
  auth0Sub: string,
  profileId: string,
): Promise<ProfileOwnerContext> {
  if (!auth0Sub) {
    throw new ProfileOwnerContextError(
      401,
      "NOT_AUTHENTICATED",
      "Not authenticated.",
    );
  }

  if (!isValidOwnedProfileId(profileId)) {
    throw new ProfileOwnerContextError(
      404,
      "PROFILE_NOT_FOUND",
      "Profile not found.",
    );
  }

  const { data: appUserData, error: appUserError } = await supabase
    .from("app_users")
    .select("id, access_status")
    .eq("auth0_sub", auth0Sub)
    .maybeSingle();

  if (appUserError) {
    throw new ProfileOwnerContextError(
      500,
      "PROFILE_OWNER_LOOKUP_FAILED",
      "Could not verify profile ownership.",
    );
  }

  if (!appUserData) {
    throw new ProfileOwnerContextError(
      404,
      "APP_USER_NOT_FOUND",
      "App user not found.",
    );
  }

  const appUser = appUserData as AppUserRow;

  if (appUser.access_status === "blocked") {
    throw new ProfileOwnerContextError(
      403,
      "USER_ACCESS_BLOCKED",
      "This account has been blocked by a platform administrator.",
    );
  }

  const { data: profileData, error: profileError } = await supabase
    .from("actor_public_profiles")
    .select(
      "id, owner_user_id, actor_id, profile_kind, public_slug, display_name, bio, image_url, category_label, public_phone, website_url, messenger_url, is_public, published_at, created_at, updated_at",
    )
    .eq("id", profileId)
    .eq("owner_user_id", appUser.id)
    .maybeSingle();

  if (profileError) {
    throw new ProfileOwnerContextError(
      500,
      "OWNED_PROFILE_LOOKUP_FAILED",
      "Could not verify profile ownership.",
    );
  }

  if (!isOwnedProfileRow(profileData)) {
    throw new ProfileOwnerContextError(
      404,
      "PROFILE_NOT_FOUND",
      "Profile not found.",
    );
  }

  return {
    appUserId: appUser.id,
    profile: toEditableProfile(profileData),
  };
}
