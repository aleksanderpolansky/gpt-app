import { NextResponse } from "next/server";
import { getDefaultCurrencyByCountryCode, normalizeCountryCode } from "@/lib/commercial/currency";
import { auth0 } from "../../../../../../lib/auth0";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type AppUserRow = {
  id: string;
  auth0_sub: string;
};

type OrganizationRow = {
  id: string;
  organization_name: string;
  created_by_user_id: string | null;
  country_code: string | null;
  default_currency: string | null;
};

type OrganizationLocationRow = {
  id: string;
  organization_id: string;
  country_code: string | null;
  city: string | null;
  district: string | null;
  address_visibility: string | null;
  latitude: number | null;
  longitude: number | null;
  is_primary: boolean | null;
  is_active: boolean | null;
  created_at: string;
};

type RouteProps = {
  params: Promise<{
    id: string;
  }>;
};

type ParsedLocationUpdateInput = {
  countryCode: string | null;
  city: string | null;
  district: string | null;
  addressVisibility: string;
  latitude: number | null;
  longitude: number | null;
};

type CoordinateParseResult = {
  value: number | null;
  errorMessage: string | null;
};

const ADDRESS_VISIBILITY_VALUES = new Set(["public", "approximate", "hidden"]);

async function getCurrentAppUser(): Promise<{
  appUser: AppUserRow | null;
  errorResponse: NextResponse | null;
}> {
  const session = await auth0.getSession();

  if (!session?.user) {
    return {
      appUser: null,
      errorResponse: NextResponse.json(
        {
          ok: false,
          error: "Not authenticated",
        },
        { status: 401 }
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
        { status: 500 }
      ),
    };
  }

  return {
    appUser: appUser as AppUserRow,
    errorResponse: null,
  };
}

function parseOptionalText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    return null;
  }

  return trimmedValue;
}

function normalizeUuid(value: string | null) {
  if (!value) {
    return null;
  }

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(value)) {
    return null;
  }

  return value;
}



function normalizeAddressVisibility(value: unknown) {
  const textValue = parseOptionalText(value);

  if (!textValue) {
    return "approximate";
  }

  if (ADDRESS_VISIBILITY_VALUES.has(textValue)) {
    return textValue;
  }

  return "approximate";
}

function parseNullableCoordinate(
  value: unknown,
  minimum: number,
  maximum: number,
  label: string
): CoordinateParseResult {
  if (value === null || value === undefined || value === "") {
    return {
      value: null,
      errorMessage: null,
    };
  }

  const parsedValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.trim())
        : Number.NaN;

  if (!Number.isFinite(parsedValue)) {
    return {
      value: null,
      errorMessage: `${label} must be a finite number.`,
    };
  }

  if (parsedValue < minimum || parsedValue > maximum) {
    return {
      value: null,
      errorMessage: `${label} must be between ${minimum} and ${maximum}.`,
    };
  }

  return {
    value: Math.round(parsedValue * 1000000) / 1000000,
    errorMessage: null,
  };
}

function parseLocationUpdateInput(body: Record<string, unknown>): {
  input: ParsedLocationUpdateInput | null;
  errorMessage: string | null;
} {
  const countryCode = normalizeCountryCode(parseOptionalText(body.countryCode));
  const city = parseOptionalText(body.city);
  const district = parseOptionalText(body.district);
  const addressVisibility = normalizeAddressVisibility(
    body.addressVisibility ?? body.address_visibility
  );

  const latitudeResult = parseNullableCoordinate(
    body.latitude,
    -90,
    90,
    "latitude"
  );

  if (latitudeResult.errorMessage) {
    return {
      input: null,
      errorMessage: latitudeResult.errorMessage,
    };
  }

  const longitudeResult = parseNullableCoordinate(
    body.longitude,
    -180,
    180,
    "longitude"
  );

  if (longitudeResult.errorMessage) {
    return {
      input: null,
      errorMessage: longitudeResult.errorMessage,
    };
  }

  if (!countryCode) {
    return {
      input: null,
      errorMessage: "countryCode is required.",
    };
  }

  return {
    input: {
      countryCode,
      city,
      district,
      addressVisibility,
      latitude: latitudeResult.value,
      longitude: longitudeResult.value,
    },
    errorMessage: null,
  };
}

async function readJsonBody(request: Request): Promise<{
  body: Record<string, unknown> | null;
  errorMessage: string | null;
}> {
  try {
    const parsedBody = (await request.json()) as unknown;

    if (
      typeof parsedBody !== "object" ||
      parsedBody === null ||
      Array.isArray(parsedBody)
    ) {
      return {
        body: null,
        errorMessage: "Request body must be a JSON object.",
      };
    }

    return {
      body: parsedBody as Record<string, unknown>,
      errorMessage: null,
    };
  } catch {
    return {
      body: null,
      errorMessage: "Invalid JSON body.",
    };
  }
}

async function getOwnedOrganization(input: {
  organizationId: string;
  appUserId: string;
}): Promise<{
  organization: OrganizationRow | null;
  errorResponse: NextResponse | null;
}> {
  const { data, error } = await supabase
    .from("organizations")
    .select(
      `
      id,
      organization_name,
      created_by_user_id,
      country_code,
      default_currency
    `
    )
    .eq("id", input.organizationId)
    .limit(1);

  if (error) {
    return {
      organization: null,
      errorResponse: NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 500 }
      ),
    };
  }

  const rows = (data as unknown as OrganizationRow[] | null) ?? [];
  const organization = rows[0] ?? null;

  if (!organization) {
    return {
      organization: null,
      errorResponse: NextResponse.json(
        {
          ok: false,
          error: "Organization not found.",
        },
        { status: 404 }
      ),
    };
  }

  if (organization.created_by_user_id !== input.appUserId) {
    return {
      organization: null,
      errorResponse: NextResponse.json(
        {
          ok: false,
          error: "Only the organization owner can update its location.",
        },
        { status: 403 }
      ),
    };
  }

  return {
    organization,
    errorResponse: null,
  };
}

async function getCurrentPrimaryLocation(organizationId: string): Promise<{
  location: OrganizationLocationRow | null;
  errorResponse: NextResponse | null;
}> {
  const { data, error } = await supabase
    .from("organization_locations")
    .select(
      `
      id,
      organization_id,
      country_code,
      city,
      district,
      address_visibility,
      latitude,
      longitude,
      is_primary,
      is_active,
      created_at
    `
    )
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    return {
      location: null,
      errorResponse: NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 500 }
      ),
    };
  }

  const rows = (data as unknown as OrganizationLocationRow[] | null) ?? [];

  return {
    location: rows[0] ?? null,
    errorResponse: null,
  };
}

function buildLocationLabel(input: ParsedLocationUpdateInput) {
  const labelParts = [input.city, input.district].filter(Boolean);

  if (labelParts.length === 0) {
    return input.countryCode;
  }

  return labelParts.join(", ");
}

async function updatePrimaryLocation(input: {
  organizationId: string;
  currentLocation: OrganizationLocationRow | null;
  locationInput: ParsedLocationUpdateInput;
}): Promise<{
  location: OrganizationLocationRow | null;
  errorResponse: NextResponse | null;
}> {
  const locationPatch = {
    organization_id: input.organizationId,
    location_type: "physical",
    label: buildLocationLabel(input.locationInput),
    country_code: input.locationInput.countryCode,
    city: input.locationInput.city,
    district: input.locationInput.district,
    address_visibility: input.locationInput.addressVisibility,
    latitude: input.locationInput.latitude,
    longitude: input.locationInput.longitude,
    is_primary: true,
    is_active: true,
  };

  if (input.currentLocation) {
    const { data, error } = await supabase
      .from("organization_locations")
      .update(locationPatch)
      .eq("id", input.currentLocation.id)
      .select(
        `
        id,
        organization_id,
        country_code,
        city,
        district,
        address_visibility,
        latitude,
        longitude,
        is_primary,
        is_active,
        created_at
      `
      )
      .single();

    if (error) {
      return {
        location: null,
        errorResponse: NextResponse.json(
          {
            ok: false,
            error: error.message,
          },
          { status: 500 }
        ),
      };
    }

    return {
      location: data as unknown as OrganizationLocationRow,
      errorResponse: null,
    };
  }

  const { data, error } = await supabase
    .from("organization_locations")
    .insert(locationPatch)
    .select(
      `
      id,
      organization_id,
      country_code,
      city,
      district,
      address_visibility,
      latitude,
      longitude,
      is_primary,
      is_active,
      created_at
    `
    )
    .single();

  if (error) {
    return {
      location: null,
      errorResponse: NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 500 }
      ),
    };
  }

  return {
    location: data as unknown as OrganizationLocationRow,
    errorResponse: null,
  };
}

async function unsetOtherPrimaryLocations(input: {
  organizationId: string;
  primaryLocationId: string;
}) {
  await supabase
    .from("organization_locations")
    .update({
      is_primary: false,
    })
    .eq("organization_id", input.organizationId)
    .neq("id", input.primaryLocationId);
}

export async function PATCH(request: Request, { params }: RouteProps) {
  const resolvedParams = await params;
  const organizationId = normalizeUuid(resolvedParams.id);

  if (!organizationId) {
    return NextResponse.json(
      {
        ok: false,
        error: "Valid organization id is required.",
      },
      { status: 400 }
    );
  }

  const { appUser, errorResponse: authErrorResponse } =
    await getCurrentAppUser();

  if (authErrorResponse) {
    return authErrorResponse;
  }

  if (!appUser) {
    return NextResponse.json(
      {
        ok: false,
        error: "App user not found.",
      },
      { status: 500 }
    );
  }

  const { body, errorMessage: bodyErrorMessage } = await readJsonBody(request);

  if (bodyErrorMessage || !body) {
    return NextResponse.json(
      {
        ok: false,
        error: bodyErrorMessage ?? "Invalid request body.",
      },
      { status: 400 }
    );
  }

  const { input: locationInput, errorMessage: inputErrorMessage } =
    parseLocationUpdateInput(body);

  if (inputErrorMessage || !locationInput) {
    return NextResponse.json(
      {
        ok: false,
        error: inputErrorMessage ?? "Invalid location input.",
      },
      { status: 400 }
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
      {
        ok: false,
        error: "Organization not found.",
      },
      { status: 404 }
    );
  }

  const {
    location: currentLocation,
    errorResponse: currentLocationErrorResponse,
  } = await getCurrentPrimaryLocation(organizationId);

  if (currentLocationErrorResponse) {
    return currentLocationErrorResponse;
  }

  const { location: updatedLocation, errorResponse: locationErrorResponse } =
    await updatePrimaryLocation({
      organizationId,
      currentLocation,
      locationInput,
    });

  if (locationErrorResponse) {
    return locationErrorResponse;
  }

  if (!updatedLocation) {
    return NextResponse.json(
      {
        ok: false,
        error: "Location update failed.",
      },
      { status: 500 }
    );
  }

  await unsetOtherPrimaryLocations({
    organizationId,
    primaryLocationId: updatedLocation.id,
  });

  const defaultCurrency = getDefaultCurrencyByCountryCode(locationInput.countryCode, { fallbackCurrency: "PLN" });

  const nowIso = new Date().toISOString();

  const { data: updatedOrganizationData, error: organizationUpdateError } =
    await supabase
      .from("organizations")
      .update({
        country_code: locationInput.countryCode,
        default_currency: defaultCurrency,
        updated_at: nowIso,
      })
      .eq("id", organizationId)
      .eq("created_by_user_id", appUser.id)
      .select(
        `
        id,
        organization_name,
        created_by_user_id,
        country_code,
        default_currency
      `
      )
      .single();

  if (organizationUpdateError) {
    return NextResponse.json(
      {
        ok: false,
        error: organizationUpdateError.message,
        locationUpdateSucceeded: true,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    organization: updatedOrganizationData as unknown as OrganizationRow,
    location: updatedLocation,
  });
}
