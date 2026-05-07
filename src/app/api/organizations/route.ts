import { NextResponse } from "next/server";
import { auth0 } from "../../../../lib/auth0";
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

type AppUserRow = {
  id: string;
  auth0_sub: string;
};

async function getCurrentAppUser() {
  const session = await auth0.getSession();

  if (!session?.user) {
    return {
      appUser: null,
      errorResponse: NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      ),
    };
  }

  const { data: appUser, error: appUserError } = await supabase
    .from("app_users")
    .select("*")
    .eq("auth0_sub", session.user.sub)
    .single();

  if (appUserError || !appUser) {
    return {
      appUser: null,
      errorResponse: NextResponse.json(
        { error: appUserError?.message ?? "App user not found" },
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

function normalizeCountryCode(value: string | null) {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim().toUpperCase();

  if (!/^[A-Z]{2}$/.test(normalizedValue)) {
    return null;
  }

  return normalizedValue;
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
  };
}

function hasAnyLocationInput(input: ParsedOrganizationLocationInput) {
  return Boolean(
    input.countryCode ||
      input.countryGeoAreaId ||
      input.cityGeoAreaId ||
      input.city ||
      input.districtGeoAreaId ||
      input.district
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

export async function GET() {
  const { appUser, errorResponse } = await getCurrentAppUser();

  if (errorResponse) {
    return errorResponse;
  }

  if (!appUser) {
    return NextResponse.json(
      { error: "App user not found" },
      { status: 500 }
    );
  }

  const { data: organizations, error: organizationsError } = await supabase
    .from("organizations")
    .select("*")
    .eq("created_by_user_id", appUser.id)
    .order("created_at", { ascending: false });

  if (organizationsError) {
    return NextResponse.json(
      { error: organizationsError.message },
      { status: 500 }
    );
  }

  const organizationIds =
    organizations?.map((organization) => organization.id) ?? [];

  if (organizationIds.length === 0) {
    return NextResponse.json({
      ok: true,
      organizations: [],
    });
  }

  const { data: locations, error: locationsError } = await supabase
    .from("organization_locations")
    .select(
      "id, organization_id, country_code, city, district, address_visibility, latitude, longitude, is_primary, is_active, created_at"
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

  const organizationsWithLocations =
    organizations?.map((organization) => ({
      ...organization,
      primaryLocation: getPrimaryLocationForOrganization(
        organization.id,
        locationRows
      ),
    })) ?? [];

  return NextResponse.json({
    ok: true,
    organizations: organizationsWithLocations,
  });
}

export async function POST(request: Request) {
  const { appUser, errorResponse } = await getCurrentAppUser();

  if (errorResponse) {
    return errorResponse;
  }

  if (!appUser) {
    return NextResponse.json(
      { error: "App user not found" },
      { status: 500 }
    );
  }

  const body = await request.json();

  const organizationName = parseOptionalText(body.organizationName);
  const organizationType = parseOptionalText(body.organizationType);
  const description = parseOptionalText(body.description);

  if (!organizationName || !organizationType) {
    return NextResponse.json(
      { error: "organizationName and organizationType are required" },
      { status: 400 }
    );
  }

  const locationInput = parseOrganizationLocationInput(body);

  const locationValidation = await validateOrganizationLocationInput(
    locationInput,
    appUser.id
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

  const { data: person, error: personError } = await supabase
    .from("persons")
    .select("*")
    .eq("user_id", appUser.id)
    .single();

  if (personError) {
    return NextResponse.json({ error: personError.message }, { status: 500 });
  }

  const { data: personActor, error: personActorError } = await supabase
    .from("actors")
    .select("*")
    .eq("person_id", person.id)
    .eq("actor_type", "person")
    .single();

  if (personActorError) {
    return NextResponse.json(
      { error: personActorError.message },
      { status: 500 }
    );
  }

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .insert({
      created_by_user_id: appUser.id,
      organization_name: organizationName,
      organization_type: organizationType,
      owner_person_id: person.id,
      description,
      country_code: locationInput.countryCode,
      status: "active",
    })
    .select()
    .single();

  if (organizationError) {
    return NextResponse.json(
      { error: organizationError.message },
      { status: 500 }
    );
  }

  let organizationLocation = null;

  if (hasAnyLocationInput(locationInput)) {
    const cityName =
      locationValidation.cityGeoArea?.name ?? locationInput.city ?? null;
    const districtName =
      locationValidation.districtGeoArea?.name ?? locationInput.district ?? null;

    const latitude = locationValidation.cityGeoArea?.latitude ?? null;
    const longitude = locationValidation.cityGeoArea?.longitude ?? null;

    const { data: insertedLocation, error: locationError } = await supabase
      .from("organization_locations")
      .insert({
        organization_id: organization.id,
        country_code: locationInput.countryCode,
        city: cityName,
        district: districtName,
        address_visibility: "approximate",
        latitude,
        longitude,
        is_primary: true,
        is_active: true,
      })
      .select()
      .single();

    if (locationError) {
      return NextResponse.json(
        {
          error: locationError.message,
          organization,
          warning:
            "Organization was created, but organization location was not saved.",
        },
        { status: 500 }
      );
    }

    organizationLocation = insertedLocation;
  }

  const { data: organizationActor, error: organizationActorError } =
    await supabase
      .from("actors")
      .insert({
        actor_type: "organization",
        organization_id: organization.id,
        display_name: organization.organization_name,
        status: "active",
      })
      .select()
      .single();

  if (organizationActorError) {
    return NextResponse.json(
      { error: organizationActorError.message },
      { status: 500 }
    );
  }

  const { data: businessSpace, error: businessSpaceError } = await supabase
    .from("spaces")
    .insert({
      owner_user_id: appUser.id,
      space_type: "own_business",
      title: organization.organization_name,
      description: `Business space for ${organization.organization_name}`,
      status: "active",
    })
    .select()
    .single();

  if (businessSpaceError) {
    return NextResponse.json(
      { error: businessSpaceError.message },
      { status: 500 }
    );
  }

  const { data: ownerRole, error: ownerRoleError } = await supabase
    .from("actor_space_roles")
    .insert({
      actor_id: personActor.id,
      space_id: businessSpace.id,
      function_type: "owner",
      title: "Owner",
      is_active: true,
      authority_level: 100,
      responsibility_level: 100,
    })
    .select()
    .single();

  if (ownerRoleError) {
    return NextResponse.json(
      { error: ownerRoleError.message },
      { status: 500 }
    );
  }

  const { data: managerRole, error: managerRoleError } = await supabase
    .from("actor_space_roles")
    .insert({
      actor_id: personActor.id,
      space_id: businessSpace.id,
      function_type: "manager",
      title: "Manager",
      is_active: true,
      authority_level: 90,
      responsibility_level: 90,
    })
    .select()
    .single();

  if (managerRoleError) {
    return NextResponse.json(
      { error: managerRoleError.message },
      { status: 500 }
    );
  }

  const { data: sellerRole, error: sellerRoleError } = await supabase
    .from("actor_space_roles")
    .insert({
      actor_id: organizationActor.id,
      space_id: businessSpace.id,
      function_type: "seller",
      title: "Seller / Provider",
      is_active: true,
      authority_level: 100,
      responsibility_level: 100,
    })
    .select()
    .single();

  if (sellerRoleError) {
    return NextResponse.json(
      { error: sellerRoleError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    organization,
    organizationLocation,
    organizationActor,
    businessSpace,
    roles: {
      owner: ownerRole,
      manager: managerRole,
      seller: sellerRole,
    },
  });
}