"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import {
  getLocaleSearchParam,
  getTimeMessage,
  type LocaleCode,
  type TimeMessageKey,
} from "@/i18n";

const EVENT_TYPE_OPTIONS: Array<{
  readonly value: string;
  readonly labelKey: TimeMessageKey;
}> = [
  { value: "work", labelKey: "time.option.work" },
  { value: "sleep", labelKey: "time.option.sleep" },
  { value: "meal", labelKey: "time.calendarNew.option.meal" },
  { value: "meeting", labelKey: "time.calendarNew.option.meeting" },
  { value: "school", labelKey: "time.calendarNew.option.school" },
  { value: "childcare", labelKey: "time.calendarNew.option.childcare" },
  { value: "travel", labelKey: "time.option.travel" },
  { value: "exercise", labelKey: "time.option.exercise" },
  { value: "study", labelKey: "time.option.study" },
  { value: "rest", labelKey: "time.option.rest" },
  { value: "business", labelKey: "time.calendarNew.option.business" },
  { value: "purchase", labelKey: "time.calendarNew.option.purchase" },
  { value: "family", labelKey: "time.calendarNew.option.family" },
  { value: "free_time", labelKey: "time.option.freeTime" },
  { value: "blocked_time", labelKey: "time.option.blockedTime" },
  { value: "service_booking", labelKey: "time.calendarNew.option.serviceBooking" },
  {
    value: "certificate_redemption",
    labelKey: "time.calendarNew.option.certificateRedemption",
  },
];

const EVENT_STATUS_OPTIONS: Array<{
  readonly value: string;
  readonly labelKey: TimeMessageKey;
}> = [
  { value: "planned", labelKey: "time.calendarNew.status.planned" },
  { value: "confirmed", labelKey: "time.calendarNew.status.confirmed" },
  { value: "completed", labelKey: "time.calendarNew.status.completed" },
  { value: "cancelled", labelKey: "time.calendarNew.status.cancelled" },
  { value: "missed", labelKey: "time.calendarNew.status.missed" },
  { value: "rescheduled", labelKey: "time.calendarNew.status.rescheduled" },
];

function useInterfaceLocale(): LocaleCode {
  const [locale, setLocale] = useState<LocaleCode>("en");

  useEffect(() => {
    function readLocaleFromUrl() {
      if (typeof window === "undefined") {
        return;
      }

      setLocale(getLocaleSearchParam(new URLSearchParams(window.location.search)));
    }

    readLocaleFromUrl();
    window.addEventListener("popstate", readLocaleFromUrl);

    return () => {
      window.removeEventListener("popstate", readLocaleFromUrl);
    };
  }, []);

  return locale;
}

export default function NewCalendarEventPage() {
  const locale = useInterfaceLocale();
  const t = useMemo(
    () => (key: TimeMessageKey) => getTimeMessage(key, locale),
    [locale],
  );

  const [eventType, setEventType] = useState("meeting");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [status, setStatus] = useState("planned");
  const [messageKey, setMessageKey] = useState<TimeMessageKey | null>(null);
  const [fallbackMessage, setFallbackMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessageKey(null);
    setFallbackMessage("");
    setIsSubmitting(true);

    const response = await fetch("/api/calendar/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventType,
        title,
        description,
        startTime,
        endTime,
        status,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessageKey("time.calendarNew.failed");
      setFallbackMessage(data.error ?? "");
      setIsSubmitting(false);
      return;
    }

    setMessageKey("time.calendarNew.success");
    setFallbackMessage("");

    setEventType("meeting");
    setTitle("");
    setDescription("");
    setStartTime("");
    setEndTime("");
    setStatus("planned");
    setIsSubmitting(false);
  }

  const message = messageKey ? fallbackMessage || t(messageKey) : "";

  return (
    <main style={{ padding: "32px", maxWidth: "720px" }}>
      <h1>{t("time.calendarNew.title")}</h1>

      <p>{t("time.calendarNew.subtitle")}</p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px" }}>
        <label>
          {t("time.calendarNew.eventType")}
          <select
            value={eventType}
            onChange={(event) => setEventType(event.target.value)}
            required
            style={{ display: "block", width: "100%", padding: "8px" }}
          >
            {EVENT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t("time.calendarNew.titleLabel")}
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t("time.calendarNew.titlePlaceholder")}
            required
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          {t("time.calendarNew.description")}
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t("time.calendarNew.descriptionPlaceholder")}
            rows={4}
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          {t("time.calendarNew.startTime")}
          <input
            type="datetime-local"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            required
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          {t("time.calendarNew.endTime")}
          <input
            type="datetime-local"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
            required
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          {t("time.calendarNew.status")}
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            required
            style={{ display: "block", width: "100%", padding: "8px" }}
          >
            {EVENT_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{ padding: "10px 16px", cursor: "pointer" }}
        >
          {isSubmitting ? t("time.calendarNew.creating") : t("time.calendarNew.create")}
        </button>
      </form>

      {message && <p style={{ marginTop: "16px" }}>{message}</p>}
    </main>
  );
}
