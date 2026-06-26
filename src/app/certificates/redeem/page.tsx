import { auth0 } from "../../../../lib/auth0";
import { supabase } from "../../../../lib/supabase";
import LocalDateTime from "../../../components/LocalDateTime";
import RedeemCertificateButton from "../../seller-certificates/components/RedeemCertificateButton";
import {
  getCertificatesMessages,
  getCertificateText,
} from "../../../i18n/messages/certificates";

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
  qr_token: string | null;
  points_price: number;
  money_price: number | null;
  currency: string | null;
  status: string;
  points_status: string;
  points_reserved: number;
  points_charged: number;
  points_released: number;
  requested_at: string;
  delivered_at: string | null;
  redeemed_at: string | null;
  cancelled_at: string | null;
  rejected_at: string | null;
  expired_at: string | null;
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
  appUser: AppUser | null;
  certificate: CertificateRecord | null;
  errorMessage: string | null;
};

type RedeemCertificatePageProps = {
  searchParams: Promise<{
    token?: string;
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
function formatMoney(
  value: number | string | null | undefined,
  currency: string | null | undefined
) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return `${value} ${currency || ""}`.trim();
}

function getStatusLabel(
  status: string | null | undefined,
  commonMessages: Record<string, string> = {}
) {
  if (status === "active") {
    return getCertificateText(commonMessages, "active", "Active");
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

function getStatusStyle(status: string | null | undefined) {
  if (status === "active") {
    return {
      background: "#eff6ff",
      color: "#1e3a8a",
      border: "1px solid #bfdbfe",
    };
  }

  if (status === "redeemed") {
    return {
      background: "#edf8f0",
      color: "#176b2c",
      border: "1px solid #bfe5c8",
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

async function getRedeemPageData(token: string | null): Promise<PageData> {
  const { appUser, errorMessage } = await getCurrentAppUser();

  if (errorMessage) {
    return {
      appUser: null,
      certificate: null,
      errorMessage,
    };
  }

  if (!appUser) {
    return {
      appUser: null,
      certificate: null,
      errorMessage: "User context not found",
    };
  }

  if (!token) {
    return {
      appUser,
      certificate: null,
      errorMessage: "QR token is missing",
    };
  }

  const { data: certificate, error: certificateError } = await supabase
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
      qr_token,
      points_price,
      money_price,
      currency,
      status,
      points_status,
      points_reserved,
      points_charged,
      points_released,
      requested_at,
      delivered_at,
      redeemed_at,
      cancelled_at,
      rejected_at,
      expired_at,
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
    .eq("qr_token", token)
    .single();

  if (certificateError || !certificate) {
    return {
      appUser,
      certificate: null,
      errorMessage: certificateError?.message ?? getCertificateText(getCertificatesMessages("en").common, "certificateNotFound", "Certificate not found"),
    };
  }

  return {
    appUser,
    certificate: certificate as unknown as CertificateRecord,
    errorMessage: null,
  };
}

export default async function RedeemCertificatePage({
  searchParams,
}: RedeemCertificatePageProps) {
  const resolvedSearchParams = await searchParams;
  const token = resolvedSearchParams.token ?? null;

  const localeSearchParams = resolvedSearchParams as Record<
    string,
    string | string[] | undefined
  >;
  const selectedLocale =
    getFirstSearchParam(localeSearchParams.locale) ??
    getFirstSearchParam(localeSearchParams.lang) ??
    "en";
  const certificateMessages = getCertificatesMessages(selectedLocale);
  const commonMessages = certificateMessages.common;
  const redeemMessages = certificateMessages.redeemPage;
  const myCertificatesMessages = certificateMessages.myCertificates;
  const sellerCertificatesMessages = certificateMessages.sellerCertificates;
  const actionsMessages = certificateMessages.actions;
  const { appUser, certificate, errorMessage } = await getRedeemPageData(token);

  const organization = getFirstRelatedItem(certificate?.organizations);
  const offer = getFirstRelatedItem(certificate?.offers);

  const isSeller =
    Boolean(appUser?.id) &&
    Boolean(organization?.created_by_user_id) &&
    appUser?.id === organization?.created_by_user_id;

  const canRedeem =
    isSeller &&
    certificate?.status === "active" &&
    certificate?.points_status === "reserved";

  const statusStyle = getStatusStyle(certificate?.status);

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
          maxWidth: "980px",
          margin: "0 auto",
        }}
      >
        <header style={{ marginBottom: "28px", textAlign: "center" }}>
          <h1
            style={{
              fontSize: "34px",
              lineHeight: "1.2",
              fontWeight: 700,
              margin: "0 0 12px",
            }}
          >
            {getCertificateText(actionsMessages, "redeem", "Confirm usage")}
          </h1>

          <p
            style={{
              margin: "0 auto 18px",
              color: "#555555",
              fontSize: "16px",
              lineHeight: "1.5",
            }}
          >
            Usage confirmation page after scanning the customer QR code.
          </p>

          <nav
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "18px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <a href={appendLocaleToHref("/", selectedLocale)} style={{ color: "#2563eb" }}>
              {getCertificateText(redeemMessages, "home", "Home")}
            </a>

            <a href={appendLocaleToHref("/seller-certificates", selectedLocale)} style={{ color: "#2563eb" }}>
              {getCertificateText(sellerCertificatesMessages, "title", "Seller certificates")}
            </a>

            <a href={appendLocaleToHref("/my-certificates", selectedLocale)} style={{ color: "#2563eb" }}>
              {getCertificateText(myCertificatesMessages, "title", "My certificates")}
            </a>

            <a href="/rewards" style={{ color: "#2563eb" }}>
              Rewards catalog
            </a>
          </nav>
        </header>

        {errorMessage ? (
          <section
            style={{
              border: "1px solid #f2b8b5",
              borderRadius: "14px",
              padding: "20px",
              background: "#fff5f5",
              color: "#a40000",
            }}
          >
            <strong>{getCertificateText(commonMessages, "error", "Error")}:</strong> {errorMessage}
          </section>
        ) : null}

        {!errorMessage && certificate ? (
          <article
            style={{
              border: "1px solid #dddddd",
              borderRadius: "16px",
              padding: "22px",
              background: "#ffffff",
              boxShadow: "0 4px 18px rgba(0,0,0,0.05)",
              display: "grid",
              gap: "18px",
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
                    fontSize: "26px",
                    lineHeight: "1.25",
                  }}
                >
                  {offer?.title ?? getCertificateText(commonMessages, "certificate", "Certificate")}
                </h2>

                <p style={{ margin: 0, color: "#555555" }}>
                  {organization?.organization_name ?? getCertificateText(redeemMessages, "organizationNotFound", "Unknown organization")}
                </p>
              </div>

              <span
                style={{
                  display: "inline-block",
                  borderRadius: "999px",
                  padding: "7px 12px",
                  fontSize: "13px",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  ...statusStyle,
                }}
              >
                {getStatusLabel(certificate.status, commonMessages)} / points:{" "}
                {getPointsStatusLabel(certificate.points_status, commonMessages)}
              </span>
            </div>

            {!isSeller ? (
              <section
                style={{
                  border: "1px solid #f0d28a",
                  borderRadius: "12px",
                  padding: "14px",
                  background: "#fff8e6",
                  color: "#7a4b00",
                  lineHeight: "1.45",
                }}
              >
                {getCertificateText(redeemMessages, "sellerOnly", "Only the organization owner can confirm usage of this certificate.")}
              </section>
            ) : null}

            <section
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
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
                  POINT after usage confirmation
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
                  {getCertificateText(redeemMessages, "customerMoneyPayment", "Customer money payment")}
                </div>
                <strong>
                  {formatMoney(certificate.money_price, certificate.currency)}
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
                  {getCertificateText(redeemMessages, "valueCoveredByPoints", "Value covered by points")}
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
                background: "#f9fafb",
                display: "grid",
                gap: "7px",
                lineHeight: "1.45",
              }}
            >
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
                <strong>{getCertificateText(redeemMessages, "requested", "Requested")}:</strong>{" "}
                <LocalDateTime value={certificate.requested_at} />
              </p>

              <p style={{ margin: 0 }}>
                <strong>{getCertificateText(commonMessages, "buyerMessage", "Buyer message")}:</strong> {certificate.message ?? getCertificateText(commonMessages, "dash", "—")}
              </p>
            </section>

            {canRedeem ? (
              <RedeemCertificateButton
                certificateId={certificate.id}
                certificateCode={certificate.certificate_code}
                status={certificate.status}
                pointsStatus={certificate.points_status}
                pointsReserved={Number(certificate.points_reserved) || 0}
                pointsCurrencyCode={certificate.points_currency_code || "POINT"}
                selectedLocale={selectedLocale}
              />
            ) : null}

            {!canRedeem && isSeller ? (
              <section
                style={{
                  border: "1px solid #dddddd",
                  borderRadius: "12px",
                  padding: "14px",
                  background: "#f9fafb",
                  color: "#555555",
                }}
              >
                {getCertificateText(redeemMessages, "confirmationUnavailable", "Usage confirmation is not available for this certificate status.")}
              </section>
            ) : null}
          </article>
        ) : null}
      </div>
    </main>
  );
}