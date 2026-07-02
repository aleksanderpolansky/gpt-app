"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Locale = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";
type ViewMode = "day" | "week" | "month";
type FactMode = "plan" | "fact" | "both";

type CalendarEvent = {
  id?: string;
  title?: string | null;
  description?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  status?: string | null;
  event_type?: string | null;
  eventType?: string | null;
};


type Dictionary = {
  eyebrow: string;
  title: string;
  subtitle: string;
  add: string;
  today: string;
  dayName: string;
  dateLine: string;
  day: string;
  week: string;
  month: string;
  plan: string;
  fact: string;
  both: string;
  layers: string;
  personal: string;
  work: string;
  business: string;
  health: string;
  certificates: string;
  points: string;
  candidates: string;
  timeline: string;
  noEntries: string;
  emptySlot: string;
  selectedArea: string;
  selectedDefault: string;
  selectedHint: string;
  hiddenTitle: string;
  hiddenText: string;
  semanticTitle: string;
  semanticText: string;
  previewRules: string;
  entries: string;
  cleanSurface: string;
  weekEmpty: string;
  monthEmpty: string;
};

const DICT: Record<Locale, Dictionary> = {
  en: {
    eyebrow: "ARCTOR_EMPTY_CALENDAR_STYLE_V3 / CALENDAR CORE / EMPTY VIEW",
    title: "Calendar",
    subtitle: "A clean calendar surface before entries are added.",
    add: "+ Add",
    today: "Today",
    dayName: "Thursday",
    dateLine: "02 July",
    day: "Day",
    week: "Week",
    month: "Month",
    plan: "Plan",
    fact: "Fact",
    both: "Both",
    layers: "Layers",
    personal: "Personal",
    work: "Work",
    business: "Business",
    health: "Health",
    certificates: "Certificates",
    points: "POINTS",
    candidates: "Candidates",
    timeline: "Day timeline",
    noEntries: "No entries yet",
    emptySlot: "Free",
    selectedArea: "Selected time area",
    selectedDefault: "All day",
    selectedHint: "Click an empty slot to preview its details. Nothing is saved here.",
    hiddenTitle: "No hidden entries",
    hiddenText: "This empty calendar does not create activities, facts, VO objects or time blocks.",
    semanticTitle: "Semantic Preview link",
    semanticText: "The Add activity button opens text input first, then Activity Review Package. Calendar stays empty until a protected write gate exists.",
    previewRules: "preview != write - candidate != saved fact - plan != fact",
    entries: "Entries",
    cleanSurface: "Empty day",
    weekEmpty: "Empty week",
    monthEmpty: "Empty month",
  },
  pl: {
    eyebrow: "ARCTOR_EMPTY_CALENDAR_STYLE_V3 / CALENDAR CORE / PUSTY WIDOK",
    title: "Kalendarz",
    subtitle: "Czysta powierzchnia kalendarza przed dodaniem wpisow.",
    add: "+ Dodaj",
    today: "Dzisiaj",
    dayName: "czwartek",
    dateLine: "02 lipca",
    day: "Dzie\u0144",
    week: "Tydzie\u0144",
    month: "Miesi\u0105c",
    plan: "Plan",
    fact: "Fakt",
    both: "Oba",
    layers: "Warstwy",
    personal: "Osobiste",
    work: "Praca",
    business: "Biznes",
    health: "Zdrowie",
    certificates: "Certyfikaty",
    points: "POINTS",
    candidates: "Kandydaci",
    timeline: "Plan dnia",
    noEntries: "Nie ma jeszcze wpisow",
    emptySlot: "Wolne",
    selectedArea: "Wybrany obszar czasu",
    selectedDefault: "Ca\u0142y dzie\u0144",
    selectedHint: "Klikniecie pustego slotu poka\u017ce szczegoly. Ten ekran niczego nie zapisuje.",
    hiddenTitle: "Bez ukrytych wpisow",
    hiddenText: "Ten pusty kalendarz nie tworzy aktywnosci, faktow, obiektow VO ani blokow czasu.",
    semanticTitle: "Powiazanie z Semantic Preview",
    semanticText: "Przycisk dodawania aktywnosci najpierw otwiera tekstowy wpis, potem Activity Review Package. Kalendarz pozostaje pusty do czasu chronionej bramki zapisu.",
    previewRules: "preview != write - candidate != saved fact - plan != fact",
    entries: "Wpisy",
    cleanSurface: "Pusty dzien",
    weekEmpty: "Pusty tydzien",
    monthEmpty: "Pusty miesiac",
  },
  ru: {
    eyebrow: "ARCTOR_EMPTY_CALENDAR_STYLE_V3 / CALENDAR CORE / EMPTY VIEW",
    title: "\u041a\u0430\u043b\u0435\u043d\u0434\u0430\u0440\u044c",
    subtitle: "\u0427\u0438\u0441\u0442\u0430\u044f \u043f\u043e\u0432\u0435\u0440\u0445\u043d\u043e\u0441\u0442\u044c \u043a\u0430\u043b\u0435\u043d\u0434\u0430\u0440\u044f \u0434\u043e \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u0438\u044f \u0437\u0430\u043f\u0438\u0441\u0435\u0439.",
    add: "+ \u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c",
    today: "\u0421\u0435\u0433\u043e\u0434\u043d\u044f",
    dayName: "\u0447\u0435\u0442\u0432\u0435\u0440\u0433",
    dateLine: "02 \u0438\u044e\u043b\u044f",
    day: "\u0414\u0435\u043d\u044c",
    week: "\u041d\u0435\u0434\u0435\u043b\u044f",
    month: "\u041c\u0435\u0441\u044f\u0446",
    plan: "\u041f\u043b\u0430\u043d",
    fact: "\u0424\u0430\u043a\u0442",
    both: "\u041e\u0431\u0430",
    layers: "\u0421\u043b\u043e\u0438",
    personal: "\u041b\u0438\u0447\u043d\u043e\u0435",
    work: "\u0420\u0430\u0431\u043e\u0442\u0430",
    business: "\u0411\u0438\u0437\u043d\u0435\u0441",
    health: "\u0417\u0434\u043e\u0440\u043e\u0432\u044c\u0435",
    certificates: "\u0421\u0435\u0440\u0442\u0438\u0444\u0438\u043a\u0430\u0442\u044b",
    points: "POINTS",
    candidates: "\u041a\u0430\u043d\u0434\u0438\u0434\u0430\u0442\u044b",
    timeline: "\u0428\u043a\u0430\u043b\u0430 \u0434\u043d\u044f",
    noEntries: "\u0417\u0430\u043f\u0438\u0441\u0435\u0439 \u043f\u043e\u043a\u0430 \u043d\u0435\u0442",
    emptySlot: "\u0421\u0432\u043e\u0431\u043e\u0434\u043d\u043e",
    selectedArea: "\u0412\u044b\u0431\u0440\u0430\u043d\u043d\u0430\u044f \u043e\u0431\u043b\u0430\u0441\u0442\u044c \u0432\u0440\u0435\u043c\u0435\u043d\u0438",
    selectedDefault: "\u0412\u0435\u0441\u044c \u0434\u0435\u043d\u044c",
    selectedHint: "\u041a\u043b\u0438\u043a \u043f\u043e \u043f\u0443\u0441\u0442\u043e\u043c\u0443 \u0441\u043b\u043e\u0442\u0443 \u043f\u043e\u043a\u0430\u0436\u0435\u0442 \u0434\u0435\u0442\u0430\u043b\u0438. \u0417\u0434\u0435\u0441\u044c \u043d\u0438\u0447\u0435\u0433\u043e \u043d\u0435 \u0437\u0430\u043f\u0438\u0441\u044b\u0432\u0430\u0435\u0442\u0441\u044f.",
    hiddenTitle: "\u0411\u0435\u0437 \u0441\u043a\u0440\u044b\u0442\u044b\u0445 \u0437\u0430\u043f\u0438\u0441\u0435\u0439",
    hiddenText: "\u042d\u0442\u043e\u0442 \u043f\u0443\u0441\u0442\u043e\u0439 \u043a\u0430\u043b\u0435\u043d\u0434\u0430\u0440\u044c \u043d\u0435 \u0441\u043e\u0437\u0434\u0430\u0435\u0442 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0438, \u0444\u0430\u043a\u0442\u044b, VO \u0438\u043b\u0438 \u0431\u043b\u043e\u043a\u0438 \u0432\u0440\u0435\u043c\u0435\u043d\u0438.",
    semanticTitle: "\u0421\u0432\u044f\u0437\u044c \u0441 Semantic Preview",
    semanticText: "\u041a\u043d\u043e\u043f\u043a\u0430 \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u0438\u044f \u0441\u043d\u0430\u0447\u0430\u043b\u0430 \u043e\u0442\u043a\u0440\u044b\u0432\u0430\u0435\u0442 \u0442\u0435\u043a\u0441\u0442\u043e\u0432\u044b\u0439 \u0432\u0432\u043e\u0434, \u0437\u0430\u0442\u0435\u043c Activity Review Package. \u041a\u0430\u043b\u0435\u043d\u0434\u0430\u0440\u044c \u043e\u0441\u0442\u0430\u0451\u0442\u0441\u044f \u043f\u0443\u0441\u0442\u044b\u043c \u0434\u043e \u0437\u0430\u0449\u0438\u0449\u0451\u043d\u043d\u043e\u0439 \u0437\u0430\u043f\u0438\u0441\u0438.",
    previewRules: "preview != write - candidate != saved fact - plan != fact",
    entries: "\u0417\u0430\u043f\u0438\u0441\u0438",
    cleanSurface: "\u041f\u0443\u0441\u0442\u043e\u0439 \u0434\u0435\u043d\u044c",
    weekEmpty: "\u041f\u0443\u0441\u0442\u0430\u044f \u043d\u0435\u0434\u0435\u043b\u044f",
    monthEmpty: "\u041f\u0443\u0441\u0442\u043e\u0439 \u043c\u0435\u0441\u044f\u0446",
  },
  uk: {
    eyebrow: "ARCTOR_EMPTY_CALENDAR_STYLE_V3 / CALENDAR CORE / EMPTY VIEW",
    title: "\u041a\u0430\u043b\u0435\u043d\u0434\u0430\u0440",
    subtitle: "\u0427\u0438\u0441\u0442\u0430 \u043f\u043e\u0432\u0435\u0440\u0445\u043d\u044f \u043a\u0430\u043b\u0435\u043d\u0434\u0430\u0440\u044f \u0434\u043e \u0434\u043e\u0434\u0430\u0432\u0430\u043d\u043d\u044f \u0437\u0430\u043f\u0438\u0441\u0456\u0432.",
    add: "+ \u0414\u043e\u0434\u0430\u0442\u0438",
    today: "\u0421\u044c\u043e\u0433\u043e\u0434\u043d\u0456",
    dayName: "\u0447\u0435\u0442\u0432\u0435\u0440",
    dateLine: "02 \u043b\u0438\u043f\u043d\u044f",
    day: "\u0414\u0435\u043d\u044c",
    week: "\u0422\u0438\u0436\u0434\u0435\u043d\u044c",
    month: "\u041c\u0456\u0441\u044f\u0446\u044c",
    plan: "\u041f\u043b\u0430\u043d",
    fact: "\u0424\u0430\u043a\u0442",
    both: "\u041e\u0431\u0430",
    layers: "\u0428\u0430\u0440\u0438",
    personal: "\u041e\u0441\u043e\u0431\u0438\u0441\u0442\u0435",
    work: "\u0420\u043e\u0431\u043e\u0442\u0430",
    business: "\u0411\u0456\u0437\u043d\u0435\u0441",
    health: "\u0417\u0434\u043e\u0440\u043e\u0432'\u044f",
    certificates: "\u0421\u0435\u0440\u0442\u0438\u0444\u0456\u043a\u0430\u0442\u0438",
    points: "POINTS",
    candidates: "\u041a\u0430\u043d\u0434\u0438\u0434\u0430\u0442\u0438",
    timeline: "\u0428\u043a\u0430\u043b\u0430 \u0434\u043d\u044f",
    noEntries: "\u0417\u0430\u043f\u0438\u0441\u0456\u0432 \u043f\u043e\u043a\u0438 \u043d\u0435\u043c\u0430\u0454",
    emptySlot: "\u0412\u0456\u043b\u044c\u043d\u043e",
    selectedArea: "\u041e\u0431\u0440\u0430\u043d\u0430 \u0434\u0456\u043b\u044f\u043d\u043a\u0430 \u0447\u0430\u0441\u0443",
    selectedDefault: "\u0423\u0432\u0435\u0441\u044c \u0434\u0435\u043d\u044c",
    selectedHint: "\u041a\u043b\u0456\u043a \u043f\u043e \u043f\u0443\u0441\u0442\u043e\u043c\u0443 \u0441\u043b\u043e\u0442\u0443 \u043f\u043e\u043a\u0430\u0436\u0435 \u0434\u0435\u0442\u0430\u043b\u0456. \u0422\u0443\u0442 \u043d\u0456\u0447\u043e\u0433\u043e \u043d\u0435 \u0437\u0431\u0435\u0440\u0456\u0433\u0430\u0454\u0442\u044c\u0441\u044f.",
    hiddenTitle: "\u0411\u0435\u0437 \u043f\u0440\u0438\u0445\u043e\u0432\u0430\u043d\u0438\u0445 \u0437\u0430\u043f\u0438\u0441\u0456\u0432",
    hiddenText: "\u0426\u0435\u0439 \u043f\u0443\u0441\u0442\u0438\u0439 \u043a\u0430\u043b\u0435\u043d\u0434\u0430\u0440 \u043d\u0435 \u0441\u0442\u0432\u043e\u0440\u044e\u0454 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0456, \u0444\u0430\u043a\u0442\u0438, VO \u0430\u0431\u043e \u0431\u043b\u043e\u043a\u0438 \u0447\u0430\u0441\u0443.",
    semanticTitle: "\u0417\u0432'\u044f\u0437\u043e\u043a \u0456\u0437 Semantic Preview",
    semanticText: "\u041a\u043d\u043e\u043f\u043a\u0430 \u0434\u043e\u0434\u0430\u0432\u0430\u043d\u043d\u044f \u0441\u043f\u043e\u0447\u0430\u0442\u043a\u0443 \u0432\u0456\u0434\u043a\u0440\u0438\u0432\u0430\u0454 \u0442\u0435\u043a\u0441\u0442\u043e\u0432\u0438\u0439 \u0432\u0432\u0456\u0434, \u043f\u043e\u0442\u0456\u043c Activity Review Package. \u041a\u0430\u043b\u0435\u043d\u0434\u0430\u0440 \u0437\u0430\u043b\u0438\u0448\u0430\u0454\u0442\u044c\u0441\u044f \u043f\u0443\u0441\u0442\u0438\u043c \u0434\u043e \u0437\u0430\u0445\u0438\u0449\u0435\u043d\u043e\u0433\u043e \u0437\u0430\u043f\u0438\u0441\u0443.",
    previewRules: "preview != write - candidate != saved fact - plan != fact",
    entries: "\u0417\u0430\u043f\u0438\u0441\u0438",
    cleanSurface: "\u041f\u0443\u0441\u0442\u0438\u0439 \u0434\u0435\u043d\u044c",
    weekEmpty: "\u041f\u0443\u0441\u0442\u0438\u0439 \u0442\u0438\u0436\u0434\u0435\u043d\u044c",
    monthEmpty: "\u041f\u0443\u0441\u0442\u0438\u0439 \u043c\u0456\u0441\u044f\u0446\u044c",
  },
  de: {
    eyebrow: "ARCTOR_EMPTY_CALENDAR_STYLE_V3 / CALENDAR CORE / EMPTY VIEW",
    title: "Kalender",
    subtitle: "Eine leere Kalenderflache vor dem Hinzufugen von Eintragen.",
    add: "+ Hinzuf\u00fcgen",
    today: "Heute",
    dayName: "Donnerstag",
    dateLine: "02 Juli",
    day: "Tag",
    week: "Woche",
    month: "Monat",
    plan: "Plan",
    fact: "Fakt",
    both: "Beides",
    layers: "Ebenen",
    personal: "Personlich",
    work: "Arbeit",
    business: "Business",
    health: "Gesundheit",
    certificates: "Zertifikate",
    points: "POINTS",
    candidates: "Kandidaten",
    timeline: "Tagesplan",
    noEntries: "Noch keine Eintrage",
    emptySlot: "Frei",
    selectedArea: "Ausgewahlter Zeitraum",
    selectedDefault: "Ganzer Tag",
    selectedHint: "Ein Klick auf einen freien Slot zeigt Details. Hier wird nichts gespeichert.",
    hiddenTitle: "Keine versteckten Eintrage",
    hiddenText: "Dieser leere Kalender erstellt keine Aktivitaten, Fakten, VO-Objekte oder Zeitblocke.",
    semanticTitle: "Verbindung zu Semantic Preview",
    semanticText: "Die Schaltflache zum Hinzufugen offnet zuerst die Texteingabe, danach Activity Review Package. Der Kalender bleibt leer, bis ein geschutztes Schreib-Gate existiert.",
    previewRules: "preview != write - candidate != saved fact - plan != fact",
    entries: "Eintrage",
    cleanSurface: "Leerer Tag",
    weekEmpty: "Leere Woche",
    monthEmpty: "Leerer Monat",
  },
  es: {
    eyebrow: "ARCTOR_EMPTY_CALENDAR_STYLE_V3 / CALENDAR CORE / EMPTY VIEW",
    title: "Calendario",
    subtitle: "Superficie limpia del calendario antes de agregar entradas.",
    add: "+ A\u00f1adir",
    today: "Hoy",
    dayName: "jueves",
    dateLine: "02 julio",
    day: "D\u00eda",
    week: "Semana",
    month: "Mes",
    plan: "Plan",
    fact: "Hecho",
    both: "Ambos",
    layers: "Capas",
    personal: "Personal",
    work: "Trabajo",
    business: "Negocio",
    health: "Salud",
    certificates: "Certificados",
    points: "POINTS",
    candidates: "Candidatos",
    timeline: "Agenda del dia",
    noEntries: "Aun no hay entradas",
    emptySlot: "Libre",
    selectedArea: "Area de tiempo seleccionada",
    selectedDefault: "Todo el dia",
    selectedHint: "Al hacer clic en un hueco libre se muestran detalles. Aqui no se guarda nada.",
    hiddenTitle: "Sin entradas ocultas",
    hiddenText: "Este calendario vacio no crea actividades, hechos, objetos VO ni bloques de tiempo.",
    semanticTitle: "Conexion con Semantic Preview",
    semanticText: "El boton de anadir actividad abre primero una entrada de texto y luego Activity Review Package. El calendario permanece vacio hasta que exista una puerta de escritura protegida.",
    previewRules: "preview != write - candidate != saved fact - plan != fact",
    entries: "Entradas",
    cleanSurface: "Dia vacio",
    weekEmpty: "Semana vacia",
    monthEmpty: "Mes vacio",
  },
  cs: {
    eyebrow: "ARCTOR_EMPTY_CALENDAR_STYLE_V3 / CALENDAR CORE / EMPTY VIEW",
    title: "Kalend\u00e1\u0159",
    subtitle: "\u010cist\u00e1 plocha kalend\u00e1\u0159e p\u0159ed p\u0159id\u00e1n\u00edm z\u00e1znam\u016f.",
    add: "+ P\u0159idat",
    today: "Dnes",
    dayName: "\u010dtvrtek",
    dateLine: "02 \u010dervence",
    day: "Den",
    week: "T\u00fdden",
    month: "M\u011bs\u00edc",
    plan: "Pl\u00e1n",
    fact: "Fakt",
    both: "Oboje",
    layers: "Vrstvy",
    personal: "Osobn\u00ed",
    work: "Pr\u00e1ce",
    business: "Byznys",
    health: "Zdrav\u00ed",
    certificates: "Certifik\u00e1ty",
    points: "POINTS",
    candidates: "Kandid\u00e1ti",
    timeline: "Pl\u00e1n dne",
    noEntries: "Zat\u00edm \u017e\u00e1dn\u00e9 z\u00e1znamy",
    emptySlot: "Volno",
    selectedArea: "Vybran\u00fd \u010dasov\u00fd \u00fasek",
    selectedDefault: "Cel\u00fd den",
    selectedHint: "Kliknut\u00ed na pr\u00e1zdn\u00fd slot zobraz\u00ed detaily. Nic se zde neukl\u00e1d\u00e1.",
    hiddenTitle: "\u017d\u00e1dn\u00e9 skryt\u00e9 z\u00e1znamy",
    hiddenText: "Tento pr\u00e1zdn\u00fd kalend\u00e1\u0159 nevytv\u00e1\u0159\u00ed aktivity, fakta, VO objekty ani \u010dasov\u00e9 bloky.",
    semanticTitle: "Vazba na Semantic Preview",
    semanticText: "Tla\u010d\u00edtko pro p\u0159id\u00e1n\u00ed aktivity nejprve otev\u0159e textov\u00fd vstup a pot\u00e9 Activity Review Package. Kalend\u00e1\u0159 z\u016fst\u00e1v\u00e1 pr\u00e1zdn\u00fd, dokud neexistuje chr\u00e1n\u011bn\u00e1 zapisovac\u00ed br\u00e1na.",
    previewRules: "preview != write - candidate != saved fact - plan != fact",
    entries: "Z\u00e1znamy",
    cleanSurface: "Pr\u00e1zdn\u00fd den",
    weekEmpty: "Pr\u00e1zdn\u00fd t\u00fdden",
    monthEmpty: "Pr\u00e1zdn\u00fd m\u011bs\u00edc",
  },
};

function readLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const raw = new URLSearchParams(window.location.search).get("locale");
  if (raw === "en" || raw === "pl" || raw === "ru" || raw === "uk" || raw === "de" || raw === "es" || raw === "cs") return raw;
  return "en";
}

function sameLocaleHref(path: string, locale: Locale) {
  return `${path}?locale=${locale}`;
}

function readFocusDate(): Date {
  if (typeof window === "undefined") {
    return new Date();
  }

  const value = new URLSearchParams(window.location.search).get("focusDate");

  if (!value) {
    return new Date();
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return new Date();
  }

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day, 12, 0, 0, 0);

  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function dateKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function eventStartDate(event: CalendarEvent): Date | null {
  const raw = event.start_time ?? event.startTime ?? null;

  if (!raw) {
    return null;
  }

  const date = new Date(raw);

  return Number.isNaN(date.getTime()) ? null : date;
}

function eventEndDate(event: CalendarEvent): Date | null {
  const raw = event.end_time ?? event.endTime ?? null;

  if (!raw) {
    return null;
  }

  const date = new Date(raw);

  return Number.isNaN(date.getTime()) ? null : date;
}

function eventDateKey(event: CalendarEvent): string | null {
  const start = eventStartDate(event);

  return start ? dateKey(start) : null;
}

function formatCalendarDate(value: Date, locale: Locale) {
  const localeTag: Record<Locale, string> = {
    en: "en-GB",
    pl: "pl-PL",
    ru: "ru-RU",
    uk: "uk-UA",
    de: "de-DE",
    es: "es-ES",
    cs: "cs-CZ",
  };

  const tag = localeTag[locale] ?? "en-GB";
  const dayName = new Intl.DateTimeFormat(tag, { weekday: "long" }).format(value);
  const dateLine = new Intl.DateTimeFormat(tag, { day: "2-digit", month: "long" }).format(value);

  return {
    dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
    dateLine,
  };
}

function formatEventTime(event: CalendarEvent) {
  const start = eventStartDate(event);
  const end = eventEndDate(event);

  if (!start || !end) {
    return "";
  }

  const startLabel = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
  const endLabel = `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;

  return `${startLabel} - ${endLabel}`;
}

const HOURS = Array.from({ length: 17 }, (_, i) => `${String(i + 6).padStart(2, "0")}:00`);
const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_CELLS = Array.from({ length: 35 }, (_, i) => i + 1);

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export default function CalendarEmptyTimelineClient() {
  const [locale, setLocale] = useState<Locale>("en");
  const [view, setView] = useState<ViewMode>("day");
  const [mode, setMode] = useState<FactMode>("both");
  const [selected, setSelected] = useState<string>("");
  const [focusDate, setFocusDate] = useState<Date>(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);

  useEffect(() => {
    setLocale(readLocale());
    setFocusDate(readFocusDate());

    let cancelled = false;

    async function loadEvents() {
      setEventsLoading(true);
      setEventsError(null);

      try {
        const response = await fetch("/api/calendar/events", {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        const payload = await response.json().catch(() => null) as { calendarEvents?: CalendarEvent[]; error?: string } | null;

        if (!response.ok) {
          throw new Error(payload?.error || `Calendar events request failed: ${response.status}`);
        }

        if (!cancelled) {
          setEvents(Array.isArray(payload?.calendarEvents) ? payload.calendarEvents : []);
        }
      } catch (error) {
        if (!cancelled) {
          setEvents([]);
          setEventsError(error instanceof Error ? error.message : "Calendar events request failed.");
        }
      } finally {
        if (!cancelled) {
          setEventsLoading(false);
        }
      }
    }

    loadEvents();

    return () => {
      cancelled = true;
    };
  }, []);

  const t = DICT[locale] ?? DICT.en;
  const addHref = useMemo(() => sameLocaleHref("/calendar/add", locale), [locale]);
  const focusDateKey = useMemo(() => dateKey(focusDate), [focusDate]);
  const dateParts = useMemo(() => formatCalendarDate(focusDate, locale), [focusDate, locale]);
  const visibleEvents = useMemo(
    () => events.filter((event) => eventDateKey(event) === focusDateKey),
    [events, focusDateKey]
  );
  const plannedEvents = useMemo(
    () => visibleEvents.filter((event) => (event.status ?? "planned") === "planned"),
    [visibleEvents]
  );
  const eventsByHour = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();

    for (const event of visibleEvents) {
      const start = eventStartDate(event);
      if (!start) continue;
      const hour = `${String(start.getHours()).padStart(2, "0")}:00`;
      const current = map.get(hour) ?? [];
      current.push(event);
      map.set(hour, current);
    }

    return map;
  }, [visibleEvents]);

  const renderDaySlot = (hour: string) => {
    const slotEvents = eventsByHour.get(hour) ?? [];

    return (
      <button
        type="button"
        key={hour}
        onClick={() => setSelected(slotEvents[0]?.title || hour)}
        className="grid w-full grid-cols-[70px_1fr] border-b border-[#eef1f7] text-left last:border-b-0 hover:bg-[#f8faff]"
      >
        <div className="border-r border-[#eef1f7] bg-[#fbfcff] px-3 py-3 text-[11px] font-semibold text-[#9ca3b8]">{hour}</div>
        <div className="px-3 py-2">
          {slotEvents.length > 0 ? (
            <div className="space-y-2">
              {slotEvents.map((event, index) => (
                <div
                  key={event.id ?? `${hour}-${index}`}
                  className="rounded-lg border border-[#3b6ef8]/25 bg-[#eef2ff] px-3 py-2 text-[11.5px] text-[#1d4ed8]"
                >
                  <div className="font-bold text-[#1a1d2e]">{event.title || t.noEntries}</div>
                  <div className="mt-1 text-[#52607a]">{formatEventTime(event)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="min-h-[34px] rounded-lg border border-dashed border-[#d8deef] bg-white px-3 py-2 text-[11.5px] text-[#b0b4c8]">
              {t.emptySlot}
            </div>
          )}
        </div>
      </button>
    );
  };

  const ViewButton = ({ id, label }: { id: ViewMode; label: string }) => (
    <button
      type="button"
      onClick={() => setView(id)}
      className={cn(
        "rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all",
        view === id
          ? "bg-[#3b6ef8] text-white shadow-sm shadow-[#3b6ef8]/20"
          : "border border-[rgba(0,0,0,0.08)] bg-white text-[#5a5f7a] hover:bg-[#f5f6fb]"
      )}
    >
      {label}
    </button>
  );

  const ModeButton = ({ id, label }: { id: FactMode; label: string }) => (
    <button
      type="button"
      onClick={() => setMode(id)}
      className={cn(
        "rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all",
        mode === id
          ? "bg-[#eef2ff] text-[#3b6ef8] border border-[#3b6ef8]/30"
          : "border border-[rgba(0,0,0,0.08)] bg-white text-[#5a5f7a] hover:bg-[#f5f6fb]"
      )}
    >
      {label}
    </button>
  );

  const LayerChip = ({ label }: { label: string }) => (
    <button type="button" className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-3 py-1.5 text-[11.5px] font-medium text-[#5a5f7a] hover:bg-[#f5f6fb] transition-all">
      {label}
    </button>
  );

  return (
    <main className="min-h-screen bg-[#f0f2f7] px-4 py-5 text-[#1a1d2e] sm:px-5 lg:px-6">
      <div className="mx-auto max-w-[1180px] space-y-5">
        <section className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.26em] text-[#3b6ef8]">{t.eyebrow}</div>
              <h1 className="mt-2 text-[28px] font-bold leading-tight tracking-[-0.03em] text-[#1a1d2e] sm:text-[32px]">{t.title}</h1>
              <p className="mt-1 text-[13px] text-[#7c8099]">{t.subtitle}</p>
            </div>
            <Link
              href={addHref}
              className="inline-flex items-center justify-center rounded-lg bg-[#3b6ef8] px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm shadow-[#3b6ef8]/25 transition-all hover:bg-[#2f5fe5]"
            >
              {t.add}
            </Link>
          </div>
        </section>

        <section className="grid gap-3 lg:grid-cols-[1fr_320px]">
          <div className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.20em] text-[#9ca3b8]">{t.today}</div>
                <div className="mt-1 text-[18px] font-bold leading-tight text-[#1a1d2e]">{dateParts.dayName}, {dateParts.dateLine}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <ViewButton id="day" label={t.day} />
                <ViewButton id="week" label={t.week} />
                <ViewButton id="month" label={t.month} />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <ModeButton id="plan" label={t.plan} />
              <ModeButton id="fact" label={t.fact} />
              <ModeButton id="both" label={t.both} />
            </div>

            <div className="mt-4">
              <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.20em] text-[#9ca3b8]">{t.layers}</div>
              <div className="flex flex-wrap gap-2">
                <LayerChip label={t.personal} />
                <LayerChip label={t.work} />
                <LayerChip label={t.business} />
                <LayerChip label={t.health} />
                <LayerChip label={t.certificates} />
                <LayerChip label={t.points} />
                <LayerChip label={t.candidates} />
              </div>
            </div>
          </div>

          <aside className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.20em] text-[#9ca3b8]">{t.selectedArea}</div>
            <h2 className="mt-1 text-[18px] font-bold text-[#1a1d2e]">{selected || t.selectedDefault}</h2>
            <p className="mt-2 text-[12.5px] leading-relaxed text-[#5a5f7a]">{t.selectedHint}</p>
            <div className="mt-4 rounded-lg border border-dashed border-[#d8deef] bg-[#f8faff] px-3 py-3">
              <div className="text-[12px] font-semibold text-[#1a1d2e]">{visibleEvents.length ? `${visibleEvents.length} ${t.entries}` : t.noEntries}</div>
              <div className="mt-1 text-[11.5px] text-[#7c8099]">{eventsLoading ? "Loading..." : eventsError ? eventsError : t.emptySlot}</div>
            </div>
          </aside>
        </section>

        <section className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-[#3b6ef8]/18 bg-white p-4 shadow-sm">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.20em] text-[#3b6ef8]">{t.plan}</div>
            <div className="mt-4 text-[24px] font-bold text-[#1a1d2e]">{plannedEvents.length}</div>
          </div>
          <div className="rounded-xl border border-[#22c55e]/20 bg-white p-4 shadow-sm">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.20em] text-[#22c55e]">{t.fact}</div>
            <div className="mt-4 text-[24px] font-bold text-[#1a1d2e]">0</div>
          </div>
          <div className="rounded-xl border border-[#f97316]/20 bg-white p-4 shadow-sm">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.20em] text-[#f97316]">{t.candidates}</div>
            <div className="mt-4 text-[24px] font-bold text-[#1a1d2e]">0</div>
          </div>
          <div className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.20em] text-[#7c8099]">{t.entries}</div>
            <div className="mt-4 text-[24px] font-bold text-[#1a1d2e]">{visibleEvents.length}</div>
          </div>
        </section>

        <section className="grid gap-3 lg:grid-cols-[1fr_320px]">
          <div className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.20em] text-[#3b6ef8]">{t.timeline}</div>
                <h2 className="mt-1 text-[15px] font-bold text-[#1a1d2e]">
                  {view === "day" ? (visibleEvents.length ? t.entries : t.noEntries) : view === "week" ? t.weekEmpty : t.monthEmpty}
                </h2>
              </div>
              <span className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-2.5 py-1 text-[10.5px] font-medium text-[#7c8099]">{t.cleanSurface}</span>
            </div>

            {view === "day" && (
              <div className="overflow-hidden rounded-xl border border-[#e7eaf3]">
                {HOURS.map(renderDaySlot)}
              </div>
            )}

            {view === "week" && (
              <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-[#e7eaf3]">
                {WEEK_DAYS.map((day) => (
                  <button type="button" key={day} onClick={() => setSelected(day)} className="min-h-[220px] border-r border-[#eef1f7] bg-white p-2 text-left last:border-r-0 hover:bg-[#f8faff]">
                    <div className="mb-2 text-[11px] font-semibold text-[#7c8099]">{day}</div>
                    <div className="h-[36px] rounded-lg border border-dashed border-[#d8deef] bg-[#fbfcff]" />
                  </button>
                ))}
              </div>
            )}

            {view === "month" && (
              <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-[#e7eaf3]">
                {MONTH_CELLS.map((day) => (
                  <button type="button" key={day} onClick={() => setSelected(String(day))} className="min-h-[76px] border-b border-r border-[#eef1f7] bg-white p-2 text-left hover:bg-[#f8faff]">
                    <span className="text-[11px] font-semibold text-[#9ca3b8]">{day}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-[#22c55e]/20 bg-[#f0fdf4] p-4 shadow-sm">
              <div className="text-[13px] font-bold text-[#166534]">{t.hiddenTitle}</div>
              <p className="mt-2 text-[12.5px] leading-relaxed text-[#166534]">{t.hiddenText}</p>
            </div>
            <div className="rounded-xl border border-[#3b6ef8]/18 bg-[#eef2ff] p-4 shadow-sm">
              <div className="text-[13px] font-bold text-[#1d4ed8]">{t.semanticTitle}</div>
              <p className="mt-2 text-[12.5px] leading-relaxed text-[#4a4f6a]">{t.semanticText}</p>
              <div className="mt-3 rounded-lg bg-white px-3 py-2 text-[10.5px] font-semibold uppercase tracking-[0.13em] text-[#3b6ef8]">
                {t.previewRules}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
