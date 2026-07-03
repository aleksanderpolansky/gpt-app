import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { auth0 } from "../../../../../lib/auth0";
import { supabase } from "../../../../../lib/supabase";

export const API_FIX_FAST_ORGANIZATION_DRAFT_CREATE =
  "API_FIX_FAST_ORGANIZATION_DRAFT_CREATE" as const;

export const API_FIX_DRAFT_ORGANIZATION_DEFAULT_REWARD_RULE =
  "API_FIX_DRAFT_ORGANIZATION_DEFAULT_REWARD_RULE" as const;

type AppUserRow = {
  id: string;
  auth0_sub: string;
};

type PersonRow = {
  id: string;
};

type RewardRuleRow = {
  id: string;
  organization_id: string;
  purchase_currency: string;
  min_purchase_amount: number;
  points_per_confirmed_purchase: number;
};

const DEFAULT_PURCHASE_REWARD_RULE = {
  minPurchaseAmount: 45,
  purchaseCurrency: "PLN",
  pointsPerConfirmedPurchase: 10,
  maxPointsPerUserPerMonth: 2000,
  maxConfirmationsPerOrganizationPerMonth: 5,
} as const;

function parseOptionalText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

function createPublicSlugFromOrganizationId(organizationId: string) {
  return `organization-${organizationId.slice(0, 8)}`;
}

function normalizeOrganizationType(value: unknown) {
  const organizationType = parseOptionalText(value);

  return organizationType ?? "private_business";
}

function getDraftOrganizationName(locale: string | null) {
  switch (locale) {
    case "ru":
      return "\u041d\u043e\u0432\u043e\u0435 \u043f\u0440\u0435\u0434\u043f\u0440\u0438\u044f\u0442\u0438\u0435";
    case "pl":
      return "Nowe przedsi\u0119biorstwo";
    case "es":
      return "Nueva empresa";
    case "uk":
      return "\u041d\u043e\u0432\u0435 \u043f\u0456\u0434\u043f\u0440\u0438\u0454\u043c\u0441\u0442\u0432\u043e";
    case "de":
      return "Neues Unternehmen";
    case "cs":
      return "Nov\u00fd podnik";
    case "en":
    default:
      return "New business";
  }
}

async function getCurrentAppUser() {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return {
      appUser: null,
      errorResponse: NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 },
      ),
    };
  }

  const { data, error } = await supabase
    .from("app_users")
    .select("id, auth0_sub")
    .eq("auth0_sub", session.user.sub)
    .single();

  if (error || !data) {
    return {
      appUser: null,
      errorResponse: NextResponse.json(
        { ok: false, error: error?.message ?? "App user not found" },
        { status: 500 },
      ),
    };
  }

  return {
    appUser: data as AppUserRow,
    errorResponse: null,
  };
}

async function getOwnerPersonId(appUserId: string) {
  const { data, error } = await supabase
    .from("persons")
    .select("id")
    .eq("user_id", appUserId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const person = data as PersonRow | null;

  return person?.id ?? null;
}

async function ensureDefaultRewardRuleForOrganization({
  organizationId,
  organizationName,
  now,
}: {
  organizationId: string;
  organizationName: string;
  now: string;
}) {
  const { data: existingRewardRule, error: existingRewardRuleError } =
    await supabase
      .from("points_reward_rules")
      .select(
        `
        id,
        organization_id,
        purchase_currency,
        min_purchase_amount,
        points_per_confirmed_purchase
      `,
      )
      .eq("organization_id", organizationId)
      .eq("purchase_currency", DEFAULT_PURCHASE_REWARD_RULE.purchaseCurrency)
      .eq("is_active", true)
      .eq("status", "active")
      .maybeSingle();

  if (existingRewardRuleError) {
    throw new Error(existingRewardRuleError.message);
  }

  if (existingRewardRule) {
    return existingRewardRule as RewardRuleRow;
  }

  const { data: rewardRule, error: rewardRuleError } = await supabase
    .from("points_reward_rules")
    .insert({
      id: randomUUID(),
      organization_id: organizationId,
      rule_name: `${organizationName} default purchase reward`,
      min_purchase_amount: DEFAULT_PURCHASE_REWARD_RULE.minPurchaseAmount,
      purchase_currency: DEFAULT_PURCHASE_REWARD_RULE.purchaseCurrency,
      points_per_confirmed_purchase:
        DEFAULT_PURCHASE_REWARD_RULE.pointsPerConfirmedPurchase,
      max_points_per_user_per_month:
        DEFAULT_PURCHASE_REWARD_RULE.maxPointsPerUserPerMonth,
      max_confirmations_per_organization_per_month:
        DEFAULT_PURCHASE_REWARD_RULE.maxConfirmationsPerOrganizationPerMonth,
      is_active: true,
      status: "active",
      created_at: now,
      updated_at: now,
    })
    .select(
      `
      id,
      organization_id,
      purchase_currency,
      min_purchase_amount,
      points_per_confirmed_purchase
    `,
    )
    .single();

  if (rewardRuleError || !rewardRule) {
    throw new Error(
      rewardRuleError?.message ?? "Default reward rule was not created",
    );
  }

  return rewardRule as RewardRuleRow;
}

export async function POST(request: Request) {
  const { appUser, errorResponse } = await getCurrentAppUser();

  if (errorResponse) {
    return errorResponse;
  }

  if (!appUser) {
    return NextResponse.json(
      { ok: false, error: "App user not found" },
      { status: 500 },
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

  const organizationId = randomUUID();
  const publicSlug = createPublicSlugFromOrganizationId(organizationId);
  const now = new Date().toISOString();

  let ownerPersonId: string | null = null;

  try {
    ownerPersonId = await getOwnerPersonId(appUser.id);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Owner person lookup failed",
      },
      { status: 500 },
    );
  }

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .insert({
      id: organizationId,
      created_by_user_id: appUser.id,
      owner_person_id: ownerPersonId,
      organization_name: organizationName,
      organization_type: organizationType,
      description: null,
      country_code: null,
      default_currency: DEFAULT_PURCHASE_REWARD_RULE.purchaseCurrency,
      status: "active",
      directory_status: "published",
      is_public_profile_enabled: true,
      is_listed_in_directory: true,
      public_slug: publicSlug,
      directory_published_at: now,
      updated_at: now,
    })
    .select(
      `
      id,
      created_by_user_id,
      organization_name,
      organization_type,
      public_slug,
      status,
      directory_status,
      is_public_profile_enabled,
      is_listed_in_directory
    `,
    )
    .single();

  if (organizationError || !organization) {
    return NextResponse.json(
      { ok: false, error: organizationError?.message ?? "Draft was not created" },
      { status: 500 },
    );
  }

  let rewardRule: RewardRuleRow | null = null;

  try {
    rewardRule = await ensureDefaultRewardRuleForOrganization({
      organizationId,
      organizationName,
      now,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Default reward rule was not created",
        organization,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    mode: "fast_draft_create",
    organization,
    rewardRule,
    safety: {
      semanticIntakeSkipped: true,
      openaiCalls: false,
      spacesAndRolesSkipped: true,
      locationSkipped: true,
      defaultRewardRuleCreated: true,
      pointsWalletTouched: false,
      pointsTransactionsTouched: false,
    },
  });
}
