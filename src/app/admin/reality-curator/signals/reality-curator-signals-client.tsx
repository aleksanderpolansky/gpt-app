"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";

import { getLocaleSearchParam, type LocaleCode } from "@/i18n";
import { CuratorWorkPanel } from "./curator-work-panel";

type Measurement = {
  parameterCode: string;
  label: string;
  measureType: string;
  unit: string;
  valueNumeric: number | null;
  valueText: string | null;
  rawFragment: string;
  confidence: number | null;
};

type JourneyEvent = {
  eventCode: string;
  occurredAt: string;
  stageCode: string;
  checklistVersion: string;
  checklistStepCode: string | null;
  checklistStepNameSnapshotRu: string | null;
  labelRu: string;
  labelEn: string;
  provenance: string;
  resultSummaryRu: string | null;
  resultSummaryEn: string | null;
};

type CuratorSignal = {
  kind: "missing_typical_activity";
  status: "new";
  signalId: string;
  activityEventId: string | null;
  userId: string;
  sourceText: string;
  locale: string | null;
  timeZone: string | null;
  temporalDirection: string | null;
  reportedAt: string | null;
  analyzedAt: string;
  updatedAt: string;
  processingStatus: string;
  analysisMode: string | null;
  providerAvailable: boolean | null;
  candidateLoadWarning: string | null;
  measurements: Measurement[];
  journey: JourneyEvent[];
};

type QueueResponse = {
  ok?: boolean;
  error?: string;
  signals?: CuratorSignal[];
  counts?: {
    visible?: number;
    scanned?: number;
    scanLimit?: number;
  };
  readOnly?: boolean;
};

type Copy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  live: string;
  refresh: string;
  refreshing: string;
  search: string;
  emptyTitle: string;
  emptyText: string;
  loadError: string;
  signalType: string;
  signalTypeValue: string;
  sourceText: string;
  measurements: string;
  noMeasurements: string;
  analyzedAt: string;
  userId: string;
  signalId: string;
  eventId: string;
  locale: string;
  direction: string;
  analysisMode: string;
  warning: string;
  queueCount: string;
  scannedCount: string;
  readonly: string;
};

const COPY: Record<LocaleCode, Copy> = {
  ru: {
    eyebrow: "ARCTOR · КУРАТОР МОДЕЛИ",
    title: "Входящие сигналы",
    subtitle:
      "Реальные случаи, в которых фоновый анализ уже завершён, но подходящая типовая активность не найдена.",
    live: "Рабочая очередь",
    refresh: "Обновить",
    refreshing: "Обновляем…",
    search: "Поиск по тексту, пользователю или идентификатору…",
    emptyTitle: "Новых сигналов нет",
    emptyText:
      "Как только фоновый анализ активности из правой колонки завершится без подходящей типовой активности, случай появится здесь автоматически.",
    loadError: "Не удалось загрузить очередь куратора.",
    signalType: "Причина сигнала",
    signalTypeValue: "Не найдена типовая активность",
    sourceText: "Сообщение пользователя",
    measurements: "Выявленные параметры",
    noMeasurements: "Измеримые параметры не выявлены.",
    analyzedAt: "Анализ завершён",
    userId: "Пользователь",
    signalId: "Сигнал",
    eventId: "Активность",
    locale: "Язык / часовой пояс",
    direction: "Направление времени",
    analysisMode: "Режим анализа",
    warning: "Предупреждение анализа",
    queueCount: "В очереди",
    scannedCount: "Проверено сигналов",
    readonly: "Действия куратора сохраняются в фактической истории пути. ОН, связи, параметры и типовые активности на этом этапе ещё не изменяются.",
  },
  en: {
    eyebrow: "ARCTOR · REALITY CURATOR",
    title: "Incoming signals",
    subtitle:
      "Real cases where background analysis has completed but no suitable typical activity was found.",
    live: "Live queue",
    refresh: "Refresh",
    refreshing: "Refreshing…",
    search: "Search text, user or identifier…",
    emptyTitle: "No new signals",
    emptyText:
      "When a right-rail activity finishes background analysis without a suitable typical activity, the case will appear here automatically.",
    loadError: "Could not load the curator queue.",
    signalType: "Signal reason",
    signalTypeValue: "No typical activity found",
    sourceText: "User message",
    measurements: "Detected measurements",
    noMeasurements: "No measurable parameters were detected.",
    analyzedAt: "Analysis completed",
    userId: "User",
    signalId: "Signal",
    eventId: "Activity",
    locale: "Locale / time zone",
    direction: "Temporal direction",
    analysisMode: "Analysis mode",
    warning: "Analysis warning",
    queueCount: "In queue",
    scannedCount: "Signals scanned",
    readonly: "Curator actions are recorded in the actual path history. Observation objects, relations, parameters and typical activities are not changed at this stage.",
  },
  pl: {
    eyebrow: "ARCTOR · KURATOR MODELU",
    title: "Sygnały przychodzące",
    subtitle:
      "Rzeczywiste przypadki, w których analiza w tle została zakończona, ale nie znaleziono odpowiedniej typowej aktywności.",
    live: "Kolejka robocza",
    refresh: "Odśwież",
    refreshing: "Odświeżanie…",
    search: "Szukaj po treści, użytkowniku lub identyfikatorze…",
    emptyTitle: "Brak nowych sygnałów",
    emptyText:
      "Gdy analiza aktywności z prawego panelu zakończy się bez odpowiedniej typowej aktywności, przypadek pojawi się tutaj automatycznie.",
    loadError: "Nie udało się wczytać kolejki kuratora.",
    signalType: "Powód sygnału",
    signalTypeValue: "Nie znaleziono typowej aktywności",
    sourceText: "Wiadomość użytkownika",
    measurements: "Wykryte parametry",
    noMeasurements: "Nie wykryto mierzalnych parametrów.",
    analyzedAt: "Analiza zakończona",
    userId: "Użytkownik",
    signalId: "Sygnał",
    eventId: "Aktywność",
    locale: "Język / strefa czasowa",
    direction: "Kierunek czasu",
    analysisMode: "Tryb analizy",
    warning: "Ostrzeżenie analizy",
    queueCount: "W kolejce",
    scannedCount: "Sprawdzono sygnałów",
    readonly: "Działania kuratora są zapisywane w historii rzeczywiście wykonanej ścieżki. Obiekty, relacje, parametry i aktywności typowe nie są jeszcze zmieniane.",
  },
  uk: {
    eyebrow: "ARCTOR · КУРАТОР МОДЕЛІ",
    title: "Вхідні сигнали",
    subtitle:
      "Реальні випадки, де фоновий аналіз завершено, але відповідної типової активності не знайдено.",
    live: "Робоча черга",
    refresh: "Оновити",
    refreshing: "Оновлюємо…",
    search: "Пошук за текстом, користувачем або ідентифікатором…",
    emptyTitle: "Нових сигналів немає",
    emptyText:
      "Коли фоновий аналіз активності з правої панелі завершиться без відповідної типової активності, випадок автоматично з’явиться тут.",
    loadError: "Не вдалося завантажити чергу куратора.",
    signalType: "Причина сигналу",
    signalTypeValue: "Не знайдено типової активності",
    sourceText: "Повідомлення користувача",
    measurements: "Виявлені параметри",
    noMeasurements: "Вимірюваних параметрів не виявлено.",
    analyzedAt: "Аналіз завершено",
    userId: "Користувач",
    signalId: "Сигнал",
    eventId: "Активність",
    locale: "Мова / часовий пояс",
    direction: "Напрям часу",
    analysisMode: "Режим аналізу",
    warning: "Попередження аналізу",
    queueCount: "У черзі",
    scannedCount: "Перевірено сигналів",
    readonly: "Дії куратора записуються у фактичній історії шляху. Об’єкти, зв’язки, параметри та типові активності на цьому етапі ще не змінюються.",
  },
  de: {
    eyebrow: "ARCTOR · MODELLKURATOR",
    title: "Eingehende Signale",
    subtitle:
      "Reale Fälle, bei denen die Hintergrundanalyse abgeschlossen ist, aber keine passende typische Aktivität gefunden wurde.",
    live: "Arbeitswarteschlange",
    refresh: "Aktualisieren",
    refreshing: "Wird aktualisiert…",
    search: "Nach Text, Benutzer oder Kennung suchen…",
    emptyTitle: "Keine neuen Signale",
    emptyText:
      "Sobald die Hintergrundanalyse einer Aktivität aus der rechten Leiste ohne passende typische Aktivität endet, erscheint der Fall automatisch hier.",
    loadError: "Die Kuratorenwarteschlange konnte nicht geladen werden.",
    signalType: "Signalgrund",
    signalTypeValue: "Keine typische Aktivität gefunden",
    sourceText: "Benutzernachricht",
    measurements: "Erkannte Parameter",
    noMeasurements: "Keine messbaren Parameter erkannt.",
    analyzedAt: "Analyse abgeschlossen",
    userId: "Benutzer",
    signalId: "Signal",
    eventId: "Aktivität",
    locale: "Sprache / Zeitzone",
    direction: "Zeitrichtung",
    analysisMode: "Analysemodus",
    warning: "Analysewarnung",
    queueCount: "In der Warteschlange",
    scannedCount: "Signale geprüft",
    readonly: "Kuratorenaktionen werden im tatsächlich durchlaufenen Verlauf gespeichert. Objekte, Beziehungen, Parameter und typische Aktivitäten werden in diesem Schritt noch nicht geändert.",
  },
  es: {
    eyebrow: "ARCTOR · CURADOR DEL MODELO",
    title: "Señales entrantes",
    subtitle:
      "Casos reales en los que el análisis en segundo plano terminó sin encontrar una actividad típica adecuada.",
    live: "Cola de trabajo",
    refresh: "Actualizar",
    refreshing: "Actualizando…",
    search: "Buscar por texto, usuario o identificador…",
    emptyTitle: "No hay señales nuevas",
    emptyText:
      "Cuando el análisis de una actividad del panel derecho termine sin una actividad típica adecuada, el caso aparecerá aquí automáticamente.",
    loadError: "No se pudo cargar la cola del curador.",
    signalType: "Motivo de la señal",
    signalTypeValue: "No se encontró actividad típica",
    sourceText: "Mensaje del usuario",
    measurements: "Parámetros detectados",
    noMeasurements: "No se detectaron parámetros medibles.",
    analyzedAt: "Análisis completado",
    userId: "Usuario",
    signalId: "Señal",
    eventId: "Actividad",
    locale: "Idioma / zona horaria",
    direction: "Dirección temporal",
    analysisMode: "Modo de análisis",
    warning: "Advertencia del análisis",
    queueCount: "En cola",
    scannedCount: "Señales revisadas",
    readonly: "Las acciones del curador se registran en el historial real del proceso. Los objetos, relaciones, parámetros y actividades típicas todavía no se modifican en esta etapa.",
  },
  cs: {
    eyebrow: "ARCTOR · KURÁTOR MODELU",
    title: "Příchozí signály",
    subtitle:
      "Skutečné případy, kdy analýza na pozadí skončila, ale nebyla nalezena vhodná typická aktivita.",
    live: "Pracovní fronta",
    refresh: "Obnovit",
    refreshing: "Obnovujeme…",
    search: "Hledat podle textu, uživatele nebo identifikátoru…",
    emptyTitle: "Žádné nové signály",
    emptyText:
      "Jakmile analýza aktivity z pravého panelu skončí bez vhodné typické aktivity, případ se zde objeví automaticky.",
    loadError: "Frontu kurátora se nepodařilo načíst.",
    signalType: "Důvod signálu",
    signalTypeValue: "Nebyla nalezena typická aktivita",
    sourceText: "Zpráva uživatele",
    measurements: "Zjištěné parametry",
    noMeasurements: "Nebyly zjištěny měřitelné parametry.",
    analyzedAt: "Analýza dokončena",
    userId: "Uživatel",
    signalId: "Signál",
    eventId: "Aktivita",
    locale: "Jazyk / časové pásmo",
    direction: "Časový směr",
    analysisMode: "Režim analýzy",
    warning: "Varování analýzy",
    queueCount: "Ve frontě",
    scannedCount: "Zkontrolováno signálů",
    readonly: "Akce kurátora se zapisují do historie skutečně provedené cesty. Objekty, vazby, parametry a typické aktivity se v této fázi ještě nemění.",
  },
};

function localeFromWindow(): LocaleCode {
  if (typeof window === "undefined") return "en";
  return getLocaleSearchParam(new URLSearchParams(window.location.search));
}

function formatDate(value: string, locale: LocaleCode) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  const localeTag: Record<LocaleCode, string> = {
    ru: "ru-RU",
    pl: "pl-PL",
    en: "en-GB",
    es: "es-ES",
    uk: "uk-UA",
    de: "de-DE",
    cs: "cs-CZ",
  };
  return new Intl.DateTimeFormat(localeTag[locale], {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatMeasurement(item: Measurement) {
  const value = item.valueNumeric ?? item.valueText ?? "—";
  return `${item.label || item.parameterCode}: ${value}${item.unit ? ` ${item.unit}` : ""}`;
}

const JOURNEY_TITLE: Record<LocaleCode, string> = {
  ru: "Фактически пройденный путь",
  en: "Actual completed path",
  pl: "Faktycznie zrealizowana ścieżka",
  uk: "Фактично пройдений шлях",
  de: "Tatsächlich durchlaufener Weg",
  es: "Ruta realmente completada",
  cs: "Skutečně dokončená cesta",
};

const JOURNEY_EMPTY: Record<LocaleCode, string> = {
  ru: "Журнал пути ещё не сформирован.",
  en: "The journey log has not been created yet.",
  pl: "Dziennik ścieżki nie został jeszcze utworzony.",
  uk: "Журнал шляху ще не сформовано.",
  de: "Das Wegprotokoll wurde noch nicht erstellt.",
  es: "El registro de la ruta aún no se ha creado.",
  cs: "Záznam cesty ještě nebyl vytvořen.",
};

function journeyEventLabel(item: JourneyEvent, locale: LocaleCode) {
  return locale === "ru" ? item.labelRu : item.labelEn;
}

function journeyProvenanceLabel(value: string, locale: LocaleCode) {
  if (value === "release_backfill_durable_evidence") {
    return locale === "ru"
      ? "восстановлено по сохранённым фактическим данным"
      : "reconstructed from durable evidence";
  }
  if (value === "runtime_durable_evidence") {
    return locale === "ru" ? "зафиксировано системой" : "recorded by the system";
  }
  if (value === "curator_action") {
    return locale === "ru" ? "действие куратора" : "curator action";
  }
  return value;
}

export function RealityCuratorSignalsClient() {
  const [locale, setLocale] = useState<LocaleCode>("en");
  const [payload, setPayload] = useState<QueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const syncLocale = () => setLocale(localeFromWindow());
    const timer = window.setTimeout(syncLocale, 0);
    window.addEventListener("popstate", syncLocale);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("popstate", syncLocale);
    };
  }, []);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/reality-curator/signals?limit=500", {
        method: "GET",
        cache: "no-store",
      });
      const data = (await response.json().catch(() => null)) as QueueResponse | null;
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || `HTTP_${response.status}`);
      }
      setPayload(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "UNKNOWN");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load(false);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  const copy = COPY[locale] ?? COPY.en;
  const filteredSignals = useMemo(() => {
    const items = payload?.signals ?? [];
    const query = search.trim().toLocaleLowerCase();
    if (!query) return items;
    return items.filter((item) =>
      [item.sourceText, item.userId, item.signalId, item.activityEventId ?? ""]
        .join(" ")
        .toLocaleLowerCase()
        .includes(query),
    );
  }, [payload?.signals, search]);

  return (
    <main className="mx-auto w-full max-w-[1440px] space-y-5 p-5 lg:p-7">
      <section className="rounded-[22px] border border-[rgba(0,0,0,0.07)] bg-white p-6 shadow-[0_2px_8px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold tracking-[0.22em] text-[#3b6ef8]">
              {copy.eyebrow}
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-[#111827]">
              {copy.title}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#7c8099]">
              {copy.subtitle}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
              <CheckCircle2 size={14} /> {copy.live}
            </span>
            <button
              type="button"
              onClick={() => void load(true)}
              disabled={refreshing}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#d8def0] bg-white px-3 text-sm font-bold text-[#33384f] disabled:opacity-50"
            >
              {refreshing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              {refreshing ? copy.refreshing : copy.refresh}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#e3e8f8] bg-[#f8faff] px-4 py-3">
            <div className="text-xs font-semibold text-[#7c8099]">{copy.queueCount}</div>
            <div className="mt-1 text-2xl font-extrabold text-[#1a1d2e]">{payload?.counts?.visible ?? 0}</div>
          </div>
          <div className="rounded-2xl border border-[#e3e8f8] bg-[#f8faff] px-4 py-3">
            <div className="text-xs font-semibold text-[#7c8099]">{copy.scannedCount}</div>
            <div className="mt-1 text-2xl font-extrabold text-[#1a1d2e]">{payload?.counts?.scanned ?? 0}</div>
          </div>
        </div>

        <label className="mt-4 flex h-11 items-center gap-2 rounded-xl border border-[#d8def0] bg-white px-3">
          <Search size={16} className="text-[#9ca3b8]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={copy.search}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </label>
      </section>

      {loading ? (
        <section className="flex min-h-52 items-center justify-center rounded-[22px] border border-[rgba(0,0,0,0.07)] bg-white">
          <Loader2 size={24} className="animate-spin text-[#3b6ef8]" />
        </section>
      ) : error ? (
        <section className="rounded-[22px] border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          <div className="flex items-center gap-2 font-bold"><AlertTriangle size={17} />{copy.loadError}</div>
          <div className="mt-2 font-mono text-xs">{error}</div>
        </section>
      ) : filteredSignals.length === 0 ? (
        <section className="rounded-[22px] border border-[rgba(0,0,0,0.07)] bg-white p-8 text-center">
          <Database size={28} className="mx-auto text-[#9ca3b8]" />
          <h2 className="mt-3 text-lg font-extrabold text-[#1a1d2e]">{copy.emptyTitle}</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[#7c8099]">{copy.emptyText}</p>
        </section>
      ) : (
        <section className="space-y-3">
          {filteredSignals.map((signal) => (
            <article key={signal.signalId} className="rounded-[22px] border border-[rgba(0,0,0,0.07)] bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.17em] text-amber-700">{copy.signalType}</div>
                  <div className="mt-1 text-base font-extrabold text-[#1a1d2e]">{copy.signalTypeValue}</div>
                </div>
                <div className="text-xs font-semibold text-[#7c8099]">{copy.analyzedAt}: {formatDate(signal.analyzedAt, locale)}</div>
              </div>

              <div className="mt-4 rounded-2xl border border-[#e7e9f2] bg-[#f8f9fc] p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6b7280]">{copy.sourceText}</div>
                <div className="mt-2 whitespace-pre-wrap text-[15px] font-semibold leading-6 text-[#1f2937]">
                  {signal.sourceText || "—"}
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Meta label={copy.userId} value={signal.userId} />
                <Meta label={copy.signalId} value={signal.signalId} />
                <Meta label={copy.eventId} value={signal.activityEventId ?? "—"} />
                <Meta label={copy.locale} value={[signal.locale, signal.timeZone].filter(Boolean).join(" · ") || "—"} />
                <Meta label={copy.direction} value={signal.temporalDirection ?? "—"} />
                <Meta label={copy.analysisMode} value={signal.analysisMode ?? "—"} />
              </div>

              <div className="mt-4 border-t border-[#eceef5] pt-4">
                <div className="text-xs font-extrabold text-[#33384f]">{copy.measurements}</div>
                {signal.measurements.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {signal.measurements.map((item, index) => (
                      <span key={`${signal.signalId}:${item.parameterCode}:${index}`} className="rounded-full bg-[#eef2ff] px-3 py-1.5 text-xs font-semibold text-[#4055a8]">
                        {formatMeasurement(item)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-[#8b90a5]">{copy.noMeasurements}</div>
                )}
              </div>

              <div className="mt-4 border-t border-[#eceef5] pt-4">
                <div className="text-xs font-extrabold text-[#33384f]">{JOURNEY_TITLE[locale]}</div>
                {(signal.journey ?? []).length > 0 ? (
                  <ol className="mt-3 space-y-2.5">
                    {(signal.journey ?? []).map((item, index) => (
                      <li key={`${signal.signalId}:${item.eventCode}`} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                            <CheckCircle2 size={15} />
                          </span>
                          {index < (signal.journey ?? []).length - 1 ? <span className="mt-1 h-full min-h-5 w-px bg-emerald-100" /> : null}
                        </div>
                        <div className="min-w-0 flex-1 pb-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-sm font-bold text-[#263044]">{journeyEventLabel(item, locale)}</span>
                            <span className="font-mono text-[10px] text-[#8990a7]">{item.eventCode}</span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#7c8099]">
                            <span>{formatDate(item.occurredAt, locale)}</span>
                            <span>v{item.checklistVersion}</span>
                            {item.checklistStepCode ? <span>{locale === "ru" ? "шаг" : "step"} {item.checklistStepCode}</span> : null}
                            <span>{journeyProvenanceLabel(item.provenance, locale)}</span>
                          </div>
                          {locale === "ru" && item.checklistStepNameSnapshotRu ? (
                            <div className="mt-1 text-[11px] leading-4 text-[#697089]">{item.checklistStepNameSnapshotRu}</div>
                          ) : null}
                          {(locale === "ru" ? item.resultSummaryRu : item.resultSummaryEn) ? (
                            <div className="mt-1 text-[11px] font-semibold leading-4 text-[#4b5563]">
                              {locale === "ru" ? item.resultSummaryRu : item.resultSummaryEn}
                            </div>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="mt-2 text-xs text-[#8b90a5]">{JOURNEY_EMPTY[locale]}</div>
                )}
              </div>

              <CuratorWorkPanel
                signalId={signal.signalId}
                journey={signal.journey ?? []}
                locale={locale}
                onChanged={() => void load(true)}
              />

              {signal.candidateLoadWarning ? (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <span className="font-bold">{copy.warning}: </span>{signal.candidateLoadWarning}
                </div>
              ) : null}
            </article>
          ))}
        </section>
      )}

      <div className="rounded-xl border border-[#e3e8f8] bg-[#f8faff] px-4 py-3 text-xs leading-5 text-[#68708b]">
        {copy.readonly}
      </div>
    </main>
  );
}

function Meta({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-[#eceef5] bg-white px-3 py-2.5">
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9ca3b8]">{label}</div>
      <div className="mt-1 truncate font-mono text-xs font-semibold text-[#4b5563]" title={value}>{value}</div>
    </div>
  );
}
