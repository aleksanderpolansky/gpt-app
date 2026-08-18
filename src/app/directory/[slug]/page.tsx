import Link from "next/link";
import { type ElementType, type ReactNode } from "react";
import { notFound } from "next/navigation";
import {
  Activity,
  Globe,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Star,
  TrendingUp,
} from "lucide-react";
import { resolveActiveActorContext } from "../../../../lib/actor-context";
import { supabase } from "../../../../lib/supabase";
import { auth0 } from "../../../../lib/auth0";
import {
  getDirectoryDetailMessages,
  type DirectoryDetailMessages,
} from "../../../i18n/messages/directory-detail";
import {
  getOfferTypeLabel,
  getOrganizationTypeLabel,
  getSystemLabelsMessages,
  getVerificationStatusLabel,
} from "../../../i18n/messages/system-labels";
import PurchaseConfirmationRequestCard from "@/components/commercial/PurchaseConfirmationRequestCard";
import OrganizationLocationMapPreview from "@/components/commercial/OrganizationLocationMapPreview";
import { resolveLocalizedContentFieldsStrict } from "@/lib/localization/contentLocalization";
import { getPrimaryPublicOrganizationContactChannel } from "@/lib/commercial/organizationContactChannels";
import { readOrganizationFeaturedContent } from "@/lib/commercial/organizationFeaturedContent";



export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
// CONTENT_L10_DIRECTORY_DETAIL_MEDIA_HOTFIX_V2: strict locale resolution and non-blocking binary media.

type DirectoryCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  code?: string;
  source?: "object_action";
  classificationId?: string;
  classificationRole?: string | null;
};

type DirectoryLocation = {
  id: string;
  locationType: string;
  addressVisibility: string;
  label: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  district: string | null;
  streetAddress: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  geoArea:
    | {
        id: string;
        area_type: string;
        name: string;
        slug: string;
        country_code: string | null;
      }
    | null;
};

type DirectoryOrganization = {
  id: string;
  ownerActorId: string | null;
  name: string;
  type: string;
  description: string | null;
  shortDescription: string | null;
  publicSlug: string | null;
  countryCode: string | null;
  defaultCurrency: string | null;
  directoryStatus: string;
  verificationStatus: string;
  publicEmail: string | null;
  publicPhone: string | null;
  websiteUrl: string | null;
  bookingUrl: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  socialLinks: Record<string, unknown>;
  featuredImageUrl: string | null;
  featuredLinkUrl: string | null;
  featuredShortDescription: string | null;
  directoryPublishedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  primaryCategory: DirectoryCategory | null;
  primaryLocation: DirectoryLocation | null;
  stats: {
    profileViewsCount: number;
    offerClicksCount: number;
    certificateClicksCount: number;
    purchaseRegistrationClicksCount: number;
  };
};

type PublicDirectoryOffer = {
  id: string;
  organizationId: string | null;
  offerType: string;
  title: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  isPaid: boolean;
  isFree: boolean;
  certificateAvailable: boolean;
  requiresBooking: boolean;
  bookingMode: string;
  defaultDurationMinutes: number | null;
  minDurationMinutes: number | null;
  maxDurationMinutes: number | null;
  quantityLimit: number | null;
  validFrom: string | null;
  validUntil: string | null;
  status: string;
  regularPrice: number | null;
  isDiscountActive: boolean;
  discountType: string | null;
  discountValue: number | null;
  discountStartsAt: string | null;
  discountEndsAt: string | null;
  lowestPrice30Days: number | null;
  lowestPrice30DaysCurrency: string | null;
  discountLegalNote: string | null;
  certificate: {
    available: boolean;
    paymentMode: string;
    pointsPrice: number;
    moneyPrice: number | null;
    currency: string | null;
    terms: string | null;
    validityDays: number | null;
    requiresSellerConfirmation: boolean;
    isTransferable: boolean;
    isCancellable: boolean;
    pointsRefundPolicy: string;
    maxCertificatesTotal: number | null;
  };
  createdAt: string;
  updatedAt: string | null;
};

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
  owner_actor_id: string | null;
  organization_name: string;
  organization_type: string;
  description: string | null;
  short_description: string | null;
  public_slug: string | null;
  country_code: string | null;
  default_currency: string | null;
  directory_status: string;
  verification_status: string;
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

type PublicOfferRow = {
  id: string;
  organization_id: string | null;
  offer_type: string;
  title: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  is_paid: boolean;
  is_free: boolean;
  certificate_available: boolean;
  requires_booking: boolean;
  booking_mode: string;
  default_duration_minutes: number | null;
  min_duration_minutes: number | null;
  max_duration_minutes: number | null;
  quantity_limit: number | null;
  valid_from: string | null;
  valid_until: string | null;
  status: string;
  regular_price: number | null;
  is_discount_active: boolean;
  discount_type: string | null;
  discount_value: number | null;
  discount_starts_at: string | null;
  discount_ends_at: string | null;
  lowest_price_30_days: number | null;
  lowest_price_30_days_currency: string | null;
  discount_legal_note: string | null;
  certificate_payment_mode: string;
  certificate_points_price: number;
  certificate_money_price: number | null;
  certificate_currency: string | null;
  certificate_terms: string | null;
  certificate_validity_days: number | null;
  requires_seller_confirmation: boolean;
  is_transferable: boolean;
  is_cancellable: boolean;
  points_refund_policy: string;
  max_certificates_total: number | null;
  metadata_json: unknown;
  created_at: string;
  updated_at: string | null;
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

type DirectoryOrganizationPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{
    locale?: string | string[];
    lang?: string | string[];
    scope?: string | string[];
  }>;
};

function normalizeLocaleParam(value: string | string[] | undefined) {
  if (!value) {
    return "";
  }

  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value;
}

function appendLocaleToHref(href: string, locale: string) {
  if (!locale) {
    return href;
  }

  const [withoutHash, hash = ""] = href.split("#");
  const [pathname, queryString = ""] = withoutHash.split("?");
  const searchParams = new URLSearchParams(queryString);
  searchParams.set("locale", locale);

  const nextQueryString = searchParams.toString();
  const nextHash = hash ? `#${hash}` : "";

  return `${pathname}?${nextQueryString}${nextHash}`;
}

async function getCurrentDirectoryActorContext() {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return null;
  }

  try {
    return await resolveActiveActorContext(session.user.sub);
  } catch {
    return null;
  }
}

const BUSINESS_DIRECTORY_CONTEXT_CODE = "business_directory";
const ORGANIZATION_ENTITY_TYPE = "organization";

const PUBLIC_OBJECT_ACTION_STATUSES = ["approved", "published"];

function getFirstRelatedItem<T>(value: T | T[] | null | undefined) {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function getPublicLocation(
  location: RelatedLocation | null
): DirectoryLocation | null {
  if (!location) {
    return null;
  }

  const geoArea = getFirstRelatedItem(location.geo_areas);

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
      geoArea,
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
      latitude: null,
      longitude: null,
      geoArea,
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
    geoArea,
  };
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
        role,
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
      code,
      default_name,
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

  return [...classifications].sort(compareObjectActionClassifications);
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
): DirectoryCategory {
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
): DirectoryCategory | null {
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
  classifications: DirectoryObjectActionClassification[],
  locale: string,
): DirectoryOrganization {
  const primaryCategory = getPrimaryCategory(row, classifications);
  const localized = resolveLocalizedContentFieldsStrict({
    metadata: row.metadata_json,
    locale,
    fieldCodes: [
      "organizationName",
      "description",
      "shortDescription",
      "featuredShortDescription",
    ],
  });

  const featuredContent = readOrganizationFeaturedContent(
    row.social_links_json,
  );

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
    ownerActorId: row.owner_actor_id,
    name: localized.organizationName ?? "—",
    type: row.organization_type,
    description: localized.description,
    shortDescription: localized.shortDescription,
    publicSlug: row.public_slug,
    countryCode: row.country_code,
    defaultCurrency: row.default_currency,
    directoryStatus: row.directory_status,
    verificationStatus: row.verification_status,
    publicEmail: row.public_email,
    publicPhone: row.public_phone,
    websiteUrl: row.website_url,
    bookingUrl: row.booking_url,
    logoUrl: row.public_slug
      ? `/api/directory/organizations/${encodeURIComponent(row.public_slug)}/logo?v=${encodeURIComponent(row.updated_at ?? row.created_at)}`
      : null,
    coverImageUrl: null,
    socialLinks: row.social_links_json ?? {},
    featuredImageUrl: featuredContent.imageUrl,
    featuredLinkUrl: featuredContent.linkUrl,
    featuredShortDescription: localized.featuredShortDescription,
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

function mapPublicOffer(row: PublicOfferRow, locale: string): PublicDirectoryOffer {
  const localized = resolveLocalizedContentFieldsStrict({
    metadata: row.metadata_json,
    locale,
    fieldCodes: ["title", "description", "discountLegalNote", "certificateTerms"],
  });

  return {
    id: row.id,
    organizationId: row.organization_id,
    offerType: row.offer_type,
    title: localized.title ?? "—",
    description: localized.description,
    price: row.price,
    currency: row.currency,
    isPaid: row.is_paid,
    isFree: row.is_free,
    certificateAvailable: row.certificate_available,
    requiresBooking: row.requires_booking,
    bookingMode: row.booking_mode,
    defaultDurationMinutes: row.default_duration_minutes,
    minDurationMinutes: row.min_duration_minutes,
    maxDurationMinutes: row.max_duration_minutes,
    quantityLimit: row.quantity_limit,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    status: row.status,
    regularPrice: row.regular_price,
    isDiscountActive: row.is_discount_active,
    discountType: row.discount_type,
    discountValue: row.discount_value,
    discountStartsAt: row.discount_starts_at,
    discountEndsAt: row.discount_ends_at,
    lowestPrice30Days: row.lowest_price_30_days,
    lowestPrice30DaysCurrency: row.lowest_price_30_days_currency,
    discountLegalNote: localized.discountLegalNote,
    certificate: {
      available: row.certificate_available,
      paymentMode: row.certificate_payment_mode,
      pointsPrice: row.certificate_points_price,
      moneyPrice: row.certificate_money_price,
      currency: row.certificate_currency,
      terms: localized.certificateTerms,
      validityDays: row.certificate_validity_days,
      requiresSellerConfirmation: row.requires_seller_confirmation,
      isTransferable: row.is_transferable,
      isCancellable: row.is_cancellable,
      pointsRefundPolicy: row.points_refund_policy,
      maxCertificatesTotal: row.max_certificates_total,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getDirectoryOrganization(slug: string, locale: string): Promise<{
  organization: DirectoryOrganization | null;
  errorMessage: string | null;
}> {
  const { data, error } = await supabase
    .from("organizations")
    .select(
      `
      id,
      owner_actor_id,
      organization_name,
      organization_type,
      description,
      short_description,
      public_slug,
      country_code,
      default_currency,
      directory_status,
      verification_status,
      public_email,
      public_phone,
      website_url,
      booking_url,
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
    if (error?.code === "PGRST116") {
      return {
        organization: null,
        errorMessage: null,
      };
    }

    return {
      organization: null,
      errorMessage: error?.message ?? "Cannot load directory organization",
    };
  }

  const organizationRow = data as unknown as DirectoryOrganizationRow;

  const classifications = await getDirectoryClassificationsByOrganizationId(
    organizationRow.id
  );

  return {
    organization: mapDirectoryOrganization(organizationRow, classifications, locale),
    errorMessage: null,
  };
}

async function getDirectoryOrganizationOffers(
  organizationId: string,
  locale: string,
): Promise<{
  offers: PublicDirectoryOffer[];
  errorMessage: string | null;
}> {
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("offers")
    .select(
      `
      id,
      organization_id,
      offer_type,
      title,
      description,
      price,
      currency,
      is_paid,
      is_free,
      certificate_available,
      requires_booking,
      booking_mode,
      default_duration_minutes,
      min_duration_minutes,
      max_duration_minutes,
      quantity_limit,
      valid_from,
      valid_until,
      status,
      regular_price,
      is_discount_active,
      discount_type,
      discount_value,
      discount_starts_at,
      discount_ends_at,
      lowest_price_30_days,
      lowest_price_30_days_currency,
      discount_legal_note,
      certificate_payment_mode,
      certificate_points_price,
      certificate_money_price,
      certificate_currency,
      certificate_terms,
      certificate_validity_days,
      requires_seller_confirmation,
      is_transferable,
      is_cancellable,
      points_refund_policy,
      max_certificates_total,
      metadata_json,
      created_at,
      updated_at
    `
    )
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .or(`valid_from.is.null,valid_from.lte.${nowIso}`)
    .or(`valid_until.is.null,valid_until.gte.${nowIso}`)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return {
      offers: [],
      errorMessage: error.message,
    };
  }

  return {
    offers: ((data as unknown as PublicOfferRow[] | null) ?? []).map((row) =>
      mapPublicOffer(row, locale),
    ),
    errorMessage: null,
  };
}












type CertificateAvailabilityView = {
  maxTotal: number | null;
  issuedCount: number;
  remaining: number | null;
  isSoldOut: boolean;
  label: string;
};

type PublicDirectoryOfferWithCertificateAvailability = PublicDirectoryOffer & {
  certificateAvailability: CertificateAvailabilityView;
};

type CertificateAvailabilityCountRow = {
  offer_id: string | null;
  status: string | null;
};

const CERTIFICATE_AVAILABILITY_EXCLUDED_STATUSES = new Set([
  "cancelled",
  "canceled",
  "expired",
  "rejected",
  "refunded",
]);

function buildCertificateAvailability(
  offer: PublicDirectoryOffer,
  issuedCount: number,
  messages: Pick<DirectoryDetailMessages, "certificateAvailability">,
): CertificateAvailabilityView {
  if (!offer.certificateAvailable) {
    return {
      maxTotal: null,
      issuedCount: 0,
      remaining: null,
      isSoldOut: false,
      label: messages.certificateAvailability.unavailable,
    };
  }

  const maxTotal = offer.certificate.maxCertificatesTotal;

  if (typeof maxTotal !== "number" || maxTotal <= 0) {
    return {
      maxTotal: null,
      issuedCount,
      remaining: null,
      isSoldOut: false,
      label: messages.certificateAvailability.unlimited,
    };
  }

  const remaining = Math.max(maxTotal - issuedCount, 0);

  return {
    maxTotal,
    issuedCount,
    remaining,
    isSoldOut: remaining <= 0,
    label: messages.certificateAvailability.available(remaining, maxTotal),
  };
}

async function getOffersWithCertificateAvailability(
  offers: PublicDirectoryOffer[],
  messages: Pick<DirectoryDetailMessages, "certificateAvailability">,
): Promise<PublicDirectoryOfferWithCertificateAvailability[]> {
  const certificateOfferIds = offers
    .filter((offer) => offer.certificateAvailable)
    .map((offer) => offer.id);

  if (certificateOfferIds.length === 0) {
    return offers.map((offer) => ({
      ...offer,
      certificateAvailability: buildCertificateAvailability(offer, 0, messages),
    }));
  }

  const { data: certificateRows, error: certificateRowsError } = await supabase
    .from("certificates")
    .select("offer_id,status")
    .in("offer_id", certificateOfferIds);

  if (certificateRowsError) {
    return offers.map((offer) => ({
      ...offer,
      certificateAvailability: {
        ...buildCertificateAvailability(offer, 0, messages),
        label:
          typeof offer.certificate.maxCertificatesTotal === "number" &&
          offer.certificate.maxCertificatesTotal > 0
            ? messages.certificateAvailability.limitCheckFailed(
                offer.certificate.maxCertificatesTotal,
              )
            : messages.certificateAvailability.unlimited,
      },
    }));
  }

  const issuedCountByOfferId = new Map<string, number>();

  for (const row of (certificateRows ?? []) as CertificateAvailabilityCountRow[]) {
    if (!row.offer_id) {
      continue;
    }

    const normalizedStatus = (row.status ?? "").toLowerCase();

    if (CERTIFICATE_AVAILABILITY_EXCLUDED_STATUSES.has(normalizedStatus)) {
      continue;
    }

    issuedCountByOfferId.set(
      row.offer_id,
      (issuedCountByOfferId.get(row.offer_id) ?? 0) + 1,
    );
  }

  return offers.map((offer) => ({
    ...offer,
    certificateAvailability: buildCertificateAvailability(
      offer,
      issuedCountByOfferId.get(offer.id) ?? 0,
      messages,
    ),
  }));
}

type PublicDashboardIconComponent = ElementType;

type PublicDashboardCardProps = {
  readonly label: string;
  readonly accent: string;
  readonly icon: PublicDashboardIconComponent;
  readonly children: ReactNode;
};

type PublicDashboardAnalyticsCardProps = {
  readonly title: string;
  readonly detailsLabel: string;
  readonly children: ReactNode;
};

type PublicDashboardDirectionCardProps = {
  readonly label: string;
  readonly pct: number;
  readonly color: string;
  readonly sub: string;
  readonly trend: string;
};

type PublicDashboardActionButtonProps = {
  readonly href?: string | null;
  readonly icon: PublicDashboardIconComponent;
  readonly children: ReactNode;
  readonly disabled?: boolean;
};

type PublicOrganizationDashboardLabelKey =
  | "logo"
  | "address"
  | "contact"
  | "phone"
  | "website"
  | "messenger"
  | "description"
  | "offers"
  | "certificates"
  | "category"
  | "publicInfo"
  | "serviceArea"
  | "publicActions"
  | "notProvided"
  | "details"
  | "thisWeek"
  | "placed";

type PublicOrganizationDashboardLocaleKey =
  | "en"
  | "pl"
  | "uk"
  | "ru"
  | "de"
  | "es"
  | "cs";

const PUBLIC_ORGANIZATION_DASHBOARD_LABELS: Record<
  PublicOrganizationDashboardLocaleKey,
  Record<PublicOrganizationDashboardLabelKey, string>
> = {
  en: {
    logo: "Logo",
    address: "Address",
    contact: "Contact",
    phone: "Phone",
    website: "Website",
    messenger: "Message",
    description: "Description",
    offers: "Offers",
    certificates: "Gift certificates",
    category: "Category",
    publicInfo: "Public information",
    serviceArea: "Service area",
    publicActions: "Public actions",
    notProvided: "Not provided",
    details: "Details",
    thisWeek: "this week",
    placed: "Placed",
  },
  pl: {
    logo: "Logo",
    address: "Adres",
    contact: "Kontakt",
    phone: "Telefon",
    website: "Strona",
    messenger: "Napisz",
    description: "Opis",
    offers: "Oferty",
    certificates: "Bony podarunkowe",
    category: "Kategoria",
    publicInfo: "Informacje publiczne",
    serviceArea: "Obszar obs\u0142ugi",
    publicActions: "Dzia\u0142ania publiczne",
    notProvided: "Nie podano",
    details: "Szczeg\u00f3\u0142y",
    thisWeek: "w tym tygodniu",
    placed: "Zamieszczono",
  },
  uk: {
    logo: "\u041b\u043e\u0433\u043e\u0442\u0438\u043f",
    address: "\u0410\u0434\u0440\u0435\u0441\u0430",
    contact: "\u041a\u043e\u043d\u0442\u0430\u043a\u0442",
    phone: "\u0422\u0435\u043b\u0435\u0444\u043e\u043d",
    website: "\u0421\u0430\u0439\u0442",
    messenger: "\u041d\u0430\u043f\u0438\u0441\u0430\u0442\u0438",
    description: "\u041e\u043f\u0438\u0441",
    offers: "\u041f\u0440\u043e\u043f\u043e\u0437\u0438\u0446\u0456\u0457",
    certificates: "\u041f\u043e\u0434\u0430\u0440\u0443\u043d\u043a\u043e\u0432\u0456 \u0441\u0435\u0440\u0442\u0438\u0444\u0456\u043a\u0430\u0442\u0438",
    category: "\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0456\u044f",
    publicInfo: "\u041f\u0443\u0431\u043b\u0456\u0447\u043d\u0430 \u0456\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0456\u044f",
    serviceArea: "\u0417\u043e\u043d\u0430 \u043e\u0431\u0441\u043b\u0443\u0433\u043e\u0432\u0443\u0432\u0430\u043d\u043d\u044f",
    publicActions: "\u041f\u0443\u0431\u043b\u0456\u0447\u043d\u0456 \u0434\u0456\u0457",
    notProvided: "\u041d\u0435 \u0432\u043a\u0430\u0437\u0430\u043d\u043e",
    details: "\u0414\u043e\u043a\u043b\u0430\u0434\u043d\u0456\u0448\u0435",
    thisWeek: "\u0446\u044c\u043e\u0433\u043e \u0442\u0438\u0436\u043d\u044f",
    placed: "\u0420\u043e\u0437\u043c\u0456\u0449\u0435\u043d\u043e",
  },
  ru: {
    logo: "\u041b\u043e\u0433\u043e\u0442\u0438\u043f",
    address: "\u0410\u0434\u0440\u0435\u0441",
    contact: "\u041a\u043e\u043d\u0442\u0430\u043a\u0442",
    phone: "\u0422\u0435\u043b\u0435\u0444\u043e\u043d",
    website: "\u0421\u0430\u0439\u0442",
    messenger: "\u041d\u0430\u043f\u0438\u0441\u0430\u0442\u044c",
    description: "\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435",
    offers: "\u041f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u044f",
    certificates: "\u041f\u043e\u0434\u0430\u0440\u043e\u0447\u043d\u044b\u0435 \u0441\u0435\u0440\u0442\u0438\u0444\u0438\u043a\u0430\u0442\u044b",
    category: "\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044f",
    publicInfo: "\u041f\u0443\u0431\u043b\u0438\u0447\u043d\u0430\u044f \u0438\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0438\u044f",
    serviceArea: "\u0417\u043e\u043d\u0430 \u043e\u0431\u0441\u043b\u0443\u0436\u0438\u0432\u0430\u043d\u0438\u044f",
    publicActions: "\u041f\u0443\u0431\u043b\u0438\u0447\u043d\u044b\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f",
    notProvided: "\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u043e",
    details: "\u041f\u043e\u0434\u0440\u043e\u0431\u043d\u0435\u0435",
    thisWeek: "\u043d\u0430 \u044d\u0442\u043e\u0439 \u043d\u0435\u0434\u0435\u043b\u0435",
    placed: "\u0420\u0430\u0437\u043c\u0435\u0449\u0435\u043d\u043e",
  },
  de: {
    logo: "Logo",
    address: "Adresse",
    contact: "Kontakt",
    phone: "Telefon",
    website: "Website",
    messenger: "Nachricht",
    description: "Beschreibung",
    offers: "Angebote",
    certificates: "Geschenkgutscheine",
    category: "Kategorie",
    publicInfo: "\u00d6ffentliche Informationen",
    serviceArea: "Servicegebiet",
    publicActions: "\u00d6ffentliche Aktionen",
    notProvided: "Nicht angegeben",
    details: "Details",
    thisWeek: "diese Woche",
    placed: "Eingestellt",
  },
  es: {
    logo: "Logotipo",
    address: "Direcci\u00f3n",
    contact: "Contacto",
    phone: "Tel\u00e9fono",
    website: "Sitio web",
    messenger: "Escribir",
    description: "Descripci\u00f3n",
    offers: "Ofertas",
    certificates: "Certificados regalo",
    category: "Categor\u00eda",
    publicInfo: "Informaci\u00f3n p\u00fablica",
    serviceArea: "\u00c1rea de servicio",
    publicActions: "Acciones p\u00fablicas",
    notProvided: "No indicado",
    details: "Detalles",
    thisWeek: "esta semana",
    placed: "Publicado",
  },
  cs: {
    logo: "Logo",
    address: "Adresa",
    contact: "Kontakt",
    phone: "Telefon",
    website: "Web",
    messenger: "Napsat",
    description: "Popis",
    offers: "Nab\u00eddky",
    certificates: "D\u00e1rkov\u00e9 poukazy",
    category: "Kategorie",
    publicInfo: "Ve\u0159ejn\u00e9 informace",
    serviceArea: "Oblast slu\u017eeb",
    publicActions: "Ve\u0159ejn\u00e9 akce",
    notProvided: "Neuvedeno",
    details: "Podrobnosti",
    thisWeek: "tento t\u00fdden",
    placed: "Zve\u0159ejn\u011bno",
  },
};

function getPublicOrganizationDashboardLocale(
  locale?: string,
): PublicOrganizationDashboardLocaleKey {
  if (
    locale === "pl" ||
    locale === "uk" ||
    locale === "ru" ||
    locale === "de" ||
    locale === "es" ||
    locale === "cs"
  ) {
    return locale;
  }

  return "en";
}

function getPublicOrganizationDashboardLabel(
  key: PublicOrganizationDashboardLabelKey,
  locale?: string,
) {
  const labelLocale = getPublicOrganizationDashboardLocale(locale);

  return (
    PUBLIC_ORGANIZATION_DASHBOARD_LABELS[labelLocale][key] ??
    PUBLIC_ORGANIZATION_DASHBOARD_LABELS.en[key]
  );
}

function formatPublicOrganizationPlacedDate(
  value: string | null | undefined,
  locale?: string,
) {
  if (!value) {
    return getPublicOrganizationDashboardLabel("notProvided", locale);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return getPublicOrganizationDashboardLabel("notProvided", locale);
  }

  return new Intl.DateTimeFormat(
    getPublicOrganizationDashboardLocale(locale),
    { dateStyle: "medium" },
  ).format(date);
}

function getPublicOrganizationPublicProfileLabel(locale?: string) {
  const labelLocale = getPublicOrganizationDashboardLocale(locale);

  const labels: Record<PublicOrganizationDashboardLocaleKey, string> = {
    en: "Public profile",
    pl: "Profil publiczny",
    uk: "\u041f\u0443\u0431\u043b\u0456\u0447\u043d\u0438\u0439 \u043f\u0440\u043e\u0444\u0456\u043b\u044c",
    ru: "\u041f\u0443\u0431\u043b\u0438\u0447\u043d\u044b\u0439 \u043f\u0440\u043e\u0444\u0438\u043b\u044c",
    de: "\u00d6ffentliches Profil",
    es: "Perfil p\u00fablico",
    cs: "Ve\u0159ejn\u00fd profil",
  };

  return labels[labelLocale] ?? labels.en;
}

function getPublicOrganizationEditModeLabel(locale?: string) {
  const labelLocale = getPublicOrganizationDashboardLocale(locale);

  const labels: Record<PublicOrganizationDashboardLocaleKey, string> = {
    en: "Edit mode",
    pl: "Tryb edycji",
    uk: "\u0420\u0435\u0436\u0438\u043c \u0440\u0435\u0434\u0430\u0433\u0443\u0432\u0430\u043d\u043d\u044f",
    ru: "\u0420\u0435\u0436\u0438\u043c \u0440\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u044f",
    de: "Bearbeitungsmodus",
    es: "Modo de edici\u00f3n",
    cs: "Re\u017eim \u00faprav",
  };

  return labels[labelLocale] ?? labels.en;
}

function getPublicOrganizationAddSuperOfferLabel(locale?: string) {
  const labelLocale = getPublicOrganizationDashboardLocale(locale);

  const labels: Record<PublicOrganizationDashboardLocaleKey, string> = {
    en: "Add super offer",
    pl: "Dodaj superofertę",
    uk: "\u0414\u043e\u0434\u0430\u0442\u0438 \u0441\u0443\u043f\u0435\u0440\u043f\u0440\u043e\u043f\u043e\u0437\u0438\u0446\u0456\u044e",
    ru: "\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0441\u0443\u043f\u0435\u0440\u043f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u0435",
    de: "Superangebot hinzuf\u00fcgen",
    es: "A\u00f1adir superoferta",
    cs: "P\u0159idat supernab\u00eddku",
  };

  return labels[labelLocale] ?? labels.en;
}
function normalizePublicExternalHref(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  if (
    trimmedValue.startsWith("http://") ||
    trimmedValue.startsWith("https://") ||
    trimmedValue.startsWith("mailto:") ||
    trimmedValue.startsWith("tel:")
  ) {
    return trimmedValue;
  }

  return `https://${trimmedValue}`;
}

function getPublicMessengerUrl(organization: DirectoryOrganization) {
  const primaryContactChannel = getPrimaryPublicOrganizationContactChannel(
    organization.socialLinks,
  );

  if (primaryContactChannel) {
    return primaryContactChannel.href;
  }

  // Legacy compatibility only. New direct contact methods live under
  // social_links_json.arctor_contact_channels_v1 so future social feeds remain separate.
  const socialLinks = organization.socialLinks ?? {};
  const candidateKeys = ["messenger", "whatsapp", "telegram"];

  for (const key of candidateKeys) {
    const value = socialLinks[key];

    if (typeof value === "string" && value.trim()) {
      return normalizePublicExternalHref(value);
    }
  }

  return null;
}

function PublicDashboardTopCard({
  label,
  accent,
  icon: Icon,
  children,
  footerIconOnly = false,
}: PublicDashboardCardProps & { readonly footerIconOnly?: boolean }) {
  return (
    <div className="flex h-full min-h-[390px] flex-col overflow-hidden rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
      {footerIconOnly ? null : (
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wide text-[#7c8099]">
            {label}
          </span>
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${accent}18` }}
          >
            <Icon size={14} style={{ color: accent }} />
          </div>
        </div>
      )}

      <div
        className={
          footerIconOnly
            ? "flex min-h-0 flex-1 flex-col gap-2"
            : "mt-auto flex min-h-0 flex-1 flex-col gap-2"
        }
      >
        {children}
      </div>


    </div>
  );
}


function PublicDashboardAnalyticsCard({
  title,
  detailsLabel,
  children,
}: PublicDashboardAnalyticsCardProps) {
  return (
    <div className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="min-w-0 line-clamp-1 pr-2 text-[13px] font-semibold text-[#1a1d2e]">
          {title}
        </h3>
        <button type="button" className="text-[11px] text-[#3b6ef8] hover:underline">
          {detailsLabel}
        </button>
      </div>
      {children}
    </div>
  );
}

function PublicDashboardDirectionCard({
  label,
  pct,
  color,
  sub,
  trend,
}: PublicDashboardDirectionCardProps) {
  return (
    <div className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-[#1a1d2e]">{label}</span>
        <span className="text-[13px] font-bold" style={{ color }}>
          {pct}%
        </span>
      </div>

      <div className="mb-2 h-1.5 w-full rounded-full bg-[#f0f2f7]">
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[#9ca3b8]">{sub}</span>
        <div className="flex items-center gap-0.5">
          <TrendingUp size={10} className="text-[#22c55e]" />
          <span className="text-[10px] font-medium text-[#22c55e]">{trend}</span>
        </div>
      </div>
    </div>
  );
}


function getPublicProfileCategoryLabel(organization: DirectoryOrganization) {
  const label = organization.socialLinks?.public_profile_category_label;

  return typeof label === "string" && label.trim() ? label.trim() : null;
}

function PublicOrganizationLogoPreview({
  organization,
  categoryFallback,
}: {
  readonly organization: DirectoryOrganization;
  readonly categoryFallback: string;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex min-h-0 w-full flex-1 basis-0 items-center justify-center overflow-hidden rounded-xl border border-[rgba(0,0,0,0.06)] bg-[#eef2ff] text-[46px] font-bold text-[#3b6ef8]">
        {organization.logoUrl || organization.coverImageUrl ? (
          <img
            src={organization.logoUrl ?? organization.coverImageUrl ?? ""}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          organization.name.slice(0, 2).toUpperCase()
        )}
      </div>

      <div className="min-w-0">
        <div className="line-clamp-2 text-[13px] font-semibold text-[#1a1d2e]">
          {organization.name}
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="min-w-0 line-clamp-1 text-[11px] text-[#9ca3b8]">
            {getPublicProfileCategoryLabel(organization) ??
              organization.primaryCategory?.name ??
              categoryFallback}
          </div>
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#eef2ff] text-[#3b6ef8]"
            aria-label={categoryFallback}
            title={categoryFallback}
          >
            <Star size={14} />
          </div>
        </div>
      </div>
    </div>
  );
}
function getPublicOrganizationStringField(
  organization: DirectoryOrganization,
  keys: readonly string[],
) {
  const record = organization as unknown as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function getPublicOrganizationServiceAreaValue(
  organization: DirectoryOrganization,
  fallbackLocation: string,
) {
  return (
    getPublicOrganizationStringField(organization, [
      "serviceAreaDescription",
      "service_area_description",
      "serviceArea",
      "service_area",
      "serviceAreaLabel",
      "service_area_label",
      "coverageArea",
      "coverage_area",
    ]) ?? fallbackLocation
  );
}

function getPublicOrganizationApproximateMapLabel(locale?: string) {
  const labelLocale = getPublicOrganizationDashboardLocale(locale);

  const labels: Record<PublicOrganizationDashboardLocaleKey, string> = {
    en: "Approximate service area",
    pl: "Przybli\u017cona strefa obs\u0142ugi",
    uk: "\u041f\u0440\u0438\u0431\u043b\u0438\u0437\u043d\u0430 \u0437\u043e\u043d\u0430 \u043e\u0431\u0441\u043b\u0443\u0433\u043e\u0432\u0443\u0432\u0430\u043d\u043d\u044f",
    ru: "\u041f\u0440\u0438\u043c\u0435\u0440\u043d\u0430\u044f \u0437\u043e\u043d\u0430 \u043e\u0431\u0441\u043b\u0443\u0436\u0438\u0432\u0430\u043d\u0438\u044f",
    de: "Ungef\u00e4hres Servicegebiet",
    es: "\u00c1rea de servicio aproximada",
    cs: "P\u0159ibli\u017en\u00e1 oblast slu\u017eeb",
  };

  return labels[labelLocale] ?? labels.en;
}

function PublicOrganizationAddressSummary({
  locationLabel,
  locationCaption,
}: {
  readonly locationLabel: string;
  readonly locationCaption: string;
}) {
  return (
    <div className="flex min-h-[74px] flex-col justify-start gap-1.5">
      <div className="line-clamp-2 text-[16px] font-semibold leading-snug text-[#1a1d2e]">
        {locationLabel}
      </div>

      <div className="mt-5 text-[11px] text-[#9ca3b8]">{locationCaption}</div>
    </div>
  );
}


function getPublicOrganizationTestAddressLabel(locale?: string) {
  const labelLocale = getPublicOrganizationDashboardLocale(locale);

  const labels: Record<PublicOrganizationDashboardLocaleKey, string> = {
    en: "Szczecin, Tkacka 11, PL",
    pl: "Szczecin, ul. Tkacka 11, PL",
    uk: "\u0429\u0435\u0446\u0438\u043d, \u0432\u0443\u043b. Tkacka 11, PL",
    ru: "\u0429\u0435\u0446\u0438\u043d, \u0443\u043b. Tkacka 11, PL",
    de: "Szczecin, Tkacka 11, PL",
    es: "Szczecin, Tkacka 11, PL",
    cs: "\u0160t\u011bt\u00edn, ul. Tkacka 11, PL",
  };

  return labels[labelLocale] ?? labels.en;
}

function getPublicOrganizationTestServiceAreaLabel(locale?: string) {
  const labelLocale = getPublicOrganizationDashboardLocale(locale);

  const labels: Record<PublicOrganizationDashboardLocaleKey, string> = {
    en: "Szczecin city center and nearby area",
    pl: "Centrum Szczecina i najbli\u017csza okolica",
    uk: "\u0426\u0435\u043d\u0442\u0440 \u0429\u0435\u0446\u0438\u043d\u0430 \u0442\u0430 \u043d\u0430\u0439\u0431\u043b\u0438\u0436\u0447\u0456 \u0440\u0430\u0439\u043e\u043d\u0438",
    ru: "\u0426\u0435\u043d\u0442\u0440 \u0429\u0435\u0446\u0438\u043d\u0430 \u0438 \u0431\u043b\u0438\u0436\u0430\u0439\u0448\u0438\u0435 \u0440\u0430\u0439\u043e\u043d\u044b",
    de: "Stadtzentrum Szczecin und Umgebung",
    es: "Centro de Szczecin y zona cercana",
    cs: "Centrum \u0160t\u011bt\u00edna a nejbli\u017e\u0161\u00ed okol\u00ed",
  };

  return labels[labelLocale] ?? labels.en;
}

function getPublicOrganizationTestDistanceLabel(locale?: string) {
  const labelLocale = getPublicOrganizationDashboardLocale(locale);

  const labels: Record<PublicOrganizationDashboardLocaleKey, string> = {
    en: "3,500 m from you",
    pl: "3 500 m od Ciebie",
    uk: "3 500 \u043c \u0432\u0456\u0434 \u0432\u0430\u0441",
    ru: "3 500 \u043c \u043e\u0442 \u0432\u0430\u0441",
    de: "3.500 m von dir",
    es: "3.500 m desde ti",
    cs: "3 500 m od v\u00e1s",
  };

  return labels[labelLocale] ?? labels.en;
}

function getPublicOrganizationTestMapsHref() {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    "Tkacka 11, Szczecin, Poland",
  )}`;
}

function getPublicOrganizationLocationLabel(
  organization: DirectoryOrganization,
  locale?: string,
) {
  const location = organization.primaryLocation;

  if (!location) {
    return getPublicOrganizationDashboardLabel("notProvided", locale);
  }

  const parts = [
    location.city,
    location.streetAddress,
    location.countryCode ?? organization.countryCode,
  ].filter((part): part is string => Boolean(part && part.trim()));

  if (parts.length === 0) {
    return getPublicOrganizationDashboardLabel("notProvided", locale);
  }

  return parts.join(", ");
}

function getPublicOrganizationMapServiceAreaValue(
  organization: DirectoryOrganization,
  locale?: string,
) {
  const location = organization.primaryLocation;
  const serviceArea = location?.label?.trim();

  if (serviceArea) {
    return serviceArea;
  }

  if (location?.city) {
    return location.city;
  }

  return getPublicOrganizationTestServiceAreaLabel(locale);
}
function getPublicOrganizationOpenMapLabel(locale?: string) {
  const labelLocale = getPublicOrganizationDashboardLocale(locale);

  const labels: Record<PublicOrganizationDashboardLocaleKey, string> = {
    en: "Open in maps",
    pl: "Otw\u00f3rz map\u0119",
    uk: "\u0412\u0456\u0434\u043a\u0440\u0438\u0442\u0438 \u043a\u0430\u0440\u0442\u0443",
    ru: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043a\u0430\u0440\u0442\u0443",
    de: "Karte \u00f6ffnen",
    es: "Abrir mapa",
    cs: "Otev\u0159\u00edt mapu",
  };

  return labels[labelLocale] ?? labels.en;
}
function PublicOrganizationMapPreview({
  mapsHref,
  actionLabel,
  distanceLabel,
}: {
  readonly mapsHref: string;
  readonly actionLabel: string;
  readonly distanceLabel: string;
}) {
  return (
    <div className="group relative h-full min-h-0 flex-1 basis-0 overflow-hidden rounded-xl border border-[rgba(0,0,0,0.08)] bg-[#dbeafe] shadow-sm">
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        viewBox="0 0 420 170"
      >
        <defs>
          <linearGradient id="org-map-bg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#dbeafe" />
            <stop offset="54%" stopColor="#e0f2fe" />
            <stop offset="100%" stopColor="#dcfce7" />
          </linearGradient>
          <filter id="org-map-soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" floodColor="#2563eb" floodOpacity="0.22" stdDeviation="2" />
          </filter>
        </defs>

        <rect width="420" height="170" fill="url(#org-map-bg)" />

        <path
          d="M-20 148 C62 119 118 141 196 114 C264 91 331 97 446 64 L446 190 L-20 190 Z"
          fill="#bbf7d0"
          opacity="0.72"
        />
        <path
          d="M-24 34 C42 20 92 30 145 20 C230 4 281 16 452 -12 L452 25 C319 50 235 41 152 54 C87 64 40 52 -24 72 Z"
          fill="#bfdbfe"
          opacity="0.76"
        />
        <path
          d="M292 -14 C321 33 319 87 342 178"
          fill="none"
          stroke="#93c5fd"
          strokeLinecap="round"
          strokeWidth="24"
          opacity="0.58"
        />

        <path d="M-18 54 L440 138" stroke="#c7d2fe" strokeWidth="18" opacity="0.78" />
        <path d="M-18 54 L440 138" stroke="#ffffff" strokeWidth="12" opacity="0.96" />
        <path d="M-18 54 L440 138" stroke="#cbd5e1" strokeWidth="1.5" opacity="0.75" />

        <path d="M-22 126 C80 98 147 87 239 62 C309 43 354 23 442 9" stroke="#bfdbfe" strokeWidth="14" opacity="0.8" />
        <path d="M-22 126 C80 98 147 87 239 62 C309 43 354 23 442 9" stroke="#ffffff" strokeWidth="9" opacity="0.95" />
        <path d="M-22 126 C80 98 147 87 239 62 C309 43 354 23 442 9" stroke="#cbd5e1" strokeWidth="1.2" opacity="0.65" />

        <path d="M64 -20 L98 192" stroke="#ffffff" strokeWidth="6" opacity="0.86" />
        <path d="M150 -16 L110 194" stroke="#ffffff" strokeWidth="5" opacity="0.82" />
        <path d="M238 -18 L263 196" stroke="#ffffff" strokeWidth="6" opacity="0.86" />
        <path d="M360 -20 L326 194" stroke="#ffffff" strokeWidth="5" opacity="0.82" />

        <path d="M-18 92 L440 42" stroke="#ffffff" strokeWidth="4" opacity="0.78" />
        <path d="M-18 162 L440 112" stroke="#ffffff" strokeWidth="4" opacity="0.76" />

        <path
          d="M70 113 C129 91 186 95 227 74 C258 58 281 55 307 52"
          fill="none"
          stroke="#f97316"
          strokeDasharray="6 5"
          strokeLinecap="round"
          strokeWidth="4"
          opacity="0.78"
        />

        <circle cx="230" cy="84" r="61" fill="#3b82f6" opacity="0.16" />
        <circle cx="230" cy="84" r="43" fill="#3b82f6" opacity="0.2" />
        <circle cx="230" cy="84" r="24" fill="#3b82f6" opacity="0.28" />
        <circle cx="230" cy="84" r="12" fill="#ffffff" filter="url(#org-map-soft-shadow)" />
        <circle cx="230" cy="84" r="6" fill="#2563eb" />

        <text x="20" y="28" fill="#475569" fontSize="11" fontWeight="700" opacity="0.72">
          Centrum
        </text>
        <text x="32" y="143" fill="#64748b" fontSize="10" fontWeight="600" opacity="0.72">
          Tkacka
        </text>
        <text x="314" y="31" fill="#64748b" fontSize="10" fontWeight="600" opacity="0.66">
          Odra
        </text>
      </svg>

      <div className="absolute bottom-3 left-3 rounded-full border border-white/80 bg-white/92 px-3 py-1.5 text-[11px] font-semibold text-[#1a1d2e] shadow-sm backdrop-blur">
        {distanceLabel}
      </div>

      <a
        href={mapsHref}
        target="_blank"
        rel="noreferrer"
        aria-label={actionLabel}
        title={actionLabel}
        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/90 bg-white/95 text-[#2563eb] shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40"
      >
        <Navigation size={16} />
      </a>
    </div>
  );
}type PublicFeaturedContentCopy = {
  specialOrNews: string;
  giftCards: string;
  noOffers: string;
  more: string;
};

function getPublicFeaturedContentCopy(
  locale?: string,
): PublicFeaturedContentCopy {
  const labelLocale = getPublicOrganizationDashboardLocale(locale);

  const copy: Record<
    PublicOrganizationDashboardLocaleKey,
    PublicFeaturedContentCopy
  > = {
    en: {
      specialOrNews: "Special offers or news",
      giftCards: "Gift cards",
      noOffers: "No offers yet",
      more: "Learn more",
    },
    pl: {
      specialOrNews: "Oferty specjalne lub aktualności",
      giftCards: "Karty podarunkowe",
      noOffers: "Na razie brak ofert",
      more: "Więcej",
    },
    uk: {
      specialOrNews: "Спеціальні пропозиції або новини",
      giftCards: "Подарункові картки",
      noOffers: "Поки що немає пропозицій",
      more: "Докладніше",
    },
    ru: {
      specialOrNews: "Спецпредложения или новости",
      giftCards: "Подарочные карты",
      noOffers: "Пока нет предложений",
      more: "Подробнее",
    },
    de: {
      specialOrNews: "Sonderangebote oder Neuigkeiten",
      giftCards: "Geschenkkarten",
      noOffers: "Noch keine Angebote",
      more: "Mehr",
    },
    es: {
      specialOrNews: "Ofertas especiales o novedades",
      giftCards: "Tarjetas regalo",
      noOffers: "Aún no hay ofertas",
      more: "Más información",
    },
    cs: {
      specialOrNews: "Speciální nabídky nebo novinky",
      giftCards: "Dárkové karty",
      noOffers: "Zatím žádné nabídky",
      more: "Více",
    },
  };

  return copy[labelLocale] ?? copy.en;
}

function PublicFeaturedContentCard({
  imageUrl,
  linkUrl,
  shortDescription,
  giftCards,
  locale,
}: {
  readonly imageUrl: string | null;
  readonly linkUrl: string | null;
  readonly shortDescription: string | null;
  readonly giftCards: PublicDirectoryOffer[];
  readonly locale?: string;
}) {
  const copy = getPublicFeaturedContentCopy(locale);
  const hasFeaturedContent = Boolean(
    imageUrl || linkUrl || shortDescription,
  );

  return (
    <div className="flex h-full min-h-[390px] flex-col overflow-hidden rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
      <section className="min-h-0">
        <h3 className="text-[11px] font-medium uppercase tracking-wide text-[#7c8099]">
          {copy.specialOrNews}
        </h3>

        {hasFeaturedContent ? (
          <div className="mt-3">
            {imageUrl ? (
              <div className="mb-3 h-[150px] overflow-hidden rounded-xl border border-[rgba(0,0,0,0.06)] bg-[#f8f9fd]">
                <img
                  src={imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            ) : null}

            {shortDescription ? (
              <p className="line-clamp-3 text-[12px] leading-5 text-[#5a5f7a]">
                {shortDescription}
              </p>
            ) : null}

            {linkUrl ? (
              <a
                href={linkUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex text-[12px] font-semibold text-[#3b6ef8] hover:underline"
              >
                {copy.more}
              </a>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-[12px] text-[#9ca3b8]">
            {copy.noOffers}
          </p>
        )}
      </section>

      <section className="mt-4 border-t border-[#edf0f7] pt-4">
        <h3 className="text-[11px] font-medium uppercase tracking-wide text-[#7c8099]">
          {copy.giftCards}
        </h3>

        {giftCards.length > 0 ? (
          <div className="mt-2 space-y-1.5">
            {giftCards.slice(0, 2).map((offer) => (
              <a
                key={offer.id}
                href="#public-offers"
                className="block line-clamp-1 text-[12px] font-semibold text-[#1a1d2e] hover:text-[#3b6ef8]"
              >
                {offer.title}
              </a>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-[12px] text-[#9ca3b8]">
            {copy.noOffers}
          </p>
        )}
      </section>
    </div>
  );
}

function PublicDashboardActionButton({
  href,
  icon: Icon,
  children,
  disabled,
}: PublicDashboardActionButtonProps) {
  const className =
    "flex items-center gap-1 rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-3 py-1.5 text-[12px] font-medium text-[#5a5f7a] transition-all hover:bg-[#f5f6fb] disabled:cursor-not-allowed disabled:opacity-50";

  if (!href || disabled) {
    return (
      <button type="button" disabled className={className}>
        <Icon size={12} />
        {children}
      </button>
    );
  }

  return (
    <a href={href} className={className}>
      <Icon size={12} />
      {children}
    </a>
  );
}

function PublicDashboardPlaceholder({
  label,
}: {
  readonly label: string;
}) {
  return (
    <div className="flex h-[140px] items-center justify-center rounded-xl bg-[#f8f9fd] text-[12px] text-[#9ca3b8]">
      {label}
    </div>
  );
}

export default async function DirectoryOrganizationPage({
  params,
  searchParams,
}: DirectoryOrganizationPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const selectedLocale =
    normalizeLocaleParam(resolvedSearchParams?.locale) ||
    normalizeLocaleParam(resolvedSearchParams?.lang);
  const selectedScope =
    normalizeLocaleParam(resolvedSearchParams?.scope) === "mine"
      ? "mine"
      : "all";
  const slug = resolvedParams.slug;
  const t = getDirectoryDetailMessages(selectedLocale);
  const systemLabels = getSystemLabelsMessages(selectedLocale);
  const actorContextPromise = getCurrentDirectoryActorContext();

  const { organization, errorMessage } = await getDirectoryOrganization(slug, selectedLocale);

  if (!organization && !errorMessage) {
    notFound();
  }

  const offersResult = organization
    ? await getDirectoryOrganizationOffers(organization.id, selectedLocale)
    : { offers: [], errorMessage: null };

  const offers = await getOffersWithCertificateAvailability(
    offersResult.offers,
    systemLabels,
  );
  const offersErrorMessage = offersResult.errorMessage;

  const firstOfferWithCertificate =
    offers.find((offer) => offer.certificateAvailable) ?? null;

  const formatPublicMoney = (
    amount: number | null | undefined,
    currency: string | null | undefined,
  ) => {
    if (amount === null || amount === undefined) {
      return "\u2014";
    }

    return `${new Intl.NumberFormat("pl-PL", {
      maximumFractionDigits: 2,
    }).format(amount)} ${currency ?? organization?.defaultCurrency ?? "PLN"}`;
  };

  const formatPublicPoints = (points: number | null | undefined) => {
    if (points === null || points === undefined || points <= 0) {
      return "0";
    }

    return new Intl.NumberFormat("pl-PL", {
      maximumFractionDigits: 2,
    }).format(points);
  };

  const getPublicOfferTypeLabel = (offerType: string) => {
    return getOfferTypeLabel(offerType, selectedLocale);
  };

  const getPublicOrganizationTypeLabel = (organizationType: string) => {
    return getOrganizationTypeLabel(organizationType, selectedLocale);
  };

  const getPublicVerificationLabel = (verificationStatus: string) => {
    return getVerificationStatusLabel(verificationStatus, selectedLocale);
  };

  const getPublicLocationLabel = () => {
    if (!organization?.primaryLocation) {
      return t.location.notSpecified;
    }

    const location = organization.primaryLocation;

    const parts = [
      location.label,
      location.city,
      location.district,
      location.region,
      location.countryCode,
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(", ") : t.location.notSpecified;
  };

  const getPublicBookingLabel = (offer: PublicDirectoryOffer) => {
    if (!offer.requiresBooking) {
      return systemLabels.booking.notRequired;
    }

    if (offer.defaultDurationMinutes) {
      return systemLabels.booking.requiredWithDuration(offer.defaultDurationMinutes);
    }

    return systemLabels.booking.required;
  };

  const getPublicCertificatePaymentLabel = (offer: PublicDirectoryOffer) => {
    if (!offer.certificateAvailable) {
      return systemLabels.certificatePaymentModes.unavailable;
    }

    if (offer.certificate.paymentMode === "points_only") {
      return `${formatPublicPoints(offer.certificate.pointsPrice)} POINTS`;
    }

    if (offer.certificate.paymentMode === "money_only") {
      return formatPublicMoney(
        offer.certificate.moneyPrice,
        offer.certificate.currency ?? offer.currency,
      );
    }

    if (offer.certificate.paymentMode === "mixed") {
      return `${formatPublicPoints(
        offer.certificate.pointsPrice,
      )} POINTS + ${formatPublicMoney(
        offer.certificate.moneyPrice,
        offer.certificate.currency ?? offer.currency,
      )}`;
    }

    return systemLabels.certificatePaymentModes.available;
  };

  const organizationDescription =
    organization?.shortDescription ??
    organization?.description ??
    t.fallbacks.descriptionMissing;

  const certificateOffers = offers.filter(
    (offer) => offer.certificateAvailable,
  );
  const certificateOffersCount = certificateOffers.length;
  const publicMessengerUrl = organization
    ? getPublicMessengerUrl(organization)
    : null;
  const publicWebsiteUrl = normalizePublicExternalHref(organization?.websiteUrl);
  const publicPhoneUrl = organization?.publicPhone
    ? `tel:${organization.publicPhone}`
    : null;
  const currentActorContext = await actorContextPromise;
  const isOrganizationOwner = Boolean(
    organization?.ownerActorId &&
      currentActorContext?.actorId === organization.ownerActorId,
  );
  const directoryBackHref = appendLocaleToHref(
    selectedScope === "mine" ? "/directory?scope=mine" : "/directory",
    selectedLocale,
  );
  const editProfileHref = organization
    ? appendLocaleToHref(`/organizations/${organization.id}/edit`, selectedLocale)
    : null;
  const addSuperOfferHref = organization
    ? appendLocaleToHref(
        `/offers/new?organizationId=${encodeURIComponent(organization.id)}`,
        selectedLocale,
      )
    : null;

  return (
    <main className="min-h-full bg-[#f5f6fb] text-[#1a1d2e]">
      <div className="p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Link
            href={directoryBackHref}
            className="w-fit rounded-full border border-[#dfe3f1] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4f6a] transition hover:bg-gray-50"
          >
            {t.navigation.backToDirectoryWithArrow}
          </Link>

          {isOrganizationOwner && editProfileHref ? (
            <Link
              href={editProfileHref}
              className="w-fit rounded-full border border-[#dfe3f1] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4f6a] shadow-sm transition hover:bg-gray-50"
            >
              {getPublicOrganizationEditModeLabel(selectedLocale)}
            </Link>
          ) : null}

          {isOrganizationOwner && addSuperOfferHref ? (
            <Link
              href={addSuperOfferHref}
              className="w-fit rounded-full border border-[#3b6ef8] bg-[#3b6ef8] px-4 py-2 text-[12px] font-bold text-white shadow-[0_8px_20px_rgba(59,110,248,0.18)] transition hover:-translate-y-0.5 hover:bg-[#315fd8]"
            >
              {getPublicOrganizationAddSuperOfferLabel(selectedLocale)}
            </Link>
          ) : null}
        </div>

        {errorMessage ? (
          <section className="mb-5 rounded-xl border border-[rgba(239,68,68,0.2)] bg-white p-4 text-[13px] text-[#b91c1c] shadow-sm">
            <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[#b91c1c]">
              {t.error.kicker}
            </div>
            <div className="text-[20px] font-bold leading-tight text-[#7f1d1d]">
              {t.error.title}
            </div>
            <p className="mt-2 text-[13px] leading-6 text-[#b42318]">
              {errorMessage}
            </p>
          </section>
        ) : null}

        {organization ? (
          <>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-[20px] font-bold leading-tight text-[#1a1d2e]">
                  {organization.name}
                </h1>
                <p className="mt-0.5 text-[13px] text-[#7c8099]">
                  {getPublicOrganizationTypeLabel(organization.type)}
                </p>
                <p className="mt-1 text-[12px] font-medium text-[#9ca3b8]">
                  {getPublicOrganizationDashboardLabel("placed", selectedLocale)}:{" "}
                  {formatPublicOrganizationPlacedDate(
                    organization.createdAt,
                    selectedLocale,
                  )}
                </p>
              </div>
            </div>

            <div className="mb-5 grid auto-rows-auto grid-cols-1 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <PublicDashboardTopCard
                label={getPublicOrganizationDashboardLabel("logo", selectedLocale)}
                accent="#3b6ef8"
                icon={Star}
              footerIconOnly
              >
                <PublicOrganizationLogoPreview
                  organization={organization}
                  categoryFallback={getPublicOrganizationDashboardLabel(
                    "category",
                    selectedLocale,
                  )}
                />
              </PublicDashboardTopCard>

              <PublicDashboardTopCard
                label={getPublicOrganizationDashboardLabel("address", selectedLocale)}
                accent="#f97316"
                icon={MapPin}
              >
                <PublicOrganizationAddressSummary
                  locationLabel={getPublicOrganizationLocationLabel(organization, selectedLocale)}
                  locationCaption={t.hero.locationLabel}
                />
                              <div className="mt-3 flex min-h-0 flex-1">
                  <OrganizationLocationMapPreview
                    location={organization.primaryLocation}
                    organizationName={organization.name}
                    locale={selectedLocale}
                    actionLabel={getPublicOrganizationOpenMapLabel(selectedLocale)}
                    distanceLabel={getPublicOrganizationTestDistanceLabel(
                      selectedLocale,
                    )}
                    className="rounded-xl shadow-sm"
                  />
                </div>
              </PublicDashboardTopCard>
              <PublicFeaturedContentCard
                imageUrl={organization.featuredImageUrl}
                linkUrl={organization.featuredLinkUrl}
                shortDescription={organization.featuredShortDescription}
                giftCards={certificateOffers}
                locale={selectedLocale}
              />
              <PurchaseConfirmationRequestCard
                organizationId={organization.id}
                organizationDefaultCurrency={organization.defaultCurrency}
                locale={selectedLocale}
              />
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-2">
              <PublicDashboardActionButton
                href={publicPhoneUrl}
                icon={Phone}
                disabled={!publicPhoneUrl}
              >
                {organization.publicPhone ??
                  getPublicOrganizationDashboardLabel("phone", selectedLocale)}
              </PublicDashboardActionButton>

              <PublicDashboardActionButton
                href={publicWebsiteUrl}
                icon={Globe}
                disabled={!publicWebsiteUrl}
              >
                {getPublicOrganizationDashboardLabel("website", selectedLocale)}
              </PublicDashboardActionButton>

              <PublicDashboardActionButton
                href={publicMessengerUrl}
                icon={MessageCircle}
                disabled={!publicMessengerUrl}
              >
                {getPublicOrganizationDashboardLabel("messenger", selectedLocale)}
              </PublicDashboardActionButton>

              <a
                href="#public-description"
                className="rounded-lg bg-[#3b6ef8] px-3 py-1.5 text-[12px] font-medium text-white shadow-sm transition-all hover:bg-[#2f5fe3]"
              >
                {getPublicOrganizationDashboardLabel("description", selectedLocale)}
              </a>

              <a
                href="#public-offers"
                className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-3 py-1.5 text-[12px] font-medium text-[#5a5f7a] transition-all hover:bg-[#f5f6fb]"
              >
                {t.navigation.viewOffers}
              </a>

              <a
                href="#register-purchase"
                className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-3 py-1.5 text-[12px] font-medium text-[#5a5f7a] transition-all hover:bg-[#f5f6fb]"
              >
                POINTS
              </a>
            </div>

            <div className="mb-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
              <PublicDashboardAnalyticsCard
                title={getPublicOrganizationDashboardLabel("description", selectedLocale)}
                detailsLabel={getPublicOrganizationDashboardLabel("details", selectedLocale)}
              >
                <div
                  id="public-description"
                  className="min-h-[140px] text-[13px] leading-6 text-[#5a5f7a]"
                >
                  <p className="line-clamp-6">
                    {organizationDescription}
                  </p>
                  <p className="mt-3 text-[12px] leading-5 text-[#9ca3b8]">
                    {t.hero.safetyNote}
                  </p>
                </div>
              </PublicDashboardAnalyticsCard>

              <PublicDashboardAnalyticsCard
                title={t.offers.title}
                detailsLabel={getPublicOrganizationDashboardLabel("details", selectedLocale)}
              >
                <PublicDashboardPlaceholder
                  label={getPublicOrganizationDashboardLabel(
                    "publicInfo",
                    selectedLocale,
                  )}
                />
              </PublicDashboardAnalyticsCard>
            </div>

            <div className="mb-5 grid grid-cols-1 gap-3 xl:grid-cols-2">
              <PublicDashboardAnalyticsCard
                title={t.points.title}
                detailsLabel={getPublicOrganizationDashboardLabel("details", selectedLocale)}
              >
                <PublicDashboardPlaceholder
                  label={getPublicOrganizationDashboardLabel(
                    "publicInfo",
                    selectedLocale,
                  )}
                />
              </PublicDashboardAnalyticsCard>

              <PublicDashboardAnalyticsCard
                title={getPublicOrganizationDashboardLabel("publicActions", selectedLocale)}
                detailsLabel={getPublicOrganizationDashboardLabel("details", selectedLocale)}
              >
                <PublicDashboardPlaceholder
                  label={getPublicOrganizationDashboardLabel(
                    "publicInfo",
                    selectedLocale,
                  )}
                />
              </PublicDashboardAnalyticsCard>
            </div>

            <div className="mb-2" id="public-offers">
              <h2 className="mb-3 text-[13px] font-semibold text-[#1a1d2e]">
                {getPublicOrganizationPublicProfileLabel(selectedLocale)}
              </h2>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <PublicDashboardDirectionCard
                  label={t.hero.offersLabel}
                  pct={78}
                  color="#3b6ef8"
                  sub={`${offers.length} ${t.hero.offersLabel}`}
                  trend="+3%"
                />
                <PublicDashboardDirectionCard
                  label={t.hero.certificateLabel}
                  pct={72}
                  color="#f97316"
                  sub={`${certificateOffersCount} ${t.hero.certificateLabel}`}
                  trend="+1.5%"
                />
                <PublicDashboardDirectionCard
                  label="POINTS"
                  pct={75}
                  color="#22c55e"
                  sub={t.points.title}
                  trend="+5%"
                />
                <PublicDashboardDirectionCard
                  label={getPublicOrganizationDashboardLabel("category", selectedLocale)}
                  pct={79}
                  color="#8b5cf6"
                  sub={
                    getPublicProfileCategoryLabel(organization) ??
                    organization.primaryCategory?.name ??
                    getPublicOrganizationDashboardLabel("notProvided", selectedLocale)
                  }
                  trend="+2%"
                />
              </div>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
