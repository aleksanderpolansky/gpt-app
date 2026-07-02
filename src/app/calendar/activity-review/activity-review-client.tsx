"use client";

// CALENDAR_REAL_ACTIVITY_SEMANTIC_PREVIEW_V3
// CALENDAR_ACTIVITY_REVIEW_MODEL_BACKED_NO_WRITE_V1
// NO_DB_WRITE_ACTIVITY_REVIEW

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Locale = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";
type FieldStatus = "ready" | "candidate" | "missing";

type ReviewField = {
  key: string;
  label: string;
  value: string;
  status: FieldStatus;
  note: string;
  confidence: number;
};

type ReviewPayload = {
  ok: boolean;
  route: string;
  routeMode: string;
  source: "model" | "fallback";
  modelBacked: boolean;
  modelName: string | null;
  modelAttempted: boolean;
  modelError: string | null;
  rawText: string;
  locale: Locale;
  intent: string;
  activityTitle: string;
  summary: string;
  fields: ReviewField[];
  counters: Record<FieldStatus, number>;
  safety: {
    previewOnly: boolean;
    dbWriteExecuted: boolean;
    sqlExecuted: boolean;
    factCreated: boolean;
    planCreated: boolean;
    valueObjectCreated: boolean;
    timeBlockCreated: boolean;
  };
  warnings: string[];
};

const LOCALES: Locale[] = ["en", "pl", "ru", "uk", "de", "es", "cs"];

const UI = {
  pl: {
    back: "Wróć do tekstu",
    calendar: "Kalendarz",
    step: "KROK 2 / SEMANTIC PREVIEW",
    title: "Kontener aktywności",
    subtitle: "AI analizuje tekst i proponuje pola Activity Review Package. Ekran nie zapisuje danych.",
    ready: "Gotowe",
    candidate: "Kandydat",
    missing: "Brak",
    semanticTitle: "Źródło analizy",
    model: "Model AI",
    fallback: "Fallback lokalny",
    loading: "Analizuję aktywność...",
    redTitle: "Czerwone pola",
    redBody: "Czerwone pola oznaczają brak write-gate albo potrzebę doprecyzowania, a nie błąd.",
    actions: "Działania",
    actionPlan: "Zaplanuj - nie zaimplementowano",
    actionFact: "Zapisz jako fakt - nie zaimplementowano",
    actionVo: "Połącz istniejący VO - nie zaimplementowano",
    safety: "Granice bezpieczeństwa",
    previewOnly: "preview != write",
    candidateRule: "candidate != saved fact",
    planRule: "plan != fact",
    noText: "Brak tekstu",
    route: "Route",
    modelName: "Model",
    error: "Błąd/fallback",
  },
  en: {
    back: "Back to text",
    calendar: "Calendar",
    step: "STEP 2 / SEMANTIC PREVIEW",
    title: "Activity container",
    subtitle: "AI analyzes the text and proposes Activity Review Package fields. This screen does not save data.",
    ready: "Ready",
    candidate: "Candidate",
    missing: "Missing",
    semanticTitle: "Analysis source",
    model: "AI model",
    fallback: "Local fallback",
    loading: "Analyzing activity...",
    redTitle: "Red fields",
    redBody: "Red fields mean missing write-gates or fields that need clarification, not an error.",
    actions: "Actions",
    actionPlan: "Schedule - not implemented",
    actionFact: "Save as fact - not implemented",
    actionVo: "Link existing VO - not implemented",
    safety: "Safety boundaries",
    previewOnly: "preview != write",
    candidateRule: "candidate != saved fact",
    planRule: "plan != fact",
    noText: "No text",
    route: "Route",
    modelName: "Model",
    error: "Error/fallback",
  },
  ru: {
    back: "Вернуться к тексту",
    calendar: "Календарь",
    step: "ШАГ 2 / SEMANTIC PREVIEW",
    title: "Контейнер активности",
    subtitle: "AI анализирует текст и предлагает поля Activity Review Package. Экран не сохраняет данные.",
    ready: "Готово",
    candidate: "Кандидат",
    missing: "Отсутствует",
    semanticTitle: "Источник анализа",
    model: "AI-модель",
    fallback: "Локальный fallback",
    loading: "Анализирую активность...",
    redTitle: "Красные поля",
    redBody: "Красные поля означают отсутствие write-gate или необходимость уточнения, а не ошибку.",
    actions: "Действия",
    actionPlan: "Запланировать — не реализовано",
    actionFact: "Сохранить как факт — не реализовано",
    actionVo: "Связать существующий VO — не реализовано",
    safety: "Границы безопасности",
    previewOnly: "preview != write",
    candidateRule: "candidate != saved fact",
    planRule: "plan != fact",
    noText: "Текста нет",
    route: "Route",
    modelName: "Модель",
    error: "Ошибка/fallback",
  },
  uk: {
    back: "Повернутися до тексту",
    calendar: "Календар",
    step: "КРОК 2 / SEMANTIC PREVIEW",
    title: "Контейнер активності",
    subtitle: "AI аналізує текст і пропонує поля Activity Review Package. Екран не зберігає дані.",
    ready: "Готово",
    candidate: "Кандидат",
    missing: "Відсутнє",
    semanticTitle: "Джерело аналізу",
    model: "AI-модель",
    fallback: "Локальний fallback",
    loading: "Аналізую активність...",
    redTitle: "Червоні поля",
    redBody: "Червоні поля означають відсутній write-gate або потребу уточнення, а не помилку.",
    actions: "Дії",
    actionPlan: "Запланувати — не реалізовано",
    actionFact: "Зберегти як факт — не реалізовано",
    actionVo: "Повʼязати існуючий VO — не реалізовано",
    safety: "Межі безпеки",
    previewOnly: "preview != write",
    candidateRule: "candidate != saved fact",
    planRule: "plan != fact",
    noText: "Тексту немає",
    route: "Route",
    modelName: "Модель",
    error: "Помилка/fallback",
  },
  de: {
    back: "Zurück zum Text",
    calendar: "Kalender",
    step: "SCHRITT 2 / SEMANTIC PREVIEW",
    title: "Aktivitätscontainer",
    subtitle: "AI analysiert den Text und schlägt Activity Review Package Felder vor. Dieser Bildschirm speichert keine Daten.",
    ready: "Bereit",
    candidate: "Kandidat",
    missing: "Fehlt",
    semanticTitle: "Analysequelle",
    model: "AI-Modell",
    fallback: "Lokaler Fallback",
    loading: "Aktivität wird analysiert...",
    redTitle: "Rote Felder",
    redBody: "Rote Felder bedeuten fehlende Write-Gates oder Klärungsbedarf, keinen Fehler.",
    actions: "Aktionen",
    actionPlan: "Planen - nicht implementiert",
    actionFact: "Als Fakt speichern - nicht implementiert",
    actionVo: "Bestehenden VO verknüpfen - nicht implementiert",
    safety: "Sicherheitsgrenzen",
    previewOnly: "preview != write",
    candidateRule: "candidate != saved fact",
    planRule: "plan != fact",
    noText: "Kein Text",
    route: "Route",
    modelName: "Modell",
    error: "Fehler/Fallback",
  },
  es: {
    back: "Volver al texto",
    calendar: "Calendario",
    step: "PASO 2 / SEMANTIC PREVIEW",
    title: "Contenedor de actividad",
    subtitle: "AI analiza el texto y propone campos del Activity Review Package. Esta pantalla no guarda datos.",
    ready: "Listo",
    candidate: "Candidato",
    missing: "Falta",
    semanticTitle: "Fuente del análisis",
    model: "Modelo AI",
    fallback: "Fallback local",
    loading: "Analizando actividad...",
    redTitle: "Campos rojos",
    redBody: "Los campos rojos significan falta de write-gate o necesidad de aclaración, no un error.",
    actions: "Acciones",
    actionPlan: "Planificar - no implementado",
    actionFact: "Guardar como hecho - no implementado",
    actionVo: "Vincular VO existente - no implementado",
    safety: "Límites de seguridad",
    previewOnly: "preview != write",
    candidateRule: "candidate != saved fact",
    planRule: "plan != fact",
    noText: "Sin texto",
    route: "Route",
    modelName: "Modelo",
    error: "Error/fallback",
  },
  cs: {
    back: "Zpět k textu",
    calendar: "Kalendář",
    step: "KROK 2 / SEMANTIC PREVIEW",
    title: "Kontejner aktivity",
    subtitle: "AI analyzuje text a navrhuje pole Activity Review Package. Tato obrazovka neukládá data.",
    ready: "Hotovo",
    candidate: "Kandidát",
    missing: "Chybí",
    semanticTitle: "Zdroj analýzy",
    model: "AI model",
    fallback: "Lokální fallback",
    loading: "Analyzuji aktivitu...",
    redTitle: "Červená pole",
    redBody: "Červená pole znamenají chybějící write-gate nebo potřebu upřesnění, ne chybu.",
    actions: "Akce",
    actionPlan: "Naplánovat - neimplementováno",
    actionFact: "Uložit jako fakt - neimplementováno",
    actionVo: "Propojit existující VO - neimplementováno",
    safety: "Bezpečnostní hranice",
    previewOnly: "preview != write",
    candidateRule: "candidate != saved fact",
    planRule: "plan != fact",
    noText: "Bez textu",
    route: "Route",
    modelName: "Model",
    error: "Chyba/fallback",
  },
} as const;

function normalizeLocale(value: string | null): Locale {
  if (value && LOCALES.includes(value as Locale)) {
    return value as Locale;
  }

  return "en";
}

function statusLabel(status: FieldStatus, labels: typeof UI[Locale]): string {
  if (status === "ready") return labels.ready;
  if (status === "candidate") return labels.candidate;
  return labels.missing;
}

function buildEmergencyPayload(rawText: string, locale: Locale, message: string): ReviewPayload {
  const labels = UI[locale];

  const fields: ReviewField[] = [
    {
      key: "sourceText",
      label: locale === "pl" ? "Tekst źródłowy" : locale === "en" ? "Source text" : locale === "es" ? "Texto fuente" : locale === "de" ? "Quelltext" : locale === "cs" ? "Zdrojový text" : locale === "uk" ? "Вихідний текст" : "Исходный текст",
      value: rawText || labels.noText,
      status: rawText ? "ready" : "missing",
      note: "client emergency fallback",
      confidence: rawText ? 1 : 0.1,
    },
    {
      key: "activityTitle",
      label: locale === "pl" ? "Tytuł aktywności" : locale === "en" ? "Activity title" : locale === "es" ? "Título de actividad" : locale === "de" ? "Aktivitätstitel" : locale === "cs" ? "Název aktivity" : locale === "uk" ? "Заголовок активності" : "Заголовок активности",
      value: rawText || labels.noText,
      status: rawText ? "candidate" : "missing",
      note: message,
      confidence: 0.3,
    },
  ];

  return {
    ok: false,
    route: "/api/calendar/activity-review/semantic-preview",
    routeMode: "calendar_activity_review_no_write_v1",
    source: "fallback",
    modelBacked: false,
    modelName: null,
    modelAttempted: false,
    modelError: message,
    rawText,
    locale,
    intent: "ambiguous_activity",
    activityTitle: rawText || labels.noText,
    summary: message,
    fields,
    counters: {
      ready: fields.filter((field) => field.status === "ready").length,
      candidate: fields.filter((field) => field.status === "candidate").length,
      missing: fields.filter((field) => field.status === "missing").length,
    },
    safety: {
      previewOnly: true,
      dbWriteExecuted: false,
      sqlExecuted: false,
      factCreated: false,
      planCreated: false,
      valueObjectCreated: false,
      timeBlockCreated: false,
    },
    warnings: [message],
  };
}

function StatusBadge({ status, label }: { status: FieldStatus; label: string }) {
  const styles: Record<FieldStatus, string> = {
    ready: "border-[#86efac] bg-[#ecfdf5] text-[#047857]",
    candidate: "border-[#fde68a] bg-[#fffbeb] text-[#b45309]",
    missing: "border-[#fecaca] bg-[#fff1f2] text-[#be123c]",
  };

  return (
    <span className={`inline-flex h-7 items-center rounded-full border px-3 text-[11px] font-extrabold uppercase tracking-[0.08em] ${styles[status]}`}>
      {label}
    </span>
  );
}

function FieldCard({ field, statusText }: { field: ReviewField; statusText: string }) {
  const styles: Record<FieldStatus, string> = {
    ready: "border-[#86efac] bg-[#f0fdf4]",
    candidate: "border-[#fde68a] bg-[#fffbeb]",
    missing: "border-[#fecaca] bg-[#fff1f2]",
  };

  return (
    <div className={`rounded-[22px] border p-4 shadow-sm ${styles[field.status]}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-[#7c8099]">{field.label}</p>
        <StatusBadge status={field.status} label={statusText} />
      </div>
      <p className="break-words text-sm font-bold leading-6 text-[#1a1d2e]">{field.value}</p>
      <p className="mt-2 text-xs leading-5 text-[#6f7893]">
        {field.note}
        {typeof field.confidence === "number" ? ` · ${Math.round(field.confidence * 100)}%` : ""}
      </p>
    </div>
  );
}


function AnalysisLoadingPanel({ locale, loadingText }: { locale: Locale; loadingText: string }) {
  // CALENDAR_ACTIVITY_REVIEW_LOADING_PROGRESS_V6
  const stepText: Record<Locale, string[]> = {
    en: ["Reading the phrase", "Extracting time", "Suggesting categories", "Preparing preview package"],
    pl: ["Czytam frazÄ™", "WyodrÄ™bniam czas", "ProponujÄ™ kategorie", "PrzygotowujÄ™ pakiet preview"],
    ru: ["Ð§Ð¸Ñ‚Ð°ÑŽ Ñ„Ñ€Ð°Ð·Ñƒ", "Ð˜Ð·Ð²Ð»ÐµÐºÐ°ÑŽ Ð²Ñ€ÐµÐ¼Ñ", "ÐŸÑ€ÐµÐ´Ð»Ð°Ð³Ð°ÑŽ ÐºÐ°Ñ‚ÐµÐ³Ð¾Ñ€Ð¸Ð¸", "Ð“Ð¾Ñ‚Ð¾Ð²Ð»ÑŽ Ð¿Ð°ÐºÐµÑ‚ Ð¿Ñ€ÐµÐ´Ð¿Ñ€Ð¾ÑÐ¼Ð¾Ñ‚Ñ€Ð°"],
    uk: ["Ð§Ð¸Ñ‚Ð°ÑŽ Ñ„Ñ€Ð°Ð·Ñƒ", "Ð’Ð¸Ð´Ñ–Ð»ÑÑŽ Ñ‡Ð°Ñ", "ÐŸÑ€Ð¾Ð¿Ð¾Ð½ÑƒÑŽ ÐºÐ°Ñ‚ÐµÐ³Ð¾Ñ€Ñ–Ñ—", "Ð“Ð¾Ñ‚ÑƒÑŽ Ð¿Ð°ÐºÐµÑ‚ preview"],
    de: ["Satz wird gelesen", "Zeit wird erkannt", "Kategorien werden vorgeschlagen", "Preview-Paket wird vorbereitet"],
    es: ["Leo la frase", "Extraigo el tiempo", "Propongo categorÃ­as", "Preparo el paquete preview"],
    cs: ["ÄŒtu vÄ›tu", "ZjiÅ¡Å¥uji Äas", "Navrhuji kategorie", "PÅ™ipravuji preview balÃ­Äek"],
  };

  const safetyText: Record<Locale, string> = {
    en: "preview only - no fact - no plan - no VO - no time block",
    pl: "tylko preview - bez faktu - bez planu - bez VO - bez bloku czasu",
    ru: "Ñ‚Ð¾Ð»ÑŒÐºÐ¾ preview - Ð±ÐµÐ· Ñ„Ð°ÐºÑ‚Ð° - Ð±ÐµÐ· Ð¿Ð»Ð°Ð½Ð° - Ð±ÐµÐ· VO - Ð±ÐµÐ· Ð±Ð»Ð¾ÐºÐ° Ð²Ñ€ÐµÐ¼ÐµÐ½Ð¸",
    uk: "Ñ‚Ñ–Ð»ÑŒÐºÐ¸ preview - Ð±ÐµÐ· Ñ„Ð°ÐºÑ‚Ñƒ - Ð±ÐµÐ· Ð¿Ð»Ð°Ð½Ñƒ - Ð±ÐµÐ· VO - Ð±ÐµÐ· Ð±Ð»Ð¾ÐºÑƒ Ñ‡Ð°ÑÑƒ",
    de: "nur preview - kein Fakt - kein Plan - kein VO - kein Zeitblock",
    es: "solo preview - sin hecho - sin plan - sin VO - sin bloque de tiempo",
    cs: "pouze preview - bez faktu - bez plÃ¡nu - bez VO - bez ÄasovÃ©ho bloku",
  };

  const steps = stepText[locale] ?? stepText.en;

  return (
    <div className="rounded-[24px] border border-[#b9c8ff] bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative h-14 w-14 shrink-0">
            <div className="absolute inset-0 rounded-full border-4 border-[#e7ecff]" />
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-[#3b6ef8]" />
            <div className="absolute inset-[14px] rounded-full bg-[#eef2ff]" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-[#1a1d2e]">{loadingText}</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-[#6f7893]">{safetyText[locale] ?? safetyText.en}</p>
          </div>
        </div>
        <div className="rounded-full border border-[#dfe5f1] bg-[#f7f9fd] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#7c8099]">
          no-write
        </div>
      </div>

      <div className="mt-6 h-2 overflow-hidden rounded-full bg-[#e7ecff]">
        <div className="h-full w-2/3 animate-pulse rounded-full bg-[#3b6ef8]" />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {steps.map((step, index) => (
          <div key={step} className="rounded-[18px] border border-[#dfe5f1] bg-[#f7f9fd] p-4">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#eef2ff] text-xs font-extrabold text-[#3b6ef8]">{index + 1}</span>
              <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#52607a]">{step}</span>
            </div>
            <div className="h-2 w-full animate-pulse rounded-full bg-[#e2e8f7]" />
            <div className="mt-2 h-2 w-2/3 animate-pulse rounded-full bg-[#edf1fb]" />
          </div>
        ))}
      </div>
    </div>
  );
}
export default function ActivityReviewClient() {
  const searchParams = useSearchParams();
  const locale = normalizeLocale(searchParams.get("locale"));
  const t = UI[locale];
  const rawText = searchParams.get("text") ?? "";

  const [review, setReview] = useState<ReviewPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setIsLoading(true);

      try {
        const response = await fetch("/api/calendar/activity-review/semantic-preview", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: rawText,
            locale,
            source: "calendar_add",
            mode: "preview_only",
            write: false,
          }),
        });

        const payload = (await response.json()) as ReviewPayload;

        if (!cancelled) {
          setReview(payload);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Semantic preview request failed.";

        if (!cancelled) {
          setReview(buildEmergencyPayload(rawText, locale, message));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [rawText, locale]);

  const counters = review?.counters ?? { ready: 0, candidate: 0, missing: 0 };
  const fields = useMemo(() => review?.fields ?? [], [review?.fields]);
  const sourceLabel = review?.modelBacked ? t.model : t.fallback;

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-[#f0f2f7] px-4 py-6 text-[#1a1d2e] sm:px-6 lg:px-10">
      <section className="mx-auto w-full max-w-7xl">
        <div className="rounded-[28px] border border-black/[0.06] bg-white p-5 shadow-sm sm:p-7 lg:p-8">
          <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-8 flex flex-wrap gap-3">
                <Link
                  href={{ pathname: "/calendar/add", query: { locale } }}
                  className="inline-flex h-10 items-center rounded-full border border-[#dfe5f1] bg-white px-4 text-sm font-semibold text-[#52607a] shadow-sm transition hover:border-[#3b6ef8] hover:text-[#3b6ef8]"
                >
                  {t.back}
                </Link>
                <Link
                  href={{ pathname: "/calendar", query: { locale } }}
                  className="inline-flex h-10 items-center rounded-full border border-[#dfe5f1] bg-[#f7f9fd] px-4 text-sm font-semibold text-[#52607a] shadow-sm transition hover:border-[#3b6ef8] hover:text-[#3b6ef8]"
                >
                  {t.calendar}
                </Link>
              </div>
              <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.34em] text-[#3b6ef8]">
                {t.step}
              </p>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#1a1d2e] sm:text-4xl">
                {t.title}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6f7893]">
                {t.subtitle}
              </p>
            </div>
            <div className="rounded-full border border-[#dfe5f1] bg-[#f7f9fd] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#7c8099]">
              preview-only
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[24px] border border-[#86efac] bg-[#ecfdf5] p-5 shadow-sm">
                <p className="text-3xl font-semibold text-[#047857]">{counters.ready}</p>
                <p className="mt-1 text-xs font-extrabold uppercase tracking-[0.22em] text-[#047857]">{t.ready}</p>
              </div>
              <div className="rounded-[24px] border border-[#fde68a] bg-[#fffbeb] p-5 shadow-sm">
                <p className="text-3xl font-semibold text-[#b45309]">{counters.candidate}</p>
                <p className="mt-1 text-xs font-extrabold uppercase tracking-[0.22em] text-[#b45309]">{t.candidate}</p>
              </div>
              <div className="rounded-[24px] border border-[#fecaca] bg-[#fff1f2] p-5 shadow-sm">
                <p className="text-3xl font-semibold text-[#be123c]">{counters.missing}</p>
                <p className="mt-1 text-xs font-extrabold uppercase tracking-[0.22em] text-[#be123c]">{t.missing}</p>
              </div>
            </div>

            {isLoading ? (
              <AnalysisLoadingPanel locale={locale} loadingText={t.loading} />
            ) : (
              <div className="grid gap-4">
                {fields.map((field) => (
                  <FieldCard
                    key={field.key}
                    field={field}
                    statusText={statusLabel(field.status, t)}
                  />
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-5">
            <div className="rounded-[24px] border border-[#b9c8ff] bg-[#eef2ff] p-5 shadow-sm">
              <p className="mb-2 text-sm font-bold text-[#1a1d2e]">{t.semanticTitle}</p>
              <p className="text-sm leading-6 text-[#52607a]">
                {sourceLabel}
                {review?.modelName ? ` · ${review.modelName}` : ""}
              </p>
              <p className="mt-3 text-sm leading-6 text-[#52607a]">
                {review?.summary ?? t.loading}
              </p>
              <div className="mt-4 rounded-[18px] bg-white/70 p-3 text-xs font-semibold leading-6 text-[#52607a]">
                <div>{t.route}: {review?.route ?? "/api/calendar/activity-review/semantic-preview"}</div>
                {review?.modelName ? <div>{t.modelName}: {review.modelName}</div> : null}
                {review?.modelError ? <div>{t.error}: {review.modelError}</div> : null}
              </div>
            </div>

            <div className="rounded-[24px] border border-[#fecaca] bg-[#fff1f2] p-5 shadow-sm">
              <p className="mb-2 text-sm font-bold text-[#be123c]">{t.redTitle}</p>
              <p className="text-sm leading-6 text-[#9f1239]">{t.redBody}</p>
            </div>

            <div className="rounded-[24px] border border-black/[0.06] bg-white p-5 shadow-sm">
              <p className="mb-4 text-xs font-extrabold uppercase tracking-[0.24em] text-[#9ca3b8]">{t.actions}</p>
              <div className="space-y-3">
                {[t.actionPlan, t.actionFact, t.actionVo].map((label) => (
                  <button
                    key={label}
                    type="button"
                    disabled
                    className="w-full rounded-[18px] border border-[#fecaca] bg-[#fff1f2] px-4 py-3 text-left text-sm font-semibold text-[#be123c]"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-[#dfe5f1] bg-[#f7f9fd] p-5">
              <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.24em] text-[#9ca3b8]">{t.safety}</p>
              <div className="text-xs font-semibold leading-6 text-[#7c8099]">
                <span className="text-[#3b6ef8]">{t.previewOnly}</span>
                <br />
                <span>{t.candidateRule}</span>
                <br />
                <span>{t.planRule}</span>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

