import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { auth0 } from "../../../../../lib/auth0";
import { supabase } from "../../../../../lib/supabase";

export const API_FIX_FAST_ORGANIZATION_DRAFT_CREATE =
  "API_FIX_FAST_ORGANIZATION_DRAFT_CREATE" as const;

type AppUserRow = {
  id: string;
  auth0_sub: string;
};

type PersonRow = {
  id: string;
};

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
      return "ÃÂÃÂ¾ÃÂ²ÃÂ¾ÃÂµ ÃÂ¿Ã‘â‚¬ÃÂµÃÂ´ÃÂ¿Ã‘â‚¬ÃÂ¸Ã‘ÂÃ‘â€šÃÂ¸ÃÂµ";
    case "pl":
      return "Nowe przedsiÃ„â„¢biorstwo";
    case "es":
      return "Nueva empresa";
    case "uk":
      return "ÃÂÃÂ¾ÃÂ²ÃÂµ ÃÂ¿Ã‘â€“ÃÂ´ÃÂ¿Ã‘â‚¬ÃÂ¸Ã‘â€ÃÂ¼Ã‘ÂÃ‘â€šÃÂ²ÃÂ¾";
    case "de":
      return "Neues Unternehmen";
    case "cs":
      return "NovÃƒÂ½ podnik";
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
      default_currency: "PLN",
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

  return NextResponse.json({
    ok: true,
    mode: "fast_draft_create",
    organization,
    safety: {
      semanticIntakeSkipped: true,
      openaiCalls: false,
      spacesAndRolesSkipped: true,
      locationSkipped: true,
    },
  });
}
