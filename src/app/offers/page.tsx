"use client";

import { useEffect, useState } from "react";

type ValueObject = {
  id: string;
  title: string;
  value_type: string;
  default_price: number | null;
  default_currency: string | null;
  default_duration_minutes: number | null;
};

type Offer = {
  id: string;
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
};

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [message, setMessage] = useState("Loading offers...");

  useEffect(() => {
    async function loadOffers() {
      const response = await fetch("/api/offers");
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? "Failed to load offers");
        return;
      }

      setOffers(data.offers ?? []);
      setMessage("");
    }

    loadOffers();
  }, []);

  return (
    <main style={{ padding: "32px", maxWidth: "900px" }}>
      <h1>Offers</h1>

      <p>
        This page shows marketplace offers connected to value objects.
      </p>

      <p>
        <a href="/offers/new">Create new offer</a>
      </p>

      {message && <p>{message}</p>}

      {!message && offers.length === 0 && <p>No offers yet.</p>}

      {offers.length > 0 && (
        <div style={{ display: "grid", gap: "16px" }}>
          {offers.map((offer) => (
            <article
              key={offer.id}
              style={{
                border: "1px solid #ddd",
                padding: "16px",
                borderRadius: "8px",
              }}
            >
              <h2>{offer.title}</h2>

              <p>
                <strong>Offer type:</strong> {offer.offer_type}
              </p>

              <p>
                <strong>Value object:</strong>{" "}
                {offer.value_objects
                  ? `${offer.value_objects.title} (${offer.value_objects.value_type})`
                  : "Not linked"}
              </p>

              <p>
                <strong>Description:</strong>{" "}
                {offer.description || "Not specified"}
              </p>

              <p>
                <strong>Price:</strong>{" "}
                {offer.price ?? "Not specified"} {offer.currency || ""}
              </p>

              <p>
                <strong>Paid:</strong> {offer.is_paid ? "Yes" : "No"}
              </p>

              <p>
                <strong>Free:</strong> {offer.is_free ? "Yes" : "No"}
              </p>

              <p>
                <strong>Certificate available:</strong>{" "}
                {offer.certificate_available ? "Yes" : "No"}
              </p>

              <p>
                <strong>Requires booking:</strong>{" "}
                {offer.requires_booking ? "Yes" : "No"}
              </p>

              <p>
                <strong>Booking mode:</strong> {offer.booking_mode}
              </p>

              <p>
                <strong>Default duration:</strong>{" "}
                {offer.default_duration_minutes ?? "Not specified"} minutes
              </p>

              <p>
                <strong>Min duration:</strong>{" "}
                {offer.min_duration_minutes ?? "Not specified"} minutes
              </p>

              <p>
                <strong>Max duration:</strong>{" "}
                {offer.max_duration_minutes ?? "Not specified"} minutes
              </p>

              <p>
                <strong>Quantity limit:</strong>{" "}
                {offer.quantity_limit ?? "Not specified"}
              </p>

              <p>
                <strong>Target receiver:</strong>{" "}
                {offer.target_receiver_type || "Not specified"}
              </p>

              <p>
                <strong>Status:</strong> {offer.status}
              </p>

              <p>
                <strong>Created at:</strong>{" "}
                {new Date(offer.created_at).toLocaleString()}
              </p>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}