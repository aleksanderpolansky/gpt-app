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

type AvailabilityRule = {
  id: string;
  weekday: string;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
  offers: Offer | null;
};

export default function AvailabilityRulesPage() {
  const [availabilityRules, setAvailabilityRules] = useState<
    AvailabilityRule[]
  >([]);
  const [message, setMessage] = useState("Loading availability rules...");

  useEffect(() => {
    async function loadAvailabilityRules() {
      const response = await fetch("/api/availability-rules");
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? "Failed to load availability rules");
        return;
      }

      setAvailabilityRules(data.availabilityRules ?? []);
      setMessage("");
    }

    loadAvailabilityRules();
  }, []);

  return (
    <main style={{ padding: "32px", maxWidth: "900px" }}>
      <h1>Availability rules</h1>

      <p>
        This page shows availability rules for bookable offers.
      </p>

      <p>
        <a href="/availability-rules/new">
          Create new availability rule
        </a>
      </p>

      {message && <p>{message}</p>}

      {!message && availabilityRules.length === 0 && (
        <p>No availability rules yet.</p>
      )}

      {availabilityRules.length > 0 && (
        <div style={{ display: "grid", gap: "16px" }}>
          {availabilityRules.map((availabilityRule) => (
            <article
              key={availabilityRule.id}
              style={{
                border: "1px solid #ddd",
                padding: "16px",
                borderRadius: "8px",
              }}
            >
              <h2>
                {availabilityRule.offers
                  ? availabilityRule.offers.title
                  : "Offer not linked"}
              </h2>

              <p>
                <strong>Offer type:</strong>{" "}
                {availabilityRule.offers
                  ? availabilityRule.offers.offer_type
                  : "Not specified"}
              </p>

              <p>
                <strong>Weekday:</strong> {availabilityRule.weekday}
              </p>

              <p>
                <strong>Start time:</strong> {availabilityRule.start_time}
              </p>

              <p>
                <strong>End time:</strong> {availabilityRule.end_time}
              </p>

              <p>
                <strong>Slot duration:</strong>{" "}
                {availabilityRule.slot_duration_minutes} minutes
              </p>

              <p>
                <strong>Buffer before:</strong>{" "}
                {availabilityRule.buffer_before_minutes} minutes
              </p>

              <p>
                <strong>Buffer after:</strong>{" "}
                {availabilityRule.buffer_after_minutes} minutes
              </p>

              <p>
                <strong>Valid from:</strong>{" "}
                {availabilityRule.valid_from || "Not specified"}
              </p>

              <p>
                <strong>Valid until:</strong>{" "}
                {availabilityRule.valid_until || "Not specified"}
              </p>

              <p>
                <strong>Active:</strong>{" "}
                {availabilityRule.is_active ? "Yes" : "No"}
              </p>

              <p>
                <strong>Created at:</strong>{" "}
                {new Date(availabilityRule.created_at).toLocaleString()}
              </p>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}