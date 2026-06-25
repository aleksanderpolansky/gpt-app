import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

import {
  getOffersMessages,
  type OffersMessages,
} from "../../../i18n/messages/offers";
import {
  getOfferTypeLabel,
  getSystemLabelsMessages,
} from "../../../i18n/messages/system-labels";

export const dynamic = "force-dynamic";

type OfferPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    locale?: string | string[];
    lang?: string | string[];
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

type OfferRow = {
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

type OrganizationRow = {
  id: string;
  organization_name: string;
  organization_type: string;
  public_slug: string | null;
  directory_status: string | null;
  verification_status: string | null;
  is_public_profile_enabled: boolean | null;
  is_listed_in_directory: boolean | null;
  status: string | null;
  country_code: string | null;
  default_currency: string | null;
};

type PublicOffer = {
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

type OfferPageData = {
  offer: PublicOffer | null;
  organization: OrganizationRow | null;
  errorMessage: string | null;
};

function mapPublicOffer(row: OfferRow): PublicOffer {
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

async function getOfferPageData(offerId: string): Promise<OfferPageData> {
  const nowIso = new Date().toISOString();

  const { data: offerData, error: offerError } = await supabase
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
    .eq("id", offerId)
    .eq("status", "active")
    .or(`valid_from.is.null,valid_from.lte.${nowIso}`)
    .or(`valid_until.is.null,valid_until.gte.${nowIso}`)
    .single();

  if (offerError || !offerData) {
    if (offerError?.code === "PGRST116") {
      return {
        offer: null,
        organization: null,
        errorMessage: null,
      };
    }

    return {
      offer: null,
      organization: null,
      errorMessage: offerError?.message ?? "Cannot load offer",
    };
  }

  const offer = mapPublicOffer(offerData as unknown as OfferRow);

  if (!offer.organizationId) {
    return {
      offer,
      organization: null,
      errorMessage: null,
    };
  }

  const { data: organizationData, error: organizationError } = await supabase
    .from("organizations")
    .select(
      `
      id,
      organization_name,
      organization_type,
      public_slug,
      directory_status,
      verification_status,
      is_public_profile_enabled,
      is_listed_in_directory,
      status,
      country_code,
      default_currency
    `
    )
    .eq("id", offer.organizationId)
    .eq("status", "active")
    .single();

  if (organizationError || !organizationData) {
    return {
      offer,
      organization: null,
      errorMessage: null,
    };
  }

  return {
    offer,
    organization: organizationData as OrganizationRow,
    errorMessage: null,
  };
}

function formatMoney(
  amount: number | null | undefined,
  currency: string | null | undefined
) {
  if (typeof amount !== "number") {
    return "â€”";
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

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "â€”";
  }

  return new Intl.DateTimeFormat("pl-PL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getPublicOfferTypeLabel(type: string | null | undefined, locale: string) {
  return getOfferTypeLabel(type ?? "", locale);
}

function getBookingLabel(
  offer: PublicOffer,
  systemLabels: ReturnType<typeof getSystemLabelsMessages>,
) {
  if (!offer.requiresBooking) {
    return systemLabels.booking.notRequired;
  }

  if (offer.defaultDurationMinutes) {
    return systemLabels.booking.requiredWithDuration(offer.defaultDurationMinutes);
  }

  return systemLabels.booking.required;
}

function getCertificatePaymentLabel(
  offer: PublicOffer,
  systemLabels: ReturnType<typeof getSystemLabelsMessages>,
) {
  if (!offer.certificate.available) {
    return systemLabels.certificatePaymentModes.unavailable;
  }

  if (offer.certificate.paymentMode === "points_only") {
    return `${formatPoints(offer.certificate.pointsPrice)} POINTS`;
  }

  if (offer.certificate.paymentMode === "money_only") {
    return formatMoney(
      offer.certificate.moneyPrice,
      offer.certificate.currency ?? offer.currency,
    );
  }

  if (offer.certificate.paymentMode === "mixed") {
    return `${formatPoints(offer.certificate.pointsPrice)} POINTS + ${formatMoney(
      offer.certificate.moneyPrice,
      offer.certificate.currency ?? offer.currency,
    )}`;
  }

  return systemLabels.certificatePaymentModes.available;
}

function getDirectoryHref(organization: OrganizationRow | null) {
  if (
    organization?.public_slug &&
    organization.directory_status === "published" &&
    organization.is_public_profile_enabled &&
    organization.is_listed_in_directory
  ) {
    return `/directory/${organization.public_slug}`;
  }

  return "/directory";
}

function getRegisterPurchaseHref(organization: OrganizationRow | null) {
  const directoryHref = getDirectoryHref(organization);

  if (directoryHref === "/directory") {
    return directoryHref;
  }

  return `${directoryHref}#register-purchase`;
}

function getCertificateOrderHref(offerId: string) {
  return `/certificates/new?offerId=${offerId}`;
}

function getStatusLabel(status: string | null | undefined, t: OffersMessages) {
  if (status === "active") {
    return t.status.active;
  }

  if (status === "draft") {
    return t.status.draft;
  }

  if (status === "archived") {
    return t.status.archived;
  }

  if (status === "inactive") {
    return t.status.inactive;
  }

  return status ?? t.common.dash;
}

export default async function OfferDetailPage({
  params,
  searchParams,
}: OfferPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const selectedLocale =
    normalizeLocaleParam(resolvedSearchParams?.locale) ||
    normalizeLocaleParam(resolvedSearchParams?.lang);
  const t = getOffersMessages(selectedLocale);
  const systemLabels = getSystemLabelsMessages(selectedLocale);
  const offerId = resolvedParams.id;

  const { offer, organization, errorMessage } = await getOfferPageData(offerId);

  if (!offer && !errorMessage) {
    notFound();
  }

  const directoryHref = appendLocaleToHref(
    getDirectoryHref(organization),
    selectedLocale,
  );
  const registerPurchaseHref = appendLocaleToHref(
    getRegisterPurchaseHref(organization),
    selectedLocale,
  );
  const certificateOrderHref = offer
    ? appendLocaleToHref(getCertificateOrderHref(offer.id), selectedLocale)
    : appendLocaleToHref("/certificates/new", selectedLocale);

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
          maxWidth: "1050px",
          margin: "0 auto",
        }}
      >
        <header style={{ marginBottom: "24px" }}>
          <Link
            href={directoryHref}
            style={{
              color: "#2563eb",
              textDecoration: "underline",
              display: "inline-block",
              marginBottom: "16px",
            }}
          >
            â† ÐÐ°Ð·Ð°Ð´ Ðº Ð¿Ñ€ÐµÐ´Ð¿Ñ€Ð¸ÑÑ‚Ð¸ÑŽ
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
                ÐžÑˆÐ¸Ð±ÐºÐ° Ð·Ð°Ð³Ñ€ÑƒÐ·ÐºÐ¸ Ð¿Ñ€ÐµÐ´Ð»Ð¾Ð¶ÐµÐ½Ð¸Ñ
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

          {offer ? (
            <>
              <div
                style={{
                  color: "#666666",
                  fontSize: "14px",
                  marginBottom: "8px",
                }}
              >
                {getPublicOfferTypeLabel(offer.offerType, selectedLocale)}
              </div>

              <h1
                style={{
                  fontSize: "38px",
                  lineHeight: "1.15",
                  fontWeight: 700,
                  margin: "0 0 10px",
                }}
              >
                {offer.title}
              </h1>

              <p
                style={{
                  margin: "0 0 12px",
                  color: "#555555",
                  fontSize: "17px",
                  lineHeight: "1.5",
                }}
              >
                {offer.description ?? "ÐžÐ¿Ð¸ÑÐ°Ð½Ð¸Ðµ Ð¿Ð¾ÐºÐ° Ð½Ðµ Ð´Ð¾Ð±Ð°Ð²Ð»ÐµÐ½Ð¾."}
              </p>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <Link
                  href={directoryHref}
                  style={{
                    display: "inline-block",
                    padding: "11px 16px",
                    borderRadius: "8px",
                    border: "1px solid #dddddd",
                    background: "#ffffff",
                    color: "#111111",
                    textDecoration: "none",
                    fontWeight: 700,
                  }}
                >
                  ÐŸÑƒÐ±Ð»Ð¸Ñ‡Ð½Ð°Ñ ÐºÐ°Ñ€Ñ‚Ð¾Ñ‡ÐºÐ° Ð¿Ñ€ÐµÐ´Ð¿Ñ€Ð¸ÑÑ‚Ð¸Ñ
                </Link>

                <Link
                  href={registerPurchaseHref}
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
                  Ð—Ð°Ñ€ÐµÐ³Ð¸ÑÑ‚Ñ€Ð¸Ñ€Ð¾Ð²Ð°Ñ‚ÑŒ Ð¿Ð¾ÐºÑƒÐ¿ÐºÑƒ Ñƒ Ð¿Ñ€ÐµÐ´Ð¿Ñ€Ð¸ÑÑ‚Ð¸Ñ
                </Link>
              </div>
            </>
          ) : null}
        </header>

        {offer ? (
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
                  Ð¦ÐµÐ½Ð° offer
                </div>
                <div style={{ fontSize: "20px", fontWeight: 700 }}>
                  {offer.isFree
                    ? "Ð‘ÐµÑÐ¿Ð»Ð°Ñ‚Ð½Ð¾"
                    : formatMoney(offer.price, offer.currency)}
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
                  Ð‘Ñ€Ð¾Ð½Ð¸Ñ€Ð¾Ð²Ð°Ð½Ð¸Ðµ
                </div>
                <div style={{ fontSize: "20px", fontWeight: 700 }}>
                  {getBookingLabel(offer, systemLabels)}
                </div>
              </div>

              <div
                style={{
                  border: "1px solid #bfdbfe",
                  borderRadius: "16px",
                  padding: "20px",
                  background: "#eff6ff",
                  color: "#1e3a8a",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ marginBottom: "8px" }}>
                  Ð¡ÐµÑ€Ñ‚Ð¸Ñ„Ð¸ÐºÐ°Ñ‚ Ð¿Ð¾ offer
                </div>
                <div style={{ fontSize: "20px", fontWeight: 800 }}>
                  {offer.certificateAvailable ? "Ð”Ð¾ÑÑ‚ÑƒÐ¿ÐµÐ½" : "ÐÐµÐ´Ð¾ÑÑ‚ÑƒÐ¿ÐµÐ½"}
                </div>
              </div>
            </section>

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
                Offer, ÑÐµÑ€Ñ‚Ð¸Ñ„Ð¸ÐºÐ°Ñ‚ Ð¸ Ñ€ÐµÐ³Ð¸ÑÑ‚Ñ€Ð°Ñ†Ð¸Ñ Ð¿Ð¾ÐºÑƒÐ¿ÐºÐ¸
              </h2>
              <p style={{ margin: 0, lineHeight: "1.5" }}>
                Ð­Ñ‚Ð° ÑÑ‚Ñ€Ð°Ð½Ð¸Ñ†Ð° Ð¾Ð¿Ð¸ÑÑ‹Ð²Ð°ÐµÑ‚ ÐºÐ¾Ð½ÐºÑ€ÐµÑ‚Ð½Ñ‹Ð¹ offer. Ð¡ÐµÑ€Ñ‚Ð¸Ñ„Ð¸ÐºÐ°Ñ‚ ÑÐ¾Ð·Ð´Ð°Ñ‘Ñ‚ÑÑ Ð¿Ð¾
                ÑÑ‚Ð¾Ð¼Ñƒ offer. Ð ÐµÐ³Ð¸ÑÑ‚Ñ€Ð°Ñ†Ð¸Ñ Ð¿Ð¾ÐºÑƒÐ¿ÐºÐ¸ Ð¾Ñ‚Ð½Ð¾ÑÐ¸Ñ‚ÑÑ Ð½Ðµ Ðº ÐºÐ¾Ð½ÐºÑ€ÐµÑ‚Ð½Ð¾Ð¼Ñƒ
                offer, Ð° Ðº Ð¿Ñ€ÐµÐ´Ð¿Ñ€Ð¸ÑÑ‚Ð¸ÑŽ Ð² Ñ†ÐµÐ»Ð¾Ð¼: Ð¿Ð¾ÐºÑƒÐ¿Ð°Ñ‚ÐµÐ»ÑŒ Ð¼Ð¾Ð¶ÐµÑ‚ ÐºÑƒÐ¿Ð¸Ñ‚ÑŒ Ð»ÑŽÐ±Ð¾Ð¹
                Ñ‚Ð¾Ð²Ð°Ñ€ Ð¸Ð»Ð¸ ÑƒÑÐ»ÑƒÐ³Ñƒ Ñƒ Ð¿Ñ€ÐµÐ´Ð¿Ñ€Ð¸ÑÑ‚Ð¸Ñ, Ð° Ð¿Ñ€Ð¾Ð´Ð°Ð²ÐµÑ† Ð¿Ð¾Ð´Ñ‚Ð²ÐµÑ€Ð¶Ð´Ð°ÐµÑ‚ Ñ„Ð°ÐºÑ‚
                Ð¿Ð¾ÐºÑƒÐ¿ÐºÐ¸.
              </p>
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
                  ÐŸÐ¾Ð´Ñ€Ð¾Ð±Ð½Ð¾Ðµ Ð¾Ð¿Ð¸ÑÐ°Ð½Ð¸Ðµ offer
                </h2>
                <p style={{ margin: "6px 0 0", color: "#666666" }}>
                  ÐŸÑƒÐ±Ð»Ð¸Ñ‡Ð½Ð°Ñ Ð¸Ð½Ñ„Ð¾Ñ€Ð¼Ð°Ñ†Ð¸Ñ Ð¾ Ð²Ñ‹Ð±Ñ€Ð°Ð½Ð½Ð¾Ð¼ Ð¿Ñ€ÐµÐ´Ð»Ð¾Ð¶ÐµÐ½Ð¸Ð¸.
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
                  <strong>ÐŸÑ€ÐµÐ´Ð¿Ñ€Ð¸ÑÑ‚Ð¸Ðµ:</strong>{" "}
                  {organization?.organization_name ?? "ÐÐµ ÑƒÐºÐ°Ð·Ð°Ð½Ð¾"}
                </div>

                <div>
                  <strong>Ð¢Ð¸Ð¿ Ð¿Ñ€ÐµÐ´Ð»Ð¾Ð¶ÐµÐ½Ð¸Ñ:</strong>{" "}
                  {getPublicOfferTypeLabel(offer.offerType, selectedLocale)}
                </div>

                <div>
                  <strong>Ð¡Ñ‚Ð°Ñ‚ÑƒÑ:</strong> {getStatusLabel(offer.status, t)}
                </div>

                <div>
                  <strong>Ð¦ÐµÐ½Ð° offer:</strong>{" "}
                  {offer.isFree
                    ? "Ð‘ÐµÑÐ¿Ð»Ð°Ñ‚Ð½Ð¾"
                    : formatMoney(offer.price, offer.currency)}
                </div>

                {offer.regularPrice ? (
                  <div>
                    <strong>ÐžÐ±Ñ‹Ñ‡Ð½Ð°Ñ Ñ†ÐµÐ½Ð°:</strong>{" "}
                    {formatMoney(offer.regularPrice, offer.currency)}
                  </div>
                ) : null}

                {offer.isDiscountActive ? (
                  <div>
                    <strong>Ð¡ÐºÐ¸Ð´ÐºÐ°:</strong>{" "}
                    {offer.discountType ?? "discount"}{" "}
                    {offer.discountValue ?? ""}
                  </div>
                ) : null}

                {offer.lowestPrice30Days ? (
                  <div>
                    <strong>Ð¡Ð°Ð¼Ð°Ñ Ð½Ð¸Ð·ÐºÐ°Ñ Ñ†ÐµÐ½Ð° Ð·Ð° 30 Ð´Ð½ÐµÐ¹:</strong>{" "}
                    {formatMoney(
                      offer.lowestPrice30Days,
                      offer.lowestPrice30DaysCurrency ?? offer.currency
                    )}
                  </div>
                ) : null}

                {offer.discountLegalNote ? (
                  <div>
                    <strong>ÐŸÑ€Ð¸Ð¼ÐµÑ‡Ð°Ð½Ð¸Ðµ Ðº ÑÐºÐ¸Ð´ÐºÐµ:</strong>{" "}
                    {offer.discountLegalNote}
                  </div>
                ) : null}

                <div>
                  <strong>Ð‘Ñ€Ð¾Ð½Ð¸Ñ€Ð¾Ð²Ð°Ð½Ð¸Ðµ:</strong> {getBookingLabel(offer, systemLabels)}
                </div>

                {offer.minDurationMinutes || offer.maxDurationMinutes ? (
                  <div>
                    <strong>Ð”Ð»Ð¸Ñ‚ÐµÐ»ÑŒÐ½Ð¾ÑÑ‚ÑŒ:</strong>{" "}
                    {offer.minDurationMinutes
                      ? `${offer.minDurationMinutes} Ð¼Ð¸Ð½.`
                      : "â€”"}{" "}
                    â€”{" "}
                    {offer.maxDurationMinutes
                      ? `${offer.maxDurationMinutes} Ð¼Ð¸Ð½.`
                      : "â€”"}
                  </div>
                ) : null}

                {offer.quantityLimit ? (
                  <div>
                    <strong>Ð›Ð¸Ð¼Ð¸Ñ‚ ÐºÐ¾Ð»Ð¸Ñ‡ÐµÑÑ‚Ð²Ð°:</strong> {offer.quantityLimit}
                  </div>
                ) : null}

                <div>
                  <strong>Ð”ÐµÐ¹ÑÑ‚Ð²ÑƒÐµÑ‚ Ñ:</strong> {formatDate(offer.validFrom)}
                </div>

                <div>
                  <strong>Ð”ÐµÐ¹ÑÑ‚Ð²ÑƒÐµÑ‚ Ð´Ð¾:</strong>{" "}
                  {formatDate(offer.validUntil)}
                </div>
              </div>
            </section>

            <section
              style={{
                border: offer.certificateAvailable
                  ? "1px solid #bfdbfe"
                  : "1px solid #dddddd",
                borderRadius: "16px",
                background: offer.certificateAvailable ? "#eff6ff" : "#ffffff",
                overflow: "hidden",
                boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  padding: "20px 24px",
                  borderBottom: offer.certificateAvailable
                    ? "1px solid #bfdbfe"
                    : "1px solid #eeeeee",
                }}
              >
                <h2 style={{ margin: 0, fontSize: "22px" }}>
                  Ð¡ÐµÑ€Ñ‚Ð¸Ñ„Ð¸ÐºÐ°Ñ‚ Ð¿Ð¾ ÑÑ‚Ð¾Ð¼Ñƒ offer
                </h2>
                <p style={{ margin: "6px 0 0", color: "#666666" }}>
                  Ð—Ð´ÐµÑÑŒ Ð¿Ð¾ÐºÐ°Ð·Ð°Ð½Ñ‹ ÑƒÑÐ»Ð¾Ð²Ð¸Ñ ÑÐµÑ€Ñ‚Ð¸Ñ„Ð¸ÐºÐ°Ñ‚Ð°. ÐžÑ„Ð¾Ñ€Ð¼Ð»ÐµÐ½Ð¸Ðµ ÑÐµÑ€Ñ‚Ð¸Ñ„Ð¸ÐºÐ°Ñ‚Ð°
                  Ð²Ñ‹Ð¿Ð¾Ð»Ð½ÑÐµÑ‚ÑÑ Ð½Ð° Ð¾Ñ‚Ð´ÐµÐ»ÑŒÐ½Ð¾Ð¹ ÑÑ‚Ñ€Ð°Ð½Ð¸Ñ†Ðµ Ð·Ð°ÐºÐ°Ð·Ð°.
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
                  <strong>Ð”Ð¾ÑÑ‚ÑƒÐ¿Ð½Ð¾ÑÑ‚ÑŒ:</strong>{" "}
                  {offer.certificateAvailable ? "Ð”Ð¾ÑÑ‚ÑƒÐ¿ÐµÐ½" : "ÐÐµÐ´Ð¾ÑÑ‚ÑƒÐ¿ÐµÐ½"}
                </div>

                {offer.certificateAvailable ? (
                  <>
                    <div>
                      <strong>Ð¡Ñ‚Ð¾Ð¸Ð¼Ð¾ÑÑ‚ÑŒ ÑÐµÑ€Ñ‚Ð¸Ñ„Ð¸ÐºÐ°Ñ‚Ð°:</strong>{" "}
                      {getCertificatePaymentLabel(offer, systemLabels)}
                    </div>

                    <div>
                      <strong>Ð¡Ñ€Ð¾Ðº Ð´ÐµÐ¹ÑÑ‚Ð²Ð¸Ñ:</strong>{" "}
                      {offer.certificate.validityDays
                        ? `${offer.certificate.validityDays} Ð´Ð½ÐµÐ¹`
                        : "ÐÐµ ÑƒÐºÐ°Ð·Ð°Ð½"}
                    </div>

                    <div>
                      <strong>Ð¢Ñ€ÐµÐ±ÑƒÐµÑ‚ÑÑ Ð¿Ð¾Ð´Ñ‚Ð²ÐµÑ€Ð¶Ð´ÐµÐ½Ð¸Ðµ Ð¿Ñ€Ð¾Ð´Ð°Ð²Ñ†Ð°:</strong>{" "}
                      {offer.certificate.requiresSellerConfirmation
                        ? "Ð”Ð°"
                        : "ÐÐµÑ‚"}
                    </div>

                    <div>
                      <strong>ÐœÐ¾Ð¶Ð½Ð¾ Ð¾Ñ‚Ð¼ÐµÐ½Ð¸Ñ‚ÑŒ:</strong>{" "}
                      {offer.certificate.isCancellable ? "Ð”Ð°" : "ÐÐµÑ‚"}
                    </div>

                    <div>
                      <strong>ÐœÐ¾Ð¶Ð½Ð¾ Ð¿ÐµÑ€ÐµÐ´Ð°Ñ‚ÑŒ:</strong>{" "}
                      {offer.certificate.isTransferable ? "Ð”Ð°" : "ÐÐµÑ‚"}
                    </div>

                    <div>
                      <strong>ÐŸÐ¾Ð»Ð¸Ñ‚Ð¸ÐºÐ° Ð²Ð¾Ð·Ð²Ñ€Ð°Ñ‚Ð° POINTS:</strong>{" "}
                      {offer.certificate.pointsRefundPolicy}
                    </div>

                    {offer.certificate.maxCertificatesTotal ? (
                      <div>
                        <strong>ÐœÐ°ÐºÑÐ¸Ð¼ÑƒÐ¼ ÑÐµÑ€Ñ‚Ð¸Ñ„Ð¸ÐºÐ°Ñ‚Ð¾Ð²:</strong>{" "}
                        {offer.certificate.maxCertificatesTotal}
                      </div>
                    ) : null}

                    {offer.certificate.terms ? (
                      <div>
                        <strong>Ð£ÑÐ»Ð¾Ð²Ð¸Ñ ÑÐµÑ€Ñ‚Ð¸Ñ„Ð¸ÐºÐ°Ñ‚Ð°:</strong>{" "}
                        {offer.certificate.terms}
                      </div>
                    ) : null}

                    <div style={{ marginTop: "8px" }}>
                      <Link
                        href={certificateOrderHref}
                        style={{
                          display: "inline-block",
                          padding: "11px 16px",
                          borderRadius: "8px",
                          border: "1px solid #2563eb",
                          background: "#2563eb",
                          color: "#ffffff",
                          textDecoration: "none",
                          fontWeight: 800,
                        }}
                      >
                        ÐŸÐµÑ€ÐµÐ¹Ñ‚Ð¸ Ðº Ð·Ð°ÐºÐ°Ð·Ñƒ ÑÐµÑ€Ñ‚Ð¸Ñ„Ð¸ÐºÐ°Ñ‚Ð°
                      </Link>
                    </div>
                  </>
                ) : null}
              </div>
            </section>

            <section
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <Link
                href={directoryHref}
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
                ÐÐ°Ð·Ð°Ð´ Ðº Ð¿Ñ€ÐµÐ´Ð¿Ñ€Ð¸ÑÑ‚Ð¸ÑŽ
              </Link>

              {offer.certificateAvailable ? (
                <Link
                  href={certificateOrderHref}
                  style={{
                    display: "inline-block",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #2563eb",
                    background: "#2563eb",
                    color: "#ffffff",
                    textDecoration: "none",
                    fontWeight: 800,
                  }}
                >
                  ÐŸÐµÑ€ÐµÐ¹Ñ‚Ð¸ Ðº Ð·Ð°ÐºÐ°Ð·Ñƒ ÑÐµÑ€Ñ‚Ð¸Ñ„Ð¸ÐºÐ°Ñ‚Ð°
                </Link>
              ) : null}

              <Link
                href={registerPurchaseHref}
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
                Ð—Ð°Ñ€ÐµÐ³Ð¸ÑÑ‚Ñ€Ð¸Ñ€Ð¾Ð²Ð°Ñ‚ÑŒ Ð¿Ð¾ÐºÑƒÐ¿ÐºÑƒ Ñƒ Ð¿Ñ€ÐµÐ´Ð¿Ñ€Ð¸ÑÑ‚Ð¸Ñ
              </Link>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
