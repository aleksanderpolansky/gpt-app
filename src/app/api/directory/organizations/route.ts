import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type DirectoryActionFilter =
  | "all"
  | "hasOffers"
  | "hasCertificates"
  | "canRegisterPurchase";

type RelatedCategory = {
  is_primary: boolean | null;
  business_categories:
    | {
        id: string;
        slug: string;
        name: string;
        description: string | null;
      }
    | {
        id: string;
        slug: string;
        name: string;
        description: string | null;
      }[]
    | null;
};

type RelatedLocation = {
  id: string;
  location_type: string;
  address_visibility: string;
  label: string | null;
  country_code: string | null;
  region: string | null;
  city: string | null;
  district: string | null;
  street_address: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  is_primary: boolean | null;
  is_active: boolean | null;
  geo_areas:
    | {
        id: string;
        area_type: string;
        name: string;
        slug: string;
        country_code: string | null;
      }
    | {
        id: string;
        area_type: string;
        name: string;
        slug: string;
        country_code: string | null;
      }[]
    | null;
};

type RelatedStats = {
  profile_views_count: number | null;
  offer_clicks_count: number | null;
  certificate_clicks_count: number | null;
  purchase_registration_clicks_count: number | null;
};

type DirectoryOrganizationRow = {
  id: string;
  organization_name: string;
  organization_type: string;
  description: string | null;
  short_description: string | null;
  public_slug: string | null;
  country_code: string | null;
  default_currency: string | null;
  directory_status: string;
  verification_status: string;
  is_public_profile_enabled: boolean;
  is_listed_in_directory: boolean;
  public_email: string | null;
  public_phone: string | null;
  website_url: string | null;
  booking_url: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  social_links_json: Record<string, unknown> | null;
  directory_published_at: string | null;
  created_at: string;
  updated_at: string | null;
  organization_categories?: RelatedCategory[] | null;
  organization_locations?: RelatedLocation[] | null;
  organization_search_stats?: RelatedStats[] | null;
};

type OfferActionRow = {
  id: string;
  organization_id: string | null;
  certificate_available: boolean;
  status: string;
  valid_from: string | null;
  valid_until: string | null;
};

type OrganizationActionStats = {
  activeOffersCount: number;
  activeCertificatesCount: number;
};

type MinimumPurchaseThreshold = {
  currency: string;
  amount: number;
};

const MINIMUM_PURCHASE_THRESHOLDS: Record<string, MinimumPurchaseThreshold> = {
  EUR: {
    currency: "EUR",
    amount: 10,
  },
  PLN: {
    currency: "PLN",
    amount: 45,
  },
  USD: {
    currency: "USD",
    amount: 11,
  },
  GBP: {
    currency: "GBP",
    amount: 9,
  },
  UAH: {
    currency: "UAH",
    amount: 450,
  },
  CZK: {
    currency: "CZK",
    amount: 250,
  },
};

function getFirstRelatedItem<T>(value: T | T[] | null | undefined) {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function normalizeSearchValue(value: string | null) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return null;
  }

  return trimmedValue;
}

function normalizeActionFilter(value: string | null): DirectoryActionFilter {
  const normalizedValue = normalizeSearchValue(value);

  if (
    normalizedValue === "hasOffers" ||
    normalizedValue === "hasCertificates" ||
    normalizedValue === "canRegisterPurchase"
  ) {
    return normalizedValue;
  }

  return "all";
}

function normalizeCurrency(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim().toUpperCase();

  if (!normalizedValue) {
    return null;
  }

  return normalizedValue;
}

function canRegisterPurchaseForOrganization(row: DirectoryOrganizationRow) {
  const currency = normalizeCurrency(row.default_currency);

  if (!currency) {
    return false;
  }

  return Boolean(MINIMUM_PURCHASE_THRESHOLDS[currency]);
}

function getPublicLocation(location: RelatedLocation | null) {
  if (!location) {
    return null;
  }

  if (location.address_visibility === "hidden") {
    return {
      id: location.id,
      locationType: location.location_type,
      addressVisibility: location.address_visibility,
      label: location.label,
      countryCode: location.country_code,
      region: location.region,
      city: location.city,
      district: location.district,
      streetAddress: null,
      postalCode: null,
      latitude: null,
      longitude: null,
      geoArea: getFirstRelatedItem(location.geo_areas),
    };
  }

  if (location.address_visibility === "approximate") {
    return {
      id: location.id,
      locationType: location.location_type,
      addressVisibility: location.address_visibility,
      label: location.label,
      countryCode: location.country_code,
      region: location.region,
      city: location.city,
      district: location.district,
      streetAddress: null,
      postalCode: null,
      latitude: location.latitude,
      longitude: location.longitude,
      geoArea: getFirstRelatedItem(location.geo_areas),
    };
  }

  return {
    id: location.id,
    locationType: location.location_type,
    addressVisibility: location.address_visibility,
    label: location.label,
    countryCode: location.country_code,
    region: location.region,
    city: location.city,
    district: location.district,
    streetAddress: location.street_address,
    postalCode: location.postal_code,
    latitude: location.latitude,
    longitude: location.longitude,
    geoArea: getFirstRelatedItem(location.geo_areas),
  };
}

function getEmptyActionStats(): OrganizationActionStats {
  return {
    activeOffersCount: 0,
    activeCertificatesCount: 0,
  };
}

function isOfferCurrentlyActive(offer: OfferActionRow, nowIso: string) {
  if (offer.status !== "active") {
    return false;
  }

  if (offer.valid_from && offer.valid_from > nowIso) {
    return false;
  }

  if (offer.valid_until && offer.valid_until < nowIso) {
    return false;
  }

  return true;
}

async function getActionStatsByOrganizationId(
  organizationIds: string[]
): Promise<Map<string, OrganizationActionStats>> {
  const statsByOrganizationId = new Map<string, OrganizationActionStats>();

  for (const organizationId of organizationIds) {
    statsByOrganizationId.set(organizationId, getEmptyActionStats());
  }

  if (organizationIds.length === 0) {
    return statsByOrganizationId;
  }

  const nowIso = new Date().toISOString();

  const { data: offers, error } = await supabase
    .from("offers")
    .select(
      `
      id,
      organization_id,
      certificate_available,
      status,
      valid_from,
      valid_until
    `
    )
    .in("organization_id", organizationIds)
    .eq("status", "active")
    .or(`valid_from.is.null,valid_from.lte.${nowIso}`)
    .or(`valid_until.is.null,valid_until.gte.${nowIso}`);

  if (error) {
    return statsByOrganizationId;
  }

  const offerRows = (offers as unknown as OfferActionRow[] | null) ?? [];

  for (const offer of offerRows) {
    if (!offer.organization_id) {
      continue;
    }

    if (!isOfferCurrentlyActive(offer, nowIso)) {
      continue;
    }

    const currentStats =
      statsByOrganizationId.get(offer.organization_id) ??
      getEmptyActionStats();

    currentStats.activeOffersCount += 1;

    if (offer.certificate_available) {
      currentStats.activeCertificatesCount += 1;
    }

    statsByOrganizationId.set(offer.organization_id, currentStats);
  }

  return statsByOrganizationId;
}

function mapDirectoryOrganization(
  row: DirectoryOrganizationRow,
  actionStats: OrganizationActionStats
) {
  const primaryCategoryRelation =
    row.organization_categories?.find((item) => item.is_primary) ??
    row.organization_categories?.[0] ??
    null;

  const primaryCategory = getFirstRelatedItem(
    primaryCategoryRelation?.business_categories
  );

  const primaryLocation =
    row.organization_locations?.find(
      (item) => item.is_primary && item.is_active
    ) ??
    row.organization_locations?.find((item) => item.is_active) ??
    row.organization_locations?.[0] ??
    null;

  const stats = row.organization_search_stats?.[0] ?? null;
  const canRegisterPurchase = canRegisterPurchaseForOrganization(row);

  return {
    id: row.id,
    name: row.organization_name,
    type: row.organization_type,
    description: row.description,
    shortDescription: row.short_description,
    publicSlug: row.public_slug,
    countryCode: row.country_code,
    defaultCurrency: row.default_currency,
    directoryStatus: row.directory_status,
    verificationStatus: row.verification_status,
    publicEmail: row.public_email,
    publicPhone: row.public_phone,
    websiteUrl: row.website_url,
    bookingUrl: row.booking_url,
    logoUrl: row.logo_url,
    coverImageUrl: row.cover_image_url,
    socialLinks: row.social_links_json ?? {},
    directoryPublishedAt: row.directory_published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    primaryCategory,
    primaryLocation: getPublicLocation(primaryLocation),
    stats: {
      profileViewsCount: stats?.profile_views_count ?? 0,
      offerClicksCount: stats?.offer_clicks_count ?? 0,
      certificateClicksCount: stats?.certificate_clicks_count ?? 0,
      purchaseRegistrationClicksCount:
        stats?.purchase_registration_clicks_count ?? 0,
    },
    actionStats: {
      activeOffersCount: actionStats.activeOffersCount,
      activeCertificatesCount: actionStats.activeCertificatesCount,
      hasActiveOffers: actionStats.activeOffersCount > 0,
      hasActiveCertificates: actionStats.activeCertificatesCount > 0,
      canRegisterPurchase,
    },
  };
}

function rowMatchesLocationFilters(
  row: DirectoryOrganizationRow,
  city: string | null,
  district: string | null
) {
  if (!city && !district) {
    return true;
  }

  const hasMatchingLocation =
    row.organization_locations?.some((location) => {
      if (!location.is_active) {
        return false;
      }

      if (city && location.city?.toLowerCase() !== city.toLowerCase()) {
        return false;
      }

      if (
        district &&
        location.district?.toLowerCase() !== district.toLowerCase()
      ) {
        return false;
      }

      return true;
    }) ?? false;

  return hasMatchingLocation;
}

function rowMatchesCategoryFilter(
  row: DirectoryOrganizationRow,
  categorySlug: string | null
) {
  if (!categorySlug) {
    return true;
  }

  const hasMatchingCategory =
    row.organization_categories?.some((categoryRelation) => {
      const category = getFirstRelatedItem(
        categoryRelation.business_categories
      );

      return category?.slug === categorySlug;
    }) ?? false;

  return hasMatchingCategory;
}

function rowMatchesActionFilter(
  row: DirectoryOrganizationRow,
  actionFilter: DirectoryActionFilter,
  actionStats: OrganizationActionStats
) {
  if (actionFilter === "hasOffers") {
    return actionStats.activeOffersCount > 0;
  }

  if (actionFilter === "hasCertificates") {
    return actionStats.activeCertificatesCount > 0;
  }

  if (actionFilter === "canRegisterPurchase") {
    return canRegisterPurchaseForOrganization(row);
  }

  return true;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const q = normalizeSearchValue(searchParams.get("q"));
  const categorySlug = normalizeSearchValue(searchParams.get("category"));
  const city = normalizeSearchValue(searchParams.get("city"));
  const district = normalizeSearchValue(searchParams.get("district"));
  const countryCode = normalizeSearchValue(searchParams.get("countryCode"));
  const action = normalizeActionFilter(searchParams.get("action"));
  const limitParam = Number(searchParams.get("limit") ?? "50");

  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(Math.trunc(limitParam), 1), 100)
    : 50;

  let query = supabase
    .from("organizations")
    .select(
      `
      id,
      organization_name,
      organization_type,
      description,
      short_description,
      public_slug,
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
      updated_at,
      organization_categories (
        is_primary,
        business_categories (
          id,
          slug,
          name,
          description
        )
      ),
      organization_locations (
        id,
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
        geo_areas (
          id,
          area_type,
          name,
          slug,
          country_code
        )
      ),
      organization_search_stats (
        profile_views_count,
        offer_clicks_count,
        certificate_clicks_count,
        purchase_registration_clicks_count
      )
    `
    )
    .eq("status", "active")
    .eq("directory_status", "published")
    .eq("is_public_profile_enabled", true)
    .eq("is_listed_in_directory", true)
    .order("directory_published_at", { ascending: false })
    .limit(limit);

  if (q) {
    query = query.or(
      `organization_name.ilike.%${q}%,short_description.ilike.%${q}%,description.ilike.%${q}%`
    );
  }

  if (countryCode) {
    query = query.eq("country_code", countryCode.toUpperCase());
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
      },
      { status: 500 }
    );
  }

  const rows = (data as unknown as DirectoryOrganizationRow[] | null) ?? [];

  const locationAndCategoryFilteredRows = rows.filter((row) => {
    return (
      rowMatchesCategoryFilter(row, categorySlug) &&
      rowMatchesLocationFilters(row, city, district)
    );
  });

  const actionStatsByOrganizationId = await getActionStatsByOrganizationId(
    locationAndCategoryFilteredRows.map((row) => row.id)
  );

  const filteredRows = locationAndCategoryFilteredRows.filter((row) => {
    const actionStats =
      actionStatsByOrganizationId.get(row.id) ?? getEmptyActionStats();

    return rowMatchesActionFilter(row, action, actionStats);
  });

  return NextResponse.json({
    ok: true,
    organizations: filteredRows.map((row) =>
      mapDirectoryOrganization(
        row,
        actionStatsByOrganizationId.get(row.id) ?? getEmptyActionStats()
      )
    ),
    count: filteredRows.length,
    filters: {
      q,
      category: categorySlug,
      city,
      district,
      countryCode,
      action,
      limit,
    },
  });
}