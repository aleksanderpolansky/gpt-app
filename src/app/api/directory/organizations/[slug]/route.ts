import { NextRequest, NextResponse } from "next/server";
import { createLocalizationRuntimeContext } from "../../../../../types/localization";
import { resolveLocalizedContentFieldsStrict } from "@/lib/localization/contentLocalization";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";

const BUSINESS_DIRECTORY_CONTEXT_CODE = "business_directory";
const ORGANIZATION_ENTITY_TYPE = "organization";
const PUBLIC_OBJECT_ACTION_STATUSES = ["approved", "published"];

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

type RouteProps = {
  params: Promise<{
    slug: string;
  }>;
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

function getObjectActionRolePriority(role: string | null) {
  if (role === "primary") {
    return 0;
  }

  if (role === "secondary") {
    return 1;
  }

  return 2;
}

function compareObjectActionClassifications(
  left: DirectoryObjectActionClassification,
  right: DirectoryObjectActionClassification
) {
  const leftRolePriority = getObjectActionRolePriority(left.role);
  const rightRolePriority = getObjectActionRolePriority(right.role);

  if (leftRolePriority !== rightRolePriority) {
    return leftRolePriority - rightRolePriority;
  }

  const leftSortOrder = left.category.sort_order ?? 999;
  const rightSortOrder = right.category.sort_order ?? 999;

  if (leftSortOrder !== rightSortOrder) {
    return leftSortOrder - rightSortOrder;
  }

  return left.category.default_name.localeCompare(right.category.default_name, "en", {
    sensitivity: "base",
  });
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

async function getBusinessDirectoryContextId() {
  const { data, error } = await supabase
    .from("contexts")
    .select("id")
    .eq("code", BUSINESS_DIRECTORY_CONTEXT_CODE)
    .single();

  if (error || !data) {
    return null;
  }

  return (data as ContextRow).id;
}

async function getDirectoryClassificationsByOrganizationId(
  organizationId: string
): Promise<DirectoryObjectActionClassification[]> {
  const businessDirectoryContextId = await getBusinessDirectoryContextId();

  if (!businessDirectoryContextId) {
    return [];
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
      .eq("entity_id", organizationId)
      .in("status", PUBLIC_OBJECT_ACTION_STATUSES)
      .not("contextual_category_id", "is", null)
      .order("created_at", { ascending: true });

  if (classificationError) {
    return [];
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
    return [];
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
    return [];
  }

  const categoryRows =
    (categoryData as unknown as DirectoryContextualCategoryRow[] | null) ?? [];

  const categoryById = new Map<string, DirectoryContextualCategoryRow>();

  for (const category of categoryRows) {
    categoryById.set(category.id, category);
  }

  const classifications: DirectoryObjectActionClassification[] = [];

  for (const classification of classificationRows) {
    if (!classification.contextual_category_id) {
      continue;
    }

    const category = categoryById.get(classification.contextual_category_id);

    if (!category) {
      continue;
    }

    classifications.push({
      id: classification.id,
      entityId: classification.entity_id,
      role: classification.role,
      status: classification.status,
      createdAt: classification.created_at,
      category,
    });
  }

  return classifications.sort(compareObjectActionClassifications);
}

function mapDirectoryOrganization(
  row: DirectoryOrganizationRow,
  classifications: DirectoryObjectActionClassification[],
  locale: string,
) {
  const primaryCategory = getPrimaryCategory(row, classifications);
  const localized = resolveLocalizedContentFieldsStrict({
    metadata: row.metadata_json,
    locale,
    fieldCodes: ["organizationName", "description", "shortDescription"],
  });

  const primaryLocation =
    row.organization_locations?.find(
      (item) => item.is_primary && item.is_active
    ) ??
    row.organization_locations?.find((item) => item.is_active) ??
    row.organization_locations?.[0] ??
    null;

  const stats = row.organization_search_stats?.[0] ?? null;

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
    stats: {
      profileViewsCount: stats?.profile_views_count ?? 0,
      offerClicksCount: stats?.offer_clicks_count ?? 0,
      certificateClicksCount: stats?.certificate_clicks_count ?? 0,
      purchaseRegistrationClicksCount:
        stats?.purchase_registration_clicks_count ?? 0,
    },
  };
}

export async function GET(request: NextRequest, { params }: RouteProps) {
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

  const resolvedParams = await params;
  const slug = resolvedParams.slug?.trim();

  if (!slug) {
    return NextResponse.json(
      {
        ok: false,
        error: "Directory organization slug is required",
      },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
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
    .eq("public_slug", slug)
    .eq("status", "active")
    .eq("directory_status", "published")
    .eq("is_public_profile_enabled", true)
    .eq("is_listed_in_directory", true)
    .single();

  if (error || !data) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? "Directory organization not found",
      },
      { status: 404 }
    );
  }

  const organizationRow = data as unknown as DirectoryOrganizationRow;
  const classifications = await getDirectoryClassificationsByOrganizationId(
    organizationRow.id
  );

  return NextResponse.json({
    ok: true,
    locale: contentLocale,
    organization: mapDirectoryOrganization(organizationRow, classifications, contentLocale),
  });
}
