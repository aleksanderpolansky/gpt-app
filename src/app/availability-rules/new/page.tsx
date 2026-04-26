"use client";

import { useEffect, useState } from "react";

type Offer = {
  id: string;
  title: string;
  offer_type: string;
  default_duration_minutes: number | null;
  booking_mode: string;
  requires_booking: boolean;
};

export default function NewAvailabilityRulePage() {
  const [offers, setOffers] = useState<Offer[]>([]);

  const [offerId, setOfferId] = useState("");
  const [weekday, setWeekday] = useState("monday");
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("21:00");
  const [slotDurationMinutes, setSlotDurationMinutes] = useState("20");
  const [bufferBeforeMinutes, setBufferBeforeMinutes] = useState("0");
  const [bufferAfterMinutes, setBufferAfterMinutes] = useState("10");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadOffers() {
      const response = await fetch("/api/offers");
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? "Failed to load offers");
        return;
      }

      setOffers(data.offers ?? []);
    }

    loadOffers();
  }, []);

  function applyOfferDefaults(selectedOfferId: string) {
    const selectedOffer = offers.find((offer) => offer.id === selectedOfferId);

    if (!selectedOffer) {
      return;
    }

    if (selectedOffer.default_duration_minutes !== null) {
      setSlotDurationMinutes(String(selectedOffer.default_duration_minutes));
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setIsSubmitting(true);

    const response = await fetch("/api/availability-rules", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        offerId,
        weekday,
        startTime,
        endTime,
        slotDurationMinutes,
        bufferBeforeMinutes,
        bufferAfterMinutes,
        validFrom: validFrom || null,
        validUntil: validUntil || null,
        isActive,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Failed to create availability rule");
      setIsSubmitting(false);
      return;
    }

    setMessage("Availability rule created successfully");

    setOfferId("");
    setWeekday("monday");
    setStartTime("18:00");
    setEndTime("21:00");
    setSlotDurationMinutes("20");
    setBufferBeforeMinutes("0");
    setBufferAfterMinutes("10");
    setValidFrom("");
    setValidUntil("");
    setIsActive(true);
    setIsSubmitting(false);
  }

  return (
    <main style={{ padding: "32px", maxWidth: "720px" }}>
      <h1>Create availability rule</h1>

      <p>
        This page creates availability rules for bookable offers.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px" }}>
        <label>
          Offer
          <select
            value={offerId}
            onChange={(event) => {
              setOfferId(event.target.value);
              applyOfferDefaults(event.target.value);
            }}
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
          Weekday
          <select
            value={weekday}
            onChange={(event) => setWeekday(event.target.value)}
            required
            style={{ display: "block", width: "100%", padding: "8px" }}
          >
            <option value="monday">Monday</option>
            <option value="tuesday">Tuesday</option>
            <option value="wednesday">Wednesday</option>
            <option value="thursday">Thursday</option>
            <option value="friday">Friday</option>
            <option value="saturday">Saturday</option>
            <option value="sunday">Sunday</option>
          </select>
        </label>

        <label>
          Start time
          <input
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            required
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          End time
          <input
            type="time"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
            required
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          Slot duration minutes
          <input
            type="number"
            value={slotDurationMinutes}
            onChange={(event) => setSlotDurationMinutes(event.target.value)}
            required
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          Buffer before minutes
          <input
            type="number"
            value={bufferBeforeMinutes}
            onChange={(event) => setBufferBeforeMinutes(event.target.value)}
            required
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          Buffer after minutes
          <input
            type="number"
            value={bufferAfterMinutes}
            onChange={(event) => setBufferAfterMinutes(event.target.value)}
            required
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          Valid from
          <input
            type="date"
            value={validFrom}
            onChange={(event) => setValidFrom(event.target.value)}
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          Valid until
          <input
            type="date"
            value={validUntil}
            onChange={(event) => setValidUntil(event.target.value)}
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
          />{" "}
          Active
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{ padding: "10px 16px", cursor: "pointer" }}
        >
          {isSubmitting ? "Creating..." : "Create availability rule"}
        </button>
      </form>

      {message && <p style={{ marginTop: "16px" }}>{message}</p>}
    </main>
  );
}