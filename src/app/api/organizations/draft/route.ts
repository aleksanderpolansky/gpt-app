import { NextResponse } from "next/server";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../lib/actor-context";
import { auth0 } from "../../../../../lib/auth0";
import { supabase } from "../../../../../lib/supabase";

type ActorOwnedOrganizationRpcRow = {
  organization_id: string;
  organization_actor_id: string;
  business_space_id: string;
  location_id: string | null;
  reward_rule_id: string | null;
  public_slug: string;
  owner_actor_id: string;
  owner_actor_type: "person" | "avatar";
};

const DEFAULT_PURCHASE_REWARD_CURRENCY = "PLN";

function parseOptionalText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

function normalizeOrganizationType(value: unknown) {
  return parseOptionalText(value) ?? "private_business";
}

function getDraftOrganizationName(locale: string | null) {
  switch (locale) {
    case "ru":
      return "Новое предприятие";
    case "pl":
      return "Nowe przedsiębiorstwo";
    case "es":
      return "Nueva empresa";
    case "uk":
      return "Нове підприємство";
    case "de":
      return "Neues Unternehmen";
    case "cs":
      return "Nový podnik";
    case "en":
    default:
      return "New business";
  }
}

export async function POST(request: Request) {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  let actorContext;

  try {
    actorContext = await resolveActiveActorContext(session.user.sub);
  } catch (error) {
    if (error instanceof ActorContextError) {
      return NextResponse.json(
        { ok: false, error: error.code, errorMessage: error.message },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not resolve active actor context",
      },
      { status: 500 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const locale = parseOptionalText(body.locale);
  const organizationName =
    parseOptionalText(body.organizationName) ?? getDraftOrganizationName(locale);
  const organizationType = normalizeOrganizationType(body.organizationType);
  const now = new Date().toISOString();

  const { data: creationRows, error: creationError } = await supabase.rpc(
    "create_actor_owned_organization_v1",
    {
      p_owner_user_id: actorContext.appUserId,
      p_owner_actor_id: actorContext.actorId,
      p_organization_name: organizationName,
      p_organization_type: organizationType,
      p_description: null,
      p_country_code: null,
      p_default_currency: DEFAULT_PURCHASE_REWARD_CURRENCY,
      p_directory_status: "published",
      p_is_public_profile_enabled: true,
      p_is_listed_in_directory: true,
      p_directory_published_at: now,
      p_create_location: false,
      p_location_country_code: null,
      p_location_city: null,
      p_location_district: null,
      p_location_address_visibility: "approximate",
      p_location_latitude: null,
      p_location_longitude: null,
      p_create_default_reward_rule: true,
    }
  );

  const creation = (
    (creationRows ?? []) as ActorOwnedOrganizationRpcRow[]
  )[0];

  if (creationError || !creation) {
    return NextResponse.json(
      {
        ok: false,
        error:
          creationError?.message ?? "Actor-owned organization was not created",
      },
      { status: creationError?.code === "42501" ? 403 : 500 }
    );
  }

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select(
      `
      id,
      created_by_user_id,
      created_by_actor_id,
      owner_actor_id,
      owner_person_id,
      organization_name,
      organization_type,
      public_slug,
      status,
      directory_status,
      is_public_profile_enabled,
      is_listed_in_directory
    `
    )
    .eq("id", creation.organization_id)
    .single();

  const { data: rewardRule, error: rewardRuleError } = creation.reward_rule_id
    ? await supabase
        .from("points_reward_rules")
        .select(
          `
          id,
          organization_id,
          purchase_currency,
          min_purchase_amount,
          points_per_confirmed_purchase
        `
        )
        .eq("id", creation.reward_rule_id)
        .single()
    : { data: null, error: null };

  const { data: organizationActor, error: organizationActorError } =
    await supabase
      .from("actors")
      .select("id, actor_type, organization_id, display_name, status")
      .eq("id", creation.organization_actor_id)
      .single();

  const { data: businessSpace, error: businessSpaceError } = await supabase
    .from("spaces")
    .select("id, organization_id, space_type, title, status")
    .eq("id", creation.business_space_id)
    .single();

  const postReadError =
    organizationError ??
    rewardRuleError ??
    organizationActorError ??
    businessSpaceError;

  if (
    postReadError ||
    !organization ||
    !rewardRule ||
    !organizationActor ||
    !businessSpace
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          postReadError?.message ??
          "Organization was created, but its complete result could not be read",
        created: creation,
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      mode: "fast_actor_owned_organization_create",
      organization,
      organizationActor,
      businessSpace,
      rewardRule,
      actingAs: {
        actorId: actorContext.actorId,
        actorType: actorContext.actorType,
        profileId: actorContext.profile.profileId,
        displayName: actorContext.profile.displayName,
      },
      safety: {
        semanticIntakeSkipped: true,
        openaiCalls: false,
        spacesAndRolesSkipped: false,
        locationSkipped: true,
        defaultRewardRuleCreated: true,
        pointsWalletTouched: false,
        pointsTransactionsTouched: false,
      },
    },
    { status: 201 }
  );
}
