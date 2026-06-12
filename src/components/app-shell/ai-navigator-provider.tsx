"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useUserSessionClient } from "../auth/user-session-client";

export type AiNavigatorMessageRole =
  | "ai"
  | "user"
  | "insight"
  | "rec"
  | "activity"
  | "error";

export type AiNavigatorMessage = {
  id: number;
  role: AiNavigatorMessageRole;
  text: string;
  createdAt: string;
};

type ApiTestResponse = {
  reply?: string;
  error?: string;
};

type AiNavigatorContextValue = {
  messages: AiNavigatorMessage[];
  input: string;
  isSending: boolean;
  setInput: (value: string) => void;
  sendMessage: (message?: string) => Promise<void>;
  addActivityPreview: (text: string) => void;
  clearHistory: () => void;
};

const AiNavigatorContext = createContext<AiNavigatorContextValue | null>(null);

const DEFAULT_MESSAGES: AiNavigatorMessage[] = [
  {
    id: 1,
    role: "ai",
    text: "Привет! Я AI-Навигатор. Могу помочь разобрать активность, подсказать следующий шаг или объяснить текущую страницу.",
    createdAt: new Date(0).toISOString(),
  },
];

export const UI_MINI_FIX_AI_NAVIGATOR_COMPACT_INITIAL_STATE =
  "UI_MINI_FIX_AI_NAVIGATOR_COMPACT_INITIAL_STATE" as const;

function safeStorageKey(email: string | null) {
  return `gpt-app:ai-navigator:v2-compact:${email || "guest"}`;
}

function readMessagesFromLocalStorage(storageKey: string): AiNavigatorMessage[] {
  try {
    const rawValue = window.localStorage.getItem(storageKey);

    if (!rawValue) {
      return DEFAULT_MESSAGES;
    }

    const parsed = JSON.parse(rawValue) as AiNavigatorMessage[];

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }

    return DEFAULT_MESSAGES;
  } catch {
    return DEFAULT_MESSAGES;
  }
}

type UnifiedMessageIntent =
  | "chat"
  | "activity_preview"
  | "value_object_command"
  | "correction"
  | "confirmation"
  | "cancel"
  | "review_request"
  | "clarification";

type UnifiedMessageClassification = {
  intent: UnifiedMessageIntent;
  confidence: number;
  reason: string;
  normalizedText: string;
};

type LocalPendingPreviewKind = "activity" | "value_object" | "correction";

type LocalPendingPreview = {
  kind: LocalPendingPreviewKind;
  text: string;
  createdAtIso: string;
  duration?: string;
  categories?: string[];
  valueObjects?: string[];
  note: string;
};

let latestLocalPendingPreview: LocalPendingPreview | null = null;

function setLatestLocalPendingPreview(preview: LocalPendingPreview) {
  latestLocalPendingPreview = preview;
}

function clearLatestLocalPendingPreview() {
  latestLocalPendingPreview = null;
}

/**
 * AVO_STEP20_9_2_CYRILLIC_ROUTE_MARKERS
 *
 * These markers intentionally use ASCII-only Unicode escapes.
 * Reason: previous Cyrillic literals in this file were corrupted by mojibake,
 * so matching real Russian user input became unreliable.
 */
const AVO_RU_HALF_HOUR_MARKERS: readonly string[] = [
  "\u043f\u043e\u043b\u0447\u0430\u0441\u0430",
  "\u043f\u043e\u043b \u0447\u0430\u0441\u0430",
  "\u043f\u043e\u043b\u0447\u0430\u0441",
];

const AVO_RU_DURATION_MARKERS: readonly string[] = [
  ...AVO_RU_HALF_HOUR_MARKERS,
  "\u043c\u0438\u043d",
  "\u043c\u0438\u043d\u0443\u0442",
  "\u0447\u0430\u0441",
  "\u0447\u0430\u0441\u0430",
  "\u0447\u0430\u0441\u043e\u0432",
];

const AVO_RU_ACTIVITY_ACTION_MARKERS: readonly string[] = [
  "\u0431\u044b\u043b",
  "\u0431\u044b\u043b\u0430",
  "\u0431\u044b\u043b\u0438",
  "\u0441\u0434\u0435\u043b\u0430\u043b",
  "\u0441\u0434\u0435\u043b\u0430\u043b\u0430",
  "\u043f\u043e\u0441\u0435\u0442\u0438\u043b",
  "\u043f\u043e\u0441\u0435\u0442\u0438\u043b\u0430",
  "\u0437\u0430\u043d\u0438\u043c\u0430\u043b\u0441\u044f",
  "\u0437\u0430\u043d\u0438\u043c\u0430\u043b\u0430\u0441\u044c",
  "\u0440\u0430\u0431\u043e\u0442\u0430\u043b",
  "\u0440\u0430\u0431\u043e\u0442\u0430\u043b\u0430",
  "\u0443\u0447\u0438\u043b",
  "\u0443\u0447\u0438\u043b\u0430",
];

const AVO_RU_HEALTH_ACTIVITY_MARKERS: readonly string[] = [
  "\u0441\u0442\u043e\u043c\u0430\u0442\u043e\u043b\u043e\u0433",
  "\u0437\u0443\u0431\u043d",
  "\u0432\u0440\u0430\u0447",
  "\u043e\u0441\u043c\u043e\u0442\u0440",
  "\u043f\u0440\u0438\u0435\u043c",
  "\u043f\u0440\u0438\u0451\u043c",
  "\u043f\u0440\u043e\u0444\u0438\u043b\u0430\u043a\u0442\u0438\u0447\u0435\u0441\u043a",
  "\u043b\u0435\u0447\u0435\u043d",
  "\u043c\u0435\u0434\u0438\u0446",
  "\u0437\u0434\u043e\u0440\u043e\u0432",
];

const AVO_RU_ACTIVITY_PREFIX_MARKERS: readonly string[] = [
  "\u0437\u0430\u043f\u0438\u0448\u0438 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c",
  "\u0437\u0430\u043f\u0438\u0441\u0430\u0442\u044c \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c",
  "\u044f \u0434\u0435\u043b\u0430\u043b",
  "\u044f \u0434\u0435\u043b\u0430\u043b\u0430",
  "\u044f \u0431\u044b\u043b",
  "\u044f \u0431\u044b\u043b\u0430",
];

const AVO_RU_CONFIRMATION_MARKERS: readonly string[] = [
  "\u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u044e",
  "\u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u044e \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c",
  "\u0434\u0430, \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u044e",
  "\u0432\u0441\u0435 \u0432\u0435\u0440\u043d\u043e",
  "\u0432\u0441\u0451 \u0432\u0435\u0440\u043d\u043e",
];

const AVO_RU_CANCEL_MARKERS: readonly string[] = [
  "\u043e\u0442\u043c\u0435\u043d\u0430",
  "\u043e\u0442\u043c\u0435\u043d\u0438",
  "\u043e\u0442\u043c\u0435\u043d\u0438\u0442\u044c",
];

const AVO_RU_REVIEW_MARKERS: readonly string[] = [
  "\u043f\u043e\u043a\u0430\u0436\u0438 review",
  "\u043f\u043e\u043a\u0430\u0436\u0438 \u0440\u0435\u0432\u044c\u044e",
  "\u043f\u043e\u043a\u0430\u0436\u0438 \u0440\u0435\u0432\u044c\u044e",
  "\u043f\u043e\u043a\u0430\u0436\u0438 diff",
  "review",
];

const AVO_RU_CORRECTION_MARKERS: readonly string[] = [
  "\u0438\u0441\u043f\u0440\u0430\u0432\u044c",
  "\u0438\u0441\u043f\u0440\u0430\u0432\u0438\u0442\u044c",
  "\u0431\u044b\u043b\u043e",
  "\u043d\u0430 \u0441\u0430\u043c\u043e\u043c \u0434\u0435\u043b\u0435",
];

const AVO_RU_CONTROLLED_WRITE_COMMANDS: readonly string[] = [
  "\u0432\u044b\u043f\u043e\u043b\u043d\u0438\u0442\u044c \u0437\u0430\u043f\u0438\u0441\u044c \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0438",
  "\u0432\u044b\u043f\u043e\u043b\u043d\u0438 \u0437\u0430\u043f\u0438\u0441\u044c \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0438",
  "\u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u043d\u0443\u044e \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c",
  "\u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043d\u043d\u0443\u044e \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c",
];

function hasAvoUnicodeMarker(text: string, markers: readonly string[]): boolean {
  return markers.some((marker) => text.includes(marker));
}

function hasAvoDurationSignal(text: string): boolean {
  if (hasAvoUnicodeMarker(text, AVO_RU_DURATION_MARKERS)) {
    return true;
  }

  return /(\d+)\s*(min|m|h)\b/i.test(text);
}


type AvoGeneralActivityCandidateKind =
  | "obvious_activity"
  | "ambiguous_activity"
  | "ordinary_chat"
  | "dual_intent_question_activity";

type AvoGeneralActivityCandidate = {
  kind: AvoGeneralActivityCandidateKind;
  score: number;
  reasons: string[];
};

const AVO_GENERAL_NO_SAVE_MARKERS: readonly string[] = [
  "\u043d\u0435 \u0437\u0430\u043f\u0438\u0441\u044b\u0432\u0430\u0439",
  "\u043d\u0435 \u0437\u0430\u043f\u0438\u0448\u0438",
  "\u043d\u0435 \u0441\u043e\u0445\u0440\u0430\u043d\u044f\u0439",
  "\u043d\u0435 \u0441\u043e\u0445\u0440\u0430\u043d\u0438",
  "\u044d\u0442\u043e \u043d\u0435 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c",
  "do not record",
  "do not save",
  "dont record",
  "dont save",
  "no guardar",
  "no guardes",
  "nicht speichern",
  "nie zapisuj",
  "nie zapisywac",
];

const AVO_GENERAL_FUTURE_PLAN_MARKERS: readonly string[] = [
  "\u0431\u0443\u0434\u0443",
  "\u0431\u0443\u0434\u0435\u043c",
  "\u0437\u0430\u0432\u0442\u0440\u0430",
  "\u043f\u043b\u0430\u043d\u0438\u0440\u0443\u044e",
  "\u0441\u043e\u0431\u0438\u0440\u0430\u044e\u0441\u044c",
  "\u0445\u043e\u0447\u0443",
  "\u043d\u0430\u0434\u043e",
  "\u043d\u0443\u0436\u043d\u043e",
  "i will",
  "going to",
  "tomorrow",
  "voy a",
  "planeo",
  "werde",
  "morgen",
  "planuje",
  "jutro",
];

const AVO_GENERAL_SELF_MARKERS: readonly string[] = [
  "\u044f ",
  "\u043c\u043d\u0435 ",
  "\u043c\u0435\u043d\u044f ",
  "i ",
  "my ",
  "yo ",
  "ich ",
  "mir ",
  "mich ",
  "ja ",
  "mnie ",
];

const AVO_GENERAL_SLEEP_MARKERS: readonly string[] = [
  "\u0441\u043f\u0430\u043b",
  "\u0441\u043f\u0430\u043b\u0430",
  "\u0441\u043f\u0430\u043b\u0438",
  "\u043f\u043e\u0441\u043f\u0430\u043b",
  "\u043f\u043e\u0441\u043f\u0430\u043b\u0430",
  "\u0441\u043e\u043d",
  "\u0441\u043d\u0430",
  "sleep",
  "slept",
  "dormi",
  "dormido",
  "geschlafen",
  "schlaf",
  "spalem",
  "spalam",
  "spanie",
  "sen",
];

const AVO_GENERAL_STATE_MARKERS: readonly string[] = [
  "\u0443\u0441\u0442\u0430\u043b",
  "\u0443\u0441\u0442\u0430\u043b\u0430",
  "\u0443\u0441\u0442\u0430\u043b\u043e\u0441\u0442\u044c",
  "\u0431\u043e\u043b\u0435\u043b",
  "\u0431\u043e\u043b\u0435\u043b\u0430",
  "\u0431\u043e\u043b\u0438\u0442",
  "\u0433\u043e\u043b\u043e\u0432\u0430",
  "\u0441\u0430\u043c\u043e\u0447\u0443\u0432\u0441\u0442\u0432\u0438\u0435",
  "tired",
  "fatigue",
  "headache",
  "dolor",
  "cansado",
  "cansada",
  "mude",
  "muede",
  "bol",
  "zmeczony",
  "zmeczona",
];

const AVO_GENERAL_ACTION_MARKERS: readonly string[] = [
  "\u0440\u0430\u0431\u043e\u0442\u0430\u043b",
  "\u0440\u0430\u0431\u043e\u0442\u0430\u043b\u0430",
  "\u0443\u0447\u0438\u043b",
  "\u0443\u0447\u0438\u043b\u0430",
  "\u0443\u0447\u0438\u043b\u0441\u044f",
  "\u0437\u0430\u043d\u0438\u043c\u0430\u043b\u0441\u044f",
  "\u0437\u0430\u043d\u0438\u043c\u0430\u043b\u0430\u0441\u044c",
  "\u0447\u0438\u0442\u0430\u043b",
  "\u0447\u0438\u0442\u0430\u043b\u0430",
  "\u0441\u043b\u0443\u0448\u0430\u043b",
  "\u0441\u043b\u0443\u0448\u0430\u043b\u0430",
  "\u0441\u043c\u043e\u0442\u0440\u0435\u043b",
  "\u0441\u043c\u043e\u0442\u0440\u0435\u043b\u0430",
  "\u0433\u0443\u043b\u044f\u043b",
  "\u0433\u0443\u043b\u044f\u043b\u0430",
  "\u0448\u0435\u043b",
  "\u0448\u043b\u0430",
  "\u0435\u0445\u0430\u043b",
  "\u0435\u0445\u0430\u043b\u0430",
  "\u0442\u0440\u0435\u043d\u0438\u0440\u043e\u0432\u0430\u043b\u0441\u044f",
  "\u0442\u0440\u0435\u043d\u0438\u0440\u043e\u0432\u0430\u043b\u0430\u0441\u044c",
  "\u0434\u0435\u043b\u0430\u043b",
  "\u0434\u0435\u043b\u0430\u043b\u0430",
  "\u0441\u0434\u0435\u043b\u0430\u043b",
  "\u0441\u0434\u0435\u043b\u0430\u043b\u0430",
  "\u0435\u043b",
  "\u0435\u043b\u0430",
  "\u043f\u0438\u043b",
  "\u043f\u0438\u043b\u0430",
  "worked",
  "studied",
  "learned",
  "read",
  "watched",
  "listened",
  "walked",
  "trained",
  "exercised",
  "ate",
  "drank",
  "trabaje",
  "estudie",
  "aprendi",
  "camine",
  "entrene",
  "comi",
  "bebi",
  "arbeitete",
  "gelernt",
  "gelesen",
  "gehort",
  "gesehen",
  "gegangen",
  "trainiert",
  "gegessen",
  "getrunken",
  "pracowalem",
  "pracowalam",
  "uczylem",
  "uczylam",
  "czytalem",
  "czytalam",
  "spacerowalem",
  "spacerowalam",
  "trenowalem",
  "trenowalam",
  "jadlem",
  "jadlam",
];

const AVO_GENERAL_COMPLETED_RESULT_MARKERS: readonly string[] = [
  "\u0441\u0434\u0435\u043b\u0430\u043b",
  "\u0441\u0434\u0435\u043b\u0430\u043b\u0430",
  "\u0437\u0430\u043a\u043e\u043d\u0447\u0438\u043b",
  "\u0437\u0430\u043a\u043e\u043d\u0447\u0438\u043b\u0430",
  "\u043f\u0440\u043e\u0448\u0435\u043b",
  "\u043f\u0440\u043e\u0448\u043b\u0430",
  "\u043f\u0440\u043e\u0447\u0438\u0442\u0430\u043b",
  "\u043f\u0440\u043e\u0447\u0438\u0442\u0430\u043b\u0430",
  "\u043d\u0430\u043f\u0438\u0441\u0430\u043b",
  "\u043d\u0430\u043f\u0438\u0441\u0430\u043b\u0430",
  "\u043e\u0442\u043f\u0440\u0430\u0432\u0438\u043b",
  "\u043e\u0442\u043f\u0440\u0430\u0432\u0438\u043b\u0430",
  "finished",
  "completed",
  "sent",
  "wrote",
  "termine",
  "complete",
  "beendet",
  "fertig",
  "skonczylem",
  "skonczylam",
  "wyslalem",
  "wyslalam",
];

const AVO_GENERAL_TIME_MARKERS: readonly string[] = [
  "\u0441\u0435\u0433\u043e\u0434\u043d\u044f",
  "\u0432\u0447\u0435\u0440\u0430",
  "\u0443\u0442\u0440\u043e\u043c",
  "\u0434\u043d\u0435\u043c",
  "\u0434\u043d\u0451\u043c",
  "\u0432\u0435\u0447\u0435\u0440\u043e\u043c",
  "\u043d\u043e\u0447\u044c\u044e",
  "today",
  "yesterday",
  "morning",
  "evening",
  "ayer",
  "hoy",
  "gestern",
  "heute",
  "wczoraj",
  "dzisiaj",
];

const AVO_GENERAL_QUESTION_MARKERS: readonly string[] = [
  "?",
  "\u0447\u0442\u043e ",
  "\u043a\u0430\u043a ",
  "\u043f\u043e\u0447\u0435\u043c\u0443 ",
  "\u043d\u043e\u0440\u043c\u0430\u043b\u044c\u043d\u043e",
  "what ",
  "how ",
  "why ",
  "normal",
  "que ",
  "como ",
  "warum ",
  "czy ",
  "jak ",
];

function normalizeAvoGeneralSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function hasAvoGeneralMarker(text: string, markers: readonly string[]): boolean {
  return markers.some((marker) => text.includes(marker));
}

function hasAvoGeneralPastActionShape(text: string): boolean {
  return /\b[\p{L}]{3,}(?:\u043b|\u043b\u0430|\u043b\u0438|\u043b\u0441\u044f|\u043b\u0430\u0441\u044c)\b/iu.test(text);
}

function hasAvoGeneralDurationSignal(text: string): boolean {
  if (hasAvoDurationSignal(text)) {
    return true;
  }

  return /\b\d{1,2}[:.]\d{2}\b/.test(text);
}

function parseAvoGeneralNumber(value: string): number | null {
  const parsed = Number.parseFloat(value.replace(",", "."));

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function inferAvoGeneralDurationMinutes(text: string): number | null {
  const lowerText = normalizeAvoGeneralSearchText(text);

  if (hasAvoUnicodeMarker(lowerText, AVO_RU_HALF_HOUR_MARKERS)) {
    return 30;
  }

  if (lowerText.includes("\u043f\u043e\u043b\u0442\u043e\u0440\u0430 \u0447\u0430\u0441\u0430")) {
    return 90;
  }

  const clockMatch = lowerText.match(/\b(\d{1,2})[:.](\d{2})\b/);
  if (clockMatch) {
    const hours = Number.parseInt(clockMatch[1] ?? "", 10);
    const minutes = Number.parseInt(clockMatch[2] ?? "", 10);

    if (
      Number.isFinite(hours) &&
      Number.isFinite(minutes) &&
      hours >= 0 &&
      hours <= 24 &&
      minutes >= 0 &&
      minutes < 60
    ) {
      return hours * 60 + minutes;
    }
  }

  let totalMinutes = 0;

  const hourRegex = /(\d+(?:[.,]\d+)?)\s*(?:\u0447\u0430\u0441|\u0447\u0430\u0441\u0430|\u0447\u0430\u0441\u043e\u0432|h|hour|hours|hora|horas|stunde|stunden|godzin|godziny)\b/giu;
  let hourMatch = hourRegex.exec(lowerText);
  while (hourMatch !== null) {
    const value = parseAvoGeneralNumber(hourMatch[1] ?? "");
    if (value !== null) {
      totalMinutes += value * 60;
    }

    hourMatch = hourRegex.exec(lowerText);
  }

  const minuteRegex = /(\d+(?:[.,]\d+)?)\s*(?:\u043c\u0438\u043d|\u043c\u0438\u043d\u0443\u0442|\u043c\u0438\u043d\u0443\u0442\u044b|min|mins|minute|minutes|minuto|minutos|minuten|minuty|minut)\b/giu;
  let minuteMatch = minuteRegex.exec(lowerText);
  while (minuteMatch !== null) {
    const value = parseAvoGeneralNumber(minuteMatch[1] ?? "");
    if (value !== null) {
      totalMinutes += value;
    }

    minuteMatch = minuteRegex.exec(lowerText);
  }

  if (totalMinutes > 0 && totalMinutes <= 1440) {
    return Math.round(totalMinutes);
  }

  return null;
}

function inferAvoGeneralActivityTitle(text: string): string | null {
  const lowerText = normalizeAvoGeneralSearchText(text);

  if (hasAvoGeneralMarker(lowerText, AVO_GENERAL_SLEEP_MARKERS)) {
    return "\u0421\u043e\u043d";
  }

  if (
    hasAvoGeneralMarker(lowerText, [
      "\u0440\u0430\u0431\u043e\u0442\u0430\u043b",
      "\u0440\u0430\u0431\u043e\u0442\u0430\u043b\u0430",
      "worked",
      "arbeitete",
      "pracowalem",
      "pracowalam",
    ])
  ) {
    return "\u0420\u0430\u0431\u043e\u0442\u0430";
  }

  if (
    hasAvoGeneralMarker(lowerText, [
      "\u0443\u0447\u0438\u043b",
      "\u0443\u0447\u0438\u043b\u0430",
      "\u0437\u0430\u043d\u0438\u043c\u0430\u043b\u0441\u044f",
      "\u0437\u0430\u043d\u0438\u043c\u0430\u043b\u0430\u0441\u044c",
      "studied",
      "learned",
      "gelernt",
      "uczylem",
      "uczylam",
    ])
  ) {
    return "\u041e\u0431\u0443\u0447\u0435\u043d\u0438\u0435";
  }

  if (
    hasAvoGeneralMarker(lowerText, [
      "\u0433\u0443\u043b\u044f\u043b",
      "\u0433\u0443\u043b\u044f\u043b\u0430",
      "walked",
      "spacerowalem",
      "spacerowalam",
    ])
  ) {
    return "\u041f\u0440\u043e\u0433\u0443\u043b\u043a\u0430";
  }

  if (
    hasAvoGeneralMarker(lowerText, [
      "\u0442\u0440\u0435\u043d\u0438\u0440\u043e\u0432\u0430\u043b\u0441\u044f",
      "\u0442\u0440\u0435\u043d\u0438\u0440\u043e\u0432\u0430\u043b\u0430\u0441\u044c",
      "trained",
      "exercised",
      "trainiert",
      "trenowalem",
      "trenowalam",
    ])
  ) {
    return "\u0422\u0440\u0435\u043d\u0438\u0440\u043e\u0432\u043a\u0430";
  }

  if (hasAvoGeneralMarker(lowerText, AVO_GENERAL_STATE_MARKERS)) {
    return "\u0421\u0430\u043c\u043e\u0447\u0443\u0432\u0441\u0442\u0432\u0438\u0435";
  }

  return null;
}

function detectGeneralActivityCandidate(message: string): AvoGeneralActivityCandidate {
  const normalizedText = message.trim();
  const searchText = normalizeAvoGeneralSearchText(normalizedText);
  const reasons: string[] = [];
  let score = 0;

  if (!normalizedText) {
    return { kind: "ordinary_chat", score: 0, reasons: ["empty message"] };
  }

  if (hasAvoGeneralMarker(searchText, AVO_GENERAL_NO_SAVE_MARKERS)) {
    return { kind: "ordinary_chat", score: 0, reasons: ["explicit no-save guard"] };
  }

  if (hasAvoGeneralMarker(searchText, AVO_GENERAL_FUTURE_PLAN_MARKERS)) {
    return {
      kind: "ordinary_chat",
      score: 0.18,
      reasons: ["future/plan marker; not a completed activity"],
    };
  }

  const hasQuestionSignal =
    normalizedText.includes("?") ||
    hasAvoGeneralMarker(searchText, AVO_GENERAL_QUESTION_MARKERS);
  const hasDuration = hasAvoGeneralDurationSignal(searchText);
  const hasSleep = hasAvoGeneralMarker(searchText, AVO_GENERAL_SLEEP_MARKERS);
  const hasState = hasAvoGeneralMarker(searchText, AVO_GENERAL_STATE_MARKERS);
  const hasSelf = hasAvoGeneralMarker(searchText, AVO_GENERAL_SELF_MARKERS);
  const hasAction = hasAvoGeneralMarker(searchText, AVO_GENERAL_ACTION_MARKERS);
  const hasCompletedResult = hasAvoGeneralMarker(
    searchText,
    AVO_GENERAL_COMPLETED_RESULT_MARKERS,
  );
  const hasTime = hasAvoGeneralMarker(searchText, AVO_GENERAL_TIME_MARKERS);
  const hasPastActionShape = hasAvoGeneralPastActionShape(searchText);

  if (hasDuration) {
    score += 0.35;
    reasons.push("duration marker");
  }

  if (hasSleep) {
    score += 0.45;
    reasons.push("sleep/recovery marker");
  }

  if (hasAction) {
    score += 0.35;
    reasons.push("completed/self action marker");
  }

  if (hasCompletedResult) {
    score += 0.3;
    reasons.push("completed-result marker");
  }

  if (hasPastActionShape) {
    score += 0.24;
    reasons.push("past-action word shape");
  }

  if (hasSelf) {
    score += 0.15;
    reasons.push("self/implied-user marker");
  }

  if (hasTime) {
    score += 0.12;
    reasons.push("time marker");
  }

  if (hasState) {
    score += 0.24;
    reasons.push("state/health marker");
  }

  const looksLikeSelfFact =
    hasSleep ||
    hasAction ||
    hasState ||
    hasCompletedResult ||
    (hasPastActionShape && (hasDuration || hasSelf || hasTime));

  if (hasQuestionSignal && looksLikeSelfFact) {
    return {
      kind: "dual_intent_question_activity",
      score: Math.min(0.95, score + 0.12),
      reasons: [...reasons, "question + self activity/state fact"],
    };
  }

  if (score >= 0.62 && looksLikeSelfFact) {
    return {
      kind: "obvious_activity",
      score: Math.min(0.95, score),
      reasons,
    };
  }

  if (score >= 0.38 && looksLikeSelfFact) {
    return {
      kind: "ambiguous_activity",
      score,
      reasons,
    };
  }

  return {
    kind: "ordinary_chat",
    score,
    reasons: reasons.length > 0 ? reasons : ["no activity candidate signal"],
  };
}

function classifyAvoCyrillicRouteOverride(
  normalizedText: string,
): UnifiedMessageClassification | null {
  const lowerText = normalizeAvoGeneralSearchText(normalizedText);

  if (hasAvoGeneralMarker(lowerText, AVO_GENERAL_NO_SAVE_MARKERS)) {
    return {
      intent: "cancel",
      confidence: 0.96,
      reason: "Explicit no-save / do-not-record guard recognized.",
      normalizedText,
    };
  }
  if (hasAvoUnicodeMarker(normalizedText, AVO_RU_CONFIRMATION_MARKERS)) {
    return {
      intent: "confirmation",
      confidence: 0.93,
      reason: "Confirmation command recognized by Unicode-safe Cyrillic markers.",
      normalizedText,
    };
  }

  if (hasAvoUnicodeMarker(normalizedText, AVO_RU_CANCEL_MARKERS)) {
    return {
      intent: "cancel",
      confidence: 0.9,
      reason: "Cancel command recognized by Unicode-safe Cyrillic markers.",
      normalizedText,
    };
  }

  if (hasAvoUnicodeMarker(normalizedText, AVO_RU_REVIEW_MARKERS)) {
    return {
      intent: "review_request",
      confidence: 0.88,
      reason: "Review request recognized by Unicode-safe Cyrillic markers.",
      normalizedText,
    };
  }

  if (hasAvoUnicodeMarker(normalizedText, AVO_RU_CORRECTION_MARKERS)) {
    return {
      intent: "correction",
      confidence: 0.86,
      reason: "Correction command recognized by Unicode-safe Cyrillic markers.",
      normalizedText,
    };
  }

  const hasActivityPrefix = hasAvoUnicodeMarker(
    normalizedText,
    AVO_RU_ACTIVITY_PREFIX_MARKERS,
  );
  const hasDuration = hasAvoDurationSignal(normalizedText);
  const hasActivityAction = hasAvoUnicodeMarker(
    normalizedText,
    AVO_RU_ACTIVITY_ACTION_MARKERS,
  );
  const hasHealthContext = hasAvoUnicodeMarker(
    normalizedText,
    AVO_RU_HEALTH_ACTIVITY_MARKERS,
  );

  if (hasActivityPrefix || (hasDuration && (hasActivityAction || hasHealthContext))) {
    return {
      intent: "activity_preview",
      confidence: hasActivityPrefix ? 0.9 : 0.82,
      reason: "Activity preview recognized by Unicode-safe Cyrillic markers.",
      normalizedText,
    };
  }

  return null;
}

function inferActivityRecordPayloadDurationMinutes(
  preview: LocalPendingPreview,
): number | null {
  const generalDurationMinutes = inferAvoGeneralDurationMinutes(
    [preview.duration ?? "", preview.text].filter(Boolean).join(" "),
  );
  if (generalDurationMinutes !== null) {
    return generalDurationMinutes;
  }
  const source = `${preview.duration ?? ""} ${preview.text}`.toLowerCase();

  // AVO_STEP20_9_2_DURATION_PATCH
  if (hasAvoUnicodeMarker(source, AVO_RU_HALF_HOUR_MARKERS)) {
    return 30;
  }

  const avoMinuteMatch = source.match(/(\d+)\s*(\u043c\u0438\u043d|\u043c\u0438\u043d\u0443\u0442|min|m)\b/i);
  if (avoMinuteMatch?.[1]) {
    return Number.parseInt(avoMinuteMatch[1], 10);
  }

  const avoHourMatch = source.match(/(\d+)\s*(\u0447\u0430\u0441|\u0447\u0430\u0441\u0430|\u0447\u0430\u0441\u043e\u0432|h)\b/i);
  if (avoHourMatch?.[1]) {
    return Number.parseInt(avoHourMatch[1], 10) * 60;
  }

  if (source.includes("полчаса")) {
    return 30;
  }

  if (source.includes("полтора часа")) {
    return 90;
  }

  const hourMatch = source.match(/(\d+)\s*(час|часа|часов|h)/i);
  if (hourMatch?.[1]) {
    return Number.parseInt(hourMatch[1], 10) * 60;
  }

  const minuteMatch = source.match(/(\d+)\s*(мин|минут|min)/i);
  if (minuteMatch?.[1]) {
    return Number.parseInt(minuteMatch[1], 10);
  }

  return null;
}

function inferActivityRecordPayloadTitle(preview: LocalPendingPreview): string {
  const generalTitle = inferAvoGeneralActivityTitle(preview.text);
  if (generalTitle !== null) {
    return generalTitle;
  }
  const text = preview.text.toLowerCase();

  // AVO_STEP20_9_2_TITLE_PATCH
  if (hasAvoUnicodeMarker(text, AVO_RU_HEALTH_ACTIVITY_MARKERS)) {
    if (hasAvoUnicodeMarker(text, ["\u0441\u0442\u043e\u043c\u0430\u0442\u043e\u043b\u043e\u0433", "\u0437\u0443\u0431\u043d"])) {
      return "\u041f\u0440\u043e\u0444\u0438\u043b\u0430\u043a\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0439 \u043f\u0440\u0438\u0451\u043c \u0443 \u0441\u0442\u043e\u043c\u0430\u0442\u043e\u043b\u043e\u0433\u0430";
    }
  }

  if (text.includes("стоматолог")) {
    return "Профилактический приём у стоматолога";
  }

  return preview.text;
}

function buildControlledActivityRecordPayloadPreviewLines(): string[] {
  if (!latestLocalPendingPreview || latestLocalPendingPreview.kind !== "activity") {
    return [
      "Controlled write payload preview: unavailable.",
      "Reason: latest pending preview is not an activity.",
    ];
  }

  const durationMinutes = inferActivityRecordPayloadDurationMinutes(
    latestLocalPendingPreview,
  );
  const title = inferActivityRecordPayloadTitle(latestLocalPendingPreview);

  return [
    "Controlled write payload preview:",
    "Target route: POST /api/activity/record",
    "Payload is NOT sent at this step.",
    "",
    "Planned body:",
    "templateSlug: ai-navigator-manual-activity",
    `naturalInput: ${latestLocalPendingPreview.text}`,
    `title: ${title}`,
    `durationMinutes: ${durationMinutes ?? "needs_review"}`,
    "sourceType: manual_chat",
    "status: completed",
    "",
    "Not sent in first controlled payload:",
    "categoryCandidates: preview only",
    "valueObjectCandidates: preview only",
    "",
    "Safety:",
    "Activity Event still NOT created.",
    "DB write still NOT executed.",
    "Service Log write still NOT executed.",
  ];
}

function formatLatestLocalPendingPreviewLines(): string[] {
  if (!latestLocalPendingPreview) {
    return [
      "Pending preview: отсутствует.",
      "Сейчас нечего подтверждать, отменять или показывать как review.",
      "Сначала введите активность, команду по Value Object или исправление.",
    ];
  }

  const lines = [
    `Pending preview kind: ${latestLocalPendingPreview.kind}`,
    `Pending preview created: ${latestLocalPendingPreview.createdAtIso}`,
    `Pending preview text: ${latestLocalPendingPreview.text}`,
  ];

  if (latestLocalPendingPreview.duration) {
    lines.push(`Pending duration: ${latestLocalPendingPreview.duration}`);
  }

  if (latestLocalPendingPreview.categories?.length) {
    lines.push(`Pending category candidates: ${latestLocalPendingPreview.categories.join(", ")}`);
  }

  if (latestLocalPendingPreview.valueObjects?.length) {
    lines.push(`Pending Value Object candidates: ${latestLocalPendingPreview.valueObjects.join(", ")}`);
  }

  lines.push(`Pending note: ${latestLocalPendingPreview.note}`);

  if (latestLocalPendingPreview.kind === "activity") {
    lines.push("", ...buildControlledActivityRecordPayloadPreviewLines());
  }

  return lines;
}
const ACTIVITY_DURATION_PATTERNS = [
  /(^|\s)\d+\s*(мин|минут|час|часа|часов|h|min)(\s|$|[.,;:!?])/i,
  /(^|\s)полчаса(\s|$|[.,;:!?])/i,
  /(^|\s)полтора\s+часа(\s|$|[.,;:!?])/i,
];

const ACTIVITY_ACTION_PATTERNS = [
  /был/i,
  /была/i,
  /делал/i,
  /делала/i,
  /занимался/i,
  /занималась/i,
  /учил/i,
  /учила/i,
  /работал/i,
  /работала/i,
  /тренировался/i,
  /тренировалась/i,
  /ходил/i,
  /ходила/i,
  /читал/i,
  /читала/i,
];

function includesAny(text: string, values: readonly string[]) {
  const lowerText = text.toLowerCase();

  return values.some((value) => lowerText.includes(value.toLowerCase()));
}

function classifyUnifiedMessage(message: string): UnifiedMessageClassification {
  const normalizedText = message.trim();

  const cyrillicRouteOverride = classifyAvoCyrillicRouteOverride(normalizedText);
  if (cyrillicRouteOverride) {
    return cyrillicRouteOverride;
  }


  const generalActivityCandidate = detectGeneralActivityCandidate(normalizedText);
  if (
    generalActivityCandidate.kind === "obvious_activity" ||
    generalActivityCandidate.kind === "dual_intent_question_activity" ||
    generalActivityCandidate.kind === "ambiguous_activity"
  ) {
    return {
      intent: "activity_preview",
      confidence: generalActivityCandidate.score,
      reason: `General activity candidate (${generalActivityCandidate.kind}): ${generalActivityCandidate.reasons.join(", ")}.`,
      normalizedText,
    };
  }
  const lowerText = normalizedText.toLowerCase();

  const hasQuestionMark = normalizedText.includes("?");
  const isQuestion =
    hasQuestionMark ||
    lowerText.startsWith("как ") ||
    lowerText.startsWith("что ") ||
    lowerText.startsWith("почему ") ||
    lowerText.startsWith("зачем ") ||
    lowerText.startsWith("где ") ||
    lowerText.startsWith("когда ");

  const hasActivityPrefix =
    lowerText.startsWith("запиши ") ||
    lowerText.startsWith("записать ") ||
    lowerText.startsWith("добавь активность") ||
    lowerText.startsWith("добавить активность") ||
    lowerText.startsWith("сохрани активность");

  const hasDuration = ACTIVITY_DURATION_PATTERNS.some((pattern) =>
    pattern.test(normalizedText),
  );

  const hasActivityAction = ACTIVITY_ACTION_PATTERNS.some((pattern) =>
    pattern.test(normalizedText),
  );

  const hasHealthOrWorkActivityContext = includesAny(normalizedText, [
    "стоматолог",
    "врач",
    "прием",
    "приём",
    "тренировка",
    "подтягив",
    "отжиман",
    "прогулка",
    "немецк",
    "испанск",
    "английск",
    "польск",
    "b2b",
    "продаж",
    "работ",
    "учеб",
    "занят",
    "созвон",
    "переговор",
  ]);

  const hasValueObjectCommand = includesAny(normalizedText, [
    "ценный объект",
    "value object",
    "value objects",
    "vo ",
    "создай объект",
    "создать объект",
    "архивируй объект",
    "архивировать объект",
    "утверди объект",
    "утвердить объект",
  ]);

  const hasCorrectionCommand = includesAny(normalizedText, [
    "исправь",
    "исправить",
    "ошибка",
    "неправильно",
    "измени последнюю",
    "измени активность",
    "удали последнюю",
    "откати",
    "rollback",
  ]);

  const hasConfirmationCommand = includesAny(normalizedText, [
    "подтверждаю активность",
    "подтвердить активность",
    "сохрани активность",
    "сохранить активность",
    "подтверждаю value object",
    "подтверждаю объект",
    "подтвердить объект",
    "подтверждаю исправление",
    "подтвердить исправление",
  ]);

  const hasCancelCommand = includesAny(normalizedText, [
    "отмена",
    "отмени",
    "отменить",
    "не сохранять",
    "не записывать",
    "cancel",
  ]);

  const hasReviewRequest = includesAny(normalizedText, [
    "показать review",
    "покажи review",
    "показать ревью",
    "покажи ревью",
    "показать diff",
    "покажи diff",
    "review",
  ]);

  if (hasConfirmationCommand) {
    return {
      intent: "confirmation",
      confidence: 0.92,
      reason: "Найдена команда подтверждения. До подключения write gate её нельзя отправлять в обычный чат.",
      normalizedText,
    };
  }

  if (hasCancelCommand) {
    return {
      intent: "cancel",
      confidence: 0.9,
      reason: "Найдена команда отмены текущего preview/gate.",
      normalizedText,
    };
  }

  if (hasReviewRequest) {
    return {
      intent: "review_request",
      confidence: 0.88,
      reason: "Найдена команда показать review/diff перед сохранением.",
      normalizedText,
    };
  }

  if (hasCorrectionCommand) {
    return {
      intent: "correction",
      confidence: 0.86,
      reason: "Найдено намерение исправить, изменить, удалить или откатить прошлую запись.",
      normalizedText,
    };
  }

  if (hasValueObjectCommand) {
    return {
      intent: "value_object_command",
      confidence: 0.84,
      reason: "Найдена команда, связанная с созданием, утверждением или архивированием Value Object.",
      normalizedText,
    };
  }

  if (hasActivityPrefix || (hasDuration && (hasActivityAction || hasHealthOrWorkActivityContext))) {
    return {
      intent: "activity_preview",
      confidence: hasActivityPrefix ? 0.9 : 0.78,
      reason: "Сообщение похоже на запись активности: есть длительность, действие или контекст активности.",
      normalizedText,
    };
  }

  if (!isQuestion && hasActivityAction && hasHealthOrWorkActivityContext) {
    return {
      intent: "clarification",
      confidence: 0.58,
      reason: "Сообщение похоже на активность, но не хватает длительности или явного намерения записать.",
      normalizedText,
    };
  }

  return {
    intent: "chat",
    confidence: isQuestion ? 0.82 : 0.62,
    reason: "Сообщение похоже на обычный вопрос или диалог с AI.",
    normalizedText,
  };
}

function extractDurationSummary(text: string): string {
  const lowerText = text.toLowerCase();

  if (lowerText.includes("полчаса")) {
    return "примерно 30 минут";
  }

  if (lowerText.includes("полтора часа")) {
    return "примерно 90 минут";
  }

  const match = text.match(/(\d+)\s*(мин|минут|час|часа|часов|h|min)/i);

  if (!match) {
    return "длительность не определена";
  }

  const amount = match[1];
  const unit = match[2].toLowerCase();

  if (unit.startsWith("час") || unit === "h") {
    return `${amount} ч.`;
  }

  return `${amount} мин.`;
}

function guessCategoryCandidates(text: string): string[] {
  const categories = new Set<string>();
  const lowerText = text.toLowerCase();

  if (includesAny(lowerText, ["стоматолог", "врач", "прием", "приём", "здоров"])) {
    categories.add("Здоровье");
    categories.add("Медицинская профилактика");
  }

  if (includesAny(lowerText, ["стоматолог", "зуб", "зубы"])) {
    categories.add("Стоматология");
  }

  if (includesAny(lowerText, ["немецк", "испанск", "английск", "польск", "учил", "учила"])) {
    categories.add("Обучение");
    categories.add("Языки");
  }

  if (includesAny(lowerText, ["подтягив", "отжиман", "трениров", "зал", "присед", "планка"])) {
    categories.add("Физическая активность");
    categories.add("Здоровье");
  }

  if (includesAny(lowerText, ["b2b", "продаж", "клиент", "переговор", "созвон"])) {
    categories.add("B2B продажи");
    categories.add("Работа");
  }

  if (categories.size === 0) {
    categories.add("Личная активность");
  }

  return Array.from(categories).slice(0, 6);
}

function guessValueObjectCandidates(categories: readonly string[]): string[] {
  const valueObjects = new Set<string>();

  for (const category of categories) {
    if (category === "Здоровье" || category === "Медицинская профилактика") {
      valueObjects.add("Здоровье");
      valueObjects.add("Профилактика здоровья");
    }

    if (category === "Стоматология") {
      valueObjects.add("Стоматология");
    }

    if (category === "Обучение" || category === "Языки") {
      valueObjects.add("Изучение языков");
    }

    if (category === "Физическая активность") {
      valueObjects.add("Физическая форма");
    }

    if (category === "B2B продажи") {
      valueObjects.add("B2B продажи");
    }

    if (category === "Работа") {
      valueObjects.add("Карьера");
    }
  }

  if (valueObjects.size === 0) {
    valueObjects.add("Личное развитие");
  }

  return Array.from(valueObjects).slice(0, 6);
}

function buildLocalActivityPreviewReply(classification: UnifiedMessageClassification): string {
  const duration = extractDurationSummary(classification.normalizedText);
  const categories = guessCategoryCandidates(classification.normalizedText);
  const valueObjects = guessValueObjectCandidates(categories);

  setLatestLocalPendingPreview({
    kind: "activity",
    text: classification.normalizedText,
    createdAtIso: new Date().toISOString(),
    duration,
    categories,
    valueObjects,
    note: "Activity preview candidate. No governed write has been executed yet.",
  });

  return [
    "Я понял это как возможную активность.",
    "",
    `Текст: ${classification.normalizedText}`,
    `Длительность: ${duration}`,
    `Intent: ${classification.intent}`,
    `Confidence: ${Math.round(classification.confidence * 100)}%`,
    `Причина распознавания: ${classification.reason}`,
    "",
    `Category candidates: ${categories.join(", ")}`,
    `Value Object candidates: ${valueObjects.join(", ")}`,
    "",
    "Статус: local preview only.",
    "Пока не создан Activity Event, не созданы категории, не создан и не обновлён Value Object, нет DB write.",
    "",
    "Следующий gate: показать пользователю review-карточку и попросить подтверждение перед сохранением.",
    "",
    "Что можно написать дальше в этом же поле:",
    "— подтверждаю активность",
    "— исправить: было 45 минут",
    "— отмена",
    "— показать review",
  ].join("\n");
}
function buildValueObjectCommandPreviewReply(classification: UnifiedMessageClassification): string {
  setLatestLocalPendingPreview({
    kind: "value_object",
    text: classification.normalizedText,
    createdAtIso: new Date().toISOString(),
    note: "Value Object command preview. No governed write has been executed yet.",
  });

  return [
    "Я понял это как команду по Value Object.",
    "",
    `Текст: ${classification.normalizedText}`,
    `Confidence: ${Math.round(classification.confidence * 100)}%`,
    `Причина распознавания: ${classification.reason}`,
    "",
    "Статус: local preview only.",
    "Пока не создан, не утверждён, не изменён и не архивирован ни один Value Object.",
    "",
    "Следующий gate: показать preview действия с объектом и попросить явное подтверждение.",
    "",
    "Что можно написать дальше в этом же поле:",
    "— подтверждаю Value Object",
    "— исправить объект: ...",
    "— архивировать объект",
    "— отмена",
  ].join("\n");
}
function buildCorrectionPreviewReply(classification: UnifiedMessageClassification): string {
  setLatestLocalPendingPreview({
    kind: "correction",
    text: classification.normalizedText,
    createdAtIso: new Date().toISOString(),
    note: "Correction preview. No governed write has been executed yet.",
  });

  return [
    "Я понял это как возможное исправление прошлой активности или объекта.",
    "",
    `Текст: ${classification.normalizedText}`,
    `Confidence: ${Math.round(classification.confidence * 100)}%`,
    `Причина распознавания: ${classification.reason}`,
    "",
    "Статус: local preview only.",
    "Пока не изменена история, не создан correction row и не выполнен rollback.",
    "",
    "Следующий gate: найти целевую запись, показать пользователю diff и попросить подтверждение.",
    "",
    "Что можно написать дальше в этом же поле:",
    "— подтверждаю исправление",
    "— исправить: ...",
    "— отмена",
    "— показать diff",
  ].join("\n");
}
function buildConfirmationGuardReply(classification: UnifiedMessageClassification): string {
  const pendingLines = formatLatestLocalPendingPreviewLines();

  return [
    "Подтверждение получено как намерение, но сохранение ещё не выполнено.",
    "",
    `Текст команды: ${classification.normalizedText}`,
    `Intent: ${classification.intent}`,
    `Confidence: ${Math.round(classification.confidence * 100)}%`,
    `Причина распознавания: ${classification.reason}`,
    "",
    "Связанный pending preview:",
    ...pendingLines,
    "",
    "Статус: confirmation preview only.",
    "Activity Event пока НЕ создан.",
    "Категории пока НЕ сохранены.",
    "Value Objects пока НЕ созданы и НЕ обновлены.",
    "Correction row пока НЕ создан.",
    "DB write НЕ выполнен.",
    "Service Log write НЕ выполнен.",
    "",
    "Следующий технический gate: показать финальную review-карточку и только потом выполнить governed write.",
  ].join("\n");
}
function buildCancelGuardReply(classification: UnifiedMessageClassification): string {
  const pendingLines = formatLatestLocalPendingPreviewLines();
  clearLatestLocalPendingPreview();

  return [
    "Отмена принята как команда к текущему preview.",
    "",
    `Текст команды: ${classification.normalizedText}`,
    `Intent: ${classification.intent}`,
    `Confidence: ${Math.round(classification.confidence * 100)}%`,
    "",
    "Отменённый pending preview:",
    ...pendingLines,
    "",
    "Статус: cancel preview only.",
    "Никакая активность не создана.",
    "Никакой Value Object не создан и не архивирован.",
    "DB write НЕ выполнен.",
    "Service Log write НЕ выполнен.",
  ].join("\n");
}
function buildReviewRequestGuardReply(classification: UnifiedMessageClassification): string {
  const pendingLines = formatLatestLocalPendingPreviewLines();

  return [
    "Запрос на review/diff принят.",
    "",
    `Текст команды: ${classification.normalizedText}`,
    `Intent: ${classification.intent}`,
    `Confidence: ${Math.round(classification.confidence * 100)}%`,
    "",
    "Review pending preview:",
    ...pendingLines,
    "",
    "Статус: review request preview only.",
    "DB write НЕ выполнен.",
    "Service Log write НЕ выполнен.",
    "",
    "Следующий технический gate: превратить этот pending preview в UI review-card перед governed write.",
  ].join("\n");
}
function buildClarificationReply(classification: UnifiedMessageClassification): string {
  return [
    "Похоже, это может быть активность, но я не должен угадывать и записывать факт без подтверждения.",
    "",
    `Текст: ${classification.normalizedText}`,
    `Причина: ${classification.reason}`,
    "",
    "Ты хочешь:",
    "1. Просто обсудить это в чате?",
    "2. Записать это как активность?",
    "3. Создать или обновить Value Object?",
    "",
    "Ответь, например: “запиши это как активность” или “это просто вопрос”.",
  ].join("\n");
}

type NoWriteSemanticPreviewResponse = Record<string, unknown>;

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function addUniqueCandidate(
  target: Set<string>,
  value: unknown,
  maxLength = 80,
) {
  if (typeof value !== "string") {
    return;
  }

  const normalized = value.trim();

  if (
    normalized.length < 2 ||
    normalized.length > maxLength ||
    normalized.includes("/") ||
    normalized.includes("_route_") ||
    normalized.includes("_contract") ||
    normalized.includes("_v0")
  ) {
    return;
  }

  target.add(normalized);
}

function collectSemanticLabelsByHints(
  value: unknown,
  keyHints: readonly string[],
  limit = 8,
): string[] {
  const result = new Set<string>();
  const normalizedHints = keyHints.map((hint) => hint.toLowerCase());
  const labelKeyHints = [
    "title",
    "name",
    "label",
    "displayname",
    "canonicalname",
    "canonicalLabel",
    "key",
  ].map((hint) => hint.toLowerCase());

  const excludedPathParts = [
    "sourcecontracts",
    "endpoint",
    "routemode",
    "routecontractversion",
    "adapterversion",
    "sideeffects",
    "rules",
    "errors",
    "warnings",
  ];

  function pathHasHint(path: string) {
    const lowerPath = path.toLowerCase();

    return normalizedHints.some((hint) => lowerPath.includes(hint));
  }

  function pathIsExcluded(path: string) {
    const lowerPath = path.toLowerCase();

    return excludedPathParts.some((part) => lowerPath.includes(part));
  }

  function keyLooksLikeLabel(key: string) {
    const lowerKey = key.toLowerCase();

    return (
      labelKeyHints.some((hint) => lowerKey.includes(hint)) ||
      normalizedHints.some((hint) => lowerKey === hint || lowerKey.endsWith(hint))
    );
  }

  function visit(node: unknown, path: string, depth: number) {
    if (result.size >= limit || depth > 7 || pathIsExcluded(path)) {
      return;
    }

    if (typeof node === "string") {
      if (pathHasHint(path)) {
        addUniqueCandidate(result, node);
      }

      return;
    }

    if (Array.isArray(node)) {
      for (const item of node) {
        visit(item, path, depth + 1);

        if (result.size >= limit) {
          return;
        }
      }

      return;
    }

    if (!isJsonRecord(node)) {
      return;
    }

    for (const [key, child] of Object.entries(node)) {
      const nextPath = path ? `${path}.${key}` : key;

      if (typeof child === "string" && pathHasHint(nextPath) && keyLooksLikeLabel(key)) {
        addUniqueCandidate(result, child);
      }

      visit(child, nextPath, depth + 1);

      if (result.size >= limit) {
        return;
      }
    }
  }

  visit(value, "", 0);

  return Array.from(result);
}

function formatSemanticSideEffects(data: NoWriteSemanticPreviewResponse): string[] {
  const sideEffects = data.sideEffects;

  if (!isJsonRecord(sideEffects)) {
    return ["Side effects: not returned"];
  }

  const keys = [
    "sqlExecuted",
    "dbReadExecuted",
    "dbWriteExecuted",
    "activityEventCreated",
    "stableBundlePersisted",
    "valueObjectCreated",
    "activityValueObjectLinkCreated",
    "stateFactCreated",
    "stateDeltaCreated",
    "stateSnapshotCreated",
    "rowsActuallyWritten",
  ];

  return keys.map((key) => `${key}: ${String(sideEffects[key] ?? "unknown")}`);
}

function getSemanticErrorMessage(data: NoWriteSemanticPreviewResponse, fallback: string) {
  const errors = data.errors;

  if (Array.isArray(errors) && errors.length > 0) {
    return errors.map((error) => String(error)).join("; ");
  }

  if (typeof data.error === "string") {
    return data.error;
  }

  return fallback;
}

function buildActivityReviewPackageLines(params: {
  rawText: string;
  duration: string;
  categories: string[];
  valueObjects: string[];
  routeMode: string;
}): string[] {
  const normalizedTitle =
    params.categories.includes("Стоматология") ||
    params.rawText.toLowerCase().includes("стоматолог")
      ? "Профилактический приём у стоматолога"
      : params.rawText;

  const privacyMarker =
    params.categories.includes("Стоматология") ||
    params.categories.includes("Здоровье") ||
    params.categories.includes("Медицинская профилактика")
      ? "private / sensitive candidate"
      : "private by default";

  return [
    "Activity Review Package:",
    "",
    "Normalized activity:",
    `Title: ${normalizedTitle}`,
    `Duration: ${params.duration}`,
    "Status: preview",
    `Privacy: ${privacyMarker}`,
    "",
    "Parsed fields:",
    `rawText: ${params.rawText}`,
    `duration: ${params.duration}`,
    "source: right_ai_composer",
    "inputLanguage: ru",
    `routeMode: ${params.routeMode}`,
    "",
    "Category candidates:",
    ...params.categories.map((category) => `— ${category}`),
    "",
    "Value Object candidates:",
    ...params.valueObjects.map((valueObject) => `— ${valueObject}`),
    "",
    "Review gate:",
    "Пользователь должен подтвердить, исправить или отменить preview через это же поле.",
  ];
}

async function buildNoWriteSemanticActivityPreviewReply(
  classification: UnifiedMessageClassification,
): Promise<string> {
  try {
    const response = await fetch("/api/activity/semantic-orchestration-preview", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "preview_only",
        rawText: classification.normalizedText,
        inputLanguage: "ru",
        source: "chat_ai",
      }),
    });

    let data: NoWriteSemanticPreviewResponse = {};

    try {
      data = (await response.json()) as NoWriteSemanticPreviewResponse;
    } catch {
      throw new Error("Semantic preview route returned non-JSON response.");
    }

    if (!response.ok) {
      throw new Error(
        getSemanticErrorMessage(data, `Semantic preview route failed with HTTP ${response.status}.`),
      );
    }

    const duration = extractDurationSummary(classification.normalizedText);
    const semanticCategories = collectSemanticLabelsByHints(data, [
      "category",
      "categories",
      "categorycandidate",
      "categorycandidates",
      "rubricator",
      "semantic",
    ]);
    const categories =
      semanticCategories.length > 0
        ? semanticCategories
        : guessCategoryCandidates(classification.normalizedText);

    const semanticValueObjects = collectSemanticLabelsByHints(data, [
      "valueobject",
      "valueobjects",
      "value_object",
      "value_objects",
      "vocandidate",
      "vocandidates",
    ]);
    const valueObjects =
      semanticValueObjects.length > 0
        ? semanticValueObjects
        : guessValueObjectCandidates(categories);

    setLatestLocalPendingPreview({
      kind: "activity",
      text: classification.normalizedText,
      createdAtIso: new Date().toISOString(),
      duration,
      categories,
      valueObjects,
      note: "Activity preview candidate from no-write semantic preview route. No governed write has been executed yet.",
    });

    const routeMode =
      typeof data.routeMode === "string" ? data.routeMode : "unknown";
    const sideEffectLines = formatSemanticSideEffects(data);

    const activityReviewPackageLines = buildActivityReviewPackageLines({
      rawText: classification.normalizedText,
      duration,
      categories,
      valueObjects,
      routeMode,
    });

    return [
      "Я понял это как возможную активность.",
      "",
      "Preview source: semantic no-write preview",
      "Route endpoint: /api/activity/semantic-orchestration-preview",
      `Route mode: ${routeMode}`,
      "",
      `Intent: ${classification.intent}`,
      `Confidence: ${Math.round(classification.confidence * 100)}%`,
      `Причина распознавания: ${classification.reason}`,
      "",
      ...activityReviewPackageLines,
      "",
      "No-write safety check:",
      ...sideEffectLines,
      "",
      "Статус: real semantic preview + local pending preview only.",
      "Activity Event пока НЕ создан.",
      "Категории пока НЕ сохранены.",
      "Value Objects пока НЕ созданы и НЕ обновлены.",
      "DB write НЕ выполнен.",
      "Service Log write НЕ выполнен.",
      "",
      "Что можно написать дальше в этом же поле:",
      "— подтверждаю активность",
      "— исправить: было 45 минут",
      "— отмена",
      "— показать review",
    ].join("\n");
  } catch (error) {
    const fallbackReply = buildLocalActivityPreviewReply(classification);

    return [
      fallbackReply,
      "",
      "Semantic preview route status: unavailable.",
      `Reason: ${error instanceof Error ? error.message : "Unknown semantic preview error."}`,
      "Fallback: local preview only.",
      "DB write НЕ выполнен.",
      "Service Log write НЕ выполнен.",
    ].join("\n");
  }
}

function isControlledActivityRecordWriteCommand(message: string): boolean {
  const normalized = message.trim().toLowerCase();

  // AVO_STEP20_9_2_WRITE_COMMAND_PATCH
  if (AVO_RU_CONTROLLED_WRITE_COMMANDS.includes(normalized)) {
    return true;
  }

  return [
    "выполнить запись активности",
    "выполни запись активности",
    "сохранить подтвержденную активность",
    "сохранить подтверждённую активность",
    "governed write activity",
  ].includes(normalized);
}

function buildControlledActivityRecordPayload(): Record<string, unknown> | null {
  if (!latestLocalPendingPreview || latestLocalPendingPreview.kind !== "activity") {
    return null;
  }

  const durationMinutes = inferActivityRecordPayloadDurationMinutes(
    latestLocalPendingPreview,
  );
  const title = inferActivityRecordPayloadTitle(latestLocalPendingPreview);

  if (durationMinutes === null) {
    return null;
  }

  return {
    templateSlug: "ai-navigator-manual-activity",
    naturalInput: latestLocalPendingPreview.text,
    input: latestLocalPendingPreview.text,
    title,
    durationMinutes,
    sourceType: "manual_chat",
    status: "completed",
    comment: "Created from right AI Navigator controlled write command.",
  };
}

function getRecordResponseField(
  data: unknown,
  keys: string[],
): string | number | boolean | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const record = data as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return value;
    }
  }

  return null;
}

function getNestedRecordResponseField(
  data: unknown,
  path: string[],
): string | number | boolean | null {
  let current: unknown = data;

  for (const key of path) {
    if (!current || typeof current !== "object") {
      return null;
    }

    current = (current as Record<string, unknown>)[key];
  }

  if (
    typeof current === "string" ||
    typeof current === "number" ||
    typeof current === "boolean"
  ) {
    return current;
  }

  return null;
}

async function executeControlledActivityRecordWriteFromPendingPreview(): Promise<string> {
  const payload = buildControlledActivityRecordPayload();

  if (!latestLocalPendingPreview || latestLocalPendingPreview.kind !== "activity") {
    return [
      "Governed Activity Event write blocked.",
      "Reason: there is no pending activity preview.",
      "",
      "Нужно сначала ввести активность, например:",
      "полчаса был на профилактическом приеме у стоматолога",
      "",
      "DB write НЕ выполнен.",
      "Service Log write НЕ выполнен.",
    ].join("\n");
  }

  if (!payload) {
    return [
      "Governed Activity Event write blocked.",
      "Reason: pending activity preview is incomplete.",
      "",
      "Что не хватает:",
      "durationMinutes could not be safely inferred.",
      "",
      "DB write НЕ выполнен.",
      "Service Log write НЕ выполнен.",
    ].join("\n");
  }

  const response = await fetch("/api/activity/record", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let data: unknown = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  const routeOk = getRecordResponseField(data, ["ok"]);
  const routeStatus = getRecordResponseField(data, ["status"]);
  const topLevelActivityEventId = getRecordResponseField(data, [
    "activityEventId",
    "activity_event_id",
    "activityEvent",
    "eventId",
    "id",
  ]);
  const nestedEventId = getNestedRecordResponseField(data, ["event", "id"]);
  const nestedEventStatus = getNestedRecordResponseField(data, ["event", "status"]);
  const nestedEventProcessingStatus = getNestedRecordResponseField(data, [
    "event",
    "processing_status",
  ]);
  const activityEventId = topLevelActivityEventId ?? nestedEventId;
  const recordedWrite = response.ok && routeStatus === "recorded";

  const responseKeys =
    data && typeof data === "object"
      ? Object.keys(data as Record<string, unknown>).join(", ")
      : "no_json_body";

  if (recordedWrite) {
    clearLatestLocalPendingPreview();
  }

  return [
    recordedWrite
      ? "Governed Activity Event write recorded."
      : response.ok
        ? "Governed Activity Event route returned OK, but this is NOT confirmed as final recorded write."
        : "Governed Activity Event write attempted, but route returned an error.",
    "",
    "Target route: POST /api/activity/record",
    `HTTP status: ${response.status}`,
    `Route ok: ${routeOk ?? "not_returned"}`,
    `Route status: ${routeStatus ?? "not_returned"}`,
    `Response keys: ${responseKeys}`,
    "",
    "Nested event:",
    `event.id: ${nestedEventId ?? "not_returned"}`,
    `event.status: ${nestedEventStatus ?? "not_returned"}`,
    `event.processing_status: ${nestedEventProcessingStatus ?? "not_returned"}`,
    "",
    "Sent controlled body:",
    `templateSlug: ${String(payload.templateSlug)}`,
    `naturalInput: ${String(payload.naturalInput)}`,
    `title: ${String(payload.title)}`,
    `durationMinutes: ${String(payload.durationMinutes)}`,
    `sourceType: ${String(payload.sourceType)}`,
    `status: ${String(payload.status)}`,
    "",
    "Write result:",
    `Activity Event id: ${activityEventId ?? "not_returned_in_top_level_response"}`,
    response.ok
      ? "Pending local preview cleared after final recorded route response."
      : "Pending local preview kept because route did not return final recorded status.",
    "",
    "Important downstream note:",
    "/api/activity/record may also write Service Log stages and downstream category/VO link stages according to existing route logic.",
    "",
    "Next check:",
    "Open /service-log?limit=25 and verify new ACTIVITY_EVENT_SAVED / CATEGORY_LINKS_SAVED / VO_LINKS_SAVED / UI_RESULT_VISIBLE rows.",
  ].join("\n");
}

async function askLegacyAi(message: string): Promise<string> {
  if (isControlledActivityRecordWriteCommand(message)) {
    return await executeControlledActivityRecordWriteFromPendingPreview();
  }

  const classification = classifyUnifiedMessage(message);

  if (classification.intent === "activity_preview") {
    return await buildNoWriteSemanticActivityPreviewReply(classification);
  }

  if (classification.intent === "value_object_command") {
    return buildValueObjectCommandPreviewReply(classification);
  }

  if (classification.intent === "correction") {
    return buildCorrectionPreviewReply(classification);
  }

  if (classification.intent === "confirmation") {
    if (latestLocalPendingPreview?.kind === "activity") {
      return await executeControlledActivityRecordWriteFromPendingPreview();
    }

    return buildConfirmationGuardReply(classification);
  }

  if (classification.intent === "cancel") {
    return buildCancelGuardReply(classification);
  }

  if (classification.intent === "review_request") {
    return buildReviewRequestGuardReply(classification);
  }

  if (classification.intent === "clarification") {
    return buildClarificationReply(classification);
  }

  const response = await fetch("/api/test", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
  });

  let data: ApiTestResponse = {};

  try {
    data = (await response.json()) as ApiTestResponse;
  } catch {
    throw new Error("Ответ сервера пришёл не в JSON-формате.");
  }

  if (!response.ok) {
    if (data.error === "Not authenticated") {
      throw new Error("Нужно войти в систему, чтобы получить ответ AI.");
    }

    throw new Error(data.error || "Ошибка ответа сервера.");
  }

  return data.reply || data.error || "Ответ пустой.";
}

export function AiNavigatorProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const session = useUserSessionClient();
  const storageKey = safeStorageKey(session.email);
  const storageReadyRef = useRef(false);

  const [messages, setMessages] = useState<AiNavigatorMessage[]>(DEFAULT_MESSAGES);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (session.isLoading) {
      return;
    }

    storageReadyRef.current = false;

    const timeoutId = window.setTimeout(() => {
      setMessages(readMessagesFromLocalStorage(storageKey));
      storageReadyRef.current = true;
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [session.isLoading, storageKey]);

  useEffect(() => {
    if (!storageReadyRef.current) {
      return;
    }

    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify(messages.slice(-80)),
      );
    } catch {
      // localStorage may be unavailable. The in-memory session history remains active.
    }
  }, [messages, storageKey]);

  const addActivityPreview = useCallback((text: string) => {
    const trimmedText = text.trim();

    if (!trimmedText) {
      return;
    }

    const now = new Date().toISOString();
    const baseId = Date.now();

    setMessages((previousMessages) => [
      ...previousMessages,
      {
        id: baseId,
        role: "activity",
        text: trimmedText,
        createdAt: now,
      },
      {
        id: baseId + 1,
        role: "ai",
        text: "Активность принята как local preview. Следующий gate — подключение к Activity Capture review-flow.",
        createdAt: now,
      },
    ]);
  }, []);

  const sendMessage = useCallback(
    async (message?: string) => {
      const trimmedInput = (message ?? input).trim();

      if (!trimmedInput || isSending) {
        return;
      }

      const now = new Date().toISOString();
      const userMessageId = Date.now();
      const assistantMessageId = userMessageId + 1;

      setMessages((previousMessages) => [
        ...previousMessages,
        {
          id: userMessageId,
          role: "user",
          text: trimmedInput,
          createdAt: now,
        },
        {
          id: assistantMessageId,
          role: "ai",
          text: "Анализирую запрос...",
          createdAt: now,
        },
      ]);

      setInput("");
      setIsSending(true);

      try {
        const reply = await askLegacyAi(trimmedInput);

        setMessages((previousMessages) =>
          previousMessages.map((messageItem) =>
            messageItem.id === assistantMessageId
              ? {
                  ...messageItem,
                  role: "ai",
                  text: reply,
                  createdAt: new Date().toISOString(),
                }
              : messageItem,
          ),
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Не удалось получить ответ ИИ.";

        setMessages((previousMessages) =>
          previousMessages.map((messageItem) =>
            messageItem.id === assistantMessageId
              ? {
                  ...messageItem,
                  role: "error",
                  text: errorMessage,
                  createdAt: new Date().toISOString(),
                }
              : messageItem,
          ),
        );
      } finally {
        setIsSending(false);
      }
    },
    [input, isSending],
  );

  const clearHistory = useCallback(() => {
    setMessages(DEFAULT_MESSAGES);

    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // localStorage may be unavailable.
    }
  }, [storageKey]);

  const value = useMemo<AiNavigatorContextValue>(
    () => ({
      messages,
      input,
      isSending,
      setInput,
      sendMessage,
      addActivityPreview,
      clearHistory,
    }),
    [
      addActivityPreview,
      clearHistory,
      input,
      isSending,
      messages,
      sendMessage,
      setInput,
    ],
  );

  return (
    <AiNavigatorContext.Provider value={value}>
      {children}
    </AiNavigatorContext.Provider>
  );
}

export function useAiNavigator() {
  const context = useContext(AiNavigatorContext);

  if (!context) {
    throw new Error("useAiNavigator must be used inside AiNavigatorProvider.");
  }

  return context;
}

