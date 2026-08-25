import { revalidatePath } from "next/cache";
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
} from "../../../../../../lib/actor-context";
import { auth0 } from "../../../../../../lib/auth0";
import { persistMediaImageValue } from "../../../../../../lib/media-storage";
import { supabase } from "../../../../../../lib/supabase";
import { persistHumanLocalizedEntityContent } from "@/lib/localization/contentLocalization.server";
import {
  parseOrganizationContactChannelsInput,
  writeOrganizationContactChannels,
  type OrganizationContactChannel,
} from "@/lib/commercial/organizationContactChannels";
import {
  parseOrganizationFeaturedContentInput,
  writeOrganizationFeaturedContent,
  type OrganizationFeaturedContent,
} from "@/lib/commercial/organizationFeaturedContent";

export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{
    id: string;
  }>;
};

type OrganizationRow = {
  id: string;
  owner_actor_id: string | null;
  public_slug: string | null;
  social_links_json: Record<string, unknown> | null;
  country_code: string | null;
  default_currency: string | null;
  logo_url: string | null;
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
  addressSelectionToken?: unknown;
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
  contactChannels: OrganizationContactChannel[] | undefined,
  featuredContent: OrganizationFeaturedContent | undefined,
) {
  let nextValue =
    currentValue && typeof currentValue === "object" && !Array.isArray(currentValue)
      ? { ...currentValue }
      : {};

  if (categoryLabel) {
    nextValue.public_profile_category_label = categoryLabel;
  } else {
    delete nextValue.public_profile_category_label;
  }

  if (contactChannels !== undefined) {
    nextValue = writeOrganizationContactChannels(nextValue, contactChannels);
  }

  if (featuredContent !== undefined) {
    nextValue = writeOrganizationFeaturedContent(nextValue, featuredContent);
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

function getAddressSelectionErrorResponse(error: unknown) {
  if (error instanceof GooglePlacesAddressError) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        errorCode: error.code,
      },
      { status: error.status },
    );
  }

  return NextResponse.json(
    {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Address selection could not be verified.",
    },
    { status: 400 },
  );
}

async function getCurrentActorContext() {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return {
      actorContext: null,
      errorResponse: NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 },
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
          {
            ok: false,
            error: error.code,
            errorMessage: error.message,
          },
          { status: error.status },
        ),
      };
    }

    return {
      actorContext: null,
      errorResponse: NextResponse.json(
        {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Could not resolve active actor context",
        },
        { status: 500 },
      ),
    };
  }
}

async function getOwnedOrganization(input: {
  organizationId: string;
  actorId: string;
}) {
  const { data, error } = await supabase
    .from("organizations")
    .select(
      "id, owner_actor_id, public_slug, social_links_json, country_code, default_currency, logo_url",
    )
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

  if (organization.owner_actor_id !== input.actorId) {
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

  const { actorContext, errorResponse } = await getCurrentActorContext();

  if (errorResponse) {
    return errorResponse;
  }

  if (!actorContext) {
    return NextResponse.json(
      { ok: false, error: "Actor context not found" },
      { status: 500 },
    );
  }

  const { organization, errorResponse: organizationErrorResponse } =
    await getOwnedOrganization({
      organizationId,
      actorId: actorContext.actorId,
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
  const contactChannelsWereSubmitted = Object.prototype.hasOwnProperty.call(
    body,
    "contactChannels",
  );
  let normalizedContactChannels: OrganizationContactChannel[] | undefined;

  if (contactChannelsWereSubmitted) {
    const parsedContactChannels = parseOrganizationContactChannelsInput(
      body.contactChannels,
    );

    if (!parsedContactChannels.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: parsedContactChannels.errorCode,
          errorCode: parsedContactChannels.errorCode,
        },
        { status: 400 },
      );
    }

    normalizedContactChannels = parsedContactChannels.channels;
  }

  const featuredContentWasSubmitted = Object.prototype.hasOwnProperty.call(
    body,
    "featuredContent",
  );
  let normalizedFeaturedContent: OrganizationFeaturedContent | undefined;

  if (featuredContentWasSubmitted) {
    const parsedFeaturedContent = parseOrganizationFeaturedContentInput(
      body.featuredContent,
    );

    if (!parsedFeaturedContent.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: parsedFeaturedContent.errorCode,
          errorCode: parsedFeaturedContent.errorCode,
        },
        { status: 400 },
      );
    }

    normalizedFeaturedContent = parsedFeaturedContent.value;
  }

  const logoUrlWasSubmitted = Object.prototype.hasOwnProperty.call(body, "logoUrl");
  let logoUrl = organization.logo_url;

  if (logoUrlWasSubmitted) {
    try {
      logoUrl = await persistMediaImageValue({
        value: body.logoUrl,
        visibility: "public",
        namespace: `organizations/${organizationId}/logo`,
        maxBytes: 512 * 1024,
      });
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Organization image is invalid.",
        },
        { status: 400 },
      );
    }
  }
  const locationPayload =
    body.location && typeof body.location === "object"
      ? (body.location as LocationPayload)
      : null;
  let verifiedAddressSelection: VerifiedGoogleAddressSelection | null = null;

  if (locationPayload) {
    const addressSelectionToken = parseNullableText(
      locationPayload.addressSelectionToken,
    );

    if (addressSelectionToken) {
      try {
        verifiedAddressSelection = verifyAddressSelectionToken(
          addressSelectionToken,
        );
      } catch (error) {
        return getAddressSelectionErrorResponse(error);
      }

      const submittedCountryCode = normalizeCountryCode(
        parseNullableText(locationPayload.countryCode),
      );

      if (
        submittedCountryCode &&
        submittedCountryCode !== verifiedAddressSelection.countryCode
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "The selected address country was changed. Select the address again or continue with manual country data.",
          },
          { status: 400 },
        );
      }
    }
  }

  const nextCountryCode = locationPayload
    ? (
        verifiedAddressSelection?.countryCode ??
        normalizeCountryCode(parseNullableText(locationPayload.countryCode))
      )
    : normalizeCountryCode(organization.country_code);
  const nextDefaultCurrency = locationPayload
    ? getDefaultCurrencyByCountryCode(nextCountryCode)
    : organization.default_currency;

  // CONTENT_L10_LOCALE_ADDRESS_CURRENCY_MEDIA_HOTFIX_V6: currency is allowed to remain null while editing the enterprise profile.

  const nextSocialLinksJson = getNextSocialLinksJson(
    organization.social_links_json,
    categoryLabel,
    normalizedContactChannels,
    normalizedFeaturedContent,
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
        country_code: nextCountryCode,
        default_currency: nextDefaultCurrency,
        updated_at: now,
      })
      .eq("id", organizationId)
      .eq("owner_actor_id", actorContext.actorId)
      .select(
        `
        id,
        organization_name,
        organization_type,
        public_slug,
        description,
        short_description,
        public_phone,
        website_url,
        booking_url,
        public_email,
        logo_url,
        social_links_json,
        country_code,
        default_currency,
        updated_at
      `,
      )
      .single();

  if (updateOrganizationError) {
    return NextResponse.json(
      { ok: false, error: updateOrganizationError.message },
      { status: 500 },
    );
  }

  let updatedLocation = null;

  if (locationPayload) {
    const streetAddress =
      verifiedAddressSelection?.streetAddress ??
      parseNullableText(locationPayload.streetAddress);
    const addressVisibility = parseAddressVisibility(
      locationPayload.addressVisibility,
    );

    const locationUpdate = {
      country_code: nextCountryCode,
      city:
        verifiedAddressSelection?.city ??
        parseNullableText(locationPayload.city),
      district:
        verifiedAddressSelection?.district ??
        parseNullableText(locationPayload.district),
      street_address: streetAddress,
      postal_code:
        verifiedAddressSelection?.postalCode ??
        parseNullableText(locationPayload.postalCode),
      label: parseNullableText(locationPayload.label),
      latitude:
        verifiedAddressSelection?.latitude ??
        parseNullableCoordinate(locationPayload.latitude, -90, 90),
      longitude:
        verifiedAddressSelection?.longitude ??
        parseNullableCoordinate(locationPayload.longitude, -180, 180),
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
        .select(
          `
          id,
          organization_id,
          location_type,
          address_visibility,
          label,
          country_code,
          region,
          city,
          district,
          street_address,
          postal_code,
          latitude,
          longitude,
          is_primary,
          is_active,
          created_at
        `,
        )
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
          created_by_actor_id: actorContext.actorId,
          location_type: "service_area",
          ...locationUpdate,
        })
        .select(
          `
          id,
          organization_id,
          location_type,
          address_visibility,
          label,
          country_code,
          region,
          city,
          district,
          street_address,
          postal_code,
          latitude,
          longitude,
          is_primary,
          is_active,
          created_at
        `,
        )
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

  const contentLocalization = await persistHumanLocalizedEntityContent({
    table: "organizations",
    entityId: organizationId,
    sourceLocaleHint: body.locale,
    fields: {
      organizationName: updatedOrganization.organization_name,
      description: updatedOrganization.description,
      shortDescription: updatedOrganization.short_description,
      featuredShortDescription: parseNullableText(
        body.featuredShortDescription,
      ),
    },
  });

  revalidatePath(`/organizations/${organizationId}/edit`);

  if (organization.public_slug) {
    revalidatePath(`/directory/${organization.public_slug}`);
  }

  return NextResponse.json({
    ok: true,
    organization: updatedOrganization,
    primaryLocation: updatedLocation,
    contentLocalization,
    actingAs: {
      actorId: actorContext.actorId,
      actorType: actorContext.actorType,
      profileId: actorContext.profile.profileId,
    },
  });
}