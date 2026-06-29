"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getLocaleSearchParam,
  getTimeMessage,
  type LocaleCode,
  type TimeMessageKey,
} from "@/i18n";

type TimeBlock = {
  id: string;
  block_type: string;
  start_time: string;
  end_time: string;
  duration_minutes: number | null;
  availability_status: string;
  energy_expectation: string | null;
  attention_requirement: string | null;
  can_multitask: boolean;
  source: string;
  created_at: string;
};

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

function getDateLocale(locale: LocaleCode) {
  const dateLocales: Record<LocaleCode, string> = {
    ru: "ru-RU",
    pl: "pl-PL",
    en: "en-US",
    es: "es-ES",
    uk: "uk-UA",
    de: "de-DE",
    cs: "cs-CZ",
  };

  return dateLocales[locale] ?? "en-US";
}

export default function TimeBlocksPage() {
  const locale = useInterfaceLocale();
  const t = useMemo(
    () => (key: TimeMessageKey) => getTimeMessage(key, locale),
    [locale],
  );

  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [messageKey, setMessageKey] = useState<TimeMessageKey | null>(
    "time.blocks.loading",
  );
  const [fallbackMessage, setFallbackMessage] = useState("");

  useEffect(() => {
    async function loadTimeBlocks() {
      const response = await fetch("/api/time-blocks");
      const data = await response.json();

      if (!response.ok) {
        setMessageKey("time.blocks.loadError");
        setFallbackMessage(data.error ?? "");
        return;
      }

      setTimeBlocks(data.timeBlocks ?? []);
      setMessageKey(null);
      setFallbackMessage("");
    }

    loadTimeBlocks();
  }, []);

  const dateLocale = getDateLocale(locale);
  const message = messageKey ? fallbackMessage || t(messageKey) : "";

  return (
    <main style={{ padding: "32px", maxWidth: "900px" }}>
      <h1>{t("time.blocks.title")}</h1>

      <p>{t("time.blocks.subtitle")}</p>

      <p>
        <a href="/time-blocks/new">{t("time.blocks.createLink")}</a>
      </p>

      {message && <p>{message}</p>}

      {!message && timeBlocks.length === 0 && <p>{t("time.blocks.empty")}</p>}

      {timeBlocks.length > 0 && (
        <div style={{ display: "grid", gap: "16px" }}>
          {timeBlocks.map((timeBlock) => (
            <article
              key={timeBlock.id}
              style={{
                border: "1px solid #ddd",
                padding: "16px",
                borderRadius: "8px",
              }}
            >
              <h2>{timeBlock.block_type}</h2>

              <p>
                <strong>{t("time.blocks.start")}:</strong>{" "}
                {new Date(timeBlock.start_time).toLocaleString(dateLocale)}
              </p>

              <p>
                <strong>{t("time.blocks.end")}:</strong>{" "}
                {new Date(timeBlock.end_time).toLocaleString(dateLocale)}
              </p>

              <p>
                <strong>{t("time.blocks.duration")}:</strong>{" "}
                {timeBlock.duration_minutes ?? t("time.blocks.notCalculated")}
              </p>

              <p>
                <strong>{t("time.blocks.availabilityStatus")}:</strong>{" "}
                {timeBlock.availability_status}
              </p>

              <p>
                <strong>{t("time.blocks.energyExpectation")}:</strong>{" "}
                {timeBlock.energy_expectation ?? t("time.blocks.notSpecified")}
              </p>

              <p>
                <strong>{t("time.blocks.attentionRequirement")}:</strong>{" "}
                {timeBlock.attention_requirement ?? t("time.blocks.notSpecified")}
              </p>

              <p>
                <strong>{t("time.blocks.canMultitask")}:</strong>{" "}
                {timeBlock.can_multitask
                  ? t("time.blocks.yes")
                  : t("time.blocks.no")}
              </p>

              <p>
                <strong>{t("time.blocks.source")}:</strong> {timeBlock.source}
              </p>

              <p>
                <strong>{t("time.blocks.createdAt")}:</strong>{" "}
                {new Date(timeBlock.created_at).toLocaleString(dateLocale)}
              </p>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
