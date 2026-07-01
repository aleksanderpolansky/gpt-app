import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { auth0 } from "../../../../../../lib/auth0";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{
    id: string;
  }>;
};

type AppUserRow = {
  id: string;
  auth0_sub: string;
};

type OrganizationRow = {
  id: string;
  created_by_user_id: string | null;
  public_slug: string | null;
  social_links_json: Record<string, unknown> | null;
};

type LocationPayload = {
  countryCode?: unknown;
  city?: unknown;
  district?: unknown;
  streetAddress?: unknown;
  postalCode?: unknown;
  label?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  addressVisibility?: unknown;
};

const ADDRESS_VISIBILITY_VALUES = new Set(["public", "approximate", "hidden"]);

function parseNullableText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length === 0 ? null : trimmedValue;
}


function getNextSocialLinksJson(
  currentValue: Record<string, unknown> | null,
  categoryLabel: string | null,
) {
  const nextValue =
    currentValue && typeof currentValue === "object" && !Array.isArray(currentValue)
      ? { ...currentValue }
      : {};

  if (categoryLabel) {
    nextValue.public_profile_category_label = categoryLabel;
  } else {
    delete nextValue.public_profile_category_label;
  }

  return nextValue;
}

function parseRequiredText(value: unknown, fieldName: string) {
  const parsedValue = parseNullableText(value);

  if (!parsedValue) {
    throw new Error(`${fieldName} is required.`);
  }

  return parsedValue;
}

function parseAddressVisibility(value: unknown) {
  const parsedValue = parseNullableText(value);

  if (!parsedValue) {
    return "approximate";
  }

  if (!ADDRESS_VISIBILITY_VALUES.has(parsedValue)) {
    return "approximate";
  }

  return parsedValue;
}

function parseNullableCoordinate(value: unknown, min: number, max: number) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsedValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.trim())
        : Number.NaN;

  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  if (parsedValue < min || parsedValue > max) {
    return null;
  }

  return Math.round(parsedValue * 1000000) / 1000000;
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

async function getOwnedOrganization(input: {
  organizationId: string;
  appUserId: string;
}) {
  const { data, error } = await supabase
    .from("organizations")
    .select("id, created_by_user_id, public_slug, social_links_json")
    .eq("id", input.organizationId)
    .limit(1);

  if (error) {
    return {
      organization: null,
      errorResponse: NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      ),
    };
  }

  const organization = ((data ?? [])[0] as OrganizationRow | undefined) ?? null;

  if (!organization) {
    return {
      organization: null,
      errorResponse: NextResponse.json(
        { ok: false, error: "Organization not found." },
        { status: 404 },
      ),
    };
  }

  if (organization.created_by_user_id !== input.appUserId) {
    return {
      organization: null,
      errorResponse: NextResponse.json(
        { ok: false, error: "You cannot edit this organization." },
        { status: 403 },
      ),
    };
  }

  return {
    organization,
    errorResponse: null,
  };
}

export async function PATCH(request: Request, { params }: RouteProps) {
  const resolvedParams = await params;
  const organizationId = resolvedParams.id;

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

  const { organization, errorResponse: organizationErrorResponse } =
    await getOwnedOrganization({
      organizationId,
      appUserId: appUser.id,
    });

  if (organizationErrorResponse) {
    return organizationErrorResponse;
  }

  if (!organization) {
    return NextResponse.json(
      { ok: false, error: "Organization not found." },
      { status: 404 },
    );
  }

  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  let organizationName: string;
  let organizationType: string;

  try {
    organizationName = parseRequiredText(body.organizationName, "organizationName");
    organizationType = parseRequiredText(body.organizationType, "organizationType");
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Invalid input.",
      },
      { status: 400 },
    );
  }

  const categoryLabel = parseNullableText(body.categoryLabel);
  const logoUrl = parseNullableText(body.logoUrl);
  const nextSocialLinksJson = getNextSocialLinksJson(
    organization.social_links_json,
    categoryLabel,
  );
  const now = new Date().toISOString();

  const { data: updatedOrganization, error: updateOrganizationError } =
    await supabase
      .from("organizations")
      .update({
        organization_name: organizationName,
        organization_type: organizationType,
        logo_url: logoUrl,
        social_links_json: nextSocialLinksJson,
        description: parseNullableText(body.description),
        short_description: parseNullableText(body.shortDescription),
        public_phone: parseNullableText(body.publicPhone),
        website_url: parseNullableText(body.websiteUrl),
        booking_url: parseNullableText(body.bookingUrl),
        public_email: parseNullableText(body.publicEmail),
        updated_at: now,
      })
      .eq("id", organizationId)
      .eq("created_by_user_id", appUser.id)
      .select()
      .single();

  if (updateOrganizationError) {
    return NextResponse.json(
      { ok: false, error: updateOrganizationError.message },
      { status: 500 },
    );
  }

  const locationPayload =
    body.location && typeof body.location === "object"
      ? (body.location as LocationPayload)
      : null;

  let updatedLocation = null;

  if (locationPayload) {
    const streetAddress = parseNullableText(locationPayload.streetAddress);
    const addressVisibility = streetAddress
      ? "public"
      : parseAddressVisibility(locationPayload.addressVisibility);

    const locationUpdate = {
      country_code: parseNullableText(locationPayload.countryCode),
      city: parseNullableText(locationPayload.city),
      district: parseNullableText(locationPayload.district),
      street_address: streetAddress,
      postal_code: parseNullableText(locationPayload.postalCode),
      label: parseNullableText(locationPayload.label),
      latitude: parseNullableCoordinate(locationPayload.latitude, -90, 90),
      longitude: parseNullableCoordinate(locationPayload.longitude, -180, 180),
      address_visibility: addressVisibility,
      is_primary: true,
      is_active: true,
    };

    const { data: existingLocations, error: existingLocationError } =
      await supabase
        .from("organization_locations")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1);

    if (existingLocationError) {
      return NextResponse.json(
        { ok: false, error: existingLocationError.message },
        { status: 500 },
      );
    }

    const existingLocationId =
      ((existingLocations ?? [])[0] as { id: string } | undefined)?.id ?? null;

    if (existingLocationId) {
      const { data, error } = await supabase
        .from("organization_locations")
        .update(locationUpdate)
        .eq("id", existingLocationId)
        .eq("organization_id", organizationId)
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 500 },
        );
      }

      updatedLocation = data;
    } else {
      const { data, error } = await supabase
        .from("organization_locations")
        .insert({
          organization_id: organizationId,
          location_type: "service_area",
          ...locationUpdate,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 500 },
        );
      }

      updatedLocation = data;
    }
  }

  revalidatePath(`/organizations/${organizationId}/edit`);

  if (organization.public_slug) {
    revalidatePath(`/directory/${organization.public_slug}`);
  }

  return NextResponse.json({
    ok: true,
    organization: updatedOrganization,
    primaryLocation: updatedLocation,
  });
}