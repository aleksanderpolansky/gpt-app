"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Locale = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";
type RunStatus =
  | "pending"
  | "processing"
  | "processed"
  | "needs_clarification"
  | "failed"
  | "cancelled"
  | "not_started";

type ReviewField = {
  key?: string;
  label?: string;
  value?: string;
  status?: "ready" | "candidate" | "missing";
  note?: string;
  confidence?: number;
};

type ActivityEnrichmentResponse = {
  ok?: boolean;
  error?: string;
  activityEvent?: {
    id?: string | null;
    title?: string | null;
    inputText?: string | null;
    description?: string | null;
    scheduleModeCode?: string | null;
    scheduledDate?: string | null;
    scheduleStartDate?: string | null;
    scheduleEndDate?: string | null;
    deadlineAt?: string | null;
    startedAt?: string | null;
    endedAt?: string | null;
    durationMinutes?: number | null;
  } | null;
  run?: {
    id?: string | null;
    status?: RunStatus | null;
    sourceText?: string | null;
    resultJson?: {
      activityTitle?: string | null;
      summary?: string | null;
      fields?: ReviewField[];
      counters?: {
        ready?: number;
        candidate?: number;
        missing?: number;
      };
      warnings?: string[];
      modelName?: string | null;
      modelBacked?: boolean;
    } | null;
    errorJson?: {
      message?: string | null;
      name?: string | null;
    } | null;
    updatedAt?: string | null;
  } | null;
};

const COPY: Record<
  Locale,
  {
    back: string;
    title: string;
    saved: string;
    pending: string;
    processing: string;
    processed: string;
    clarification: string;
    failed: string;
    cancelled: string;
    notStarted: string;
    source: string;
    summary: string;
    warnings: string;
    ready: string;
    candidate: string;
    missing: string;
    refresh: string;
    error: string;
  }
> = {
  en: {
    back: "Calendar",
    title: "Activity Container",
    saved: "The activity is already saved.",
    pending: "Analysis is queued.",
    processing: "Analysis in progress…",
    processed: "Analysis completed.",
    clarification: "Some parameters require confirmation.",
    failed: "Analysis failed. The activity remains saved.",
    cancelled: "Analysis was cancelled.",
    notStarted: "Analysis has not started.",
    source: "Source text",
    summary: "Analysis summary",
    warnings: "Requires attention",
    ready: "Ready",
    candidate: "Candidate",
    missing: "Missing",
    refresh: "Refresh",
    error: "Could not load the Activity Container.",
  },
  pl: {
    back: "Kalendarz",
    title: "Kontener aktywności",
    saved: "Aktywność jest już zapisana.",
    pending: "Analiza oczekuje w kolejce.",
    processing: "Analiza trwa…",
    processed: "Analiza zakończona.",
    clarification: "Niektóre parametry wymagają potwierdzenia.",
    failed: "Analiza nie powiodła się. Aktywność pozostaje zapisana.",
    cancelled: "Analiza została anulowana.",
    notStarted: "Analiza nie została uruchomiona.",
    source: "Tekst źródłowy",
    summary: "Podsumowanie analizy",
    warnings: "Wymaga uwagi",
    ready: "Gotowe",
    candidate: "Kandydat",
    missing: "Brak",
    refresh: "Odśwież",
    error: "Nie udało się wczytać kontenera aktywności.",
  },
  ru: {
    back: "Календарь",
    title: "Контейнер активности",
    saved: "Активность уже сохранена.",
    pending: "Анализ ожидает запуска.",
    processing: "Активность анализируется…",
    processed: "Анализ завершён.",
    clarification: "Некоторые параметры требуют подтверждения.",
    failed: "Анализ не выполнен. Активность остаётся сохранённой.",
    cancelled: "Анализ отменён.",
    notStarted: "Анализ ещё не запущен.",
    source: "Исходный текст",
    summary: "Результат анализа",
    warnings: "Требует внимания",
    ready: "Готово",
    candidate: "Кандидат",
    missing: "Отсутствует",
    refresh: "Обновить",
    error: "Не удалось загрузить контейнер активности.",
  },
  uk: {
    back: "Календар",
    title: "Контейнер активності",
    saved: "Активність уже збережено.",
    pending: "Аналіз очікує запуску.",
    processing: "Активність аналізується…",
    processed: "Аналіз завершено.",
    clarification: "Деякі параметри потребують підтвердження.",
    failed: "Аналіз не виконано. Активність залишається збереженою.",
    cancelled: "Аналіз скасовано.",
    notStarted: "Аналіз ще не запущено.",
    source: "Вихідний текст",
    summary: "Результат аналізу",
    warnings: "Потребує уваги",
    ready: "Готово",
    candidate: "Кандидат",
    missing: "Відсутнє",
    refresh: "Оновити",
    error: "Не вдалося завантажити контейнер активності.",
  },
  de: {
    back: "Kalender",
    title: "Aktivitätscontainer",
    saved: "Die Aktivität ist bereits gespeichert.",
    pending: "Die Analyse wartet auf den Start.",
    processing: "Aktivität wird analysiert…",
    processed: "Analyse abgeschlossen.",
    clarification: "Einige Parameter müssen bestätigt werden.",
    failed: "Analyse fehlgeschlagen. Die Aktivität bleibt gespeichert.",
    cancelled: "Analyse abgebrochen.",
    notStarted: "Analyse wurde noch nicht gestartet.",
    source: "Quelltext",
    summary: "Analyseergebnis",
    warnings: "Erfordert Aufmerksamkeit",
    ready: "Bereit",
    candidate: "Kandidat",
    missing: "Fehlt",
    refresh: "Aktualisieren",
    error: "Aktivitätscontainer konnte nicht geladen werden.",
  },
  es: {
    back: "Calendario",
    title: "Contenedor de actividad",
    saved: "La actividad ya está guardada.",
    pending: "El análisis está en cola.",
    processing: "Analizando actividad…",
    processed: "Análisis completado.",
    clarification: "Algunos parámetros requieren confirmación.",
    failed: "El análisis falló. La actividad permanece guardada.",
    cancelled: "El análisis fue cancelado.",
    notStarted: "El análisis aún no ha comenzado.",
    source: "Texto fuente",
    summary: "Resultado del análisis",
    warnings: "Requiere atención",
    ready: "Listo",
    candidate: "Candidato",
    missing: "Falta",
    refresh: "Actualizar",
    error: "No se pudo cargar el contenedor de actividad.",
  },
  cs: {
    back: "Kalendář",
    title: "Kontejner aktivity",
    saved: "Aktivita je již uložena.",
    pending: "Analýza čeká na spuštění.",
    processing: "Aktivita se analyzuje…",
    processed: "Analýza dokončena.",
    clarification: "Některé parametry vyžadují potvrzení.",
    failed: "Analýza selhala. Aktivita zůstává uložena.",
    cancelled: "Analýza byla zrušena.",
    notStarted: "Analýza ještě nebyla spuštěna.",
    source: "Zdrojový text",
    summary: "Výsledek analýzy",
    warnings: "Vyžaduje pozornost",
    ready: "Hotovo",
    candidate: "Kandidát",
    missing: "Chybí",
    refresh: "Obnovit",
    error: "Kontejner aktivity se nepodařilo načíst.",
  },
};

function normalizeLocale(value: string | null): Locale {
  return value === "en" ||
    value === "pl" ||
    value === "ru" ||
    value === "uk" ||
    value === "de" ||
    value === "es" ||
    value === "cs"
    ? value
    : "pl";
}

function statusCopy(
  status: RunStatus,
  copy: (typeof COPY)[Locale],
) {
  if (status === "pending") return copy.pending;
  if (status === "processing") return copy.processing;
  if (status === "processed") return copy.processed;
  if (status === "needs_clarification") {
    return copy.clarification;
  }
  if (status === "failed") return copy.failed;
  if (status === "cancelled") return copy.cancelled;

  return copy.notStarted;
}

function statusClass(status: RunStatus) {
  if (status === "processed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (status === "needs_clarification" || status === "pending") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (status === "failed" || status === "cancelled") {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }

  return "border-[#c8d2f4] bg-[#eef2ff] text-[#315ee7]";
}

function fieldClass(status: ReviewField["status"]) {
  if (status === "ready") {
    return "border-emerald-200 bg-emerald-50";
  }

  if (status === "candidate") {
    return "border-amber-200 bg-amber-50";
  }

  return "border-rose-200 bg-rose-50";
}

export default function SavedActivityReviewClient({
  activityEventId,
}: {
  activityEventId: string;
}) {
  const searchParams = useSearchParams();
  const locale = normalizeLocale(searchParams.get("locale"));
  const returnTo = searchParams.get("returnTo") === "calendar-rebuild"
    ? "calendar-rebuild"
    : "calendar";
  const focusDate = searchParams.get("focusDate");
  const copy = COPY[locale];
  const [payload, setPayload] =
    useState<ActivityEnrichmentResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function load() {
      try {
        const response = await fetch(
          `/api/calendar/activity-enrichment/${encodeURIComponent(
            activityEventId,
          )}`,
          {
            credentials: "include",
            cache: "no-store",
          },
        );
        const next = (
          await response.json().catch(() => null)
        ) as ActivityEnrichmentResponse | null;

        if (!response.ok || next?.ok !== true) {
          throw new Error(
            next?.error ||
              `Activity Container request failed: ${response.status}`,
          );
        }

        if (cancelled) {
          return;
        }

        setPayload(next);
        setLoadError(null);

        const status = next.run?.status ?? "not_started";

        if (status === "pending" || status === "processing") {
          timer = setTimeout(load, 1500);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : copy.error,
          );
        }
      }
    }

    void load();

    return () => {
      cancelled = true;

      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [activityEventId, copy.error, refreshKey]);

  const status: RunStatus =
    payload?.run?.status ?? "not_started";
  const result = payload?.run?.resultJson ?? null;
  const fields = useMemo(
    () => (Array.isArray(result?.fields) ? result.fields : []),
    [result?.fields],
  );
  const counters = {
    ready:
      result?.counters?.ready ??
      fields.filter((field) => field.status === "ready").length,
    candidate:
      result?.counters?.candidate ??
      fields.filter((field) => field.status === "candidate").length,
    missing:
      result?.counters?.missing ??
      fields.filter((field) => field.status === "missing").length,
  };
  const sourceText =
    payload?.run?.sourceText ??
    payload?.activityEvent?.inputText ??
    "";
  const title =
    result?.activityTitle ??
    payload?.activityEvent?.title ??
    copy.title;
  const warnings = Array.isArray(result?.warnings)
    ? result.warnings.filter(Boolean)
    : [];
  const calendarHref = focusDate
    ? `/${returnTo}?locale=${locale}&focusDate=${encodeURIComponent(
        focusDate,
      )}`
    : `/${returnTo}?locale=${locale}`;

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-[#f0f2f7] px-4 py-6 text-[#1a1d2e] sm:px-6 lg:px-10">
      <section className="mx-auto w-full max-w-6xl space-y-5">
        <header className="rounded-[28px] border border-black/[0.06] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Link
                href={calendarHref}
                className="inline-flex rounded-xl border border-[#dfe5f1] bg-white px-4 py-2 text-sm font-bold text-[#52607a]"
              >
                {copy.back}
              </Link>
              <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.28em] text-[#3b6ef8]">
                CUX4 · REQUIRED ACTIVITY CONTAINER
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-[-0.03em]">
                {copy.title}
              </h1>
              <p className="mt-2 text-sm font-semibold text-[#68708a]">
                {copy.saved}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRefreshKey((value) => value + 1)}
              className="rounded-xl border border-[#d8deef] bg-white px-4 py-2 text-sm font-bold text-[#667091]"
            >
              {copy.refresh}
            </button>
          </div>
        </header>

        <section
          className={`rounded-2xl border p-4 shadow-sm ${statusClass(
            status,
          )}`}
        >
          <div className="flex items-center gap-3">
            {status === "pending" || status === "processing" ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent" />
            ) : null}
            <p className="text-sm font-extrabold">
              {statusCopy(status, copy)}
            </p>
          </div>
        </section>

        {loadError ? (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">
            {copy.error} {loadError}
          </section>
        ) : null}

        <section className="rounded-[24px] border border-[#dfe5f1] bg-white p-5 shadow-sm">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#7c8099]">
            {copy.source}
          </p>
          <h2 className="mt-3 text-xl font-bold">{title}</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#52607a]">
            {sourceText || "—"}
          </p>
        </section>

        {result ? (
          <>
            <section className="grid gap-3 sm:grid-cols-3">
              {[
                [copy.ready, counters.ready, "border-emerald-200 bg-emerald-50 text-emerald-800"],
                [copy.candidate, counters.candidate, "border-amber-200 bg-amber-50 text-amber-800"],
                [copy.missing, counters.missing, "border-rose-200 bg-rose-50 text-rose-800"],
              ].map(([label, value, className]) => (
                <div
                  key={String(label)}
                  className={`rounded-2xl border p-4 ${className}`}
                >
                  <p className="text-2xl font-bold">{String(value)}</p>
                  <p className="mt-1 text-xs font-extrabold uppercase tracking-[0.18em]">
                    {String(label)}
                  </p>
                </div>
              ))}
            </section>

            <section className="rounded-[24px] border border-[#dfe5f1] bg-white p-5 shadow-sm">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#7c8099]">
                {copy.summary}
              </p>
              <p className="mt-3 text-sm font-semibold leading-6 text-[#52607a]">
                {result.summary || "—"}
              </p>
            </section>

            <section className="grid gap-4">
              {fields.map((field, index) => (
                <article
                  key={field.key || `${field.label}-${index}`}
                  className={`rounded-[20px] border p-4 shadow-sm ${fieldClass(
                    field.status,
                  )}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#52607a]">
                      {field.label || field.key || "Field"}
                    </p>
                    <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold text-[#52607a]">
                      {field.status || "missing"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-bold leading-6">
                    {field.value || "—"}
                  </p>
                  {field.note ? (
                    <p className="mt-2 text-xs font-semibold leading-5 text-[#68708a]">
                      {field.note}
                      {typeof field.confidence === "number"
                        ? ` · ${Math.round(field.confidence * 100)}%`
                        : ""}
                    </p>
                  ) : null}
                </article>
              ))}
            </section>

            {warnings.length > 0 ? (
              <section className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 shadow-sm">
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-amber-800">
                  {copy.warnings}
                </p>
                <ul className="mt-3 space-y-2 text-sm font-semibold text-amber-800">
                  {warnings.map((warning) => (
                    <li key={warning}>• {warning}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        ) : null}

        {status === "failed" ? (
          <section className="rounded-[24px] border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-800 shadow-sm">
            {payload?.run?.errorJson?.message || copy.failed}
          </section>
        ) : null}
      </section>
    </main>
  );
}
