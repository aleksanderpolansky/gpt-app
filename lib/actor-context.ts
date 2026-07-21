import { cookies } from "next/headers";

import { supabase } from "./supabase";

export const ACTIVE_PROFILE_COOKIE_NAME = "arctor_active_profile";

const PROFILE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AppUserRow = {
  id: string;
  access_status: string | null;
};

type OwnedProfileRow = {
  id: string;
  actor_id: string;
  profile_kind: "personal" | "avatar";
  display_name: string;
  image_url: string | null;
  created_at: string;
};

type ActorRow = {
  id: string;
  actor_type: string;
  display_name: string;
  status: string;
};

export type ActorContextOption = {
  profileId: string;
  profileKind: "personal" | "avatar";
  displayName: string;
  imageUrl: string | null;
};

export type ResolvedActorContext = {
  appUserId: string;
  actorId: string;
  actorType: "person" | "avatar";
  profile: ActorContextOption;
  profiles: ActorContextOption[];
};

export class ActorContextError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ActorContextError";
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
    typeof row.actor_id === "string" &&
    (row.profile_kind === "personal" || row.profile_kind === "avatar") &&
    typeof row.display_name === "string" &&
    typeof row.created_at === "string"
  );
}

function isActorRow(value: unknown): value is ActorRow {
  if (!value || typeof value !== "object") {
    return false;
  }

  const row = value as Partial<ActorRow>;

  return (
    typeof row.id === "string" &&
    typeof row.actor_type === "string" &&
    typeof row.display_name === "string" &&
    typeof row.status === "string"
  );
}

function toPublicOption(profile: OwnedProfileRow): ActorContextOption {
  return {
    profileId: profile.id,
    profileKind: profile.profile_kind,
    displayName: profile.display_name,
    imageUrl: profile.image_url,
  };
}

export function isValidProfileId(value: unknown): value is string {
  return typeof value === "string" && PROFILE_ID_PATTERN.test(value);
}

export async function readRequestedProfileIdFromCookie() {
  const cookieStore = await cookies();
  const value = cookieStore.get(ACTIVE_PROFILE_COOKIE_NAME)?.value;

  return isValidProfileId(value) ? value : null;
}

export function getActiveProfileCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  };
}

export async function resolveActorContext(
  auth0Sub: string,
  requestedProfileId?: string | null,
): Promise<ResolvedActorContext> {
  const { data: appUserData, error: appUserError } = await supabase
    .from("app_users")
    .select("id, access_status")
    .eq("auth0_sub", auth0Sub)
    .maybeSingle();

  if (appUserError || !appUserData) {
    throw new ActorContextError(
      404,
      "APP_USER_NOT_FOUND",
      appUserError?.message ?? "App user not found.",
    );
  }

  const appUser = appUserData as AppUserRow;

  if (appUser.access_status === "blocked") {
    throw new ActorContextError(
      403,
      "USER_ACCESS_BLOCKED",
      "This account has been blocked by a platform administrator.",
    );
  }

  const { data: profileData, error: profileError } = await supabase
    .from("actor_public_profiles")
    .select("id, actor_id, profile_kind, display_name, image_url, created_at")
    .eq("owner_user_id", appUser.id)
    .in("profile_kind", ["personal", "avatar"])
    .order("created_at", { ascending: true });

  if (profileError) {
    throw new ActorContextError(
      500,
      "OWNED_PROFILES_READ_FAILED",
      profileError.message,
    );
  }

  const ownedProfiles = (profileData ?? []).filter(isOwnedProfileRow);

  if (ownedProfiles.length === 0) {
    throw new ActorContextError(
      409,
      "NO_OWNED_PROFILES",
      "No personal profile or avatar is available for this account.",
    );
  }

  const actorIds = [...new Set(ownedProfiles.map((profile) => profile.actor_id))];
  const { data: actorData, error: actorError } = await supabase
    .from("actors")
    .select("id, actor_type, display_name, status")
    .in("id", actorIds)
    .eq("status", "active");

  if (actorError) {
    throw new ActorContextError(
      500,
      "OWNED_ACTORS_READ_FAILED",
      actorError.message,
    );
  }

  const actorsById = new Map(
    (actorData ?? [])
      .filter(isActorRow)
      .map((actor) => [actor.id, actor] as const),
  );

  const validProfiles = ownedProfiles.filter((profile) => {
    const actor = actorsById.get(profile.actor_id);

    return (
      actor &&
      ((profile.profile_kind === "personal" && actor.actor_type === "person") ||
        (profile.profile_kind === "avatar" && actor.actor_type === "avatar"))
    );
  });

  if (validProfiles.length === 0) {
    throw new ActorContextError(
      409,
      "NO_VALID_ACTOR_CONTEXT",
      "No active actor is available for the owned profiles.",
    );
  }

  const fallbackProfile =
    validProfiles.find((profile) => profile.profile_kind === "personal") ??
    validProfiles[0];
  const selectedProfile = requestedProfileId
    ? validProfiles.find((profile) => profile.id === requestedProfileId)
    : fallbackProfile;

  if (!selectedProfile) {
    throw new ActorContextError(
      403,
      "PROFILE_NOT_OWNED",
      "The requested acting profile is not owned by this account.",
    );
  }

  const selectedActor = actorsById.get(selectedProfile.actor_id);

  if (
    !selectedActor ||
    (selectedActor.actor_type !== "person" &&
      selectedActor.actor_type !== "avatar")
  ) {
    throw new ActorContextError(
      409,
      "ACTOR_CONTEXT_INVALID",
      "The requested acting profile has no active actor.",
    );
  }

  return {
    appUserId: appUser.id,
    actorId: selectedActor.id,
    actorType: selectedActor.actor_type,
    profile: toPublicOption(selectedProfile),
    profiles: validProfiles.map(toPublicOption),
  };
}

export async function resolveActiveActorContext(auth0Sub: string) {
  const requestedProfileId = await readRequestedProfileIdFromCookie();

  try {
    return await resolveActorContext(auth0Sub, requestedProfileId);
  } catch (error) {
    if (
      requestedProfileId &&
      error instanceof ActorContextError &&
      error.code === "PROFILE_NOT_OWNED"
    ) {
      return resolveActorContext(auth0Sub, null);
    }

    throw error;
  }
}
