"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  addDays,
  addMonths,
  dateKey,
  eventDateKey,
  eventDurationMinutes,
  eventIntersectsRange,
  eventStartDate,
  formatTimeRange,
  getMonthGridDates,
  getRangeForView,
  getWeekDates,
  isSameDate,
  isSameMonth,
  parseDateKey,
} from "../../features/calendar-core/date-utils";
import type { CalendarEvent, CalendarViewMode } from "../../features/calendar-core/types";

type CalendarRebuildClientProps = {
  initialFocusDateKey: string | null;
  initialLocale: string | null;
};

type UiLocale = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

type CalendarEventsResponse = {
  ok?: boolean;
  events?: CalendarEvent[];
  error?: string;
  sources?: {
    calendarEvents?: number;
    timeBlocks?: number;
  };
};

type PositionedEvent = {
  event: CalendarEvent;
  top: number;
  height: number;
};

type UiLabels = {
  title: string;
  subtitle: string;
  add: string;
  selectedDay: string;
  selectedWeek: string;
  selectedMonth: string;
  today: string;
  selectedEvent: string;
  clickEvent: string;
  loadingEvents: string;
  visibleEvents: string;
  calendarEvents: string;
  timeBlocks: string;
  source: string;
  kind: string;
  layer: string;
  day: string;
  week: string;
  month: string;
  time: string;
};

const UI: Record<UiLocale, UiLabels> = {
  en: {
    title: "Calendar",
    subtitle: "Time planning with AI activity analysis, calendar records and observation context.",
    add: "+ Add",
    selectedDay: "Selected day",
    selectedWeek: "Selected week",
    selectedMonth: "Selected month",
    today: "Today",
    selectedEvent: "Selected event",
    clickEvent: "Click an event in the calendar.",
    loadingEvents: "Loading events...",
    visibleEvents: "visible events",
    calendarEvents: "calendar events",
    timeBlocks: "time blocks",
    source: "Source",
    kind: "Kind",
    layer: "Layer",
    day: "Day",
    week: "Week",
    month: "Month",
    time: "Time",
  },
  pl: {
    title: "Kalendarz",
    subtitle: "Planowanie czasu z analiza AI aktywnosci, zapisami kalendarza i kontekstem obserwacji.",
    add: "+ Dodaj",
    selectedDay: "Wybrany dzien",
    selectedWeek: "Wybrany tydzien",
    selectedMonth: "Wybrany miesiac",
    today: "Dzisiaj",
    selectedEvent: "Wybrane zdarzenie",
    clickEvent: "Kliknij zdarzenie w kalendarzu.",
    loadingEvents: "Ladowanie zdarzen...",
    visibleEvents: "widoczne zdarzenia",
    calendarEvents: "zdarzenia kalendarza",
    timeBlocks: "bloki czasu",
    source: "Zrodlo",
    kind: "Typ",
    layer: "Warstwa",
    day: "Dzien",
    week: "Tydzien",
    month: "Miesiac",
    time: "Czas",
  },
  ru: {
    title: "\u041a\u0430\u043b\u0435\u043d\u0434\u0430\u0440\u044c",
    subtitle: "\u041f\u043b\u0430\u043d\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 \u0432\u0440\u0435\u043c\u0435\u043d\u0438 \u0441 AI-\u0430\u043d\u0430\u043b\u0438\u0437\u043e\u043c \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0435\u0439, \u043a\u0430\u043b\u0435\u043d\u0434\u0430\u0440\u043d\u044b\u043c\u0438 \u0437\u0430\u043f\u0438\u0441\u044f\u043c\u0438 \u0438 \u043a\u043e\u043d\u0442\u0435\u043a\u0441\u0442\u043e\u043c \u043d\u0430\u0431\u043b\u044e\u0434\u0435\u043d\u0438\u0439.",
    add: "+ \u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c",
    selectedDay: "\u0412\u044b\u0431\u0440\u0430\u043d\u043d\u044b\u0439 \u0434\u0435\u043d\u044c",
    selectedWeek: "\u0412\u044b\u0431\u0440\u0430\u043d\u043d\u0430\u044f \u043d\u0435\u0434\u0435\u043b\u044f",
    selectedMonth: "\u0412\u044b\u0431\u0440\u0430\u043d\u043d\u044b\u0439 \u043c\u0435\u0441\u044f\u0446",
    today: "\u0421\u0435\u0433\u043e\u0434\u043d\u044f",
    selectedEvent: "\u0417\u0430\u043f\u0438\u0441\u044c",
    clickEvent: "\u041d\u0430\u0436\u043c\u0438\u0442\u0435 \u043d\u0430 \u0437\u0430\u043f\u0438\u0441\u044c \u0432 \u043a\u0430\u043b\u0435\u043d\u0434\u0430\u0440\u0435.",
    loadingEvents: "\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u0437\u0430\u043f\u0438\u0441\u0435\u0439...",
    visibleEvents: "\u0432\u0438\u0434\u0438\u043c\u044b\u0445 \u0437\u0430\u043f\u0438\u0441\u0435\u0439",
    calendarEvents: "\u043a\u0430\u043b\u0435\u043d\u0434\u0430\u0440\u043d\u044b\u0435 \u0437\u0430\u043f\u0438\u0441\u0438",
    timeBlocks: "\u0431\u043b\u043e\u043a\u0438 \u0432\u0440\u0435\u043c\u0435\u043d\u0438",
    source: "\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a",
    kind: "\u0422\u0438\u043f",
    layer: "\u0421\u043b\u043e\u0439",
    day: "\u0414\u0435\u043d\u044c",
    week: "\u041d\u0435\u0434\u0435\u043b\u044f",
    month: "\u041c\u0435\u0441\u044f\u0446",
    time: "\u0412\u0440\u0435\u043c\u044f",
  },
  uk: {
    title: "\u041a\u0430\u043b\u0435\u043d\u0434\u0430\u0440",
    subtitle: "\u041f\u043b\u0430\u043d\u0443\u0432\u0430\u043d\u043d\u044f \u0447\u0430\u0441\u0443 \u0437 AI-\u0430\u043d\u0430\u043b\u0456\u0437\u043e\u043c \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0435\u0439, \u043a\u0430\u043b\u0435\u043d\u0434\u0430\u0440\u043d\u0438\u043c\u0438 \u0437\u0430\u043f\u0438\u0441\u0430\u043c\u0438 \u0442\u0430 \u043a\u043e\u043d\u0442\u0435\u043a\u0441\u0442\u043e\u043c \u0441\u043f\u043e\u0441\u0442\u0435\u0440\u0435\u0436\u0435\u043d\u044c.",
    add: "+ \u0414\u043e\u0434\u0430\u0442\u0438",
    selectedDay: "\u0412\u0438\u0431\u0440\u0430\u043d\u0438\u0439 \u0434\u0435\u043d\u044c",
    selectedWeek: "\u0412\u0438\u0431\u0440\u0430\u043d\u0438\u0439 \u0442\u0438\u0436\u0434\u0435\u043d\u044c",
    selectedMonth: "\u0412\u0438\u0431\u0440\u0430\u043d\u0438\u0439 \u043c\u0456\u0441\u044f\u0446\u044c",
    today: "\u0421\u044c\u043e\u0433\u043e\u0434\u043d\u0456",
    selectedEvent: "\u0417\u0430\u043f\u0438\u0441",
    clickEvent: "\u041d\u0430\u0442\u0438\u0441\u043d\u0456\u0442\u044c \u043d\u0430 \u0437\u0430\u043f\u0438\u0441 \u0443 \u043a\u0430\u043b\u0435\u043d\u0434\u0430\u0440\u0456.",
    loadingEvents: "\u0417\u0430\u0432\u0430\u043d\u0442\u0430\u0436\u0435\u043d\u043d\u044f \u0437\u0430\u043f\u0438\u0441\u0456\u0432...",
    visibleEvents: "\u0432\u0438\u0434\u0438\u043c\u0438\u0445 \u0437\u0430\u043f\u0438\u0441\u0456\u0432",
    calendarEvents: "\u043a\u0430\u043b\u0435\u043d\u0434\u0430\u0440\u043d\u0456 \u0437\u0430\u043f\u0438\u0441\u0438",
    timeBlocks: "\u0431\u043b\u043e\u043a\u0438 \u0447\u0430\u0441\u0443",
    source: "\u0414\u0436\u0435\u0440\u0435\u043b\u043e",
    kind: "\u0422\u0438\u043f",
    layer: "\u0428\u0430\u0440",
    day: "\u0414\u0435\u043d\u044c",
    week: "\u0422\u0438\u0436\u0434\u0435\u043d\u044c",
    month: "\u041c\u0456\u0441\u044f\u0446\u044c",
    time: "\u0427\u0430\u0441",
  },
  de: {
    title: "Kalender",
    subtitle: "Zeitplanung mit KI-Aktivitaetsanalyse, Kalendereintraegen und Beobachtungskontext.",
    add: "+ Hinzufuegen",
    selectedDay: "Ausgewaehlter Tag",
    selectedWeek: "Ausgewaehlte Woche",
    selectedMonth: "Ausgewaehlter Monat",
    today: "Heute",
    selectedEvent: "Eintrag",
    clickEvent: "Klicke auf einen Eintrag im Kalender.",
    loadingEvents: "Eintraege werden geladen...",
    visibleEvents: "sichtbare Eintraege",
    calendarEvents: "Kalendereintraege",
    timeBlocks: "Zeitbloecke",
    source: "Quelle",
    kind: "Typ",
    layer: "Ebene",
    day: "Tag",
    week: "Woche",
    month: "Monat",
    time: "Zeit",
  },
  es: {
    title: "Calendario",
    subtitle: "Planificacion del tiempo con analisis de actividad por IA, registros de calendario y contexto de observacion.",
    add: "+ Anadir",
    selectedDay: "Dia seleccionado",
    selectedWeek: "Semana seleccionada",
    selectedMonth: "Mes seleccionado",
    today: "Hoy",
    selectedEvent: "Evento",
    clickEvent: "Haz clic en un evento del calendario.",
    loadingEvents: "Cargando eventos...",
    visibleEvents: "eventos visibles",
    calendarEvents: "eventos del calendario",
    timeBlocks: "bloques de tiempo",
    source: "Fuente",
    kind: "Tipo",
    layer: "Capa",
    day: "Dia",
    week: "Semana",
    month: "Mes",
    time: "Hora",
  },
  cs: {
    title: "Kalendar",
    subtitle: "Planovani casu s AI analyzou aktivit, zaznamy v kalendari a kontextem pozorovani.",
    add: "+ Pridat",
    selectedDay: "Vybrany den",
    selectedWeek: "Vybrany tyden",
    selectedMonth: "Vybrany mesic",
    today: "Dnes",
    selectedEvent: "Udalost",
    clickEvent: "Kliknete na udalost v kalendari.",
    loadingEvents: "Nacitani udalosti...",
    visibleEvents: "viditelne udalosti",
    calendarEvents: "udalosti kalendare",
    timeBlocks: "casove bloky",
    source: "Zdroj",
    kind: "Typ",
    layer: "Vrstva",
    day: "Den",
    week: "Tyden",
    month: "Mesic",
    time: "Cas",
  },
};

const DETAIL_UI: Record<UiLocale, {
  time: string;
  description: string;
  status: string;
  privacy: string;
  privateLabel: string;
  publicLabel: string;
  noDescription: string;
}> = {
  en: {
    time: "Time",
    description: "Description",
    status: "Status",
    privacy: "Privacy",
    privateLabel: "Private",
    publicLabel: "Public",
    noDescription: "No description",
  },
  pl: {
    time: "Czas",
    description: "Opis",
    status: "Status",
    privacy: "Prywatnosc",
    privateLabel: "Prywatne",
    publicLabel: "Publiczne",
    noDescription: "Brak opisu",
  },
  ru: {
    time: "\u0412\u0440\u0435\u043c\u044f",
    description: "\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435",
    status: "\u0421\u0442\u0430\u0442\u0443\u0441",
    privacy: "\u041f\u0440\u0438\u0432\u0430\u0442\u043d\u043e\u0441\u0442\u044c",
    privateLabel: "\u041f\u0440\u0438\u0432\u0430\u0442\u043d\u043e",
    publicLabel: "\u041f\u0443\u0431\u043b\u0438\u0447\u043d\u043e",
    noDescription: "\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u043d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u043e",
  },
  uk: {
    time: "\u0427\u0430\u0441",
    description: "\u041e\u043f\u0438\u0441",
    status: "\u0421\u0442\u0430\u0442\u0443\u0441",
    privacy: "\u041f\u0440\u0438\u0432\u0430\u0442\u043d\u0456\u0441\u0442\u044c",
    privateLabel: "\u041f\u0440\u0438\u0432\u0430\u0442\u043d\u043e",
    publicLabel: "\u041f\u0443\u0431\u043b\u0456\u0447\u043d\u043e",
    noDescription: "\u041e\u043f\u0438\u0441 \u043d\u0435 \u0432\u043a\u0430\u0437\u0430\u043d\u043e",
  },
  de: {
    time: "Zeit",
    description: "Beschreibung",
    status: "Status",
    privacy: "Privatsphaere",
    privateLabel: "Privat",
    publicLabel: "Oeffentlich",
    noDescription: "Keine Beschreibung",
  },
  es: {
    time: "Hora",
    description: "Descripcion",
    status: "Estado",
    privacy: "Privacidad",
    privateLabel: "Privado",
    publicLabel: "Publico",
    noDescription: "Sin descripcion",
  },
  cs: {
    time: "Cas",
    description: "Popis",
    status: "Status",
    privacy: "Soukromi",
    privateLabel: "Soukrome",
    publicLabel: "Verejne",
    noDescription: "Bez popisu",
  },
};

const hourStart = 6;
const hourEnd = 23;
const hourHeight = 64;
const timeGutterWidth = 76;
const minEventHeight = 32;

const hours = Array.from({ length: hourEnd - hourStart }, (_, index) => hourStart + index);

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function normalizeLocale(value: string | null): UiLocale {
  const normalized = (value ?? "en").toLowerCase().split("-")[0];

  if (
    normalized === "pl" ||
    normalized === "ru" ||
    normalized === "uk" ||
    normalized === "de" ||
    normalized === "es" ||
    normalized === "cs"
  ) {
    return normalized;
  }

  return "en";
}

function intlLocale(locale: UiLocale) {
  if (locale === "uk") return "uk-UA";
  if (locale === "ru") return "ru-RU";

  return locale;
}

function formatDateTitle(value: Date, locale: UiLocale) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(value);
}

function formatMonthTitle(value: Date, locale: UiLocale) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    month: "long",
    year: "numeric",
  }).format(value);
}

function formatShortDay(value: Date, locale: UiLocale) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: "short",
  }).format(value);
}

function getEventsForDate(events: CalendarEvent[], value: Date) {
  const key = dateKey(value);

  return events.filter((event) => eventDateKey(event) === key);
}

function getEventDisplayTitle(event: CalendarEvent) {
  const record = event as CalendarEvent & Record<string, unknown>;
  const candidates = [
    event.title,
    record.description,
    record.summary,
    record.name,
    record.rawText,
    record.raw_text,
    record.normalizedTitle,
    record.normalized_title,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return "";
}

function formatEventStartTime(event: CalendarEvent) {
  const start = eventStartDate(event);

  return `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
}

function buildEventLabel(event: CalendarEvent) {
  const title = getEventDisplayTitle(event);
  const timeRange = formatTimeRange(event);

  return title ? `${timeRange}, ${title}` : timeRange;
}

function buildCompactEventLabel(event: CalendarEvent) {
  const title = getEventDisplayTitle(event);
  const startTime = formatEventStartTime(event);

  return title ? `${startTime}, ${title}` : startTime;
}

function EventLabel({ event }: { event: CalendarEvent }) {
  return <span className="block max-w-full truncate">{buildCompactEventLabel(event)}</span>;
}

function formatEventDateTimeRange(event: CalendarEvent, locale: UiLocale) {
  const start = eventStartDate(event);
  const end = new Date(event.endAt);

  const formatter = new Intl.DateTimeFormat(intlLocale(locale), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function getEventDescription(event: CalendarEvent) {
  const record = event as CalendarEvent & Record<string, unknown>;

  return typeof record.description === "string" && record.description.trim().length > 0
    ? record.description.trim()
    : "";
}

function getTimelineHeight() {
  return (hourEnd - hourStart) * hourHeight;
}

function getEventTop(event: CalendarEvent) {
  const start = eventStartDate(event);
  const minutesFromStart = (start.getHours() - hourStart) * 60 + start.getMinutes();

  return Math.max(0, (minutesFromStart / 60) * hourHeight);
}

function getEventHeight(event: CalendarEvent, top: number) {
  const rawHeight = Math.max(minEventHeight, (eventDurationMinutes(event) / 60) * hourHeight);
  const maxHeight = Math.max(minEventHeight, getTimelineHeight() - top);

  return Math.min(rawHeight, maxHeight);
}

function positionEvents(events: CalendarEvent[]) {
  return events.map((event): PositionedEvent => {
    const top = getEventTop(event);
    const height = getEventHeight(event, top);

    return { event, top, height };
  });
}

function getLayerAccentClass(event: CalendarEvent) {
  if (event.layer === "work") {
    return "border-emerald-300 bg-emerald-50";
  }

  if (event.layer === "business") {
    return "border-orange-300 bg-orange-50";
  }

  if (event.layer === "health") {
    return "border-rose-300 bg-rose-50";
  }

  if (event.kind === "candidate") {
    return "border-amber-300 bg-amber-50";
  }

  return "border-[#4169f5]/30 bg-[#eef2ff]";
}

export default function CalendarRebuildClient({
  initialFocusDateKey,
  initialLocale,
}: CalendarRebuildClientProps) {
  const locale = normalizeLocale(initialLocale);
  const ui = UI[locale];
  const detailUi = DETAIL_UI[locale];

  const [view, setView] = useState<CalendarViewMode>("week");
  const [focusDate, setFocusDate] = useState(() => parseDateKey(initialFocusDateKey));
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [sourceCounts, setSourceCounts] = useState({ calendarEvents: 0, timeBlocks: 0 });

  const addFlowHref = {
    pathname: "/calendar/add",
    query: {
      locale,
      returnTo: "calendar-rebuild",
      focusDate: dateKey(focusDate),
    },
  };

  const range = useMemo(() => getRangeForView(view, focusDate), [view, focusDate]);
  const rangeStart = range.start.toISOString();
  const rangeEnd = range.end.toISOString();

  useEffect(() => {
    const abortController = new AbortController();

    async function loadEvents() {
      setIsLoadingEvents(true);
      setEventsError(null);

      const params = new URLSearchParams({
        start: rangeStart,
        end: rangeEnd,
      });

      try {
        const response = await fetch(`/api/calendar-rebuild/events?${params.toString()}`, {
          signal: abortController.signal,
        });

        const payload = (await response.json()) as CalendarEventsResponse;

        if (!response.ok || !payload.ok) {
          throw new Error(payload.error ?? `Calendar events request failed: ${response.status}`);
        }

        setEvents(payload.events ?? []);
        setSourceCounts({
          calendarEvents: payload.sources?.calendarEvents ?? 0,
          timeBlocks: payload.sources?.timeBlocks ?? 0,
        });
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        setEvents([]);
        setSourceCounts({ calendarEvents: 0, timeBlocks: 0 });
        setEventsError(error instanceof Error ? error.message : "Unknown calendar events error");
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoadingEvents(false);
        }
      }
    }

    void loadEvents();

    return () => abortController.abort();
  }, [rangeEnd, rangeStart]);

  const visibleEvents = useMemo(
    () => events.filter((event) => eventIntersectsRange(event, range)),
    [events, range],
  );

  const selectedEvent = useMemo(
    () => visibleEvents.find((event) => event.id === selectedEventId) ?? null,
    [selectedEventId, visibleEvents],
  );

  const weekDates = useMemo(() => getWeekDates(focusDate), [focusDate]);
  const monthDates = useMemo(() => getMonthGridDates(focusDate), [focusDate]);

  const updateFocusDate = (nextDate: Date) => {
    setFocusDate(nextDate);
    setSelectedEventId(null);

    const params = new URLSearchParams(window.location.search);
    params.set("focusDate", dateKey(nextDate));
    params.set("locale", locale);

    window.history.replaceState(null, "", `/calendar-rebuild?${params.toString()}`);
  };

  const shiftDate = (amount: number) => {
    if (view === "month") {
      updateFocusDate(addMonths(focusDate, amount));
      return;
    }

    if (view === "week") {
      updateFocusDate(addDays(focusDate, amount * 7));
      return;
    }

    updateFocusDate(addDays(focusDate, amount));
  };

  const dayTimelineEvents = useMemo(
    () => positionEvents(getEventsForDate(visibleEvents, focusDate)),
    [focusDate, visibleEvents],
  );

  const weekTimelineEventsByDay = useMemo(() => {
    const grouped = new Map<string, PositionedEvent[]>();

    for (const day of weekDates) {
      grouped.set(dateKey(day), positionEvents(getEventsForDate(visibleEvents, day)));
    }

    return grouped;
  }, [visibleEvents, weekDates]);

  const periodLabel =
    view === "day" ? ui.selectedDay : view === "week" ? ui.selectedWeek : ui.selectedMonth;
  const periodTitle =
    view === "day"
      ? formatDateTitle(focusDate, locale)
      : view === "week"
        ? `${dateKey(weekDates[0])} - ${dateKey(weekDates[6])}`
        : formatMonthTitle(focusDate, locale);
  const gridTitle = view === "day" ? ui.day : view === "week" ? ui.week : ui.month;

  return (
    <main className="min-h-screen bg-[#f3f5fb] px-3 py-5 text-[#111827]">
      <div className="mx-auto max-w-[1520px] space-y-4">
        <section className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">{ui.title}</h1>
              <p className="mt-1 max-w-3xl text-sm text-[#667085]">
                {ui.subtitle}
              </p>
            </div>

            <Link
              href={addFlowHref}
              className="rounded-xl bg-[#4169f5] px-4 py-2 text-sm font-bold text-white shadow"
            >
              {ui.add}
            </Link>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_340px]">
          <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#9ca3af]">
                  {periodLabel}
                </div>
                <h2 className="mt-1 text-xl font-bold capitalize">
                  {periodTitle}
                </h2>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-lg border px-3 py-1.5 text-sm font-bold"
                    onClick={() => shiftDate(-1)}
                  >
                    {"<"}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-[#4169f5]/30 bg-[#eef2ff] px-3 py-1.5 text-sm font-bold text-[#4169f5]"
                    onClick={() => updateFocusDate(new Date())}
                  >
                    {ui.today}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border px-3 py-1.5 text-sm font-bold"
                    onClick={() => shiftDate(1)}
                  >
                    {">"}
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                {(["day", "week", "month"] as CalendarViewMode[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setView(item)}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-sm font-bold",
                      view === item
                        ? "border-[#4169f5] bg-[#4169f5] text-white"
                        : "border-[#e5e7eb] bg-white text-[#667085]",
                    )}
                  >
                    {item === "day" ? ui.day : item === "week" ? ui.week : ui.month}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <aside className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#9ca3af]">
              {ui.selectedEvent}
            </div>
            {selectedEvent ? (
              <div className="mt-3 space-y-3">
                <div>
                  <div className="text-base font-bold">
                    {getEventDisplayTitle(selectedEvent) || selectedEvent.title}
                  </div>
                  <div className="mt-1 text-sm font-medium text-[#667085]">
                    {formatEventDateTimeRange(selectedEvent, locale)}
                  </div>
                </div>

                <div className="rounded-xl border border-[#e5e7eb] bg-[#f8faff] p-3 text-xs text-[#667085]">
                  <div className="font-bold text-[#111827]">{detailUi.time}</div>
                  <div className="mt-1">{formatTimeRange(selectedEvent)}</div>
                </div>

                <div className="rounded-xl border border-[#e5e7eb] bg-white p-3 text-xs text-[#667085]">
                  <div className="font-bold text-[#111827]">{detailUi.description}</div>
                  <div className="mt-2 whitespace-pre-wrap leading-relaxed">
                    {getEventDescription(selectedEvent) || detailUi.noDescription}
                  </div>
                </div>

                <div className="rounded-xl border border-[#e5e7eb] bg-[#fbfcff] p-3 text-xs text-[#667085]">
                  {detailUi.status}: {selectedEvent.status}<br />
                  {ui.source}: {selectedEvent.source}<br />
                  {ui.kind}: {selectedEvent.kind}<br />
                  {ui.layer}: {selectedEvent.layer}<br />
                  {detailUi.privacy}: {selectedEvent.isPrivate ? detailUi.privateLabel : detailUi.publicLabel}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-[#667085]">
                {ui.clickEvent}
              </p>
            )}

            <div className="mt-4 rounded-xl border border-[#e5e7eb] bg-[#fbfcff] p-3 text-xs text-[#667085]">
              {isLoadingEvents ? ui.loadingEvents : `${visibleEvents.length} ${ui.visibleEvents}`}
              <br />
              {ui.calendarEvents}: {sourceCounts.calendarEvents}
              <br />
              {ui.timeBlocks}: {sourceCounts.timeBlocks}
              {eventsError ? (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-red-700">
                  {eventsError}
                </div>
              ) : null}
            </div>
          </aside>
        </section>

        <section className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#4169f5]">
              {gridTitle}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-lg border px-3 py-1.5 text-sm font-bold"
                onClick={() => shiftDate(-1)}
              >
                {"<"}
              </button>
              <div className="min-w-[180px] text-center text-sm font-bold capitalize">
                {periodTitle}
              </div>
              <button
                type="button"
                className="rounded-lg border px-3 py-1.5 text-sm font-bold"
                onClick={() => shiftDate(1)}
              >
                {">"}
              </button>
            </div>
          </div>

          {view === "day" ? (
            <div className="relative overflow-hidden rounded-xl border border-[#e5e7eb]">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="grid grid-cols-[76px_1fr] border-b border-[#eef1f7] last:border-b-0"
                  style={{ height: `${hourHeight}px` }}
                >
                  <div className="border-r border-[#eef1f7] bg-[#fbfcff] px-3 py-2 text-xs font-bold text-[#98a2b3]">
                    {String(hour).padStart(2, "0")}:00
                  </div>
                  <div className="px-3 py-2">
                    <div className="h-full rounded-lg border border-dashed border-[#d8deef] bg-white" />
                  </div>
                </div>
              ))}

              {dayTimelineEvents.map(({ event, top, height }) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => setSelectedEventId(event.id)}
                  className={cn(
                    "absolute z-10 overflow-hidden rounded-lg px-3 py-2 text-left text-xs font-bold text-[#111827] shadow-sm",
                    getLayerAccentClass(event),
                    selectedEventId === event.id && "ring-2 ring-[#4169f5] ring-offset-1",
                  )}
                  style={{
                    top: `${top}px`,
                    height: `${height}px`,
                    left: `${timeGutterWidth + 12}px`,
                    right: "12px",
                  }}
                >
                  <EventLabel event={event} />
                </button>
              ))}
            </div>
          ) : null}

          {view === "week" ? (
            <div className="overflow-x-auto rounded-xl border border-[#e5e7eb]">
              <div className="min-w-[1080px]">
                <div className="grid border-b border-[#eef1f7]" style={{ gridTemplateColumns: `${timeGutterWidth}px repeat(7, minmax(132px, 1fr))` }}>
                  <div className="border-r border-[#eef1f7] bg-[#fbfcff] p-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[#98a2b3]">
                    {ui.time}
                  </div>
                  {weekDates.map((day) => (
                    <button
                      key={dateKey(day)}
                      type="button"
                      onClick={() => updateFocusDate(day)}
                      className={cn(
                        "border-r border-[#eef1f7] p-3 text-left last:border-r-0 hover:bg-[#f8faff]",
                        isSameDate(day, focusDate) && "bg-[#eef2ff]",
                      )}
                    >
                      <div className="text-xs font-bold uppercase text-[#98a2b3]">{formatShortDay(day, locale)}</div>
                      <div className="mt-1 text-xl font-bold">{day.getDate()}</div>
                    </button>
                  ))}
                </div>

                <div className="relative" style={{ height: `${getTimelineHeight()}px` }}>
                  <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `${timeGutterWidth}px repeat(7, minmax(132px, 1fr))` }}>
                    <div className="border-r border-[#eef1f7] bg-[#fbfcff]">
                      {hours.map((hour) => (
                        <div
                          key={hour}
                          className="border-b border-[#eef1f7] px-3 py-2 text-xs font-bold text-[#98a2b3]"
                          style={{ height: `${hourHeight}px` }}
                        >
                          {String(hour).padStart(2, "0")}:00
                        </div>
                      ))}
                    </div>

                    {weekDates.map((day) => (
                      <div
                        key={dateKey(day)}
                        className={cn(
                          "relative border-r border-[#eef1f7] last:border-r-0",
                          isSameDate(day, focusDate) && "bg-[#f1f4ff]",
                        )}
                      >
                        {hours.map((hour) => (
                          <div
                            key={hour}
                            className="border-b border-[#eef1f7]"
                            style={{ height: `${hourHeight}px` }}
                          />
                        ))}

                        {(weekTimelineEventsByDay.get(dateKey(day)) ?? []).map(({ event, top, height }) => (
                          <button
                            key={event.id}
                            type="button"
                            onClick={(clickEvent) => {
                              clickEvent.stopPropagation();
                              setSelectedEventId(event.id);
                              setFocusDate(day);
                            }}
                            className={cn(
                              "absolute left-1 right-1 z-10 overflow-hidden rounded-lg px-2 py-1 text-left text-[11px] font-bold leading-tight text-[#111827] shadow-sm",
                              getLayerAccentClass(event),
                    selectedEventId === event.id && "ring-2 ring-[#4169f5] ring-offset-1",
                            )}
                            style={{
                              top: `${top}px`,
                              height: `${height}px`,
                            }}
                            title={buildEventLabel(event)}
                          >
                            <EventLabel event={event} />
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {view === "month" ? (
            <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-[#e5e7eb]">
              {monthDates.map((day) => {
                const dayEvents = getEventsForDate(visibleEvents, day);

                return (
                  <button
                    key={dateKey(day)}
                    type="button"
                    onClick={() => updateFocusDate(day)}
                    className={cn(
                      "min-h-[120px] border-b border-r border-[#eef1f7] p-2 text-left hover:bg-[#f8faff]",
                      !isSameMonth(day, focusDate) && "bg-[#fbfcff] text-[#b0b4c8]",
                      isSameDate(day, focusDate) && "bg-[#eef2ff]",
                    )}
                  >
                    <div className="text-xs font-bold">{day.getDate()}</div>
                    <div className="mt-2 space-y-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          title={buildEventLabel(event)}
                          className={cn(
                            "truncate rounded-md border px-2 py-1 text-[11px] font-bold text-[#111827]",
                            getLayerAccentClass(event),
                    selectedEventId === event.id && "ring-2 ring-[#4169f5] ring-offset-1",
                          )}
                        >
                          <EventLabel event={event} />
                        </div>
                      ))}
                      {dayEvents.length > 3 ? (
                        <div className="text-[10px] font-bold text-[#4169f5]">
                          +{dayEvents.length - 3}
                        </div>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
