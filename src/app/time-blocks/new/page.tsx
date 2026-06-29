"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import {
  getLocaleSearchParam,
  getTimeMessage,
  type LocaleCode,
  type TimeMessageKey,
} from "@/i18n";

const BLOCK_TYPE_OPTIONS: Array<{
  readonly value: string;
  readonly labelKey: TimeMessageKey;
}> = [
  { value: "work", labelKey: "time.option.work" },
  { value: "sleep", labelKey: "time.option.sleep" },
  { value: "travel", labelKey: "time.option.travel" },
  { value: "family_obligation", labelKey: "time.option.familyObligation" },
  { value: "recovery", labelKey: "time.option.recovery" },
  { value: "free_time", labelKey: "time.option.freeTime" },
  { value: "blocked_time", labelKey: "time.option.blockedTime" },
  { value: "service_available", labelKey: "time.option.serviceAvailable" },
  { value: "study", labelKey: "time.option.study" },
  { value: "exercise", labelKey: "time.option.exercise" },
  { value: "rest", labelKey: "time.option.rest" },
  { value: "other", labelKey: "time.option.other" },
];

const AVAILABILITY_STATUS_OPTIONS: Array<{
  readonly value: string;
  readonly labelKey: TimeMessageKey;
}> = [
  { value: "busy", labelKey: "time.option.busy" },
  { value: "free", labelKey: "time.option.free" },
  { value: "partially_free", labelKey: "time.option.partiallyFree" },
  { value: "blocked", labelKey: "time.option.blocked" },
  { value: "sleep", labelKey: "time.option.sleep" },
  { value: "work", labelKey: "time.option.work" },
  { value: "travel", labelKey: "time.option.travel" },
  { value: "family_obligation", labelKey: "time.option.familyObligation" },
  { value: "recovery", labelKey: "time.option.recovery" },
  { value: "service_available", labelKey: "time.option.serviceAvailable" },
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

export default function NewTimeBlockPage() {
  const locale = useInterfaceLocale();
  const t = useMemo(
    () => (key: TimeMessageKey) => getTimeMessage(key, locale),
    [locale],
  );

  const [blockType, setBlockType] = useState("work");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [availabilityStatus, setAvailabilityStatus] = useState("busy");
  const [energyExpectation, setEnergyExpectation] = useState("");
  const [attentionRequirement, setAttentionRequirement] = useState("");
  const [canMultitask, setCanMultitask] = useState(false);
  const [messageKey, setMessageKey] = useState<TimeMessageKey | null>(null);
  const [fallbackMessage, setFallbackMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessageKey(null);
    setFallbackMessage("");
    setIsSubmitting(true);

    const response = await fetch("/api/time-blocks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        blockType,
        startTime,
        endTime,
        availabilityStatus,
        energyExpectation,
        attentionRequirement,
        canMultitask,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessageKey("time.new.failed");
      setFallbackMessage(data.error ?? "");
      setIsSubmitting(false);
      return;
    }

    setMessageKey("time.new.success");
    setFallbackMessage("");

    setBlockType("work");
    setStartTime("");
    setEndTime("");
    setAvailabilityStatus("busy");
    setEnergyExpectation("");
    setAttentionRequirement("");
    setCanMultitask(false);
    setIsSubmitting(false);
  }

  const message = messageKey ? fallbackMessage || t(messageKey) : "";

  return (
    <main style={{ padding: "32px", maxWidth: "720px" }}>
      <h1>{t("time.new.title")}</h1>

      <p>{t("time.new.subtitle")}</p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px" }}>
        <label>
          {t("time.new.blockType")}
          <select
            value={blockType}
            onChange={(event) => setBlockType(event.target.value)}
            required
            style={{ display: "block", width: "100%", padding: "8px" }}
          >
            {BLOCK_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t("time.new.startTime")}
          <input
            type="datetime-local"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            required
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          {t("time.new.endTime")}
          <input
            type="datetime-local"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
            required
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          {t("time.new.availabilityStatus")}
          <select
            value={availabilityStatus}
            onChange={(event) => setAvailabilityStatus(event.target.value)}
            required
            style={{ display: "block", width: "100%", padding: "8px" }}
          >
            {AVAILABILITY_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t("time.new.energyExpectation")}
          <input
            value={energyExpectation}
            onChange={(event) => setEnergyExpectation(event.target.value)}
            placeholder={t("time.new.energyPlaceholder")}
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          {t("time.new.attentionRequirement")}
          <input
            value={attentionRequirement}
            onChange={(event) => setAttentionRequirement(event.target.value)}
            placeholder={t("time.new.attentionPlaceholder")}
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          <input
            type="checkbox"
            checked={canMultitask}
            onChange={(event) => setCanMultitask(event.target.checked)}
          />{" "}
          {t("time.new.canMultitask")}
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{ padding: "10px 16px", cursor: "pointer" }}
        >
          {isSubmitting ? t("time.new.creating") : t("time.new.create")}
        </button>
      </form>

      {message && <p style={{ marginTop: "16px" }}>{message}</p>}
    </main>
  );
}
