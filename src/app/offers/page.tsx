"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Organization = {
  id: string;
  organization_name: string;
  organization_type: string;
  status: string;
};

type ValueObject = {
  id: string;
  title: string;
  value_type: string;
  default_price: number | null;
  default_currency: string | null;
  default_duration_minutes?: number | null;
};

type OfferItem = {
  id: string;
  offer_id: string;
  organization_id: string;
  value_object_id: string;
  quantity: number | string;
  unit_price: number | string | null;
  total_price: number | string | null;
  currency: string | null;
  sort_order: number;
  is_required: boolean;
  status: string;
  value_objects: ValueObject | null;
};

type Offer = {
  id: string;
  organization_id?: string | null;
  offer_type: string;
  title: string;
  description: string | null;

  price: number | null;
  regular_price?: number | null;
  currency: string | null;

  is_paid: boolean;
  is_free: boolean;

  is_discount_active?: boolean;
  discount_type?: string | null;
  discount_value?: number | null;
  discount_starts_at?: string | null;
  discount_ends_at?: string | null;
  lowest_price_30_days?: number | null;
  lowest_price_30_days_currency?: string | null;
  lowest_price_30_days_period_start?: string | null;
  lowest_price_30_days_period_end?: string | null;
  discount_legal_note?: string | null;

  certificate_available: boolean;
  certificate_payment_mode?: string | null;
  certificate_points_covered_amount?: number | null;
  certificate_points_price?: number | null;
  certificate_money_price?: number | null;
  certificate_currency?: string | null;
  certificate_terms?: string | null;
  certificate_validity_days?: number | null;
  requires_seller_confirmation?: boolean;
  is_transferable?: boolean;
  is_cancellable?: boolean;
  points_refund_policy?: string | null;
  max_certificates_total?: number | null;
  max_certificates_per_user?: number | null;
  is_public_reward?: boolean;

  points_currency_code?: string | null;
  reference_currency?: string | null;
  reference_value_per_point?: number | null;
  reference_exchange_rate?: number | null;
  reference_exchange_rate_source?: string | null;
  reference_exchange_rate_date?: string | null;

  requires_booking: boolean;
  booking_mode: string;
  default_duration_minutes: number | null;
  min_duration_minutes: number | null;
  max_duration_minutes: number | null;
  quantity_limit: number | null;
  target_receiver_type: string | null;
  status: string;
  created_at: string;
  value_objects: ValueObject | null;
  organizations: Organization | null;
  offer_items?: OfferItem[];
};

function formatMoney(value: number | string | null | undefined, currency: string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "Not specified";
  }

  return `${value} ${currency || ""}`.trim();
}

function formatNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "Not specified";
  }

  return String(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not specified";
  }

  return new Date(value).toLocaleString();
}

function getPaymentModeLabel(paymentMode: string | null | undefined) {
  if (paymentMode === "money_only") {
    return "Money only";
  }

  if (paymentMode === "points_only") {
    return "Points only";
  }

  if (paymentMode === "mixed") {
    return "Mixed: money + points";
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

function getDiscountTypeLabel(discountType: string | null | undefined) {
  if (discountType === "manual_price") {
    return "Manual reduced price";
  }

  if (discountType === "percent") {
    return "Percent";
  }

  if (discountType === "fixed_amount") {
    return "Fixed amount";
  }

  return discountType || "Not specified";
}

function getBooleanLabel(value: boolean | null | undefined) {
  return value ? "Yes" : "No";
}

function getOrganizationHref(organizationId: string | null | undefined) {
  if (!organizationId) {
    return null;
  }

  return `/organizations/${organizationId}`;
}

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadOffers() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/offers", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setErrorMessage(data.error ?? "Failed to load offers");
        return;
      }

      setOffers(data.offers ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadOffers();
  }, []);

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
        <header
          style={{
            marginBottom: "32px",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontSize: "32px",
              lineHeight: "1.2",
              fontWeight: 700,
              margin: "0 0 12px",
            }}
          >
            Offers
          </h1>

          <p
            style={{
              maxWidth: "760px",
              margin: "0 auto 20px",
              color: "#555555",
              fontSize: "16px",
              lineHeight: "1.5",
            }}
          >
            Marketplace offers connected to organizations, value objects,
            certificate rules, discounts and points-based rewards.
          </p>

          <nav
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "24px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/"
              style={{
                color: "#2563eb",
                textDecoration: "underline",
                fontSize: "16px",
              }}
            >
              На главную
            </Link>

            <Link
              href="/organizations"
              style={{
                color: "#2563eb",
                textDecoration: "underline",
                fontSize: "16px",
              }}
            >
              Мои организации
            </Link>

            <Link
              href="/value-objects"
              style={{
                color: "#2563eb",
                textDecoration: "underline",
                fontSize: "16px",
              }}
            >
              Value objects
            </Link>

            <Link
              href="/offers/new"
              style={{
                color: "#2563eb",
                textDecoration: "underline",
                fontSize: "16px",
              }}
            >
              Create new offer
            </Link>
          </nav>
        </header>

        {isLoading && (
          <div
            style={{
              border: "1px solid #dddddd",
              borderRadius: "10px",
              padding: "18px",
              background: "#f9fafb",
            }}
          >
            Loading offers...
          </div>
        )}

        {errorMessage && (
          <div
            style={{
              border: "1px solid #f5c2c7",
              borderRadius: "10px",
              padding: "18px",
              background: "#f8d7da",
              color: "#842029",
            }}
          >
            {errorMessage}
          </div>
        )}

        {!isLoading && !errorMessage && offers.length === 0 && (
          <div
            style={{
              border: "1px solid #facc15",
              borderRadius: "10px",
              padding: "18px",
              background: "#fefce8",
            }}
          >
            No offers yet.
          </div>
        )}

        {!isLoading && !errorMessage && offers.length > 0 && (
          <section
            style={{
              display: "grid",
              gap: "18px",
            }}
          >
            {offers.map((offer) => {
              const organizationHref = getOrganizationHref(offer.organization_id);
              const paymentModeStyle = getPaymentModeStyle(
                offer.certificate_payment_mode
              );

              return (
                <article
                  key={offer.id}
                  style={{
                    border: "1px solid #dddddd",
                    borderRadius: "12px",
                    padding: "20px",
                    background: "#f9fafb",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "16px",
                      marginBottom: "14px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <h2
                        style={{
                          fontSize: "24px",
                          lineHeight: "1.25",
                          fontWeight: 700,
                          margin: "0 0 8px",
                        }}
                      >
                        {offer.title}
                      </h2>

                      <p style={{ margin: 0, color: "#555555" }}>
                        {offer.organizations?.organization_name ??
                          "Not connected"}{" "}
                        / {offer.offer_type}
                      </p>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          borderRadius: "999px",
                          padding: "6px 10px",
                          fontSize: "13px",
                          fontWeight: 700,
                          ...paymentModeStyle,
                        }}
                      >
                        {getPaymentModeLabel(offer.certificate_payment_mode)}
                      </span>

                      <span
                        style={{
                          display: "inline-block",
                          borderRadius: "999px",
                          padding: "6px 10px",
                          fontSize: "13px",
                          fontWeight: 700,
                          background:
                            offer.status === "active" ? "#edf8f0" : "#f5f5f5",
                          color:
                            offer.status === "active" ? "#176b2c" : "#555555",
                          border:
                            offer.status === "active"
                              ? "1px solid #bfe5c8"
                              : "1px solid #dddddd",
                        }}
                      >
                        {offer.status}
                      </span>
                    </div>
                  </div>

                  <section
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: "12px",
                      marginBottom: "16px",
                    }}
                  >
                    <div
                      style={{
                        border: "1px solid #dddddd",
                        borderRadius: "10px",
                        padding: "14px",
                        background: "#ffffff",
                      }}
                    >
                      <div style={{ color: "#666666", marginBottom: "6px" }}>
                        Current price
                      </div>
                      <div style={{ fontSize: "22px", fontWeight: 700 }}>
                        {formatMoney(offer.price, offer.currency)}
                      </div>
                    </div>

                    <div
                      style={{
                        border: "1px solid #dddddd",
                        borderRadius: "10px",
                        padding: "14px",
                        background: "#ffffff",
                      }}
                    >
                      <div style={{ color: "#666666", marginBottom: "6px" }}>
                        Regular price
                      </div>
                      <div style={{ fontSize: "22px", fontWeight: 700 }}>
                        {formatMoney(offer.regular_price, offer.currency)}
                      </div>
                    </div>

                    <div
                      style={{
                        border: "1px solid #bfdbfe",
                        borderRadius: "10px",
                        padding: "14px",
                        background: "#eff6ff",
                      }}
                    >
                      <div style={{ color: "#1e3a8a", marginBottom: "6px" }}>
                        Buyer pays POINT
                      </div>
                      <div style={{ fontSize: "22px", fontWeight: 700 }}>
                        {formatMoney(
                          offer.certificate_points_price ?? 0,
                          offer.points_currency_code ?? "POINT"
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        border: "1px solid #dddddd",
                        borderRadius: "10px",
                        padding: "14px",
                        background: "#ffffff",
                      }}
                    >
                      <div style={{ color: "#666666", marginBottom: "6px" }}>
                        Buyer pays money
                      </div>
                      <div style={{ fontSize: "22px", fontWeight: 700 }}>
                        {formatMoney(
                          offer.certificate_money_price,
                          offer.certificate_currency ?? offer.currency
                        )}
                      </div>
                    </div>
                  </section>

                  <div
                    style={{
                      display: "grid",
                      gap: "6px",
                      marginBottom: "16px",
                    }}
                  >
                    <p style={{ margin: 0 }}>
                      <strong>Organization:</strong>{" "}
                      {organizationHref ? (
                        <Link href={organizationHref}>
                          {offer.organizations?.organization_name ??
                            offer.organization_id}
                        </Link>
                      ) : (
                        "Not connected"
                      )}
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>Main value object:</strong>{" "}
                      {offer.value_objects
                        ? `${offer.value_objects.title} (${offer.value_objects.value_type})`
                        : "Not linked"}
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>Description:</strong>{" "}
                      {offer.description || "Not specified"}
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>Paid:</strong> {getBooleanLabel(offer.is_paid)}{" "}
                      / <strong>Free:</strong> {getBooleanLabel(offer.is_free)}
                    </p>
                  </div>

                  <section
                    style={{
                      border: "1px solid #bfdbfe",
                      borderRadius: "10px",
                      padding: "14px",
                      background: "#eff6ff",
                      marginBottom: "16px",
                      display: "grid",
                      gap: "8px",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "18px",
                        margin: 0,
                      }}
                    >
                      Certificate / reward commercial rules
                    </h3>

                    <p style={{ margin: 0 }}>
                      <strong>Certificate available:</strong>{" "}
                      {getBooleanLabel(offer.certificate_available)}
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>Automatic payment mode:</strong>{" "}
                      {getPaymentModeLabel(offer.certificate_payment_mode)}
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>Amount covered by points:</strong>{" "}
                      {formatMoney(
                        offer.certificate_points_covered_amount,
                        offer.certificate_currency ?? offer.currency
                      )}
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>Buyer will be charged:</strong>{" "}
                      {formatMoney(
                        offer.certificate_points_price ?? 0,
                        offer.points_currency_code ?? "POINT"
                      )}
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>Buyer money payment:</strong>{" "}
                      {formatMoney(
                        offer.certificate_money_price,
                        offer.certificate_currency ?? offer.currency
                      )}
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>Reference:</strong> 1{" "}
                      {offer.points_currency_code ?? "POINT"} ={" "}
                      {formatNumber(offer.reference_value_per_point ?? 1)}{" "}
                      {offer.reference_currency ?? "EUR"}
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>Exchange rate:</strong> 1{" "}
                      {offer.reference_currency ?? "EUR"} ={" "}
                      {formatNumber(offer.reference_exchange_rate)}{" "}
                      {offer.certificate_currency ?? offer.currency ?? ""}
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>Rate source:</strong>{" "}
                      {offer.reference_exchange_rate_source ?? "Not specified"}{" "}
                      / <strong>Rate date:</strong>{" "}
                      {offer.reference_exchange_rate_date ?? "Not specified"}
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>Terms:</strong>{" "}
                      {offer.certificate_terms || "Not specified"}
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>Validity days:</strong>{" "}
                      {offer.certificate_validity_days ?? "Not specified"}
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>Seller confirmation:</strong>{" "}
                      {getBooleanLabel(offer.requires_seller_confirmation)} /{" "}
                      <strong>Transferable:</strong>{" "}
                      {getBooleanLabel(offer.is_transferable)} /{" "}
                      <strong>Cancellable:</strong>{" "}
                      {getBooleanLabel(offer.is_cancellable)}
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>Refund policy:</strong>{" "}
                      {offer.points_refund_policy ?? "Not specified"}
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>Max total:</strong>{" "}
                      {offer.max_certificates_total ?? "Not specified"} /{" "}
                      <strong>Max per user:</strong>{" "}
                      {offer.max_certificates_per_user ?? "Not specified"} /{" "}
                      <strong>Public reward:</strong>{" "}
                      {getBooleanLabel(offer.is_public_reward)}
                    </p>
                  </section>

                  <section
                    style={{
                      border: "1px solid #f0d28a",
                      borderRadius: "10px",
                      padding: "14px",
                      background: "#fff8e6",
                      marginBottom: "16px",
                      display: "grid",
                      gap: "8px",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "18px",
                        margin: 0,
                      }}
                    >
                      Discount and legal price info
                    </h3>

                    <p style={{ margin: 0 }}>
                      <strong>Discount active:</strong>{" "}
                      {getBooleanLabel(offer.is_discount_active)}
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>Discount type:</strong>{" "}
                      {getDiscountTypeLabel(offer.discount_type)}
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>Discount value:</strong>{" "}
                      {formatNumber(offer.discount_value)}
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>Discount period:</strong>{" "}
                      {formatDate(offer.discount_starts_at)} →{" "}
                      {formatDate(offer.discount_ends_at)}
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>Lowest price 30 days before discount:</strong>{" "}
                      {formatMoney(
                        offer.lowest_price_30_days,
                        offer.lowest_price_30_days_currency ?? offer.currency
                      )}
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>30-day period:</strong>{" "}
                      {formatDate(offer.lowest_price_30_days_period_start)} →{" "}
                      {formatDate(offer.lowest_price_30_days_period_end)}
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>Legal note:</strong>{" "}
                      {offer.discount_legal_note || "Not specified"}
                    </p>
                  </section>

                  <div
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: "10px",
                      padding: "14px",
                      background: "#ffffff",
                      marginBottom: "16px",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "18px",
                        margin: "0 0 10px",
                      }}
                    >
                      Offer items
                    </h3>

                    {!offer.offer_items || offer.offer_items.length === 0 ? (
                      <p style={{ margin: 0, color: "#666666" }}>
                        No offer items. This is probably an old/simple offer.
                      </p>
                    ) : (
                      <div style={{ display: "grid", gap: "10px" }}>
                        {offer.offer_items
                          .slice()
                          .sort((a, b) => a.sort_order - b.sort_order)
                          .map((item) => (
                            <div
                              key={item.id}
                              style={{
                                border: "1px solid #dddddd",
                                borderRadius: "8px",
                                padding: "12px",
                                background: "#f9fafb",
                              }}
                            >
                              <p style={{ margin: "0 0 6px" }}>
                                <strong>Value object:</strong>{" "}
                                {item.value_objects
                                  ? `${item.value_objects.title} (${item.value_objects.value_type})`
                                  : item.value_object_id}
                              </p>

                              <p style={{ margin: "0 0 6px" }}>
                                <strong>Quantity:</strong> {item.quantity}
                              </p>

                              <p style={{ margin: "0 0 6px" }}>
                                <strong>Unit price:</strong>{" "}
                                {formatMoney(item.unit_price, item.currency)}
                              </p>

                              <p style={{ margin: "0 0 6px" }}>
                                <strong>Total price:</strong>{" "}
                                {formatMoney(item.total_price, item.currency)}
                              </p>

                              <p style={{ margin: 0 }}>
                                <strong>Required:</strong>{" "}
                                {item.is_required ? "Yes" : "No"} /{" "}
                                <strong>Status:</strong> {item.status}
                              </p>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: "6px",
                      color: "#555555",
                      fontSize: "14px",
                    }}
                  >
                    <p style={{ margin: 0 }}>
                      <strong>Requires booking:</strong>{" "}
                      {getBooleanLabel(offer.requires_booking)}
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>Booking mode:</strong> {offer.booking_mode}
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>Default duration:</strong>{" "}
                      {offer.default_duration_minutes ?? "Not specified"} minutes
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>Min duration:</strong>{" "}
                      {offer.min_duration_minutes ?? "Not specified"} minutes
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>Max duration:</strong>{" "}
                      {offer.max_duration_minutes ?? "Not specified"} minutes
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>Quantity limit:</strong>{" "}
                      {offer.quantity_limit ?? "Not specified"}
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>Target receiver:</strong>{" "}
                      {offer.target_receiver_type || "Not specified"}
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>Offer ID:</strong> {offer.id}
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>Organization ID:</strong>{" "}
                      {offer.organization_id ?? "Not connected"}
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>Created at:</strong>{" "}
                      {new Date(offer.created_at).toLocaleString()}
                    </p>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}