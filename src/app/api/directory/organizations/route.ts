import { NextRequest, NextResponse } from "next/server";
import { createLocalizationRuntimeContext } from "../../../../types/localization";
import { resolveLocalizedContentFieldsStrict } from "@/lib/localization/contentLocalization";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type DirectoryActionFilter =
  | "all"
  | "hasOffers"
  | "hasCertificates"
  | "canRegisterPurchase";

type DirectorySortMode = "newest" | "distance";

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
  metadata_json: unknown;
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

type RowWithDistance = {
  row: DirectoryOrganizationRow;
  distanceKm: number | null;
};

type ContextRow = {
  id: string;
};

type EntityClassificationRow = {
  id: string;
  entity_id: string;
  role: string | null;
  status: string;
  contextual_category_id: string | null;
  created_at: string;
};

type DirectoryContextualCategoryRow = {
  id: string;
  code: string;
  default_name: string;
  slug: string;
  status: string;
  is_active: boolean;
  sort_order: number | null;
};

type DirectoryObjectActionClassification = {
  id: string;
  entityId: string;
  role: string | null;
  status: string;
  createdAt: string;
  category: DirectoryContextualCategoryRow;
};

const BUSINESS_DIRECTORY_CONTEXT_CODE = "business_directory";
const ORGANIZATION_ENTITY_TYPE = "organization";

const PUBLIC_OBJECT_ACTION_STATUSES = ["approved", "published"];

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

const DIRECTORY_CATEGORY_SLUG_ALIASES: Record<string, string[]> = {
  auto: [
    "auto",
    "car",
    "cars",
    "car-repair",
    "auto-repair",
    "auto-service",
    "autoservice",
    "avtoservis",
    "warsztat-samochodowy",
  ],
  beauty: ["beauty", "beauty-salon", "beauty-services"],
  "health-and-wellness": [
    "health-and-wellness",
    "health",
    "wellness",
    "massage",
    "massage-service",
    "massage-services",
    "massazhnye-uslugi",
    "masaz",
    "masaz-uslugi",
  ],
  "food-and-drinks": [
    "food-and-drinks",
    "food",
    "drinks",
    "restaurant",
    "cafe",
    "bar",
  ],
  "sport-and-fitness": [
    "sport-and-fitness",
    "sport",
    "fitness",
    "gym",
    "training",
  ],
  education: ["education", "learning", "school", "course", "courses"],
  retail: ["retail", "shop", "store"],
  "home-services": ["home-services", "home-service", "house-services"],
  "professional-services": [
    "professional-services",
    "professional-service",
    "consulting",
  ],
  "b2b-services": ["b2b-services", "b2b-service", "business-services"],
  "events-and-entertainment": [
    "events-and-entertainment",
    "events",
    "entertainment",
  ],
  other: ["other"],
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

function normalizeSortMode(value: string | null): DirectorySortMode {
  const normalizedValue = normalizeSearchValue(value);

  if (normalizedValue === "distance") {
    return "distance";
  }

  return "newest";
}

function parseCoordinate(
  value: string | null,
  minimum: number,
  maximum: number
) {
  if (!value) {
    return null;
  }

  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  if (parsedValue < minimum || parsedValue > maximum) {
    return null;
  }

  return parsedValue;
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

function normalizeCategoryComparableValue(value: string | null | undefined) {
  const normalizedValue = value?.trim().toLowerCase();

  if (!normalizedValue) {
    return null;
  }

  return normalizedValue.replaceAll("_", "-");
}

function getDirectoryCategoryFilterCandidates(categorySlug: string | null) {
  const normalizedSlug = normalizeCategoryComparableValue(categorySlug);

  if (!normalizedSlug) {
    return new Set<string>();
  }

  const aliasValues = DIRECTORY_CATEGORY_SLUG_ALIASES[normalizedSlug] ?? [];

  return new Set(
    [normalizedSlug, ...aliasValues]
      .map((value) => normalizeCategoryComparableValue(value))
      .filter((value): value is string => Boolean(value))
  );
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

async function getBusinessDirectoryContextId() {
  const { data, error } = await supabase
    .from("contexts")
    .select("id")
    .eq("code", BUSINESS_DIRECTORY_CONTEXT_CODE)
    .limit(1);

  if (error) {
    return null;
  }

  const contextRows = (data as unknown as ContextRow[] | null) ?? [];

  return contextRows[0]?.id ?? null;
}

async function getDirectoryClassificationsByOrganizationId(
  organizationIds: string[]
): Promise<Map<string, DirectoryObjectActionClassification[]>> {
  const classificationsByOrganizationId = new Map<
    string,
    DirectoryObjectActionClassification[]
  >();

  for (const organizationId of organizationIds) {
    classificationsByOrganizationId.set(organizationId, []);
  }

  if (organizationIds.length === 0) {
    return classificationsByOrganizationId;
  }

  const businessDirectoryContextId = await getBusinessDirectoryContextId();

  if (!businessDirectoryContextId) {
    return classificationsByOrganizationId;
  }

  const { data: classificationData, error: classificationError } =
    await supabase
      .from("entity_classifications")
      .select(
        `
        id,
        entity_id,
        role:classification_role,
        status,
        contextual_category_id,
        created_at
      `
      )
      .eq("entity_type", ORGANIZATION_ENTITY_TYPE)
      .eq("context_id", businessDirectoryContextId)
      .in("entity_id", organizationIds)
      .in("status", PUBLIC_OBJECT_ACTION_STATUSES)
      .not("contextual_category_id", "is", null)
      .order("created_at", { ascending: true });

  if (classificationError) {
    return classificationsByOrganizationId;
  }

  const classificationRows =
    (classificationData as unknown as EntityClassificationRow[] | null) ?? [];

  const contextualCategoryIds = Array.from(
    new Set(
      classificationRows
        .map((row) => row.contextual_category_id)
        .filter((value): value is string => Boolean(value))
    )
  );

  if (contextualCategoryIds.length === 0) {
    return classificationsByOrganizationId;
  }

  const { data: categoryData, error: categoryError } = await supabase
    .from("contextual_categories")
    .select(
      `
      id,
      code:slug,
      default_name:name,
      default_description:description,
      slug,
      status,
      is_active,
      sort_order
    `
    )
    .in("id", contextualCategoryIds)
    .eq("context_id", businessDirectoryContextId)
    .in("status", PUBLIC_OBJECT_ACTION_STATUSES)
    .eq("is_active", true);

  if (categoryError) {
    return classificationsByOrganizationId;
  }

  const categoryRows =
    (categoryData as unknown as DirectoryContextualCategoryRow[] | null) ?? [];

  const categoryById = new Map<string, DirectoryContextualCategoryRow>();

  for (const category of categoryRows) {
    categoryById.set(category.id, category);
  }

  for (const classification of classificationRows) {
    if (!classification.contextual_category_id) {
      continue;
    }

    const category = categoryById.get(classification.contextual_category_id);

    if (!category) {
      continue;
    }

    const currentClassifications =
      classificationsByOrganizationId.get(classification.entity_id) ?? [];

    currentClassifications.push({
      id: classification.id,
      entityId: classification.entity_id,
      role: classification.role,
      status: classification.status,
      createdAt: classification.created_at,
      category,
    });

    classificationsByOrganizationId.set(
      classification.entity_id,
      currentClassifications
    );
  }

  for (const [
    organizationId,
    classifications,
  ] of classificationsByOrganizationId.entries()) {
    classificationsByOrganizationId.set(
      organizationId,
      [...classifications].sort(compareObjectActionClassifications)
    );
  }

  return classificationsByOrganizationId;
}

function compareObjectActionClassifications(
  firstItem: DirectoryObjectActionClassification,
  secondItem: DirectoryObjectActionClassification
) {
  const firstRolePriority = firstItem.role === "primary" ? 0 : 1;
  const secondRolePriority = secondItem.role === "primary" ? 0 : 1;

  if (firstRolePriority !== secondRolePriority) {
    return firstRolePriority - secondRolePriority;
  }

  const firstSortOrder = firstItem.category.sort_order ?? 0;
  const secondSortOrder = secondItem.category.sort_order ?? 0;

  if (firstSortOrder !== secondSortOrder) {
    return firstSortOrder - secondSortOrder;
  }

  return getTimestamp(firstItem.createdAt) - getTimestamp(secondItem.createdAt);
}

function getPrimaryLocation(row: DirectoryOrganizationRow) {
  return (
    row.organization_locations?.find(
      (item) => item.is_primary && item.is_active
    ) ??
    row.organization_locations?.find((item) => item.is_active) ??
    row.organization_locations?.[0] ??
    null
  );
}

function getLegacyPrimaryCategory(row: DirectoryOrganizationRow) {
  const primaryCategoryRelation =
    row.organization_categories?.find((item) => item.is_primary) ??
    row.organization_categories?.[0] ??
    null;

  return getFirstRelatedItem(primaryCategoryRelation?.business_categories);
}

function mapObjectActionCategoryToDirectoryCategory(
  classification: DirectoryObjectActionClassification
) {
  return {
    id: classification.category.id,
    slug: classification.category.slug,
    name: classification.category.default_name,
    description: null,
    code: classification.category.code,
    source: "object_action",
    classificationId: classification.id,
    classificationRole: classification.role,
  };
}

function getPrimaryCategory(
  row: DirectoryOrganizationRow,
  classifications: DirectoryObjectActionClassification[]
) {
  const primaryObjectActionClassification =
    classifications.find((item) => item.role === "primary") ??
    classifications[0] ??
    null;

  if (primaryObjectActionClassification) {
    return mapObjectActionCategoryToDirectoryCategory(
      primaryObjectActionClassification
    );
  }

  return getLegacyPrimaryCategory(row);
}

function mapDirectoryOrganization(
  row: DirectoryOrganizationRow,
  actionStats: OrganizationActionStats,
  distanceKm: number | null,
  classifications: DirectoryObjectActionClassification[],
  locale: string,
) {
  const primaryCategory = getPrimaryCategory(row, classifications);
  const primaryLocation = getPrimaryLocation(row);
  const localized = resolveLocalizedContentFieldsStrict({
    metadata: row.metadata_json,
    locale,
    fieldCodes: ["organizationName", "description", "shortDescription"],
  });

  const stats = row.organization_search_stats?.[0] ?? null;
  const canRegisterPurchase = canRegisterPurchaseForOrganization(row);

  return {
    id: row.id,
    name: localized.organizationName ?? "—",
    type: row.organization_type,
    description: localized.description,
    shortDescription: localized.shortDescription,
    contentLocalizationStatus: localized.organizationName ? "ready" : "missing",
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
    distanceKm,
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

function objectActionCategoryMatchesFilter(
  classification: DirectoryObjectActionClassification,
  categoryCandidates: Set<string>
) {
  const comparableValues = [
    classification.category.slug,
    classification.category.code,
    classification.category.default_name,
  ]
    .map((value) => normalizeCategoryComparableValue(value))
    .filter((value): value is string => Boolean(value));

  return comparableValues.some((value) => categoryCandidates.has(value));
}

function legacyCategoryMatchesFilter(
  row: DirectoryOrganizationRow,
  categoryCandidates: Set<string>
) {
  const hasMatchingCategory =
    row.organization_categories?.some((categoryRelation) => {
      const category = getFirstRelatedItem(
        categoryRelation.business_categories
      );

      const comparableValues = [category?.slug, category?.name]
        .map((value) => normalizeCategoryComparableValue(value))
        .filter((value): value is string => Boolean(value));

      return comparableValues.some((value) => categoryCandidates.has(value));
    }) ?? false;

  return hasMatchingCategory;
}

function rowMatchesCategoryFilter(
  row: DirectoryOrganizationRow,
  categorySlug: string | null,
  classifications: DirectoryObjectActionClassification[]
) {
  if (!categorySlug) {
    return true;
  }

  const categoryCandidates = getDirectoryCategoryFilterCandidates(categorySlug);

  if (categoryCandidates.size === 0) {
    return true;
  }

  const hasMatchingObjectActionCategory = classifications.some(
    (classification) =>
      objectActionCategoryMatchesFilter(classification, categoryCandidates)
  );

  if (hasMatchingObjectActionCategory) {
    return true;
  }

  return legacyCategoryMatchesFilter(row, categoryCandidates);
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

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function calculateDistanceKm(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
) {
  const earthRadiusKm = 6371;

  const latitudeDelta = toRadians(toLat - fromLat);
  const longitudeDelta = toRadians(toLng - fromLng);

  const fromLatRad = toRadians(fromLat);
  const toLatRad = toRadians(toLat);

  const a =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(fromLatRad) *
      Math.cos(toLatRad) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

function roundDistanceKm(distanceKm: number | null) {
  if (distanceKm === null) {
    return null;
  }

  return Math.round(distanceKm * 100) / 100;
}

function getNearestDistanceKm(
  row: DirectoryOrganizationRow,
  userLat: number,
  userLng: number
) {
  const activePublicLocations =
    row.organization_locations?.filter((location) => {
      if (!location.is_active) {
        return false;
      }

      if (location.address_visibility === "hidden") {
        return false;
      }

      if (typeof location.latitude !== "number") {
        return false;
      }

      if (typeof location.longitude !== "number") {
        return false;
      }

      return true;
    }) ?? [];

  if (activePublicLocations.length === 0) {
    return null;
  }

  const distances = activePublicLocations.map((location) =>
    calculateDistanceKm(
      userLat,
      userLng,
      location.latitude as number,
      location.longitude as number
    )
  );

  return Math.min(...distances);
}

function getTimestamp(value: string | null | undefined) {
  if (!value) {
    return 0;
  }

  const parsedTime = Date.parse(value);

  if (Number.isNaN(parsedTime)) {
    return 0;
  }

  return parsedTime;
}

function compareByNewest(
  firstRow: DirectoryOrganizationRow,
  secondRow: DirectoryOrganizationRow
) {
  const firstTime = getTimestamp(
    firstRow.directory_published_at ?? firstRow.created_at
  );
  const secondTime = getTimestamp(
    secondRow.directory_published_at ?? secondRow.created_at
  );

  return secondTime - firstTime;
}

function compareByDistance(firstItem: RowWithDistance, secondItem: RowWithDistance) {
  const firstDistance = firstItem.distanceKm;
  const secondDistance = secondItem.distanceKm;

  if (firstDistance === null && secondDistance === null) {
    return compareByNewest(firstItem.row, secondItem.row);
  }

  if (firstDistance === null) {
    return 1;
  }

  if (secondDistance === null) {
    return -1;
  }

  if (firstDistance !== secondDistance) {
    return firstDistance - secondDistance;
  }

  return compareByNewest(firstItem.row, secondItem.row);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const requestedLocale =
    searchParams.get("locale") ?? searchParams.get("lang") ?? undefined;
  const localizationRuntimeContext = createLocalizationRuntimeContext({
    locale: {
      contentLocale: requestedLocale,
      interfaceLocale: requestedLocale,
      source: requestedLocale ? "query" : "default",
    },
  });
  const contentLocale = localizationRuntimeContext.locale.contentLocale;

  const q = normalizeSearchValue(searchParams.get("q"));
  const categorySlug = normalizeSearchValue(searchParams.get("category"));
  const city = normalizeSearchValue(searchParams.get("city"));
  const district = normalizeSearchValue(searchParams.get("district"));
  const countryCode = normalizeSearchValue(searchParams.get("countryCode"));
  const action = normalizeActionFilter(searchParams.get("action"));
  const sort = normalizeSortMode(searchParams.get("sort"));
  const userLat = parseCoordinate(searchParams.get("userLat"), -90, 90);
  const userLng = parseCoordinate(searchParams.get("userLng"), -180, 180);
  const limitParam = Number(searchParams.get("limit") ?? "50");

  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(Math.trunc(limitParam), 1), 100)
    : 50;

  const canSortByDistance =
    sort === "distance" && userLat !== null && userLng !== null;

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
      metadata_json,
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
    .limit(500);

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

  const classificationsByOrganizationId =
    await getDirectoryClassificationsByOrganizationId(rows.map((row) => row.id));

  const contentFilteredRows = q
    ? rows.filter((row) => {
        const localized = resolveLocalizedContentFieldsStrict({
          metadata: row.metadata_json,
          locale: contentLocale,
          fieldCodes: ["organizationName", "description", "shortDescription"],
        });
        const haystack = [
          localized.organizationName,
          localized.description,
          localized.shortDescription,
        ]
          .filter((value): value is string => Boolean(value))
          .join(" ")
          .toLocaleLowerCase();
        return haystack.includes(q.toLocaleLowerCase());
      })
    : rows;

  const locationAndCategoryFilteredRows = contentFilteredRows.filter((row) => {
    const classifications = classificationsByOrganizationId.get(row.id) ?? [];

    return (
      rowMatchesCategoryFilter(row, categorySlug, classifications) &&
      rowMatchesLocationFilters(row, city, district)
    );
  });

  const actionStatsByOrganizationId = await getActionStatsByOrganizationId(
    locationAndCategoryFilteredRows.map((row) => row.id)
  );

  const actionFilteredRows = locationAndCategoryFilteredRows.filter((row) => {
    const actionStats =
      actionStatsByOrganizationId.get(row.id) ?? getEmptyActionStats();

    return rowMatchesActionFilter(row, action, actionStats);
  });

  const rowsWithDistance: RowWithDistance[] = actionFilteredRows.map((row) => {
    const distanceKm =
      canSortByDistance && userLat !== null && userLng !== null
        ? roundDistanceKm(getNearestDistanceKm(row, userLat, userLng))
        : null;

    return {
      row,
      distanceKm,
    };
  });

  const sortedRowsWithDistance = [...rowsWithDistance].sort(
    canSortByDistance
      ? compareByDistance
      : (firstItem, secondItem) => compareByNewest(firstItem.row, secondItem.row)
  );

  const limitedRowsWithDistance = sortedRowsWithDistance.slice(0, limit);

  return NextResponse.json({
    ok: true,
    organizations: limitedRowsWithDistance.map((item) =>
      mapDirectoryOrganization(
        item.row,
        actionStatsByOrganizationId.get(item.row.id) ?? getEmptyActionStats(),
        item.distanceKm,
        classificationsByOrganizationId.get(item.row.id) ?? [],
        contentLocale,
      )
    ),
    count: limitedRowsWithDistance.length,
    totalCount: sortedRowsWithDistance.length,
    filters: {
      q,
      category: categorySlug,
      city,
      district,
      countryCode,
      action,
      sort,
      userLat,
      userLng,
      distanceSortingAvailable: canSortByDistance,
      limit,
      locale: contentLocale,
    },
  });
}
