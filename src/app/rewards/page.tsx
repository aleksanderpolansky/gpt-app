import { supabase } from "../../../lib/supabase";
import RequestCertificateButton from "./components/RequestCertificateButton";

export const dynamic = "force-dynamic";

type RelatedOrganization =
  | {
      id: string;
      organization_name: string | null;
      organization_type: string | null;
      country_code: string | null;
      default_currency: string | null;
      status: string | null;
    }
  | {
      id: string;
      organization_name: string | null;
      organization_type: string | null;
      country_code: string | null;
      default_currency: string | null;
      status: string | null;
    }[]
  | null;

type RewardOfferRecord = {
  id: string;
  organization_id: string | null;
  offer_type: string | null;
  title: string | null;
  description: string | null;

  price: number | null;
  regular_price: number | null;
  currency: string | null;

  certificate_payment_mode: string | null;
  certificate_points_covered_amount: number | null;
  certificate_points_price: number | null;
  certificate_money_price: number | null;
  certificate_currency: string | null;
  certificate_terms: string | null;
  certificate_validity_days: number | null;
  requires_seller_confirmation: boolean | null;
  is_transferable: boolean | null;
  is_cancellable: boolean | null;
  points_refund_policy: string | null;

  points_currency_code: string | null;
  reference_currency: string | null;
  reference_value_per_point: number | null;
  reference_exchange_rate: number | null;
  reference_exchange_rate_date: string | null;

  requires_booking: boolean | null;
  booking_mode: string | null;
  default_duration_minutes: number | null;
  quantity_limit: number | null;

  status: string | null;
  created_at: string | null;

  organizations: RelatedOrganization;
};

type RewardOffer = {
  id: string;
  organizationId: string | null;
  organizationName: string | null;
  organizationType: string | null;
  organizationCountryCode: string | null;

  offerType: string | null;
  title: string | null;
  description: string | null;

  price: number | null;
  regularPrice: number | null;
  currency: string | null;

  certificatePaymentMode: string | null;
  certificatePointsCoveredAmount: number | null;
  certificatePointsPrice: number | null;
  certificateMoneyPrice: number | null;
  certificateCurrency: string | null;
  certificateTerms: string | null;
  certificateValidityDays: number | null;
  requiresSellerConfirmation: boolean | null;
  isTransferable: boolean | null;
  isCancellable: boolean | null;
  pointsRefundPolicy: string | null;

  pointsCurrencyCode: string | null;
  referenceCurrency: string | null;
  referenceValuePerPoint: number | null;
  referenceExchangeRate: number | null;
  referenceExchangeRateDate: string | null;

  requiresBooking: boolean | null;
  bookingMode: string | null;
  defaultDurationMinutes: number | null;
  quantityLimit: number | null;

  status: string | null;
  createdAt: string | null;
};

type RewardsCatalogPageProps = {
  searchParams?: Promise<{
    q?: string;
    paymentMode?: string;
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

function formatMoney(
  value: number | string | null | undefined,
  currency: string | null | undefined
) {
  if (value === null || value === undefined || value === "") {
    return "Not specified";
  }

  return `${value} ${currency || ""}`.trim();
}

function getPaymentModeLabel(paymentMode: string | null | undefined) {
  if (paymentMode === "points_only") {
    return "Points only";
  }

  if (paymentMode === "mixed") {
    return "Money + points";
  }

  return paymentMode || "Not specified";
}

function getPaymentModeStyle(paymentMode: string | null | undefined) {
  if (paymentMode === "points_only") {
    return {
      background: "#edf8f0",
      color: "#176b2c",
      border: "1px solid #bfe5c8",
    };
  }

  if (paymentMode === "mixed") {
    return {
      background: "#fff8e6",
      color: "#7a4b00",
      border: "1px solid #f0d28a",
    };
  }

  return {
    background: "#f5f5f5",
    color: "#555555",
    border: "1px solid #dddddd",
  };
}

function getBooleanLabel(value: boolean | null | undefined) {
  return value ? "Yes" : "No";
}

async function getRewardOffers(): Promise<{
  rewardOffers: RewardOffer[];
  errorMessage: string | null;
}> {
  const { data: rewardOffers, error: rewardOffersError } = await supabase
    .from("offers")
    .select(
      `
      id,
      organization_id,
      offer_type,
      title,
      description,

      price,
      regular_price,
      currency,

      certificate_payment_mode,
      certificate_points_covered_amount,
      certificate_points_price,
      certificate_money_price,
      certificate_currency,
      certificate_terms,
      certificate_validity_days,
      requires_seller_confirmation,
      is_transferable,
      is_cancellable,
      points_refund_policy,

      points_currency_code,
      reference_currency,
      reference_value_per_point,
      reference_exchange_rate,
      reference_exchange_rate_date,

      requires_booking,
      booking_mode,
      default_duration_minutes,
      quantity_limit,

      status,
      created_at,

      organizations (
        id,
        organization_name,
        organization_type,
        country_code,
        default_currency,
        status
      )
    `
    )
    .eq("certificate_available", true)
    .eq("is_public_reward", true)
    .eq("status", "active")
    .in("certificate_payment_mode", ["points_only", "mixed"])
    .gt("certificate_points_covered_amount", 0)
    .gt("certificate_points_price", 0)
    .order("created_at", { ascending: false });

  if (rewardOffersError) {
    return {
      rewardOffers: [],
      errorMessage: rewardOffersError.message,
    };
  }

  const publicRewardOffers = ((rewardOffers as RewardOfferRecord[] | null) ?? [])
    .map((offer) => {
      const organization = getFirstRelatedItem(offer.organizations);

      return {
        id: offer.id,
        organizationId: offer.organization_id,
        organizationName: organization?.organization_name ?? null,
        organizationType: organization?.organization_type ?? null,
        organizationCountryCode: organization?.country_code ?? null,

        offerType: offer.offer_type,
        title: offer.title,
        description: offer.description,

        price: offer.price,
        regularPrice: offer.regular_price,
        currency: offer.currency,

        certificatePaymentMode: offer.certificate_payment_mode,
        certificatePointsCoveredAmount:
          offer.certificate_points_covered_amount,
        certificatePointsPrice: offer.certificate_points_price,
        certificateMoneyPrice: offer.certificate_money_price,
        certificateCurrency: offer.certificate_currency,
        certificateTerms: offer.certificate_terms,
        certificateValidityDays: offer.certificate_validity_days,
        requiresSellerConfirmation: offer.requires_seller_confirmation,
        isTransferable: offer.is_transferable,
        isCancellable: offer.is_cancellable,
        pointsRefundPolicy: offer.points_refund_policy,

        pointsCurrencyCode: offer.points_currency_code,
        referenceCurrency: offer.reference_currency,
        referenceValuePerPoint: offer.reference_value_per_point,
        referenceExchangeRate: offer.reference_exchange_rate,
        referenceExchangeRateDate: offer.reference_exchange_rate_date,

        requiresBooking: offer.requires_booking,
        bookingMode: offer.booking_mode,
        defaultDurationMinutes: offer.default_duration_minutes,
        quantityLimit: offer.quantity_limit,

        status: offer.status,
        createdAt: offer.created_at,
      };
    });

  return {
    rewardOffers: publicRewardOffers,
    errorMessage: null,
  };
}

export default async function RewardsCatalogPage({
  searchParams,
}: RewardsCatalogPageProps) {
  const resolvedSearchParams = await searchParams;

  const searchText = resolvedSearchParams?.q?.trim() ?? "";
  const paymentModeFilter = resolvedSearchParams?.paymentMode ?? "all";

  const { rewardOffers, errorMessage } = await getRewardOffers();

  const filteredRewardOffers = rewardOffers.filter((offer) => {
    const normalizedSearchText = searchText.toLowerCase();

    const matchesSearch =
      normalizedSearchText.length === 0 ||
      `${offer.title ?? ""} ${offer.description ?? ""} ${
        offer.organizationName ?? ""
      }`
        .toLowerCase()
        .includes(normalizedSearchText);

    const matchesPaymentMode =
      paymentModeFilter === "all" ||
      offer.certificatePaymentMode === paymentModeFilter;

    return matchesSearch && matchesPaymentMode;
  });

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
          maxWidth: "1180px",
          margin: "0 auto",
        }}
      >
        <header
          style={{
            marginBottom: "32px",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontSize: "34px",
              lineHeight: "1.2",
              fontWeight: 700,
              margin: "0 0 12px",
            }}
          >
            Rewards / certificates catalog
          </h1>

          <p
            style={{
              maxWidth: "820px",
              margin: "0 auto 20px",
              color: "#555555",
              fontSize: "16px",
              lineHeight: "1.5",
            }}
          >
            Public list of active rewards and certificates where points are used
            as full or partial payment.
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
            <a href="/" style={{ color: "#2563eb" }}>
              На главную
            </a>

            <a href="/organizations" style={{ color: "#2563eb" }}>
              Мои организации
            </a>

            <a href="/offers" style={{ color: "#2563eb" }}>
              Offers
            </a>

            <a href="/my-purchase-confirmations" style={{ color: "#2563eb" }}>
              My purchase confirmations
            </a>

            <a href="/my-certificates" style={{ color: "#2563eb" }}>
              My certificates
            </a>
          </nav>
        </header>

        <form
          method="GET"
          action="/rewards"
          style={{
            border: "1px solid #dddddd",
            borderRadius: "14px",
            padding: "18px",
            background: "#f9fafb",
            marginBottom: "22px",
            display: "grid",
            gridTemplateColumns: "2fr 1fr auto",
            gap: "12px",
            alignItems: "end",
          }}
        >
          <label style={{ display: "grid", gap: "8px", fontWeight: 700 }}>
            Search
            <input
              name="q"
              defaultValue={searchText}
              placeholder="Search by reward, certificate, description or organization"
              style={{
                border: "1px solid #cccccc",
                borderRadius: "8px",
                padding: "11px 12px",
                fontSize: "15px",
                fontWeight: 400,
              }}
            />
          </label>

          <label style={{ display: "grid", gap: "8px", fontWeight: 700 }}>
            Payment mode
            <select
              name="paymentMode"
              defaultValue={paymentModeFilter}
              style={{
                border: "1px solid #cccccc",
                borderRadius: "8px",
                padding: "11px 12px",
                fontSize: "15px",
                fontWeight: 400,
              }}
            >
              <option value="all">All rewards</option>
              <option value="points_only">Points only</option>
              <option value="mixed">Money + points</option>
            </select>
          </label>

          <button
            type="submit"
            style={{
              border: "1px solid #dddddd",
              borderRadius: "8px",
              padding: "11px 14px",
              background: "#ffffff",
              color: "#111111",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Apply
          </button>
        </form>

        {errorMessage ? (
          <section
            style={{
              border: "1px solid #f2b8b5",
              borderRadius: "12px",
              padding: "22px",
              background: "#fff5f5",
              color: "#a40000",
            }}
          >
            {errorMessage}
          </section>
        ) : null}

        {!errorMessage && filteredRewardOffers.length === 0 ? (
          <section
            style={{
              border: "1px solid #facc15",
              borderRadius: "12px",
              padding: "22px",
              background: "#fefce8",
            }}
          >
            No public rewards or certificates found.
          </section>
        ) : null}

        {!errorMessage && filteredRewardOffers.length > 0 ? (
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "18px",
            }}
          >
            {filteredRewardOffers.map((offer) => {
              const paymentModeStyle = getPaymentModeStyle(
                offer.certificatePaymentMode
              );

              return (
                <article
                  key={offer.id}
                  style={{
                    border: "1px solid #dddddd",
                    borderRadius: "16px",
                    padding: "18px",
                    background: "#ffffff",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                    display: "grid",
                    gap: "14px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "12px",
                      alignItems: "flex-start",
                    }}
                  >
                    <div>
                      <h2
                        style={{
                          margin: "0 0 8px",
                          fontSize: "22px",
                          lineHeight: "1.25",
                        }}
                      >
                        {offer.title ?? "Untitled reward"}
                      </h2>

                      <p style={{ margin: 0, color: "#555555" }}>
                        {offer.organizationName ?? "Unknown organization"}
                      </p>
                    </div>

                    <span
                      style={{
                        display: "inline-block",
                        borderRadius: "999px",
                        padding: "6px 10px",
                        fontSize: "13px",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        ...paymentModeStyle,
                      }}
                    >
                      {getPaymentModeLabel(offer.certificatePaymentMode)}
                    </span>
                  </div>

                  <p style={{ margin: 0, color: "#333333", lineHeight: "1.5" }}>
                    {offer.description || "No description provided."}
                  </p>

                  <section
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        border: "1px solid #dddddd",
                        borderRadius: "10px",
                        padding: "12px",
                        background: "#f9fafb",
                      }}
                    >
                      <div style={{ color: "#666666", marginBottom: "6px" }}>
                        Current price
                      </div>
                      <strong>{formatMoney(offer.price, offer.currency)}</strong>
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
                        Regular price
                      </div>
                      <strong>
                        {formatMoney(offer.regularPrice, offer.currency)}
                      </strong>
                    </div>

                    <div
                      style={{
                        border: "1px solid #bfdbfe",
                        borderRadius: "10px",
                        padding: "12px",
                        background: "#eff6ff",
                      }}
                    >
                      <div style={{ color: "#1e3a8a", marginBottom: "6px" }}>
                        Buyer pays
                      </div>
                      <strong>
                        {formatMoney(
                          offer.certificatePointsPrice ?? 0,
                          offer.pointsCurrencyCode ?? "POINT"
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
                        Money payment
                      </div>
                      <strong>
                        {formatMoney(
                          offer.certificateMoneyPrice,
                          offer.certificateCurrency ?? offer.currency
                        )}
                      </strong>
                    </div>
                  </section>

                  <section
                    style={{
                      border: "1px solid #bfdbfe",
                      borderRadius: "10px",
                      padding: "12px",
                      background: "#eff6ff",
                      display: "grid",
                      gap: "7px",
                      lineHeight: "1.45",
                    }}
                  >
                    <p style={{ margin: 0 }}>
                      <strong>Covered by points:</strong>{" "}
                      {formatMoney(
                        offer.certificatePointsCoveredAmount,
                        offer.certificateCurrency ?? offer.currency
                      )}
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>Validity:</strong>{" "}
                      {offer.certificateValidityDays ?? "Not specified"} days
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>Booking:</strong>{" "}
                      {getBooleanLabel(offer.requiresBooking)} /{" "}
                      {offer.bookingMode ?? "not specified"}
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>Seller confirmation:</strong>{" "}
                      {getBooleanLabel(offer.requiresSellerConfirmation)}
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>Transferable:</strong>{" "}
                      {getBooleanLabel(offer.isTransferable)} /{" "}
                      <strong>Cancellable:</strong>{" "}
                      {getBooleanLabel(offer.isCancellable)}
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>Reference:</strong> 1{" "}
                      {offer.pointsCurrencyCode ?? "POINT"} ={" "}
                      {offer.referenceValuePerPoint ?? 1}{" "}
                      {offer.referenceCurrency ?? "EUR"}
                    </p>
                  </section>

                  {offer.certificateTerms ? (
                    <section
                      style={{
                        border: "1px solid #dddddd",
                        borderRadius: "10px",
                        padding: "12px",
                        background: "#f9fafb",
                        lineHeight: "1.5",
                      }}
                    >
                      <strong>Terms:</strong>
                      <p style={{ margin: "6px 0 0" }}>
                        {offer.certificateTerms}
                      </p>
                    </section>
                  ) : null}

                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      flexWrap: "wrap",
                      marginTop: "4px",
                      alignItems: "flex-start",
                    }}
                  >
                    {offer.organizationId ? (
                      <a
                        href={`/organizations/${offer.organizationId}`}
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
                        Open organization
                      </a>
                    ) : null}

                    <RequestCertificateButton
                      offerId={offer.id}
                      pointsPrice={offer.certificatePointsPrice}
                      pointsCurrencyCode={offer.pointsCurrencyCode}
                      moneyPrice={offer.certificateMoneyPrice}
                      currency={offer.certificateCurrency ?? offer.currency}
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