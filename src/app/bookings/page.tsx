"use client";

import { useEffect, useState } from "react";

type Offer = {
  id: string;
  title: string;
  offer_type: string;
  price: number | null;
  currency: string | null;
};

type CalendarEvent = {
  id: string;
  title: string;
  event_type: string;
  status: string;
  source: string;
  start_time: string;
  end_time: string;
  duration_minutes: number | null;
};

type Booking = {
  id: string;
  offer_id: string | null;
  certificate_id: string | null;
  provider_actor_id: string | null;
  receiver_actor_id: string | null;
  calendar_event_id: string | null;
  planned_activity_id: string | null;
  completed_activity_id: string | null;
  booking_status: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  location_id: string | null;
  created_at: string;
  offers: Offer | null;
  calendar_events: CalendarEvent | null;
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [message, setMessage] = useState("Loading bookings...");

  useEffect(() => {
    async function loadBookings() {
      const response = await fetch("/api/bookings");
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? "Failed to load bookings");
        return;
      }

      setBookings(data.bookings ?? []);
      setMessage("");
    }

    loadBookings();
  }, []);

  return (
    <main style={{ padding: "32px", maxWidth: "900px" }}>
      <h1>Bookings</h1>

      <p>This page shows service bookings connected to offers and calendar events.</p>

      <p>
        <a href="/bookings/new">Create new booking</a>
      </p>

      {message && <p>{message}</p>}

      {!message && bookings.length === 0 && <p>No bookings yet.</p>}

      {bookings.length > 0 && (
        <div style={{ display: "grid", gap: "16px" }}>
          {bookings.map((booking) => (
            <article
              key={booking.id}
              style={{
                border: "1px solid #ddd",
                padding: "16px",
                borderRadius: "8px",
              }}
            >
              <h2>
                {booking.offers ? booking.offers.title : "Booking without offer"}
              </h2>

              <p>
                <strong>Status:</strong> {booking.booking_status}
              </p>

              <p>
                <strong>Offer type:</strong>{" "}
                {booking.offers ? booking.offers.offer_type : "Not linked"}
              </p>

              <p>
                <strong>Price:</strong>{" "}
                {booking.offers?.price ?? "Not specified"}{" "}
                {booking.offers?.currency || ""}
              </p>

              <p>
                <strong>Start:</strong>{" "}
                {new Date(booking.start_time).toLocaleString()}
              </p>

              <p>
                <strong>End:</strong>{" "}
                {new Date(booking.end_time).toLocaleString()}
              </p>

              <p>
                <strong>Duration:</strong> {booking.duration_minutes} minutes
              </p>

              <p>
                <strong>Calendar event:</strong>{" "}
                {booking.calendar_events
                  ? `${booking.calendar_events.title} — ${booking.calendar_events.status}`
                  : "Not linked"}
              </p>

              <p>
                <strong>Calendar source:</strong>{" "}
                {booking.calendar_events
                  ? booking.calendar_events.source
                  : "Not linked"}
              </p>

              <p>
                <strong>Planned activity id:</strong>{" "}
                {booking.planned_activity_id || "Not linked"}
              </p>

              <p>
                <strong>Completed activity id:</strong>{" "}
                {booking.completed_activity_id || "Not completed"}
              </p>

              <p>
                <strong>Created at:</strong>{" "}
                {new Date(booking.created_at).toLocaleString()}
              </p>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}