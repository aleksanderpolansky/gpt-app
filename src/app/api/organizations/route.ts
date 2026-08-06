import { NextResponse } from "next/server";
import {
  getDefaultCurrencyByCountryCode,
  normalizeCountryCode,
} from "@/lib/commercial/currency";
import {
  GooglePlacesAddressError,
  verifyAddressSelectionToken,
  type VerifiedGoogleAddressSelection,
} from "@/lib/geo/google-places-address";
import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../lib/actor-context";
import { auth0 } from "../../../../lib/auth0";
import { runOrganizationSemanticIntake } from "../../../../lib/organizations/organizationSemanticIntake";
import { supabase } from "../../../../lib/supabase";

type GeoAreaRow = {
  id: string;
  parent_id: string | null;
  area_type: string;
  country_code: string | null;
  name: string;
  slug: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  source: string | null;
  created_by_user_id: string | null;
  is_active: boolean;
};

type ParsedOrganizationLocationInput = {
  countryCode: string | null;
  countryGeoAreaId: string | null;
  cityGeoAreaId: string | null;
  city: string | null;
  districtGeoAreaId: string | null;
  district: string | null;
  streetAddress: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  addressSelectionToken: string | null;
};

type OrganizationLocationRow = {
  id: string;
  organization_id: string;
  country_code: string | null;
  city: string | null;
  district: string | null;
  street_address: string | null;
  postal_code: string | null;
  address_visibility: string | null;
  latitude: number | null;
  longitude: number | null;
  is_primary: boolean | null;
  is_active: boolean | null;
  created_at: string;
};

type OrganizationLocationWithGeoStatus = OrganizationLocationRow & {
  cityGeoStatus: string | null;
  cityGeoSource: string | null;
  cityGeoIsOwnSuggestion: boolean;
  districtGeoStatus: string | null;
  districtGeoSource: string | null;
  districtGeoIsOwnSuggestion: boolean;
  geoStatusLabel: string | null;
};

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

const HIDDEN_ORGANIZATION_STATUSES = new Set([
  "archived",
  "deleted",
  "hidden",
  "inactive",
]);

const HIDDEN_DIRECTORY_STATUSES = new Set([
  "archived",
  "deleted",
  "hidden",
  "unpublished",
]);

function normalizeStatusValue(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isHiddenOrganization(organization: Record<string, unknown>) {
  const status = normalizeStatusValue(organization.status);
  const directoryStatus = normalizeStatusValue(organization.directory_status);

  return (
    HIDDEN_ORGANIZATION_STATUSES.has(status) ||
    HIDDEN_DIRECTORY_STATUSES.has(directoryStatus) ||
    organization.is_public_profile_enabled === false ||
    organization.is_listed_in_directory === false
  );
}

async function getCurrentActorContext() {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return {
      actorContext: null,
      errorResponse: NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      ),
    };
  }

  try {
    return {
      actorContext: await resolveActiveActorContext(session.user.sub),
      errorResponse: null,
    };
  } catch (error) {
    if (error instanceof ActorContextError) {
      return {
        actorContext: null,
        errorResponse: NextResponse.json(
          { error: error.code, errorMessage: error.message },
          { status: error.status }
        ),
      };
    }

    return {
      actorContext: null,
      errorResponse: NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Could not resolve active actor context",
        },
        { status: 500 }
      ),
    };
  }
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

function parseNullableCoordinate(
  value: unknown,
  minimum: number,
  maximum: number,
) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsedValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.trim())
        : Number.NaN;

  if (
    !Number.isFinite(parsedValue) ||
    parsedValue < minimum ||
    parsedValue > maximum
  ) {
    return null;
  }

  return Math.round(parsedValue * 1_000_000) / 1_000_000;
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

function parseOrganizationLocationInput(
  body: Record<string, unknown>
): ParsedOrganizationLocationInput {
  return {
    countryCode: normalizeCountryCode(parseOptionalText(body.countryCode)),
    countryGeoAreaId: normalizeUuid(parseOptionalText(body.countryGeoAreaId)),
    cityGeoAreaId: normalizeUuid(parseOptionalText(body.cityGeoAreaId)),
    city: parseOptionalText(body.city),
    districtGeoAreaId: normalizeUuid(parseOptionalText(body.districtGeoAreaId)),
    district: parseOptionalText(body.district),
    streetAddress: parseOptionalText(body.streetAddress),
    postalCode: parseOptionalText(body.postalCode),
    latitude: parseNullableCoordinate(body.latitude, -90, 90),
    longitude: parseNullableCoordinate(body.longitude, -180, 180),
    addressSelectionToken: parseOptionalText(body.addressSelectionToken),
  };
}

function hasAnyLocationInput(input: ParsedOrganizationLocationInput) {
  return Boolean(
    input.countryCode ||
      input.countryGeoAreaId ||
      input.cityGeoAreaId ||
      input.city ||
      input.districtGeoAreaId ||
      input.district ||
      input.streetAddress ||
      input.postalCode ||
      input.latitude !== null ||
      input.longitude !== null ||
      input.addressSelectionToken
  );
}

async function getGeoAreaById(id: string) {
  const { data: geoArea, error: geoAreaError } = await supabase
    .from("geo_areas")
    .select(
      `
      id,
      parent_id,
      area_type,
      country_code,
      name,
      slug,
      latitude,
      longitude,
      status,
      source,
      created_by_user_id,
      is_active
    `
    )
    .eq("id", id)
    .single();

  if (geoAreaError || !geoArea) {
    return {
      geoArea: null,
      errorMessage: geoAreaError?.message ?? "Geo area not found",
    };
  }

  return {
    geoArea: geoArea as GeoAreaRow,
    errorMessage: null,
  };
}

function canUseGeoAreaForOrganization(input: {
  geoArea: GeoAreaRow;
  appUserId: string;
}) {
  if (input.geoArea.is_active === false) {
    return false;
  }

  if (input.geoArea.status === "approved") {
    return true;
  }

  if (
    (input.geoArea.status === "suggested" ||
      input.geoArea.status === "needs_review") &&
    input.geoArea.source === "user_suggestion" &&
    input.geoArea.created_by_user_id === input.appUserId
  ) {
    return true;
  }

  return false;
}

function getGeoAreaAccessErrorMessage(input: {
  geoAreaTypeLabel: string;
  geoArea: GeoAreaRow;
}) {
  if (input.geoArea.is_active === false) {
    return `Selected ${input.geoAreaTypeLabel} is not active`;
  }

  if (
    input.geoArea.status === "suggested" ||
    input.geoArea.status === "needs_review"
  ) {
    return `Selected ${input.geoAreaTypeLabel} is not approved and was not created by current user`;
  }

  return `Selected ${input.geoAreaTypeLabel} is not approved or not active`;
}

async function validateOrganizationLocationInput(
  input: ParsedOrganizationLocationInput,
  appUserId: string
) {
  if (!hasAnyLocationInput(input)) {
    return {
      ok: true,
      countryGeoArea: null as GeoAreaRow | null,
      cityGeoArea: null as GeoAreaRow | null,
      districtGeoArea: null as GeoAreaRow | null,
      errorMessage: null as string | null,
    };
  }

  if (!input.countryCode) {
    return {
      ok: false,
      countryGeoArea: null,
      cityGeoArea: null,
      districtGeoArea: null,
      errorMessage:
        "countryCode is required when organization location is provided",
    };
  }

  let countryGeoArea: GeoAreaRow | null = null;
  let cityGeoArea: GeoAreaRow | null = null;
  let districtGeoArea: GeoAreaRow | null = null;

  if (input.countryGeoAreaId) {
    const { geoArea, errorMessage } = await getGeoAreaById(
      input.countryGeoAreaId
    );

    if (errorMessage || !geoArea) {
      return {
        ok: false,
        countryGeoArea: null,
        cityGeoArea: null,
        districtGeoArea: null,
        errorMessage,
      };
    }

    if (geoArea.area_type !== "country") {
      return {
        ok: false,
        countryGeoArea: null,
        cityGeoArea: null,
        districtGeoArea: null,
        errorMessage: "countryGeoAreaId must point to a country geo area",
      };
    }

    if (!canUseGeoAreaForOrganization({ geoArea, appUserId })) {
      return {
        ok: false,
        countryGeoArea: null,
        cityGeoArea: null,
        districtGeoArea: null,
        errorMessage: getGeoAreaAccessErrorMessage({
          geoAreaTypeLabel: "country",
          geoArea,
        }),
      };
    }

    if (geoArea.country_code && geoArea.country_code !== input.countryCode) {
      return {
        ok: false,
        countryGeoArea: null,
        cityGeoArea: null,
        districtGeoArea: null,
        errorMessage: "Selected country does not match countryCode",
      };
    }

    countryGeoArea = geoArea;
  }

  if (input.cityGeoAreaId) {
    const { geoArea, errorMessage } = await getGeoAreaById(input.cityGeoAreaId);

    if (errorMessage || !geoArea) {
      return {
        ok: false,
        countryGeoArea,
        cityGeoArea: null,
        districtGeoArea: null,
        errorMessage,
      };
    }

    if (geoArea.area_type !== "city") {
      return {
        ok: false,
        countryGeoArea,
        cityGeoArea: null,
        districtGeoArea: null,
        errorMessage: "cityGeoAreaId must point to a city geo area",
      };
    }

    if (!canUseGeoAreaForOrganization({ geoArea, appUserId })) {
      return {
        ok: false,
        countryGeoArea,
        cityGeoArea: null,
        districtGeoArea: null,
        errorMessage: getGeoAreaAccessErrorMessage({
          geoAreaTypeLabel: "city",
          geoArea,
        }),
      };
    }

    if (geoArea.country_code !== input.countryCode) {
      return {
        ok: false,
        countryGeoArea,
        cityGeoArea: null,
        districtGeoArea: null,
        errorMessage: "Selected city does not match countryCode",
      };
    }

    if (
      countryGeoArea &&
      geoArea.parent_id &&
      geoArea.parent_id !== countryGeoArea.id
    ) {
      return {
        ok: false,
        countryGeoArea,
        cityGeoArea: null,
        districtGeoArea: null,
        errorMessage: "Selected city does not belong to selected country",
      };
    }

    cityGeoArea = geoArea;
  }

  if (input.districtGeoAreaId) {
    const { geoArea, errorMessage } = await getGeoAreaById(
      input.districtGeoAreaId
    );

    if (errorMessage || !geoArea) {
      return {
        ok: false,
        countryGeoArea,
        cityGeoArea,
        districtGeoArea: null,
        errorMessage,
      };
    }

    if (geoArea.area_type !== "district") {
      return {
        ok: false,
        countryGeoArea,
        cityGeoArea,
        districtGeoArea: null,
        errorMessage: "districtGeoAreaId must point to a district geo area",
      };
    }

    if (!canUseGeoAreaForOrganization({ geoArea, appUserId })) {
      return {
        ok: false,
        countryGeoArea,
        cityGeoArea,
        districtGeoArea: null,
        errorMessage: getGeoAreaAccessErrorMessage({
          geoAreaTypeLabel: "district",
          geoArea,
        }),
      };
    }

    if (geoArea.country_code !== input.countryCode) {
      return {
        ok: false,
        countryGeoArea,
        cityGeoArea,
        districtGeoArea: null,
        errorMessage: "Selected district does not match countryCode",
      };
    }

    if (!cityGeoArea) {
      return {
        ok: false,
        countryGeoArea,
        cityGeoArea,
        districtGeoArea: null,
        errorMessage: "cityGeoAreaId is required when districtGeoAreaId is provided",
      };
    }

    if (geoArea.parent_id !== cityGeoArea.id) {
      return {
        ok: false,
        countryGeoArea,
        cityGeoArea,
        districtGeoArea: null,
        errorMessage: "Selected district does not belong to selected city",
      };
    }

    districtGeoArea = geoArea;
  }

  return {
    ok: true,
    countryGeoArea,
    cityGeoArea,
    districtGeoArea,
    errorMessage: null,
  };
}

function getPrimaryLocationForOrganization(
  organizationId: string,
  locations: OrganizationLocationRow[]
) {
  const organizationLocations = locations.filter(
    (location) => location.organization_id === organizationId
  );

  const primaryLocation = organizationLocations.find(
    (location) => location.is_primary === true && location.is_active !== false
  );

  if (primaryLocation) {
    return primaryLocation;
  }

  return (
    organizationLocations.find((location) => location.is_active !== false) ??
    null
  );
}

function isOwnSuggestedGeoArea(geoArea: GeoAreaRow | null, appUserId: string) {
  return Boolean(
    geoArea &&
      geoArea.source === "user_suggestion" &&
      geoArea.created_by_user_id === appUserId &&
      (geoArea.status === "suggested" || geoArea.status === "needs_review")
  );
}

async function findGeoAreaByLocationName(input: {
  areaType: "city" | "district";
  countryCode: string | null;
  name: string | null;
  parentId?: string | null;
}) {
  if (!input.countryCode || !input.name) {
    return null;
  }

  let query = supabase
    .from("geo_areas")
    .select(
      `
      id,
      parent_id,
      area_type,
      country_code,
      name,
      slug,
      latitude,
      longitude,
      status,
      source,
      created_by_user_id,
      is_active
    `
    )
    .eq("area_type", input.areaType)
    .eq("country_code", input.countryCode)
    .eq("name", input.name)
    .eq("is_active", true)
    .limit(1);

  if (input.parentId) {
    query = query.eq("parent_id", input.parentId);
  }

  const { data, error } = await query;

  if (error) {
    return null;
  }

  return ((data ?? [])[0] as GeoAreaRow | undefined) ?? null;
}

function createGeoStatusLabel(input: {
  cityGeoArea: GeoAreaRow | null;
  districtGeoArea: GeoAreaRow | null;
  appUserId: string;
}) {
  const parts: string[] = [];

  if (isOwnSuggestedGeoArea(input.cityGeoArea, input.appUserId)) {
    parts.push("город ожидает проверки");
  } else if (
    input.cityGeoArea &&
    input.cityGeoArea.status &&
    input.cityGeoArea.status !== "approved"
  ) {
    parts.push(`город: ${input.cityGeoArea.status}`);
  }

  if (isOwnSuggestedGeoArea(input.districtGeoArea, input.appUserId)) {
    parts.push("район ожидает проверки");
  } else if (
    input.districtGeoArea &&
    input.districtGeoArea.status &&
    input.districtGeoArea.status !== "approved"
  ) {
    parts.push(`район: ${input.districtGeoArea.status}`);
  }

  if (parts.length === 0) {
    return null;
  }

  return parts.join(", ");
}

async function enrichLocationWithGeoStatus(input: {
  location: OrganizationLocationRow;
  appUserId: string;
}): Promise<OrganizationLocationWithGeoStatus> {
  const cityGeoArea = await findGeoAreaByLocationName({
    areaType: "city",
    countryCode: input.location.country_code,
    name: input.location.city,
  });

  const districtGeoArea = await findGeoAreaByLocationName({
    areaType: "district",
    countryCode: input.location.country_code,
    name: input.location.district,
    parentId: cityGeoArea?.id ?? null,
  });

  const geoStatusLabel = createGeoStatusLabel({
    cityGeoArea,
    districtGeoArea,
    appUserId: input.appUserId,
  });

  return {
    ...input.location,
    cityGeoStatus: cityGeoArea?.status ?? null,
    cityGeoSource: cityGeoArea?.source ?? null,
    cityGeoIsOwnSuggestion: isOwnSuggestedGeoArea(cityGeoArea, input.appUserId),
    districtGeoStatus: districtGeoArea?.status ?? null,
    districtGeoSource: districtGeoArea?.source ?? null,
    districtGeoIsOwnSuggestion: isOwnSuggestedGeoArea(
      districtGeoArea,
      input.appUserId
    ),
    geoStatusLabel,
  };
}

export async function GET(request: Request) {
  const { actorContext, errorResponse } = await getCurrentActorContext();

  if (errorResponse) {
    return errorResponse;
  }

  if (!actorContext) {
    return NextResponse.json(
      { error: "Active actor context not found" },
      { status: 500 }
    );
  }

  const { data: organizations, error: organizationsError } = await supabase
    .from("organizations")
    .select(
      `
      id,
      organization_name,
      organization_type,
      public_slug,
      description,
      short_description,
      status,
      country_code,
      default_currency,
      directory_status,
      verification_status,
      is_public_profile_enabled,
      is_listed_in_directory,
      public_email,
      public_phone,
      website_url,
      booking_url,
      logo_url,
      cover_image_url,
      social_links_json,
      directory_published_at,
      created_at,
      updated_at
    `,
    )
    .eq("owner_actor_id", actorContext.actorId)
    .order("created_at", { ascending: false });

  if (organizationsError) {
    return NextResponse.json(
      { error: organizationsError.message },
      { status: 500 }
    );
  }

  const requestUrl = new URL(request.url);
  const scope = requestUrl.searchParams.get("scope");
  const includeHidden = scope === "deleted";

  const filteredOrganizations =
    organizations?.filter((organization) =>
      includeHidden
        ? isHiddenOrganization(organization)
        : !isHiddenOrganization(organization)
    ) ?? [];

  const organizationIds =
    filteredOrganizations.map((organization) => organization.id);

  if (organizationIds.length === 0) {
    return NextResponse.json({
      ok: true,
      organizations: [],
    });
  }

  const { data: locations, error: locationsError } = await supabase
    .from("organization_locations")
    .select(
      "id, organization_id, country_code, city, district, street_address, postal_code, address_visibility, latitude, longitude, is_primary, is_active, created_at"
    )
    .in("organization_id", organizationIds)
    .eq("is_active", true)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: false });

  if (locationsError) {
    return NextResponse.json(
      { error: locationsError.message },
      { status: 500 }
    );
  }

  const locationRows = (locations ?? []) as OrganizationLocationRow[];

  const enrichedLocationRows = await Promise.all(
    locationRows.map((location) =>
      enrichLocationWithGeoStatus({
        location,
        appUserId: actorContext.appUserId,
      })
    )
  );

  const organizationsWithLocations =
    filteredOrganizations.map((organization) => ({
      ...organization,
      primaryLocation: getPrimaryLocationForOrganization(
        organization.id,
        enrichedLocationRows
      ),
    }));

  return NextResponse.json({
    ok: true,
    organizations: organizationsWithLocations,
  });
}

function applyVerifiedAddressSelection(
  input: ParsedOrganizationLocationInput,
  selection: VerifiedGoogleAddressSelection,
): ParsedOrganizationLocationInput {
  return {
    ...input,
    countryCode: selection.countryCode,
    city: selection.city,
    district: selection.district,
    streetAddress: selection.streetAddress,
    postalCode: selection.postalCode,
    latitude: selection.latitude,
    longitude: selection.longitude,
  };
}

function getAddressSelectionErrorResponse(error: unknown) {
  if (error instanceof GooglePlacesAddressError) {
    return NextResponse.json(
      {
        error: error.message,
        errorCode: error.code,
      },
      { status: error.status },
    );
  }

  return NextResponse.json(
    {
      error:
        error instanceof Error
          ? error.message
          : "Address selection could not be verified.",
    },
    { status: 400 },
  );
}

export async function POST(request: Request) {
  const { actorContext, errorResponse } = await getCurrentActorContext();

  if (errorResponse) {
    return errorResponse;
  }

  if (!actorContext) {
    return NextResponse.json(
      { error: "Active actor context not found" },
      { status: 500 }
    );
  }

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const organizationName = parseOptionalText(body.organizationName);
  const organizationType = parseOptionalText(body.organizationType);
  const description = parseOptionalText(body.description);

  if (!organizationName || !organizationType) {
    return NextResponse.json(
      { error: "organizationName and organizationType are required" },
      { status: 400 }
    );
  }

  let locationInput = parseOrganizationLocationInput(body);

  if (locationInput.addressSelectionToken) {
    try {
      const verifiedSelection = verifyAddressSelectionToken(
        locationInput.addressSelectionToken,
      );

      if (
        locationInput.countryCode &&
        locationInput.countryCode !== verifiedSelection.countryCode
      ) {
        return NextResponse.json(
          {
            error:
              "The selected address country was changed. Select the address again or continue with manual country data.",
          },
          { status: 400 },
        );
      }

      locationInput = applyVerifiedAddressSelection(
        locationInput,
        verifiedSelection,
      );
    } catch (error) {
      return getAddressSelectionErrorResponse(error);
    }
  }

  const locationValidation = await validateOrganizationLocationInput(
    locationInput,
    actorContext.appUserId
  );

  if (!locationValidation.ok) {
    return NextResponse.json(
      {
        error:
          locationValidation.errorMessage ??
          "Selected organization location is invalid",
      },
      { status: 400 }
    );
  }

  const defaultCurrency = getDefaultCurrencyByCountryCode(
    locationInput.countryCode,
  );

  if (!defaultCurrency) {
    return NextResponse.json(
      {
        error:
          "A supported organization country is required before its currency can be determined.",
      },
      { status: 400 },
    );
  }
  const directoryPublishedAt = new Date().toISOString();
  const createLocation = hasAnyLocationInput(locationInput);
  const cityName =
    locationValidation.cityGeoArea?.name ?? locationInput.city ?? null;
  const districtName =
    locationValidation.districtGeoArea?.name ?? locationInput.district ?? null;
  const latitude =
    locationInput.latitude ??
    locationValidation.cityGeoArea?.latitude ??
    null;
  const longitude =
    locationInput.longitude ??
    locationValidation.cityGeoArea?.longitude ??
    null;

  const { data: creationRows, error: creationError } = await supabase.rpc(
    "create_actor_owned_organization_v1",
    {
      p_owner_user_id: actorContext.appUserId,
      p_owner_actor_id: actorContext.actorId,
      p_organization_name: organizationName,
      p_organization_type: organizationType,
      p_description: description,
      p_country_code: locationInput.countryCode,
      p_default_currency: defaultCurrency,
      p_directory_status: "published",
      p_is_public_profile_enabled: true,
      p_is_listed_in_directory: true,
      p_directory_published_at: directoryPublishedAt,
      p_create_location: createLocation,
      p_location_country_code: locationInput.countryCode,
      p_location_city: cityName,
      p_location_district: districtName,
      p_location_address_visibility: "approximate",
      p_location_latitude: latitude,
      p_location_longitude: longitude,
      p_create_default_reward_rule: false,
    }
  );

  const creation = (
    (creationRows ?? []) as ActorOwnedOrganizationRpcRow[]
  )[0];

  if (creationError || !creation) {
    return NextResponse.json(
      {
        error:
          creationError?.message ?? "Actor-owned organization was not created",
      },
      { status: creationError?.code === "42501" ? 403 : 500 }
    );
  }

  let addressPersistenceWarning: string | null = null;

  if (
    creation.location_id &&
    (
      locationInput.streetAddress ||
      locationInput.postalCode ||
      locationInput.latitude !== null ||
      locationInput.longitude !== null
    )
  ) {
    const { error: exactLocationUpdateError } = await supabase
      .from("organization_locations")
      .update({
        street_address: locationInput.streetAddress,
        postal_code: locationInput.postalCode,
        latitude,
        longitude,
        address_visibility: "approximate",
      })
      .eq("id", creation.location_id)
      .eq("organization_id", creation.organization_id);

    if (exactLocationUpdateError) {
      addressPersistenceWarning =
        "Organization was created, but the exact street and postal code could not be saved.";
    }
  }

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select(
      `
      id,
      organization_name,
      organization_type,
      public_slug,
      description,
      short_description,
      status,
      country_code,
      default_currency,
      directory_status,
      verification_status,
      is_public_profile_enabled,
      is_listed_in_directory,
      public_email,
      public_phone,
      website_url,
      booking_url,
      logo_url,
      cover_image_url,
      social_links_json,
      directory_published_at,
      created_at,
      updated_at
    `,
    )
    .eq("id", creation.organization_id)
    .single();

  const { data: organizationActor, error: organizationActorError } =
    await supabase
      .from("actors")
      .select("*")
      .eq("id", creation.organization_actor_id)
      .single();

  const { data: businessSpace, error: businessSpaceError } = await supabase
    .from("spaces")
    .select("*")
    .eq("id", creation.business_space_id)
    .single();

  let organizationLocation = null;
  let organizationLocationError: { message: string } | null = null;

  if (creation.location_id) {
    const locationResult = await supabase
      .from("organization_locations")
      .select("*")
      .eq("id", creation.location_id)
      .single();

    organizationLocation = locationResult.data;
    organizationLocationError = locationResult.error;
  }

  const { data: roleRows, error: rolesError } = await supabase
    .from("actor_space_roles")
    .select("*")
    .eq("space_id", creation.business_space_id)
    .eq("is_active", true);

  const postReadError =
    organizationError ??
    organizationActorError ??
    businessSpaceError ??
    organizationLocationError ??
    rolesError;

  if (postReadError || !organization || !organizationActor || !businessSpace) {
    return NextResponse.json(
      {
        error:
          postReadError?.message ??
          "Organization was created, but its complete result could not be read",
        created: creation,
      },
      { status: 500 }
    );
  }

  const ownerRole = (roleRows ?? []).find(
    (role) =>
      role.actor_id === actorContext.actorId && role.function_type === "owner"
  );
  const managerRole = (roleRows ?? []).find(
    (role) =>
      role.actor_id === actorContext.actorId && role.function_type === "manager"
  );
  const sellerRole = (roleRows ?? []).find(
    (role) =>
      role.actor_id === organizationActor.id &&
      role.function_type === "seller"
  );

  let semanticIntake = null;

  try {
    semanticIntake = await runOrganizationSemanticIntake({
      objectType: "organization",
      objectId: organization.id,
      source: "organization_create_api_post_write_flow",
      name: organization.organization_name,
      description: organization.description,
      organizationType: organization.organization_type,
      country:
        organizationLocation?.country_code ??
        organization.country_code ??
        locationInput.countryCode,
      city: organizationLocation?.city ?? locationInput.city,
      district: organizationLocation?.district ?? locationInput.district,
      classifiedByUserId: actorContext.appUserId,
      persist: true,
      replaceExistingAiPrimary: true,
    });
  } catch (error) {
    semanticIntake = {
      ok: false,
      mode: "organization_create_api_semantic_intake_unhandled_error",
      error:
        error instanceof Error
          ? error.message
          : "Unknown organization semantic intake error.",
    };
  }

  return NextResponse.json(
    {
      ok: true,
      organization,
      organizationLocation,
      organizationActor,
      businessSpace,
      roles: {
        owner: ownerRole ?? null,
        manager: managerRole ?? null,
        seller: sellerRole ?? null,
      },
      actingAs: {
        actorId: actorContext.actorId,
        actorType: actorContext.actorType,
        profileId: actorContext.profile.profileId,
        displayName: actorContext.profile.displayName,
      },
      directory: {
        status: organization.directory_status,
        isPublicProfileEnabled: organization.is_public_profile_enabled,
        isListedInDirectory: organization.is_listed_in_directory,
        publicSlug: organization.public_slug,
        publishedAt: organization.directory_published_at,
      },
      semanticIntake,
      addressPersistenceWarning,
    },
    { status: 201 }
  );
}
