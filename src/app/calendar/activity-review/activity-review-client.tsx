"use client";

// CALENDAR_REAL_ACTIVITY_SEMANTIC_PREVIEW_V3
// CALENDAR_ACTIVITY_REVIEW_MODEL_BACKED_NO_WRITE_V1
// NO_DB_WRITE_ACTIVITY_REVIEW

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ActivityTimingEditorPp1 } from "@/components/activity/pp1/activity-timing-editor";
import { PlannedTargetSelectorPp1 } from "@/components/activity/pp1/planned-target-selector";
import {
  datetimeLocalToIsoPp1,
  formatActivityTimingDraftPp1,
  getTimingFocusDatePp1,
  inferActivityTimingDraftPp1,
  parsePositiveDurationMinutesPp1,
  validateActivityTimingDraftPp1,
  type ActivityTimingDraftPp1,
} from "@/lib/activity/pp1/activityTiming";

type Locale = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";
type CalendarReturnTarget = "calendar" | "calendar-rebuild" | "activity-journal";
type TemporalDirection = "future" | "past";
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

type ActivityProcessingPackageForSaveGate = Record<string, unknown> & {
  packageId?: string;
  status?: string;
  rawInput?: Record<string, unknown>;
  recognition?: Record<string, unknown>;
  measures?: Array<Record<string, unknown>>;
  semanticCategories?: Array<Record<string, unknown>>;
  valueObjectMatches?: Array<Record<string, unknown>>;
  factPreviews?: Array<Record<string, unknown> & {
    localId?: string;
    status?: string;
  }>;
  missingValueObjectCandidates?: Array<Record<string, unknown> & {
    semanticObjectKey?: string;
    proposedTitleRu?: string;
    proposedParentValueObjectId?: string | null;
    proposedParentTitleRu?: string | null;
  }>;
  counters?: Record<string, unknown>;
};

type SemanticOrchestrationPreviewResponse = {
  ok?: boolean;
  activityProcessingPackage?: ActivityProcessingPackageForSaveGate | null;
  saveGateBridge?: {
    available?: boolean;
    factPreviewCount?: number;
  };
  error?: string;
  errors?: string[];
};

type ActivityFactsSaveGateResponse = {
  ok?: boolean;
  errorCode?: string;
  errorMessage?: string;
  createdIds?: {
    activityEventId?: string | null;
    measureIds?: string[];
    factIds?: string[];
    reviewItemIds?: string[];
    recalculationQueueIds?: string[];
  };
  sideEffects?: Record<string, unknown>;
};

type SaveStatus = "idle" | "saving" | "error";


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
    addError: "Could not add the planned activity.",
    factLater: "Fact confirmation - later",
    voLater: "VO link - later",
    scheduleLabel: "Planned activity",
    defaultPolicy: "Missing date, time or duration remains unknown; no artificial defaults are inserted.",
  },
  pl: {
    add: "Dodaj",
    saving: "Dodawanie...",
    addError: "Nie uda\u0142o si\u0119 doda\u0107 planowanej aktywności.",
    factLater: "Potwierdzenie faktu - p\u00f3\u017aniej",
    voLater: "Po\u0142\u0105czenie VO - p\u00f3\u017aniej",
    scheduleLabel: "Planowana aktywność",
    defaultPolicy: "Brak daty, czasu lub długości pozostaje nieznany; system nie dodaje sztucznych wartości.",
  },
  ru: {
    add: "\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c",
    saving: "\u0414\u043e\u0431\u0430\u0432\u043b\u044f\u044e...",
    addError: "Не удалось добавить плановую активность.",
    factLater: "\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0435 \u0444\u0430\u043a\u0442\u0430 - \u043f\u043e\u0437\u0436\u0435",
    voLater: "\u0421\u0432\u044f\u0437\u044c \u0441 VO - \u043f\u043e\u0437\u0436\u0435",
    scheduleLabel: "Плановая активность",
    defaultPolicy: "Неуказанные дата, время и длительность остаются неизвестными; система не подставляет значения.",
  },
  uk: {
    add: "\u0414\u043e\u0434\u0430\u0442\u0438",
    saving: "\u0414\u043e\u0434\u0430\u044e...",
    addError: "Не вдалося додати планову активність.",
    factLater: "\u041f\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043d\u043d\u044f \u0444\u0430\u043a\u0442\u0443 - \u043f\u0456\u0437\u043d\u0456\u0448\u0435",
    voLater: "\u0417\u0432'\u044f\u0437\u043e\u043a \u0437 VO - \u043f\u0456\u0437\u043d\u0456\u0448\u0435",
    scheduleLabel: "Планова активність",
    defaultPolicy: "Невказані дата, час і тривалість залишаються невідомими; система не підставляє значення.",
  },
  de: {
    add: "Hinzuf\u00fcgen",
    saving: "Wird hinzugef\u00fcgt...",
    addError: "Geplante Aktivität konnte nicht hinzugef\u00fcgt werden.",
    factLater: "Fakt-Best\u00e4tigung - sp\u00e4ter",
    voLater: "VO-Verkn\u00fcpfung - sp\u00e4ter",
    scheduleLabel: "Geplante Aktivität",
    defaultPolicy: "Fehlendes Datum, Zeit oder Dauer bleibt unbekannt; es werden keine künstlichen Werte eingesetzt.",
  },
  es: {
    add: "A\u00f1adir",
    saving: "A\u00f1adiendo...",
    addError: "No se pudo a\u00f1adir la actividad planificada.",
    factLater: "Confirmaci\u00f3n de hecho - m\u00e1s tarde",
    voLater: "Vincular VO - m\u00e1s tarde",
    scheduleLabel: "Actividad planificada",
    defaultPolicy: "La fecha, hora o duración no indicada permanece desconocida; no se añaden valores artificiales.",
  },
  cs: {
    add: "P\u0159idat",
    saving: "P\u0159id\u00e1v\u00e1m...",
    addError: "Nepoda\u0159ilo se p\u0159idat plánovanou aktivitu.",
    factLater: "Potvrzen\u00ed faktu - pozd\u011bji",
    voLater: "Propojen\u00ed VO - pozd\u011bji",
    scheduleLabel: "Plánovaná aktivita",
    defaultPolicy: "Neuvedené datum, čas nebo délka zůstávají neznámé; systém nedoplňuje umělé hodnoty.",
  },
};

function normalizeLocale(value: string | null): Locale {
  if (value && LOCALES.includes(value as Locale)) {
    return value as Locale;
  }

  return "en";
}

function normalizeReturnTo(value: string | null): CalendarReturnTarget {
  if (value === "calendar-rebuild") {
    return "calendar-rebuild";
  }

  if (value === "activity-journal") {
    return "activity-journal";
  }

  return "calendar";
}

function normalizeTemporalDirection(
  value: string | null,
  returnTo: CalendarReturnTarget
): TemporalDirection {
  if (value === "past" || returnTo === "activity-journal") {
    return "past";
  }

  return "future";
}

function normalizeFocusDate(value: string | null): string | null {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function buildReturnUrl(target: CalendarReturnTarget, locale: Locale, focusDate: string) {
  if (target === "activity-journal") {
    return `/activity-today?${new URLSearchParams({ locale }).toString()}`;
  }

  const params = new URLSearchParams({
    locale,
    focusDate,
  });

  return `${target === "calendar-rebuild" ? "/calendar-rebuild" : "/calendar"}?${params.toString()}`;
}

function normalizeFactsInputLanguage(locale: Locale) {
  return locale === "uk" ? "ru" : locale;
}

function createClientRequestId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `pp1b-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function buildSafeSaveGateId(raw: string) {
  const safe = raw
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._:-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 220);

  return safe.length >= 8 ? safe : `activity_${safe}_${Date.now()}`;
}

function getFactLocalIds(pkg: ActivityProcessingPackageForSaveGate) {
  return (pkg.factPreviews ?? [])
    .map((fact) => typeof fact.localId === "string" ? fact.localId.trim() : "")
    .filter(Boolean)
    .slice(0, 20);
}
function normalizeSemanticObjectKeyForFacts(value: string, fallback: string) {
  const knownMapped = value
    .toLowerCase()
    .replace(/сьогодні|сегодня|завтра|вчора|вчера/g, " ")
    .replace(/гуляв|гуляла|гуляти|прогулянка|прогулка|гулять/g, " walk ")
    .replace(/побігати|побегать|біг|бег|бегать|run|running/g, " run ")
    .replace(/плавання|плавать|плавал|плавати|swim|swimming/g, " swim ")
    .replace(/робота|работа|працював|работал|work|working/g, " work ")
    .replace(/німецька|немецкий|deutsch|german/g, " german ")
    .replace(/сон|спав|спала|спать|sleep/g, " sleep ")
    .replace(/стоматолог|врач|лікар|здоров|health/g, " health ");

  const normalized = knownMapped
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);

  return normalized.length > 0 ? normalized : fallback;
}

function buildFallbackActivityProcessingPackageForSaveGate(params: {
  rawText: string;
  locale: Locale;
  temporalDirection: TemporalDirection;
  title: string;
  durationMinutes: number | null;
  startTime: string | null;
}): ActivityProcessingPackageForSaveGate | null {
  const rawDurationMinutes = params.durationMinutes;
  const durationMinutes =
    typeof rawDurationMinutes === "number" &&
    Number.isFinite(rawDurationMinutes) &&
    rawDurationMinutes > 0
      ? Math.round(rawDurationMinutes)
      : null;

  if (!durationMinutes) {
    return null;
  }

  const semanticObjectKey = normalizeSemanticObjectKeyForFacts(
    `${params.title} ${params.rawText}`,
    "activity_duration"
  );

  const localIdSafe = buildSafeSaveGateId(semanticObjectKey);
  const capturedAtIso = params.startTime || new Date().toISOString();

  const measure = {
    localId: "measure-duration-minutes",
    measureType: "duration",
    unit: "minute",
    numericValue: durationMinutes,
    textValue: null,
    confidence: 0.78,
    evidenceText: params.rawText,
    normalizedLabel: `${durationMinutes} minute`,
  };

  const category = {
    localId: `cat-${localIdSafe}`,
    semanticObjectKey,
    labelRu: params.title || params.rawText,
    layer: "activity_type",
    confidence: 0.64,
    evidenceText: params.rawText,
    reason:
      "Fallback semantic category created from Activity Review Container when semantic package bridge returned no fact previews.",
  };

  const factPreview = {
    localId: `fact-${localIdSafe}-duration-1`,
    activityEventId: null,
    measureLocalId: measure.localId,
    semanticCategoryLocalId: category.localId,
    semanticObjectKey,
    valueObjectId: null,
    valueObjectTitle: null,
    measureType: "duration",
    unit: "minute",
    numericValue: durationMinutes,
    textValue: null,
    status: "ready_for_fact_write",
    confidence: 0.64,
    explanation: `Fallback fact from Activity Review Container: ${params.title}, ${durationMinutes} minute.`,
  };

  return {
    packageId: `activity-container-fallback-${params.temporalDirection}-${Date.now()}-${localIdSafe}`,
    status: "ready_for_save_gate",
    rawInput: {
      text: params.rawText,
      locale: params.locale,
      source: params.temporalDirection === "future" ? "calendar" : "manual",
      capturedAtIso,
    },
    recognition: {
      status: "obvious_activity",
      confidence: 0.64,
      reason:
        "Activity Review Container already resolved this as an addable activity; fallback package preserves facts write when bridge preview is empty.",
      detectedActivityTitle: params.title,
      shouldAskUserBeforeSaving: false,
    },
    measures: [measure],
    semanticCategories: [category],
    valueObjectMatches: [{
      semanticCategoryLocalId: category.localId,
      matchStatus: "missing_candidate",
      valueObjectId: null,
      valueObjectTitle: null,
      parentValueObjectId: null,
      parentValueObjectTitle: null,
      confidence: 0.54,
      reason: "Value Object substitution is deferred to a later block.",
    }],
    missingValueObjectCandidates: [{
      semanticCategoryLocalId: category.localId,
      semanticObjectKey,
      proposedTitleRu: params.title || semanticObjectKey,
      proposedUsageScope: "private",
      proposedAuthorType: "user",
      proposedParentValueObjectId: null,
      proposedParentTitleRu: null,
      reason: "Candidate shown for future Value Object review; not created in this block.",
      requiresUserConfirmation: true,
    }],
    factPreviews: [factPreview],
    safety: {
      previewOnly: false,
      dbWriteAllowed: true,
      sqlAllowed: false,
      openAiCallAllowed: false,
      medicalDiagnosisAllowed: false,
      notes: [
        "Fallback package is created from Activity Review Container after user pressed Add.",
        "It only writes duration facts through the server-mediated save-gate.",
        "Value Object creation remains skipped.",
      ],
    },
    counters: {
      measureCount: 1,
      semanticCategoryCount: 1,
      valueObjectMatchCount: 1,
      missingValueObjectCandidateCount: 1,
      factPreviewCount: 1,
      saveableFactPreviewCount: 1,
    },
  };
}

function ensureSaveGatePackage(params: {
  pkg: ActivityProcessingPackageForSaveGate | null | undefined;
  rawText: string;
  locale: Locale;
  temporalDirection: TemporalDirection;
  title: string;
  durationMinutes: number | null;
  startTime: string | null;
}) {
  if (params.pkg && getFactLocalIds(params.pkg).length > 0) {
    return params.pkg;
  }

  return buildFallbackActivityProcessingPackageForSaveGate({
    rawText: params.rawText,
    locale: params.locale,
    temporalDirection: params.temporalDirection,
    title: params.title,
    durationMinutes: params.durationMinutes,
    startTime: params.startTime,
  });
}

async function saveFactsForActivityContainer(params: {
  rawText: string;
  locale: Locale;
  temporalDirection: TemporalDirection;
  title: string;
  existingActivityEventId: string | null;
  calendarEventId: string | null;
  startTime: string | null;
  durationMinutes: number | null;
}) {
  const semanticResponse = await fetch("/api/activity/semantic-orchestration-preview", {
    credentials: "include",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      rawText: params.rawText,
      inputLanguage: normalizeFactsInputLanguage(params.locale),
      source: params.temporalDirection === "future" ? "calendar" : "manual",
      mode: "preview_only",
    }),
  });

  const semanticPayload = await semanticResponse.json().catch(() => null) as SemanticOrchestrationPreviewResponse | null;

  if (!semanticResponse.ok) {
    throw new Error(
      semanticPayload?.error ||
      semanticPayload?.errors?.join("; ") ||
      `Semantic facts preview failed: ${semanticResponse.status}`
    );
  }

  const pkg = ensureSaveGatePackage({
    pkg: semanticPayload?.activityProcessingPackage ?? null,
    rawText: params.rawText,
    locale: params.locale,
    temporalDirection: params.temporalDirection,
    title: params.title,
    durationMinutes: params.durationMinutes,
    startTime: params.startTime,
  });

  if (!pkg) {
    return {
      ok: true,
      skipped: true,
      reason: "No ActivityProcessingPackage or fallback package could be created.",
    };
  }

  const factLocalIds = getFactLocalIds(pkg);

  if (factLocalIds.length === 0) {
    return {
      ok: true,
      skipped: true,
      reason: "No fact previews returned by semantic preview.",
    };
  }

  const idSource =
    params.existingActivityEventId ||
    params.calendarEventId ||
    `${params.temporalDirection}:${params.startTime}:${params.title}`;

  const saveGateResponse = await fetch("/api/activity/facts/save-gate", {
    credentials: "include",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      routeMode: "future_server_mediated_write",
      idempotencyKey: buildSafeSaveGateId(`activity-container-facts:${idSource}`),
      sourcePackageId: buildSafeSaveGateId(pkg.packageId || `activity-container-package:${idSource}`),
      temporalDirection: params.temporalDirection,
      existingActivityEventId: params.existingActivityEventId,
      calendarEventId: params.calendarEventId,
      activityProcessingPackage: pkg,
      factDecisions: factLocalIds.map((factLocalId) => ({
        factLocalId,
        decision: "accept",
        reasonRu:
          params.temporalDirection === "future"
            ? "Плановый факт принят автоматически из контейнера будущей активности."
            : "Факт прошлого принят автоматически из контейнера активности.",
      })),
      editedFactDecisions: [],
      valueObjectCandidateDecisions: (pkg.missingValueObjectCandidates ?? []).map((candidate) => ({
        semanticObjectKey: candidate.semanticObjectKey || "activity_fact",
        proposedTitleRu: candidate.proposedTitleRu || candidate.semanticObjectKey || "Activity fact",
        decision: "skip",
        selectedExistingValueObjectId: null,
        selectedExistingValueObjectTitle: null,
        proposedParentValueObjectId: candidate.proposedParentValueObjectId ?? null,
        proposedParentTitleRu: candidate.proposedParentTitleRu ?? null,
        reasonRu: "Связь с ценным объектом будет подтверждаться отдельным следующим блоком.",
      })),
      clientSafetyConfirmation: {
        userReviewedPreview: true,
        userConfirmedMissingValueObjectCreation: false,
        userConfirmedFactWrite: true,
        userUnderstandsPreviewIsNotDiagnosis: true,
      },
    }),
  });

  const saveGatePayload = await saveGateResponse.json().catch(() => null) as ActivityFactsSaveGateResponse | null;

  if (!saveGateResponse.ok || saveGatePayload?.ok !== true) {
    throw new Error(
      saveGatePayload?.errorMessage ||
      saveGatePayload?.errorCode ||
      `Facts save-gate failed: ${saveGateResponse.status}`
    );
  }

  return {
    ok: true,
    skipped: false,
    factCount: saveGatePayload.createdIds?.factIds?.length ?? factLocalIds.length,
    measureCount: saveGatePayload.createdIds?.measureIds?.length ?? 0,
    activityEventId: saveGatePayload.createdIds?.activityEventId ?? null,
  };
}
function getTemporalDirectionCopy(locale: Locale) {

  const copy = {
    en: {
      label: "Time",
      future: "Future / planned activity",
      past: "Past / completed activity",
      futureNote: "Opened from Calendar. The container is saved as one canonical planned activity; only an exact schedule creates a calendar projection.",
      pastNote: "Opened from My Activity Journal. After gate this container is saved as an activity event.",
      journalLabel: "Activity journal entry",
      journalPolicy: "Unknown actual date, time or duration stays unknown; no artificial defaults are inserted.",
      journalAdd: "Add to activity journal",
      journalSaving: "Adding...",
      journalError: "Could not add the activity journal entry.",
    },
    pl: {
      label: "Czas",
      future: "Przyszłość / aktywność planowana",
      past: "Przeszłość / aktywność wykonana",
      futureNote: "Otwarte z Kalendarza. Kontener zostanie zapisany jako jedna kanoniczna aktywność planowana; tylko dokładny termin utworzy projekcję kalendarza.",
      pastNote: "Otwarte z Mojego dziennika aktywności. Po gate kontener zostanie zapisany jako aktywność.",
      journalLabel: "Wpis dziennika aktywności",
      journalPolicy: "Nieznana data, czas lub długość wykonania pozostaje nieznana; system nie dodaje wartości.",
      journalAdd: "Dodaj do dziennika aktywności",
      journalSaving: "Dodawanie...",
      journalError: "Nie udało się dodać wpisu dziennika aktywności.",
    },
    ru: {
      label: "Время",
      future: "Будущее / плановая активность",
      past: "Прошлое / произошедшая активность",
      futureNote: "Открыто из календаря. Контейнер сохраняется как одна каноническая плановая активность; календарная проекция создаётся только для точного времени.",
      pastNote: "Открыто из Моего журнала активностей. После gate контейнер сохраняется как произошедшая активность.",
      journalLabel: "Запись журнала активностей",
      journalPolicy: "Неизвестные фактические дата, время и длительность остаются неизвестными; система их не придумывает.",
      journalAdd: "Добавить в журнал активностей",
      journalSaving: "Добавляю...",
      journalError: "Не удалось добавить запись журнала активностей.",
    },
    uk: {
      label: "Час",
      future: "Майбутнє / планова активність",
      past: "Минуле / виконана активність",
      futureNote: "Відкрито з календаря. Контейнер зберігається як одна канонічна планова активність; календарна проєкція створюється лише для точного часу.",
      pastNote: "Відкрито з Мого журналу активностей. Після gate контейнер зберігається як виконана активність.",
      journalLabel: "Запис журналу активностей",
      journalPolicy: "Невідомі фактичні дата, час і тривалість залишаються невідомими; система їх не вигадує.",
      journalAdd: "Додати до журналу активностей",
      journalSaving: "Додаю...",
      journalError: "Не вдалося додати запис журналу активностей.",
    },
    de: {
      label: "Zeit",
      future: "Zukunft / geplante Aktivität",
      past: "Vergangenheit / erledigte Aktivität",
      futureNote: "Aus dem Kalender geöffnet. Der Container wird als eine kanonische geplante Aktivität gespeichert; nur ein genauer Termin erzeugt eine Kalenderprojektion.",
      pastNote: "Aus meinem Aktivitätsjournal geöffnet. Nach dem Gate wird der Container als Aktivität gespeichert.",
      journalLabel: "Aktivitätsjournal-Eintrag",
      journalPolicy: "Unbekanntes tatsächliches Datum, Zeit oder Dauer bleibt unbekannt; es werden keine Werte erfunden.",
      journalAdd: "Zum Aktivitätsjournal hinzufügen",
      journalSaving: "Wird hinzugefügt...",
      journalError: "Aktivitätsjournal-Eintrag konnte nicht hinzugefügt werden.",
    },
    es: {
      label: "Tiempo",
      future: "Futuro / actividad planificada",
      past: "Pasado / actividad realizada",
      futureNote: "Abierto desde Calendario. El contenedor se guarda como una actividad planificada canónica; solo un horario exacto crea una proyección de calendario.",
      pastNote: "Abierto desde Mi diario de actividades. Después del gate se guarda como actividad realizada.",
      journalLabel: "Entrada del diario de actividad",
      journalPolicy: "La fecha, hora o duración real desconocida permanece desconocida; no se inventan valores.",
      journalAdd: "Añadir al diario de actividad",
      journalSaving: "Añadiendo...",
      journalError: "No se pudo añadir la entrada del diario de actividad.",
    },
    cs: {
      label: "Čas",
      future: "Budoucnost / plánovaná aktivita",
      past: "Minulost / dokončená aktivita",
      futureNote: "Otevřeno z Kalendáře. Kontejner se uloží jako jedna kanonická plánovaná aktivita; pouze přesný čas vytvoří projekci kalendáře.",
      pastNote: "Otevřeno z mého deníku aktivit. Po gate se kontejner uloží jako aktivita.",
      journalLabel: "Záznam deníku aktivit",
      journalPolicy: "Neznámé skutečné datum, čas nebo délka zůstávají neznámé; systém hodnoty nevymýšlí.",
      journalAdd: "Přidat do deníku aktivit",
      journalSaving: "Přidávám...",
      journalError: "Nepodařilo se přidat záznam deníku aktivit.",
    },
  } as const;

  return copy[locale] ?? copy.en;
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
  const returnTo = normalizeReturnTo(searchParams.get("returnTo"));
  const sourceFocusDate = normalizeFocusDate(searchParams.get("focusDate"));
  const temporalDirection = normalizeTemporalDirection(searchParams.get("temporalDirection"), returnTo);
  const t = UI[locale];
  const actionText = ACTION_UI[locale];
  const rawText = searchParams.get("text") ?? "";
  const calendarHref =
    returnTo === "activity-journal"
      ? {
          pathname: "/activity-today",
          query: { locale },
        }
      : {
          pathname: returnTo === "calendar-rebuild" ? "/calendar-rebuild" : "/calendar",
          query: sourceFocusDate ? { locale, focusDate: sourceFocusDate } : { locale },
        };
  const addHref = {
    pathname: "/calendar/add",
    query: sourceFocusDate
      ? { locale, returnTo, focusDate: sourceFocusDate, temporalDirection }
      : { locale, returnTo, temporalDirection },
  };

  const [review, setReview] = useState<ReviewPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [timingDraft, setTimingDraft] = useState<ActivityTimingDraftPp1>(() =>
    inferActivityTimingDraftPp1(rawText, temporalDirection)
  );
  const [plannedTargetValueObjectIds, setPlannedTargetValueObjectIds] = useState<string[]>([]);
  const requestIdRef = useRef(createClientRequestId());

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

  useEffect(() => {
    setTimingDraft(inferActivityTimingDraftPp1(rawText, temporalDirection));
    setPlannedTargetValueObjectIds([]);
    requestIdRef.current = createClientRequestId();
  }, [rawText, temporalDirection]);

  const timingValidation = useMemo(
    () => validateActivityTimingDraftPp1(timingDraft, temporalDirection),
    [timingDraft, temporalDirection]
  );
  const timingLabel = useMemo(
    () => formatActivityTimingDraftPp1(timingDraft, temporalDirection, locale),
    [timingDraft, temporalDirection, locale]
  );
  const timingFocusDate = useMemo(
    () => getTimingFocusDatePp1(timingDraft, temporalDirection),
    [timingDraft, temporalDirection]
  );
  const temporalCopy = getTemporalDirectionCopy(locale);
  const activeActionText =
    temporalDirection === "past"
      ? {
          ...actionText,
          add: temporalCopy.journalAdd,
          saving: temporalCopy.journalSaving,
          addError: temporalCopy.journalError,
          scheduleLabel: temporalCopy.journalLabel,
          defaultPolicy: temporalCopy.journalPolicy,
        }
      : actionText;

  const fields = useMemo(() => {
    const base = review?.fields ?? [];

    if (!review || isLoading || !rawText.trim()) {
      return base;
    }

    return [
      ...base,
      {
        key: "temporalDirection",
        label: temporalCopy.label,
        value: temporalDirection === "past" ? temporalCopy.past : temporalCopy.future,
        status: "ready" as FieldStatus,
        note: temporalDirection === "past" ? temporalCopy.pastNote : temporalCopy.futureNote,
        confidence: 1,
      },
      {
        key: temporalDirection === "past" ? "activityJournalEntry" : "plannedCalendarEvent",
        label: activeActionText.scheduleLabel,
        value: timingLabel,
        status: timingValidation.ok ? "ready" as FieldStatus : "missing" as FieldStatus,
        note: activeActionText.defaultPolicy,
        confidence: 0.82,
      },
    ];
  }, [
    review,
    isLoading,
    rawText,
    timingLabel,
    timingValidation.ok,
    temporalDirection,
    temporalCopy,
    activeActionText.scheduleLabel,
    activeActionText.defaultPolicy,
  ]);
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

    if (!timingValidation.ok) {
      setSaveStatus("error");
      setSaveError(`Invalid timing: ${timingValidation.errors.join(", ")}`);
      return;
    }

    setSaveStatus("saving");
    setSaveError(null);

    try {
      const title = review.activityTitle || rawText.trim();
      const durationMinutes = parsePositiveDurationMinutesPp1(timingDraft.durationMinutes);
      const startedAt = datetimeLocalToIsoPp1(timingDraft.startedAtLocal);
      const endedAt = datetimeLocalToIsoPp1(timingDraft.endedAtLocal);
      const deadlineAt = datetimeLocalToIsoPp1(timingDraft.deadlineLocal);
      const description = [
        `Source: ${temporalDirection === "future" ? "calendar_activity_review" : "activity_journal_review"}`,
        `Raw text: ${rawText.trim()}`,
        `Preview summary: ${review.summary}`,
        `Timing: ${timingLabel}`,
        `Policy: ${activeActionText.defaultPolicy}`,
      ].join("\n");

      const requestBody: Record<string, unknown> = {
        idempotencyKey: requestIdRef.current,
        activityRoleCode: temporalDirection === "future" ? "planned" : "actual",
        title,
        rawText: rawText.trim(),
        inputText: rawText.trim(),
        description,
        durationMinutes,
        status: temporalDirection === "future" ? "planned" : "completed",
        source: "manual_form",
        privacyScope: "private",
        metadata: {
          pp1bContainer: "activity_review",
          locale,
          returnTo,
          sourceFocusDate,
          observedDate: temporalDirection === "past" ? timingDraft.observedDate || null : null,
          previewSummary: review.summary,
        },
      };

      if (temporalDirection === "future") {
        Object.assign(requestBody, {
          scheduleModeCode: timingDraft.scheduleModeCode,
          scheduledDate: timingDraft.scheduleModeCode === "date_only"
            ? timingDraft.scheduledDate
            : null,
          scheduleStartDate: timingDraft.scheduleModeCode === "date_range"
            ? timingDraft.scheduleStartDate
            : null,
          scheduleEndDate: timingDraft.scheduleModeCode === "date_range"
            ? timingDraft.scheduleEndDate
            : null,
          deadlineAt: timingDraft.scheduleModeCode === "deadline" ? deadlineAt : null,
          startedAt: timingDraft.scheduleModeCode === "exact" ? startedAt : null,
          endedAt: timingDraft.scheduleModeCode === "exact" ? endedAt : null,
          createCalendarProjection: timingDraft.scheduleModeCode === "exact",
          plannedTargetValueObjectIds,
        });
      } else {
        Object.assign(requestBody, {
          startedAt,
          endedAt,
          fulfillsPlannedActivityEventId: null,
        });
      }

      const response = await fetch("/api/activity/events", {
        credentials: "include",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const payload = await response.json().catch(() => null) as {
        error?: string;
        event?: { id?: string | null };
        activityEvent?: { id?: string | null };
        calendarEvent?: { id?: string | null } | null;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error || `Activity event write failed: ${response.status}`);
      }

      const activityEventId = payload?.activityEvent?.id ?? payload?.event?.id ?? null;

      if (!activityEventId) {
        throw new Error("Canonical activity_event id was not returned.");
      }

      await saveFactsForActivityContainer({
        rawText: rawText.trim(),
        locale,
        temporalDirection,
        title,
        existingActivityEventId: activityEventId,
        calendarEventId: payload?.calendarEvent?.id ?? null,
        startTime: startedAt,
        durationMinutes,
      });

      const fallbackFocusDate = sourceFocusDate ?? new Date().toISOString().slice(0, 10);
      router.push(
        buildReturnUrl(
          temporalDirection === "past" ? "activity-journal" : returnTo,
          locale,
          timingFocusDate ?? fallbackFocusDate,
        ),
      );
    } catch (error) {
      setSaveStatus("error");
      setSaveError(error instanceof Error ? error.message : activeActionText.addError);
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
                  href={addHref}
                  className="inline-flex h-10 items-center rounded-full border border-[#dfe5f1] bg-white px-4 text-sm font-semibold text-[#52607a] shadow-sm transition hover:border-[#3b6ef8] hover:text-[#3b6ef8]"
                >
                  {t.back}
                </Link>
                <Link
                  href={calendarHref}
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
                <ActivityTimingEditorPp1
                  locale={locale}
                  temporalDirection={temporalDirection}
                  draft={timingDraft}
                  onChange={setTimingDraft}
                  valid={timingValidation.ok}
                />

                {temporalDirection === "future" ? (
                  <PlannedTargetSelectorPp1
                    locale={locale}
                    selectedIds={plannedTargetValueObjectIds}
                    onChange={setPlannedTargetValueObjectIds}
                  />
                ) : null}

                <div className="rounded-[18px] border border-[#dfe5f1] bg-[#f8fafc] px-4 py-3">
                  <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#7c8099]">
                    {activeActionText.scheduleLabel}
                  </p>
                  <p className="mt-1 text-base font-extrabold text-[#1a1d2e]">{timingLabel}</p>
                  <p className="mt-1 text-xs leading-5 text-[#52607a]">{activeActionText.defaultPolicy}</p>
                </div>

                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={isLoading || !review || saveStatus === "saving" || !rawText.trim() || !timingValidation.ok}
                  className="w-full rounded-[18px] border border-[#3b6ef8]/30 bg-[#3b6ef8] px-4 py-3 text-left text-sm font-semibold text-white shadow-sm shadow-[#3b6ef8]/20 disabled:cursor-not-allowed disabled:border-[#dfe5f1] disabled:bg-[#eef2ff] disabled:text-[#7c8099]"
                >
                  {saveStatus === "saving" ? activeActionText.saving : activeActionText.add}
                </button>

                {saveError ? (
                  <div className="rounded-[18px] border border-[#fecaca] bg-[#fff1f2] px-4 py-3 text-sm font-semibold text-[#be123c]">
                    {activeActionText.addError} {saveError}
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
