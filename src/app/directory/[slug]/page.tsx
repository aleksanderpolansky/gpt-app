import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import DirectoryPurchaseConfirmationForm from "./DirectoryPurchaseConfirmationForm";

export const dynamic = "force-dynamic";

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
};

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
  classifications: DirectoryObjectActionClassification[]
): DirectoryOrganization {
  const primaryCategory = getPrimaryCategory(row, classifications);

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
  };
}

function mapPublicOffer(row: PublicOfferRow): PublicDirectoryOffer {
  return {
    id: row.id,
    organizationId: row.organization_id,
    offerType: row.offer_type,
    title: row.title,
    description: row.description,
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
    discountLegalNote: row.discount_legal_note,
    certificate: {
      available: row.certificate_available,
      paymentMode: row.certificate_payment_mode,
      pointsPrice: row.certificate_points_price,
      moneyPrice: row.certificate_money_price,
      currency: row.certificate_currency,
      terms: row.certificate_terms,
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

async function getDirectoryOrganization(slug: string): Promise<{
  organization: DirectoryOrganization | null;
  errorMessage: string | null;
}> {
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
    organization: mapDirectoryOrganization(organizationRow, classifications),
    errorMessage: null,
  };
}

async function getDirectoryOrganizationOffers(
  organizationId: string
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
    offers: ((data as unknown as PublicOfferRow[] | null) ?? []).map(
      mapPublicOffer
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
): CertificateAvailabilityView {
  if (!offer.certificateAvailable) {
    return {
      maxTotal: null,
      issuedCount: 0,
      remaining: null,
      isSoldOut: false,
      label: "Сертификат недоступен",
    };
  }

  const maxTotal = offer.certificate.maxCertificatesTotal;

  if (typeof maxTotal !== "number" || maxTotal <= 0) {
    return {
      maxTotal: null,
      issuedCount,
      remaining: null,
      isSoldOut: false,
      label: "Количество сертификатов не ограничено",
    };
  }

  const remaining = Math.max(maxTotal - issuedCount, 0);

  return {
    maxTotal,
    issuedCount,
    remaining,
    isSoldOut: remaining <= 0,
    label: `Доступно сертификатов: ${remaining} из ${maxTotal}`,
  };
}

async function getOffersWithCertificateAvailability(
  offers: PublicDirectoryOffer[],
): Promise<PublicDirectoryOfferWithCertificateAvailability[]> {
  const certificateOfferIds = offers
    .filter((offer) => offer.certificateAvailable)
    .map((offer) => offer.id);

  if (certificateOfferIds.length === 0) {
    return offers.map((offer) => ({
      ...offer,
      certificateAvailability: buildCertificateAvailability(offer, 0),
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
        ...buildCertificateAvailability(offer, 0),
        label:
          typeof offer.certificate.maxCertificatesTotal === "number" &&
          offer.certificate.maxCertificatesTotal > 0
            ? `Лимит сертификатов: ${offer.certificate.maxCertificatesTotal}; остаток не удалось проверить`
            : "Количество сертификатов не ограничено",
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
    ),
  }));
}

export default async function DirectoryOrganizationPage({
  params,
}: DirectoryOrganizationPageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

  const { organization, errorMessage } = await getDirectoryOrganization(slug);

  if (!organization && !errorMessage) {
    notFound();
  }

  const offersResult = organization
    ? await getDirectoryOrganizationOffers(organization.id)
    : { offers: [], errorMessage: null };

  const offers = await getOffersWithCertificateAvailability(offersResult.offers);
  const offersErrorMessage = offersResult.errorMessage;

  const firstOfferWithCertificate =
    offers.find((offer) => offer.certificateAvailable) ?? null;

  const formatPublicMoney = (
    amount: number | null | undefined,
    currency: string | null | undefined,
  ) => {
    if (amount === null || amount === undefined) {
      return "—";
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
    switch (offerType) {
      case "bookable_service":
        return "Услуга с записью";
      case "service":
        return "Услуга";
      case "product":
        return "Товар";
      case "bundle":
        return "Пакет";
      case "consultation":
        return "Консультация";
      case "reward":
        return "Сертификат / reward";
      default:
        return offerType;
    }
  };

  const getPublicOrganizationTypeLabel = (organizationType: string) => {
    switch (organizationType) {
      case "private_business":
        return "Частный бизнес";
      case "company":
        return "Компания";
      case "non_profit":
        return "Некоммерческая организация";
      case "public_institution":
        return "Публичная организация";
      default:
        return organizationType;
    }
  };

  const getPublicVerificationLabel = (verificationStatus: string) => {
    switch (verificationStatus) {
      case "verified":
        return "Проверено";
      case "pending":
        return "На проверке";
      case "rejected":
        return "Отклонено";
      default:
        return "Без верификации";
    }
  };

  const getPublicLocationLabel = () => {
    if (!organization?.primaryLocation) {
      return "Локация не указана";
    }

    const location = organization.primaryLocation;

    const parts = [
      location.label,
      location.city,
      location.district,
      location.region,
      location.countryCode,
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(", ") : "Локация не указана";
  };

  const getPublicBookingLabel = (offer: PublicDirectoryOffer) => {
    if (!offer.requiresBooking) {
      return "Без обязательной записи";
    }

    if (offer.defaultDurationMinutes) {
      return `Требуется запись · ${offer.defaultDurationMinutes} мин.`;
    }

    return "Требуется запись";
  };

  const getPublicCertificatePaymentLabel = (offer: PublicDirectoryOffer) => {
    if (!offer.certificateAvailable) {
      return "Недоступен";
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

    return "Сертификат доступен";
  };

  const organizationDescription =
    organization?.shortDescription ??
    organization?.description ??
    "Описание пока не добавлено.";

  return (
    <main className="min-h-full bg-[#f5f6fb] px-4 py-8 text-[#1a1d2e]">
      <div className="mx-auto grid w-full max-w-[1120px] gap-5">
        <Link
          href="/directory"
          className="w-fit rounded-full border border-[#dfe3f1] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4f6a] transition hover:bg-gray-50"
        >
          ← Назад в каталог
        </Link>

        {errorMessage ? (
          <section className="rounded-[18px] border border-[#fecaca] bg-[#fff1f2] p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#b42318]">
              Directory error
            </div>
            <h1 className="text-[28px] font-bold text-[#7f1d1d]">
              Ошибка загрузки карточки
            </h1>
            <p className="mt-2 text-[14px] leading-6 text-[#b42318]">
              {errorMessage}
            </p>
          </section>
        ) : null}

        {organization ? (
          <>
            <header className="overflow-hidden rounded-[22px] border border-[rgba(0,0,0,0.07)] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
              <div className="grid gap-6 p-6 lg:grid-cols-[1.4fr_0.6fr]">
                <div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-[#dfe4ff] bg-[#eef2ff] px-3 py-1.5 text-[12px] font-semibold text-[#3b6ef8]">
                      {organization.primaryCategory?.name ??
                        "Категория будет уточнена AI"}
                    </span>
                    <span className="rounded-full border border-[#e5e7eb] bg-[#f8f9fd] px-3 py-1.5 text-[12px] font-semibold text-[#4a4f6a]">
                      {getPublicLocationLabel()}
                    </span>
                  </div>

                  <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7c8099]">
                    Public enterprise card
                  </div>

                  <h1 className="text-[32px] font-bold tracking-[-0.035em] text-[#111827]">
                    {organization.name}
                  </h1>

                  <p className="mt-3 max-w-[780px] text-[14px] leading-6 text-[#5a5f7a]">
                    {organizationDescription}
                  </p>

                  <p className="mt-3 max-w-[760px] text-[12.5px] leading-5 text-[#7c8099]">
                    На публичной карточке показывается безопасная информация:
                    предприятие, публичные предложения, сертификаты и форма
                    регистрации внешней покупки. Точный адрес не раскрывается,
                    если он скрыт или указан приблизительно.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <a
                      href="#public-offers"
                      className="rounded-xl bg-[#3b6ef8] px-4 py-3 text-[13px] font-bold text-white shadow-[0_10px_20px_rgba(59,110,248,0.22)] transition hover:bg-[#2f5fe3]"
                    >
                      Посмотреть предложения
                    </a>

                    <a
                      href="#register-purchase"
                      className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-[13px] font-bold text-[#15803d] transition hover:bg-[#dcfce7]"
                    >
                      Зарегистрировать покупку
                    </a>
                  </div>
                </div>

                <aside className="grid content-start gap-3 rounded-[18px] border border-[#edf0f7] bg-[#f8f9fd] p-5">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8099]">
                      Предприятие
                    </div>
                    <div className="mt-1 text-[20px] font-bold text-[#111827]">
                      {getPublicOrganizationTypeLabel(organization.type)}
                    </div>
                  </div>

                  <div className="grid gap-2 text-[13px] leading-5 text-[#5a5f7a]">
                    <p className="m-0">
                      <strong className="text-[#343854]">Проверка:</strong>{" "}
                      {getPublicVerificationLabel(organization.verificationStatus)}
                    </p>
                    <p className="m-0">
                      <strong className="text-[#343854]">Валюта:</strong>{" "}
                      {organization.defaultCurrency ?? "PLN"}
                    </p>
                    <p className="m-0">
                      <strong className="text-[#343854]">Предложений:</strong>{" "}
                      {offers.length}
                    </p>
                    <p className="m-0">
                      <strong className="text-[#343854]">Сертификат:</strong>{" "}
                      {firstOfferWithCertificate ? "доступен" : "нет"}
                    </p>
                  </div>
                </aside>
              </div>
            </header>

            <section className="grid gap-4 md:grid-cols-3">
              <article className="rounded-[16px] border border-[rgba(0,0,0,0.07)] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8099]">
                  Тип
                </div>
                <div className="mt-2 text-[20px] font-bold text-[#111827]">
                  {getPublicOrganizationTypeLabel(organization.type)}
                </div>
              </article>

              <article className="rounded-[16px] border border-[rgba(0,0,0,0.07)] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8099]">
                  Локация
                </div>
                <div className="mt-2 text-[20px] font-bold text-[#111827]">
                  {getPublicLocationLabel()}
                </div>
              </article>

              <article className="rounded-[16px] border border-[rgba(0,0,0,0.07)] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8099]">
                  Публичный flow
                </div>
                <div className="mt-2 text-[20px] font-bold text-[#3b6ef8]">
                  Offer → Certificate
                </div>
              </article>
            </section>

            <section className="rounded-[18px] border border-[#dbeafe] bg-[#eff6ff] p-6 text-[#1e3a8a] shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em]">
                POINTS / money boundary
              </div>

              <h2 className="mt-2 text-[22px] font-bold">
                Сертификаты и POINTS
              </h2>

              <p className="mt-2 max-w-[860px] text-[13px] leading-6">
                POINTS — это бонусные единицы программы лояльности, а не
                деньги, валюта или средство платежа. Если сертификат показывает
                схему вроде “2.33 POINTS + 50 PLN”, это означает смешанную
                оплату: часть стоимости покрывается POINTS, остаток оплачивается
                деньгами.
              </p>
            </section>

            <section
              id="public-offers"
              className="rounded-[18px] border border-[rgba(0,0,0,0.07)] bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
            >
              <div className="mb-5 flex flex-col gap-3 border-b border-[#edf0f7] pb-5 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7c8099]">
                    Public offers
                  </div>

                  <h2 className="mt-2 text-[26px] font-bold tracking-[-0.03em] text-[#111827]">
                    Публичные предложения
                  </h2>

                  <p className="mt-2 text-[14px] leading-6 text-[#5a5f7a]">
                    Здесь показываются реальные предложения предприятия:
                    услуга как Value Object, цена, запись и доступность
                    подарочного сертификата.
                  </p>
                </div>

                <span className="w-fit rounded-full border border-[#dfe3f1] bg-[#f8f9fd] px-4 py-2 text-[13px] font-bold text-[#4a4f6a]">
                  {offers.length} предложений
                </span>
              </div>

              {offersErrorMessage ? (
                <div className="mb-4 rounded-xl border border-[#fecaca] bg-[#fff1f2] px-4 py-3 text-[13px] font-medium text-[#b42318]">
                  {offersErrorMessage}
                </div>
              ) : null}

              {offers.length === 0 ? (
                <div className="rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-4 text-[14px] text-[#92400e]">
                  У этого предприятия пока нет публичных предложений.
                </div>
              ) : (
                <div className="grid gap-4">
                  {offers.map((offer) => (
                    <article
                      key={offer.id}
                      className="grid gap-5 rounded-[18px] border border-[#edf0f7] bg-[#ffffff] p-5 shadow-[0_8px_22px_rgba(15,23,42,0.05)] lg:grid-cols-[1.35fr_0.65fr]"
                    >
                      <div>
                        <div className="mb-2 flex flex-wrap gap-2">
                          <span className="rounded-full border border-[#dfe4ff] bg-[#eef2ff] px-3 py-1.5 text-[12px] font-semibold text-[#3b6ef8]">
                            {getPublicOfferTypeLabel(offer.offerType)}
                          </span>
                          <span className="rounded-full border border-[#e5e7eb] bg-[#f8f9fd] px-3 py-1.5 text-[12px] font-semibold text-[#4a4f6a]">
                            {getPublicBookingLabel(offer)}
                          </span>
                          {offer.certificateAvailable ? (
                            <span className="rounded-full border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-1.5 text-[12px] font-semibold text-[#15803d]">
                              Сертификат доступен
                            </span>
                          ) : null}
                        </div>

                        <h3 className="text-[24px] font-bold tracking-[-0.03em] text-[#111827]">
                          {offer.title}
                        </h3>

                        <p className="mt-3 max-w-[820px] text-[14px] leading-6 text-[#5a5f7a]">
                          {offer.description ?? "Описание пока не добавлено."}
                        </p>

                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                          <div className="rounded-2xl border border-[#edf0f7] bg-[#f8f9fd] p-4">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8099]">
                              Цена
                            </div>
                            <div className="mt-1 text-[20px] font-bold text-[#111827]">
                              {formatPublicMoney(offer.price, offer.currency)}
                            </div>
                            {offer.regularPrice ? (
                              <div className="mt-1 text-[12px] text-[#7c8099]">
                                Обычная цена:{" "}
                                {formatPublicMoney(
                                  offer.regularPrice,
                                  offer.currency,
                                )}
                              </div>
                            ) : null}
                          </div>

                          <div className="rounded-2xl border border-[#edf0f7] bg-[#f8f9fd] p-4">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8099]">
                              Запись
                            </div>
                            <div className="mt-1 text-[20px] font-bold text-[#111827]">
                              {offer.requiresBooking ? "Нужна" : "Не нужна"}
                            </div>
                            <div className="mt-1 text-[12px] text-[#7c8099]">
                              {offer.defaultDurationMinutes
                                ? `${offer.defaultDurationMinutes} мин.`
                                : "длительность не указана"}
                            </div>
                          </div>

                          <div className="rounded-2xl border border-[#edf0f7] bg-[#f8f9fd] p-4">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8099]">
                              Сертификат
                            </div>
                            <div className="mt-1 text-[20px] font-bold text-[#111827]">
                              {offer.certificateAvailable ? "Да" : "Нет"}
                            </div>
                            <div className="mt-1 text-[12px] text-[#7c8099]">
                              
                              <span data-check="certificate-availability-card-visible">
                                {offer.certificateAvailability.label}
                              </span>
                            </div>
                          </div>
                        </div>

                        {offer.certificateAvailable ? (
                          <div className="mt-4 rounded-2xl border border-[#dbeafe] bg-[#eff6ff] p-4 text-[#1e3a8a]">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em]">
                              Certificate payment
                            </div>
                            <div className="mt-1 text-[18px] font-bold">
                              {getPublicCertificatePaymentLabel(offer)}
                            </div>
                            <div
                              data-check="certificate-availability-payment-visible"
                              className="mt-2 rounded-xl border border-[#bfdbfe] bg-white px-3 py-2 text-[12.5px] font-semibold text-[#1d4ed8]"
                            >
                              {offer.certificateAvailability.label}
                            </div>
                            <p className="mt-2 text-[12.5px] leading-5">
                              {offer.certificate.terms ??
                                "Условия сертификата пока не добавлены."}
                            </p>
                          </div>
                        ) : null}
                      </div>

                      <aside className="grid content-start gap-3 rounded-[18px] border border-[#edf0f7] bg-[#f8f9fd] p-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8099]">
                          Быстрые действия
                        </div>

                        <Link
                          href={`/offers/${offer.id}`}
                          className="rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-center text-[13px] font-bold text-[#4a4f6a] transition hover:bg-gray-50"
                        >
                          Подробное описание
                        </Link>

                        {offer.certificateAvailable ? (
                          <Link
                            href={`/certificates/new?offerId=${offer.id}`}
                            className="rounded-xl bg-[#3b6ef8] px-4 py-3 text-center text-[13px] font-bold text-white shadow-[0_10px_20px_rgba(59,110,248,0.22)] transition hover:bg-[#2f5fe3]"
                          >
                            Заказать сертификат
                          </Link>
                        ) : null}

                        <a
                          href="#register-purchase"
                          className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-center text-[13px] font-bold text-[#15803d] transition hover:bg-[#dcfce7]"
                        >
                          Зарегистрировать покупку
                        </a>
                      </aside>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <DirectoryPurchaseConfirmationForm
              organizationId={organization.id}
              organizationDefaultCurrency={organization.defaultCurrency}
            />

            <section className="flex flex-wrap gap-2">
              <Link
                href="/directory"
                className="rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[13px] font-bold text-[#4a4f6a] transition hover:bg-gray-50"
              >
                Назад в каталог
              </Link>

              <a
                href="#public-offers"
                className="rounded-xl bg-[#3b6ef8] px-4 py-3 text-[13px] font-bold text-white transition hover:bg-[#2f5fe3]"
              >
                Посмотреть предложения
              </a>

              <a
                href="#register-purchase"
                className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-[13px] font-bold text-[#15803d] transition hover:bg-[#dcfce7]"
              >
                Зарегистрировать покупку
              </a>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}


