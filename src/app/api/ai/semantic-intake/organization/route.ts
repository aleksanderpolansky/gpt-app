import { NextRequest, NextResponse } from "next/server";

import { auth0 } from "../../../../../../lib/auth0";
import { runOrganizationSemanticIntake } from "../../../../../../lib/organizations/organizationSemanticIntake";
import { supabase } from "../../../../../../lib/supabase";

export const runtime = "nodejs";

type AppUserRow = {
  id: string;
  auth0_sub: string;
};

type OrganizationRow = {
  id: string;
  created_by_user_id: string | null;
  organization_name: string;
  organization_type: string | null;
  description: string | null;
  country_code: string | null;
  status: string | null;
  directory_status: string | null;
  is_public_profile_enabled: boolean | null;
  is_listed_in_directory: boolean | null;
};

type OrganizationLocationRow = {
  id: string;
  organization_id: string;
  country_code: string | null;
  city: string | null;
  district: string | null;
  is_primary: boolean | null;
  is_active: boolean | null;
};

type OrganizationSemanticIntakeRequest = {
  objectType?: string;
  objectId?: string | null;
  source?: string | null;
  name?: string | null;
  description?: string | null;
  organizationType?: string | null;
  country?: string | null;
  city?: string | null;
  district?: string | null;
  persist?: boolean;
  replaceExistingAiPrimary?: boolean;
};

function parseOptionalText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function parseOptionalBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  return fallback;
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

  const { data: appUser, error: appUserError } = await supabase
    .from("app_users")
    .select("id, auth0_sub")
    .eq("auth0_sub", session.user.sub)
    .single();

  if (appUserError || !appUser) {
    return {
      appUser: null,
      errorResponse: NextResponse.json(
        {
          ok: false,
          error: appUserError?.message ?? "App user not found",
        },
        { status: 500 },
      ),
    };
  }

  return {
    appUser: appUser as AppUserRow,
    errorResponse: null,
  };
}

async function getOwnedOrganization(input: {
  organizationId: string;
  appUserId: string;
}) {
  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select(
      `
      id,
      created_by_user_id,
      organization_name,
      organization_type,
      description,
      country_code,
      status,
      directory_status,
      is_public_profile_enabled,
      is_listed_in_directory
    `,
    )
    .eq("id", input.organizationId)
    .eq("created_by_user_id", input.appUserId)
    .maybeSingle();

  if (organizationError) {
    return {
      organization: null,
      errorResponse: NextResponse.json(
        {
          ok: false,
          error: organizationError.message,
        },
        { status: 500 },
      ),
    };
  }

  if (!organization) {
    return {
      organization: null,
      errorResponse: NextResponse.json(
        {
          ok: false,
          error: "Organization not found or not owned by current user",
        },
        { status: 404 },
      ),
    };
  }

  return {
    organization: organization as OrganizationRow,
    errorResponse: null,
  };
}

async function getPrimaryOrganizationLocation(organizationId: string) {
  const { data: locations, error: locationError } = await supabase
    .from("organization_locations")
    .select(
      `
      id,
      organization_id,
      country_code,
      city,
      district,
      is_primary,
      is_active
    `,
    )
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("is_primary", { ascending: false })
    .limit(1);

  if (locationError) {
    return null;
  }

  return ((locations ?? []) as OrganizationLocationRow[])[0] ?? null;
}

export async function POST(request: NextRequest) {
  const { appUser, errorResponse } = await getCurrentAppUser();

  if (errorResponse) {
    return errorResponse;
  }

  if (!appUser) {
    return NextResponse.json(
      {
        ok: false,
        error: "App user not found",
      },
      { status: 500 },
    );
  }

  let body: OrganizationSemanticIntakeRequest;

  try {
    body = (await request.json()) as OrganizationSemanticIntakeRequest;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid JSON body",
      },
      { status: 400 },
    );
  }

  const objectType = parseOptionalText(body.objectType || "organization");

  if (objectType !== "organization") {
    return NextResponse.json(
      {
        ok: false,
        error: "Only objectType=organization is supported",
      },
      { status: 400 },
    );
  }

  const objectId = parseOptionalText(body.objectId ?? "");
  const persist = parseOptionalBoolean(body.persist, true);
  const replaceExistingAiPrimary = parseOptionalBoolean(
    body.replaceExistingAiPrimary,
    true,
  );

  if (persist && !objectId) {
    return NextResponse.json(
      {
        ok: false,
        error: "objectId is required when persist=true",
      },
      { status: 400 },
    );
  }

  let ownedOrganization: OrganizationRow | null = null;
  let primaryLocation: OrganizationLocationRow | null = null;

  if (objectId) {
    const ownedOrganizationResult = await getOwnedOrganization({
      organizationId: objectId,
      appUserId: appUser.id,
    });

    if (ownedOrganizationResult.errorResponse) {
      return ownedOrganizationResult.errorResponse;
    }

    ownedOrganization = ownedOrganizationResult.organization;
    primaryLocation = await getPrimaryOrganizationLocation(objectId);
  }

  const source =
    parseOptionalText(body.source) ||
    (persist
      ? "organization_semantic_intake_route_write_flow"
      : "organization_semantic_intake_route_preview");

  const name =
    ownedOrganization?.organization_name ??
    parseOptionalText(body.name);

  const description =
    ownedOrganization?.description ??
    parseOptionalText(body.description);

  const organizationType =
    ownedOrganization?.organization_type ??
    parseOptionalText(body.organizationType);

  const country =
    primaryLocation?.country_code ??
    ownedOrganization?.country_code ??
    parseOptionalText(body.country);

  const city =
    primaryLocation?.city ??
    parseOptionalText(body.city);

  const district =
    primaryLocation?.district ??
    parseOptionalText(body.district);

  const result = await runOrganizationSemanticIntake({
    objectType: "organization",
    objectId: objectId || null,
    source,
    name,
    description,
    organizationType,
    country,
    city,
    district,
    classifiedByUserId: appUser.id,
    persist,
    replaceExistingAiPrimary,
  });

  const statusCode = result.ok
    ? 200
    : result.error === "EMPTY_SEMANTIC_INPUT" ||
        result.error === "UNSUPPORTED_OBJECT_TYPE"
      ? 400
      : 500;

  return NextResponse.json(result, { status: statusCode });
}
