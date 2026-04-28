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
  target_receiver_type: string | null;
  status: string;
  created_at: string;
  value_objects: ValueObject | null;
  organizations: Organization | null;
  offer_items?: OfferItem[];
};

function formatMoney(value: number | string | null, currency: string | null) {
  if (value === null || value === undefined || value === "") {
    return "Not specified";
  }

  return `${value} ${currency || ""}`.trim();
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
          maxWidth: "1000px",
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
              maxWidth: "720px",
              margin: "0 auto 20px",
              color: "#555555",
              fontSize: "16px",
              lineHeight: "1.5",
            }}
          >
            Marketplace offers connected to organizations, value objects and
            offer items.
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
            {offers.map((offer) => (
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
                <h2
                  style={{
                    fontSize: "24px",
                    lineHeight: "1.25",
                    fontWeight: 700,
                    margin: "0 0 12px",
                  }}
                >
                  {offer.title}
                </h2>

                <div
                  style={{
                    display: "grid",
                    gap: "6px",
                    marginBottom: "16px",
                  }}
                >
                  <p style={{ margin: 0 }}>
                    <strong>Organization:</strong>{" "}
                    {offer.organizations?.organization_name ?? "Not connected"}
                  </p>

                  <p style={{ margin: 0 }}>
                    <strong>Offer type:</strong> {offer.offer_type}
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
                    <strong>Offer price:</strong>{" "}
                    {formatMoney(offer.price, offer.currency)}
                  </p>

                  <p style={{ margin: 0 }}>
                    <strong>Paid:</strong> {offer.is_paid ? "Yes" : "No"}{" "}
                    / <strong>Free:</strong> {offer.is_free ? "Yes" : "No"}
                  </p>

                  <p style={{ margin: 0 }}>
                    <strong>Certificate available:</strong>{" "}
                    {offer.certificate_available ? "Yes" : "No"}
                  </p>

                  <p style={{ margin: 0 }}>
                    <strong>Requires booking:</strong>{" "}
                    {offer.requires_booking ? "Yes" : "No"}
                  </p>

                  <p style={{ margin: 0 }}>
                    <strong>Booking mode:</strong> {offer.booking_mode}
                  </p>

                  <p style={{ margin: 0 }}>
                    <strong>Status:</strong> {offer.status}
                  </p>
                </div>

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
            ))}
          </section>
        )}
      </div>
    </main>
  );
}