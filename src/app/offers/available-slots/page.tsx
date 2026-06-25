"use client";

import { useEffect, useState } from "react";
import {
  getOffersMessages,
  type OffersMessages,
} from "../../../i18n/messages/offers";

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

function normalizeLocaleParam(value: string | null | undefined) {
  if (!value) {
    return "ru";
  }

  const normalized = value.toLowerCase();

  if (
    normalized === "ru" ||
    normalized === "pl" ||
    normalized === "en" ||
    normalized === "es" ||
    normalized === "uk" ||
    normalized === "de" ||
    normalized === "cs"
  ) {
    return normalized;
  }

  return "ru";
}

function getAvailableSlotsText(
  messages: OffersMessages["availableSlots"],
  key: string,
  fallback: string
) {
  const value = (messages as unknown as Record<string, unknown>)[key];

  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  return fallback;
}

function getAvailableSlotsResultMessage(
  messages: OffersMessages["availableSlots"],
  count: number,
  date: string | null | undefined,
  weekday: string | null | undefined
) {
  const value = (messages as unknown as Record<string, unknown>)["foundSlots"];

  if (typeof value === "function") {
    return (value as (count: number, date: string, weekday: string) => string)(
      count,
      date ?? "",
      weekday ?? ""
    );
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value
      .replace("{count}", String(count))
      .replace("{date}", date ?? "")
      .replace("{weekday}", weekday ?? "");
  }

  return `Found ${count} slots for ${date ?? ""} ${weekday ? `(${weekday})` : ""}`.trim();
}



export default function AvailableSlotsPage() {
  const [selectedLocale, setSelectedLocale] = useState("ru");
  const t = getOffersMessages(selectedLocale);
  const availableSlotsMessages = t.availableSlots;
  const [offers, setOffers] = useState<Offer[]>([]);
  const [offerId, setOfferId] = useState("");
  const [date, setDate] = useState("2026-04-25");
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [message, setMessage] = useState("");
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  useEffect(() => {


    if (typeof window === "undefined") {


      return;


    }



    const params = new URLSearchParams(window.location.search);


    setSelectedLocale(


      normalizeLocaleParam(params.get("locale") ?? params.get("lang"))


    );


  }, []);



  useEffect(() => {


    async function loadOffers() {


      setMessage(


        getAvailableSlotsText(


          availableSlotsMessages,


          "loadingOffers",


          "Loading offers..."


        )


      );
      const response = await fetch("/api/offers");
      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.error ??
            getAvailableSlotsText(
              availableSlotsMessages,
              "failedToLoadOffers",
              "Failed to load offers"
            )
        );
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
  }, [availableSlotsMessages]);

  async function loadAvailableSlots(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!offerId || !date) {
      setMessage(
        getAvailableSlotsText(
          availableSlotsMessages,
          "offerAndDateRequired",
          "Offer and date are required"
        )
      );
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
      setMessage(
        data.error ??
          getAvailableSlotsText(
            availableSlotsMessages,
            "failedToLoadAvailableSlots",
            "Failed to load available slots"
          )
      );
      setIsLoadingSlots(false);
      return;
    }

    setAvailableSlots(data.availableSlots ?? []);
    setMessage(
      getAvailableSlotsResultMessage(
        availableSlotsMessages,
        (data.availableSlots ?? []).length,
        data.date,
        data.weekday
      )
    );
    setIsLoadingSlots(false);
  }

  return (
    <main style={{ padding: "32px", maxWidth: "900px" }}>
      <h1>{getAvailableSlotsText(availableSlotsMessages, "title", "Available slots")}</h1>

      <p>
        {getAvailableSlotsText(
          availableSlotsMessages,
          "description",
          "This page shows available booking slots for a selected offer and date."
        )}
      </p>

      <form
        onSubmit={loadAvailableSlots}
        style={{ display: "grid", gap: "16px", maxWidth: "520px" }}
      >
        <label>
          {getAvailableSlotsText(availableSlotsMessages, "offerLabel", "Offer")}
          <select
            value={offerId}
            onChange={(event) => setOfferId(event.target.value)}
            required
            style={{ display: "block", width: "100%", padding: "8px" }}
          >
            <option value="">
              {getAvailableSlotsText(
                availableSlotsMessages,
                "selectOffer",
                "Select offer"
              )}
            </option>
            {offers.map((offer) => (
              <option key={offer.id} value={offer.id}>
                {offer.title} ({offer.offer_type})
              </option>
            ))}
          </select>
        </label>

        <label>
          {getAvailableSlotsText(availableSlotsMessages, "dateLabel", "Date")}
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
          {isLoadingSlots
            ? getAvailableSlotsText(availableSlotsMessages, "loading", "Loading...")
            : getAvailableSlotsText(
                availableSlotsMessages,
                "showSlots",
                "Show available slots"
              )}
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
                <strong>
                  {getAvailableSlotsText(availableSlotsMessages, "startLabel", "Start")}:
                </strong>{" "}
                {new Date(slot.startTime).toLocaleString(selectedLocale)}
              </p>

              <p>
                <strong>
                  {getAvailableSlotsText(availableSlotsMessages, "endLabel", "End")}:
                </strong>{" "}
                {new Date(slot.endTime).toLocaleString(selectedLocale)}
              </p>

              <p>
                <strong>
                  {getAvailableSlotsText(
                    availableSlotsMessages,
                    "durationLabel",
                    "Duration"
                  )}:
                </strong> {slot.durationMinutes} minutes
              </p>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}