"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  ActivityBasicIntakeAnalysisCard,
  ActivityLifecycleBadge,
  useActivityBasicIntakeAnalyses,
} from "@/components/activity/activity-basic-intake-analysis-card";

type Locale = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

type ActivityEventSummary = {
  id?: string | null;
  title?: string | null;
  comment?: string | null;
  status?: string | null;
  temporalDirection?: string | null;
  activityRoleCode?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  durationMinutes?: number | null;
  createdAt?: string | null;
};

type ActivityEventsResponse = {
  ok?: boolean;
  events?: ActivityEventSummary[];
  error?: string;
};

const LOCALES: Locale[] = ["en", "pl", "ru", "uk", "de", "es", "cs"];

const COPY: Record<Locale, {
  eyebrow: string;
  title: string;
  subtitle: string;
  back: string;
  missing: string;
  missingBody: string;
  loading: string;
  loadError: string;
  activity: string;
  basic: string;
  basicHelp: string;
}> = {
  ru: {
    eyebrow: "ЖУРНАЛ АНАЛИЗА",
    title: "Анализ активности",
    subtitle: "Здесь последовательно разбирается уже сохранённая активность. На текущем этапе выполняется только базовый анализ.",
    back: "Вернуться в Журнал активностей",
    missing: "Активность не выбрана",
    missingBody: "Откройте нужную запись из Журнала активностей. Новую активность здесь вводить не нужно.",
    loading: "Загружаем активность…",
    loadError: "Не удалось загрузить активность.",
    activity: "Исходная активность",
    basic: "1. Базовый анализ",
    basicHelp: "Базовая модель извлекает только явно сообщённые параметры и ищет действительно подходящие существующие типовые активности. ЦО/ОН, стандартные сценарии и дополнительные факты на этом этапе не применяются.",
  },
  en: {
    eyebrow: "ANALYSIS JOURNAL",
    title: "Activity analysis",
    subtitle: "This workspace analyzes an activity that is already saved. At this stage only the basic analysis runs.",
    back: "Back to Activity journal",
    missing: "No activity selected",
    missingBody: "Open the required entry from the Activity journal. New activities are not entered here.",
    loading: "Loading activity…",
    loadError: "Could not load the activity.",
    activity: "Source activity",
    basic: "1. Basic analysis",
    basicHelp: "The basic model extracts only explicitly reported parameters and searches for genuinely matching existing typical activities. Observation objects, standard scenarios and additional facts are not applied at this stage.",
  },
  pl: {
    eyebrow: "DZIENNIK ANALIZY",
    title: "Analiza aktywności",
    subtitle: "Tutaj analizowana jest już zapisana aktywność. Na tym etapie wykonywana jest wyłącznie analiza podstawowa.",
    back: "Wróć do Dziennika aktywności",
    missing: "Nie wybrano aktywności",
    missingBody: "Otwórz odpowiedni wpis z Dziennika aktywności. Nowej aktywności nie wprowadza się tutaj.",
    loading: "Ładowanie aktywności…",
    loadError: "Nie udało się załadować aktywności.",
    activity: "Aktywność źródłowa",
    basic: "1. Analiza podstawowa",
    basicHelp: "Model podstawowy wydobywa tylko jawnie podane parametry i szuka rzeczywiście pasujących istniejących typowych aktywności. Obiekty obserwacji, scenariusze standardowe i dodatkowe fakty nie są jeszcze stosowane.",
  },
  uk: {
    eyebrow: "ЖУРНАЛ АНАЛІЗУ",
    title: "Аналіз активності",
    subtitle: "Тут послідовно розбирається вже збережена активність. На цьому етапі виконується лише базовий аналіз.",
    back: "Повернутися до Журналу активностей",
    missing: "Активність не вибрана",
    missingBody: "Відкрийте потрібний запис із Журналу активностей. Нову активність тут вводити не потрібно.",
    loading: "Завантажуємо активність…",
    loadError: "Не вдалося завантажити активність.",
    activity: "Вихідна активність",
    basic: "1. Базовий аналіз",
    basicHelp: "Базова модель виділяє лише явно повідомлені параметри та шукає справді відповідні існуючі типові активності. ЦО/ОН, стандартні сценарії та додаткові факти на цьому етапі не застосовуються.",
  },
  de: {
    eyebrow: "ANALYSEJOURNAL",
    title: "Aktivitätsanalyse",
    subtitle: "Hier wird eine bereits gespeicherte Aktivität schrittweise analysiert. In dieser Phase läuft nur die Basisanalyse.",
    back: "Zurück zum Aktivitätsjournal",
    missing: "Keine Aktivität ausgewählt",
    missingBody: "Öffnen Sie den gewünschten Eintrag aus dem Aktivitätsjournal. Neue Aktivitäten werden hier nicht eingegeben.",
    loading: "Aktivität wird geladen…",
    loadError: "Aktivität konnte nicht geladen werden.",
    activity: "Ausgangsaktivität",
    basic: "1. Basisanalyse",
    basicHelp: "Das Basismodell extrahiert nur ausdrücklich genannte Parameter und sucht nach wirklich passenden vorhandenen typischen Aktivitäten. Beobachtungsobjekte, Standardszenarien und zusätzliche Fakten werden in dieser Phase nicht angewendet.",
  },
  es: {
    eyebrow: "DIARIO DE ANÁLISIS",
    title: "Análisis de actividad",
    subtitle: "Aquí se analiza paso a paso una actividad ya guardada. En esta etapa solo se ejecuta el análisis básico.",
    back: "Volver al Diario de actividades",
    missing: "No se ha seleccionado una actividad",
    missingBody: "Abra la entrada necesaria desde el Diario de actividades. Aquí no se introducen actividades nuevas.",
    loading: "Cargando actividad…",
    loadError: "No se pudo cargar la actividad.",
    activity: "Actividad original",
    basic: "1. Análisis básico",
    basicHelp: "El modelo básico extrae únicamente parámetros expresamente comunicados y busca actividades típicas existentes que realmente coincidan. Los objetos de observación, escenarios estándar y hechos adicionales no se aplican en esta etapa.",
  },
  cs: {
    eyebrow: "DENÍK ANALÝZY",
    title: "Analýza aktivity",
    subtitle: "Zde se postupně analyzuje již uložená aktivita. V této fázi probíhá pouze základní analýza.",
    back: "Zpět do Deníku aktivit",
    missing: "Nebyla vybrána aktivita",
    missingBody: "Otevřete požadovaný záznam z Deníku aktivit. Nové aktivity se zde nezadávají.",
    loading: "Načítání aktivity…",
    loadError: "Aktivitu se nepodařilo načíst.",
    activity: "Zdrojová aktivita",
    basic: "1. Základní analýza",
    basicHelp: "Základní model získává pouze výslovně uvedené parametry a hledá skutečně odpovídající existující typické aktivity. Objekty pozorování, standardní scénáře ani další fakta se v této fázi nepoužívají.",
  },
};

function normalizeLocale(value: string | null): Locale {
  return value && LOCALES.includes(value as Locale) ? (value as Locale) : "en";
}

function localeHref(pathname: string, locale: Locale) {
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

function Workspace() {
  const searchParams = useSearchParams();
  const locale = normalizeLocale(searchParams.get("locale"));
  const activityEventId = searchParams.get("activityEventId")?.trim() || "";
  const ui = COPY[locale];
  const [activity, setActivity] = useState<ActivityEventSummary | null>(null);
  const [loading, setLoading] = useState(Boolean(activityEventId));
  const [error, setError] = useState<string | null>(null);

  const analysisIds = useMemo(
    () => (activityEventId ? [activityEventId] : []),
    [activityEventId],
  );
  const analyses = useActivityBasicIntakeAnalyses(analysisIds);
  const analysis = activityEventId ? analyses[activityEventId] ?? null : null;

  useEffect(() => {
    if (!activityEventId) return;

    let cancelled = false;
    void fetch("/api/activity/events?limit=50", {
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as ActivityEventsResponse | null;
        if (!response.ok || payload?.ok === false) {
          throw new Error(payload?.error || `Activity request failed: ${response.status}`);
        }
        return payload;
      })
      .then((payload) => {
        if (cancelled) return;
        const found = (payload?.events ?? []).find((event) => event.id === activityEventId) ?? null;
        setActivity(found);
        setError(found ? null : ui.loadError);
      })
      .catch(() => {
        if (!cancelled) {
          setActivity(null);
          setError(ui.loadError);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activityEventId, ui.loadError]);

  const planned =
    activity?.activityRoleCode === "planned" ||
    activity?.temporalDirection === "future";
  const title = activity?.title?.trim() || activity?.comment?.trim() || "—";
  const when =
    formatDateTime(activity?.startedAt, locale) ||
    formatDateTime(activity?.createdAt, locale);

  return (
    <main className="min-h-screen bg-[#f0f2f7] px-3 py-5 text-[#1a1d2e]">
      <div className="mx-auto max-w-[1180px] space-y-4">
        <section className="rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#3b6ef8]">
                {ui.eyebrow}
              </div>
              <h1 className="mt-2 text-3xl font-black tracking-tight">{ui.title}</h1>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-[#727993]">
                {ui.subtitle}
              </p>
            </div>
            <Link
              href={localeHref("/activity-today", locale)}
              className="rounded-xl border border-[#d8deef] bg-white px-4 py-2 text-sm font-bold text-[#52617f] no-underline hover:bg-[#f7f9ff]"
            >
              ← {ui.back}
            </Link>
          </div>
        </section>

        {!activityEventId ? (
          <section className="rounded-2xl border border-dashed border-[#cfd8ef] bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-black">{ui.missing}</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm font-medium leading-relaxed text-[#727993]">
              {ui.missingBody}
            </p>
          </section>
        ) : loading ? (
          <section className="rounded-2xl border border-[#e1e5ef] bg-white p-6 text-sm font-semibold text-[#727993] shadow-sm">
            {ui.loading}
          </section>
        ) : error || !activity ? (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-semibold text-rose-700 shadow-sm">
            {error || ui.loadError}
          </section>
        ) : (
          <>
            <section className="rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white p-5 shadow-sm">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#667091]">
                {ui.activity}
              </div>
              <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-2xl font-black leading-tight">{title}</h2>
                  {when ? (
                    <div className="mt-2 text-sm font-semibold text-[#7c8099]">{when}</div>
                  ) : null}
                </div>
                <ActivityLifecycleBadge locale={locale} planned={planned} />
              </div>
            </section>

            <section className="rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white p-5 shadow-sm">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#3b6ef8]">
                {ui.basic}
              </div>
              <p className="mt-2 max-w-4xl text-sm font-medium leading-relaxed text-[#727993]">
                {ui.basicHelp}
              </p>
              {analysis ? (
                <ActivityBasicIntakeAnalysisCard analysis={analysis} locale={locale} />
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-[#cfd8f3] bg-[#f8faff] px-3 py-3 text-sm font-semibold text-[#667091]">
                  {ui.loading}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

export default function ActivityAiLabPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f0f2f7] px-3 py-5 text-[#1a1d2e]">
          <div className="mx-auto max-w-[1180px] rounded-2xl border border-[#e1e5ef] bg-white p-6 shadow-sm">
            …
          </div>
        </main>
      }
    >
      <Workspace />
    </Suspense>
  );
}
