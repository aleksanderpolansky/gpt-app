import { NextResponse } from "next/server";

import {
  inferActivityTimingDraftPp1,
  mergeActivityTimingDraftPp1,
  validateActivityTimingDraftPp1,
  type ActivityTemporalDirectionPp1,
  type ActivityTimingDraftPp1,
} from "@/lib/activity/pp1/activityTiming";
import {
  applyCalendarAiRuleShortcut,
  buildCalendarAiRulePrompt,
  getSystemCalendarAiRuleResolution,
  normalizeCalendarAiRuleLocale,
  readEffectiveCalendarAiRules,
  resolveOptionalCalendarAiRuleActorContext,
  validateCalendarAiRuleText,
  type CalendarAiRuleResolution,
  type CalendarAiRuleShortcut,
} from "@/lib/calendar/aiInterpretationRules.server";
import { resolveCurrentActorAiProcessingContext } from "@/lib/ai/processingInstructions.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Locale = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";
type FieldStatus = "ready" | "candidate" | "missing";
type IntentValue = "planned_activity" | "actual_fact" | "ambiguous_activity" | "ordinary_chat";

type ReviewField = {
  key: string;
  label: string;
  value: string;
  status: FieldStatus;
  note: string;
  confidence: number;
};

type RuleApplicationPayload = {
  source: CalendarAiRuleResolution["source"];
  locale: CalendarAiRuleResolution["locale"];
  fallbackLocale: CalendarAiRuleResolution["fallbackLocale"];
  ruleVersion: number | null;
  updatedAt: string | null;
  matched: boolean;
  matchedPhrase: string | null;
  targetTitles: string[];
};

type ReviewPayload = {
  ok: boolean;
  route: string;
  routeMode: "calendar_activity_review_no_write_v1";
  source: "model" | "fallback";
  modelBacked: boolean;
  modelName: string | null;
  modelAttempted: boolean;
  modelError: string | null;
  rawText: string;
  locale: Locale;
  intent: IntentValue;
  activityTitle: string;
  summary: string;
  timingDraft: ActivityTimingDraftPp1;
  fields: ReviewField[];
  counters: Record<FieldStatus, number>;
  safety: {
    previewOnly: true;
    dbWriteExecuted: false;
    sqlExecuted: false;
    factCreated: false;
    planCreated: false;
    valueObjectCreated: false;
    timeBlockCreated: false;
  };
  warnings: string[];
  rules: RuleApplicationPayload;
};

type ModelShape = {
  intent?: Partial<{
    value: IntentValue;
    status: FieldStatus;
    confidence: number;
    note: string;
  }>;
  activityTitle?: Partial<{
    value: string;
    status: FieldStatus;
    confidence: number;
    note: string;
  }>;
  date?: Partial<{
    value: string;
    status: FieldStatus;
    confidence: number;
    note: string;
  }>;
  time?: Partial<{
    value: string;
    status: FieldStatus;
    confidence: number;
    note: string;
  }>;
  duration?: Partial<{
    value: string;
    status: FieldStatus;
    confidence: number;
    note: string;
  }>;
  schedule?: Partial<{
    scheduleModeCode: ActivityTimingDraftPp1["scheduleModeCode"];
    scheduledDate: string;
    scheduleStartDate: string;
    scheduleEndDate: string;
    deadlineLocal: string;
    startedAtLocal: string;
    endedAtLocal: string;
    durationMinutes: string | number;
    observedDate: string;
    confidence: number;
    note: string;
  }>;
  categories?: Array<Partial<{
    label: string;
    status: FieldStatus;
    confidence: number;
    note: string;
  }>>;
  valueObjectCandidates?: Array<Partial<{
    title: string;
    status: FieldStatus;
    confidence: number;
    note: string;
  }>>;
  factPreviews?: Array<Partial<{
    type: string;
    value: string;
    unit: string;
    status: FieldStatus;
    confidence: number;
    note: string;
  }>>;
  summary?: string;
  missingFields?: string[];
  warnings?: string[];
};

const LOCALES: Locale[] = ["en", "pl", "ru", "uk", "de", "es", "cs"];

const LABELS: Record<Locale, Record<string, string>> = {
  pl: {
    sourceText: "Tekst ÅºrÃ³dÅ‚owy",
    activityTitle: "TytuÅ‚ aktywnoÅ›ci",
    intent: "Intencja",
    date: "Data",
    time: "Czas",
    duration: "Czas trwania",
    categories: "Kategorie",
    vo: "Kandydaci VO",
    facts: "PodglÄ…d faktÃ³w",
    noText: "Brak tekstu",
    noExactTime: "Nie wykryto dokÅ‚adnej godziny",
    noDuration: "Nie wykryto czasu trwania",
    noDate: "Nie wykryto daty",
    noVoLookup: "Rzeczywisty lookup VO nie jest jeszcze podÅ‚Ä…czony.",
    previewOnly: "PodglÄ…d bez zapisu.",
    modelSummary: "Model AI przygotowaÅ‚ pakiet pÃ³l bez zapisu.",
    fallbackSummary: "UÅ¼yto bezpiecznego lokalnego fallbacku, bo model nie zwrÃ³ciÅ‚ pakietu.",
  },
  en: {
    sourceText: "Source text",
    activityTitle: "Activity title",
    intent: "Intent",
    date: "Date",
    time: "Time",
    duration: "Duration",
    categories: "Categories",
    vo: "VO candidates",
    facts: "Fact preview",
    noText: "No text",
    noExactTime: "No exact time detected",
    noDuration: "No duration detected",
    noDate: "No date detected",
    noVoLookup: "Real VO lookup is not connected yet.",
    previewOnly: "Preview without saving.",
    modelSummary: "The AI model prepared a no-write field package.",
    fallbackSummary: "Safe local fallback was used because the model did not return a package.",
  },
  ru: {
    sourceText: "Ð˜ÑÑ…Ð¾Ð´Ð½Ñ‹Ð¹ Ñ‚ÐµÐºÑÑ‚",
    activityTitle: "Ð—Ð°Ð³Ð¾Ð»Ð¾Ð²Ð¾Ðº Ð°ÐºÑ‚Ð¸Ð²Ð½Ð¾ÑÑ‚Ð¸",
    intent: "ÐÐ°Ð¼ÐµÑ€ÐµÐ½Ð¸Ðµ",
    date: "Ð”Ð°Ñ‚Ð°",
    time: "Ð’Ñ€ÐµÐ¼Ñ",
    duration: "Ð”Ð»Ð¸Ñ‚ÐµÐ»ÑŒÐ½Ð¾ÑÑ‚ÑŒ",
    categories: "ÐšÐ°Ñ‚ÐµÐ³Ð¾Ñ€Ð¸Ð¸",
    vo: "ÐšÐ°Ð½Ð´Ð¸Ð´Ð°Ñ‚Ñ‹ VO",
    facts: "ÐŸÑ€ÐµÐ´Ð¿Ñ€Ð¾ÑÐ¼Ð¾Ñ‚Ñ€ Ñ„Ð°ÐºÑ‚Ð¾Ð²",
    noText: "Ð¢ÐµÐºÑÑ‚Ð° Ð½ÐµÑ‚",
    noExactTime: "Ð¢Ð¾Ñ‡Ð½Ð¾Ðµ Ð²Ñ€ÐµÐ¼Ñ Ð½Ðµ Ð½Ð°Ð¹Ð´ÐµÐ½Ð¾",
    noDuration: "Ð”Ð»Ð¸Ñ‚ÐµÐ»ÑŒÐ½Ð¾ÑÑ‚ÑŒ Ð½Ðµ Ð½Ð°Ð¹Ð´ÐµÐ½Ð°",
    noDate: "Ð”Ð°Ñ‚Ð° Ð½Ðµ Ð½Ð°Ð¹Ð´ÐµÐ½Ð°",
    noVoLookup: "Ð ÐµÐ°Ð»ÑŒÐ½Ñ‹Ð¹ Ð¿Ð¾Ð¸ÑÐº VO ÐµÑ‰Ñ‘ Ð½Ðµ Ð¿Ð¾Ð´ÐºÐ»ÑŽÑ‡Ñ‘Ð½.",
    previewOnly: "ÐŸÑ€ÐµÐ´Ð¿Ñ€Ð¾ÑÐ¼Ð¾Ñ‚Ñ€ Ð±ÐµÐ· ÑÐ¾Ñ…Ñ€Ð°Ð½ÐµÐ½Ð¸Ñ.",
    modelSummary: "AI-Ð¼Ð¾Ð´ÐµÐ»ÑŒ Ð¿Ð¾Ð´Ð³Ð¾Ñ‚Ð¾Ð²Ð¸Ð»Ð° Ð¿Ð°ÐºÐµÑ‚ Ð¿Ð¾Ð»ÐµÐ¹ Ð±ÐµÐ· Ð·Ð°Ð¿Ð¸ÑÐ¸.",
    fallbackSummary: "Ð˜ÑÐ¿Ð¾Ð»ÑŒÐ·Ð¾Ð²Ð°Ð½ Ð±ÐµÐ·Ð¾Ð¿Ð°ÑÐ½Ñ‹Ð¹ Ð»Ð¾ÐºÐ°Ð»ÑŒÐ½Ñ‹Ð¹ fallback, Ð¿Ð¾Ñ‚Ð¾Ð¼Ñƒ Ñ‡Ñ‚Ð¾ Ð¼Ð¾Ð´ÐµÐ»ÑŒ Ð½Ðµ Ð²ÐµÑ€Ð½ÑƒÐ»Ð° Ð¿Ð°ÐºÐµÑ‚.",
  },
  uk: {
    sourceText: "Ð’Ð¸Ñ…Ñ–Ð´Ð½Ð¸Ð¹ Ñ‚ÐµÐºÑÑ‚",
    activityTitle: "Ð—Ð°Ð³Ð¾Ð»Ð¾Ð²Ð¾Ðº Ð°ÐºÑ‚Ð¸Ð²Ð½Ð¾ÑÑ‚Ñ–",
    intent: "ÐÐ°Ð¼Ñ–Ñ€",
    date: "Ð”Ð°Ñ‚Ð°",
    time: "Ð§Ð°Ñ",
    duration: "Ð¢Ñ€Ð¸Ð²Ð°Ð»Ñ–ÑÑ‚ÑŒ",
    categories: "ÐšÐ°Ñ‚ÐµÐ³Ð¾Ñ€Ñ–Ñ—",
    vo: "ÐšÐ°Ð½Ð´Ð¸Ð´Ð°Ñ‚Ð¸ VO",
    facts: "ÐŸÐµÑ€ÐµÐ´Ð¿ÐµÑ€ÐµÐ³Ð»ÑÐ´ Ñ„Ð°ÐºÑ‚Ñ–Ð²",
    noText: "Ð¢ÐµÐºÑÑ‚Ñƒ Ð½ÐµÐ¼Ð°Ñ”",
    noExactTime: "Ð¢Ð¾Ñ‡Ð½Ð¸Ð¹ Ñ‡Ð°Ñ Ð½Ðµ Ð·Ð½Ð°Ð¹Ð´ÐµÐ½Ð¾",
    noDuration: "Ð¢Ñ€Ð¸Ð²Ð°Ð»Ñ–ÑÑ‚ÑŒ Ð½Ðµ Ð·Ð½Ð°Ð¹Ð´ÐµÐ½Ð°",
    noDate: "Ð”Ð°Ñ‚Ð° Ð½Ðµ Ð·Ð½Ð°Ð¹Ð´ÐµÐ½Ð°",
    noVoLookup: "Ð ÐµÐ°Ð»ÑŒÐ½Ð¸Ð¹ Ð¿Ð¾ÑˆÑƒÐº VO Ñ‰Ðµ Ð½Ðµ Ð¿Ñ–Ð´ÐºÐ»ÑŽÑ‡ÐµÐ½Ð¾.",
    previewOnly: "ÐŸÐµÑ€ÐµÐ´Ð¿ÐµÑ€ÐµÐ³Ð»ÑÐ´ Ð±ÐµÐ· Ð·Ð±ÐµÑ€ÐµÐ¶ÐµÐ½Ð½Ñ.",
    modelSummary: "AI-Ð¼Ð¾Ð´ÐµÐ»ÑŒ Ð¿Ñ–Ð´Ð³Ð¾Ñ‚ÑƒÐ²Ð°Ð»Ð° Ð¿Ð°ÐºÐµÑ‚ Ð¿Ð¾Ð»Ñ–Ð² Ð±ÐµÐ· Ð·Ð°Ð¿Ð¸ÑÑƒ.",
    fallbackSummary: "Ð’Ð¸ÐºÐ¾Ñ€Ð¸ÑÑ‚Ð°Ð½Ð¾ Ð±ÐµÐ·Ð¿ÐµÑ‡Ð½Ð¸Ð¹ Ð»Ð¾ÐºÐ°Ð»ÑŒÐ½Ð¸Ð¹ fallback, Ð±Ð¾ Ð¼Ð¾Ð´ÐµÐ»ÑŒ Ð½Ðµ Ð¿Ð¾Ð²ÐµÑ€Ð½ÑƒÐ»Ð° Ð¿Ð°ÐºÐµÑ‚.",
  },
  de: {
    sourceText: "Quelltext",
    activityTitle: "AktivitÃ¤tstitel",
    intent: "Absicht",
    date: "Datum",
    time: "Zeit",
    duration: "Dauer",
    categories: "Kategorien",
    vo: "VO-Kandidaten",
    facts: "Faktenvorschau",
    noText: "Kein Text",
    noExactTime: "Keine genaue Uhrzeit erkannt",
    noDuration: "Keine Dauer erkannt",
    noDate: "Kein Datum erkannt",
    noVoLookup: "Echter VO-Lookup ist noch nicht verbunden.",
    previewOnly: "Vorschau ohne Speichern.",
    modelSummary: "Das AI-Modell hat ein No-Write-Feldpaket erstellt.",
    fallbackSummary: "Sicherer lokaler Fallback wurde verwendet, weil das Modell kein Paket zurÃ¼ckgab.",
  },
  es: {
    sourceText: "Texto fuente",
    activityTitle: "TÃ­tulo de actividad",
    intent: "IntenciÃ³n",
    date: "Fecha",
    time: "Hora",
    duration: "DuraciÃ³n",
    categories: "CategorÃ­as",
    vo: "Candidatos VO",
    facts: "Vista previa de hechos",
    noText: "Sin texto",
    noExactTime: "No se detectÃ³ hora exacta",
    noDuration: "No se detectÃ³ duraciÃ³n",
    noDate: "No se detectÃ³ fecha",
    noVoLookup: "La bÃºsqueda real de VO aÃºn no estÃ¡ conectada.",
    previewOnly: "Vista previa sin guardar.",
    modelSummary: "El modelo AI preparÃ³ un paquete de campos sin escritura.",
    fallbackSummary: "Se usÃ³ fallback local seguro porque el modelo no devolviÃ³ paquete.",
  },
  cs: {
    sourceText: "ZdrojovÃ½ text",
    activityTitle: "NÃ¡zev aktivity",
    intent: "ZÃ¡mÄ›r",
    date: "Datum",
    time: "ÄŒas",
    duration: "TrvÃ¡nÃ­",
    categories: "Kategorie",
    vo: "VO kandidÃ¡ti",
    facts: "NÃ¡hled faktÅ¯",
    noText: "Bez textu",
    noExactTime: "Nebyl zjiÅ¡tÄ›n pÅ™esnÃ½ Äas",
    noDuration: "Nebyla zjiÅ¡tÄ›na dÃ©lka",
    noDate: "Nebylo zjiÅ¡tÄ›no datum",
    noVoLookup: "ReÃ¡lnÃ½ VO lookup zatÃ­m nenÃ­ pÅ™ipojen.",
    previewOnly: "NÃ¡hled bez uloÅ¾enÃ­.",
    modelSummary: "AI model pÅ™ipravil balÃ­k polÃ­ bez zÃ¡pisu.",
    fallbackSummary: "Byl pouÅ¾it bezpeÄnÃ½ lokÃ¡lnÃ­ fallback, protoÅ¾e model nevrÃ¡til balÃ­k.",
  },
};

function normalizeLocale(value: unknown): Locale {
  return typeof value === "string" && LOCALES.includes(value as Locale)
    ? (value as Locale)
    : "pl";
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStatus(value: unknown, fallback: FieldStatus): FieldStatus {
  return value === "ready" || value === "candidate" || value === "missing"
    ? value
    : fallback;
}

function normalizeConfidence(value: unknown, fallback = 0.5): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(1, value))
    : fallback;
}

function includesAny(text: string, markers: string[]) {
  return markers.some((marker) => text.includes(marker));
}

function inferIntent(lower: string): IntentValue {
  if (
    includesAny(lower, [
      "Ð¿Ð»Ð°Ð½Ð¸Ñ€",
      "Ð¿Ð»Ð°Ð½ÑƒÑŽ",
      "Ð¿Ð¾Ð¹Ð´Ñƒ",
      "Ð±ÑƒÐ´Ñƒ",
      "ÑÐ¾Ð±Ð¸Ñ€Ð°ÑŽÑÑŒ",
      "Ð·Ð°Ð¼ierz",
      "planuj",
      "pÃ³jdÄ™",
      "pojde",
      "i will",
      "going to",
      "tomorrow",
      "jutro",
      "Ð·Ð°Ð²Ñ‚Ñ€Ð°",
      "Ñ‡ÐµÑ€ÐµÐ·",
      "za ",
      "in ",
      "maÃ±ana",
      "manana",
      "morgen",
      "zitra",
      "zÃ­tra",
    ])
  ) {
    return "planned_activity";
  }

  if (
    includesAny(lower, [
      "ÑÐ´ÐµÐ»Ð°Ð»",
      "ÑÐ´ÐµÐ»Ð°Ð»Ð°",
      "Ð¿Ñ€Ð¾ÑˆÑ‘Ð»",
      "Ð¿Ñ€Ð¾ÑˆÐ»Ð°",
      "Ð¿Ñ€Ð¾Ð±ÐµÐ¶Ð°Ð»",
      "byÅ‚em",
      "zrobiÅ‚em",
      "done",
      "completed",
      "did ",
      "hice",
      "udÄ›lal",
    ])
  ) {
    return "actual_fact";
  }

  return "ambiguous_activity";
}

function inferActivityTitle(raw: string, locale: Locale): string {
  const lower = raw.toLowerCase();

  if (includesAny(lower, ["Ð¿Ð¾ÐºÑƒÐ¿", "Ð·Ð°ÐºÑƒÐ¿", "shopping", "shop", "grocery", "zakup", "compras", "compra", "einkauf", "nÃ¡kup", "nakup"])) {
    return locale === "pl" ? "Zakupy" : locale === "en" ? "Shopping" : locale === "es" ? "Compras" : locale === "de" ? "Einkauf" : locale === "cs" ? "NÃ¡kup" : locale === "uk" ? "ÐŸÐ¾ÐºÑƒÐ¿ÐºÐ¸" : "ÐŸÐ¾ÐºÑƒÐ¿ÐºÐ¸";
  }

  if (includesAny(lower, ["Ð±ÐµÐ³", "Ð¿Ð¾Ð±ÐµÐ³", "Ð±Ñ–Ð¶", "Ð±Ñ–Ð³", "running", "run", "jog", "bieg", "pobieg", "laufen", "correr", "bÄ›h", "behat"])) {
    return locale === "pl" ? "Bieganie" : locale === "en" ? "Running" : locale === "es" ? "Correr" : locale === "de" ? "Laufen" : locale === "cs" ? "BÄ›h" : locale === "uk" ? "ÐŸÑ€Ð¾Ð±Ñ–Ð¶ÐºÐ°" : "ÐŸÑ€Ð¾Ð±ÐµÐ¶ÐºÐ°";
  }

  if (includesAny(lower, ["ÑÑ‚Ð¾Ð¼Ð°Ñ‚Ð¾Ð»Ð¾Ð³", "dentist", "dentysta", "zahnarzt", "dentista", "zubaÅ™"])) {
    return locale === "pl" ? "Wizyta u dentysty" : locale === "en" ? "Dentist appointment" : locale === "es" ? "Cita con dentista" : locale === "de" ? "Zahnarzttermin" : locale === "cs" ? "NÃ¡vÅ¡tÄ›va zubaÅ™e" : locale === "uk" ? "Ð’Ñ–Ð·Ð¸Ñ‚ Ð´Ð¾ ÑÑ‚Ð¾Ð¼Ð°Ñ‚Ð¾Ð»Ð¾Ð³Ð°" : "ÐŸÑ€Ð¸Ñ‘Ð¼ Ñƒ ÑÑ‚Ð¾Ð¼Ð°Ñ‚Ð¾Ð»Ð¾Ð³Ð°";
  }

  return raw.trim().length > 0 ? raw.trim().slice(0, 70) : LABELS[locale].noText;
}

function inferCategories(raw: string, locale: Locale): string[] {
  const lower = raw.toLowerCase();

  if (includesAny(lower, ["Ð¿Ð¾ÐºÑƒÐ¿", "shopping", "shop", "grocery", "zakup", "compra", "einkauf", "nÃ¡kup", "nakup"])) {
    return locale === "pl"
      ? ["Osobiste", "Dom", "Zakupy"]
      : locale === "en"
        ? ["Personal", "Household", "Shopping"]
        : locale === "es"
          ? ["Personal", "Hogar", "Compras"]
          : locale === "de"
            ? ["PersÃ¶nlich", "Haushalt", "Einkauf"]
            : locale === "cs"
              ? ["OsobnÃ­", "DomÃ¡cnost", "NÃ¡kup"]
              : locale === "uk"
                ? ["ÐžÑÐ¾Ð±Ð¸ÑÑ‚Ðµ", "ÐŸÐ¾Ð±ÑƒÑ‚", "ÐŸÐ¾ÐºÑƒÐ¿ÐºÐ¸"]
                : ["Ð›Ð¸Ñ‡Ð½Ð¾Ðµ", "Ð‘Ñ‹Ñ‚", "ÐŸÐ¾ÐºÑƒÐ¿ÐºÐ¸"];
  }

  if (includesAny(lower, ["Ð±ÐµÐ³", "running", "run", "jog", "bieg", "laufen", "correr", "bÄ›h", "Ð±Ñ–Ð³"])) {
    return locale === "pl"
      ? ["Zdrowie", "Ruch", "WytrzymaÅ‚oÅ›Ä‡"]
      : locale === "en"
        ? ["Health", "Movement", "Endurance"]
        : locale === "es"
          ? ["Salud", "Movimiento", "Resistencia"]
          : locale === "de"
            ? ["Gesundheit", "Bewegung", "Ausdauer"]
            : locale === "cs"
              ? ["ZdravÃ­", "Pohyb", "Vytrvalost"]
              : locale === "uk"
                ? ["Ð—Ð´Ð¾Ñ€Ð¾Ð²Ê¼Ñ", "Ð ÑƒÑ…", "Ð’Ð¸Ñ‚Ñ€Ð¸Ð²Ð°Ð»Ñ–ÑÑ‚ÑŒ"]
                : ["Ð—Ð´Ð¾Ñ€Ð¾Ð²ÑŒÐµ", "Ð”Ð²Ð¸Ð¶ÐµÐ½Ð¸Ðµ", "Ð’Ñ‹Ð½Ð¾ÑÐ»Ð¸Ð²Ð¾ÑÑ‚ÑŒ"];
  }

  return locale === "pl"
    ? ["Osobiste"]
    : locale === "en"
      ? ["Personal"]
      : locale === "es"
        ? ["Personal"]
        : locale === "de"
          ? ["PersÃ¶nlich"]
          : locale === "cs"
            ? ["OsobnÃ­"]
            : locale === "uk"
              ? ["ÐžÑÐ¾Ð±Ð¸ÑÑ‚Ðµ"]
              : ["Ð›Ð¸Ñ‡Ð½Ð¾Ðµ"];
}

function field(key: string, label: string, value: string, status: FieldStatus, note: string, confidence: number): ReviewField {
  return {
    key,
    label,
    value,
    status,
    note,
    confidence: normalizeConfidence(confidence),
  };
}

function countFields(fields: ReviewField[]): Record<FieldStatus, number> {
  return {
    ready: fields.filter((item) => item.status === "ready").length,
    candidate: fields.filter((item) => item.status === "candidate").length,
    missing: fields.filter((item) => item.status === "missing").length,
  };
}

function buildRuleApplicationPayload(
  rules: CalendarAiRuleResolution,
  shortcut: CalendarAiRuleShortcut | null,
): RuleApplicationPayload {
  return {
    source: rules.source,
    locale: rules.locale,
    fallbackLocale: rules.fallbackLocale,
    ruleVersion: rules.ruleVersion,
    updatedAt: rules.updatedAt,
    matched: Boolean(shortcut),
    matchedPhrase: shortcut?.matchedPhrase ?? null,
    targetTitles: shortcut?.targetTitles ?? [],
  };
}

function normalizeTemporalDirection(value: unknown): ActivityTemporalDirectionPp1 {
  return value === "past" ? "past" : "future";
}

function timingDisplayParts(
  draft: ActivityTimingDraftPp1,
  labels: Record<string, string>,
) {
  let date = "";
  let time = "";

  if (draft.scheduleModeCode === "date_only") {
    date = draft.scheduledDate;
  } else if (draft.scheduleModeCode === "date_range") {
    date = [draft.scheduleStartDate, draft.scheduleEndDate].filter(Boolean).join(" â€“ ");
  } else if (draft.scheduleModeCode === "deadline") {
    date = draft.deadlineLocal.slice(0, 10);
    time = draft.deadlineLocal.slice(11, 16);
  } else if (draft.scheduleModeCode === "exact") {
    date = draft.startedAtLocal.slice(0, 10);
    const start = draft.startedAtLocal.slice(11, 16);
    const end = draft.endedAtLocal.slice(11, 16);
    time = [start, end].filter(Boolean).join(" â€“ ");
  } else if (draft.observedDate) {
    date = draft.observedDate;
    const start = draft.startedAtLocal.slice(11, 16);
    const end = draft.endedAtLocal.slice(11, 16);
    time = [start, end].filter(Boolean).join(" â€“ ");
  }

  return {
    date: date || labels.noDate,
    time: time || labels.noExactTime,
    duration: draft.durationMinutes
      ? `${draft.durationMinutes} min`
      : labels.noDuration,
    hasDate: Boolean(date),
    hasTime: Boolean(time),
    hasDuration: Boolean(draft.durationMinutes),
  };
}

function normalizeModelTimingDraft(
  value: ModelShape["schedule"],
  temporalDirection: ActivityTemporalDirectionPp1,
) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate: Partial<ActivityTimingDraftPp1> = {};
  const mode = value.scheduleModeCode;

  if (
    mode === "unscheduled" ||
    mode === "date_only" ||
    mode === "date_range" ||
    mode === "deadline" ||
    mode === "exact"
  ) {
    candidate.scheduleModeCode = mode;
  }

  for (const key of [
    "scheduledDate",
    "scheduleStartDate",
    "scheduleEndDate",
    "deadlineLocal",
    "startedAtLocal",
    "endedAtLocal",
    "observedDate",
  ] as const) {
    const normalized = asText(value[key]);

    if (normalized) {
      candidate[key] = normalized;
    }
  }

  if (typeof value.durationMinutes === "number" && Number.isFinite(value.durationMinutes)) {
    candidate.durationMinutes = String(Math.round(value.durationMinutes));
  } else {
    const normalizedDuration = asText(value.durationMinutes);

    if (normalizedDuration) {
      candidate.durationMinutes = normalizedDuration;
    }
  }

  const draft = mergeActivityTimingDraftPp1(
    inferActivityTimingDraftPp1("", temporalDirection),
    candidate,
  );

  return validateActivityTimingDraftPp1(draft, temporalDirection).ok
    ? draft
    : null;
}

function mergeDeterministicAndModelTiming(
  deterministic: ActivityTimingDraftPp1,
  modelTiming: ActivityTimingDraftPp1 | null,
  temporalDirection: ActivityTemporalDirectionPp1,
) {
  if (!modelTiming) {
    return deterministic;
  }

  const deterministicHasSchedule =
    temporalDirection === "past"
      ? Boolean(
          deterministic.observedDate ||
          deterministic.startedAtLocal ||
          deterministic.endedAtLocal ||
          deterministic.durationMinutes
        )
      : deterministic.scheduleModeCode !== "unscheduled" ||
        Boolean(deterministic.durationMinutes);

  if (!deterministicHasSchedule) {
    return modelTiming;
  }

  return mergeActivityTimingDraftPp1(modelTiming, deterministic);
}

function buildFallbackPackage(
  rawText: string,
  locale: Locale,
  modelError: string | null,
  temporalDirection: ActivityTemporalDirectionPp1,
  rules: CalendarAiRuleResolution,
  now = new Date(),
): ReviewPayload {
  const labels = LABELS[locale];
  const raw = rawText.trim();
  const lower = raw.toLowerCase();
  const intent = inferIntent(lower);
  const shortcut = applyCalendarAiRuleShortcut({
    rawText: raw,
    rules,
    temporalDirection,
    now,
  });
  const title = shortcut?.title || inferActivityTitle(raw, locale);
  const timingDraft = shortcut?.timingDraft
    ?? inferActivityTimingDraftPp1(raw, temporalDirection, now);
  const timing = timingDisplayParts(timingDraft, labels);
  const categories = inferCategories(raw, locale);
  const voCandidates = categories.slice(0, 3);
  const factPreview = intent === "ordinary_chat"
    ? "ordinary_chat / preview only"
    : `${intent} / event / candidate`;

  const fields = [
    field("sourceText", labels.sourceText, raw || labels.noText, raw ? "ready" : "missing", "calendar input", raw ? 1 : 0.1),
    field("activityTitle", labels.activityTitle, title, title === labels.noText ? "missing" : "ready", "fallback semantic title", raw ? 0.72 : 0.1),
    field("intent", labels.intent, intent, "ready", "planned/fact/ambiguous decision", 0.7),
    field("date", labels.date, timing.date, timing.hasDate ? "ready" : "missing", "deterministic temporal extraction; no artificial defaults", timing.hasDate ? 0.92 : 0.1),
    field("time", labels.time, timing.time, timing.hasTime ? "ready" : "missing", "deterministic time extraction; no artificial defaults", timing.hasTime ? 0.92 : 0.1),
    field("duration", labels.duration, timing.duration, timing.hasDuration ? "ready" : "missing", "deterministic duration extraction; no artificial defaults", timing.hasDuration ? 0.92 : 0.1),
    field("categories", labels.categories, categories.join(" / "), categories.length ? "candidate" : "missing", "semantic category candidates", categories.length ? 0.65 : 0.1),
    field("vo", labels.vo, voCandidates.join(" / ") || labels.noVoLookup, voCandidates.length ? "candidate" : "missing", labels.noVoLookup, voCandidates.length ? 0.55 : 0.1),
    field("facts", labels.facts, factPreview, "candidate", labels.previewOnly, 0.6),
  ];

  return {
    ok: true,
    route: "/api/calendar/activity-review/semantic-preview",
    routeMode: "calendar_activity_review_no_write_v1",
    source: "fallback",
    modelBacked: false,
    modelName: null,
    modelAttempted: Boolean(modelError),
    modelError,
    rawText: raw,
    locale,
    intent,
    activityTitle: title,
    summary: labels.fallbackSummary,
    timingDraft,
    fields,
    counters: countFields(fields),
    safety: {
      previewOnly: true,
      dbWriteExecuted: false,
      sqlExecuted: false,
      factCreated: false,
      planCreated: false,
      valueObjectCreated: false,
      timeBlockCreated: false,
    },
    warnings: [
      "Fallback parser was used.",
      ...(shortcut ? ["A personal deterministic shortcut was applied after explicit message data."] : []),
      "Unknown date, time and duration remain unknown.",
      "No DB write was executed.",
      "No Activity Event, Time Block, Fact or Value Object was created.",
    ],
    rules: buildRuleApplicationPayload(rules, shortcut),
  };
}

function stripJsonFences(value: string) {
  const trimmed = value.trim();
  return trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function toModelField(
  key: string,
  label: string,
  candidate: Partial<{ value: string; status: FieldStatus; confidence: number; note: string }> | undefined,
  fallbackValue: string,
  fallbackStatus: FieldStatus,
  fallbackNote: string
): ReviewField {
  const value = asText(candidate?.value) || fallbackValue;
  return field(
    key,
    label,
    value,
    normalizeStatus(candidate?.status, fallbackStatus),
    asText(candidate?.note) || fallbackNote,
    normalizeConfidence(candidate?.confidence, fallbackStatus === "missing" ? 0.2 : 0.7)
  );
}

function normalizeModelPackage(
  rawText: string,
  locale: Locale,
  modelName: string,
  model: ModelShape,
  temporalDirection: ActivityTemporalDirectionPp1,
  rules: CalendarAiRuleResolution,
  now: Date,
): ReviewPayload {
  const labels = LABELS[locale];

  const categories = Array.isArray(model.categories)
    ? model.categories
        .map((item) => asText(item.label))
        .filter(Boolean)
        .slice(0, 5)
    : [];

  const voCandidates = Array.isArray(model.valueObjectCandidates)
    ? model.valueObjectCandidates
        .map((item) => asText(item.title))
        .filter(Boolean)
        .slice(0, 5)
    : [];

  const factPreviews = Array.isArray(model.factPreviews)
    ? model.factPreviews
        .map((item) => {
          const type = asText(item.type);
          const value = asText(item.value);
          const unit = asText(item.unit);
          return [type, value, unit].filter(Boolean).join(" / ");
        })
        .filter(Boolean)
        .slice(0, 5)
    : [];

  const fallback = buildFallbackPackage(
    rawText,
    locale,
    null,
    temporalDirection,
    rules,
    now,
  );
  const intentValue =
    model.intent?.value === "actual_fact" ||
    model.intent?.value === "planned_activity" ||
    model.intent?.value === "ordinary_chat" ||
    model.intent?.value === "ambiguous_activity"
      ? model.intent.value
      : fallback.intent;

  const activityTitle = fallback.rules.matched
    ? fallback.activityTitle
    : asText(model.activityTitle?.value) || fallback.activityTitle;
  const modelTiming = normalizeModelTimingDraft(model.schedule, temporalDirection);
  const timingDraft = mergeDeterministicAndModelTiming(
    fallback.timingDraft,
    modelTiming,
    temporalDirection,
  );
  const timing = timingDisplayParts(timingDraft, labels);

  const fields = [
    field("sourceText", labels.sourceText, rawText, "ready", "calendar input", 1),
    toModelField(
      "activityTitle",
      labels.activityTitle,
      fallback.rules.matched ? undefined : model.activityTitle,
      activityTitle,
      "ready",
      fallback.rules.matched ? "personal deterministic shortcut" : "model semantic title",
    ),
    toModelField(
      "intent",
      labels.intent,
      model.intent
        ? {
            value: intentValue,
            status: model.intent.status,
            confidence: model.intent.confidence,
            note: model.intent.note,
          }
        : undefined,
      intentValue,
      "ready",
      "model intent decision",
    ),
    field("date", labels.date, timing.date, timing.hasDate ? "ready" : "missing", "normalized timing contract; explicit text wins; no artificial defaults", timing.hasDate ? 0.96 : 0.1),
    field("time", labels.time, timing.time, timing.hasTime ? "ready" : "missing", "normalized timing contract; an explicit interval is exact time", timing.hasTime ? 0.96 : 0.1),
    field("duration", labels.duration, timing.duration, timing.hasDuration ? "ready" : "missing", "normalized duration; no artificial defaults", timing.hasDuration ? 0.96 : 0.1),
    field(
      "categories",
      labels.categories,
      categories.length
        ? categories.join(" / ")
        : fallback.fields.find((item) => item.key === "categories")?.value ?? "",
      categories.length ? "candidate" : "missing",
      "model semantic category candidates",
      categories.length ? 0.82 : 0.2,
    ),
    field(
      "vo",
      labels.vo,
      voCandidates.length ? voCandidates.join(" / ") : labels.noVoLookup,
      voCandidates.length ? "candidate" : "missing",
      "model VO candidates only; real lookup is handled by the selector",
      voCandidates.length ? 0.72 : 0.2,
    ),
    field(
      "facts",
      labels.facts,
      factPreviews.length ? factPreviews.join("; ") : `${intentValue} / candidate`,
      "candidate",
      labels.previewOnly,
      0.72,
    ),
  ];

  return {
    ok: true,
    route: "/api/calendar/activity-review/semantic-preview",
    routeMode: "calendar_activity_review_no_write_v1",
    source: "model",
    modelBacked: true,
    modelName,
    modelAttempted: true,
    modelError: null,
    rawText,
    locale,
    intent: intentValue,
    activityTitle,
    summary: asText(model.summary) || labels.modelSummary,
    timingDraft,
    fields,
    counters: countFields(fields),
    safety: {
      previewOnly: true,
      dbWriteExecuted: false,
      sqlExecuted: false,
      factCreated: false,
      planCreated: false,
      valueObjectCreated: false,
      timeBlockCreated: false,
    },
    warnings: [
      ...(Array.isArray(model.warnings) ? model.warnings.map(asText).filter(Boolean) : []),
      ...(fallback.rules.matched ? ["A personal deterministic shortcut was applied after explicit message data."] : []),
      "Model output is preview-only.",
      "Unknown date, time and duration remain unknown.",
      "No DB write was executed.",
      "No Activity Event, Time Block, Fact or Value Object was created.",
    ],
    rules: fallback.rules,
  };
}

function dateKeyInTimeZone(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

async function runModelPreview(
  rawText: string,
  locale: Locale,
  temporalDirection: ActivityTemporalDirectionPp1,
  rules: CalendarAiRuleResolution,
  processingContext: Awaited<ReturnType<typeof resolveCurrentActorAiProcessingContext>>,
  now: Date,
): Promise<ReviewPayload | null> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  const modelName =
    process.env.OPENAI_ACTIVITY_PREVIEW_MODEL ||
    process.env.OPENAI_MODEL ||
    "gpt-4o-mini";

  const labels = LABELS[locale];
  const timeZone = "Europe/Warsaw";
  const currentDate = dateKeyInTimeZone(now, timeZone);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelName,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: processingContext.systemPrompt,
        },
        {
          role: "user",
          content: JSON.stringify({
            locale,
            rawText,
            temporalDirection,
            currentDate,
            timeZone,
            personalRuleGuidance: buildCalendarAiRulePrompt(rules),
            personalProcessingGuidance: processingContext.actorInstructionText,
            processingInstructionContext: processingContext.publicMetadata,
            interpretationPriority: [
              "explicit_current_message",
              "personal_user_rules",
              "arctor_standard_rules",
              "user_clarification",
            ],
            requiredJsonShape: {
              intent: {
                value: "planned_activity | actual_fact | ambiguous_activity | ordinary_chat",
                status: "ready | candidate | missing",
                confidence: "0..1",
                note: "short reason",
              },
              activityTitle: {
                value: "short normalized title in the user's language if possible",
                status: "ready | candidate | missing",
                confidence: "0..1",
                note: "short reason",
              },
              schedule: {
                scheduleModeCode: "unscheduled | date_only | date_range | deadline | exact",
                scheduledDate: "YYYY-MM-DD or empty",
                scheduleStartDate: "YYYY-MM-DD or empty",
                scheduleEndDate: "YYYY-MM-DD or empty",
                deadlineLocal: "YYYY-MM-DDTHH:mm or empty",
                startedAtLocal: "YYYY-MM-DDTHH:mm or empty",
                endedAtLocal: "YYYY-MM-DDTHH:mm or empty",
                durationMinutes: "positive integer as string, or empty",
                observedDate: "YYYY-MM-DD or empty",
                confidence: "0..1",
                note: "short explanation",
              },
              date: {
                value: "human-readable extracted date or empty",
                status: "ready | candidate | missing",
                confidence: "0..1",
                note: "short reason",
              },
              time: {
                value: "human-readable start/end time or empty",
                status: "ready | candidate | missing",
                confidence: "0..1",
                note: "short reason",
              },
              duration: {
                value: "duration if explicitly present or derivable from explicit start/end; otherwise empty",
                status: "ready | candidate | missing",
                confidence: "0..1",
                note: "short reason",
              },
              categories: [
                {
                  label: "category candidate",
                  status: "candidate",
                  confidence: "0..1",
                  note: "short reason",
                },
              ],
              valueObjectCandidates: [
                {
                  title: "VO candidate title",
                  status: "candidate",
                  confidence: "0..1",
                  note: "preview only, no real lookup",
                },
              ],
              factPreviews: [
                {
                  type: "preview fact type",
                  value: "preview value",
                  unit: "unit",
                  status: "candidate",
                  confidence: "0..1",
                  note: "preview only",
                },
              ],
              summary: labels.modelSummary,
              missingFields: ["fields that need clarification"],
              warnings: ["no write"],
            },
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`OpenAI response ${response.status}: ${responseText.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };

  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI response did not include message content.");
  }

  const parsed = JSON.parse(stripJsonFences(content)) as ModelShape;
  return normalizeModelPackage(
    rawText,
    locale,
    modelName,
    parsed,
    temporalDirection,
    rules,
    now,
  );
}

async function resolveRulesForPreview(
  body: Record<string, unknown>,
  locale: Locale,
): Promise<CalendarAiRuleResolution> {
  const ruleLocale = normalizeCalendarAiRuleLocale(locale);
  const override = asText(body.personalRulesOverride);

  if (body.testRule === true && override) {
    const validated = validateCalendarAiRuleText(override);

    if (validated.ok) {
      const system = getSystemCalendarAiRuleResolution(ruleLocale);
      return {
        ...system,
        effectiveText: validated.value,
        customText: validated.value,
        source: "test_override",
      };
    }
  }

  try {
    const actorContext = await resolveOptionalCalendarAiRuleActorContext();

    if (actorContext) {
      return await readEffectiveCalendarAiRules(actorContext.appUserId, ruleLocale);
    }
  } catch {
    // Semantic preview remains available with immutable system defaults.
  }

  return getSystemCalendarAiRuleResolution(ruleLocale);
}

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};

  try {
    const parsed = await request.json();
    body = typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    body = {};
  }

  const rawText = asText(body.text ?? body.rawText).slice(0, 2000);
  const locale = normalizeLocale(body.locale);
  const temporalDirection = normalizeTemporalDirection(body.temporalDirection);
  const now = new Date();
  const rules = await resolveRulesForPreview(body, locale);

  const processingContext = await resolveCurrentActorAiProcessingContext({
    runtimeCode: "activity_semantic_preview",
    locale,
  });
  if (!rawText) {
    return NextResponse.json(
      buildFallbackPackage(
        "",
        locale,
        "empty input",
        temporalDirection,
        rules,
        now,
      ),
      { status: 200 },
    );
  }

  try {
    const modelPackage = await runModelPreview(
      rawText,
      locale,
      temporalDirection,
      rules,
      processingContext,

      now,
    );

    if (modelPackage) {
      return NextResponse.json(modelPackage, { status: 200 });
    }

    return NextResponse.json(
      buildFallbackPackage(
        rawText,
        locale,
        "OPENAI_API_KEY is not configured; model-backed preview was skipped.",
        temporalDirection,
        rules,
        now,
      ),
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown model error";
    return NextResponse.json(
      buildFallbackPackage(
        rawText,
        locale,
        message,
        temporalDirection,
        rules,
        now,
      ),
      { status: 200 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/calendar/activity-review/semantic-preview",
    routeMode: "calendar_activity_review_no_write_v1",
    purpose: "Model-backed Activity Review Package for calendar input; no writes.",
    safety: {
      previewOnly: true,
      dbWriteExecuted: false,
      sqlExecuted: false,
      factCreated: false,
      planCreated: false,
      valueObjectCreated: false,
      timeBlockCreated: false,
    },
  });
}
