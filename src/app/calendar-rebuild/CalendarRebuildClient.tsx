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
  routeBasePath?: "/calendar" | "/calendar-rebuild";
  returnToTarget?: "calendar" | "calendar-rebuild";
};

type UiLocale = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

type CalendarEventsResponse = {
  ok?: boolean;
  events?: CalendarEvent[];
  event?: CalendarEvent;
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

function arctorAddMonthsSafe(date: Date, delta: number) {
  const next = new Date(date);
  const day = next.getDate();

  next.setDate(1);
  next.setMonth(next.getMonth() + delta);

  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDay));

  return next;
}

function arctorShiftFocusDate(date: Date, viewMode: string, direction: -1 | 1) {
  const next = new Date(date);

  if (viewMode === "month") {
    return arctorAddMonthsSafe(next, direction);
  }

  next.setDate(next.getDate() + (viewMode === "week" ? direction * 7 : direction));

  return next;
}

function arctorFormatIsoDay(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function arctorFormatPeriodLabel(viewMode: string, focusDate: Date, locale: UiLocale) {
  if (viewMode === "week") {
    const week = getWeekDates(focusDate);

    return `${arctorFormatIsoDay(week[0])} - ${arctorFormatIsoDay(week[6])}`;
  }

  if (viewMode === "month") {
    return new Intl.DateTimeFormat(intlLocale(locale), {
      month: "long",
      year: "numeric",
    }).format(focusDate);
  }

  return new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(focusDate);
}

function arctorPeriodKicker(viewMode: string, ui: { day: string; week: string; month: string }) {
  if (viewMode === "month") {
    return ui.month;
  }

  if (viewMode === "week") {
    return ui.week;
  }

  return ui.day;
}

const CALENDAR_FILTERS_UI: Record<UiLocale, string[]> = {
  en: ["All areas", "Efficiency", "Progress", "Habits", "Finance", "+ More filters"],
  pl: ["Wszystkie obszary", "Efektywnosc", "Postep", "Nawyki", "Finanse", "+ Wiecej filtrow"],
  ru: ["\u0412\u0441\u0435 \u043e\u0431\u043b\u0430\u0441\u0442\u0438", "\u042d\u0444\u0444\u0435\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "\u041f\u0440\u043e\u0433\u0440\u0435\u0441\u0441", "\u041f\u0440\u0438\u0432\u044b\u0447\u043a\u0438", "\u0424\u0438\u043d\u0430\u043d\u0441\u044b", "+ \u0415\u0449\u0451 \u0444\u0438\u043b\u044c\u0442\u0440\u044b"],
  uk: ["\u0423\u0441\u0456 \u043e\u0431\u043b\u0430\u0441\u0442\u0456", "\u0415\u0444\u0435\u043a\u0442\u0438\u0432\u043d\u0456\u0441\u0442\u044c", "\u041f\u0440\u043e\u0433\u0440\u0435\u0441", "\u0417\u0432\u0438\u0447\u043a\u0438", "\u0424\u0456\u043d\u0430\u043d\u0441\u0438", "+ \u0411\u0456\u043b\u044c\u0448\u0435 \u0444\u0456\u043b\u044c\u0442\u0440\u0456\u0432"],
  de: ["Alle Bereiche", "Effizienz", "Fortschritt", "Gewohnheiten", "Finanzen", "+ Mehr Filter"],
  es: ["Todas las areas", "Eficiencia", "Progreso", "Habitos", "Finanzas", "+ Mas filtros"],
  cs: ["Vsechny oblasti", "Efektivita", "Pokrok", "Navyky", "Finance", "+ Vice filtru"],
};

const CALENDAR_STATS_UI: Record<UiLocale, {
  visibleEvents: string;
  calendarEvents: string;
  timeBlocks: string;
  visibleSub: string;
  calendarSub: string;
  blocksSub: string;
}> = {
  en: {
    visibleEvents: "Visible events",
    calendarEvents: "Calendar records",
    timeBlocks: "Time blocks",
    visibleSub: "in selected period",
    calendarSub: "from calendar_events",
    blocksSub: "from time_blocks",
  },
  pl: {
    visibleEvents: "Widoczne zapisy",
    calendarEvents: "Zapisy kalendarza",
    timeBlocks: "Bloki czasu",
    visibleSub: "w wybranym okresie",
    calendarSub: "z calendar_events",
    blocksSub: "z time_blocks",
  },
  ru: {
    visibleEvents: "\u0412\u0438\u0434\u0438\u043c\u044b\u0435 \u0437\u0430\u043f\u0438\u0441\u0438",
    calendarEvents: "\u0417\u0430\u043f\u0438\u0441\u0438 \u043a\u0430\u043b\u0435\u043d\u0434\u0430\u0440\u044f",
    timeBlocks: "\u0411\u043b\u043e\u043a\u0438 \u0432\u0440\u0435\u043c\u0435\u043d\u0438",
    visibleSub: "\u0432 \u0432\u044b\u0431\u0440\u0430\u043d\u043d\u043e\u043c \u043f\u0435\u0440\u0438\u043e\u0434\u0435",
    calendarSub: "\u0438\u0437 calendar_events",
    blocksSub: "\u0438\u0437 time_blocks",
  },
  uk: {
    visibleEvents: "\u0412\u0438\u0434\u0438\u043c\u0456 \u0437\u0430\u043f\u0438\u0441\u0438",
    calendarEvents: "\u0417\u0430\u043f\u0438\u0441\u0438 \u043a\u0430\u043b\u0435\u043d\u0434\u0430\u0440\u044f",
    timeBlocks: "\u0411\u043b\u043e\u043a\u0438 \u0447\u0430\u0441\u0443",
    visibleSub: "\u0443 \u0432\u0438\u0431\u0440\u0430\u043d\u043e\u043c\u0443 \u043f\u0435\u0440\u0456\u043e\u0434\u0456",
    calendarSub: "\u0437 calendar_events",
    blocksSub: "\u0437 time_blocks",
  },
  de: {
    visibleEvents: "Sichtbare Eintraege",
    calendarEvents: "Kalendereintraege",
    timeBlocks: "Zeitbloecke",
    visibleSub: "im gewaehlten Zeitraum",
    calendarSub: "aus calendar_events",
    blocksSub: "aus time_blocks",
  },
  es: {
    visibleEvents: "Eventos visibles",
    calendarEvents: "Registros de calendario",
    timeBlocks: "Bloques de tiempo",
    visibleSub: "en el periodo seleccionado",
    calendarSub: "de calendar_events",
    blocksSub: "de time_blocks",
  },
  cs: {
    visibleEvents: "Viditelne zaznamy",
    calendarEvents: "Zaznamy kalendare",
    timeBlocks: "Casove bloky",
    visibleSub: "ve vybranem obdobi",
    calendarSub: "z calendar_events",
    blocksSub: "z time_blocks",
  },
};

const ANALYTICS_PLACEHOLDER_UI: Record<UiLocale, {
  title: string;
  heading: string;
  subtitle: string;
  visibleEvents: string;
  timeBlocks: string;
  futureMetric: string;
}> = {
  en: {
    title: "Analytics",
    heading: "Future analytics block",
    subtitle: "A time, workload and activity-context diagram will appear here later.",
    visibleEvents: "visible events",
    timeBlocks: "time blocks",
    futureMetric: "time balance",
  },
  pl: {
    title: "Analityka",
    heading: "Przyszly blok analityczny",
    subtitle: "Pozniej pojawi sie tutaj diagram czasu, obciazenia i kontekstu aktywnosci.",
    visibleEvents: "widoczne zapisy",
    timeBlocks: "bloki czasu",
    futureMetric: "bilans czasu",
  },
  ru: {
    title: "\u0410\u043d\u0430\u043b\u0438\u0442\u0438\u043a\u0430",
    heading: "\u0411\u0443\u0434\u0443\u0449\u0438\u0439 \u0430\u043d\u0430\u043b\u0438\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0439 \u0431\u043b\u043e\u043a",
    subtitle: "\u0417\u0434\u0435\u0441\u044c \u043f\u043e\u0437\u0436\u0435 \u043f\u043e\u044f\u0432\u0438\u0442\u0441\u044f \u0434\u0438\u0430\u0433\u0440\u0430\u043c\u043c\u0430 \u0432\u0440\u0435\u043c\u0435\u043d\u0438, \u043d\u0430\u0433\u0440\u0443\u0437\u043a\u0438 \u0438 \u0441\u0432\u044f\u0437\u0435\u0439 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0438.",
    visibleEvents: "\u0432\u0438\u0434\u0438\u043c\u044b\u0435 \u0437\u0430\u043f\u0438\u0441\u0438",
    timeBlocks: "\u0431\u043b\u043e\u043a\u0438 \u0432\u0440\u0435\u043c\u0435\u043d\u0438",
    futureMetric: "\u0431\u0430\u043b\u0430\u043d\u0441 \u0432\u0440\u0435\u043c\u0435\u043d\u0438",
  },
  uk: {
    title: "\u0410\u043d\u0430\u043b\u0456\u0442\u0438\u043a\u0430",
    heading: "\u041c\u0430\u0439\u0431\u0443\u0442\u043d\u0456\u0439 \u0430\u043d\u0430\u043b\u0456\u0442\u0438\u0447\u043d\u0438\u0439 \u0431\u043b\u043e\u043a",
    subtitle: "\u0422\u0443\u0442 \u043f\u0456\u0437\u043d\u0456\u0448\u0435 \u0437\u0027\u044f\u0432\u0438\u0442\u044c\u0441\u044f \u0434\u0456\u0430\u0433\u0440\u0430\u043c\u0430 \u0447\u0430\u0441\u0443, \u043d\u0430\u0432\u0430\u043d\u0442\u0430\u0436\u0435\u043d\u043d\u044f \u0456 \u0437\u0432\u0027\u044f\u0437\u043a\u0456\u0432 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0456.",
    visibleEvents: "\u0432\u0438\u0434\u0438\u043c\u0456 \u0437\u0430\u043f\u0438\u0441\u0438",
    timeBlocks: "\u0431\u043b\u043e\u043a\u0438 \u0447\u0430\u0441\u0443",
    futureMetric: "\u0431\u0430\u043b\u0430\u043d\u0441 \u0447\u0430\u0441\u0443",
  },
  de: {
    title: "Analyse",
    heading: "Zukuenftiger Analyseblock",
    subtitle: "Hier erscheint spaeter ein Diagramm zu Zeit, Belastung und Aktivitaetskontext.",
    visibleEvents: "sichtbare Eintraege",
    timeBlocks: "Zeitbloecke",
    futureMetric: "Zeitbilanz",
  },
  es: {
    title: "Analitica",
    heading: "Bloque analitico futuro",
    subtitle: "Mas adelante aparecera aqui un diagrama de tiempo, carga y contexto de actividad.",
    visibleEvents: "eventos visibles",
    timeBlocks: "bloques de tiempo",
    futureMetric: "balance de tiempo",
  },
  cs: {
    title: "Analytika",
    heading: "Budouci analyticky blok",
    subtitle: "Pozdeji se zde objevi diagram casu, zateze a kontextu aktivit.",
    visibleEvents: "viditelne zaznamy",
    timeBlocks: "casove bloky",
    futureMetric: "casova bilance",
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

/* Step 8B event management datetime helpers */
function isEditableCalendarEvent(event: CalendarEvent) {
  return event.id.startsWith("calendar:");
}

function toDatetimeLocalValue(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

  return localDate.toISOString().slice(0, 16);
}

function fromDatetimeLocalValue(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
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

  return "border-[#3b6ef8]/30 bg-[#eef2ff]";
}

export default function CalendarRebuildClient({
  initialFocusDateKey,
  initialLocale,
  routeBasePath = "/calendar-rebuild",
  returnToTarget = "calendar-rebuild",
}: CalendarRebuildClientProps) {
  const locale = normalizeLocale(initialLocale);
  const ui = UI[locale];
  const detailUi = DETAIL_UI[locale];
  const analyticsUi = ANALYTICS_PLACEHOLDER_UI[locale];
  const statsUi = CALENDAR_STATS_UI[locale];
  const filterLabels = CALENDAR_FILTERS_UI[locale];

  const [view, setView] = useState<CalendarViewMode>("week");
  const [calendarPresentation, setCalendarPresentation] = useState<"grid" | "list">("grid");
  const [focusDate, setFocusDate] = useState(() => parseDateKey(initialFocusDateKey));

  useEffect(() => {
    setCalendarPresentation("grid");
  }, [view]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [eventActionError, setEventActionError] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStartAt, setEditStartAt] = useState("");
  const [editEndAt, setEditEndAt] = useState("");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [sourceCounts, setSourceCounts] = useState({ calendarEvents: 0, timeBlocks: 0 });

  const addFlowHref = {
    pathname: "/calendar/add",
    query: {
      locale,
      returnTo: returnToTarget,
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

  /* Step 8B event edit form state sync */
  useEffect(() => {
    if (!selectedEvent) {
      setIsEditingEvent(false);
      setEventActionError(null);
      return;
    }

    setIsEditingEvent(false);
    setEventActionError(null);
    setEditTitle(getEventDisplayTitle(selectedEvent) || selectedEvent.title);
    setEditDescription(getEventDescription(selectedEvent));
    setEditStartAt(toDatetimeLocalValue(selectedEvent.startAt));
    setEditEndAt(toDatetimeLocalValue(selectedEvent.endAt));
  }, [selectedEvent?.id]);

  useEffect(() => {
    if (!selectedEvent) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedEventId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedEvent]);

  /* Step 8B event management handlers */
  const saveSelectedEvent = async () => {
    if (!selectedEvent || !isEditableCalendarEvent(selectedEvent)) {
      return;
    }

    const startAt = fromDatetimeLocalValue(editStartAt);
    const endAt = fromDatetimeLocalValue(editEndAt);

    if (!editTitle.trim() || !startAt || !endAt) {
      setEventActionError(eventActionUi.validationError);
      return;
    }

    setIsSavingEvent(true);
    setEventActionError(null);

    try {
      const response = await fetch("/api/calendar-rebuild/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedEvent.id,
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          startAt,
          endAt,
        }),
      });

      const payload = (await response.json()) as CalendarEventsResponse;

      if (!response.ok || !payload.ok || !payload.event) {
        throw new Error(payload.error ?? `Calendar event update failed: ${response.status}`);
      }

      setEvents((currentEvents) =>
        currentEvents.map((event) => (event.id === payload.event?.id ? payload.event : event)),
      );
      setSelectedEventId(payload.event.id);
      setIsEditingEvent(false);
    } catch (error) {
      setEventActionError(error instanceof Error ? error.message : "Unknown calendar event update error");
    } finally {
      setIsSavingEvent(false);
    }
  };

  const cancelSelectedEvent = async () => {
    if (!selectedEvent || !isEditableCalendarEvent(selectedEvent)) {
      return;
    }

    if (!window.confirm(eventActionUi.confirmCancel)) {
      return;
    }

    setIsSavingEvent(true);
    setEventActionError(null);

    try {
      const response = await fetch("/api/calendar-rebuild/events", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedEvent.id }),
      });

      const payload = (await response.json()) as CalendarEventsResponse;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? `Calendar event cancel failed: ${response.status}`);
      }

      setEvents((currentEvents) => currentEvents.filter((event) => event.id !== selectedEvent.id));
      setSelectedEventId(null);
      setIsEditingEvent(false);
    } catch (error) {
      setEventActionError(error instanceof Error ? error.message : "Unknown calendar event cancel error");
    } finally {
      setIsSavingEvent(false);
    }
  };
  const weekDates = useMemo(() => getWeekDates(focusDate), [focusDate]);
  const monthDates = useMemo(() => getMonthGridDates(focusDate), [focusDate]);

  const updateFocusDate = (nextDate: Date) => {
    setFocusDate(nextDate);
    setSelectedEventId(null);

    const params = new URLSearchParams(window.location.search);
    params.set("focusDate", dateKey(nextDate));
    params.set("locale", locale);

    window.history.replaceState(null, "", `${routeBasePath}?${params.toString()}`);
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
  const calendarPresentationCopy = useMemo(() => {
    if (locale === "ru") {
      return { grid: "Сетка", list: "Список" };
    }

    if (locale === "uk") {
      return { grid: "Сітка", list: "Список" };
    }

    if (locale === "pl") {
      return { grid: "Siatka", list: "Lista" };
    }

    if (locale === "de") {
      return { grid: "Raster", list: "Liste" };
    }

    if (locale === "es") {
      return { grid: "Cuadrícula", list: "Lista" };
    }

    if (locale === "cs") {
      return { grid: "Mřížka", list: "Seznam" };
    }

    return { grid: "Grid", list: "List" };
  }, [locale]);

  /* Step 8B event action labels */
  const eventActionUi = useMemo(() => {
    if (locale === "ru") {
      return {
        edit: "Редактировать",
        save: "Сохранить",
        back: "Назад",
        cancelEvent: "Отменить запись",
        title: "Название",
        description: "Описание",
        start: "Начало",
        end: "Окончание",
        readOnly: "Эта запись пока доступна только для просмотра.",
        validationError: "Заполните название, начало и окончание.",
        confirmCancel: "Отменить эту календарную запись?",
      };
    }

    if (locale === "uk") {
      return {
        edit: "Редагувати",
        save: "Зберегти",
        back: "Назад",
        cancelEvent: "Скасувати запис",
        title: "Назва",
        description: "Опис",
        start: "Початок",
        end: "Завершення",
        readOnly: "Цей запис поки доступний лише для перегляду.",
        validationError: "Заповніть назву, початок і завершення.",
        confirmCancel: "Скасувати цей календарний запис?",
      };
    }

    if (locale === "pl") {
      return {
        edit: "Edytuj",
        save: "Zapisz",
        back: "Wstecz",
        cancelEvent: "Anuluj wpis",
        title: "Tytul",
        description: "Opis",
        start: "Poczatek",
        end: "Koniec",
        readOnly: "Ten wpis jest teraz tylko do odczytu.",
        validationError: "Uzupelnij tytul, poczatek i koniec.",
        confirmCancel: "Anulowac ten wpis kalendarza?",
      };
    }

    return {
      edit: "Edit",
      save: "Save",
      back: "Back",
      cancelEvent: "Cancel event",
      title: "Title",
      description: "Description",
      start: "Start",
      end: "End",
      readOnly: "This record is read-only for now.",
      validationError: "Fill title, start and end.",
      confirmCancel: "Cancel this calendar event?",
    };
  }, [locale]);

  return (
    <main style={{ fontFamily: "Inter, system-ui, sans-serif" }} className="min-h-screen px-3 py-5 text-[#1a1d2e] bg-[#f0f2f7]">
      <div className="mx-auto max-w-[1520px] space-y-4">
        <section className="rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">{ui.title}</h1>
              <p className="mt-1 max-w-3xl text-sm text-[#7c8099]">
                {ui.subtitle}
              </p>
            </div>

            <Link
              href={addFlowHref}
              className="rounded-xl bg-[#3b6ef8] px-4 py-2 text-sm font-bold text-white shadow"
            >
              {ui.add}
            </Link>
          </div>
        </section>

        <div className="space-y-4">
        {/* Step 6F dashboard KPI layout */}
        {/* Step 7B mobile KPI order: stats first on narrow screens, date controls fourth */}
        <section className="grid grid-cols-1 gap-3 xl:grid-cols-4">
          <div className="order-4 xl:order-1 min-h-[150px] rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
            <div className="text-[11px] font-medium uppercase tracking-wide text-[#7c8099]">
              {arctorPeriodKicker(view, ui)}
            </div>
            <div className="mt-2 text-[22px] font-bold leading-tight text-[#1a1d2e]">
              {arctorFormatPeriodLabel(view, focusDate, locale)}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-3 py-1.5 text-[12px] font-medium text-[#5a5f7a] transition-all hover:bg-[#f5f6fb]"
                onClick={() => setFocusDate(arctorShiftFocusDate(focusDate, view, -1))}
              >
                &lt;
              </button>
              <button
                type="button"
                className="rounded-lg border border-[#3b6ef8]/30 bg-white px-3 py-1.5 text-[12px] font-medium text-[#3b6ef8] transition-all hover:bg-[#eef2ff]"
                onClick={() => setFocusDate(new Date())}
              >
                {ui.today}
              </button>
              <button
                type="button"
                className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-3 py-1.5 text-[12px] font-medium text-[#5a5f7a] transition-all hover:bg-[#f5f6fb]"
                onClick={() => setFocusDate(arctorShiftFocusDate(focusDate, view, 1))}
              >
                &gt;
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {(["day", "week", "month"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all",
                    view === mode
                      ? "bg-[#3b6ef8] text-white shadow-sm"
                      : "border border-[rgba(0,0,0,0.08)] bg-white text-[#5a5f7a] hover:bg-[#f5f6fb]",
                  )}
                  onClick={() => setView(mode)}
                >
                  {mode === "day" ? ui.day : mode === "week" ? ui.week : ui.month}
                </button>
              ))}
            </div>
          </div>

          <div className="order-1 xl:order-2 min-h-[150px] rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="text-[11px] font-medium uppercase tracking-wide text-[#7c8099]">
                {statsUi.visibleEvents}
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#3b6ef8]/10">
                <span className="h-2 w-2 rounded-full bg-[#3b6ef8]" />
              </div>
            </div>
            <div className="mt-7 flex items-end justify-between gap-4">
              <div>
                <div className="text-[28px] font-bold leading-none text-[#1a1d2e]">{visibleEvents.length}</div>
                <div className="mt-2 text-[11px] text-[#9ca3b8]">{statsUi.visibleSub}</div>
              </div>
              <svg viewBox="0 0 120 48" className="h-12 w-32 overflow-visible" aria-hidden="true">
                <path d="M2 34 C 22 26, 34 30, 50 22 S 82 20, 118 12" fill="none" stroke="#e6eaf5" strokeWidth="3" />
                <path d="M2 30 C 22 20, 36 24, 52 18 S 84 16, 118 8" fill="none" stroke="#3b6ef8" strokeWidth="3" />
                <circle cx="52" cy="18" r="3.5" fill="#3b6ef8" />
                <circle cx="88" cy="14" r="3.5" fill="#3b6ef8" />
              </svg>
            </div>
          </div>

          <div className="order-2 xl:order-3 min-h-[150px] rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="text-[11px] font-medium uppercase tracking-wide text-[#7c8099]">
                {statsUi.calendarEvents}
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#22c55e]/10">
                <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
              </div>
            </div>
            <div className="mt-5 grid grid-cols-[auto_1fr] items-center gap-4">
              <div>
                <div className="text-[28px] font-bold leading-none text-[#1a1d2e]">{sourceCounts.calendarEvents}</div>
                <div className="mt-2 text-[11px] text-[#9ca3b8]">{statsUi.calendarSub}</div>
              </div>
              <svg viewBox="0 0 86 86" className="h-20 w-20" aria-hidden="true">
                <circle cx="43" cy="43" r="30" fill="none" stroke="#eef2ff" strokeWidth="12" />
                <circle cx="43" cy="43" r="30" fill="none" stroke="#3b6ef8" strokeWidth="12" strokeDasharray="92 188" strokeLinecap="round" transform="rotate(-90 43 43)" />
                <circle cx="43" cy="43" r="30" fill="none" stroke="#22c55e" strokeWidth="12" strokeDasharray="44 188" strokeDashoffset="-98" strokeLinecap="round" transform="rotate(-90 43 43)" />
              </svg>
            </div>
          </div>

          <div className="order-3 xl:order-4 min-h-[150px] rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="text-[11px] font-medium uppercase tracking-wide text-[#7c8099]">
                {statsUi.timeBlocks}
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#8b5cf6]/10">
                <span className="h-2 w-2 rounded-full bg-[#8b5cf6]" />
              </div>
            </div>
            <div className="mt-7 flex items-end justify-between gap-4">
              <div>
                <div className="text-[28px] font-bold leading-none text-[#1a1d2e]">{sourceCounts.timeBlocks}</div>
                <div className="mt-2 text-[11px] text-[#9ca3b8]">{statsUi.blocksSub}</div>
              </div>
              <div className="flex h-14 w-28 items-end gap-1.5">
                <div className="w-full rounded-t bg-[#dbe4ff]" style={{ height: "26%" }} />
                <div className="w-full rounded-t bg-[#c9d7ff]" style={{ height: "48%" }} />
                <div className="w-full rounded-t bg-[#b6c9ff]" style={{ height: "40%" }} />
                <div className="w-full rounded-t bg-[#3b6ef8]" style={{ height: "68%" }} />
                <div className="w-full rounded-t bg-[#dbe4ff]" style={{ height: "34%" }} />
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-wrap gap-2">
          {filterLabels.map((label, index) => (
            <button
              key={label}
              type="button"
              className={cn(
                "rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all",
                index === 0
                  ? "bg-[#3b6ef8] text-white shadow-sm"
                  : "border border-[rgba(0,0,0,0.08)] bg-white text-[#5a5f7a] hover:bg-[#f5f6fb]",
              )}
            >
              {label}
            </button>
          ))}
        </section>
      </div>

      <section className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
        {/* Step 6F calendar grid shell */}
        {/* Step 7C grid/list presentation switch */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-[#3b6ef8]">
              {arctorPeriodKicker(view, ui)}
            </div>
            <div className="mt-1 text-[14px] font-semibold text-[#1a1d2e]">
              {arctorFormatPeriodLabel(view, focusDate, locale)}
            </div>
          </div>

          <div className="inline-flex rounded-full border border-[#d8deef] bg-white p-1 shadow-sm">
            {(["grid", "list"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setCalendarPresentation(mode)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-bold transition",
                  calendarPresentation === mode
                    ? "bg-[#3b6ef8] text-white shadow-sm"
                    : "text-[#667091] hover:bg-[#f4f6fb]",
                )}
              >
                {calendarPresentationCopy[mode]}
              </button>
            ))}
          </div>
        </div>

        {/* Step 7A mobile agenda surface */}
        <div className={cn("mb-4 space-y-2", calendarPresentation === "list" ? "block" : "hidden")}>
          <div className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-[#fbfcff] p-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#3b6ef8]">
              {gridTitle}
            </div>
            <div className="mt-1 text-sm font-semibold text-[#1a1d2e]">
              {periodTitle}
            </div>
            <div className="mt-2 text-xs font-medium text-[#7c8099]">
              {visibleEvents.length} {ui.visibleEvents}
            </div>
          </div>

          {eventsError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700">
              {eventsError}
            </div>
          ) : null}

          {isLoadingEvents ? (
            <div className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-3 text-sm font-medium text-[#7c8099]">
              {ui.loadingEvents}
            </div>
          ) : null}

          {!isLoadingEvents && !eventsError && visibleEvents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#d8deef] bg-white p-4 text-sm font-medium text-[#7c8099]">
              0 {ui.visibleEvents}
            </div>
          ) : null}

          {!isLoadingEvents && !eventsError
            ? visibleEvents.slice(0, 8).map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => {
                    setSelectedEventId(event.id);
                    setFocusDate(eventStartDate(event));
                  }}
                  className={cn(
                    "w-full rounded-xl border p-3 text-left shadow-sm",
                    getLayerAccentClass(event),
                    selectedEventId === event.id && "ring-2 ring-[#3b6ef8] ring-offset-1",
                  )}
                >
                  <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7c8099]">
                    {formatEventDateTimeRange(event, locale)}
                  </div>
                  <div className="mt-1 truncate text-sm font-bold text-[#1a1d2e]">
                    {getEventDisplayTitle(event) || buildCompactEventLabel(event)}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#7c8099]">
                    <span className="rounded-full bg-white/70 px-2 py-1">{event.kind}</span>
                    <span className="rounded-full bg-white/70 px-2 py-1">{event.layer}</span>
                    <span className="rounded-full bg-white/70 px-2 py-1">{event.source}</span>
                  </div>
                </button>
              ))
            : null}
        </div>

        {view === "day" ? (
            <div className={cn("relative overflow-hidden rounded-xl border border-[rgba(0,0,0,0.06)]", calendarPresentation === "grid" ? "block" : "hidden")}>
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="grid grid-cols-[76px_1fr] border-b border-[#eef1f7] last:border-b-0"
                  style={{ height: `${hourHeight}px` }}
                >
                  <div className="border-r border-[#eef1f7] bg-[#fbfcff] px-3 py-2 text-xs font-bold text-[#7c8099]">
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
                    "absolute z-10 overflow-hidden rounded-lg px-3 py-2 text-left text-xs font-bold text-[#1a1d2e] shadow-sm",
                    getLayerAccentClass(event),
                    selectedEventId === event.id && "ring-2 ring-[#3b6ef8] ring-offset-1",
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
            <div className={cn("overflow-x-auto rounded-xl border border-[rgba(0,0,0,0.06)]", calendarPresentation === "grid" ? "block" : "hidden")}>
              <div className="min-w-[1080px]">
                <div className="grid border-b border-[#eef1f7]" style={{ gridTemplateColumns: `${timeGutterWidth}px repeat(7, minmax(132px, 1fr))` }}>
                  <div className="border-r border-[#eef1f7] bg-[#fbfcff] p-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
                    {ui.time}
                  </div>
                  {weekDates.map((day) => (
                    <button
                      key={dateKey(day)}
                      type="button"
                      onClick={() => updateFocusDate(day)}
                      className={cn(
                        "border-r border-[#eef1f7] p-3 text-left last:border-r-0 hover:bg-[#f5f6fb]",
                        isSameDate(day, focusDate) && "bg-[#eef2ff]",
                      )}
                    >
                      <div className="text-xs font-bold uppercase text-[#7c8099]">{formatShortDay(day, locale)}</div>
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
                          className="border-b border-[#eef1f7] px-3 py-2 text-xs font-bold text-[#7c8099]"
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
                              "absolute left-1 right-1 z-10 overflow-hidden rounded-lg px-2 py-1 text-left text-[11px] font-bold leading-tight text-[#1a1d2e] shadow-sm",
                              getLayerAccentClass(event),
                    selectedEventId === event.id && "ring-2 ring-[#3b6ef8] ring-offset-1",
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
            <div className={cn("overflow-hidden rounded-xl border border-[rgba(0,0,0,0.06)]", calendarPresentation === "grid" ? "grid grid-cols-7" : "hidden")}>
              {monthDates.map((day) => {
                const dayEvents = getEventsForDate(visibleEvents, day);

                return (
                  <button
                    key={dateKey(day)}
                    type="button"
                    onClick={() => updateFocusDate(day)}
                    className={cn(
                      "min-h-[120px] border-b border-r border-[#eef1f7] p-2 text-left hover:bg-[#f5f6fb]",
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
                            "truncate rounded-md border px-2 py-1 text-[11px] font-bold text-[#1a1d2e]",
                            getLayerAccentClass(event),
                    selectedEventId === event.id && "ring-2 ring-[#3b6ef8] ring-offset-1",
                          )}
                        >
                          <EventLabel event={event} />
                        </div>
                      ))}
                      {dayEvents.length > 3 ? (
                        <div className="text-[10px] font-bold text-[#3b6ef8]">
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
        {/* Step 6B event details modal */}
        {selectedEvent ? (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/35 px-3 py-4"
            onClick={() => setSelectedEventId(null)}
          >
            <div
              className="max-h-[88vh] w-full max-w-[560px] overflow-y-auto rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white p-5 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#3b6ef8]">
                    {ui.selectedEvent}
                  </div>
                  <h3 className="mt-2 text-xl font-bold">
                    {getEventDisplayTitle(selectedEvent) || selectedEvent.title}
                  </h3>
                  <div className="mt-1 text-sm font-medium text-[#7c8099]">
                    {formatEventDateTimeRange(selectedEvent, locale)}
                  </div>
                </div>

                <button
                  type="button"
                  className="rounded-xl border border-[rgba(0,0,0,0.06)] px-3 py-1.5 text-lg font-bold leading-none text-[#7c8099] hover:bg-[#f5f6fb]"
                  onClick={() => setSelectedEventId(null)}
                  aria-label="Close"
                >
                  x
                </button>
              </div>

              {/* Step 8B event management modal actions */}
              <div className="mt-4 grid gap-3">
                {isEditingEvent ? (
                  <div className="grid gap-3 rounded-xl border border-[#d8deef] bg-[#fbfcff] p-3">
                    <label className="grid gap-1 text-sm font-semibold text-[#1a1d2e]">
                      {eventActionUi.title}
                      <input
                        value={editTitle}
                        onChange={(event) => setEditTitle(event.target.value)}
                        className="rounded-xl border border-[#d8deef] bg-white px-3 py-2 text-sm font-medium outline-none focus:border-[#3b6ef8]"
                      />
                    </label>

                    <label className="grid gap-1 text-sm font-semibold text-[#1a1d2e]">
                      {eventActionUi.description}
                      <textarea
                        value={editDescription}
                        onChange={(event) => setEditDescription(event.target.value)}
                        rows={3}
                        className="rounded-xl border border-[#d8deef] bg-white px-3 py-2 text-sm font-medium outline-none focus:border-[#3b6ef8]"
                      />
                    </label>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-1 text-sm font-semibold text-[#1a1d2e]">
                        {eventActionUi.start}
                        <input
                          type="datetime-local"
                          value={editStartAt}
                          onChange={(event) => setEditStartAt(event.target.value)}
                          className="rounded-xl border border-[#d8deef] bg-white px-3 py-2 text-sm font-medium outline-none focus:border-[#3b6ef8]"
                        />
                      </label>

                      <label className="grid gap-1 text-sm font-semibold text-[#1a1d2e]">
                        {eventActionUi.end}
                        <input
                          type="datetime-local"
                          value={editEndAt}
                          onChange={(event) => setEditEndAt(event.target.value)}
                          className="rounded-xl border border-[#d8deef] bg-white px-3 py-2 text-sm font-medium outline-none focus:border-[#3b6ef8]"
                        />
                      </label>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={saveSelectedEvent}
                        disabled={isSavingEvent}
                        className="rounded-xl bg-[#3b6ef8] px-4 py-2 text-sm font-bold text-white shadow-sm disabled:opacity-50"
                      >
                        {eventActionUi.save}
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsEditingEvent(false)}
                        disabled={isSavingEvent}
                        className="rounded-xl border border-[#d8deef] bg-white px-4 py-2 text-sm font-bold text-[#667091] disabled:opacity-50"
                      >
                        {eventActionUi.back}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-[#f5f6fb] p-3 text-sm text-[#7c8099]">
                      <div className="font-bold text-[#1a1d2e]">{detailUi.time}</div>
                      <div className="mt-1">{formatTimeRange(selectedEvent)}</div>
                    </div>

                    <div className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-3 text-sm text-[#7c8099]">
                      <div className="font-bold text-[#1a1d2e]">{detailUi.description}</div>
                      <div className="mt-2 whitespace-pre-wrap leading-relaxed">
                        {getEventDescription(selectedEvent) || detailUi.noDescription}
                      </div>
                    </div>

                    <div className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-[#fbfcff] p-3 text-xs leading-relaxed text-[#7c8099]">
                      {detailUi.status}: {selectedEvent.status}<br />
                      {ui.source}: {selectedEvent.source}<br />
                      {ui.kind}: {selectedEvent.kind}<br />
                      {ui.layer}: {selectedEvent.layer}<br />
                      {detailUi.privacy}: {selectedEvent.isPrivate ? detailUi.privateLabel : detailUi.publicLabel}
                    </div>

                    {isEditableCalendarEvent(selectedEvent) ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingEvent(true)}
                          disabled={isSavingEvent}
                          className="rounded-xl bg-[#3b6ef8] px-4 py-2 text-sm font-bold text-white shadow-sm disabled:opacity-50"
                        >
                          {eventActionUi.edit}
                        </button>

                        <button
                          type="button"
                          onClick={cancelSelectedEvent}
                          disabled={isSavingEvent}
                          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700 disabled:opacity-50"
                        >
                          {eventActionUi.cancelEvent}
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-[#d8deef] bg-white p-3 text-sm font-semibold text-[#7c8099]">
                        {eventActionUi.readOnly}
                      </div>
                    )}
                  </>
                )}

                {eventActionError ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
                    {eventActionError}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
