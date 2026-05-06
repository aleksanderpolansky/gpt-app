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

type DirectoryOrganizationPageProps = {
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

function mapDirectoryOrganization(
  row: DirectoryOrganizationRow
): DirectoryOrganization {
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

  return {
    organization: mapDirectoryOrganization(
      data as unknown as DirectoryOrganizationRow
    ),
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

function getLocationLabel(location: DirectoryLocation | null) {
  if (!location) {
    return "Локация не указана";
  }

  if (location.addressVisibility === "hidden") {
    return "Адрес скрыт";
  }

  const parts = [
    location.city,
    location.district,
    location.addressVisibility === "public" ? location.streetAddress : null,
  ].filter(Boolean);

  if (parts.length === 0) {
    return "Локация не указана";
  }

  if (location.addressVisibility === "approximate") {
    return `${parts.join(", ")} · приблизительная локация`;
  }

  return parts.join(", ");
}

function getVerificationLabel(status: string | null | undefined) {
  if (status === "verified") {
    return "Проверено";
  }

  if (status === "pending") {
    return "На проверке";
  }

  if (status === "rejected") {
    return "Проверка отклонена";
  }

  if (status === "revoked") {
    return "Проверка отозвана";
  }

  return "Не проверено";
}

function getOrganizationTypeLabel(type: string | null | undefined) {
  if (type === "private_business") {
    return "Частное предприятие";
  }

  if (type === "company") {
    return "Компания";
  }

  if (type === "ngo") {
    return "Организация";
  }

  return type ?? "Предприятие";
}

function getAddressVisibilityLabel(visibility: string | null | undefined) {
  if (visibility === "public") {
    return "Публичный адрес";
  }

  if (visibility === "approximate") {
    return "Приблизительная локация";
  }

  if (visibility === "hidden") {
    return "Адрес скрыт";
  }

  return "Не указано";
}

function getOfferTypeLabel(type: string | null | undefined) {
  if (type === "bookable_service") {
    return "Услуга с бронированием";
  }

  if (type === "product") {
    return "Товар";
  }

  if (type === "service") {
    return "Услуга";
  }

  if (type === "bundle") {
    return "Набор / bundle";
  }

  if (type === "reward") {
    return "Reward offer";
  }

  return type ?? "Предложение";
}

function formatMoney(
  amount: number | null | undefined,
  currency: string | null | undefined
) {
  if (typeof amount !== "number") {
    return "—";
  }

  return `${new Intl.NumberFormat("pl-PL", {
    maximumFractionDigits: 2,
  }).format(amount)} ${currency ?? ""}`.trim();
}

function formatPoints(value: number | null | undefined) {
  if (typeof value !== "number") {
    return "0";
  }

  return new Intl.NumberFormat("pl-PL", {
    maximumFractionDigits: 2,
  }).format(value);
}

function getCertificatePaymentLabel(offer: PublicDirectoryOffer) {
  if (!offer.certificate.available) {
    return "Сертификат недоступен";
  }

  if (offer.certificate.paymentMode === "points_only") {
    return `${formatPoints(offer.certificate.pointsPrice)} POINTS`;
  }

  if (offer.certificate.paymentMode === "money_only") {
    return formatMoney(
      offer.certificate.moneyPrice,
      offer.certificate.currency ?? offer.currency
    );
  }

  if (offer.certificate.paymentMode === "mixed") {
    return `${formatPoints(
      offer.certificate.pointsPrice
    )} POINTS + ${formatMoney(
      offer.certificate.moneyPrice,
      offer.certificate.currency ?? offer.currency
    )}`;
  }

  return "Сертификат доступен";
}

function getBookingLabel(offer: PublicDirectoryOffer) {
  if (!offer.requiresBooking) {
    return "Бронирование не требуется";
  }

  if (offer.defaultDurationMinutes) {
    return `Требуется бронирование · ${offer.defaultDurationMinutes} мин.`;
  }

  return "Требуется бронирование";
}

function getOfferDetailHref(offerId: string) {
  return `/offers/${offerId}`;
}

function getCertificateOrderHref(offerId: string) {
  return `/certificates/new?offerId=${offerId}`;
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

  const offers = offersResult.offers;
  const offersErrorMessage = offersResult.errorMessage;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        color: "#111111",
        padding: "40px 16px",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <header style={{ marginBottom: "24px" }}>
          <Link
            href="/directory"
            style={{
              color: "#2563eb",
              textDecoration: "underline",
              display: "inline-block",
              marginBottom: "16px",
            }}
          >
            ← Назад в каталог
          </Link>

          {errorMessage ? (
            <>
              <h1
                style={{
                  fontSize: "32px",
                  lineHeight: "1.2",
                  fontWeight: 700,
                  margin: "0 0 10px",
                }}
              >
                Ошибка загрузки карточки
              </h1>

              <p
                style={{
                  margin: 0,
                  color: "#a40000",
                  fontSize: "16px",
                  lineHeight: "1.5",
                }}
              >
                {errorMessage}
              </p>
            </>
          ) : null}

          {organization ? (
            <>
              <div
                style={{
                  color: "#666666",
                  fontSize: "14px",
                  marginBottom: "8px",
                }}
              >
                {organization.primaryCategory?.name ?? "Категория не указана"}
              </div>

              <h1
                style={{
                  fontSize: "38px",
                  lineHeight: "1.15",
                  fontWeight: 700,
                  margin: "0 0 10px",
                }}
              >
                {organization.name}
              </h1>

              <p
                style={{
                  margin: "0 0 8px",
                  color: "#555555",
                  fontSize: "17px",
                  lineHeight: "1.5",
                }}
              >
                {organization.shortDescription ??
                  organization.description ??
                  "Описание пока не добавлено."}
              </p>

              <p
                style={{
                  margin: "0 0 16px",
                  color: "#666666",
                  fontSize: "14px",
                  lineHeight: "1.5",
                }}
              >
                На этой публичной карточке показывается только безопасная
                информация предприятия. Если адрес скрыт или указан
                приблизительно, точный адрес и точные координаты не раскрываются.
              </p>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <a
                  href="#register-purchase"
                  style={{
                    display: "inline-block",
                    padding: "11px 16px",
                    borderRadius: "8px",
                    border: "1px solid #16a34a",
                    background: "#16a34a",
                    color: "#ffffff",
                    textDecoration: "none",
                    fontWeight: 800,
                  }}
                >
                  Зарегистрировать покупку
                </a>

                <a
                  href="#public-offers"
                  style={{
                    display: "inline-block",
                    padding: "11px 16px",
                    borderRadius: "8px",
                    border: "1px solid #2563eb",
                    background: "#2563eb",
                    color: "#ffffff",
                    textDecoration: "none",
                    fontWeight: 700,
                  }}
                >
                  Посмотреть предложения
                </a>
              </div>
            </>
          ) : null}
        </header>

        {organization ? (
          <>
            <section
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "16px",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  border: "1px solid #dddddd",
                  borderRadius: "16px",
                  padding: "20px",
                  background: "#ffffff",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ color: "#666666", marginBottom: "8px" }}>
                  Тип
                </div>
                <div style={{ fontSize: "18px", fontWeight: 700 }}>
                  {getOrganizationTypeLabel(organization.type)}
                </div>
              </div>

              <div
                style={{
                  border: "1px solid #dddddd",
                  borderRadius: "16px",
                  padding: "20px",
                  background: "#ffffff",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ color: "#666666", marginBottom: "8px" }}>
                  Проверка
                </div>
                <div style={{ fontSize: "18px", fontWeight: 700 }}>
                  {getVerificationLabel(organization.verificationStatus)}
                </div>
              </div>

              <div
                style={{
                  border: "1px solid #dddddd",
                  borderRadius: "16px",
                  padding: "20px",
                  background: "#ffffff",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ color: "#666666", marginBottom: "8px" }}>
                  Локация
                </div>
                <div style={{ fontSize: "18px", fontWeight: 700 }}>
                  {getLocationLabel(organization.primaryLocation)}
                </div>
              </div>
            </section>

            <section
              style={{
                border: "1px solid #dddddd",
                borderRadius: "16px",
                background: "#ffffff",
                overflow: "hidden",
                boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  padding: "20px 24px",
                  borderBottom: "1px solid #eeeeee",
                }}
              >
                <h2 style={{ margin: 0, fontSize: "22px" }}>
                  Информация о предприятии
                </h2>
                <p style={{ margin: "6px 0 0", color: "#666666" }}>
                  Базовая публичная информация из каталога.
                </p>
              </div>

              <div
                style={{
                  padding: "20px 24px",
                  display: "grid",
                  gap: "12px",
                }}
              >
                <div>
                  <strong>Категория:</strong>{" "}
                  {organization.primaryCategory?.name ?? "Не указана"}
                </div>

                <div>
                  <strong>Страна:</strong>{" "}
                  {organization.countryCode ?? "Не указана"}
                </div>

                <div>
                  <strong>Валюта:</strong>{" "}
                  {organization.defaultCurrency ?? "Не указана"}
                </div>

                <div>
                  <strong>Видимость адреса:</strong>{" "}
                  {getAddressVisibilityLabel(
                    organization.primaryLocation?.addressVisibility
                  )}
                </div>

                <div>
                  <strong>Город:</strong>{" "}
                  {organization.primaryLocation?.city ?? "Не указан"}
                </div>

                {organization.primaryLocation?.district ? (
                  <div>
                    <strong>Район:</strong>{" "}
                    {organization.primaryLocation.district}
                  </div>
                ) : null}

                {organization.primaryLocation?.streetAddress ? (
                  <div>
                    <strong>Адрес:</strong>{" "}
                    {organization.primaryLocation.streetAddress}
                  </div>
                ) : null}

                {organization.publicEmail ? (
                  <div>
                    <strong>Email:</strong> {organization.publicEmail}
                  </div>
                ) : null}

                {organization.publicPhone ? (
                  <div>
                    <strong>Телефон:</strong> {organization.publicPhone}
                  </div>
                ) : null}

                {organization.websiteUrl ? (
                  <div>
                    <strong>Сайт:</strong>{" "}
                    <a
                      href={organization.websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {organization.websiteUrl}
                    </a>
                  </div>
                ) : null}

                {organization.bookingUrl ? (
                  <div>
                    <strong>Бронирование:</strong>{" "}
                    <a
                      href={organization.bookingUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {organization.bookingUrl}
                    </a>
                  </div>
                ) : null}
              </div>
            </section>

            <DirectoryPurchaseConfirmationForm
              organizationId={organization.id}
              organizationDefaultCurrency={organization.defaultCurrency}
            />

            <section
              style={{
                border: "1px solid #bfdbfe",
                borderRadius: "16px",
                background: "#eff6ff",
                padding: "20px 24px",
                marginBottom: "24px",
                color: "#1e3a8a",
              }}
            >
              <h2 style={{ margin: "0 0 8px", fontSize: "20px" }}>
                Offers, certificates и POINTS
              </h2>
              <p style={{ margin: 0, lineHeight: "1.5" }}>
                POINTS — это бонусные единицы программы лояльности, а не деньги,
                валюта или средство платежа. Публичные предложения ниже
                показывают только безопасные условия для покупателя.
              </p>
            </section>

            <section
              id="public-offers"
              style={{
                border: "1px solid #dddddd",
                borderRadius: "16px",
                background: "#ffffff",
                overflow: "hidden",
                boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  padding: "20px 24px",
                  borderBottom: "1px solid #eeeeee",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h2 style={{ margin: 0, fontSize: "22px" }}>
                    Публичные предложения
                  </h2>
                  <p style={{ margin: "6px 0 0", color: "#666666" }}>
                    Товары, услуги, наборы и сертификаты, доступные в публичной
                    карточке предприятия.
                  </p>
                </div>

                <div
                  style={{
                    border: "1px solid #dddddd",
                    borderRadius: "999px",
                    padding: "7px 12px",
                    color: "#444444",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
                  {offers.length} предложений
                </div>
              </div>

              {offersErrorMessage ? (
                <div
                  style={{
                    padding: "20px 24px",
                    color: "#a40000",
                    background: "#fff5f5",
                    borderBottom: "1px solid #f2b8b5",
                  }}
                >
                  {offersErrorMessage}
                </div>
              ) : null}

              {offers.length === 0 ? (
                <div style={{ padding: "24px", color: "#666666" }}>
                  У этого предприятия пока нет публичных предложений.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: "16px",
                    padding: "20px",
                  }}
                >
                  {offers.map((offer) => (
                    <article
                      key={offer.id}
                      style={{
                        border: "1px solid #dddddd",
                        borderRadius: "16px",
                        padding: "18px",
                        background: "#ffffff",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                        display: "grid",
                        gap: "10px",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            color: "#666666",
                            fontSize: "13px",
                            marginBottom: "6px",
                          }}
                        >
                          {getOfferTypeLabel(offer.offerType)}
                        </div>

                        <h3
                          style={{
                            margin: 0,
                            fontSize: "20px",
                            lineHeight: "1.25",
                          }}
                        >
                          {offer.title}
                        </h3>
                      </div>

                      <p
                        style={{
                          margin: 0,
                          color: "#555555",
                          lineHeight: "1.5",
                        }}
                      >
                        {offer.description ?? "Описание пока не добавлено."}
                      </p>

                      <div
                        style={{
                          display: "grid",
                          gap: "6px",
                          color: "#444444",
                          fontSize: "14px",
                        }}
                      >
                        <div>
                          <strong>Цена:</strong>{" "}
                          {offer.isFree
                            ? "Бесплатно"
                            : formatMoney(offer.price, offer.currency)}
                        </div>

                        {offer.regularPrice ? (
                          <div>
                            <strong>Обычная цена:</strong>{" "}
                            {formatMoney(offer.regularPrice, offer.currency)}
                          </div>
                        ) : null}

                        <div>
                          <strong>Бронирование:</strong>{" "}
                          {getBookingLabel(offer)}
                        </div>

                        <div>
                          <strong>Сертификат:</strong>{" "}
                          {offer.certificateAvailable
                            ? "Доступен"
                            : "Недоступен"}
                        </div>

                        {offer.certificateAvailable ? (
                          <>
                            <div>
                              <strong>Стоимость сертификата:</strong>{" "}
                              {getCertificatePaymentLabel(offer)}
                            </div>

                            <div>
                              <strong>Срок действия:</strong>{" "}
                              {offer.certificate.validityDays
                                ? `${offer.certificate.validityDays} дней`
                                : "Не указан"}
                            </div>

                            <div>
                              <strong>Можно отменить:</strong>{" "}
                              {offer.certificate.isCancellable ? "Да" : "Нет"}
                            </div>

                            <div>
                              <strong>Можно передать:</strong>{" "}
                              {offer.certificate.isTransferable ? "Да" : "Нет"}
                            </div>

                            {offer.certificate.terms ? (
                              <div>
                                <strong>Условия:</strong>{" "}
                                {offer.certificate.terms}
                              </div>
                            ) : null}
                          </>
                        ) : null}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          flexWrap: "wrap",
                          marginTop: "4px",
                        }}
                      >
                        <Link
                          href={getOfferDetailHref(offer.id)}
                          style={{
                            display: "inline-block",
                            padding: "9px 12px",
                            borderRadius: "8px",
                            border: "1px solid #dddddd",
                            background: "#ffffff",
                            color: "#111111",
                            textDecoration: "none",
                            fontWeight: 600,
                          }}
                        >
                          Подробное описание
                        </Link>

                        {offer.certificateAvailable ? (
                          <Link
                            href={getCertificateOrderHref(offer.id)}
                            style={{
                              display: "inline-block",
                              padding: "9px 12px",
                              borderRadius: "8px",
                              border: "1px solid #2563eb",
                              background: "#2563eb",
                              color: "#ffffff",
                              textDecoration: "none",
                              fontWeight: 700,
                            }}
                          >
                            Заказать сертификат
                          </Link>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <Link
                href="/directory"
                style={{
                  display: "inline-block",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #dddddd",
                  background: "#ffffff",
                  color: "#111111",
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                Назад в каталог
              </Link>

              <a
                href="#register-purchase"
                style={{
                  display: "inline-block",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #16a34a",
                  background: "#16a34a",
                  color: "#ffffff",
                  textDecoration: "none",
                  fontWeight: 800,
                }}
              >
                Зарегистрировать покупку
              </a>

              <a
                href="#public-offers"
                style={{
                  display: "inline-block",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #2563eb",
                  background: "#2563eb",
                  color: "#ffffff",
                  textDecoration: "none",
                  fontWeight: 700,
                }}
              >
                Посмотреть предложения
              </a>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}