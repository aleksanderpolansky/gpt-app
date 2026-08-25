import { NextResponse } from "next/server";
import { auth0 } from "../../../../lib/auth0";
import { supabase } from "../../../../lib/supabase";

type PersonalProfileSeed = {
  ownerUserId: string;
  actorId: string;
  displayName: string;
  authPicture: string | null;
};

async function ensurePersonalPublicProfile(seed: PersonalProfileSeed) {
  const { data: existingProfile, error: existingProfileError } = await supabase
    .from("actor_public_profiles")
    .select("id, public_slug, display_name, profile_kind, is_public")
    .eq("actor_id", seed.actorId)
    .maybeSingle();

  if (existingProfileError) {
    throw new Error(existingProfileError.message);
  }

  if (existingProfile) {
    return existingProfile;
  }

  const { data: createdProfile, error: createdProfileError } = await supabase
    .from("actor_public_profiles")
    .insert({
      owner_user_id: seed.ownerUserId,
      actor_id: seed.actorId,
      profile_kind: "personal",
      public_slug: `person-${seed.actorId.replaceAll("-", "")}`,
      display_name: seed.displayName,
      image_url: seed.authPicture,
      image_source: "auth",
      is_public: false,
    })
    .select("id, public_slug, display_name, profile_kind, is_public")
    .single();

  if (!createdProfileError && createdProfile) {
    return createdProfile;
  }

  // Two simultaneous first-login requests can race. Unique indexes guarantee
  // one row; after a conflict, return the row created by the other request.
  if (createdProfileError?.code === "23505") {
    const { data: racedProfile, error: racedProfileError } = await supabase
      .from("actor_public_profiles")
      .select("id, public_slug, display_name, profile_kind, is_public")
      .eq("actor_id", seed.actorId)
      .single();

    if (!racedProfileError && racedProfile) {
      return racedProfile;
    }
  }

  throw new Error(
    createdProfileError?.message ?? "Could not create the personal public profile.",
  );
}

export async function POST() {
  const session = await auth0.getSession();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  const user = session.user;

  const { data: appUser, error: appUserError } = await supabase
    .from("app_users")
    .upsert(
      {
        auth0_sub: user.sub,
        email: user.email,
        name: user.name,
        picture: user.picture,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "auth0_sub",
      }
    )
    .select()
    .single();

  if (appUserError) {
    return NextResponse.json(
      { error: appUserError.message },
      { status: 500 }
    );
  }

  const accessStatus =
    typeof appUser?.access_status === "string" ? appUser.access_status : "active";

  if (accessStatus === "blocked") {
    return NextResponse.json(
      {
        ok: false,
        error: "USER_ACCESS_BLOCKED",
        errorMessage: "This account has been blocked by a platform administrator.",
        blockedAt:
          typeof appUser?.access_blocked_at === "string"
            ? appUser.access_blocked_at
            : null,
        blockedReason:
          typeof appUser?.access_block_reason === "string"
            ? appUser.access_block_reason
            : null,
      },
      { status: 403 }
    );
  }

  const { data: existingPerson, error: existingPersonError } = await supabase
    .from("persons")
    .select("*")
    .eq("user_id", appUser.id)
    .maybeSingle();

  if (existingPersonError) {
    return NextResponse.json(
      { error: existingPersonError.message },
      { status: 500 }
    );
  }

  let person = existingPerson;

  if (!person) {
    const { data: createdPerson, error: createdPersonError } = await supabase
      .from("persons")
      .insert({
        user_id: appUser.id,
        full_name: user.name ?? appUser.email ?? "Unnamed user",
        short_name: user.name ?? appUser.email ?? "User",
        status: "active",
      })
      .select()
      .single();

    if (createdPersonError) {
      return NextResponse.json(
        { error: createdPersonError.message },
        { status: 500 }
      );
    }

    person = createdPerson;
  }

  const { data: existingActor, error: existingActorError } = await supabase
    .from("actors")
    .select("*")
    .eq("person_id", person.id)
    .eq("actor_type", "person")
    .maybeSingle();

  if (existingActorError) {
    return NextResponse.json(
      { error: existingActorError.message },
      { status: 500 }
    );
  }

  let actor = existingActor;

  if (!actor) {
    const { data: createdActor, error: createdActorError } = await supabase
      .from("actors")
      .insert({
        actor_type: "person",
        person_id: person.id,
        display_name: person.full_name ?? person.short_name ?? appUser.email ?? "User",
        status: "active",
      })
      .select()
      .single();

    if (createdActorError) {
      return NextResponse.json(
        { error: createdActorError.message },
        { status: 500 }
      );
    }

    actor = createdActor;
  }

  let publicProfile;

  try {
    publicProfile = await ensurePersonalPublicProfile({
      ownerUserId: appUser.id,
      actorId: actor.id,
      displayName:
        user.name ??
        person.full_name ??
        person.short_name ??
        actor.display_name ??
        appUser.email ??
        "User",
      authPicture:
        typeof user.picture === "string" && user.picture.trim()
          ? user.picture.trim()
          : null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not create the personal public profile.",
      },
      { status: 500 },
    );
  }

  const { data: existingPersonalSpace, error: existingPersonalSpaceError } = await supabase
    .from("spaces")
    .select("*")
    .eq("owner_user_id", appUser.id)
    .eq("space_type", "personal")
    .maybeSingle();

  if (existingPersonalSpaceError) {
    return NextResponse.json(
      { error: existingPersonalSpaceError.message },
      { status: 500 }
    );
  }

  let personalSpace = existingPersonalSpace;

  if (!personalSpace) {
    const { data: createdPersonalSpace, error: createdPersonalSpaceError } = await supabase
      .from("spaces")
      .insert({
        owner_user_id: appUser.id,
        space_type: "personal",
        title: "Personal Space",
        description: "Default personal space",
        status: "active",
      })
      .select()
      .single();

    if (createdPersonalSpaceError) {
      return NextResponse.json(
        { error: createdPersonalSpaceError.message },
        { status: 500 }
      );
    }

    personalSpace = createdPersonalSpace;
  }

  const { data: existingMarketplaceSpace, error: existingMarketplaceSpaceError } = await supabase
    .from("spaces")
    .select("*")
    .eq("owner_user_id", appUser.id)
    .eq("space_type", "marketplace")
    .maybeSingle();

  if (existingMarketplaceSpaceError) {
    return NextResponse.json(
      { error: existingMarketplaceSpaceError.message },
      { status: 500 }
    );
  }

  let marketplaceSpace = existingMarketplaceSpace;

  if (!marketplaceSpace) {
    const { data: createdMarketplaceSpace, error: createdMarketplaceSpaceError } = await supabase
      .from("spaces")
      .insert({
        owner_user_id: appUser.id,
        space_type: "marketplace",
        title: "Marketplace Space",
        description: "Default marketplace buyer space",
        status: "active",
      })
      .select()
      .single();

    if (createdMarketplaceSpaceError) {
      return NextResponse.json(
        { error: createdMarketplaceSpaceError.message },
        { status: 500 }
      );
    }

    marketplaceSpace = createdMarketplaceSpace;
  }

  const { data: existingSelfRole, error: existingSelfRoleError } = await supabase
    .from("actor_space_roles")
    .select("*")
    .eq("actor_id", actor.id)
    .eq("space_id", personalSpace.id)
    .eq("function_type", "self")
    .eq("is_active", true)
    .maybeSingle();

  if (existingSelfRoleError) {
    return NextResponse.json(
      { error: existingSelfRoleError.message },
      { status: 500 }
    );
  }

  let selfRole = existingSelfRole;

  if (!selfRole) {
    const { data: createdSelfRole, error: createdSelfRoleError } = await supabase
      .from("actor_space_roles")
      .insert({
        actor_id: actor.id,
        space_id: personalSpace.id,
        function_type: "self",
        title: "Self in personal space",
        is_active: true,
        authority_level: 100,
        responsibility_level: 100,
      })
      .select()
      .single();

    if (createdSelfRoleError) {
      return NextResponse.json(
        { error: createdSelfRoleError.message },
        { status: 500 }
      );
    }

    selfRole = createdSelfRole;
  }

  const { data: existingBuyerRole, error: existingBuyerRoleError } = await supabase
    .from("actor_space_roles")
    .select("*")
    .eq("actor_id", actor.id)
    .eq("space_id", marketplaceSpace.id)
    .eq("function_type", "buyer")
    .eq("is_active", true)
    .maybeSingle();

  if (existingBuyerRoleError) {
    return NextResponse.json(
      { error: existingBuyerRoleError.message },
      { status: 500 }
    );
  }

  let buyerRole = existingBuyerRole;

  if (!buyerRole) {
    const { data: createdBuyerRole, error: createdBuyerRoleError } = await supabase
      .from("actor_space_roles")
      .insert({
        actor_id: actor.id,
        space_id: marketplaceSpace.id,
        function_type: "buyer",
        title: "Buyer in marketplace",
        is_active: true,
        authority_level: 0,
        responsibility_level: 0,
      })
      .select()
      .single();

    if (createdBuyerRoleError) {
      return NextResponse.json(
        { error: createdBuyerRoleError.message },
        { status: 500 }
      );
    }

    buyerRole = createdBuyerRole;
  }

  return NextResponse.json({
    ok: true,
    person: {
      id: person.id,
      full_name: person.full_name ?? null,
      short_name: person.short_name ?? null,
    },
    actor: {
      id: actor.id,
      actor_type: actor.actor_type,
      display_name: actor.display_name,
    },
    publicProfile,
  });
}
