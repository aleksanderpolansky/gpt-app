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
import type {
  CalendarAllDayItem,
  CalendarEvent,
  CalendarViewMode,
} from "../../features/calendar-core/types";
import {
  Cux2InlineActivityComposer,
  type Cux4QuickCaptureResult,
} from "../../components/calendar/cux2-inline-activity-composer";
import {
  Cux6TaskShelf,
  type Cux6ShelfItem,
} from "../../components/calendar/cux6-task-shelf";
import { Cux6TaskDetailModal } from "../../components/calendar/cux6-task-detail-modal";

type CalendarRebuildClientProps = {
  initialFocusDateKey: string | null;
  initialLocale: string | null;
  routeBasePath?: "/calendar" | "/calendar-rebuild";
  returnToTarget?: "calendar" | "calendar-rebuild";
};

type UiLocale = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

const CUX4_CAPTURE_NOTICE_UI: Record<
  UiLocale,
  {
    saved: string;
    analyzing: string;
    details: string;
    dismiss: string;
  }
> = {
  en: {
    saved: "Activity added.",
    analyzing: "Analysis continues in the Activity Container.",
    details: "Details",
    dismiss: "Dismiss",
  },
  pl: {
    saved: "Aktywność została dodana.",
    analyzing: "Analiza trwa w kontenerze aktywności.",
    details: "Szczegóły",
    dismiss: "Ukryj",
  },
  ru: {
    saved: "Активность добавлена.",
    analyzing: "Анализ продолжается в контейнере активности.",
    details: "Подробнее",
    dismiss: "Скрыть",
  },
  uk: {
    saved: "Активність додано.",
    analyzing: "Аналіз триває в контейнері активності.",
    details: "Докладніше",
    dismiss: "Сховати",
  },
  de: {
    saved: "Aktivität hinzugefügt.",
    analyzing: "Die Analyse läuft im Aktivitätscontainer weiter.",
    details: "Details",
    dismiss: "Ausblenden",
  },
  es: {
    saved: "Actividad añadida.",
    analyzing: "El análisis continúa en el contenedor de actividad.",
    details: "Detalles",
    dismiss: "Ocultar",
  },
  cs: {
    saved: "Aktivita byla přidána.",
    analyzing: "Analýza pokračuje v kontejneru aktivity.",
    details: "Podrobnosti",
    dismiss: "Skrýt",
  },
};

type CalendarEventLogAction = "created" | "updated" | "cancelled" | "restored";

type CalendarEventLogEntry = {
  id: string;
  eventId: string | null;
  eventTitle: string;
  action: CalendarEventLogAction;
  actorName: string;
  actorEmail: string | null;
  occurredAt: string;
  eventStartAt: string | null;
  eventEndAt: string | null;
  eventStatus: string | null;
  canEdit: boolean;
  canCancel: boolean;
  canRestore: boolean;
};

type CalendarEventsResponse = {
  ok?: boolean;
  events?: CalendarEvent[];
  allDayItems?: CalendarAllDayItem[];
  event?: CalendarEvent;
  log?: CalendarEventLogEntry | null;
  logs?: CalendarEventLogEntry[];
  error?: string;
  sources?: {
    calendarEvents?: number;
    timeBlocks?: number;
    plannedActivities?: number;
  };
};

type PositionedEvent = {
  event: CalendarEvent;
  top: number;
  height: number;
};

type PositionedAllDayItem = {
  item: CalendarAllDayItem;
  startColumn: number;
  endColumn: number;
  lane: number;
};

type CalendarListEntry =
  | {
      key: string;
      kind: "all_day";
      dateKey: string;
      sortAt: number;
      item: CalendarAllDayItem;
    }
  | {
      key: string;
      kind: "timed";
      dateKey: string;
      sortAt: number;
      event: CalendarEvent;
    };

type CalendarListGroup = {
  dateKey: string;
  entries: CalendarListEntry[];
};

type CalendarPresentationMode = "grid" | "list" | "timeline";

type CalendarTimelineEntry =
  | {
      key: string;
      kind: "all_day";
      title: string;
      startAt: Date;
      endAt: Date;
      isPoint: boolean;
      item: CalendarAllDayItem;
    }
  | {
      key: string;
      kind: "timed";
      title: string;
      startAt: Date;
      endAt: Date;
      isPoint: false;
      event: CalendarEvent;
    };

type CalendarTimelineAxisCell = {
  key: string;
  label: string;
  secondaryLabel: string;
  startAt: Date;
  endAt: Date;
  isFocusDate: boolean;
};

type AllDayUiLabels = {
  title: string;
  empty: string;
  more: string;
  modes: Record<CalendarAllDayItem["scheduleModeCode"], string>;
};

const CUX7B_ALL_DAY_UI: Record<UiLocale, AllDayUiLabels> = {
  en: {
    title: "Scheduled dates",
    empty: "No date-only items",
    more: "more",
    modes: {
      date_only: "Date",
      date_range: "Date range",
      deadline: "Deadline",
    },
  },
  pl: {
    title: "Zaplanowane daty",
    empty: "Brak wpisów całodniowych",
    more: "więcej",
    modes: {
      date_only: "Data",
      date_range: "Zakres dat",
      deadline: "Termin",
    },
  },
  ru: {
    title: "Запланированные даты",
    empty: "Нет записей без точного времени",
    more: "ещё",
    modes: {
      date_only: "Дата",
      date_range: "Диапазон дат",
      deadline: "Крайний срок",
    },
  },
  uk: {
    title: "Заплановані дати",
    empty: "Немає записів без точного часу",
    more: "ще",
    modes: {
      date_only: "Дата",
      date_range: "Діапазон дат",
      deadline: "Крайній термін",
    },
  },
  de: {
    title: "Geplante Daten",
    empty: "Keine Einträge ohne genaue Uhrzeit",
    more: "weitere",
    modes: {
      date_only: "Datum",
      date_range: "Datumsbereich",
      deadline: "Frist",
    },
  },
  es: {
    title: "Fechas planificadas",
    empty: "No hay registros sin hora exacta",
    more: "más",
    modes: {
      date_only: "Fecha",
      date_range: "Rango de fechas",
      deadline: "Fecha límite",
    },
  },
  cs: {
    title: "Plánovaná data",
    empty: "Žádné záznamy bez přesného času",
    more: "další",
    modes: {
      date_only: "Datum",
      date_range: "Rozsah dat",
      deadline: "Termín",
    },
  },
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

function allDayItemIntersectsDate(item: CalendarAllDayItem, value: Date) {
  const key = dateKey(value);

  return item.startDate <= key && item.endDate >= key;
}

function getAllDayItemsForDate(items: CalendarAllDayItem[], value: Date) {
  return items.filter((item) => allDayItemIntersectsDate(item, value));
}

function getAllDayAccentClass(item: CalendarAllDayItem) {
  if (item.scheduleModeCode === "deadline") {
    return "border-amber-300 bg-amber-50 text-amber-950";
  }

  if (item.scheduleModeCode === "date_range") {
    return "border-violet-300 bg-violet-50 text-violet-950";
  }

  return "border-blue-300 bg-blue-50 text-blue-950";
}

function formatAllDayDateKey(value: string, locale: UiLocale) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "2-digit",
    month: "short",
  }).format(parseDateKey(value));
}

function formatAllDayItemRange(item: CalendarAllDayItem, locale: UiLocale) {
  if (item.scheduleModeCode === "deadline" && item.deadlineAt) {
    const deadline = new Date(item.deadlineAt);

    if (!Number.isNaN(deadline.getTime())) {
      return new Intl.DateTimeFormat(intlLocale(locale), {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(deadline);
    }
  }

  if (item.startDate === item.endDate) {
    return formatAllDayDateKey(item.startDate, locale);
  }

  return `${formatAllDayDateKey(item.startDate, locale)} - ${formatAllDayDateKey(
    item.endDate,
    locale,
  )}`;
}

function getAllDayListSortTime(item: CalendarAllDayItem, visibleStartDateKey: string) {
  if (item.scheduleModeCode === "deadline" && item.deadlineAt) {
    const deadline = new Date(item.deadlineAt);

    if (!Number.isNaN(deadline.getTime())) {
      return deadline.getTime();
    }
  }

  return parseDateKey(visibleStartDateKey).getTime();
}

function allDayItemToShelfItem(item: CalendarAllDayItem): Cux6ShelfItem {
  return {
    id: item.activityEventId,
    title: item.title,
    inputText: item.inputText,
    description: item.description,
    source: item.source,
    privacyScope: item.privacyScope,
    status: item.status,
    scheduleModeCode: item.scheduleModeCode,
    scheduledDate: item.scheduledDate,
    scheduleStartDate: item.scheduleStartDate,
    scheduleEndDate: item.scheduleEndDate,
    deadlineAt: item.deadlineAt,
    startedAt: item.startedAt,
    endedAt: item.endedAt,
    durationMinutes: item.durationMinutes,
    dueAt: item.dueAt,
    enrichmentStatus: null,
    enrichmentUpdatedAt: null,
    updatedAt: item.updatedAt,
  };
}

function buildWeekAllDaySegments(
  items: CalendarAllDayItem[],
  weekDates: Date[],
): PositionedAllDayItem[] {
  const firstDate = dateKey(weekDates[0]);
  const lastDate = dateKey(weekDates[weekDates.length - 1]);
  const indexByDate = new Map(weekDates.map((day, index) => [dateKey(day), index]));

  const candidates = items
    .filter((item) => item.startDate <= lastDate && item.endDate >= firstDate)
    .map((item) => {
      const clippedStart = item.startDate < firstDate ? firstDate : item.startDate;
      const clippedEnd = item.endDate > lastDate ? lastDate : item.endDate;

      return {
        item,
        startColumn: indexByDate.get(clippedStart) ?? 0,
        endColumn: indexByDate.get(clippedEnd) ?? weekDates.length - 1,
      };
    })
    .sort((left, right) => {
      if (left.startColumn !== right.startColumn) {
        return left.startColumn - right.startColumn;
      }

      if (left.endColumn !== right.endColumn) {
        return right.endColumn - left.endColumn;
      }

      return left.item.title.localeCompare(right.item.title);
    });

  const laneEndColumns: number[] = [];

  return candidates.map((candidate) => {
    let lane = laneEndColumns.findIndex(
      (lastOccupiedColumn) => candidate.startColumn > lastOccupiedColumn,
    );

    if (lane === -1) {
      lane = laneEndColumns.length;
      laneEndColumns.push(candidate.endColumn);
    } else {
      laneEndColumns[lane] = candidate.endColumn;
    }

    return {
      ...candidate,
      lane,
    };
  });
}

function startOfDateKey(value: string) {
  const parsed = parseDateKey(value);

  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0);
}

function addLocalCalendarDays(value: Date, amount: number) {
  return new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate() + amount,
    value.getHours(),
    value.getMinutes(),
    value.getSeconds(),
    value.getMilliseconds(),
  );
}

function clampTimelineDate(value: Date, minimum: Date, maximum: Date) {
  return new Date(Math.min(maximum.getTime(), Math.max(minimum.getTime(), value.getTime())));
}

function buildTimelineEntries(
  events: CalendarEvent[],
  allDayItems: CalendarAllDayItem[],
  range: { start: Date; end: Date },
): CalendarTimelineEntry[] {
  const entries: CalendarTimelineEntry[] = [];

  for (const item of allDayItems) {
    const rawStart = startOfDateKey(item.startDate);
    const rawEndExclusive = addLocalCalendarDays(startOfDateKey(item.endDate), 1);

    if (item.scheduleModeCode === "deadline") {
      const parsedDeadline = item.deadlineAt ? new Date(item.deadlineAt) : rawStart;
      const markerAt = Number.isNaN(parsedDeadline.getTime()) ? rawStart : parsedDeadline;

      if (markerAt < range.start || markerAt >= range.end) {
        continue;
      }

      entries.push({
        key: `timeline:all-day:${item.id}`,
        kind: "all_day",
        title: item.title,
        startAt: markerAt,
        endAt: markerAt,
        isPoint: true,
        item,
      });
      continue;
    }

    const startAt = clampTimelineDate(rawStart, range.start, range.end);
    const endAt = clampTimelineDate(rawEndExclusive, range.start, range.end);

    if (endAt <= startAt) {
      continue;
    }

    entries.push({
      key: `timeline:all-day:${item.id}`,
      kind: "all_day",
      title: item.title,
      startAt,
      endAt,
      isPoint: false,
      item,
    });
  }

  for (const event of events) {
    const rawStart = eventStartDate(event);
    const parsedEnd = new Date(event.endAt);
    const rawEnd = Number.isNaN(parsedEnd.getTime())
      ? new Date(rawStart.getTime() + eventDurationMinutes(event) * 60000)
      : parsedEnd;
    const startAt = clampTimelineDate(rawStart, range.start, range.end);
    const endAt = clampTimelineDate(rawEnd, range.start, range.end);

    if (endAt <= startAt) {
      continue;
    }

    entries.push({
      key: `timeline:timed:${event.id}`,
      kind: "timed",
      title: getEventDisplayTitle(event) || buildCompactEventLabel(event),
      startAt,
      endAt,
      isPoint: false,
      event,
    });
  }

  return entries.sort((left, right) => {
    if (left.startAt.getTime() !== right.startAt.getTime()) {
      return left.startAt.getTime() - right.startAt.getTime();
    }

    if (left.isPoint !== right.isPoint) {
      return left.isPoint ? 1 : -1;
    }

    return left.key.localeCompare(right.key);
  });
}

function buildTimelineAxisCells(
  view: CalendarViewMode,
  focusDate: Date,
  weekDates: Date[],
  monthDates: Date[],
  locale: UiLocale,
): CalendarTimelineAxisCell[] {
  if (view === "day") {
    const dayStart = new Date(
      focusDate.getFullYear(),
      focusDate.getMonth(),
      focusDate.getDate(),
      0,
      0,
      0,
      0,
    );

    return Array.from({ length: 24 }, (_, hour) => {
      const startAt = new Date(dayStart.getTime() + hour * 60 * 60 * 1000);
      const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);

      return {
        key: `${dateKey(dayStart)}:${hour}`,
        label: `${String(hour).padStart(2, "0")}:00`,
        secondaryLabel: hour === 0 ? formatAllDayDateKey(dateKey(dayStart), locale) : "",
        startAt,
        endAt,
        isFocusDate: true,
      };
    });
  }

  const dates = view === "week" ? weekDates : monthDates;

  return dates.map((day, index) => {
    const startAt = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0);
    const endAt = addLocalCalendarDays(startAt, 1);
    const showMonth = index === 0 || day.getDate() === 1;

    return {
      key: dateKey(day),
      label:
        view === "week"
          ? formatShortDay(day, locale)
          : String(day.getDate()).padStart(2, "0"),
      secondaryLabel:
        view === "week"
          ? formatAllDayDateKey(dateKey(day), locale)
          : showMonth
            ? new Intl.DateTimeFormat(intlLocale(locale), { month: "short" }).format(day)
            : "",
      startAt,
      endAt,
      isFocusDate: isSameDate(day, focusDate),
    };
  });
}

function getHorizontalTimelinePosition(
  entry: CalendarTimelineEntry,
  range: { start: Date; end: Date },
  axisWidth: number,
) {
  const rangeDuration = Math.max(1, range.end.getTime() - range.start.getTime());
  const rawLeft = ((entry.startAt.getTime() - range.start.getTime()) / rangeDuration) * axisWidth;
  const left = Math.max(0, Math.min(axisWidth, rawLeft));

  if (entry.isPoint) {
    return {
      left: Math.max(0, Math.min(axisWidth - 20, left - 10)),
      width: 20,
    };
  }

  const rawWidth = ((entry.endAt.getTime() - entry.startAt.getTime()) / rangeDuration) * axisWidth;
  const availableWidth = Math.max(10, axisWidth - left);

  return {
    left,
    width: Math.min(availableWidth, Math.max(18, rawWidth)),
  };
}

function formatTimelineEntryRange(entry: CalendarTimelineEntry, locale: UiLocale) {
  if (entry.kind === "all_day") {
    return formatAllDayItemRange(entry.item, locale);
  }

  return formatEventDateTimeRange(entry.event, locale);
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

function formatCalendarLogDateTime(value: string, locale: UiLocale) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatCalendarLogEventTime(entry: CalendarEventLogEntry, locale: UiLocale) {
  if (!entry.eventStartAt) {
    return "";
  }

  const start = new Date(entry.eventStartAt);

  if (Number.isNaN(start.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(start);
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
  const cux4NoticeUi = CUX4_CAPTURE_NOTICE_UI[locale];
  const detailUi = DETAIL_UI[locale];
  const analyticsUi = ANALYTICS_PLACEHOLDER_UI[locale];
  const statsUi = CALENDAR_STATS_UI[locale];
  const filterLabels = CALENDAR_FILTERS_UI[locale];
  const allDayUi = CUX7B_ALL_DAY_UI[locale];

  const [view, setView] = useState<CalendarViewMode>("week");
  const [composerOpen, setComposerOpen] = useState(false);
  const [lastQuickCapture, setLastQuickCapture] = useState<Cux4QuickCaptureResult | null>(null);
  const [calendarPresentation, setCalendarPresentation] = useState<CalendarPresentationMode>("grid");
  const [activeCalendarTab, setActiveCalendarTab] = useState<"calendar" | "log">("calendar");
  const [eventLogs, setEventLogs] = useState<CalendarEventLogEntry[]>([]);
  const [eventsRefreshKey, setEventsRefreshKey] = useState(0);
  const [autoEditEventId, setAutoEditEventId] = useState<string | null>(null);
  const [focusDate, setFocusDate] = useState(() => parseDateKey(initialFocusDateKey));

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedShelfItem, setSelectedShelfItem] =
    useState<Cux6ShelfItem | null>(null);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [eventActionError, setEventActionError] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStartAt, setEditStartAt] = useState("");
  const [editEndAt, setEditEndAt] = useState("");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [allDayItems, setAllDayItems] = useState<CalendarAllDayItem[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [sourceCounts, setSourceCounts] = useState({
    calendarEvents: 0,
    timeBlocks: 0,
    plannedActivities: 0,
  });

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
        startDate: dateKey(range.start),
        endDate: dateKey(range.end),
        includeLog: "1",
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
        setAllDayItems(payload.allDayItems ?? []);
        setEventLogs(payload.logs ?? []);
        setSourceCounts({
          calendarEvents: payload.sources?.calendarEvents ?? 0,
          timeBlocks: payload.sources?.timeBlocks ?? 0,
          plannedActivities: payload.sources?.plannedActivities ?? 0,
        });
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        setEvents([]);
        setAllDayItems([]);
        setEventLogs([]);
        setSourceCounts({
          calendarEvents: 0,
          timeBlocks: 0,
          plannedActivities: 0,
        });
        setEventsError(error instanceof Error ? error.message : "Unknown calendar events error");
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoadingEvents(false);
        }
      }
    }

    void loadEvents();

    return () => abortController.abort();
  }, [eventsRefreshKey, rangeEnd, rangeStart]);

  const visibleEvents = useMemo(
    () => events.filter((event) => eventIntersectsRange(event, range)),
    [events, range],
  );

  const visibleAllDayItems = useMemo(() => {
    const startDate = dateKey(range.start);
    const endDateExclusive = dateKey(range.end);

    return allDayItems.filter(
      (item) => item.startDate < endDateExclusive && item.endDate >= startDate,
    );
  }, [allDayItems, range]);

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

    setIsEditingEvent(autoEditEventId === selectedEvent.id);
    if (autoEditEventId === selectedEvent.id) {
      setAutoEditEventId(null);
    }
    setEventActionError(null);
    setEditTitle(getEventDisplayTitle(selectedEvent) || selectedEvent.title);
    setEditDescription(getEventDescription(selectedEvent));
    setEditStartAt(toDatetimeLocalValue(selectedEvent.startAt));
    setEditEndAt(toDatetimeLocalValue(selectedEvent.endAt));
  }, [autoEditEventId, selectedEvent?.id]);

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
      setEventsRefreshKey((value) => value + 1);
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
      setEventsRefreshKey((value) => value + 1);
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

  /* Step 9A calendar log action handlers */
  const openLogEntry = (entry: CalendarEventLogEntry, edit = false) => {
    if (entry.eventStartAt) {
      updateFocusDate(new Date(entry.eventStartAt));
    }

    setActiveCalendarTab("calendar");

    if (entry.eventId) {
      if (edit) {
        setAutoEditEventId(entry.eventId);
      }

      setSelectedEventId(entry.eventId);
    }
  };

  const cancelEventFromLog = async (entry: CalendarEventLogEntry) => {
    if (!entry.eventId || !entry.canCancel) {
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
        body: JSON.stringify({ id: entry.eventId }),
      });

      const payload = (await response.json()) as CalendarEventsResponse;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? `Calendar event cancel failed: ${response.status}`);
      }

      setEvents((currentEvents) => currentEvents.filter((event) => event.id !== entry.eventId));
      setEventsRefreshKey((value) => value + 1);
    } catch (error) {
      setEventActionError(error instanceof Error ? error.message : "Unknown calendar event cancel error");
    } finally {
      setIsSavingEvent(false);
    }
  };

  const restoreEventFromLog = async (entry: CalendarEventLogEntry) => {
    if (!entry.eventId || !entry.canRestore) {
      return;
    }

    setIsSavingEvent(true);
    setEventActionError(null);

    try {
      const response = await fetch("/api/calendar-rebuild/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: entry.eventId,
          status: "planned",
        }),
      });

      const payload = (await response.json()) as CalendarEventsResponse;

      if (!response.ok || !payload.ok || !payload.event) {
        throw new Error(payload.error ?? `Calendar event restore failed: ${response.status}`);
      }

      const restoredEvent = payload.event;

      setEvents((currentEvents) => {
        const nextEvents = currentEvents.some((event) => event.id === restoredEvent.id)
          ? currentEvents.map((event) => (event.id === restoredEvent.id ? restoredEvent : event))
          : [...currentEvents, restoredEvent];

        return nextEvents.sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime());
      });
      setFocusDate(eventStartDate(restoredEvent));
      setSelectedEventId(restoredEvent.id);
      setActiveCalendarTab("calendar");
      setEventsRefreshKey((value) => value + 1);
    } catch (error) {
      setEventActionError(error instanceof Error ? error.message : "Unknown calendar event restore error");
    } finally {
      setIsSavingEvent(false);
    }
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

  const dayAllDayItems = useMemo(
    () => getAllDayItemsForDate(visibleAllDayItems, focusDate),
    [focusDate, visibleAllDayItems],
  );
  const weekAllDaySegments = useMemo(
    () => buildWeekAllDaySegments(visibleAllDayItems, weekDates),
    [visibleAllDayItems, weekDates],
  );
  const maxVisibleAllDayLanes = 4;
  const visibleWeekAllDaySegments = weekAllDaySegments.filter(
    (segment) => segment.lane < maxVisibleAllDayLanes,
  );
  const hiddenWeekAllDayCount =
    weekAllDaySegments.length - visibleWeekAllDaySegments.length;
  const weekAllDayLaneCount = Math.max(
    1,
    Math.min(
      maxVisibleAllDayLanes,
      weekAllDaySegments.reduce(
        (maximum, segment) => Math.max(maximum, segment.lane + 1),
        0,
      ),
    ),
  );
  const visibleRecordCount = visibleEvents.length + visibleAllDayItems.length;
  const calendarListGroups = useMemo<CalendarListGroup[]>(() => {
    const rangeStartDateKey = dateKey(range.start);
    const groups = new Map<string, CalendarListEntry[]>();

    const addEntry = (entry: CalendarListEntry) => {
      const entries = groups.get(entry.dateKey) ?? [];
      entries.push(entry);
      groups.set(entry.dateKey, entries);
    };

    for (const item of visibleAllDayItems) {
      const visibleStartDateKey =
        item.startDate < rangeStartDateKey ? rangeStartDateKey : item.startDate;

      addEntry({
        key: `all-day:${item.id}`,
        kind: "all_day",
        dateKey: visibleStartDateKey,
        sortAt: getAllDayListSortTime(item, visibleStartDateKey),
        item,
      });
    }

    for (const event of visibleEvents) {
      const start = eventStartDate(event);

      addEntry({
        key: `timed:${event.id}`,
        kind: "timed",
        dateKey: dateKey(start),
        sortAt: start.getTime(),
        event,
      });
    }

    return Array.from(groups.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([groupDateKey, entries]) => ({
        dateKey: groupDateKey,
        entries: entries.sort((left, right) => {
          if (left.sortAt !== right.sortAt) {
            return left.sortAt - right.sortAt;
          }

          if (left.kind !== right.kind) {
            return left.kind === "all_day" ? -1 : 1;
          }

          return left.key.localeCompare(right.key);
        }),
      }));
  }, [range.start, visibleAllDayItems, visibleEvents]);
  const calendarTimelineEntries = useMemo(
    () => buildTimelineEntries(visibleEvents, visibleAllDayItems, range),
    [range, visibleAllDayItems, visibleEvents],
  );
  const calendarTimelineAxisCells = useMemo(
    () => buildTimelineAxisCells(view, focusDate, weekDates, monthDates, locale),
    [focusDate, locale, monthDates, view, weekDates],
  );
  const calendarTimelineUnitWidth = view === "day" ? 72 : view === "week" ? 132 : 56;
  const calendarTimelineAxisWidth =
    calendarTimelineAxisCells.length * calendarTimelineUnitWidth;
  const calendarTimelineLabelWidth = 248;

  const periodLabel =
    view === "day" ? ui.selectedDay : view === "week" ? ui.selectedWeek : ui.selectedMonth;
  const periodTitle =
    view === "day"
      ? formatDateTitle(focusDate, locale)
      : view === "week"
        ? `${dateKey(weekDates[0])} - ${dateKey(weekDates[6])}`
        : formatMonthTitle(focusDate, locale);
  const gridTitle = view === "day" ? ui.day : view === "week" ? ui.week : ui.month;
  const calendarPresentationCopy = useMemo<Record<CalendarPresentationMode, string>>(() => {
    if (locale === "ru") {
      return { grid: "Сетка", list: "Список", timeline: "Шкала времени" };
    }

    if (locale === "uk") {
      return { grid: "Сітка", list: "Список", timeline: "Часова шкала" };
    }

    if (locale === "pl") {
      return { grid: "Siatka", list: "Lista", timeline: "Oś czasu" };
    }

    if (locale === "de") {
      return { grid: "Raster", list: "Liste", timeline: "Zeitleiste" };
    }

    if (locale === "es") {
      return { grid: "Cuadrícula", list: "Lista", timeline: "Línea de tiempo" };
    }

    if (locale === "cs") {
      return { grid: "Mřížka", list: "Seznam", timeline: "Časová osa" };
    }

    return { grid: "Grid", list: "List", timeline: "Timeline" };
  }, [locale]);
  const calendarTimelineUi = useMemo(() => {
    if (locale === "ru") {
      return {
        title: "Шкала времени периода",
        empty: "В выбранном периоде нет записей",
        records: "записей",
        exact: "Точное время",
        hint: "Прокручивайте шкалу по горизонтали",
      };
    }

    if (locale === "uk") {
      return {
        title: "Часова шкала періоду",
        empty: "У вибраному періоді немає записів",
        records: "записів",
        exact: "Точний час",
        hint: "Прокручуйте шкалу горизонтально",
      };
    }

    if (locale === "pl") {
      return {
        title: "Oś czasu okresu",
        empty: "Brak wpisów w wybranym okresie",
        records: "wpisów",
        exact: "Dokładny czas",
        hint: "Przewijaj oś poziomo",
      };
    }

    if (locale === "de") {
      return {
        title: "Zeitleiste des Zeitraums",
        empty: "Keine Einträge im gewählten Zeitraum",
        records: "Einträge",
        exact: "Genaue Zeit",
        hint: "Zeitleiste horizontal scrollen",
      };
    }

    if (locale === "es") {
      return {
        title: "Línea de tiempo del período",
        empty: "No hay registros en el período seleccionado",
        records: "registros",
        exact: "Hora exacta",
        hint: "Desplaza la línea horizontalmente",
      };
    }

    if (locale === "cs") {
      return {
        title: "Časová osa období",
        empty: "Ve vybraném období nejsou žádné záznamy",
        records: "záznamů",
        exact: "Přesný čas",
        hint: "Posouvejte osu vodorovně",
      };
    }

    return {
      title: "Period timeline",
      empty: "No records in the selected period",
      records: "records",
      exact: "Exact time",
      hint: "Scroll the timeline horizontally",
    };
  }, [locale]);
  const calendarListUi = useMemo(() => {
    if (locale === "ru") {
      return {
        title: "Все записи периода",
        empty: "В выбранном периоде нет записей",
        exact: "Точное время",
        records: "записей",
      };
    }

    if (locale === "uk") {
      return {
        title: "Усі записи періоду",
        empty: "У вибраному періоді немає записів",
        exact: "Точний час",
        records: "записів",
      };
    }

    if (locale === "pl") {
      return {
        title: "Wszystkie wpisy okresu",
        empty: "Brak wpisów w wybranym okresie",
        exact: "Dokładny czas",
        records: "wpisów",
      };
    }

    if (locale === "de") {
      return {
        title: "Alle Einträge im Zeitraum",
        empty: "Keine Einträge im gewählten Zeitraum",
        exact: "Genaue Zeit",
        records: "Einträge",
      };
    }

    if (locale === "es") {
      return {
        title: "Todos los registros del período",
        empty: "No hay registros en el período seleccionado",
        exact: "Hora exacta",
        records: "registros",
      };
    }

    if (locale === "cs") {
      return {
        title: "Všechny záznamy období",
        empty: "Ve vybraném období nejsou žádné záznamy",
        exact: "Přesný čas",
        records: "záznamů",
      };
    }

    return {
      title: "All records in period",
      empty: "No records in the selected period",
      exact: "Exact time",
      records: "records",
    };
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

  const activityContainerButtonLabel = useMemo(() => {
    if (locale === "pl") {
      return "Kontener";
    }

    if (locale === "ru" || locale === "uk") {
      return "Контейнер";
    }

    if (locale === "de") {
      return "Container";
    }

    if (locale === "es") {
      return "Contenedor";
    }

    if (locale === "cs") {
      return "Kontejner";
    }

    return "Container";
  }, [locale]);

  function buildFutureActivityContainerHref(event: CalendarEvent) {
    return `/calendar/activity-review?${new URLSearchParams({
      locale,
      text: getEventDisplayTitle(event) || event.title,
      returnTo: returnToTarget,
      focusDate: dateKey(eventStartDate(event)),
      temporalDirection: "future",
    }).toString()}`;
  }

  /* Step 9A calendar log labels */
  const calendarLogUi = useMemo(() => {
    if (locale === "ru") {
      return {
        calendarTab: "Календарь",
        logTab: "Лог календаря",
        title: "Лог календаря",
        subtitle: "Хронология действий с календарными записями.",
        empty: "Пока нет действий календаря.",
        created: "добавил событие",
        updated: "изменил событие",
        cancelled: "отменил событие",
        restored: "восстановил событие",
        open: "Открыть",
        edit: "Изменить",
        cancel: "Отменить",
        restore: "Восстановить",
        eventTime: "Время события",
      };
    }

    if (locale === "uk") {
      return {
        calendarTab: "Календар",
        logTab: "Лог календаря",
        title: "Лог календаря",
        subtitle: "Хронологія дій з календарними записами.",
        empty: "Поки немає дій календаря.",
        created: "додав подію",
        updated: "змінив подію",
        cancelled: "скасував подію",
        restored: "відновив подію",
        open: "Відкрити",
        edit: "Змінити",
        cancel: "Скасувати",
        restore: "Відновити",
        eventTime: "Час події",
      };
    }

    if (locale === "pl") {
      return {
        calendarTab: "Kalendarz",
        logTab: "Dziennik kalendarza",
        title: "Dziennik kalendarza",
        subtitle: "Chronologia działań na wpisach kalendarza.",
        empty: "Brak działań kalendarza.",
        created: "dodał wydarzenie",
        updated: "zmienił wydarzenie",
        cancelled: "anulował wydarzenie",
        restored: "przywrócił wydarzenie",
        open: "Otwórz",
        edit: "Zmień",
        cancel: "Anuluj",
        restore: "Przywróć",
        eventTime: "Czas wydarzenia",
      };
    }

    return {
      calendarTab: "Calendar",
      logTab: "Calendar log",
      title: "Calendar log",
      subtitle: "Chronological history of calendar actions.",
      empty: "No calendar actions yet.",
      created: "added event",
      updated: "changed event",
      cancelled: "cancelled event",
      restored: "restored event",
      open: "Open",
      edit: "Edit",
      cancel: "Cancel",
      restore: "Restore",
      eventTime: "Event time",
    };
  }, [locale]);

  const calendarLogActionLabel = (action: CalendarEventLogAction) => {
    if (action === "updated") {
      return calendarLogUi.updated;
    }

    if (action === "cancelled") {
      return calendarLogUi.cancelled;
    }

    if (action === "restored") {
      return calendarLogUi.restored;
    }

    return calendarLogUi.created;
  };

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

            <button
              type="button"
              aria-expanded={composerOpen}
              aria-controls="calendar-inline-composer"
              onClick={() => setComposerOpen((value) => !value)}
              className="rounded-xl bg-[#3b6ef8] px-4 py-2 text-sm font-bold text-white shadow"
            >
              {ui.add}
            </button>
          </div>
        </section>

        <Cux2InlineActivityComposer
          open={composerOpen}
          locale={locale}
          focusDateKey={dateKey(focusDate)}
          onClose={() => setComposerOpen(false)}
          onSaved={(result) => {
            setEventsRefreshKey((value) => value + 1);
            setActiveCalendarTab("calendar");
            setLastQuickCapture(result);
            setComposerOpen(false);

            if (result.focusDateKey) {
              updateFocusDate(parseDateKey(result.focusDateKey));
            }
          }}
        />

        {lastQuickCapture ? (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-extrabold text-emerald-800">
                  {cux4NoticeUi.saved}
                </p>
                <p className="mt-1 text-sm font-semibold text-emerald-700">
                  {cux4NoticeUi.analyzing}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={{
                    pathname: "/calendar/activity-review",
                    query: {
                      locale,
                      returnTo: returnToTarget,
                      temporalDirection: "future",
                      activityEventId: lastQuickCapture.activityEventId,
                      ...(lastQuickCapture.focusDateKey
                        ? { focusDate: lastQuickCapture.focusDateKey }
                        : {}),
                    },
                  }}
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white shadow-sm"
                >
                  {cux4NoticeUi.details}
                </Link>
                <button
                  type="button"
                  onClick={() => setLastQuickCapture(null)}
                  className="rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-bold text-emerald-800"
                >
                  {cux4NoticeUi.dismiss}
                </button>
              </div>
            </div>
          </section>
        ) : null}


        <Cux6TaskShelf
          locale={locale}
          refreshKey={eventsRefreshKey}
          onOpenDetails={(item) => {
            setSelectedEventId(null);
            setSelectedShelfItem(item);
          }}
        />

        {/* Step 9A calendar/log top tabs */}
        <section className="flex flex-wrap gap-2">
          {(["calendar", "log"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveCalendarTab(tab)}
              className={cn(
                "rounded-xl border px-4 py-2 text-sm font-bold shadow-sm transition",
                activeCalendarTab === tab
                  ? "border-[#3b6ef8] bg-[#3b6ef8] text-white"
                  : "border-[#d8deef] bg-white text-[#667091] hover:bg-[#f4f6fb]",
              )}
            >
              {tab === "calendar" ? calendarLogUi.calendarTab : calendarLogUi.logTab}
            </button>
          ))}
        </section>

        {activeCalendarTab === "log" ? (
          <section className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#3b6ef8]">
                  {calendarLogUi.logTab}
                </div>
                <h2 className="mt-1 text-xl font-bold text-[#1a1d2e]">{calendarLogUi.title}</h2>
                <p className="mt-1 text-sm font-medium text-[#7c8099]">{calendarLogUi.subtitle}</p>
              </div>
            </div>

            {eventActionError ? (
              <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
                {eventActionError}
              </div>
            ) : null}

            {eventLogs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#d8deef] bg-[#fbfcff] p-5 text-sm font-semibold text-[#7c8099]">
                {calendarLogUi.empty}
              </div>
            ) : (
              <div className="space-y-3">
                {eventLogs.map((entry) => (
                  <article
                    key={entry.id}
                    className="rounded-xl border border-[#e2e6f2] bg-[#fbfcff] p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
                          {formatCalendarLogDateTime(entry.occurredAt, locale)}
                        </div>
                        <div className="mt-1 text-sm font-semibold leading-relaxed text-[#1a1d2e]">
                          {entry.actorName} {calendarLogActionLabel(entry.action)}{" "}
                          <button
                            type="button"
                            onClick={() => openLogEntry(entry)}
                            className="font-bold text-[#3b6ef8] underline-offset-4 hover:underline"
                          >
                            “{entry.eventTitle}”
                          </button>
                        </div>
                        {entry.eventStartAt ? (
                          <div className="mt-1 text-xs font-medium text-[#7c8099]">
                            {calendarLogUi.eventTime}: {formatCalendarLogEventTime(entry, locale)}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {entry.eventId ? (
                          <button
                            type="button"
                            onClick={() => openLogEntry(entry)}
                            className="rounded-lg border border-[#d8deef] bg-white px-3 py-1.5 text-xs font-bold text-[#667091]"
                          >
                            {calendarLogUi.open}
                          </button>
                        ) : null}

                        {entry.canEdit ? (
                          <button
                            type="button"
                            onClick={() => openLogEntry(entry, true)}
                            disabled={isSavingEvent}
                            className="rounded-lg bg-[#3b6ef8] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                          >
                            {calendarLogUi.edit}
                          </button>
                        ) : null}

                        {entry.canCancel ? (
                          <button
                            type="button"
                            onClick={() => cancelEventFromLog(entry)}
                            disabled={isSavingEvent}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 disabled:opacity-50"
                          >
                            {calendarLogUi.cancel}
                          </button>
                        ) : null}

                        {entry.canRestore ? (
                          <button
                            type="button"
                            onClick={() => restoreEventFromLog(entry)}
                            disabled={isSavingEvent}
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 disabled:opacity-50"
                          >
                            {calendarLogUi.restore}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : null}

        <div className={activeCalendarTab === "calendar" ? "space-y-4" : "hidden"}>
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
                <div className="text-[28px] font-bold leading-none text-[#1a1d2e]">{visibleRecordCount}</div>
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
            {(["grid", "list", "timeline"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setCalendarPresentation(mode)}
                aria-pressed={calendarPresentation === mode}
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

        {/* CUX7C1 complete list surface for all schedule modes in the selected period */}
        <div className={cn("mb-4 space-y-3", calendarPresentation === "list" ? "block" : "hidden")}>
          <div className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-[#fbfcff] p-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#3b6ef8]">
              {calendarListUi.title}
            </div>
            <div className="mt-1 text-sm font-semibold text-[#1a1d2e]">
              {periodTitle}
            </div>
            <div className="mt-2 text-xs font-medium text-[#7c8099]">
              {visibleRecordCount} {calendarListUi.records}
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

          {!isLoadingEvents && !eventsError && calendarListGroups.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#d8deef] bg-white p-4 text-sm font-medium text-[#7c8099]">
              {calendarListUi.empty}
            </div>
          ) : null}

          {!isLoadingEvents && !eventsError
            ? calendarListGroups.map((group) => (
                <section
                  key={group.dateKey}
                  className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-3 shadow-sm"
                >
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#667091]">
                    {formatDateTitle(parseDateKey(group.dateKey), locale)}
                  </div>

                  <div className="space-y-2">
                    {group.entries.map((entry) => {
                      if (entry.kind === "all_day") {
                        const item = entry.item;

                        return (
                          <button
                            key={entry.key}
                            type="button"
                            onClick={() => {
                              setSelectedEventId(null);
                              setSelectedShelfItem(allDayItemToShelfItem(item));
                            }}
                            className={cn(
                              "w-full rounded-xl border p-3 text-left transition hover:brightness-[0.99]",
                              getAllDayAccentClass(item),
                            )}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-bold">
                                  {item.title}
                                </div>
                                <div className="mt-1 text-xs font-medium opacity-75">
                                  {formatAllDayItemRange(item, locale)}
                                </div>
                              </div>
                              <span className="rounded-full bg-white/70 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em]">
                                {allDayUi.modes[item.scheduleModeCode]}
                              </span>
                            </div>
                          </button>
                        );
                      }

                      const event = entry.event;

                      return (
                        <button
                          key={entry.key}
                          type="button"
                          onClick={() => {
                            setSelectedShelfItem(null);
                            setSelectedEventId(event.id);
                            setFocusDate(eventStartDate(event));
                          }}
                          className={cn(
                            "w-full rounded-xl border p-3 text-left shadow-sm transition hover:brightness-[0.99]",
                            getLayerAccentClass(event),
                            selectedEventId === event.id && "ring-2 ring-[#3b6ef8] ring-offset-1",
                          )}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-bold text-[#1a1d2e]">
                                {getEventDisplayTitle(event) || buildCompactEventLabel(event)}
                              </div>
                              <div className="mt-1 text-xs font-medium text-[#667091]">
                                {formatEventDateTimeRange(event, locale)}
                              </div>
                            </div>
                            <span className="rounded-full bg-white/70 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#667091]">
                              {calendarListUi.exact}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))
            : null}
        </div>

        {/* CUX7C2 horizontal Timeline: one canonical record per row, no new writes */}
        <div className={cn("mb-4 space-y-3", calendarPresentation === "timeline" ? "block" : "hidden")}>
          <div className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-[#fbfcff] p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#3b6ef8]">
                  {calendarTimelineUi.title}
                </div>
                <div className="mt-1 text-sm font-semibold text-[#1a1d2e]">
                  {periodTitle}
                </div>
                <div className="mt-2 text-xs font-medium text-[#7c8099]">
                  {calendarTimelineEntries.length} {calendarTimelineUi.records}
                </div>
              </div>
              <div className="rounded-full border border-[#d8deef] bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#667091] shadow-sm">
                {calendarTimelineUi.hint}
              </div>
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

          {!isLoadingEvents && !eventsError && calendarTimelineEntries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#d8deef] bg-white p-4 text-sm font-medium text-[#7c8099]">
              {calendarTimelineUi.empty}
            </div>
          ) : null}

          {!isLoadingEvents && !eventsError && calendarTimelineEntries.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-[rgba(0,0,0,0.06)] bg-white shadow-sm">
              <div
                className="min-w-max"
                style={{ width: `${calendarTimelineLabelWidth + calendarTimelineAxisWidth}px` }}
              >
                <div
                  className="grid border-b border-[#e8ebf3] bg-[#fbfcff]"
                  style={{
                    gridTemplateColumns: `${calendarTimelineLabelWidth}px ${calendarTimelineAxisWidth}px`,
                  }}
                >
                  <div className="sticky left-0 z-30 border-r border-[#e8ebf3] bg-[#fbfcff] px-4 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#7c8099]">
                      {calendarTimelineUi.title}
                    </div>
                    <div className="mt-1 truncate text-xs font-semibold text-[#1a1d2e]">
                      {periodTitle}
                    </div>
                  </div>

                  <div
                    className="grid"
                    style={{
                      gridTemplateColumns: `repeat(${calendarTimelineAxisCells.length}, ${calendarTimelineUnitWidth}px)`,
                    }}
                  >
                    {calendarTimelineAxisCells.map((cell) => (
                      <div
                        key={cell.key}
                        className={cn(
                          "border-r border-[#e8ebf3] px-2 py-2 text-center last:border-r-0",
                          cell.isFocusDate && "bg-[#eef2ff]",
                        )}
                      >
                        <div className="truncate text-[10px] font-bold uppercase tracking-[0.08em] text-[#667091]">
                          {cell.label}
                        </div>
                        <div className="mt-0.5 truncate text-[10px] font-medium text-[#9ca3b8]">
                          {cell.secondaryLabel || "\u00a0"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  {calendarTimelineEntries.map((entry) => {
                    const position = getHorizontalTimelinePosition(
                      entry,
                      range,
                      calendarTimelineAxisWidth,
                    );
                    const modeLabel =
                      entry.kind === "all_day"
                        ? allDayUi.modes[entry.item.scheduleModeCode]
                        : calendarTimelineUi.exact;

                    return (
                      <div
                        key={entry.key}
                        className="grid min-h-[68px] border-b border-[#eef1f7] last:border-b-0"
                        style={{
                          gridTemplateColumns: `${calendarTimelineLabelWidth}px ${calendarTimelineAxisWidth}px`,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (entry.kind === "all_day") {
                              setSelectedEventId(null);
                              setSelectedShelfItem(allDayItemToShelfItem(entry.item));
                              return;
                            }

                            setSelectedShelfItem(null);
                            setSelectedEventId(entry.event.id);
                            setFocusDate(eventStartDate(entry.event));
                          }}
                          className="sticky left-0 z-20 border-r border-[#e8ebf3] bg-white px-4 py-3 text-left transition hover:bg-[#f8f9fd] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#3b6ef8]"
                        >
                          <div className="truncate text-xs font-bold text-[#1a1d2e]">
                            {entry.title}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="rounded-full bg-[#eef2ff] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#3b6ef8]">
                              {modeLabel}
                            </span>
                            <span className="truncate text-[10px] font-medium text-[#7c8099]">
                              {formatTimelineEntryRange(entry, locale)}
                            </span>
                          </div>
                        </button>

                        <div className="relative bg-white">
                          <div
                            className="pointer-events-none absolute inset-0 grid"
                            style={{
                              gridTemplateColumns: `repeat(${calendarTimelineAxisCells.length}, ${calendarTimelineUnitWidth}px)`,
                            }}
                          >
                            {calendarTimelineAxisCells.map((cell) => (
                              <div
                                key={cell.key}
                                className={cn(
                                  "border-r border-[#eef1f7] last:border-r-0",
                                  cell.isFocusDate && "bg-[#f7f8ff]",
                                )}
                              />
                            ))}
                          </div>

                          {entry.isPoint ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (entry.kind !== "all_day") {
                                  return;
                                }

                                setSelectedEventId(null);
                                setSelectedShelfItem(allDayItemToShelfItem(entry.item));
                              }}
                              className="absolute top-1/2 z-10 h-5 w-5 -translate-y-1/2 rotate-45 rounded-[4px] border-2 border-amber-400 bg-amber-100 shadow-sm transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#3b6ef8] focus:ring-offset-2"
                              style={{ left: `${position.left}px` }}
                              aria-label={`${modeLabel}: ${entry.title}`}
                              title={`${modeLabel} · ${formatTimelineEntryRange(entry, locale)} · ${entry.title}`}
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                if (entry.kind === "all_day") {
                                  setSelectedEventId(null);
                                  setSelectedShelfItem(allDayItemToShelfItem(entry.item));
                                  return;
                                }

                                setSelectedShelfItem(null);
                                setSelectedEventId(entry.event.id);
                                setFocusDate(eventStartDate(entry.event));
                              }}
                              className={cn(
                                "absolute top-1/2 z-10 flex h-8 -translate-y-1/2 items-center overflow-hidden rounded-lg border px-2 text-left text-[10px] font-bold shadow-sm transition hover:brightness-[0.98] focus:outline-none focus:ring-2 focus:ring-[#3b6ef8] focus:ring-offset-1",
                                entry.kind === "all_day"
                                  ? getAllDayAccentClass(entry.item)
                                  : getLayerAccentClass(entry.event),
                                entry.kind === "timed" && selectedEventId === entry.event.id
                                  ? "ring-2 ring-[#3b6ef8] ring-offset-1"
                                  : "",
                              )}
                              style={{
                                left: `${position.left}px`,
                                width: `${position.width}px`,
                              }}
                              title={`${modeLabel} · ${formatTimelineEntryRange(entry, locale)} · ${entry.title}`}
                            >
                              <span className="truncate">
                                {position.width >= 90 ? entry.title : modeLabel}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {view === "day" ? (
          <div
            className={cn(
              "space-y-2",
              calendarPresentation === "grid" ? "block" : "hidden",
            )}
          >
            <div className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-3">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#7c8099]">
                {allDayUi.title}
              </div>
              {dayAllDayItems.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#d8deef] px-3 py-2 text-xs font-medium text-[#9ca3b8]">
                  {allDayUi.empty}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {dayAllDayItems.slice(0, 4).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedEventId(null);
                        setSelectedShelfItem(allDayItemToShelfItem(item));
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-xs font-bold shadow-sm",
                        getAllDayAccentClass(item),
                      )}
                      title={`${allDayUi.modes[item.scheduleModeCode]}: ${formatAllDayItemRange(
                        item,
                        locale,
                      )}`}
                    >
                      <span className="min-w-0 truncate">{item.title}</span>
                      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] opacity-70">
                        {allDayUi.modes[item.scheduleModeCode]}
                      </span>
                    </button>
                  ))}
                  {dayAllDayItems.length > 4 ? (
                    <div className="px-1 text-[10px] font-bold text-[#3b6ef8]">
                      +{dayAllDayItems.length - 4} {allDayUi.more}
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="relative overflow-hidden rounded-xl border border-[rgba(0,0,0,0.06)]">
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
          </div>
        ) : null}

        {view === "week" ? (
          <div
            className={cn(
              "overflow-x-auto rounded-xl border border-[rgba(0,0,0,0.06)]",
              calendarPresentation === "grid" ? "block" : "hidden",
            )}
          >
            <div className="min-w-[1080px]">
              <div
                className="grid border-b border-[#eef1f7]"
                style={{
                  gridTemplateColumns: `${timeGutterWidth}px repeat(7, minmax(132px, 1fr))`,
                }}
              >
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
                    <div className="text-xs font-bold uppercase text-[#7c8099]">
                      {formatShortDay(day, locale)}
                    </div>
                    <div className="mt-1 text-xl font-bold">{day.getDate()}</div>
                  </button>
                ))}
              </div>

              <div
                className="grid border-b border-[#eef1f7] bg-white"
                style={{
                  gridTemplateColumns: `${timeGutterWidth}px repeat(7, minmax(132px, 1fr))`,
                }}
              >
                <div className="border-r border-[#eef1f7] bg-[#fbfcff] p-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#7c8099]">
                  {allDayUi.title}
                </div>
                <div className="relative col-span-7">
                  <div className="pointer-events-none absolute inset-0 grid grid-cols-7">
                    {weekDates.map((day) => (
                      <div
                        key={dateKey(day)}
                        className={cn(
                          "border-r border-[#eef1f7] last:border-r-0",
                          isSameDate(day, focusDate) && "bg-[#f7f8ff]",
                        )}
                      />
                    ))}
                  </div>

                  <div
                    className="relative grid gap-y-1 px-1 py-2"
                    style={{
                      gridTemplateColumns: "repeat(7, minmax(132px, 1fr))",
                      gridTemplateRows: `repeat(${weekAllDayLaneCount}, 28px)`,
                      minHeight: `${weekAllDayLaneCount * 32 + 12}px`,
                    }}
                  >
                    {visibleWeekAllDaySegments.map(
                      ({ item, startColumn, endColumn, lane }) => (
                        <button
                          key={`${item.id}:${startColumn}:${endColumn}`}
                          type="button"
                          onClick={() => {
                            setSelectedEventId(null);
                            setFocusDate(parseDateKey(item.startDate));
                            setSelectedShelfItem(allDayItemToShelfItem(item));
                          }}
                          className={cn(
                            "z-10 mx-1 truncate rounded-md border px-2 py-1 text-left text-[11px] font-bold shadow-sm",
                            getAllDayAccentClass(item),
                          )}
                          style={{
                            gridColumn: `${startColumn + 1} / ${endColumn + 2}`,
                            gridRow: `${lane + 1}`,
                          }}
                          title={`${allDayUi.modes[item.scheduleModeCode]} · ${formatAllDayItemRange(
                            item,
                            locale,
                          )} · ${item.title}`}
                        >
                          {item.title}
                        </button>
                      ),
                    )}

                    {visibleWeekAllDaySegments.length === 0 ? (
                      <div className="col-span-7 flex items-center px-3 text-xs font-medium text-[#9ca3b8]">
                        {allDayUi.empty}
                      </div>
                    ) : null}
                  </div>

                  {hiddenWeekAllDayCount > 0 ? (
                    <div className="absolute bottom-1 right-2 rounded-full bg-white/95 px-2 py-1 text-[10px] font-bold text-[#3b6ef8] shadow-sm">
                      +{hiddenWeekAllDayCount} {allDayUi.more}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="relative" style={{ height: `${getTimelineHeight()}px` }}>
                <div
                  className="absolute inset-0 grid"
                  style={{
                    gridTemplateColumns: `${timeGutterWidth}px repeat(7, minmax(132px, 1fr))`,
                  }}
                >
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

                      {(weekTimelineEventsByDay.get(dateKey(day)) ?? []).map(
                        ({ event, top, height }) => (
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
                              selectedEventId === event.id &&
                                "ring-2 ring-[#3b6ef8] ring-offset-1",
                            )}
                            style={{
                              top: `${top}px`,
                              height: `${height}px`,
                            }}
                            title={buildEventLabel(event)}
                          >
                            <EventLabel event={event} />
                          </button>
                        ),
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {view === "month" ? (
          <div
            className={cn(
              "overflow-hidden rounded-xl border border-[rgba(0,0,0,0.06)]",
              calendarPresentation === "grid" ? "grid grid-cols-7" : "hidden",
            )}
          >
            {monthDates.map((day) => {
              const dayEvents = getEventsForDate(visibleEvents, day);
              const dayDateItems = getAllDayItemsForDate(visibleAllDayItems, day);
              const visibleDateItems = dayDateItems.slice(0, 3);
              const availableTimedSlots = Math.max(0, 3 - visibleDateItems.length);
              const visibleTimedEvents = dayEvents.slice(0, availableTimedSlots);
              const hiddenCount =
                dayDateItems.length +
                dayEvents.length -
                visibleDateItems.length -
                visibleTimedEvents.length;

              return (
                <div
                  key={dateKey(day)}
                  className={cn(
                    "min-h-[120px] border-b border-r border-[#eef1f7] p-2 text-left",
                    !isSameMonth(day, focusDate) &&
                      "bg-[#fbfcff] text-[#b0b4c8]",
                    isSameDate(day, focusDate) && "bg-[#eef2ff]",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => updateFocusDate(day)}
                    className="rounded px-1 text-xs font-bold hover:bg-white/70"
                  >
                    {day.getDate()}
                  </button>

                  <div className="mt-2 space-y-1">
                    {visibleDateItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedEventId(null);
                          setFocusDate(day);
                          setSelectedShelfItem(allDayItemToShelfItem(item));
                        }}
                        title={`${allDayUi.modes[item.scheduleModeCode]} · ${formatAllDayItemRange(
                          item,
                          locale,
                        )} · ${item.title}`}
                        className={cn(
                          "block w-full truncate rounded-md border px-2 py-1 text-left text-[11px] font-bold shadow-sm",
                          getAllDayAccentClass(item),
                        )}
                      >
                        {item.title}
                      </button>
                    ))}

                    {visibleTimedEvents.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => {
                          setSelectedShelfItem(null);
                          setSelectedEventId(event.id);
                          setFocusDate(day);
                        }}
                        title={buildEventLabel(event)}
                        className={cn(
                          "block w-full truncate rounded-md border px-2 py-1 text-left text-[11px] font-bold text-[#1a1d2e]",
                          getLayerAccentClass(event),
                          selectedEventId === event.id &&
                            "ring-2 ring-[#3b6ef8] ring-offset-1",
                        )}
                      >
                        <EventLabel event={event} />
                      </button>
                    ))}

                    {hiddenCount > 0 ? (
                      <div className="text-[10px] font-bold text-[#3b6ef8]">
                        +{hiddenCount}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
        </section>
        {selectedShelfItem ? (
          <Cux6TaskDetailModal
            item={selectedShelfItem}
            locale={locale}
            returnToTarget={returnToTarget}
            onClose={() => setSelectedShelfItem(null)}
            onChanged={(item) => {
              setSelectedShelfItem(item);
              setEventsRefreshKey((value) => value + 1);
            }}
          />
        ) : null}

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

                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={buildFutureActivityContainerHref(selectedEvent)}
                        className="rounded-xl border border-[#d8deef] bg-white px-4 py-2 text-sm font-bold text-[#667091] shadow-sm hover:border-[#3b6ef8] hover:text-[#3b6ef8]"
                      >
                        {activityContainerButtonLabel}
                      </Link>

                      {isEditableCalendarEvent(selectedEvent) ? (
                        <>
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
                        </>
                      ) : null}
                    </div>

                    {!isEditableCalendarEvent(selectedEvent) ? (
                      <div className="rounded-xl border border-dashed border-[#d8deef] bg-white p-3 text-sm font-semibold text-[#7c8099]">
                        {eventActionUi.readOnly}
                      </div>
                    ) : null}
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
