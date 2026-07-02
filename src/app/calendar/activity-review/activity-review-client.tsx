"use client";

// CALENDAR_REAL_ACTIVITY_SEMANTIC_PREVIEW_V3
// CALENDAR_ACTIVITY_REVIEW_MODEL_BACKED_NO_WRITE_V1
// NO_DB_WRITE_ACTIVITY_REVIEW

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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

type SaveStatus = "idle" | "saving" | "error";

type PlannedSchedule = {
  start: Date;
  end: Date;
  startTime: string;
  endTime: string;
  focusDate: string;
  durationMinutes: number;
  label: string;
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
    actionPlan: "Dodaj",
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
    actionPlan: "Add",
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
    actionPlan: "Добавить",
    actionFact: "Подтверждение факта — позже",
    actionVo: "Связь с VO — позже",
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
    actionPlan: "Додати",
    actionFact: "Підтвердження факту — пізніше",
    actionVo: "Зв’язок з VO — пізніше",
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
    actionPlan: "Hinzufügen",
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
    actionPlan: "Přidat",
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


const ACTION_UI: Record<Locale, {
  add: string;
  saving: string;
  addError: string;
  factLater: string;
  voLater: string;
  scheduleLabel: string;
  defaultPolicy: string;
}> = {
  en: {
    add: "Add",
    saving: "Adding...",
    addError: "Could not add the calendar entry.",
    factLater: "Fact confirmation - later",
    voLater: "VO link - later",
    scheduleLabel: "Planned calendar entry",
    defaultPolicy: "Default policy: missing date/time => tomorrow 08:00; missing duration => 30 minutes.",
  },
  pl: {
    add: "Dodaj",
    saving: "Dodawanie...",
    addError: "Nie uda\u0142o si\u0119 doda\u0107 wpisu do kalendarza.",
    factLater: "Potwierdzenie faktu - p\u00f3\u017aniej",
    voLater: "Po\u0142\u0105czenie VO - p\u00f3\u017aniej",
    scheduleLabel: "Planowany wpis kalendarza",
    defaultPolicy: "Domy\u015blnie: brak daty/czasu => jutro 08:00; brak czasu trwania => 30 minut.",
  },
  ru: {
    add: "\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c",
    saving: "\u0414\u043e\u0431\u0430\u0432\u043b\u044f\u044e...",
    addError: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0434\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0437\u0430\u043f\u0438\u0441\u044c \u0432 \u043a\u0430\u043b\u0435\u043d\u0434\u0430\u0440\u044c.",
    factLater: "\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0435 \u0444\u0430\u043a\u0442\u0430 - \u043f\u043e\u0437\u0436\u0435",
    voLater: "\u0421\u0432\u044f\u0437\u044c \u0441 VO - \u043f\u043e\u0437\u0436\u0435",
    scheduleLabel: "\u041f\u043b\u0430\u043d\u043e\u0432\u0430\u044f \u0437\u0430\u043f\u0438\u0441\u044c \u043a\u0430\u043b\u0435\u043d\u0434\u0430\u0440\u044f",
    defaultPolicy: "\u041f\u043e \u0443\u043c\u043e\u043b\u0447\u0430\u043d\u0438\u044e: \u043d\u0435\u0442 \u0434\u0430\u0442\u044b/\u0432\u0440\u0435\u043c\u0435\u043d\u0438 => \u0437\u0430\u0432\u0442\u0440\u0430 08:00; \u043d\u0435\u0442 \u0434\u043b\u0438\u0442\u0435\u043b\u044c\u043d\u043e\u0441\u0442\u0438 => 30 \u043c\u0438\u043d\u0443\u0442.",
  },
  uk: {
    add: "\u0414\u043e\u0434\u0430\u0442\u0438",
    saving: "\u0414\u043e\u0434\u0430\u044e...",
    addError: "\u041d\u0435 \u0432\u0434\u0430\u043b\u043e\u0441\u044f \u0434\u043e\u0434\u0430\u0442\u0438 \u0437\u0430\u043f\u0438\u0441 \u0434\u043e \u043a\u0430\u043b\u0435\u043d\u0434\u0430\u0440\u044f.",
    factLater: "\u041f\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043d\u043d\u044f \u0444\u0430\u043a\u0442\u0443 - \u043f\u0456\u0437\u043d\u0456\u0448\u0435",
    voLater: "\u0417\u0432'\u044f\u0437\u043e\u043a \u0437 VO - \u043f\u0456\u0437\u043d\u0456\u0448\u0435",
    scheduleLabel: "\u041f\u043b\u0430\u043d\u043e\u0432\u0438\u0439 \u0437\u0430\u043f\u0438\u0441 \u043a\u0430\u043b\u0435\u043d\u0434\u0430\u0440\u044f",
    defaultPolicy: "\u0417\u0430 \u0437\u0430\u043c\u043e\u0432\u0447\u0443\u0432\u0430\u043d\u043d\u044f\u043c: \u043d\u0435\u043c\u0430\u0454 \u0434\u0430\u0442\u0438/\u0447\u0430\u0441\u0443 => \u0437\u0430\u0432\u0442\u0440\u0430 08:00; \u043d\u0435\u043c\u0430\u0454 \u0442\u0440\u0438\u0432\u0430\u043b\u043e\u0441\u0442\u0456 => 30 \u0445\u0432\u0438\u043b\u0438\u043d.",
  },
  de: {
    add: "Hinzuf\u00fcgen",
    saving: "Wird hinzugef\u00fcgt...",
    addError: "Kalendereintrag konnte nicht hinzugef\u00fcgt werden.",
    factLater: "Fakt-Best\u00e4tigung - sp\u00e4ter",
    voLater: "VO-Verkn\u00fcpfung - sp\u00e4ter",
    scheduleLabel: "Geplanter Kalendereintrag",
    defaultPolicy: "Standard: fehlendes Datum/Zeit => morgen 08:00; fehlende Dauer => 30 Minuten.",
  },
  es: {
    add: "A\u00f1adir",
    saving: "A\u00f1adiendo...",
    addError: "No se pudo a\u00f1adir la entrada al calendario.",
    factLater: "Confirmaci\u00f3n de hecho - m\u00e1s tarde",
    voLater: "Vincular VO - m\u00e1s tarde",
    scheduleLabel: "Entrada planificada del calendario",
    defaultPolicy: "Por defecto: sin fecha/hora => ma\u00f1ana 08:00; sin duraci\u00f3n => 30 minutos.",
  },
  cs: {
    add: "P\u0159idat",
    saving: "P\u0159id\u00e1v\u00e1m...",
    addError: "Nepoda\u0159ilo se p\u0159idat z\u00e1znam do kalend\u00e1\u0159e.",
    factLater: "Potvrzen\u00ed faktu - pozd\u011bji",
    voLater: "Propojen\u00ed VO - pozd\u011bji",
    scheduleLabel: "Pl\u00e1novan\u00fd z\u00e1znam kalend\u00e1\u0159e",
    defaultPolicy: "V\u00fdchoz\u00ed: chyb\u00ed datum/\u010das => z\u00edtra 08:00; chyb\u00ed trv\u00e1n\u00ed => 30 minut.",
  },
};

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



function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function dateKey(value: Date) {
  return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
}

function includesAnyText(value: string, markers: string[]) {
  return markers.some((marker) => value.includes(marker));
}

function extractDurationMinutes(rawText: string) {
  const lower = rawText.toLowerCase();

  if (includesAnyText(lower, ["полчас", "p\u00f3\u0142 godz", "pol godz", "half an hour", "half hour", "media hora", "halbe stunde", "p\u016fl hod"])) {
    return 30;
  }

  const minuteMatch = lower.match(/(\d{1,3})\s*(минут|мин|хвилин|хв|minute|minutes|minut|minuty|minuta|min|minutos|minuten)/i);
  if (minuteMatch) {
    const minutes = Number(minuteMatch[1]);
    return Number.isFinite(minutes) && minutes > 0 ? minutes : 30;
  }

  const hourMatch = lower.match(/(\d{1,2})\s*(час|часа|часов|годин|hour|hours|godz|hora|horas|stunde|stunden)/i);
  if (hourMatch) {
    const hours = Number(hourMatch[1]);
    return Number.isFinite(hours) && hours > 0 ? hours * 60 : 30;
  }

  return 30;
}

function extractExplicitClock(rawText: string): { hour: number; minute: number } | null {
  const lower = rawText.toLowerCase();
  const clock = lower.match(/(?:^|\s)(?:в|o|at|um|a las|às)?\s*(\d{1,2})[:.](\d{2})(?:\s|$)/i);

  if (clock) {
    const hour = Number(clock[1]);
    const minute = Number(clock[2]);

    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return { hour, minute };
    }
  }

  const hourOnly = lower.match(/(?:^|\s)(?:в|o|at|um)\s+(\d{1,2})(?:\s|$)/i);

  if (hourOnly) {
    const hour = Number(hourOnly[1]);

    if (hour >= 0 && hour <= 23) {
      return { hour, minute: 0 };
    }
  }

  return null;
}

function buildPlannedSchedule(rawText: string, locale: Locale): PlannedSchedule {
  const lower = rawText.toLowerCase();
  const now = new Date();
  const durationMinutes = extractDurationMinutes(rawText);
  let start: Date;

  if (includesAnyText(lower, ["через полчас", "через 30", "za p\u00f3\u0142 godz", "za pol godz", "in half an hour", "in 30"])) {
    start = new Date(now.getTime() + 30 * 60000);
  } else {
    const hasToday = includesAnyText(lower, ["сегодня", "сьогодні", "dzis", "dzi\u015b", "today", "hoy", "heute", "dnes"]);
    const dayOffset = hasToday ? 0 : 1;
    const explicit = extractExplicitClock(rawText);
    const isEvening = includesAnyText(lower, ["вечер", "вечером", "wiecz", "evening", "abend", "tarde", "ve\u010der"]);
    const isAfternoon = includesAnyText(lower, ["днем", "днём", "po po\u0142udniu", "afternoon", "nachmittag", "por la tarde"]);
    const hour = explicit?.hour ?? (isEvening ? 19 : isAfternoon ? 13 : 8);
    const minute = explicit?.minute ?? 0;

    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, hour, minute, 0, 0);
  }

  const end = new Date(start.getTime() + durationMinutes * 60000);
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
  const dateLabel = new Intl.DateTimeFormat(tag, { weekday: "short", day: "2-digit", month: "short" }).format(start);
  const timeLabel = `${pad2(start.getHours())}:${pad2(start.getMinutes())}-${pad2(end.getHours())}:${pad2(end.getMinutes())}`;

  return {
    start,
    end,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    focusDate: dateKey(start),
    durationMinutes,
    label: `${dateLabel}, ${timeLabel}`,
  };
}


function AnalysisLoadingPanel({ locale, loadingText }: { locale: Locale; loadingText: string }) {
  // CALENDAR_ACTIVITY_REVIEW_LOADING_PROGRESS_V6
  const stepText: Record<Locale, string[]> = {
    en: ["Reading the phrase", "Extracting time", "Suggesting categories", "Preparing preview package"],
    pl: ["Czytam fraz\u0119", "Wyodr\u0119bniam czas", "Proponuj\u0119 kategorie", "Przygotowuj\u0119 pakiet preview"],
    ru: ["\u0427\u0438\u0442\u0430\u044e \u0444\u0440\u0430\u0437\u0443", "\u0418\u0437\u0432\u043b\u0435\u043a\u0430\u044e \u0432\u0440\u0435\u043c\u044f", "\u041f\u0440\u0435\u0434\u043b\u0430\u0433\u0430\u044e \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u0438", "\u0413\u043e\u0442\u043e\u0432\u043b\u044e \u043f\u0430\u043a\u0435\u0442 preview"],
    uk: ["\u0427\u0438\u0442\u0430\u044e \u0444\u0440\u0430\u0437\u0443", "\u0412\u0438\u0434\u0456\u043b\u044f\u044e \u0447\u0430\u0441", "\u041f\u0440\u043e\u043f\u043e\u043d\u0443\u044e \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0456\u0457", "\u0413\u043e\u0442\u0443\u044e \u043f\u0430\u043a\u0435\u0442 preview"],
    de: ["Satz wird gelesen", "Zeit wird erkannt", "Kategorien werden vorgeschlagen", "Preview-Paket wird vorbereitet"],
    es: ["Leo la frase", "Extraigo el tiempo", "Propongo categor\u00edas", "Preparo el paquete preview"],
    cs: ["\u010ctu v\u011btu", "Zji\u0161\u0165uji \u010das", "Navrhuji kategorie", "P\u0159ipravuji preview bal\u00ed\u010dek"],
  };

  const safetyText: Record<Locale, string> = {
    en: "preview only - no fact - no plan - no VO - no time block",
    pl: "tylko preview - bez faktu - bez planu - bez VO - bez bloku czasu",
    ru: "\u0442\u043e\u043b\u044c\u043a\u043e preview - \u0431\u0435\u0437 \u0444\u0430\u043a\u0442\u0430 - \u0431\u0435\u0437 \u043f\u043b\u0430\u043d\u0430 - \u0431\u0435\u0437 VO - \u0431\u0435\u0437 \u0431\u043b\u043e\u043a\u0430 \u0432\u0440\u0435\u043c\u0435\u043d\u0438",
    uk: "\u0442\u0456\u043b\u044c\u043a\u0438 preview - \u0431\u0435\u0437 \u0444\u0430\u043a\u0442\u0443 - \u0431\u0435\u0437 \u043f\u043b\u0430\u043d\u0443 - \u0431\u0435\u0437 VO - \u0431\u0435\u0437 \u0431\u043b\u043e\u043a\u0443 \u0447\u0430\u0441\u0443",
    de: "nur preview - kein Fakt - kein Plan - kein VO - kein Zeitblock",
    es: "solo preview - sin hecho - sin plan - sin VO - sin bloque de tiempo",
    cs: "pouze preview - bez faktu - bez pl\u00e1nu - bez VO - bez \u010dasov\u00e9ho bloku",
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = normalizeLocale(searchParams.get("locale"));
  const t = UI[locale];
  const actionText = ACTION_UI[locale];
  const rawText = searchParams.get("text") ?? "";

  const [review, setReview] = useState<ReviewPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

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

  const plannedSchedule = useMemo(() => buildPlannedSchedule(rawText, locale), [rawText, locale]);
  const fields = useMemo(() => {
    const base = review?.fields ?? [];

    if (!review || isLoading || !rawText.trim()) {
      return base;
    }

    return [
      ...base,
      {
        key: "plannedCalendarEvent",
        label: actionText.scheduleLabel,
        value: plannedSchedule.label,
        status: "candidate" as FieldStatus,
        note: actionText.defaultPolicy,
        confidence: 0.82,
      },
    ];
  }, [review, isLoading, rawText, plannedSchedule.label, actionText.scheduleLabel, actionText.defaultPolicy]);
  const counters = useMemo(
    () => ({
      ready: fields.filter((field) => field.status === "ready").length,
      candidate: fields.filter((field) => field.status === "candidate").length,
      missing: fields.filter((field) => field.status === "missing").length,
    }),
    [fields]
  );
  const sourceLabel = review?.modelBacked ? t.model : t.fallback;

  async function handleAdd() {
    if (!review || !rawText.trim() || saveStatus === "saving") {
      return;
    }

    setSaveStatus("saving");
    setSaveError(null);

    try {
      const response = await fetch("/api/calendar/events", {
        credentials: "include",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          eventType: "planned_activity",
          title: review.activityTitle || rawText.trim(),
          description: [
            `Source: calendar_activity_review`,
            `Raw text: ${rawText.trim()}`,
            `Preview summary: ${review.summary}`,
            `Policy: ${actionText.defaultPolicy}`,
          ].join("\n"),
          startTime: plannedSchedule.startTime,
          endTime: plannedSchedule.endTime,
          status: "planned",
          source: "calendar_activity_review_add_gate_v1",
        }),
      });

      const payload = await response.json().catch(() => null) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error || `Calendar event write failed: ${response.status}`);
      }

      router.push(`/calendar?locale=${locale}&focusDate=${plannedSchedule.focusDate}`);
    } catch (error) {
      setSaveStatus("error");
      setSaveError(error instanceof Error ? error.message : actionText.addError);
      // CALENDAR_ADD_GATE_V4_AUTH_TIP
    }
  }

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
                {/* CALENDAR_ADD_GATE_V4_VISIBLE_SCHEDULE_CARD */}
                <div className="rounded-[18px] border border-[#dfe5f1] bg-[#f8fafc] px-4 py-3">
                  <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#7c8099]">
                    {actionText.scheduleLabel}
                  </p>
                  <p className="mt-1 text-base font-extrabold text-[#1a1d2e]">{plannedSchedule.label}</p>
                  <p className="mt-1 text-xs leading-5 text-[#52607a]">{actionText.defaultPolicy}</p>
                </div>

                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={isLoading || !review || saveStatus === "saving" || !rawText.trim()}
                  className="w-full rounded-[18px] border border-[#3b6ef8]/30 bg-[#3b6ef8] px-4 py-3 text-left text-sm font-semibold text-white shadow-sm shadow-[#3b6ef8]/20 disabled:cursor-not-allowed disabled:border-[#dfe5f1] disabled:bg-[#eef2ff] disabled:text-[#7c8099]"
                >
                  {saveStatus === "saving" ? actionText.saving : actionText.add}
                </button>

                {saveError ? (
                  <div className="rounded-[18px] border border-[#fecaca] bg-[#fff1f2] px-4 py-3 text-sm font-semibold text-[#be123c]">
                    {actionText.addError} {saveError}
                  </div>
                ) : null}

                {[actionText.factLater, actionText.voLater].map((label) => (
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
