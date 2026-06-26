import { auth0 } from "../../../lib/auth0";
import { supabase } from "../../../lib/supabase";
import LocalDateTime from "../../components/LocalDateTime";
import RedeemCertificateButton from "./components/RedeemCertificateButton";
import {
  getCertificatesMessages,
  getCertificateText,
} from "../../i18n/messages/certificates";

export const dynamic = "force-dynamic";

type RelatedOrganization =
  | {
      id: string;
      organization_name: string | null;
      organization_type: string | null;
      country_code: string | null;
      default_currency: string | null;
      status: string | null;
      created_by_user_id: string | null;
    }
  | {
      id: string;
      organization_name: string | null;
      organization_type: string | null;
      country_code: string | null;
      default_currency: string | null;
      status: string | null;
      created_by_user_id: string | null;
    }[]
  | null;

type RelatedOffer =
  | {
      id: string;
      title: string | null;
      offer_type: string | null;
      price: number | null;
      currency: string | null;
      certificate_terms: string | null;
      certificate_validity_days: number | null;
    }
  | {
      id: string;
      title: string | null;
      offer_type: string | null;
      price: number | null;
      currency: string | null;
      certificate_terms: string | null;
      certificate_validity_days: number | null;
    }[]
  | null;

type CertificateRecord = {
  id: string;
  organization_id: string;
  offer_id: string;
  buyer_user_id: string;
  receiver_person_name: string | null;
  receiver_email: string | null;
  message: string | null;
  certificate_code: string;
  public_code: string | null;
  redeem_code: string | null;
  points_price: number;
  money_price: number | null;
  currency: string | null;
  status: string;
  points_status: string;
  points_reserved: number;
  points_charged: number;
  points_released: number;
  requested_at: string;
  seller_confirmed_at: string | null;
  delivered_at: string | null;
  redeemed_at: string | null;
  cancelled_at: string | null;
  rejected_at: string | null;
  expired_at: string | null;
  created_at: string;
  updated_at: string;
  payment_mode: string;
  points_currency_code: string;
  reference_currency: string;
  reference_value_per_point: number;
  reference_value_total: number | null;
  seller_comment: string | null;
  buyer_comment: string | null;
  organizations: RelatedOrganization;
  offers: RelatedOffer;
};

type AppUser = {
  id: string;
  auth0_sub: string;
  email?: string | null;
  name?: string | null;
};

type PageData = {
  certificates: CertificateRecord[];
  errorMessage: string | null;
};

type SellerTimelineItem = {
  title: string;
  description: string;
  date: string | null;
  tone: "done" | "active" | "warning" | "neutral";
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


type SellerCertificatesPageProps = {
  searchParams?: Promise<{
    locale?: string | string[];
    lang?: string | string[];
  }>;
};

function getFirstSearchParam(
  value: string | string[] | undefined
): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function appendLocaleToHref(href: string, locale: string) {
  const separator = href.includes("?") ? "&" : "?";
  return href + separator + "locale=" + encodeURIComponent(locale);
}
function formatNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "0";
  }

  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return String(value);
  }

  return new Intl.NumberFormat("pl-PL", {
    maximumFractionDigits: 2,
  }).format(numericValue);
}

function formatMoney(
  value: number | string | null | undefined,
  currency: string | null | undefined
) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return `${formatNumber(value)} ${currency || ""}`.trim();
}

function getStatusLabel(
  status: string | null | undefined,
  commonMessages: Record<string, string> = {}
) {
  if (status === "requested") {
    return getCertificateText(commonMessages, "requested", "Requested");
  }

  if (status === "seller_confirmed") {
    return getCertificateText(commonMessages, "sellerConfirmed", "Seller confirmed");
  }

  if (status === "active") {
    return getCertificateText(commonMessages, "active", "Active");
  }

  if (status === "delivered") {
    return getCertificateText(commonMessages, "delivered", "Delivered");
  }

  if (status === "redeemed") {
    return getCertificateText(commonMessages, "redeemed", "Redeemed");
  }

  if (status === "cancelled") {
    return getCertificateText(commonMessages, "cancelled", "Cancelled");
  }

  if (status === "rejected") {
    return getCertificateText(commonMessages, "rejected", "Rejected");
  }

  if (status === "expired") {
    return getCertificateText(commonMessages, "expired", "Expired");
  }

  return status ?? getCertificateText(commonMessages, "dash", "—");
}

function getStatusStyle(status: string | null | undefined) {
  if (status === "redeemed") {
    return {
      background: "#edf8f0",
      color: "#176b2c",
      border: "1px solid #bfe5c8",
    };
  }

  if (
    status === "requested" ||
    status === "seller_confirmed" ||
    status === "active" ||
    status === "delivered"
  ) {
    return {
      background: "#eff6ff",
      color: "#1e3a8a",
      border: "1px solid #bfdbfe",
    };
  }

  if (status === "cancelled" || status === "rejected" || status === "expired") {
    return {
      background: "#fff5f5",
      color: "#a40000",
      border: "1px solid #f2b8b5",
    };
  }

  return {
    background: "#f5f5f5",
    color: "#555555",
    border: "1px solid #dddddd",
  };
}

function getPointsStatusLabel(
  status: string | null | undefined,
  commonMessages: Record<string, string> = {}
) {
  if (status === "reserved") {
    return getCertificateText(commonMessages, "reserved", "Reserved");
  }

  if (status === "charged") {
    return getCertificateText(commonMessages, "charged", "Charged");
  }

  if (status === "released") {
    return getCertificateText(commonMessages, "released", "Released");
  }

  if (status === "none") {
    return getCertificateText(commonMessages, "none", "None");
  }

  return status ?? getCertificateText(commonMessages, "dash", "—");
}
function getTimelineToneStyle(tone: SellerTimelineItem["tone"]) {
  if (tone === "done") {
    return {
      background: "#edf8f0",
      border: "1px solid #bfe5c8",
      color: "#176b2c",
    };
  }

  if (tone === "active") {
    return {
      background: "#eff6ff",
      border: "1px solid #bfdbfe",
      color: "#1e3a8a",
    };
  }

  if (tone === "warning") {
    return {
      background: "#fff8e6",
      border: "1px solid #f0d28a",
      color: "#7a4b00",
    };
  }

  return {
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    color: "#444444",
  };
}

function buildSellerCertificateTimeline(
  certificate: CertificateRecord,
  sellerCertificatesMessages: Record<string, string>,
  commonMessages: Record<string, string>
): SellerTimelineItem[] {
  const pointsCurrency = certificate.points_currency_code || "POINT";
  const reservedAmount = Number(certificate.points_price) || 0;
  const chargedAmount = Number(certificate.points_charged) || reservedAmount;
  const releasedAmount = Number(certificate.points_released) || reservedAmount;

  const items: SellerTimelineItem[] = [
    {
      title: getCertificateText(sellerCertificatesMessages, "buyerOrderedTitle", "Buyer ordered a certificate"),
      description: `${getCertificateText(
        sellerCertificatesMessages,
        "buyerOrderedDescription",
        "Certificate created for your business."
      )} ${certificate.certificate_code}.`,
      date: certificate.requested_at || certificate.created_at,
      tone: "done",
    },
    {
      title: getCertificateText(sellerCertificatesMessages, "buyerPointsReservedTitle", "Buyer POINTS reserved"),
      description: `${formatMoney(
        reservedAmount,
        pointsCurrency
      )} ${getCertificateText(
        sellerCertificatesMessages,
        "pointsReservedDescriptionSuffix",
        "is already reserved from the buyer for this certificate."
      )}`,
      date: certificate.requested_at || certificate.created_at,
      tone: "done",
    },
  ];

  if (certificate.status === "active") {
    items.push({
      title: getCertificateText(sellerCertificatesMessages, "sellerActionTitle", "Seller action required"),
      description: getCertificateText(
        sellerCertificatesMessages,
        "sellerActionDescription",
        "Check redeem code or client QR code. If the service or product was delivered, confirm usage."
      ),
      date: certificate.delivered_at || certificate.requested_at,
      tone: "active",
    });

    items.push({
      title: getCertificateText(sellerCertificatesMessages, "afterConfirmationTitle", "After confirmation"),
      description: getCertificateText(
        sellerCertificatesMessages,
        "afterConfirmationDescription",
        "The certificate becomes redeemed and reserved POINTS are finally charged from the buyer."
      ),
      date: null,
      tone: "neutral",
    });

    return items;
  }

  if (certificate.status === "redeemed") {
    items.push({
      title: getCertificateText(sellerCertificatesMessages, "redeemedTitle", "Seller confirmed usage"),
      description: getCertificateText(
        sellerCertificatesMessages,
        "redeemedDescription",
        "The certificate was used by the buyer."
      ),
      date: certificate.redeemed_at,
      tone: "done",
    });

    items.push({
      title: getCertificateText(sellerCertificatesMessages, "pointsChargedTitle", "Buyer POINTS finally charged"),
      description: `${formatMoney(
        chargedAmount,
        pointsCurrency
      )} ${getCertificateText(
        sellerCertificatesMessages,
        "pointsChargedDescriptionSuffix",
        "charged after certificate usage confirmation."
      )}`,
      date: certificate.redeemed_at,
      tone: "done",
    });

    return items;
  }

  if (certificate.status === "cancelled") {
    items.push({
      title: getCertificateText(sellerCertificatesMessages, "buyerCancelledTitle", "Buyer cancelled certificate"),
      description: getCertificateText(
        sellerCertificatesMessages,
        "buyerCancelledDescription",
        "Certificate was cancelled within the allowed cancellation window."
      ),
      date: certificate.cancelled_at,
      tone: "warning",
    });

    items.push({
      title: getCertificateText(sellerCertificatesMessages, "pointsRefundedTitle", "POINTS returned to buyer"),
      description: `${formatMoney(
        releasedAmount,
        pointsCurrency
      )} ${getCertificateText(
        sellerCertificatesMessages,
        "pointsReleasedDescriptionSuffix",
        "returned from reserve to the buyer balance."
      )}`,
      date: certificate.cancelled_at,
      tone: "done",
    });

    return items;
  }

  if (certificate.status === "expired") {
    items.push({
      title: getCertificateText(sellerCertificatesMessages, "expiredTitle", "Certificate expired"),
      description: getCertificateText(
        sellerCertificatesMessages,
        "expiredDescription",
        "The buyer did not use the certificate before the validity period ended."
      ),
      date: certificate.expired_at,
      tone: "warning",
    });

    items.push({
      title: getCertificateText(sellerCertificatesMessages, "pointsChargedTitle", "Buyer POINTS finally charged"),
      description: `${formatMoney(
        chargedAmount,
        pointsCurrency
      )} ${getCertificateText(
        sellerCertificatesMessages,
        "pointsExpiredDescriptionSuffix",
        "charged after certificate expiration."
      )}`,
      date: certificate.expired_at,
      tone: "done",
    });

    return items;
  }

  if (certificate.status === "rejected") {
    items.push({
      title: getCertificateText(sellerCertificatesMessages, "rejectedTitle", "Certificate rejected"),
      description: getCertificateText(
        sellerCertificatesMessages,
        "rejectedDescription",
        "The certificate was rejected. Check comments and offer terms."
      ),
      date: certificate.rejected_at,
      tone: "warning",
    });

    return items;
  }

  items.push({
    title: `${getCertificateText(
      sellerCertificatesMessages,
      "currentStatus",
      "Current status"
    )}: ${getStatusLabel(certificate.status, commonMessages)}`,
    description: `${getCertificateText(
      commonMessages,
      "pointsStatus",
      "POINTS status"
    )}: ${getPointsStatusLabel(certificate.points_status, commonMessages)}.`,
    date: certificate.updated_at,
    tone: "neutral",
  });

  return items;
}

async function getCurrentAppUser(): Promise<{
  appUser: AppUser | null;
  errorMessage: string | null;
}> {
  const session = await auth0.getSession();

  if (!session?.user) {
    return {
      appUser: null,
      errorMessage: "Not authenticated",
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
      errorMessage: appUserError?.message ?? "App user not found",
    };
  }

  return {
    appUser: appUser as AppUser,
    errorMessage: null,
  };
}

async function getSellerCertificates(): Promise<PageData> {
  const { appUser, errorMessage } = await getCurrentAppUser();

  if (errorMessage) {
    return {
      certificates: [],
      errorMessage,
    };
  }

  if (!appUser) {
    return {
      certificates: [],
      errorMessage: "User context not found",
    };
  }

  const { data: sellerOrganizations, error: sellerOrganizationsError } =
    await supabase
      .from("organizations")
      .select("id")
      .eq("created_by_user_id", appUser.id);

  if (sellerOrganizationsError) {
    return {
      certificates: [],
      errorMessage: sellerOrganizationsError.message,
    };
  }

  const sellerOrganizationIds =
    sellerOrganizations?.map((organization) => organization.id) ?? [];

  if (sellerOrganizationIds.length === 0) {
    return {
      certificates: [],
      errorMessage: null,
    };
  }

  const { data: certificates, error: certificatesError } = await supabase
    .from("certificates")
    .select(
      `
      id,
      organization_id,
      offer_id,
      buyer_user_id,
      receiver_person_name,
      receiver_email,
      message,
      certificate_code,
      public_code,
      redeem_code,
      points_price,
      money_price,
      currency,
      status,
      points_status,
      points_reserved,
      points_charged,
      points_released,
      requested_at,
      seller_confirmed_at,
      delivered_at,
      redeemed_at,
      cancelled_at,
      rejected_at,
      expired_at,
      created_at,
      updated_at,
      payment_mode,
      points_currency_code,
      reference_currency,
      reference_value_per_point,
      reference_value_total,
      seller_comment,
      buyer_comment,
      organizations (
        id,
        organization_name,
        organization_type,
        country_code,
        default_currency,
        status,
        created_by_user_id
      ),
      offers (
        id,
        title,
        offer_type,
        price,
        currency,
        certificate_terms,
        certificate_validity_days
      )
    `
    )
    .in("organization_id", sellerOrganizationIds)
    .order("created_at", { ascending: false });

  if (certificatesError) {
    return {
      certificates: [],
      errorMessage: certificatesError.message,
    };
  }

  return {
    certificates: (certificates as unknown as CertificateRecord[] | null) ?? [],
    errorMessage: null,
  };
}

export default async function SellerCertificatesPage({ searchParams }: SellerCertificatesPageProps) {
  const resolvedSearchParams = await searchParams;
  const selectedLocale =
    getFirstSearchParam(resolvedSearchParams?.locale) ??
    getFirstSearchParam(resolvedSearchParams?.lang) ??
    "en";
  const certificateMessages = getCertificatesMessages(selectedLocale);
  const commonMessages = certificateMessages.common;
  const sellerCertificatesMessages = certificateMessages.sellerCertificates;
  const actionsMessages = certificateMessages.actions;
  const { certificates, errorMessage } = await getSellerCertificates();

  const activeCount = certificates.filter(
    (certificate) => certificate.status === "active"
  ).length;

  const redeemedCount = certificates.filter(
    (certificate) => certificate.status === "redeemed"
  ).length;

  const expiredCount = certificates.filter(
    (certificate) => certificate.status === "expired"
  ).length;

  const cancelledCount = certificates.filter(
    (certificate) => certificate.status === "cancelled"
  ).length;

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
          maxWidth: "1300px",
          margin: "0 auto",
        }}
      >
        <header style={{ marginBottom: "32px", textAlign: "center" }}>
          <h1
            style={{
              fontSize: "34px",
              lineHeight: "1.2",
              fontWeight: 700,
              margin: "0 0 12px",
            }}
          >
            {getCertificateText(sellerCertificatesMessages, "title", "Seller certificates")}
          </h1>

          <p
            style={{
              maxWidth: "860px",
              margin: "0 auto 20px",
              color: "#555555",
              fontSize: "16px",
              lineHeight: "1.5",
            }}
          >
            Certificates and rewards ordered from your organizations. The seller
            confirms only real usage of the certificate. POINTS remain a buyer
            loyalty balance mechanism inside the platform.
          </p>

          <nav
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "20px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <a href={appendLocaleToHref("/", selectedLocale)} style={{ color: "#2563eb" }}>
              {getCertificateText(sellerCertificatesMessages, "home", "Home")}
            </a>

            <a href={appendLocaleToHref("/organizations", selectedLocale)} style={{ color: "#2563eb" }}>
              {getCertificateText(sellerCertificatesMessages, "myOrganizations", "My organizations")}
            </a>

            <a href={appendLocaleToHref("/rewards", selectedLocale)} style={{ color: "#2563eb" }}>
              {getCertificateText(sellerCertificatesMessages, "rewardsCatalog", "Rewards catalog")}
            </a>

            <a href={appendLocaleToHref("/my-certificates", selectedLocale)} style={{ color: "#2563eb" }}>
              {getCertificateText(sellerCertificatesMessages, "myCertificates", "My certificates")}
            </a>

            <a href={appendLocaleToHref("/purchase-confirmations", selectedLocale)} style={{ color: "#2563eb" }}>
              {getCertificateText(sellerCertificatesMessages, "sellerPurchaseConfirmations", "Seller purchase confirmations")}
            </a>
          </nav>
        </header>

        {errorMessage ? (
          <section
            style={{
              border: "1px solid #f2b8b5",
              borderRadius: "12px",
              padding: "22px",
              background: "#fff5f5",
              color: "#a40000",
              marginBottom: "20px",
            }}
          >
            {errorMessage}
          </section>
        ) : null}

        {!errorMessage ? (
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
                padding: "22px",
                background: "#ffffff",
                boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ color: "#666666", marginBottom: "8px" }}>
                {getCertificateText(sellerCertificatesMessages, "totalCertificates", "Total certificates")}
              </div>
              <div style={{ fontSize: "34px", fontWeight: 700 }}>
                {certificates.length}
              </div>
            </div>

            <div
              style={{
                border: "1px solid #bfdbfe",
                borderRadius: "16px",
                padding: "22px",
                background: "#eff6ff",
                boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ color: "#1e3a8a", marginBottom: "8px" }}>
                {getCertificateText(commonMessages, "active", "Active")}
              </div>
              <div style={{ fontSize: "34px", fontWeight: 700 }}>
                {activeCount}
              </div>
            </div>

            <div
              style={{
                border: "1px solid #bfe5c8",
                borderRadius: "16px",
                padding: "22px",
                background: "#edf8f0",
                boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ color: "#176b2c", marginBottom: "8px" }}>
                {getCertificateText(commonMessages, "redeemed", "Redeemed")}
              </div>
              <div style={{ fontSize: "34px", fontWeight: 700 }}>
                {redeemedCount}
              </div>
            </div>

            <div
              style={{
                border: "1px solid #f0d28a",
                borderRadius: "16px",
                padding: "22px",
                background: "#fff8e6",
                boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ color: "#7a4b00", marginBottom: "8px" }}>
                {getCertificateText(commonMessages, "expired", "Expired")}
              </div>
              <div style={{ fontSize: "34px", fontWeight: 700 }}>
                {expiredCount}
              </div>
            </div>

            <div
              style={{
                border: "1px solid #f2b8b5",
                borderRadius: "16px",
                padding: "22px",
                background: "#fff5f5",
                boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ color: "#a40000", marginBottom: "8px" }}>
                {getCertificateText(commonMessages, "cancelled", "Cancelled")}
              </div>
              <div style={{ fontSize: "34px", fontWeight: 700 }}>
                {cancelledCount}
              </div>
            </div>
          </section>
        ) : null}

        {!errorMessage && certificates.length === 0 ? (
          <section
            style={{
              border: "1px solid #facc15",
              borderRadius: "12px",
              padding: "22px",
              background: "#fefce8",
            }}
          >
            {getCertificateText(sellerCertificatesMessages, "emptyState", "No certificates have been ordered from your organizations yet.")}
          </section>
        ) : null}

        {!errorMessage && certificates.length > 0 ? (
          <section
            style={{
              display: "grid",
              gap: "18px",
            }}
          >
            {certificates.map((certificate) => {
              const organization = getFirstRelatedItem(
                certificate.organizations
              );
              const offer = getFirstRelatedItem(certificate.offers);
              const statusStyle = getStatusStyle(certificate.status);
              const timeline = buildSellerCertificateTimeline(certificate, sellerCertificatesMessages, commonMessages);

              return (
                <article
                  key={certificate.id}
                  style={{
                    border: "1px solid #dddddd",
                    borderRadius: "16px",
                    padding: "20px",
                    background: "#ffffff",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                    display: "grid",
                    gap: "16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "12px",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <h2
                        style={{
                          margin: "0 0 8px",
                          fontSize: "24px",
                          lineHeight: "1.25",
                        }}
                      >
                        {offer?.title ?? getCertificateText(commonMessages, "certificate", "Certificate")}
                      </h2>

                      <p style={{ margin: 0, color: "#555555" }}>
                        {organization?.organization_name ??
                          getCertificateText(sellerCertificatesMessages, "unknownOrganization", "Unknown organization")}
                      </p>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          borderRadius: "999px",
                          padding: "6px 10px",
                          fontSize: "13px",
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                          ...statusStyle,
                        }}
                      >
                        {getStatusLabel(certificate.status, commonMessages)}
                      </span>

                      <span
                        style={{
                          display: "inline-block",
                          borderRadius: "999px",
                          padding: "6px 10px",
                          fontSize: "13px",
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                          background: "#fff8e6",
                          color: "#7a4b00",
                          border: "1px solid #f0d28a",
                        }}
                      >
                        {getCertificateText(commonMessages, "points", "POINTS")}: {getPointsStatusLabel(certificate.points_status, commonMessages)}
                      </span>
                    </div>
                  </div>

                  <section
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        border: "1px solid #bfdbfe",
                        borderRadius: "10px",
                        padding: "12px",
                        background: "#eff6ff",
                      }}
                    >
                      <div style={{ color: "#1e3a8a", marginBottom: "6px" }}>
                        {getCertificateText(sellerCertificatesMessages, "pointsReserved", "POINTS reserved")}
                      </div>
                      <strong>
                        {formatMoney(
                          certificate.points_reserved,
                          certificate.points_currency_code
                        )}
                      </strong>
                    </div>

                    <div
                      style={{
                        border: "1px solid #dddddd",
                        borderRadius: "10px",
                        padding: "12px",
                        background: "#f9fafb",
                      }}
                    >
                      <div style={{ color: "#666666", marginBottom: "6px" }}>
                        {getCertificateText(sellerCertificatesMessages, "pointsCharged", "POINTS charged")}
                      </div>
                      <strong>
                        {formatMoney(
                          certificate.points_charged,
                          certificate.points_currency_code
                        )}
                      </strong>
                    </div>

                    <div
                      style={{
                        border: "1px solid #dddddd",
                        borderRadius: "10px",
                        padding: "12px",
                        background: "#f9fafb",
                      }}
                    >
                      <div style={{ color: "#666666", marginBottom: "6px" }}>
                        {getCertificateText(sellerCertificatesMessages, "moneyPayment", "Money payment")}
                      </div>
                      <strong>
                        {formatMoney(
                          certificate.money_price,
                          certificate.currency
                        )}
                      </strong>
                    </div>

                    <div
                      style={{
                        border: "1px solid #dddddd",
                        borderRadius: "10px",
                        padding: "12px",
                        background: "#f9fafb",
                      }}
                    >
                      <div style={{ color: "#666666", marginBottom: "6px" }}>
                        {getCertificateText(sellerCertificatesMessages, "valueCoveredByPoints", "Value covered by POINTS")}
                      </div>
                      <strong>
                        {formatMoney(
                          certificate.reference_value_total,
                          certificate.currency
                        )}
                      </strong>
                    </div>
                  </section>

                  <section
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: "12px",
                      padding: "14px",
                      background: "#ffffff",
                    }}
                  >
                    <h3
                      style={{
                        margin: "0 0 12px",
                        fontSize: "18px",
                        lineHeight: "1.3",
                      }}
                    >
                      {getCertificateText(sellerCertificatesMessages, "sellerHistory", "Seller history")}
                    </h3>

                    <div
                      style={{
                        display: "grid",
                        gap: "10px",
                      }}
                    >
                      {timeline.map((item, index) => {
                        const toneStyle = getTimelineToneStyle(item.tone);

                        return (
                          <div
                            key={`${certificate.id}-${item.title}-${index}`}
                            style={{
                              borderRadius: "10px",
                              padding: "12px",
                              ...toneStyle,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: "12px",
                                flexWrap: "wrap",
                                marginBottom: "4px",
                              }}
                            >
                              <strong>{item.title}</strong>
                              <span style={{ fontSize: "13px" }}>
                                <LocalDateTime
                                  value={item.date}
                                  showHelperText={false}
                                />
                              </span>
                            </div>
                            <div
                              style={{ fontSize: "14px", lineHeight: "1.45" }}
                            >
                              {item.description}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <section
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: "10px",
                      padding: "14px",
                      background: "#f9fafb",
                      display: "grid",
                      gap: "7px",
                      lineHeight: "1.45",
                    }}
                  >
                    <p style={{ margin: 0 }}>
                      <strong>{getCertificateText(commonMessages, "certificateCode", "Certificate code")}:</strong>{" "}
                      <span style={{ fontFamily: "monospace" }}>
                        {certificate.certificate_code}
                      </span>
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>{getCertificateText(commonMessages, "publicCode", "Public code")}:</strong>{" "}
                      <span style={{ fontFamily: "monospace" }}>
                        {certificate.public_code ?? "—"}
                      </span>
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>{getCertificateText(commonMessages, "redeemCode", "Redeem code")}:</strong>{" "}
                      <span style={{ fontFamily: "monospace" }}>
                        {certificate.redeem_code ?? "—"}
                      </span>
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>{getCertificateText(sellerCertificatesMessages, "buyerUserId", "Buyer user ID")}:</strong>{" "}
                      <span style={{ fontFamily: "monospace" }}>
                        {certificate.buyer_user_id}
                      </span>
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>{getCertificateText(sellerCertificatesMessages, "receiver", "Receiver")}:</strong>{" "}
                      {certificate.receiver_person_name ?? "—"} /{" "}
                      {certificate.receiver_email ?? "—"}
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>{getCertificateText(commonMessages, "requested", "Requested")}:</strong>{" "}
                      <LocalDateTime value={certificate.requested_at} />
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>{getCertificateText(commonMessages, "delivered", "Delivered")}:</strong>{" "}
                      <LocalDateTime value={certificate.delivered_at} />
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>{getCertificateText(commonMessages, "redeemed", "Redeemed")}:</strong>{" "}
                      <LocalDateTime value={certificate.redeemed_at} />
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>{getCertificateText(commonMessages, "cancelled", "Cancelled")}:</strong>{" "}
                      <LocalDateTime value={certificate.cancelled_at} />
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>{getCertificateText(commonMessages, "expired", "Expired")}:</strong>{" "}
                      <LocalDateTime value={certificate.expired_at} />
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>{getCertificateText(commonMessages, "buyerMessage", "Buyer message")}:</strong>{" "}
                      {certificate.message ?? "—"}
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>{getCertificateText(commonMessages, "sellerComment", "Seller comment")}:</strong>{" "}
                      {certificate.seller_comment ?? "—"}
                    </p>
                  </section>

                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      flexWrap: "wrap",
                      alignItems: "flex-start",
                    }}
                  >
                    {organization?.id ? (
                      <a
                        href={appendLocaleToHref(`/organizations/${organization.id}`, selectedLocale)}
                        style={{
                          display: "inline-block",
                          border: "1px solid #2563eb",
                          borderRadius: "8px",
                          padding: "10px 12px",
                          color: "#2563eb",
                          background: "#ffffff",
                          textDecoration: "none",
                          fontWeight: 700,
                        }}
                      >
                        {getCertificateText(sellerCertificatesMessages, "openOrganization", "Open organization")}
                      </a>
                    ) : null}

                    <RedeemCertificateButton
                      certificateId={certificate.id}
                      certificateCode={certificate.certificate_code}
                      status={certificate.status}
                      pointsStatus={certificate.points_status}
                      pointsReserved={Number(certificate.points_reserved) || 0}
                      pointsCurrencyCode={certificate.points_currency_code || "POINT"}
                      selectedLocale={selectedLocale}
                    />
                  </div>
                </article>
              );
            })}
          </section>
        ) : null}
      </div>
    </main>
  );
}

