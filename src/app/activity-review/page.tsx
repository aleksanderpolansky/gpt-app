"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { buildAiLabQuickCaptureReviewHref } from "@/lib/activity/aiLabQuickCapture";

type Locale = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

type ReviewActivity = {
  id: string;
  title: string;
  inputText?: string | null;
  activityRoleCode?: string | null;
  status?: string | null;
  startedAt?: string | null;
  scheduledDate?: string | null;
  createdAt?: string | null;
};

type ReviewQueueResponse = {
  ok?: boolean;
  error?: string;
  count?: number;
  activities?: ReviewActivity[];
};

const COPY: Record<Locale, {
  title: string;
  subtitle: string;
  empty: string;
  actual: string;
  planned: string;
  open: string;
  loading: string;
  error: string;
}> = {
  ru: {
    title: "Требуют проверки",
    subtitle: "Активности уже сохранены. Здесь остаются записи, анализ которых ещё не просмотрен пользователем.",
    empty: "Сейчас нет активностей, требующих проверки.",
    actual: "Журнал активностей",
    planned: "Календарь",
    open: "Открыть проверку",
    loading: "Загружаю…",
    error: "Не удалось загрузить список.",
  },
  pl: {
    title: "Wymagają sprawdzenia",
    subtitle: "Aktywności są już zapisane. Tutaj pozostają wpisy, których analiza nie została jeszcze przejrzana przez użytkownika.",
    empty: "Brak aktywności wymagających sprawdzenia.",
    actual: "Dziennik aktywności",
    planned: "Kalendarz",
    open: "Otwórz sprawdzenie",
    loading: "Ładowanie…",
    error: "Nie udało się wczytać listy.",
  },
  en: {
    title: "Require review",
    subtitle: "Activities are already saved. This list contains records whose analysis has not yet been reviewed by the user.",
    empty: "There are no activities requiring review.",
    actual: "Activity journal",
    planned: "Calendar",
    open: "Open review",
    loading: "Loading…",
    error: "Could not load the list.",
  },
  uk: {
    title: "Потребують перевірки",
    subtitle: "Активності вже збережені. Тут залишаються записи, аналіз яких користувач ще не переглянув.",
    empty: "Немає активностей, що потребують перевірки.",
    actual: "Журнал активностей",
    planned: "Календар",
    open: "Відкрити перевірку",
    loading: "Завантаження…",
    error: "Не вдалося завантажити список.",
  },
  de: {
    title: "Müssen geprüft werden",
    subtitle: "Die Aktivitäten sind bereits gespeichert. Hier bleiben Einträge, deren Analyse noch nicht vom Benutzer geprüft wurde.",
    empty: "Derzeit müssen keine Aktivitäten geprüft werden.",
    actual: "Aktivitätsjournal",
    planned: "Kalender",
    open: "Prüfung öffnen",
    loading: "Laden…",
    error: "Liste konnte nicht geladen werden.",
  },
  es: {
    title: "Requieren revisión",
    subtitle: "Las actividades ya están guardadas. Aquí permanecen los registros cuyo análisis aún no ha sido revisado por el usuario.",
    empty: "No hay actividades que requieran revisión.",
    actual: "Diario de actividades",
    planned: "Calendario",
    open: "Abrir revisión",
    loading: "Cargando…",
    error: "No se pudo cargar la lista.",
  },
  cs: {
    title: "Vyžadují kontrolu",
    subtitle: "Aktivity jsou již uložené. Zde zůstávají záznamy, jejichž analýzu uživatel ještě nezkontroloval.",
    empty: "Žádné aktivity nyní nevyžadují kontrolu.",
    actual: "Deník aktivit",
    planned: "Kalendář",
    open: "Otevřít kontrolu",
    loading: "Načítání…",
    error: "Seznam se nepodařilo načíst.",
  },
};

function normalizeLocale(value: string | null): Locale {
  return value === "ru" || value === "pl" || value === "en" ||
    value === "uk" || value === "de" || value === "es" || value === "cs"
    ? value
    : "en";
}

function formatReviewWhen(value: string | null | undefined, locale: Locale) {
  if (!value) return "—";
  const languageTag: Record<Locale, string> = {
    ru: "ru-RU", pl: "pl-PL", en: "en-GB", uk: "uk-UA", de: "de-DE", es: "es-ES", cs: "cs-CZ",
  };
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat(languageTag[locale], { dateStyle: "medium" }).format(
      new Date(year, month - 1, day, 12, 0, 0, 0),
    );
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(languageTag[locale], {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

export default function ActivityReviewQueuePage() {
  const [locale, setLocale] = useState<Locale>("en");
  const [activities, setActivities] = useState<ReviewActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const nextLocale = normalizeLocale(
      new URLSearchParams(window.location.search).get("locale"),
    );
    const localeInitTimer = window.setTimeout(() => {
      setLocale(nextLocale);
    }, 0);

    return () => {
      window.clearTimeout(localeInitTimer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/activity/review-queue", {
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        const payload = (await response.json().catch(() => null)) as ReviewQueueResponse | null;

        if (!response.ok || payload?.ok !== true) {
          throw new Error(payload?.error || `HTTP ${response.status}`);
        }

        if (!cancelled) {
          setActivities(Array.isArray(payload.activities) ? payload.activities : []);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : COPY[locale].error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const copy = COPY[locale];
  const countLabel = useMemo(() => String(activities.length), [activities.length]);

  return (
    <main className="min-h-screen bg-[#f0f2f7] px-4 py-6 text-[#1a1d2e] md:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="rounded-[28px] border border-black/[0.06] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-[#3b6ef8]">
                P5C · REVIEW BUFFER
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-[-0.03em]">{copy.title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#68708a]">{copy.subtitle}</p>
            </div>
            <span className="rounded-full border border-[#dce4ff] bg-[#eef2ff] px-4 py-2 text-sm font-bold text-[#315ee7]">
              {countLabel}
            </span>
          </div>
        </header>

        {loading ? (
          <section className="rounded-2xl border border-black/[0.06] bg-white p-6 text-sm font-semibold text-[#68708a] shadow-sm">
            {copy.loading}
          </section>
        ) : null}

        {error ? (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-800">
            {copy.error} {error}
          </section>
        ) : null}

        {!loading && !error && activities.length === 0 ? (
          <section className="rounded-2xl border border-black/[0.06] bg-white p-8 text-sm font-semibold text-[#68708a] shadow-sm">
            {copy.empty}
          </section>
        ) : null}

        <section className="space-y-3">
          {activities.map((activity) => {
            const isPlanned = activity.activityRoleCode === "planned";
            const destination = isPlanned ? copy.planned : copy.actual;
            const when = formatReviewWhen(
              activity.startedAt || activity.scheduledDate || activity.createdAt,
              locale,
            );

            return (
              <article
                className="rounded-[22px] border border-black/[0.06] bg-white p-5 shadow-sm"
                key={activity.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${isPlanned ? "bg-violet-50 text-violet-700" : "bg-emerald-50 text-emerald-700"}`}>
                        {destination}
                      </span>
                      <span className="text-xs font-semibold text-[#9ca3b8]">{when}</span>
                    </div>
                    <h2 className="mt-3 text-lg font-bold">{activity.title}</h2>
                    {activity.inputText && activity.inputText !== activity.title ? (
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#68708a]">{activity.inputText}</p>
                    ) : null}
                  </div>

                  <Link
                    className="rounded-xl bg-[#315ee7] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#274ed0]"
                    href={buildAiLabQuickCaptureReviewHref({
                      locale,
                      activityEventId: activity.id,
                    })}
                  >
                    {copy.open}
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
