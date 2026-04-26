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

type AvailableSlot = {
  offerId: string;
  availabilityRuleId: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
};

export default function NewBookingPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [offerId, setOfferId] = useState("");
  const [date, setDate] = useState("2026-04-25");
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlotStartTime, setSelectedSlotStartTime] = useState("");
  const [message, setMessage] = useState("Loading offers...");
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setSelectedSlotStartTime("");

    const response = await fetch(
      `/api/offers/${offerId}/available-slots?date=${date}`
    );

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Failed to load available slots");
      setIsLoadingSlots(false);
      return;
    }

    const slots = data.availableSlots ?? [];

    setAvailableSlots(slots);

    if (slots.length > 0) {
      setSelectedSlotStartTime(slots[0].startTime);
    }

    setMessage(`Found ${slots.length} slots for ${data.date} (${data.weekday})`);
    setIsLoadingSlots(false);
  }

  async function createBooking() {
    const selectedSlot = availableSlots.find(
      (slot) => slot.startTime === selectedSlotStartTime
    );

    if (!selectedSlot) {
      setMessage("Select a slot first");
      return;
    }

    setMessage("");
    setIsSubmitting(true);

    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        offerId: selectedSlot.offerId,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        rawInput: "Booking created from /bookings/new",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Failed to create booking");
      setIsSubmitting(false);
      return;
    }

    setMessage("Booking created successfully");
    setIsSubmitting(false);
  }

  return (
    <main style={{ padding: "32px", maxWidth: "900px" }}>
      <h1>Create booking</h1>

      <p>
        This page loads available slots for a selected offer and creates a
        booking.
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
        <section style={{ marginTop: "24px" }}>
          <h2>Select slot</h2>

          <div style={{ display: "grid", gap: "12px", maxWidth: "520px" }}>
            <select
              value={selectedSlotStartTime}
              onChange={(event) => setSelectedSlotStartTime(event.target.value)}
              style={{ display: "block", width: "100%", padding: "8px" }}
            >
              {availableSlots.map((slot) => (
                <option key={slot.startTime} value={slot.startTime}>
                  {new Date(slot.startTime).toLocaleString()} —{" "}
                  {new Date(slot.endTime).toLocaleTimeString()} (
                  {slot.durationMinutes} min)
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={createBooking}
              disabled={isSubmitting}
              style={{ padding: "10px 16px", cursor: "pointer" }}
            >
              {isSubmitting ? "Creating..." : "Create booking"}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}