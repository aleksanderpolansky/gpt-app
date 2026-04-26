"use client";

import { useEffect, useState } from "react";

type Offer = {
  id: string;
  title: string;
  offer_type: string;
};

type AvailableSlot = {
  offerId: string;
  availabilityRuleId: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
};

export default function AvailableSlotsPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [offerId, setOfferId] = useState("");
  const [date, setDate] = useState("2026-04-25");
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [message, setMessage] = useState("Loading offers...");
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  useEffect(() => {
    async function loadOffers() {
      const response = await fetch("/api/offers");
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? "Failed to load offers");
        return;
      }

      const loadedOffers = data.offers ?? [];
      setOffers(loadedOffers);

      if (loadedOffers.length > 0) {
        setOfferId(loadedOffers[0].id);
      }

      setMessage("");
    }

    loadOffers();
  }, []);

  async function loadAvailableSlots(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!offerId || !date) {
      setMessage("Offer and date are required");
      return;
    }

    setMessage("");
    setIsLoadingSlots(true);
    setAvailableSlots([]);

    const response = await fetch(
      `/api/offers/${offerId}/available-slots?date=${date}`
    );

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Failed to load available slots");
      setIsLoadingSlots(false);
      return;
    }

    setAvailableSlots(data.availableSlots ?? []);
    setMessage(
      `Found ${(data.availableSlots ?? []).length} slots for ${data.date} (${data.weekday})`
    );
    setIsLoadingSlots(false);
  }

  return (
    <main style={{ padding: "32px", maxWidth: "900px" }}>
      <h1>Available slots</h1>

      <p>
        This page shows available booking slots for a selected offer and date.
      </p>

      <form
        onSubmit={loadAvailableSlots}
        style={{ display: "grid", gap: "16px", maxWidth: "520px" }}
      >
        <label>
          Offer
          <select
            value={offerId}
            onChange={(event) => setOfferId(event.target.value)}
            required
            style={{ display: "block", width: "100%", padding: "8px" }}
          >
            <option value="">Select offer</option>
            {offers.map((offer) => (
              <option key={offer.id} value={offer.id}>
                {offer.title} ({offer.offer_type})
              </option>
            ))}
          </select>
        </label>

        <label>
          Date
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </label>

        <button
          type="submit"
          disabled={isLoadingSlots}
          style={{ padding: "10px 16px", cursor: "pointer" }}
        >
          {isLoadingSlots ? "Loading..." : "Show available slots"}
        </button>
      </form>

      {message && <p style={{ marginTop: "16px" }}>{message}</p>}

      {availableSlots.length > 0 && (
        <div style={{ display: "grid", gap: "12px", marginTop: "16px" }}>
          {availableSlots.map((slot) => (
            <article
              key={`${slot.availabilityRuleId}-${slot.startTime}`}
              style={{
                border: "1px solid #ddd",
                padding: "12px",
                borderRadius: "8px",
              }}
            >
              <p>
                <strong>Start:</strong>{" "}
                {new Date(slot.startTime).toLocaleString()}
              </p>

              <p>
                <strong>End:</strong>{" "}
                {new Date(slot.endTime).toLocaleString()}
              </p>

              <p>
                <strong>Duration:</strong> {slot.durationMinutes} minutes
              </p>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}