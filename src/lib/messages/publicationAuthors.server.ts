import { supabase } from "../../../lib/supabase";

type PublicProfileRow = {
  id: string;
  actor_id: string;
  profile_kind: "personal" | "avatar";
  display_name: string;
  public_slug: string | null;
  is_public: boolean;
};

type ActorRow = {
  id: string;
  actor_type: "person" | "avatar" | "organization";
  organization_id: string | null;
};

type OrganizationRow = {
  id: string;
  organization_name: string;
  owner_actor_id: string | null;
  public_slug: string | null;
};

export type PublicationAuthorKind = "personal" | "avatar" | "enterprise";

export type PublicationAuthorOption = {
  actorId: string;
  kind: PublicationAuthorKind;
  displayName: string;
  publicSlug: string | null;
  profileId: string | null;
  organizationId: string | null;
  destinationRef: string;
};

function kindRank(kind: PublicationAuthorKind) {
  if (kind === "personal") return 0;
  if (kind === "avatar") return 1;
  return 2;
}

export async function getPublicationAuthorOptionsForUser(
  ownerUserId: string,
): Promise<PublicationAuthorOption[]> {
  const { data: profileData, error: profileError } = await supabase
    .from("actor_public_profiles")
    .select(
      "id,actor_id,profile_kind,display_name,public_slug,is_public",
    )
    .eq("owner_user_id", ownerUserId);

  if (profileError) {
    throw new Error(
      `PUBLICATION_AUTHOR_PROFILE_READ_FAILED:${profileError.message}`,
    );
  }

  const profiles = (profileData ?? []) as PublicProfileRow[];
  const ownedProfileActorIds = [
    ...new Set(profiles.map((profile) => profile.actor_id)),
  ];

  if (ownedProfileActorIds.length === 0) {
    return [];
  }

  const { data: actorData, error: actorError } = await supabase
    .from("actors")
    .select("id,actor_type,organization_id")
    .in("id", ownedProfileActorIds)
    .eq("status", "active");

  if (actorError) {
    throw new Error(
      `PUBLICATION_AUTHOR_ACTOR_READ_FAILED:${actorError.message}`,
    );
  }

  const actorById = new Map(
    ((actorData ?? []) as ActorRow[]).map((actor) => [actor.id, actor]),
  );

  const options: PublicationAuthorOption[] = [];

  for (const profile of profiles) {
    const actor = actorById.get(profile.actor_id);

    if (
      !actor ||
      (actor.actor_type !== "person" && actor.actor_type !== "avatar")
    ) {
      continue;
    }

    options.push({
      actorId: actor.id,
      kind: actor.actor_type === "person" ? "personal" : "avatar",
      displayName: profile.display_name,
      publicSlug: profile.public_slug,
      profileId: profile.id,
      organizationId: null,
      destinationRef: profile.public_slug
        ? `people:${profile.public_slug}`
        : `actor:${actor.id}`,
    });
  }

  const activeOwnedActorIds = [...actorById.keys()];

  const { data: organizationData, error: organizationError } = await supabase
    .from("organizations")
    .select("id,organization_name,owner_actor_id,public_slug")
    .in("owner_actor_id", activeOwnedActorIds)
    .eq("status", "active");

  if (organizationError) {
    throw new Error(
      `PUBLICATION_AUTHOR_ORGANIZATION_READ_FAILED:${organizationError.message}`,
    );
  }

  const organizations = ((organizationData ?? []) as OrganizationRow[]).filter(
    (organization) => Boolean(organization.public_slug),
  );

  if (organizations.length > 0) {
    const { data: organizationActorData, error: organizationActorError } =
      await supabase
        .from("actors")
        .select("id,actor_type,organization_id")
        .in(
          "organization_id",
          organizations.map((organization) => organization.id),
        )
        .eq("actor_type", "organization")
        .eq("status", "active");

    if (organizationActorError) {
      throw new Error(
        `PUBLICATION_AUTHOR_ORGANIZATION_ACTOR_READ_FAILED:${organizationActorError.message}`,
      );
    }

    const actorByOrganizationId = new Map<string, ActorRow>();

    for (const actor of (organizationActorData ?? []) as ActorRow[]) {
      if (
        actor.organization_id &&
        !actorByOrganizationId.has(actor.organization_id)
      ) {
        actorByOrganizationId.set(actor.organization_id, actor);
      }
    }

    for (const organization of organizations) {
      const actor = actorByOrganizationId.get(organization.id);

      if (!actor || !organization.public_slug) {
        continue;
      }

      options.push({
        actorId: actor.id,
        kind: "enterprise",
        displayName: organization.organization_name,
        publicSlug: organization.public_slug,
        profileId: null,
        organizationId: organization.id,
        destinationRef: `directory:${organization.public_slug}`,
      });
    }
  }

  return options.sort((left, right) => {
    const rank = kindRank(left.kind) - kindRank(right.kind);

    if (rank !== 0) return rank;

    return left.displayName.localeCompare(right.displayName);
  });
}

export async function getPublicationAuthorOptionForUser(input: {
  ownerUserId: string;
  authorActorId: string;
}) {
  const options = await getPublicationAuthorOptionsForUser(input.ownerUserId);

  return (
    options.find((option) => option.actorId === input.authorActorId) ?? null
  );
}
