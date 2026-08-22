"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Locale = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

type Measurement = {
  parameterCode?: string;
  label?: string;
  measureType?: string;
  unit?: string;
  valueNumeric?: number | null;
  valueText?: string | null;
  rawFragment?: string;
  confidence?: number;
};

type TemplateCandidate = {
  templateId?: string;
  title?: string;
  shortTitle?: string | null;
  templateGroup?: string;
  confidence?: number;
};

type IntakeAnalysis = {
  contract?: string;
  status?: "pending" | "completed" | "failed" | string;
  activityEventId?: string;
  analyzedAt?: string;
  temporalDirection?: string;
  serverTiming?: {
    role?: string | null;
    startedAt?: string | null;
    endedAt?: string | null;
    durationMinutes?: number | null;
  };
  measurements?: Measurement[];
  templateCandidates?: TemplateCandidate[];
  noSuitableTypicalActivity?: boolean;
  typicalActivitiesHref?: string;
  analysisMode?: string;
  providerAvailable?: boolean;
};

type IntakeAnalysisResponse = {
  ok?: boolean;
  analyses?: IntakeAnalysis[];
};

const COPY: Record<Locale, {
  completed: string;
  planned: string;
  pending: string;
  failed: string;
  parameters: string;
  noParameters: string;
  candidates: string;
  noCandidate: string;
  allTemplates: string;
  start: string;
  end: string;
  duration: string;
  fallback: string;
}> = {
  ru: {
    completed: "Завершенная активность",
    planned: "Планируемая активность",
    pending: "Базовый анализ выполняется…",
    failed: "Не удалось выполнить базовый анализ. Активность уже сохранена в журнале.",
    parameters: "Выявленные параметры",
    noParameters: "Дополнительные измеримые параметры не выявлены.",
    candidates: "Активность может соответствовать следующим типовым активностям:",
    noCandidate: "Подходящая типовая активность не найдена.",
    allTemplates: "Все типовые активности",
    start: "Начало",
    end: "Завершение",
    duration: "Длительность",
    fallback: "Базовая модель временно недоступна. Показаны только безопасно извлечённые сервером параметры и очевидные совпадения.",
  },
  en: {
    completed: "Completed activity",
    planned: "Planned activity",
    pending: "Basic analysis is running…",
    failed: "Basic analysis could not be completed. The activity is already saved in the journal.",
    parameters: "Detected parameters",
    noParameters: "No additional measurable parameters were detected.",
    candidates: "The activity may correspond to these typical activities:",
    noCandidate: "No suitable typical activity was found.",
    allTemplates: "All typical activities",
    start: "Start",
    end: "End",
    duration: "Duration",
    fallback: "The basic model is temporarily unavailable. Only server-safe parameters and obvious matches are shown.",
  },
  pl: {
    completed: "Zakończona aktywność",
    planned: "Planowana aktywność",
    pending: "Trwa podstawowa analiza…",
    failed: "Nie udało się wykonać podstawowej analizy. Aktywność jest już zapisana w dzienniku.",
    parameters: "Wykryte parametry",
    noParameters: "Nie wykryto dodatkowych mierzalnych parametrów.",
    candidates: "Aktywność może odpowiadać następującym typowym aktywnościom:",
    noCandidate: "Nie znaleziono odpowiedniej typowej aktywności.",
    allTemplates: "Wszystkie typowe aktywności",
    start: "Początek",
    end: "Koniec",
    duration: "Czas trwania",
    fallback: "Model podstawowy jest chwilowo niedostępny. Pokazano tylko bezpiecznie wyodrębnione parametry i oczywiste dopasowania.",
  },
  uk: {
    completed: "Завершена активність",
    planned: "Запланована активність",
    pending: "Виконується базовий аналіз…",
    failed: "Не вдалося виконати базовий аналіз. Активність уже збережена в журналі.",
    parameters: "Виявлені параметри",
    noParameters: "Додаткових вимірюваних параметрів не виявлено.",
    candidates: "Активність може відповідати таким типовим активностям:",
    noCandidate: "Відповідної типової активності не знайдено.",
    allTemplates: "Усі типові активності",
    start: "Початок",
    end: "Завершення",
    duration: "Тривалість",
    fallback: "Базова модель тимчасово недоступна. Показано лише безпечно виділені сервером параметри та очевидні збіги.",
  },
  de: {
    completed: "Abgeschlossene Aktivität",
    planned: "Geplante Aktivität",
    pending: "Basisanalyse läuft…",
    failed: "Die Basisanalyse konnte nicht abgeschlossen werden. Die Aktivität ist bereits im Journal gespeichert.",
    parameters: "Erkannte Parameter",
    noParameters: "Keine zusätzlichen messbaren Parameter erkannt.",
    candidates: "Die Aktivität kann zu folgenden typischen Aktivitäten passen:",
    noCandidate: "Keine passende typische Aktivität gefunden.",
    allTemplates: "Alle typischen Aktivitäten",
    start: "Start",
    end: "Ende",
    duration: "Dauer",
    fallback: "Das Basismodell ist vorübergehend nicht verfügbar. Es werden nur serverseitig sicher erkannte Parameter und eindeutige Treffer angezeigt.",
  },
  es: {
    completed: "Actividad completada",
    planned: "Actividad planificada",
    pending: "El análisis básico está en curso…",
    failed: "No se pudo completar el análisis básico. La actividad ya está guardada en el diario.",
    parameters: "Parámetros detectados",
    noParameters: "No se detectaron parámetros medibles adicionales.",
    candidates: "La actividad puede corresponder a las siguientes actividades típicas:",
    noCandidate: "No se encontró una actividad típica adecuada.",
    allTemplates: "Todas las actividades típicas",
    start: "Inicio",
    end: "Fin",
    duration: "Duración",
    fallback: "El modelo básico no está disponible temporalmente. Solo se muestran parámetros seguros y coincidencias evidentes detectados por el servidor.",
  },
  cs: {
    completed: "Dokončená aktivita",
    planned: "Plánovaná aktivita",
    pending: "Probíhá základní analýza…",
    failed: "Základní analýzu se nepodařilo dokončit. Aktivita je již uložena v deníku.",
    parameters: "Zjištěné parametry",
    noParameters: "Nebyly zjištěny žádné další měřitelné parametry.",
    candidates: "Aktivita může odpovídat následujícím typickým aktivitám:",
    noCandidate: "Nebyla nalezena vhodná typická aktivita.",
    allTemplates: "Všechny typické aktivity",
    start: "Začátek",
    end: "Konec",
    duration: "Doba trvání",
    fallback: "Základní model je dočasně nedostupný. Zobrazeny jsou pouze bezpečně zjištěné parametry a zjevné shody.",
  },
};

function buildLocaleHref(pathname: string, locale: Locale) {
  const separator = pathname.includes("?") ? "&" : "?";
  return locale === "en"
    ? pathname
    : `${pathname}${separator}locale=${encodeURIComponent(locale)}`;
}

function formatDateTime(value: string | null | undefined, locale: Locale) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

const UNIT_LABELS: Record<Locale, Record<string, string>> = {
  ru: { second: "сек", minute: "мин", hour: "ч", meter: "м", kilometer: "км", kilogram: "кг", gram: "г", repetition: "повт.", count: "шт.", set: "подх.", liter: "л", milliliter: "мл", bpm: "уд/мин", celsius: "°C", pln: "PLN", eur: "EUR", usd: "USD", km_per_hour: "км/ч", meter_per_second: "м/с", date: "", time: "", text: "" },
  en: { second: "s", minute: "min", hour: "h", meter: "m", kilometer: "km", kilogram: "kg", gram: "g", repetition: "reps", count: "count", set: "sets", liter: "L", milliliter: "mL", bpm: "bpm", celsius: "°C", pln: "PLN", eur: "EUR", usd: "USD", km_per_hour: "km/h", meter_per_second: "m/s", date: "", time: "", text: "" },
  pl: { second: "s", minute: "min", hour: "h", meter: "m", kilometer: "km", kilogram: "kg", gram: "g", repetition: "powt.", count: "szt.", set: "serie", liter: "l", milliliter: "ml", bpm: "ud./min", celsius: "°C", pln: "PLN", eur: "EUR", usd: "USD", km_per_hour: "km/h", meter_per_second: "m/s", date: "", time: "", text: "" },
  uk: { second: "с", minute: "хв", hour: "год", meter: "м", kilometer: "км", kilogram: "кг", gram: "г", repetition: "повт.", count: "шт.", set: "підх.", liter: "л", milliliter: "мл", bpm: "уд/хв", celsius: "°C", pln: "PLN", eur: "EUR", usd: "USD", km_per_hour: "км/год", meter_per_second: "м/с", date: "", time: "", text: "" },
  de: { second: "s", minute: "min", hour: "h", meter: "m", kilometer: "km", kilogram: "kg", gram: "g", repetition: "Wdh.", count: "Anz.", set: "Sätze", liter: "l", milliliter: "ml", bpm: "bpm", celsius: "°C", pln: "PLN", eur: "EUR", usd: "USD", km_per_hour: "km/h", meter_per_second: "m/s", date: "", time: "", text: "" },
  es: { second: "s", minute: "min", hour: "h", meter: "m", kilometer: "km", kilogram: "kg", gram: "g", repetition: "rep.", count: "ud.", set: "series", liter: "l", milliliter: "ml", bpm: "lpm", celsius: "°C", pln: "PLN", eur: "EUR", usd: "USD", km_per_hour: "km/h", meter_per_second: "m/s", date: "", time: "", text: "" },
  cs: { second: "s", minute: "min", hour: "h", meter: "m", kilometer: "km", kilogram: "kg", gram: "g", repetition: "opak.", count: "ks", set: "série", liter: "l", milliliter: "ml", bpm: "tep/min", celsius: "°C", pln: "PLN", eur: "EUR", usd: "USD", km_per_hour: "km/h", meter_per_second: "m/s", date: "", time: "", text: "" },
};

function formatMeasurement(measurement: Measurement, locale: Locale) {
  const value =
    typeof measurement.valueNumeric === "number" &&
    Number.isFinite(measurement.valueNumeric)
      ? new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(
          measurement.valueNumeric,
        )
      : measurement.valueText?.trim() || "—";
  const unitCode = measurement.unit?.trim().toLowerCase() || "";
  const unit = UNIT_LABELS[locale][unitCode] ?? unitCode;
  return unit ? `${value} ${unit}` : value;
}

export function useActivityBasicIntakeAnalyses(activityEventIds: string[]) {
  const [analyses, setAnalyses] = useState<Record<string, IntakeAnalysis>>({});

  const requestKey = useMemo(
    () =>
      Array.from(new Set(activityEventIds.filter(Boolean)))
        .slice(0, 50)
        .sort()
        .join(","),
    [activityEventIds],
  );

  useEffect(() => {
    if (!requestKey) {
      return;
    }

    let cancelled = false;
    const params = new URLSearchParams({ activityEventIds: requestKey });

    void fetch(`/api/activity/intake-analysis?${params.toString()}`, {
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as
          | IntakeAnalysisResponse
          | null;
        if (!response.ok || payload?.ok !== true) return null;
        return payload;
      })
      .then((payload) => {
        if (cancelled || !payload) return;
        const next: Record<string, IntakeAnalysis> = {};
        for (const analysis of payload.analyses ?? []) {
          if (typeof analysis.activityEventId === "string") {
            next[analysis.activityEventId] = analysis;
          }
        }
        setAnalyses(next);
      })
      .catch(() => {
        if (!cancelled) setAnalyses({});
      });

    return () => {
      cancelled = true;
    };
  }, [requestKey]);

  return analyses;
}

export function ActivityLifecycleBadge({
  locale,
  planned,
}: {
  readonly locale: Locale;
  readonly planned: boolean;
}) {
  const ui = COPY[locale];
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${
        planned
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}
    >
      {planned ? ui.planned : ui.completed}
    </span>
  );
}

export function ActivityBasicIntakeAnalysisCard({
  analysis,
  locale,
}: {
  readonly analysis: IntakeAnalysis | null | undefined;
  readonly locale: Locale;
}) {
  if (!analysis) return null;

  const ui = COPY[locale];
  const status = analysis.status;

  if (status === "pending") {
    return (
      <div className="mt-3 rounded-xl border border-dashed border-[#cfd8f3] bg-[#f8faff] px-3 py-2.5 text-xs font-semibold text-[#667091]">
        {ui.pending}
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-700">
        {ui.failed}
      </div>
    );
  }

  if (status !== "completed") return null;

  const measurements = Array.isArray(analysis.measurements)
    ? analysis.measurements
    : [];
  const candidates = Array.isArray(analysis.templateCandidates)
    ? analysis.templateCandidates.filter(
        (candidate) => typeof candidate.title === "string" && candidate.title.trim(),
      )
    : [];
  const timing = analysis.serverTiming ?? {};
  const startLabel = formatDateTime(timing.startedAt, locale);
  const endLabel = formatDateTime(timing.endedAt, locale);
  const duration =
    typeof timing.durationMinutes === "number" &&
    Number.isFinite(timing.durationMinutes)
      ? `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(
          timing.durationMinutes,
        )} min`
      : null;
  const typicalHref = buildLocaleHref(
    analysis.typicalActivitiesHref || "/activity-templates",
    locale,
  );

  return (
    <div className="mt-3 rounded-xl border border-[#dbe3f6] bg-white p-3 shadow-[0_1px_2px_rgba(32,45,80,0.04)]">
      {analysis.analysisMode === "safe_server_fallback" ? (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-relaxed text-amber-800">
          {ui.fallback}
        </div>
      ) : null}
      <div className="text-[11px] font-black uppercase tracking-[0.12em] text-[#3b6ef8]">
        {ui.parameters}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {startLabel ? (
          <span className="rounded-lg border border-[#e1e6f2] bg-[#f8faff] px-2.5 py-1.5 text-xs font-semibold text-[#4a5270]">
            {ui.start}: {startLabel}
          </span>
        ) : null}
        {endLabel ? (
          <span className="rounded-lg border border-[#e1e6f2] bg-[#f8faff] px-2.5 py-1.5 text-xs font-semibold text-[#4a5270]">
            {ui.end}: {endLabel}
          </span>
        ) : null}
        {duration ? (
          <span className="rounded-lg border border-[#e1e6f2] bg-[#f8faff] px-2.5 py-1.5 text-xs font-semibold text-[#4a5270]">
            {ui.duration}: {duration}
          </span>
        ) : null}
        {measurements.map((measurement, index) => (
          <span
            key={`${measurement.parameterCode ?? "measure"}:${index}`}
            className="rounded-lg border border-[#dce5ff] bg-[#f5f8ff] px-2.5 py-1.5 text-xs font-semibold text-[#3658a8]"
          >
            {measurement.label?.trim() || measurement.parameterCode || "—"}: {formatMeasurement(measurement, locale)}
          </span>
        ))}
      </div>

      {!startLabel && !endLabel && !duration && measurements.length === 0 ? (
        <div className="mt-2 text-xs font-medium text-[#7c8099]">
          {ui.noParameters}
        </div>
      ) : null}

      <div className="mt-3 border-t border-[#edf0f7] pt-3">
        <div className="text-xs font-bold leading-relaxed text-[#31384f]">
          {ui.candidates}
        </div>

        {candidates.length > 0 ? (
          <div className="mt-2 grid gap-2">
            {candidates.map((candidate) => (
              <div
                key={candidate.templateId || candidate.title}
                className="flex items-center gap-2 rounded-lg border border-[#dbe3f6] bg-[#fbfcff] px-3 py-2 text-xs font-bold text-[#2f477f]"
              >
                <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[#3b6ef8]" />
                <span className="min-w-0 truncate">{candidate.title}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-[#667091]">{ui.noCandidate}</span>
            <Link
              href={typicalHref}
              className="font-black text-[#3b6ef8] underline-offset-4 hover:underline"
            >
              {ui.allTemplates}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
