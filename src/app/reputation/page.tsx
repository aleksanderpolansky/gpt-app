"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  getLocaleSearchParam,
  getReputationMessage,
  type LocaleCode,
  type ReputationMessageKey,
} from "@/i18n";

type ReputationTranslate = (
  key: ReputationMessageKey,
  params?: Record<string, string | number | boolean | null | undefined>,
) => string;

type ReputationAccount = {
  readonly actorId?: string | null;
  readonly actorType?: string | null;
  readonly displayName?: string | null;
  readonly balance?: number | string | null;
};

type ReputationSummary = {
  readonly ownerUserId?: string | null;
  readonly totalReputation?: number | string | null;
  readonly accountCount?: number | string | null;
  readonly ledgerEntryCount?: number | string | null;
  readonly accounts?: ReputationAccount[] | null;
};

type ReputationHistoryEntry = {
  readonly ledger_entry_id?: string | null;
  readonly provider_actor_id?: string | null;
  readonly provider_display_name?: string | null;
  readonly provider_type?: string | null;
  readonly provider_organization_id?: string | null;
  readonly source_activity_event_id?: string | null;
  readonly buyer_user_id?: string | null;
  readonly points_amount?: number | string | null;
  readonly reputation_amount?: number | string | null;
  readonly balance_after?: number | string | null;
  readonly metadata_json?: unknown;
  readonly created_at?: string | null;
};

type ReputationSummaryResponse = {
  readonly ok?: boolean;
  readonly summary?: ReputationSummary | null;
  readonly error?: string;
};

type ReputationHistoryResponse = {
  readonly ok?: boolean;
  readonly history?: ReputationHistoryEntry[] | null;
  readonly error?: string;
};

const NUMBER_LOCALE_MAP: Record<LocaleCode, string> = {
  ru: "ru-RU",
  pl: "pl-PL",
  en: "en-US",
  es: "es-ES",
  uk: "uk-UA",
  de: "de-DE",
  cs: "cs-CZ",
};

const EMPTY_SUMMARY: ReputationSummary = {
  totalReputation: 0,
  accountCount: 0,
  ledgerEntryCount: 0,
  accounts: [],
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

function normalizeInteger(value: unknown): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.trunc(parsed);
}

function formatInteger(value: unknown, locale: LocaleCode): string {
  return new Intl.NumberFormat(NUMBER_LOCALE_MAP[locale], {
    maximumFractionDigits: 0,
  }).format(normalizeInteger(value));
}

function formatPoints(value: unknown, locale: LocaleCode): string {
  const parsed = Number(value);

  return new Intl.NumberFormat(NUMBER_LOCALE_MAP[locale], {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(parsed) ? parsed : 0);
}

function formatDate(
  value: string | null | undefined,
  locale: LocaleCode,
  t: ReputationTranslate,
): string {
  if (!value) {
    return t("reputation.noDate");
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString(NUMBER_LOCALE_MAP[locale], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function readCertificateTitle(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const metadataRecord = metadata as Record<string, unknown>;
  const snapshot = metadataRecord.certificateSnapshot;

  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return null;
  }

  const snapshotRecord = snapshot as Record<string, unknown>;

  for (const key of ["title", "activityTitle", "name", "valueObjectTitle"]) {
    const value = snapshotRecord[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

export default function ReputationPage() {
  const locale = useInterfaceLocale();
  const t = useMemo<ReputationTranslate>(
    () => (key, params) => getReputationMessage(key, locale, params),
    [locale],
  );
  const [summary, setSummary] = useState<ReputationSummary>(EMPTY_SUMMARY);
  const [history, setHistory] = useState<ReputationHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadReputation() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [summaryResponse, historyResponse] = await Promise.all([
        fetch("/api/reputation/summary", {
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        }),
        fetch("/api/reputation/history?limit=100&offset=0", {
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        }),
      ]);

      const summaryData =
        (await summaryResponse.json()) as ReputationSummaryResponse;
      const historyData =
        (await historyResponse.json()) as ReputationHistoryResponse;

      if (!summaryResponse.ok || !summaryData.ok) {
        throw new Error(summaryData.error ?? t("reputation.loadError"));
      }

      if (!historyResponse.ok || !historyData.ok) {
        throw new Error(historyData.error ?? t("reputation.loadError"));
      }

      setSummary(summaryData.summary ?? EMPTY_SUMMARY);
      setHistory(Array.isArray(historyData.history) ? historyData.history : []);
    } catch (error) {
      setSummary(EMPTY_SUMMARY);
      setHistory([]);
      setErrorMessage(
        error instanceof Error ? error.message : t("reputation.loadError"),
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadReputation();
  }, []);

  const accounts = Array.isArray(summary.accounts) ? summary.accounts : [];

  return (
    <main className="min-h-screen bg-[#f0f2f7] p-5 text-[#1a1d2e]">
      <div className="mx-auto max-w-5xl">
        <header className="mb-4 flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#22c55e]">
              {t("reputation.eyebrow")}
            </p>
            <h1 className="mt-2 text-[24px] font-bold">
              {t("reputation.historyTitle")}
            </h1>
            <p className="mt-2 max-w-3xl text-[14px] leading-6 text-[#5a5f7a]">
              {t("reputation.description")}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href={`/?locale=${locale}`}
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#dfe3f1] bg-white px-4 py-2 text-[13px] font-bold text-[#4a4f6a] transition hover:bg-gray-50"
            >
              {t("reputation.back")}
            </Link>
            <button
              type="button"
              onClick={() => void loadReputation()}
              disabled={isLoading}
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#dfe3f1] bg-white px-4 py-2 text-[13px] font-bold text-[#4a4f6a] transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading
                ? t("reputation.refreshing")
                : t("reputation.refresh")}
            </button>
          </div>
        </header>

        <section className="mb-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-wide text-[#7c8099]">
              {t("reputation.total")}
            </div>
            <div className="mt-2 text-[26px] font-bold">
              {formatInteger(summary.totalReputation, locale)}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-wide text-[#7c8099]">
              {t("reputation.accounts")}
            </div>
            <div className="mt-2 text-[26px] font-bold">
              {formatInteger(summary.accountCount, locale)}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-wide text-[#7c8099]">
              {t("reputation.transactions")}
            </div>
            <div className="mt-2 text-[26px] font-bold">
              {formatInteger(summary.ledgerEntryCount, locale)}
            </div>
          </div>
        </section>

        <section className="mb-4 rounded-2xl border border-[#dcefe2] bg-[#f4fbf6] p-5">
          <h2 className="text-[15px] font-bold text-[#166534]">
            {t("reputation.whatItMeans")}
          </h2>
          <p className="mt-2 text-[13px] leading-6 text-[#42604a]">
            {t("reputation.whatItMeansBody")}
          </p>
        </section>

        {accounts.length > 0 ? (
          <section className="mb-4 rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-[15px] font-bold">
              {t("reputation.accounts")}
            </h2>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {accounts.map((account) => (
                <div
                  key={account.actorId ?? account.displayName}
                  className="flex items-center justify-between rounded-xl bg-[#f8fafc] px-4 py-3"
                >
                  <div>
                    <div className="text-[13px] font-bold">
                      {account.displayName ?? account.actorType ?? "—"}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[#7c8099]">
                      {account.actorType ?? "actor"}
                    </div>
                  </div>
                  <div className="text-[18px] font-bold text-[#166534]">
                    {formatInteger(account.balance, locale)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {errorMessage ? (
          <div className="rounded-2xl border border-[#ffd5d5] bg-[#fff7f7] p-4 text-[14px] font-semibold text-[#b42318]">
            {errorMessage}
          </div>
        ) : null}

        {!errorMessage && isLoading ? (
          <div className="rounded-2xl bg-white p-5 text-[14px] font-semibold text-[#5a5f7a] shadow-sm">
            {t("reputation.loading")}
          </div>
        ) : null}

        {!errorMessage && !isLoading && history.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#cbd5e1] bg-white p-5 text-[14px] font-semibold text-[#64748b] shadow-sm">
            {t("reputation.empty")}
          </div>
        ) : null}

        {!errorMessage && history.length > 0 ? (
          <section className="space-y-3">
            {history.map((entry) => {
              const certificateTitle = readCertificateTitle(entry.metadata_json);
              const activityEventId = entry.source_activity_event_id;

              return (
                <article
                  key={
                    entry.ledger_entry_id ??
                    `${entry.source_activity_event_id}-${entry.created_at}`
                  }
                  className="rounded-2xl border border-[#e5e7ef] bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="text-[16px] font-bold">
                        {certificateTitle ?? t("reputation.orderedCertificate")}
                      </h2>
                      <p className="mt-1 text-[13px] text-[#5a5f7a]">
                        {t("reputation.provider")}:{" "}
                        <span className="font-semibold">
                          {entry.provider_display_name ?? "—"}
                        </span>
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#f4fbf6] px-3 py-2 text-[18px] font-bold text-[#166534]">
                      +{formatInteger(entry.reputation_amount, locale)}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 text-[12px] text-[#64748b] md:grid-cols-3">
                    <div>
                      {t("reputation.pointsAmount")}:{" "}
                      <span className="font-semibold text-[#1a1d2e]">
                        {formatPoints(entry.points_amount, locale)} POINTS
                      </span>
                    </div>
                    <div>
                      {t("reputation.reputationAmount")}:{" "}
                      <span className="font-semibold text-[#1a1d2e]">
                        {formatInteger(entry.reputation_amount, locale)}
                      </span>
                    </div>
                    <div>
                      {t("reputation.balanceAfter")}:{" "}
                      <span className="font-semibold text-[#1a1d2e]">
                        {formatInteger(entry.balance_after, locale)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col gap-2 border-t border-[#eef0f5] pt-3 text-[12px] sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-[#7c8099]">
                      {formatDate(entry.created_at, locale, t)}
                    </span>

                    {activityEventId ? (
                      <Link
                        href={`/gift-certificates/${activityEventId}?locale=${locale}`}
                        className="font-bold text-[#3b6ef8] hover:underline"
                      >
                        {t("reputation.openCertificate")}
                      </Link>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </section>
        ) : null}
      </div>
    </main>
  );
}
