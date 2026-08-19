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

import { useRouter } from "next/navigation";

import { getLocaleMessage, normalizeLocale, type LocaleCode, type LocaleMessageMap } from "@/i18n";
import { useUserSessionClient } from "../auth/user-session-client";

export type AiNavigatorMessageRole =
  | "ai"
  | "user"
  | "insight"
  | "rec"
  | "activity"
  | "error";

export type AiNavigatorMode = "past" | "future" | "chat";

export type AiNavigatorImageAttachment = {
  kind: "image";
  name: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  dataUrl?: string;
};

export type AiNavigatorMessageAction = {
  href: string;
  label: string;
};

export type AiNavigatorMessage = {
  id: number;
  role: AiNavigatorMessageRole;
  text: string;
  createdAt: string;
  attachment?: AiNavigatorImageAttachment;
  action?: AiNavigatorMessageAction;
  retryText?: string;
  retryRequestId?: string;
};

export type AiNavigatorSendOptions = {
  image?: AiNavigatorImageAttachment | null;
  clientRequestId?: string;
};

type ApiTestResponse = {
  reply?: string;
  error?: string;
};

type ServerChatHistoryResponse = {
  success?: boolean;
  messages?: Array<{
    id?: string | number;
    role?: string;
    content?: string;
    created_at?: string;
  }>;
};

type AiNavigatorContextValue = {
  messages: AiNavigatorMessage[];
  input: string;
  isSending: boolean;
  navigatorMode: AiNavigatorMode;
  selectedTier: "nano" | "standard" | "pro";
  setNavigatorMode: (value: AiNavigatorMode) => void;
  setSelectedTier: (value: "nano" | "standard" | "pro") => void;
  setInput: (value: string) => void;
  sendMessage: (message?: string, options?: AiNavigatorSendOptions) => Promise<void>;
  addActivityPreview: (text: string) => void;
  clearHistory: () => void;
};

const AiNavigatorContext = createContext<AiNavigatorContextValue | null>(null);

const DEFAULT_MESSAGES: AiNavigatorMessage[] = [
  {
    id: 1,
    role: "ai",
    text: "\u041f\u0440\u0438\u0432\u0435\u0442! \u042f AI-\u041d\u0430\u0432\u0438\u0433\u0430\u0442\u043e\u0440. \u041c\u043e\u0433\u0443 \u043f\u043e\u043c\u043e\u0447\u044c \u0440\u0430\u0437\u043e\u0431\u0440\u0430\u0442\u044c \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c, \u043f\u043e\u0434\u0441\u043a\u0430\u0437\u0430\u0442\u044c \u0441\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u0439 \u0448\u0430\u0433 \u0438\u043b\u0438 \u043e\u0431\u044a\u044f\u0441\u043d\u0438\u0442\u044c \u0442\u0435\u043a\u0443\u0449\u0443\u044e \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0443.",
    createdAt: new Date(0).toISOString(),
  },
];

export const ARCTOR_AI_RIGHT_RAIL_MULTIMODAL_ACTIVITY_V1 =
  "ARCTOR_AI_RIGHT_RAIL_MULTIMODAL_ACTIVITY_V1" as const;

export const UI_MINI_FIX_AI_NAVIGATOR_COMPACT_INITIAL_STATE =
  "UI_MINI_FIX_AI_NAVIGATOR_COMPACT_INITIAL_STATE" as const;

function safeStorageKey(email: string | null) {
  return `gpt-app:ai-navigator:v2-compact:${email || "guest"}`;
}

function serializeMessagesForLocalStorage(messages: AiNavigatorMessage[]) {
  return messages.slice(-80).map((message) => ({
    ...message,
    attachment: message.attachment
      ? {
          kind: message.attachment.kind,
          name: message.attachment.name,
          mimeType: message.attachment.mimeType,
        }
      : undefined,
  }));
}

function getNavigatorLocale(): LocaleCode {
  if (typeof window === "undefined") return "en";
  const search = new URLSearchParams(window.location.search);
  return normalizeLocale(search.get("locale") ?? search.get("lang") ?? "en", "en");
}

function buildLocaleAwareNavigatorHref(pathname: string) {
  const locale = getNavigatorLocale();
  if (locale === "en") return pathname;
  const separator = pathname.includes("?") ? "&" : "?";
  return `${pathname}${separator}locale=${encodeURIComponent(locale)}`;
}

function createNavigatorRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `ai-rail-${crypto.randomUUID()}`;
  }

  return `ai-rail-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

const AI_RAIL_PROVIDER_COPY = {
  pastSaved: {
    ru: "Активность добавлена в журнал событий. Факты ещё не записаны: откройте проверку, чтобы подтвердить объекты наблюдения и факты.",
    pl: "Aktywność została dodana do dziennika zdarzeń. Fakty nie zostały jeszcze zapisane: otwórz weryfikację, aby sprawdzić obiekty obserwacji i fakty.",
    en: "The activity was added to the event log. Facts have not been written yet; open review to verify observation objects and facts.",
    es: "La actividad se añadió al registro de eventos. Los hechos aún no se han guardado; abre la revisión para comprobar los objetos de observación y los hechos.",
    uk: "Активність додано до журналу подій. Факти ще не записані: відкрийте перевірку, щоб підтвердити об’єкти спостереження та факти.",
    de: "Die Aktivität wurde im Aktivitätsprotokoll gespeichert. Fakten wurden noch nicht geschrieben; öffnen Sie die Prüfung für Beobachtungsobjekte und Fakten.",
    cs: "Aktivita byla přidána do deníku událostí. Fakta zatím nebyla zapsána; otevřete kontrolu objektů pozorování a faktů.",
  },
  pastAction: { ru: "Проверить анализ", pl: "Sprawdź analizę", en: "Review analysis", es: "Revisar análisis", uk: "Перевірити аналіз", de: "Analyse prüfen", cs: "Zkontrolovat analýzu" },
  futureSaved: {
    ru: "Плановая активность добавлена. Откройте календарь, чтобы проверить время и детали события.",
    pl: "Planowana aktywność została dodana. Otwórz kalendarz, aby sprawdzić czas i szczegóły zdarzenia.",
    en: "The planned activity was added. Open the calendar to review its time and details.",
    es: "La actividad planificada se añadió. Abre el calendario para revisar la hora y los detalles.",
    uk: "Заплановану активність додано. Відкрийте календар, щоб перевірити час і деталі події.",
    de: "Die geplante Aktivität wurde hinzugefügt. Öffnen Sie den Kalender, um Zeit und Details zu prüfen.",
    cs: "Plánovaná aktivita byla přidána. Otevřete kalendář a zkontrolujte čas a podrobnosti.",
  },
  futureAction: { ru: "Открыть календарь", pl: "Otwórz kalendarz", en: "Open calendar", es: "Abrir calendario", uk: "Відкрити календар", de: "Kalender öffnen", cs: "Otevřít kalendář" },
  genericError: {
    ru: "Не удалось выполнить запрос. Попробуйте ещё раз.",
    pl: "Nie udało się wykonać żądania. Spróbuj ponownie.",
    en: "The request could not be completed. Please try again.",
    es: "No se pudo completar la solicitud. Inténtalo de nuevo.",
    uk: "Не вдалося виконати запит. Спробуйте ще раз.",
    de: "Die Anfrage konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.",
    cs: "Požadavek se nepodařilo dokončit. Zkuste to znovu.",
  },
  insufficientBalance: { ru: "Недостаточно AI-баланса для выбранной модели.", pl: "Brak wystarczającego salda AI dla wybranego modelu.", en: "There is not enough AI balance for the selected model.", es: "No hay saldo AI suficiente para el modelo seleccionado.", uk: "Недостатньо AI-балансу для вибраної моделі.", de: "Für das gewählte Modell ist nicht genügend AI-Guthaben vorhanden.", cs: "Pro vybraný model není dostatečný zůstatek AI." },
  pricingUnavailable: { ru: "Тариф AI временно недоступен. Попробуйте ещё раз через несколько секунд.", pl: "Cennik AI jest chwilowo niedostępny. Spróbuj ponownie za chwilę.", en: "AI pricing is temporarily unavailable. Please try again in a moment.", es: "La tarifa de AI no está disponible temporalmente. Inténtalo de nuevo en unos instantes.", uk: "Тариф AI тимчасово недоступний. Спробуйте ще раз за кілька секунд.", de: "Die AI-Preisinformation ist vorübergehend nicht verfügbar. Bitte versuchen Sie es gleich erneut.", cs: "Ceník AI je dočasně nedostupný. Zkuste to za chvíli znovu." },
} satisfies Record<string, LocaleMessageMap>;

function providerCopy(key: keyof typeof AI_RAIL_PROVIDER_COPY) {
  return getLocaleMessage(AI_RAIL_PROVIDER_COPY[key], getNavigatorLocale(), undefined, { fallbackLocale: "en" });
}

function getActivitySavedCopy(mode: Exclude<AiNavigatorMode, "chat">) {
  return mode === "past"
    ? { text: providerCopy("pastSaved"), label: providerCopy("pastAction") }
    : { text: providerCopy("futureSaved"), label: providerCopy("futureAction") };
}

function friendlyAiError(code: string | undefined) {
  if (code === "insufficient_ai_balance") return providerCopy("insufficientBalance");
  if (code === "invalid_price_snapshot" || code === "missing_active_price_snapshot") return providerCopy("pricingUnavailable");
  return providerCopy("genericError");
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

type LocalPendingPreviewKind = "activity" | "planned_activity" | "value_object" | "correction";

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

  if (source.includes("\u043f\u043e\u043b\u0447\u0430\u0441\u0430")) {
    return 30;
  }

  if (source.includes("\u043f\u043e\u043b\u0442\u043e\u0440\u0430 \u0447\u0430\u0441\u0430")) {
    return 90;
  }

  const hourMatch = source.match(/(\d+)\s*(\u0447\u0430\u0441|\u0447\u0430\u0441\u0430|\u0447\u0430\u0441\u043e\u0432|h)/i);
  if (hourMatch?.[1]) {
    return Number.parseInt(hourMatch[1], 10) * 60;
  }

  const minuteMatch = source.match(/(\d+)\s*(\u043c\u0438\u043d|\u043c\u0438\u043d\u0443\u0442|min)/i);
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

  if (text.includes("\u0441\u0442\u043e\u043c\u0430\u0442\u043e\u043b\u043e\u0433")) {
    return "\u041f\u0440\u043e\u0444\u0438\u043b\u0430\u043a\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0439 \u043f\u0440\u0438\u0451\u043c \u0443 \u0441\u0442\u043e\u043c\u0430\u0442\u043e\u043b\u043e\u0433\u0430";
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
      "Pending preview: \u043e\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442.",
      "\u0421\u0435\u0439\u0447\u0430\u0441 \u043d\u0435\u0447\u0435\u0433\u043e \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u0442\u044c, \u043e\u0442\u043c\u0435\u043d\u044f\u0442\u044c \u0438\u043b\u0438 \u043f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0442\u044c \u043a\u0430\u043a review.",
      "\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0432\u0432\u0435\u0434\u0438\u0442\u0435 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c, \u043a\u043e\u043c\u0430\u043d\u0434\u0443 \u043f\u043e Value Object \u0438\u043b\u0438 \u0438\u0441\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435.",
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
  /(^|\s)\d+\s*(\u043c\u0438\u043d|\u043c\u0438\u043d\u0443\u0442|\u0447\u0430\u0441|\u0447\u0430\u0441\u0430|\u0447\u0430\u0441\u043e\u0432|h|min)(\s|$|[.,;:!?])/i,
  /(^|\s)\u043f\u043e\u043b\u0447\u0430\u0441\u0430(\s|$|[.,;:!?])/i,
  /(^|\s)\u043f\u043e\u043b\u0442\u043e\u0440\u0430\s+\u0447\u0430\u0441\u0430(\s|$|[.,;:!?])/i,
];

const ACTIVITY_ACTION_PATTERNS = [
  /\u0431\u044b\u043b/i,
  /\u0431\u044b\u043b\u0430/i,
  /\u0434\u0435\u043b\u0430\u043b/i,
  /\u0434\u0435\u043b\u0430\u043b\u0430/i,
  /\u0437\u0430\u043d\u0438\u043c\u0430\u043b\u0441\u044f/i,
  /\u0437\u0430\u043d\u0438\u043c\u0430\u043b\u0430\u0441\u044c/i,
  /\u0443\u0447\u0438\u043b/i,
  /\u0443\u0447\u0438\u043b\u0430/i,
  /\u0440\u0430\u0431\u043e\u0442\u0430\u043b/i,
  /\u0440\u0430\u0431\u043e\u0442\u0430\u043b\u0430/i,
  /\u0442\u0440\u0435\u043d\u0438\u0440\u043e\u0432\u0430\u043b\u0441\u044f/i,
  /\u0442\u0440\u0435\u043d\u0438\u0440\u043e\u0432\u0430\u043b\u0430\u0441\u044c/i,
  /\u0445\u043e\u0434\u0438\u043b/i,
  /\u0445\u043e\u0434\u0438\u043b\u0430/i,
  /\u0447\u0438\u0442\u0430\u043b/i,
  /\u0447\u0438\u0442\u0430\u043b\u0430/i,
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
    lowerText.startsWith("\u043a\u0430\u043a ") ||
    lowerText.startsWith("\u0447\u0442\u043e ") ||
    lowerText.startsWith("\u043f\u043e\u0447\u0435\u043c\u0443 ") ||
    lowerText.startsWith("\u0437\u0430\u0447\u0435\u043c ") ||
    lowerText.startsWith("\u0433\u0434\u0435 ") ||
    lowerText.startsWith("\u043a\u043e\u0433\u0434\u0430 ");

  const hasActivityPrefix =
    lowerText.startsWith("\u0437\u0430\u043f\u0438\u0448\u0438 ") ||
    lowerText.startsWith("\u0437\u0430\u043f\u0438\u0441\u0430\u0442\u044c ") ||
    lowerText.startsWith("\u0434\u043e\u0431\u0430\u0432\u044c \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c") ||
    lowerText.startsWith("\u0434\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c") ||
    lowerText.startsWith("\u0441\u043e\u0445\u0440\u0430\u043d\u0438 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c");

  const hasDuration = ACTIVITY_DURATION_PATTERNS.some((pattern) =>
    pattern.test(normalizedText),
  );

  const hasActivityAction = ACTIVITY_ACTION_PATTERNS.some((pattern) =>
    pattern.test(normalizedText),
  );

  const hasHealthOrWorkActivityContext = includesAny(normalizedText, [
    "\u0441\u0442\u043e\u043c\u0430\u0442\u043e\u043b\u043e\u0433",
    "\u0432\u0440\u0430\u0447",
    "\u043f\u0440\u0438\u0435\u043c",
    "\u043f\u0440\u0438\u0451\u043c",
    "\u0442\u0440\u0435\u043d\u0438\u0440\u043e\u0432\u043a\u0430",
    "\u043f\u043e\u0434\u0442\u044f\u0433\u0438\u0432",
    "\u043e\u0442\u0436\u0438\u043c\u0430\u043d",
    "\u043f\u0440\u043e\u0433\u0443\u043b\u043a\u0430",
    "\u043d\u0435\u043c\u0435\u0446\u043a",
    "\u0438\u0441\u043f\u0430\u043d\u0441\u043a",
    "\u0430\u043d\u0433\u043b\u0438\u0439\u0441\u043a",
    "\u043f\u043e\u043b\u044c\u0441\u043a",
    "b2b",
    "\u043f\u0440\u043e\u0434\u0430\u0436",
    "\u0440\u0430\u0431\u043e\u0442",
    "\u0443\u0447\u0435\u0431",
    "\u0437\u0430\u043d\u044f\u0442",
    "\u0441\u043e\u0437\u0432\u043e\u043d",
    "\u043f\u0435\u0440\u0435\u0433\u043e\u0432\u043e\u0440",
  ]);

  const hasValueObjectCommand = includesAny(normalizedText, [
    "\u0446\u0435\u043d\u043d\u044b\u0439 \u043e\u0431\u044a\u0435\u043a\u0442",
    "value object",
    "value objects",
    "vo ",
    "\u0441\u043e\u0437\u0434\u0430\u0439 \u043e\u0431\u044a\u0435\u043a\u0442",
    "\u0441\u043e\u0437\u0434\u0430\u0442\u044c \u043e\u0431\u044a\u0435\u043a\u0442",
    "\u0430\u0440\u0445\u0438\u0432\u0438\u0440\u0443\u0439 \u043e\u0431\u044a\u0435\u043a\u0442",
    "\u0430\u0440\u0445\u0438\u0432\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043e\u0431\u044a\u0435\u043a\u0442",
    "\u0443\u0442\u0432\u0435\u0440\u0434\u0438 \u043e\u0431\u044a\u0435\u043a\u0442",
    "\u0443\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044c \u043e\u0431\u044a\u0435\u043a\u0442",
  ]);

  const hasCorrectionCommand = includesAny(normalizedText, [
    "\u0438\u0441\u043f\u0440\u0430\u0432\u044c",
    "\u0438\u0441\u043f\u0440\u0430\u0432\u0438\u0442\u044c",
    "\u043e\u0448\u0438\u0431\u043a\u0430",
    "\u043d\u0435\u043f\u0440\u0430\u0432\u0438\u043b\u044c\u043d\u043e",
    "\u0438\u0437\u043c\u0435\u043d\u0438 \u043f\u043e\u0441\u043b\u0435\u0434\u043d\u044e\u044e",
    "\u0438\u0437\u043c\u0435\u043d\u0438 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c",
    "\u0443\u0434\u0430\u043b\u0438 \u043f\u043e\u0441\u043b\u0435\u0434\u043d\u044e\u044e",
    "\u043e\u0442\u043a\u0430\u0442\u0438",
    "rollback",
  ]);

  const hasConfirmationCommand = includesAny(normalizedText, [
    "\u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u044e \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c",
    "\u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044c \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c",
    "\u0441\u043e\u0445\u0440\u0430\u043d\u0438 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c",
    "\u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c",
    "\u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u044e value object",
    "\u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u044e \u043e\u0431\u044a\u0435\u043a\u0442",
    "\u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044c \u043e\u0431\u044a\u0435\u043a\u0442",
    "\u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u044e \u0438\u0441\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435",
    "\u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044c \u0438\u0441\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435",
  ]);

  const hasCancelCommand = includesAny(normalizedText, [
    "\u043e\u0442\u043c\u0435\u043d\u0430",
    "\u043e\u0442\u043c\u0435\u043d\u0438",
    "\u043e\u0442\u043c\u0435\u043d\u0438\u0442\u044c",
    "\u043d\u0435 \u0441\u043e\u0445\u0440\u0430\u043d\u044f\u0442\u044c",
    "\u043d\u0435 \u0437\u0430\u043f\u0438\u0441\u044b\u0432\u0430\u0442\u044c",
    "cancel",
  ]);

  const hasReviewRequest = includesAny(normalizedText, [
    "\u043f\u043e\u043a\u0430\u0437\u0430\u0442\u044c review",
    "\u043f\u043e\u043a\u0430\u0436\u0438 review",
    "\u043f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u0440\u0435\u0432\u044c\u044e",
    "\u043f\u043e\u043a\u0430\u0436\u0438 \u0440\u0435\u0432\u044c\u044e",
    "\u043f\u043e\u043a\u0430\u0437\u0430\u0442\u044c diff",
    "\u043f\u043e\u043a\u0430\u0436\u0438 diff",
    "review",
  ]);

  if (hasConfirmationCommand) {
    return {
      intent: "confirmation",
      confidence: 0.92,
      reason: "\u041d\u0430\u0439\u0434\u0435\u043d\u0430 \u043a\u043e\u043c\u0430\u043d\u0434\u0430 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u044f. \u0414\u043e \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0435\u043d\u0438\u044f write gate \u0435\u0451 \u043d\u0435\u043b\u044c\u0437\u044f \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u044f\u0442\u044c \u0432 \u043e\u0431\u044b\u0447\u043d\u044b\u0439 \u0447\u0430\u0442.",
      normalizedText,
    };
  }

  if (hasCancelCommand) {
    return {
      intent: "cancel",
      confidence: 0.9,
      reason: "\u041d\u0430\u0439\u0434\u0435\u043d\u0430 \u043a\u043e\u043c\u0430\u043d\u0434\u0430 \u043e\u0442\u043c\u0435\u043d\u044b \u0442\u0435\u043a\u0443\u0449\u0435\u0433\u043e preview/gate.",
      normalizedText,
    };
  }

  if (hasReviewRequest) {
    return {
      intent: "review_request",
      confidence: 0.88,
      reason: "\u041d\u0430\u0439\u0434\u0435\u043d\u0430 \u043a\u043e\u043c\u0430\u043d\u0434\u0430 \u043f\u043e\u043a\u0430\u0437\u0430\u0442\u044c review/diff \u043f\u0435\u0440\u0435\u0434 \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u0435\u043c.",
      normalizedText,
    };
  }

  if (hasCorrectionCommand) {
    return {
      intent: "correction",
      confidence: 0.86,
      reason: "\u041d\u0430\u0439\u0434\u0435\u043d\u043e \u043d\u0430\u043c\u0435\u0440\u0435\u043d\u0438\u0435 \u0438\u0441\u043f\u0440\u0430\u0432\u0438\u0442\u044c, \u0438\u0437\u043c\u0435\u043d\u0438\u0442\u044c, \u0443\u0434\u0430\u043b\u0438\u0442\u044c \u0438\u043b\u0438 \u043e\u0442\u043a\u0430\u0442\u0438\u0442\u044c \u043f\u0440\u043e\u0448\u043b\u0443\u044e \u0437\u0430\u043f\u0438\u0441\u044c.",
      normalizedText,
    };
  }

  if (hasValueObjectCommand) {
    return {
      intent: "value_object_command",
      confidence: 0.84,
      reason: "\u041d\u0430\u0439\u0434\u0435\u043d\u0430 \u043a\u043e\u043c\u0430\u043d\u0434\u0430, \u0441\u0432\u044f\u0437\u0430\u043d\u043d\u0430\u044f \u0441 \u0441\u043e\u0437\u0434\u0430\u043d\u0438\u0435\u043c, \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0435\u043c \u0438\u043b\u0438 \u0430\u0440\u0445\u0438\u0432\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435\u043c Value Object.",
      normalizedText,
    };
  }

  if (hasActivityPrefix || (hasDuration && (hasActivityAction || hasHealthOrWorkActivityContext))) {
    return {
      intent: "activity_preview",
      confidence: hasActivityPrefix ? 0.9 : 0.78,
      reason: "\u0421\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0435 \u043f\u043e\u0445\u043e\u0436\u0435 \u043d\u0430 \u0437\u0430\u043f\u0438\u0441\u044c \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0438: \u0435\u0441\u0442\u044c \u0434\u043b\u0438\u0442\u0435\u043b\u044c\u043d\u043e\u0441\u0442\u044c, \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u0438\u043b\u0438 \u043a\u043e\u043d\u0442\u0435\u043a\u0441\u0442 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0438.",
      normalizedText,
    };
  }

  if (!isQuestion && hasActivityAction && hasHealthOrWorkActivityContext) {
    return {
      intent: "clarification",
      confidence: 0.58,
      reason: "\u0421\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0435 \u043f\u043e\u0445\u043e\u0436\u0435 \u043d\u0430 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c, \u043d\u043e \u043d\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 \u0434\u043b\u0438\u0442\u0435\u043b\u044c\u043d\u043e\u0441\u0442\u0438 \u0438\u043b\u0438 \u044f\u0432\u043d\u043e\u0433\u043e \u043d\u0430\u043c\u0435\u0440\u0435\u043d\u0438\u044f \u0437\u0430\u043f\u0438\u0441\u0430\u0442\u044c.",
      normalizedText,
    };
  }

  return {
    intent: "chat",
    confidence: isQuestion ? 0.82 : 0.62,
    reason: "\u0421\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0435 \u043f\u043e\u0445\u043e\u0436\u0435 \u043d\u0430 \u043e\u0431\u044b\u0447\u043d\u044b\u0439 \u0432\u043e\u043f\u0440\u043e\u0441 \u0438\u043b\u0438 \u0434\u0438\u0430\u043b\u043e\u0433 \u0441 AI.",
    normalizedText,
  };
}

function extractDurationSummary(text: string): string {
  const lowerText = text.toLowerCase();

  if (lowerText.includes("\u043f\u043e\u043b\u0447\u0430\u0441\u0430")) {
    return "\u043f\u0440\u0438\u043c\u0435\u0440\u043d\u043e 30 \u043c\u0438\u043d\u0443\u0442";
  }

  if (lowerText.includes("\u043f\u043e\u043b\u0442\u043e\u0440\u0430 \u0447\u0430\u0441\u0430")) {
    return "\u043f\u0440\u0438\u043c\u0435\u0440\u043d\u043e 90 \u043c\u0438\u043d\u0443\u0442";
  }

  const match = text.match(/(\d+)\s*(\u043c\u0438\u043d|\u043c\u0438\u043d\u0443\u0442|\u0447\u0430\u0441|\u0447\u0430\u0441\u0430|\u0447\u0430\u0441\u043e\u0432|h|min)/i);

  if (!match) {
    return "\u0434\u043b\u0438\u0442\u0435\u043b\u044c\u043d\u043e\u0441\u0442\u044c \u043d\u0435 \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0435\u043d\u0430";
  }

  const amount = match[1];
  const unit = match[2].toLowerCase();

  if (unit.startsWith("\u0447\u0430\u0441") || unit === "h") {
    return `${amount} \u0447.`;
  }

  return `${amount} \u043c\u0438\u043d.`;
}

function guessCategoryCandidates(text: string): string[] {
  const categories = new Set<string>();
  const lowerText = text.toLowerCase();

  if (includesAny(lowerText, ["\u0441\u0442\u043e\u043c\u0430\u0442\u043e\u043b\u043e\u0433", "\u0432\u0440\u0430\u0447", "\u043f\u0440\u0438\u0435\u043c", "\u043f\u0440\u0438\u0451\u043c", "\u0437\u0434\u043e\u0440\u043e\u0432"])) {
    categories.add("\u0417\u0434\u043e\u0440\u043e\u0432\u044c\u0435");
    categories.add("\u041c\u0435\u0434\u0438\u0446\u0438\u043d\u0441\u043a\u0430\u044f \u043f\u0440\u043e\u0444\u0438\u043b\u0430\u043a\u0442\u0438\u043a\u0430");
  }

  if (includesAny(lowerText, ["\u0441\u0442\u043e\u043c\u0430\u0442\u043e\u043b\u043e\u0433", "\u0437\u0443\u0431", "\u0437\u0443\u0431\u044b"])) {
    categories.add("\u0421\u0442\u043e\u043c\u0430\u0442\u043e\u043b\u043e\u0433\u0438\u044f");
  }

  if (includesAny(lowerText, ["\u043d\u0435\u043c\u0435\u0446\u043a", "\u0438\u0441\u043f\u0430\u043d\u0441\u043a", "\u0430\u043d\u0433\u043b\u0438\u0439\u0441\u043a", "\u043f\u043e\u043b\u044c\u0441\u043a", "\u0443\u0447\u0438\u043b", "\u0443\u0447\u0438\u043b\u0430"])) {
    categories.add("\u041e\u0431\u0443\u0447\u0435\u043d\u0438\u0435");
    categories.add("\u042f\u0437\u044b\u043a\u0438");
  }

  if (includesAny(lowerText, ["\u043f\u043e\u0434\u0442\u044f\u0433\u0438\u0432", "\u043e\u0442\u0436\u0438\u043c\u0430\u043d", "\u0442\u0440\u0435\u043d\u0438\u0440\u043e\u0432", "\u0437\u0430\u043b", "\u043f\u0440\u0438\u0441\u0435\u0434", "\u043f\u043b\u0430\u043d\u043a\u0430"])) {
    categories.add("\u0424\u0438\u0437\u0438\u0447\u0435\u0441\u043a\u0430\u044f \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c");
    categories.add("\u0417\u0434\u043e\u0440\u043e\u0432\u044c\u0435");
  }

  if (includesAny(lowerText, ["b2b", "\u043f\u0440\u043e\u0434\u0430\u0436", "\u043a\u043b\u0438\u0435\u043d\u0442", "\u043f\u0435\u0440\u0435\u0433\u043e\u0432\u043e\u0440", "\u0441\u043e\u0437\u0432\u043e\u043d"])) {
    categories.add("B2B \u043f\u0440\u043e\u0434\u0430\u0436\u0438");
    categories.add("\u0420\u0430\u0431\u043e\u0442\u0430");
  }

  if (categories.size === 0) {
    categories.add("\u041b\u0438\u0447\u043d\u0430\u044f \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c");
  }

  return Array.from(categories).slice(0, 6);
}

function guessValueObjectCandidates(categories: readonly string[]): string[] {
  const valueObjects = new Set<string>();

  for (const category of categories) {
    if (category === "\u0417\u0434\u043e\u0440\u043e\u0432\u044c\u0435" || category === "\u041c\u0435\u0434\u0438\u0446\u0438\u043d\u0441\u043a\u0430\u044f \u043f\u0440\u043e\u0444\u0438\u043b\u0430\u043a\u0442\u0438\u043a\u0430") {
      valueObjects.add("\u0417\u0434\u043e\u0440\u043e\u0432\u044c\u0435");
      valueObjects.add("\u041f\u0440\u043e\u0444\u0438\u043b\u0430\u043a\u0442\u0438\u043a\u0430 \u0437\u0434\u043e\u0440\u043e\u0432\u044c\u044f");
    }

    if (category === "\u0421\u0442\u043e\u043c\u0430\u0442\u043e\u043b\u043e\u0433\u0438\u044f") {
      valueObjects.add("\u0421\u0442\u043e\u043c\u0430\u0442\u043e\u043b\u043e\u0433\u0438\u044f");
    }

    if (category === "\u041e\u0431\u0443\u0447\u0435\u043d\u0438\u0435" || category === "\u042f\u0437\u044b\u043a\u0438") {
      valueObjects.add("\u0418\u0437\u0443\u0447\u0435\u043d\u0438\u0435 \u044f\u0437\u044b\u043a\u043e\u0432");
    }

    if (category === "\u0424\u0438\u0437\u0438\u0447\u0435\u0441\u043a\u0430\u044f \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c") {
      valueObjects.add("\u0424\u0438\u0437\u0438\u0447\u0435\u0441\u043a\u0430\u044f \u0444\u043e\u0440\u043c\u0430");
    }

    if (category === "B2B \u043f\u0440\u043e\u0434\u0430\u0436\u0438") {
      valueObjects.add("B2B \u043f\u0440\u043e\u0434\u0430\u0436\u0438");
    }

    if (category === "\u0420\u0430\u0431\u043e\u0442\u0430") {
      valueObjects.add("\u041a\u0430\u0440\u044c\u0435\u0440\u0430");
    }
  }

  if (valueObjects.size === 0) {
    valueObjects.add("\u041b\u0438\u0447\u043d\u043e\u0435 \u0440\u0430\u0437\u0432\u0438\u0442\u0438\u0435");
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
    "\u042f \u043f\u043e\u043d\u044f\u043b \u044d\u0442\u043e \u043a\u0430\u043a \u0432\u043e\u0437\u043c\u043e\u0436\u043d\u0443\u044e \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c.",
    "",
    `\u0422\u0435\u043a\u0441\u0442: ${classification.normalizedText}`,
    `\u0414\u043b\u0438\u0442\u0435\u043b\u044c\u043d\u043e\u0441\u0442\u044c: ${duration}`,
    `Intent: ${classification.intent}`,
    `Confidence: ${Math.round(classification.confidence * 100)}%`,
    `\u041f\u0440\u0438\u0447\u0438\u043d\u0430 \u0440\u0430\u0441\u043f\u043e\u0437\u043d\u0430\u0432\u0430\u043d\u0438\u044f: ${classification.reason}`,
    "",
    `Category candidates: ${categories.join(", ")}`,
    `Value Object candidates: ${valueObjects.join(", ")}`,
    "",
    "Value Object bridge proof:",
    "\u042d\u0442\u043e \u0435\u0449\u0451 \u043d\u0435 \u0441\u043e\u0437\u0434\u0430\u043d\u0438\u0435 Value Object, \u0430 \u0442\u043e\u043b\u044c\u043a\u043e \u043a\u0430\u043d\u0434\u0438\u0434\u0430\u0442\u043d\u0430\u044f \u0441\u0432\u044f\u0437\u044c.",
    valueObjects.length > 0
      ? `\u041a\u0430\u043d\u0434\u0438\u0434\u0430\u0442\u044b Value Object: ${valueObjects.join(", ")}`
      : "\u041a\u0430\u043d\u0434\u0438\u0434\u0430\u0442\u044b Value Object: \u043f\u043e\u043a\u0430 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u044b.",
    "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u0441\u043f\u0438\u0441\u043e\u043a \u0442\u0435\u043a\u0443\u0449\u0438\u0445 Value Objects: /value-objects",
    "\u0421\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u0439 gated \u0448\u0430\u0433: \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044c \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c, \u0437\u0430\u0442\u0435\u043c \u043e\u0431\u0440\u0430\u0431\u043e\u0442\u0430\u0442\u044c category/VO candidates \u0447\u0435\u0440\u0435\u0437 review/write gate.",
    "",
    "\u0421\u0442\u0430\u0442\u0443\u0441: local preview only.",
    "\u041f\u043e\u043a\u0430 \u043d\u0435 \u0441\u043e\u0437\u0434\u0430\u043d Activity Event, \u043d\u0435 \u0441\u043e\u0437\u0434\u0430\u043d\u044b \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u0438, \u043d\u0435 \u0441\u043e\u0437\u0434\u0430\u043d \u0438 \u043d\u0435 \u043e\u0431\u043d\u043e\u0432\u043b\u0451\u043d Value Object, \u043d\u0435\u0442 DB write.",
    "",
    "\u0421\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u0439 gate: \u043f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044e review-\u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0443 \u0438 \u043f\u043e\u043f\u0440\u043e\u0441\u0438\u0442\u044c \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0435 \u043f\u0435\u0440\u0435\u0434 \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u0435\u043c.",
    "",
    "\u0427\u0442\u043e \u043c\u043e\u0436\u043d\u043e \u043d\u0430\u043f\u0438\u0441\u0430\u0442\u044c \u0434\u0430\u043b\u044c\u0448\u0435 \u0432 \u044d\u0442\u043e\u043c \u0436\u0435 \u043f\u043e\u043b\u0435:",
    "— \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u0444\u0430\u043a\u0442 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0438",
      "— \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u044e \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c",
    "— \u0438\u0441\u043f\u0440\u0430\u0432\u0438\u0442\u044c: \u0431\u044b\u043b\u043e 45 \u043c\u0438\u043d\u0443\u0442",
    "— \u043e\u0442\u043c\u0435\u043d\u0430",
    "— \u043f\u043e\u043a\u0430\u0437\u0430\u0442\u044c review",
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
    "\u042f \u043f\u043e\u043d\u044f\u043b \u044d\u0442\u043e \u043a\u0430\u043a \u043a\u043e\u043c\u0430\u043d\u0434\u0443 \u043f\u043e Value Object.",
    "",
    `\u0422\u0435\u043a\u0441\u0442: ${classification.normalizedText}`,
    `Confidence: ${Math.round(classification.confidence * 100)}%`,
    `\u041f\u0440\u0438\u0447\u0438\u043d\u0430 \u0440\u0430\u0441\u043f\u043e\u0437\u043d\u0430\u0432\u0430\u043d\u0438\u044f: ${classification.reason}`,
    "",
    "\u0421\u0442\u0430\u0442\u0443\u0441: local preview only.",
    "\u041f\u043e\u043a\u0430 \u043d\u0435 \u0441\u043e\u0437\u0434\u0430\u043d, \u043d\u0435 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043d, \u043d\u0435 \u0438\u0437\u043c\u0435\u043d\u0451\u043d \u0438 \u043d\u0435 \u0430\u0440\u0445\u0438\u0432\u0438\u0440\u043e\u0432\u0430\u043d \u043d\u0438 \u043e\u0434\u0438\u043d Value Object.",
    "",
    "\u0421\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u0439 gate: \u043f\u043e\u043a\u0430\u0437\u0430\u0442\u044c preview \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f \u0441 \u043e\u0431\u044a\u0435\u043a\u0442\u043e\u043c \u0438 \u043f\u043e\u043f\u0440\u043e\u0441\u0438\u0442\u044c \u044f\u0432\u043d\u043e\u0435 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0435.",
    "",
    "\u0427\u0442\u043e \u043c\u043e\u0436\u043d\u043e \u043d\u0430\u043f\u0438\u0441\u0430\u0442\u044c \u0434\u0430\u043b\u044c\u0448\u0435 \u0432 \u044d\u0442\u043e\u043c \u0436\u0435 \u043f\u043e\u043b\u0435:",
    "— \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u044e Value Object",
    "— \u0438\u0441\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u043e\u0431\u044a\u0435\u043a\u0442: ...",
    "— \u0430\u0440\u0445\u0438\u0432\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043e\u0431\u044a\u0435\u043a\u0442",
    "— \u043e\u0442\u043c\u0435\u043d\u0430",
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
    "\u042f \u043f\u043e\u043d\u044f\u043b \u044d\u0442\u043e \u043a\u0430\u043a \u0432\u043e\u0437\u043c\u043e\u0436\u043d\u043e\u0435 \u0438\u0441\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435 \u043f\u0440\u043e\u0448\u043b\u043e\u0439 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0438 \u0438\u043b\u0438 \u043e\u0431\u044a\u0435\u043a\u0442\u0430.",
    "",
    `\u0422\u0435\u043a\u0441\u0442: ${classification.normalizedText}`,
    `Confidence: ${Math.round(classification.confidence * 100)}%`,
    `\u041f\u0440\u0438\u0447\u0438\u043d\u0430 \u0440\u0430\u0441\u043f\u043e\u0437\u043d\u0430\u0432\u0430\u043d\u0438\u044f: ${classification.reason}`,
    "",
    "\u0421\u0442\u0430\u0442\u0443\u0441: local preview only.",
    "\u041f\u043e\u043a\u0430 \u043d\u0435 \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0430 \u0438\u0441\u0442\u043e\u0440\u0438\u044f, \u043d\u0435 \u0441\u043e\u0437\u0434\u0430\u043d correction row \u0438 \u043d\u0435 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d rollback.",
    "",
    "\u0421\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u0439 gate: \u043d\u0430\u0439\u0442\u0438 \u0446\u0435\u043b\u0435\u0432\u0443\u044e \u0437\u0430\u043f\u0438\u0441\u044c, \u043f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044e diff \u0438 \u043f\u043e\u043f\u0440\u043e\u0441\u0438\u0442\u044c \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0435.",
    "",
    "\u0427\u0442\u043e \u043c\u043e\u0436\u043d\u043e \u043d\u0430\u043f\u0438\u0441\u0430\u0442\u044c \u0434\u0430\u043b\u044c\u0448\u0435 \u0432 \u044d\u0442\u043e\u043c \u0436\u0435 \u043f\u043e\u043b\u0435:",
    "— \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u044e \u0438\u0441\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435",
    "— \u0438\u0441\u043f\u0440\u0430\u0432\u0438\u0442\u044c: ...",
    "— \u043e\u0442\u043c\u0435\u043d\u0430",
    "— \u043f\u043e\u043a\u0430\u0437\u0430\u0442\u044c diff",
  ].join("\n");
}
function buildConfirmationGuardReply(classification: UnifiedMessageClassification): string {
  const pendingLines = formatLatestLocalPendingPreviewLines();

  return [
    "\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0435 \u043f\u043e\u043b\u0443\u0447\u0435\u043d\u043e \u043a\u0430\u043a \u043d\u0430\u043c\u0435\u0440\u0435\u043d\u0438\u0435, \u043d\u043e \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u0435 \u0435\u0449\u0451 \u043d\u0435 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u043e.",
    "",
    `\u0422\u0435\u043a\u0441\u0442 \u043a\u043e\u043c\u0430\u043d\u0434\u044b: ${classification.normalizedText}`,
    `Intent: ${classification.intent}`,
    `Confidence: ${Math.round(classification.confidence * 100)}%`,
    `\u041f\u0440\u0438\u0447\u0438\u043d\u0430 \u0440\u0430\u0441\u043f\u043e\u0437\u043d\u0430\u0432\u0430\u043d\u0438\u044f: ${classification.reason}`,
    "",
    "\u0421\u0432\u044f\u0437\u0430\u043d\u043d\u044b\u0439 pending preview:",
    ...pendingLines,
    "",
    "\u0421\u0442\u0430\u0442\u0443\u0441: confirmation preview only.",
    "Activity Event \u043f\u043e\u043a\u0430 \u041d\u0415 \u0441\u043e\u0437\u0434\u0430\u043d.",
    "\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u0438 \u043f\u043e\u043a\u0430 \u041d\u0415 \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u044b.",
    "Value Objects \u043f\u043e\u043a\u0430 \u041d\u0415 \u0441\u043e\u0437\u0434\u0430\u043d\u044b \u0438 \u041d\u0415 \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u044b.",
    "Correction row \u043f\u043e\u043a\u0430 \u041d\u0415 \u0441\u043e\u0437\u0434\u0430\u043d.",
    "DB write \u041d\u0415 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d.",
    "Service Log write \u041d\u0415 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d.",
    "",
    "\u0421\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u0439 \u0442\u0435\u0445\u043d\u0438\u0447\u0435\u0441\u043a\u0438\u0439 gate: \u043f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u0444\u0438\u043d\u0430\u043b\u044c\u043d\u0443\u044e review-\u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0443 \u0438 \u0442\u043e\u043b\u044c\u043a\u043e \u043f\u043e\u0442\u043e\u043c \u0432\u044b\u043f\u043e\u043b\u043d\u0438\u0442\u044c governed write.",
  ].join("\n");
}
function buildCancelGuardReply(classification: UnifiedMessageClassification): string {
  const pendingLines = formatLatestLocalPendingPreviewLines();
  clearLatestLocalPendingPreview();

  return [
    "\u041e\u0442\u043c\u0435\u043d\u0430 \u043f\u0440\u0438\u043d\u044f\u0442\u0430 \u043a\u0430\u043a \u043a\u043e\u043c\u0430\u043d\u0434\u0430 \u043a \u0442\u0435\u043a\u0443\u0449\u0435\u043c\u0443 preview.",
    "",
    `\u0422\u0435\u043a\u0441\u0442 \u043a\u043e\u043c\u0430\u043d\u0434\u044b: ${classification.normalizedText}`,
    `Intent: ${classification.intent}`,
    `Confidence: ${Math.round(classification.confidence * 100)}%`,
    "",
    "\u041e\u0442\u043c\u0435\u043d\u0451\u043d\u043d\u044b\u0439 pending preview:",
    ...pendingLines,
    "",
    "\u0421\u0442\u0430\u0442\u0443\u0441: cancel preview only.",
    "\u041d\u0438\u043a\u0430\u043a\u0430\u044f \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c \u043d\u0435 \u0441\u043e\u0437\u0434\u0430\u043d\u0430.",
    "\u041d\u0438\u043a\u0430\u043a\u043e\u0439 Value Object \u043d\u0435 \u0441\u043e\u0437\u0434\u0430\u043d \u0438 \u043d\u0435 \u0430\u0440\u0445\u0438\u0432\u0438\u0440\u043e\u0432\u0430\u043d.",
    "DB write \u041d\u0415 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d.",
    "Service Log write \u041d\u0415 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d.",
  ].join("\n");
}
function buildReviewRequestGuardReply(classification: UnifiedMessageClassification): string {
  const pendingLines = formatLatestLocalPendingPreviewLines();

  return [
    "\u0417\u0430\u043f\u0440\u043e\u0441 \u043d\u0430 review/diff \u043f\u0440\u0438\u043d\u044f\u0442.",
    "",
    `\u0422\u0435\u043a\u0441\u0442 \u043a\u043e\u043c\u0430\u043d\u0434\u044b: ${classification.normalizedText}`,
    `Intent: ${classification.intent}`,
    `Confidence: ${Math.round(classification.confidence * 100)}%`,
    "",
    "Review pending preview:",
    ...pendingLines,
    "",
    "\u0421\u0442\u0430\u0442\u0443\u0441: review request preview only.",
    "DB write \u041d\u0415 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d.",
    "Service Log write \u041d\u0415 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d.",
    "",
    "\u0421\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u0439 \u0442\u0435\u0445\u043d\u0438\u0447\u0435\u0441\u043a\u0438\u0439 gate: \u043f\u0440\u0435\u0432\u0440\u0430\u0442\u0438\u0442\u044c \u044d\u0442\u043e\u0442 pending preview \u0432 UI review-card \u043f\u0435\u0440\u0435\u0434 governed write.",
  ].join("\n");
}
function buildClarificationReply(classification: UnifiedMessageClassification): string {
  return [
    "\u041f\u043e\u0445\u043e\u0436\u0435, \u044d\u0442\u043e \u043c\u043e\u0436\u0435\u0442 \u0431\u044b\u0442\u044c \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c, \u043d\u043e \u044f \u043d\u0435 \u0434\u043e\u043b\u0436\u0435\u043d \u0443\u0433\u0430\u0434\u044b\u0432\u0430\u0442\u044c \u0438 \u0437\u0430\u043f\u0438\u0441\u044b\u0432\u0430\u0442\u044c \u0444\u0430\u043a\u0442 \u0431\u0435\u0437 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u044f.",
    "",
    `\u0422\u0435\u043a\u0441\u0442: ${classification.normalizedText}`,
    `\u041f\u0440\u0438\u0447\u0438\u043d\u0430: ${classification.reason}`,
    "",
    "\u0422\u044b \u0445\u043e\u0447\u0435\u0448\u044c:",
    "1. \u041f\u0440\u043e\u0441\u0442\u043e \u043e\u0431\u0441\u0443\u0434\u0438\u0442\u044c \u044d\u0442\u043e \u0432 \u0447\u0430\u0442\u0435?",
    "2. \u0417\u0430\u043f\u0438\u0441\u0430\u0442\u044c \u044d\u0442\u043e \u043a\u0430\u043a \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c?",
    "3. \u0421\u043e\u0437\u0434\u0430\u0442\u044c \u0438\u043b\u0438 \u043e\u0431\u043d\u043e\u0432\u0438\u0442\u044c Value Object?",
    "",
    "\u041e\u0442\u0432\u0435\u0442\u044c, \u043d\u0430\u043f\u0440\u0438\u043c\u0435\u0440: “\u0437\u0430\u043f\u0438\u0448\u0438 \u044d\u0442\u043e \u043a\u0430\u043a \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c” \u0438\u043b\u0438 “\u044d\u0442\u043e \u043f\u0440\u043e\u0441\u0442\u043e \u0432\u043e\u043f\u0440\u043e\u0441”.",
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
    params.categories.includes("\u0421\u0442\u043e\u043c\u0430\u0442\u043e\u043b\u043e\u0433\u0438\u044f") ||
    params.rawText.toLowerCase().includes("\u0441\u0442\u043e\u043c\u0430\u0442\u043e\u043b\u043e\u0433")
      ? "\u041f\u0440\u043e\u0444\u0438\u043b\u0430\u043a\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0439 \u043f\u0440\u0438\u0451\u043c \u0443 \u0441\u0442\u043e\u043c\u0430\u0442\u043e\u043b\u043e\u0433\u0430"
      : params.rawText;

  const privacyMarker =
    params.categories.includes("\u0421\u0442\u043e\u043c\u0430\u0442\u043e\u043b\u043e\u0433\u0438\u044f") ||
    params.categories.includes("\u0417\u0434\u043e\u0440\u043e\u0432\u044c\u0435") ||
    params.categories.includes("\u041c\u0435\u0434\u0438\u0446\u0438\u043d\u0441\u043a\u0430\u044f \u043f\u0440\u043e\u0444\u0438\u043b\u0430\u043a\u0442\u0438\u043a\u0430")
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
    "\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c \u0434\u043e\u043b\u0436\u0435\u043d \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044c, \u0438\u0441\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u0438\u043b\u0438 \u043e\u0442\u043c\u0435\u043d\u0438\u0442\u044c preview \u0447\u0435\u0440\u0435\u0437 \u044d\u0442\u043e \u0436\u0435 \u043f\u043e\u043b\u0435.",
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
      "\u042f \u043f\u043e\u043d\u044f\u043b \u044d\u0442\u043e \u043a\u0430\u043a \u0432\u043e\u0437\u043c\u043e\u0436\u043d\u0443\u044e \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c.",
      "",
      "Preview source: semantic no-write preview",
      "Route endpoint: /api/activity/semantic-orchestration-preview",
      `Route mode: ${routeMode}`,
      "",
      `Intent: ${classification.intent}`,
      `Confidence: ${Math.round(classification.confidence * 100)}%`,
      `\u041f\u0440\u0438\u0447\u0438\u043d\u0430 \u0440\u0430\u0441\u043f\u043e\u0437\u043d\u0430\u0432\u0430\u043d\u0438\u044f: ${classification.reason}`,
      "",
      ...activityReviewPackageLines,
      "",
      "Value Object bridge proof:",
      "\u042d\u0442\u043e \u0435\u0449\u0451 \u043d\u0435 \u0441\u043e\u0437\u0434\u0430\u043d\u0438\u0435 Value Object, \u0430 \u0442\u043e\u043b\u044c\u043a\u043e \u043a\u0430\u043d\u0434\u0438\u0434\u0430\u0442\u043d\u0430\u044f \u0441\u0432\u044f\u0437\u044c.",
      valueObjects.length > 0
        ? `\u041a\u0430\u043d\u0434\u0438\u0434\u0430\u0442\u044b Value Object: ${valueObjects.join(", ")}`
        : "\u041a\u0430\u043d\u0434\u0438\u0434\u0430\u0442\u044b Value Object: \u043f\u043e\u043a\u0430 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u044b.",
      "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u0441\u043f\u0438\u0441\u043e\u043a \u0442\u0435\u043a\u0443\u0449\u0438\u0445 Value Objects: /value-objects",
      "\u0421\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u0439 gated \u0448\u0430\u0433: \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044c \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c, \u0437\u0430\u0442\u0435\u043c \u043e\u0431\u0440\u0430\u0431\u043e\u0442\u0430\u0442\u044c category/VO candidates \u0447\u0435\u0440\u0435\u0437 review/write gate.",
      "",
      "No-write safety check:",
      ...sideEffectLines,
      "",
      "\u0421\u0442\u0430\u0442\u0443\u0441: real semantic preview + local pending preview only.",
      "Activity Event \u043f\u043e\u043a\u0430 \u041d\u0415 \u0441\u043e\u0437\u0434\u0430\u043d.",
      "\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u0438 \u043f\u043e\u043a\u0430 \u041d\u0415 \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u044b.",
      "Value Objects \u043f\u043e\u043a\u0430 \u041d\u0415 \u0441\u043e\u0437\u0434\u0430\u043d\u044b \u0438 \u041d\u0415 \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u044b.",
      "DB write \u041d\u0415 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d.",
      "Service Log write \u041d\u0415 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d.",
      "",
      "\u0427\u0442\u043e \u043c\u043e\u0436\u043d\u043e \u043d\u0430\u043f\u0438\u0441\u0430\u0442\u044c \u0434\u0430\u043b\u044c\u0448\u0435 \u0432 \u044d\u0442\u043e\u043c \u0436\u0435 \u043f\u043e\u043b\u0435:",
      "— \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u0444\u0430\u043a\u0442 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0438",
      "— \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u044e \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c",
      "— \u0438\u0441\u043f\u0440\u0430\u0432\u0438\u0442\u044c: \u0431\u044b\u043b\u043e 45 \u043c\u0438\u043d\u0443\u0442",
      "— \u043e\u0442\u043c\u0435\u043d\u0430",
      "— \u043f\u043e\u043a\u0430\u0437\u0430\u0442\u044c review",
    ].join("\n");
  } catch (error) {
    const fallbackReply = buildLocalActivityPreviewReply(classification);

    return [
      fallbackReply,
      "",
      "Semantic preview route status: unavailable.",
      `Reason: ${error instanceof Error ? error.message : "Unknown semantic preview error."}`,
      "Fallback: local preview only.",
      "DB write \u041d\u0415 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d.",
      "Service Log write \u041d\u0415 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d.",
    ].join("\n");
  }
}

function isActivityFactsSaveGateWriteCommand(message: string): boolean {
  const normalized = message.trim().toLowerCase();

  return [
    "\u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u0444\u0430\u043a\u0442 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0438",
    "\u0441\u043e\u0445\u0440\u0430\u043d\u0438 \u0444\u0430\u043a\u0442 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0438",
    "\u0437\u0430\u043f\u0438\u0441\u0430\u0442\u044c \u0444\u0430\u043a\u0442 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0438",
    "\u0437\u0430\u043f\u0438\u0448\u0438 \u0444\u0430\u043a\u0442 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0438",
    "\u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u0444\u0430\u043a\u0442",
    "\u0437\u0430\u043f\u0438\u0441\u0430\u0442\u044c \u0444\u0430\u043a\u0442",
    "save activity fact",
    "save fact",
  ].some((marker) => normalized.includes(marker));
}

function isActivityFactsSaveGateRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readActivityFactsSaveGateString(
  sourceValue: unknown,
  keys: string[],
): string | null {
  if (!isActivityFactsSaveGateRecord(sourceValue)) {
    return null;
  }

  for (const key of keys) {
    const value = sourceValue[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return null;
}

function readActivityFactsSaveGateStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string" && item.trim().length > 0) {
        return item.trim();
      }

      if (typeof item === "number" && Number.isFinite(item)) {
        return String(item);
      }

      return null;
    })
    .filter((item): item is string => Boolean(item));
}

function buildActivityFactsSaveGateRequestFromPackage(
  pkg: Record<string, unknown>,
): Record<string, unknown> | null {
  const rawFactPreviews = Array.isArray(pkg.factPreviews)
    ? pkg.factPreviews
    : [];

  const factDecisions = rawFactPreviews
    .map((rawFact) => {
      if (!isActivityFactsSaveGateRecord(rawFact)) {
        return null;
      }

      const factLocalId = readActivityFactsSaveGateString(rawFact, ["localId"]);

      if (!factLocalId) {
        return null;
      }

      const status = readActivityFactsSaveGateString(rawFact, ["status"]);

      if (
        status &&
        ![
          "ready_for_fact_write",
          "accepted",
          "candidate",
          "needs_user_confirmation",
        ].includes(status)
      ) {
        return null;
      }

      return {
        factLocalId,
        decision: "accept",
        reasonRu:
          "\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u043b \u0437\u0430\u043f\u0438\u0441\u044c \u0444\u0430\u043a\u0442\u0430 \u0447\u0435\u0440\u0435\u0437 \u043f\u0440\u0430\u0432\u0443\u044e AI-\u043a\u043e\u043b\u043e\u043d\u043a\u0443 \u043a\u043e\u043c\u0430\u043d\u0434\u043e\u0439 '\u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u0444\u0430\u043a\u0442 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0438'.",
      };
    })
    .filter(
      (
        item,
      ): item is {
        factLocalId: string;
        decision: "accept";
        reasonRu: string;
      } => Boolean(item),
    );

  if (factDecisions.length === 0) {
    return null;
  }

  const sourcePackageId =
    readActivityFactsSaveGateString(pkg, ["packageId"]) ??
    "right-ai-semantic-preview-package-" + Date.now();

  const safety = isActivityFactsSaveGateRecord(pkg.safety) ? pkg.safety : {};
  const safetyNotes = Array.isArray(safety.notes)
    ? safety.notes.filter((note): note is string => typeof note === "string")
    : [];

  return {
    routeMode: "future_server_mediated_write",
    idempotencyKey: "right-ai-save-gate-" + sourcePackageId + "-" + Date.now(),
    sourcePackageId,
    activityProcessingPackage: {
      ...pkg,
      status: "ready_for_save_gate",
      safety: {
        ...safety,
        previewOnly: false,
        dbWriteAllowed: true,
        sqlAllowed: false,
        openAiCallAllowed: false,
        medicalDiagnosisAllowed: false,
        notes: [
          ...safetyNotes,
          "Right AI Step 09B-R6: user confirmed Activity Facts save-gate write.",
          "This command re-fetches semantic preview package from existing pending activity text.",
          "This command does not replace /api/activity/record confirmation flow.",
          "Value Object substitution remains postponed.",
        ],
      },
    },
    factDecisions,
    editedFactDecisions: [],
    valueObjectCandidateDecisions: [],
    clientSafetyConfirmation: {
      userReviewedPreview: true,
      userConfirmedMissingValueObjectCreation: false,
      userConfirmedFactWrite: true,
      userUnderstandsPreviewIsNotDiagnosis: true,
    },
  };
}

async function fetchActivityProcessingPackageForPendingPreview(): Promise<Record<string, unknown> | null> {
  if (!latestLocalPendingPreview || latestLocalPendingPreview.kind !== "activity") {
    return null;
  }

  const response = await fetch("/api/activity/semantic-orchestration-preview", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mode: "preview_only",
      rawText: latestLocalPendingPreview.text,
      inputLanguage: "ru",
      source: "chat_ai",
    }),
  });

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok || !isActivityFactsSaveGateRecord(data)) {
    return null;
  }

  return isActivityFactsSaveGateRecord(data.activityProcessingPackage)
    ? data.activityProcessingPackage
    : null;
}

async function executeActivityFactsSaveGateWriteFromPendingPreview(): Promise<string> {
  if (!latestLocalPendingPreview || latestLocalPendingPreview.kind !== "activity") {
    return [
      "\u041d\u0435 \u043d\u0430\u0448\u0451\u043b \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c \u0434\u043b\u044f \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u044f.",
      "",
      "\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0432\u0432\u0435\u0434\u0438 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c \u0432 \u043d\u0438\u0436\u043d\u0435\u0435 \u043f\u043e\u043b\u0435 \u043f\u0440\u0430\u0432\u043e\u0439 AI-\u043a\u043e\u043b\u043e\u043d\u043a\u0438, \u043d\u0430\u043f\u0440\u0438\u043c\u0435\u0440:",
      "\u0441\u043c\u043e\u0442\u0440\u0435\u043b \u0440\u0438\u043b\u0441 30 \u043c\u0438\u043d\u0443\u0442",
      "",
      "\u0417\u0430\u043f\u0438\u0441\u044c \u0432 Supabase \u041d\u0415 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u0430.",
    ].join("\n");
  }

  const pendingActivityText = latestLocalPendingPreview.text;
  const pkg = await fetchActivityProcessingPackageForPendingPreview();

  if (!pkg) {
    return [
      "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u0438\u0442\u044c \u043f\u0430\u043a\u0435\u0442 \u0444\u0430\u043a\u0442\u0430 \u0434\u043b\u044f \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u044f.",
      "",
      "\u041f\u0440\u0438\u0447\u0438\u043d\u0430: semantic preview route \u043d\u0435 \u0432\u0435\u0440\u043d\u0443\u043b ActivityProcessingPackage.",
      "\u0410\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c: " + pendingActivityText,
      "",
      "\u0417\u0430\u043f\u0438\u0441\u044c \u0432 Supabase \u041d\u0415 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u0430.",
      "",
      "\u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439 \u0435\u0449\u0451 \u0440\u0430\u0437 \u0432\u0432\u0435\u0441\u0442\u0438 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c, \u0437\u0430\u0442\u0435\u043c \u043a\u043e\u043c\u0430\u043d\u0434\u0443:",
      "\u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u0444\u0430\u043a\u0442 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0438",
    ].join("\n");
  }

  const rawFactPreviews = Array.isArray(pkg.factPreviews) ? pkg.factPreviews : [];
  const firstFactPreview = rawFactPreviews.find((item): item is Record<string, unknown> =>
    isActivityFactsSaveGateRecord(item),
  );

  const previewSemanticKey = readActivityFactsSaveGateString(firstFactPreview, [
    "semanticObjectKey",
  ]);
  const previewMeasureType = readActivityFactsSaveGateString(firstFactPreview, [
    "measureType",
  ]);
  const previewUnit = readActivityFactsSaveGateString(firstFactPreview, ["unit"]);
  const previewNumericValue =
    isActivityFactsSaveGateRecord(firstFactPreview) &&
    typeof firstFactPreview.numericValue === "number" &&
    Number.isFinite(firstFactPreview.numericValue)
      ? String(firstFactPreview.numericValue)
      : null;
  const previewTextValue = readActivityFactsSaveGateString(firstFactPreview, [
    "textValue",
  ]);
  const previewValue = previewNumericValue ?? previewTextValue ?? "\u043d\u0435 \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0435\u043d\u043e";

  const requestBody = buildActivityFactsSaveGateRequestFromPackage(pkg);

  if (!requestBody) {
    return [
      "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u0444\u0430\u043a\u0442 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0438.",
      "",
      "\u041f\u0440\u0438\u0447\u0438\u043d\u0430: ActivityProcessingPackage \u043d\u0435 \u0441\u043e\u0434\u0435\u0440\u0436\u0438\u0442 factPreviews, \u0433\u043e\u0442\u043e\u0432\u044b\u0445 \u043a \u0437\u0430\u043f\u0438\u0441\u0438.",
      "\u0410\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c: " + pendingActivityText,
      "",
      "\u0417\u0430\u043f\u0438\u0441\u044c \u0432 Supabase \u041d\u0415 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u0430.",
    ].join("\n");
  }

  const response = await fetch("/api/activity/facts/save-gate", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  let data: unknown = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  const writeStatus = readActivityFactsSaveGateString(data, ["writeStatus"]);
  const routeStatus = readActivityFactsSaveGateString(data, ["routeStatus"]);
  const errorCode = readActivityFactsSaveGateString(data, ["errorCode", "code"]);
  const errorMessage = readActivityFactsSaveGateString(data, ["errorMessage", "message"]);
  const createdIds =
    isActivityFactsSaveGateRecord(data) && isActivityFactsSaveGateRecord(data.createdIds)
      ? data.createdIds
      : null;

  const activityEventId = readActivityFactsSaveGateString(createdIds, ["activityEventId"]);
  const measureIds = createdIds
    ? readActivityFactsSaveGateStringArray(createdIds.measureIds)
    : [];
  const factIds = createdIds
    ? readActivityFactsSaveGateStringArray(createdIds.factIds)
    : [];
  const recalculationQueueIds = createdIds
    ? readActivityFactsSaveGateStringArray(createdIds.recalculationQueueIds)
    : [];

  const written = response.ok && writeStatus === "written";

  if (written) {
    clearLatestLocalPendingPreview();
  }

  if (!written) {
    return [
      "\u0424\u0430\u043a\u0442 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0438 \u041d\u0415 \u0431\u044b\u043b \u0441\u043e\u0445\u0440\u0430\u043d\u0451\u043d.",
      "",
      "\u0410\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c: " + pendingActivityText,
      "HTTP status: " + response.status,
      "routeStatus: " + (routeStatus ?? "\u043d\u0435 \u0432\u0435\u0440\u043d\u0443\u043b\u0441\u044f"),
      "writeStatus: " + (writeStatus ?? "\u043d\u0435 \u0432\u0435\u0440\u043d\u0443\u043b\u0441\u044f"),
      errorCode ? "errorCode: " + errorCode : null,
      errorMessage ? "errorMessage: " + errorMessage : null,
      "",
      "Pending preview \u043e\u0441\u0442\u0430\u0432\u043b\u0435\u043d, \u0447\u0442\u043e\u0431\u044b \u043c\u043e\u0436\u043d\u043e \u0431\u044b\u043b\u043e \u043f\u043e\u0432\u0442\u043e\u0440\u0438\u0442\u044c \u043f\u043e\u043f\u044b\u0442\u043a\u0443.",
    ]
      .filter((line): line is string => line !== null)
      .join("\n");
  }

  return [
    "\u0424\u0430\u043a\u0442 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0438 \u0441\u043e\u0445\u0440\u0430\u043d\u0451\u043d.",
    "",
    "\u0427\u0442\u043e \u0437\u0430\u043f\u0438\u0441\u0430\u043d\u043e:",
    "\u0410\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c: " + pendingActivityText,
    "\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044f: " + (previewSemanticKey ?? "\u043d\u0435 \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0435\u043d\u0430"),
    "\u0422\u0438\u043f \u043f\u043e\u043a\u0430\u0437\u0430\u0442\u0435\u043b\u044f: " + (previewMeasureType ?? "\u043d\u0435 \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0451\u043d"),
    "\u0417\u043d\u0430\u0447\u0435\u043d\u0438\u0435: " + previewValue,
    "\u0415\u0434\u0438\u043d\u0438\u0446\u0430: " + (previewUnit ?? "\u043d\u0435 \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0435\u043d\u0430"),
    "",
    "\u0421\u0442\u0430\u0442\u0443\u0441 \u0437\u0430\u043f\u0438\u0441\u0438:",
    "writeStatus: " + (writeStatus ?? "written"),
    "routeStatus: " + (routeStatus ?? "server_mediated_write_completed"),
    "",
    "\u0413\u0434\u0435 \u0441\u043c\u043e\u0442\u0440\u0435\u0442\u044c:",
    "\u041e\u0442\u043a\u0440\u043e\u0439 /activity-facts — \u043d\u043e\u0432\u0430\u044f \u0441\u0442\u0440\u043e\u043a\u0430 \u0434\u043e\u043b\u0436\u043d\u0430 \u0431\u044b\u0442\u044c \u0432 \u0442\u0430\u0431\u043b\u0438\u0446\u0435 TYPE / VALUE / UNIT.",
    "",
    "\u0422\u0435\u0445\u043d\u0438\u0447\u0435\u0441\u043a\u0438\u0435 ID:",
    "activityEventId: " + (activityEventId ?? "\u043d\u0435 \u0432\u0435\u0440\u043d\u0443\u043b\u0441\u044f"),
    "measureIds: " + (measureIds.length > 0 ? measureIds.join(", ") : "\u043d\u0435 \u0432\u0435\u0440\u043d\u0443\u043b\u0438\u0441\u044c"),
    "factIds: " + (factIds.length > 0 ? factIds.join(", ") : "\u043d\u0435 \u0432\u0435\u0440\u043d\u0443\u043b\u0438\u0441\u044c"),
    "recalculationQueueIds: " +
      (recalculationQueueIds.length > 0
        ? recalculationQueueIds.join(", ")
        : "\u043d\u0435 \u0432\u0435\u0440\u043d\u0443\u043b\u0438\u0441\u044c"),
    "",
    "\u0412\u0430\u0436\u043d\u043e:",
    "Value Object \u043f\u043e\u043a\u0430 \u043d\u0435 \u043f\u043e\u0434\u0441\u0442\u0430\u0432\u043b\u044f\u0435\u0442\u0441\u044f.",
    "\u0421\u0442\u0430\u0440\u0430\u044f \u043a\u043e\u043c\u0430\u043d\u0434\u0430 '\u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u044e \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c' \u043f\u0440\u043e\u0434\u043e\u043b\u0436\u0430\u0435\u0442 \u0440\u0430\u0431\u043e\u0442\u0430\u0442\u044c \u0447\u0435\u0440\u0435\u0437 \u043f\u0440\u0435\u0436\u043d\u0438\u0439 /api/activity/record flow.",
  ].join("\n");
}


function isControlledActivityRecordWriteCommand(message: string): boolean {
  const normalized = message.trim().toLowerCase();

  // AVO_STEP20_9_2_WRITE_COMMAND_PATCH
  if (AVO_RU_CONTROLLED_WRITE_COMMANDS.includes(normalized)) {
    return true;
  }

  return [
    "\u0432\u044b\u043f\u043e\u043b\u043d\u0438\u0442\u044c \u0437\u0430\u043f\u0438\u0441\u044c \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0438",
    "\u0432\u044b\u043f\u043e\u043b\u043d\u0438 \u0437\u0430\u043f\u0438\u0441\u044c \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0438",
    "\u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u043d\u0443\u044e \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c",
    "\u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043d\u043d\u0443\u044e \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c",
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
      "\u041d\u0443\u0436\u043d\u043e \u0441\u043d\u0430\u0447\u0430\u043b\u0430 \u0432\u0432\u0435\u0441\u0442\u0438 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c, \u043d\u0430\u043f\u0440\u0438\u043c\u0435\u0440:",
      "\u043f\u043e\u043b\u0447\u0430\u0441\u0430 \u0431\u044b\u043b \u043d\u0430 \u043f\u0440\u043e\u0444\u0438\u043b\u0430\u043a\u0442\u0438\u0447\u0435\u0441\u043a\u043e\u043c \u043f\u0440\u0438\u0435\u043c\u0435 \u0443 \u0441\u0442\u043e\u043c\u0430\u0442\u043e\u043b\u043e\u0433\u0430",
      "",
      "DB write \u041d\u0415 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d.",
      "Service Log write \u041d\u0415 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d.",
    ].join("\n");
  }

  if (!payload) {
    return [
      "Governed Activity Event write blocked.",
      "Reason: pending activity preview is incomplete.",
      "",
      "\u0427\u0442\u043e \u043d\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442:",
      "durationMinutes could not be safely inferred.",
      "",
      "DB write \u041d\u0415 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d.",
      "Service Log write \u041d\u0415 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d.",
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

const CALENDAR_ACTIVITY_REVIEW_UI_MARKER = "ACTIVITY_REVIEW_PACKAGE_UI_V1" as const;

const CALENDAR_PLANNED_TIME_MARKERS: readonly string[] = [
  "\u0437\u0430\u0432\u0442\u0440\u0430",
  "\u0441 \u0443\u0442\u0440\u0430",
  "\u0441\u0443\u0442\u0440\u0430",
  "\u0443\u0442\u0440\u043e\u043c",
  "\u0432\u0435\u0447\u0435\u0440\u043e\u043c",
  "\u0434\u043d\u0435\u043c",
  "\u0434\u043d\u0451\u043c",
  "\u043f\u043b\u0430\u043d\u0438\u0440\u0443\u044e",
  "\u0441\u043e\u0431\u0438\u0440\u0430\u044e\u0441\u044c",
  "\u0431\u0443\u0434\u0443",
  "\u0445\u043e\u0447\u0443",
  "\u043d\u0430\u0434\u043e",
  "\u043d\u0443\u0436\u043d\u043e",
  "tomorrow",
  "morning",
  "evening",
  "planning",
  "going to",
  "i will",
  "jutro",
  "rano",
  "wieczorem",
  "planuje",
  "planuj\u0119",
  "morgen",
];

const CALENDAR_PLANNED_ACTIVITY_MARKERS: readonly string[] = [
  "\u0431\u0435\u0433",
  "\u0431\u0435\u0433\u0430\u0442\u044c",
  "\u043f\u043e\u0431\u0435\u0433\u0430\u0442\u044c",
  "\u043f\u0440\u043e\u0431\u0435\u0436",
  "\u043f\u0440\u043e\u0431\u0435\u0436\u043a\u0430",
  "\u0442\u0440\u0435\u043d\u0438\u0440\u043e\u0432",
  "\u0441\u043f\u043e\u0440\u0442",
  "\u0437\u0430\u043b",
  "\u043f\u043b\u0430\u0432",
  "\u043f\u0440\u043e\u0433\u0443\u043b",
  "\u0443\u0447\u0438\u0442\u044c",
  "\u0437\u0430\u043d\u0438\u043c\u0430\u0442\u044c\u0441\u044f",
  "\u0437\u0430\u043d\u044f\u0442\u0438\u0435",
  "\u0440\u0430\u0431\u043e\u0442\u0430\u0442\u044c",
  "\u0441\u043e\u0437\u0432\u043e\u043d",
  "\u0432\u0441\u0442\u0440\u0435\u0447",
  "run",
  "running",
  "jog",
  "jogging",
  "train",
  "workout",
  "study",
  "meeting",
  "call",
  "bieg",
  "biegac",
  "pobiegac",
  "trening",
  "spotkanie",
  "laufen",
  "joggen",
  "training",
];

function isCalendarPlannedActivityCandidateMessage(message: string): boolean {
  const normalizedText = normalizeAvoGeneralSearchText(message.trim());

  if (!normalizedText) {
    return false;
  }

  if (hasAvoGeneralMarker(normalizedText, AVO_GENERAL_NO_SAVE_MARKERS)) {
    return false;
  }

  const hasPlanTime = hasAvoGeneralMarker(normalizedText, CALENDAR_PLANNED_TIME_MARKERS);
  const hasDuration = hasAvoGeneralDurationSignal(normalizedText);
  const hasActivity = hasAvoGeneralMarker(normalizedText, CALENDAR_PLANNED_ACTIVITY_MARKERS);

  return hasPlanTime && hasDuration && hasActivity;
}

function inferCalendarActivityTitle(text: string): string {
  const lowerText = normalizeAvoGeneralSearchText(text);

  if (hasAvoGeneralMarker(lowerText, ["\u0431\u0435\u0433", "\u0431\u0435\u0433\u0430\u0442\u044c", "\u043f\u043e\u0431\u0435\u0433\u0430\u0442\u044c", "\u043f\u0440\u043e\u0431\u0435\u0436", "\u043f\u0440\u043e\u0431\u0435\u0436\u043a\u0430", "run", "running", "jog", "jogging", "bieg", "pobiegac", "laufen", "joggen"])) {
    return "\u041f\u0440\u043e\u0431\u0435\u0436\u043a\u0430";
  }

  if (hasAvoGeneralMarker(lowerText, ["\u0442\u0440\u0435\u043d\u0438\u0440\u043e\u0432", "\u0441\u043f\u043e\u0440\u0442", "\u0437\u0430\u043b", "workout", "train", "trening", "training"])) {
    return "\u0422\u0440\u0435\u043d\u0438\u0440\u043e\u0432\u043a\u0430";
  }

  if (hasAvoGeneralMarker(lowerText, ["\u0443\u0447\u0438\u0442\u044c", "\u0437\u0430\u043d\u0438\u043c\u0430\u0442\u044c\u0441\u044f", "study", "learn", "nauka", "uczyc", "lernen"])) {
    return "\u041e\u0431\u0443\u0447\u0435\u043d\u0438\u0435";
  }

  if (hasAvoGeneralMarker(lowerText, ["\u0441\u043e\u0437\u0432\u043e\u043d", "\u0432\u0441\u0442\u0440\u0435\u0447", "meeting", "call", "spotkanie"])) {
    return "\u0412\u0441\u0442\u0440\u0435\u0447\u0430 / \u0441\u043e\u0437\u0432\u043e\u043d";
  }

  return inferAvoGeneralActivityTitle(text) ?? "\u041f\u043b\u0430\u043d\u043e\u0432\u0430\u044f \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c";
}

function inferCalendarDateTimeSummary(text: string): string {
  const lowerText = normalizeAvoGeneralSearchText(text);
  const parts: string[] = [];

  if (hasAvoGeneralMarker(lowerText, ["\u0437\u0430\u0432\u0442\u0440\u0430", "tomorrow", "jutro", "morgen"])) {
    parts.push("\u0437\u0430\u0432\u0442\u0440\u0430");
  }

  if (hasAvoGeneralMarker(lowerText, ["\u0441 \u0443\u0442\u0440\u0430", "\u0441\u0443\u0442\u0440\u0430", "\u0443\u0442\u0440\u043e\u043c", "morning", "rano"])) {
    parts.push("\u0443\u0442\u0440\u043e\u043c");
  } else if (hasAvoGeneralMarker(lowerText, ["\u0432\u0435\u0447\u0435\u0440\u043e\u043c", "evening", "wieczorem"])) {
    parts.push("\u0432\u0435\u0447\u0435\u0440\u043e\u043c");
  } else if (hasAvoGeneralMarker(lowerText, ["\u0434\u043d\u0435\u043c", "\u0434\u043d\u0451\u043c"])) {
    parts.push("\u0434\u043d\u0451\u043c");
  }

  const exactTimeMatch = lowerText.match(/\b(\d{1,2})[:.](\d{2})\b/);
  if (exactTimeMatch) {
    parts.push(`${exactTimeMatch[1]}:${exactTimeMatch[2]}`);
  }

  return parts.length > 0 ? parts.join(" \u00b7 ") : "\u0432\u0440\u0435\u043c\u044f \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u0443\u0442\u043e\u0447\u043d\u0435\u043d\u0438\u044f";
}

function inferCalendarActivityCategories(text: string): string[] {
  const categories = new Set<string>(guessCategoryCandidates(text));
  const lowerText = normalizeAvoGeneralSearchText(text);

  if (hasAvoGeneralMarker(lowerText, ["\u0431\u0435\u0433", "\u0431\u0435\u0433\u0430\u0442\u044c", "\u043f\u043e\u0431\u0435\u0433\u0430\u0442\u044c", "\u043f\u0440\u043e\u0431\u0435\u0436", "\u043f\u0440\u043e\u0431\u0435\u0436\u043a\u0430", "run", "running", "jog", "jogging", "bieg", "pobiegac", "laufen", "joggen"])) {
    categories.delete("\u041b\u0438\u0447\u043d\u0430\u044f \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c");
    categories.add("\u0424\u0438\u0437\u0438\u0447\u0435\u0441\u043a\u0430\u044f \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c");
    categories.add("\u0417\u0434\u043e\u0440\u043e\u0432\u044c\u0435");
    categories.add("\u041a\u0430\u0440\u0434\u0438\u043e / \u0431\u0435\u0433");
  }

  return Array.from(categories).slice(0, 6);
}

function inferCalendarFactPreviewLines(params: {
  title: string;
  duration: string;
  durationMinutes: number | null;
}): string[] {
  const factLines = [
    `duration: ${params.duration}`,
    `activity_kind: ${params.title}`,
  ];

  if (params.durationMinutes !== null) {
    factLines.push(`measure: activity.duration_minutes / ${params.durationMinutes} / min`);
  }

  factLines.push("status: preview_only_planned_not_actual");

  return factLines;
}

function buildCalendarActivityReviewPackageReply(message: string): string {
  const normalizedText = message.trim();
  const duration = extractDurationSummary(normalizedText);
  const durationMinutes = inferAvoGeneralDurationMinutes(normalizedText);
  const activityTitle = inferCalendarActivityTitle(normalizedText);
  const dateTime = inferCalendarDateTimeSummary(normalizedText);
  const categories = inferCalendarActivityCategories(normalizedText);
  const valueObjects = guessValueObjectCandidates(categories);
  const factPreviewLines = inferCalendarFactPreviewLines({
    title: activityTitle,
    duration,
    durationMinutes,
  });

  setLatestLocalPendingPreview({
    kind: "planned_activity",
    text: normalizedText,
    createdAtIso: new Date().toISOString(),
    duration,
    categories,
    valueObjects,
    note: "Calendar planned activity semantic preview. This is not an actual fact and no governed write has been executed yet.",
  });

  return [
    CALENDAR_ACTIVITY_REVIEW_UI_MARKER,
    "containerTitle: \u041a\u043e\u043d\u0442\u0435\u0439\u043d\u0435\u0440 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0438",
    "containerSubtitle: Activities Container / Semantic Preview / Activity Review Package",
    "mode: planned_activity",
    "status: preview_only",
    `rawText: ${normalizedText}`,
    `activityTitle: ${activityTitle}`,
    "recognizedType: \u041f\u043b\u0430\u043d\u043e\u0432\u0430\u044f \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c",
    `dateTime: ${dateTime}`,
    `duration: ${duration}`,
    `categoriesReady: ${categories.join("; ")}`,
    "categoriesDoubtful: \u041a\u0430\u0440\u0434\u0438\u043e / \u0431\u0435\u0433 - candidate; \u0442\u043e\u0447\u043d\u0430\u044f \u0438\u043d\u0442\u0435\u043d\u0441\u0438\u0432\u043d\u043e\u0441\u0442\u044c \u043d\u0435 \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0435\u043d\u0430",
    `valueObjectCandidatesReady: ${valueObjects.join("; ")}`,
    "valueObjectExistingLookup: NOT_IMPLEMENTED: \u0440\u0435\u0430\u043b\u044c\u043d\u044b\u0439 \u043f\u043e\u0438\u0441\u043a \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044e\u0449\u0438\u0445 VO \u043f\u043e \u0431\u0430\u0437\u0435 \u0435\u0449\u0451 \u043d\u0435 \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0451\u043d \u043a \u044d\u0442\u043e\u0439 preview-\u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0435",
    `factPreviewsReady: ${factPreviewLines.join("; ")}`,
    "plannedFactBoundary: \u041f\u043b\u0430\u043d\u043e\u0432\u0430\u044f \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c \u041d\u0415 \u044f\u0432\u043b\u044f\u0435\u0442\u0441\u044f \u0444\u0430\u043a\u0442\u043e\u043c. \u0424\u0430\u043a\u0442\u044b \u0431\u0443\u0434\u0443\u0442 \u0437\u0430\u043f\u0438\u0441\u0430\u043d\u044b \u0442\u043e\u043b\u044c\u043a\u043e \u043f\u043e\u0441\u043b\u0435 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u0438\u044f \u0438\u043b\u0438 \u044f\u0432\u043d\u043e\u0433\u043e \u0432\u044b\u0431\u043e\u0440\u0430 \u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u043a\u0430\u043a \u0444\u0430\u043a\u0442.",
    "plannedWrite: NOT_IMPLEMENTED: \u043a\u043d\u043e\u043f\u043a\u0430 \u0417\u0430\u043f\u043b\u0430\u043d\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0438 \u0437\u0430\u043f\u0438\u0441\u044c \u0432 /api/time-blocks \u0435\u0449\u0451 \u043d\u0435 \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0435\u043d\u044b \u0432 \u044d\u0442\u043e\u043c \u0448\u0430\u0433\u0435",
    "factWrite: NOT_IMPLEMENTED: \u043f\u043b\u0430\u043d\u043e\u0432\u0430\u044f \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c \u043d\u0435 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u044f\u0435\u0442\u0441\u044f \u0432 /api/activity/facts/save-gate \u0431\u0435\u0437 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u0438\u044f",
    "valueObjectCreate: NOT_IMPLEMENTED: \u0441\u043e\u0437\u0434\u0430\u043d\u0438\u0435 \u043d\u043e\u0432\u043e\u0433\u043e VO \u0438\u0437 preview \u043d\u0435 \u0432\u044b\u043f\u043e\u043b\u043d\u044f\u0435\u0442\u0441\u044f; \u043c\u043e\u0436\u043d\u043e \u0442\u043e\u043b\u044c\u043a\u043e \u043f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u043a\u0430\u043d\u0434\u0438\u0434\u0430\u0442\u0430",
    "actionsReady: \u0418\u0437\u043c\u0435\u043d\u0438\u0442\u044c \u0442\u0435\u043a\u0441\u0442; \u041e\u0442\u043c\u0435\u043d\u0430; \u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c review",
    "actionsMissing: NOT_IMPLEMENTED: \u0417\u0430\u043f\u043b\u0430\u043d\u0438\u0440\u043e\u0432\u0430\u0442\u044c; \u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u043a\u0430\u043a \u0444\u0430\u043a\u0442; \u0421\u0432\u044f\u0437\u0430\u0442\u044c \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044e\u0449\u0438\u0439 VO; \u0421\u043e\u0437\u0434\u0430\u0442\u044c VO-\u043a\u0430\u043d\u0434\u0438\u0434\u0430\u0442",
    "noWriteSafety: DB write \u041d\u0415 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d; Activity Event \u041d\u0415 \u0441\u043e\u0437\u0434\u0430\u043d; Time Block \u041d\u0415 \u0441\u043e\u0437\u0434\u0430\u043d; Value Object \u041d\u0415 \u0441\u043e\u0437\u0434\u0430\u043d; Activity Fact \u041d\u0415 \u0441\u043e\u0437\u0434\u0430\u043d",
    "nextGate: \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0438\u0442\u044c UI-\u043a\u043d\u043e\u043f\u043a\u0443 \u0417\u0430\u043f\u043b\u0430\u043d\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043a \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044e\u0449\u0435\u043c\u0443 \u043f\u043b\u0430\u043d\u043e\u0432\u043e\u043c\u0443 write-layer \u043f\u043e\u0441\u043b\u0435 \u043e\u0442\u0434\u0435\u043b\u044c\u043d\u043e\u0433\u043e code gate",
    `${CALENDAR_ACTIVITY_REVIEW_UI_MARKER}_END`,
  ].join("\n");
}
async function askLegacyAi(
  message: string,
  selectedTier: "nano" | "standard" | "pro",
  options?: {
    forceChat?: boolean;
    image?: AiNavigatorImageAttachment | null;
  },
): Promise<string> {
  if (!options?.forceChat && isCalendarPlannedActivityCandidateMessage(message)) {
    return buildCalendarActivityReviewPackageReply(message);
  }

  if (!options?.forceChat && isActivityFactsSaveGateWriteCommand(message)) {
    return await executeActivityFactsSaveGateWriteFromPendingPreview();
  }

  if (!options?.forceChat && isControlledActivityRecordWriteCommand(message)) {
    return await executeControlledActivityRecordWriteFromPendingPreview();
  }

  const classification = classifyUnifiedMessage(message);

  if (!options?.forceChat && classification.intent === "activity_preview") {
    return await buildNoWriteSemanticActivityPreviewReply(classification);
  }

  if (!options?.forceChat && classification.intent === "value_object_command") {
    return buildValueObjectCommandPreviewReply(classification);
  }

  if (!options?.forceChat && classification.intent === "correction") {
    return buildCorrectionPreviewReply(classification);
  }

  if (!options?.forceChat && classification.intent === "confirmation") {
    if (latestLocalPendingPreview?.kind === "activity") {
      return await executeControlledActivityRecordWriteFromPendingPreview();
    }

    return buildConfirmationGuardReply(classification);
  }

  if (!options?.forceChat && classification.intent === "cancel") {
    return buildCancelGuardReply(classification);
  }

  if (!options?.forceChat && classification.intent === "review_request") {
    return buildReviewRequestGuardReply(classification);
  }

  if (!options?.forceChat && classification.intent === "clarification") {
    return buildClarificationReply(classification);
  }

  const interfaceSearchParams = new URLSearchParams(window.location.search);
  const interfaceLocale =
    interfaceSearchParams.get("locale") ??
    interfaceSearchParams.get("lang");

  const response = await fetch("/api/test", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      selectedTier,
      locale: interfaceLocale,
      image: options?.image?.dataUrl
        ? {
            dataUrl: options.image.dataUrl,
            name: options.image.name,
            mimeType: options.image.mimeType,
          }
        : null,
    }),
  });

  let data: ApiTestResponse = {};

  try {
    data = (await response.json()) as ApiTestResponse;
  } catch {
    throw new Error("\u041e\u0442\u0432\u0435\u0442 \u0441\u0435\u0440\u0432\u0435\u0440\u0430 \u043f\u0440\u0438\u0448\u0451\u043b \u043d\u0435 \u0432 JSON-\u0444\u043e\u0440\u043c\u0430\u0442\u0435.");
  }

  if (!response.ok) {
    if (data.error === "Not authenticated") {
      throw new Error("\u041d\u0443\u0436\u043d\u043e \u0432\u043e\u0439\u0442\u0438 \u0432 \u0441\u0438\u0441\u0442\u0435\u043c\u0443, \u0447\u0442\u043e\u0431\u044b \u043f\u043e\u043b\u0443\u0447\u0438\u0442\u044c \u043e\u0442\u0432\u0435\u0442 AI.");
    }

    throw new Error(friendlyAiError(data.error));
  }

  return data.reply || data.error || "\u041e\u0442\u0432\u0435\u0442 \u043f\u0443\u0441\u0442\u043e\u0439.";
}

type QuickCaptureResponse = {
  ok?: boolean;
  error?: string;
  calendarEventId?: string | null;
  result?: {
    reviewHref?: string | null;
    activityEventIds?: string[];
  } | null;
};

async function submitAiRailActivity(
  text: string,
  mode: Exclude<AiNavigatorMode, "chat">,
  clientRequestId: string,
) {
  const locale = getNavigatorLocale();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const response = await fetch("/api/activity/quick-capture", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      inputText: text,
      locale,
      timeZone,
      temporalDirection: mode === "past" ? "past" : "future",
      clientRequestId,
    }),
  });

  const payload = (await response.json().catch(() => null)) as QuickCaptureResponse | null;

  if (!response.ok || payload?.ok !== true) {
    throw new Error(payload?.error || `ACTIVITY_QUICK_CAPTURE_HTTP_${response.status}`);
  }

  const defaultHref = mode === "past" ? "/activity-review" : "/calendar";
  const href = mode === "past"
    ? payload.result?.reviewHref?.trim() || defaultHref
    : defaultHref;

  return {
    payload,
    href: buildLocaleAwareNavigatorHref(href),
  };
}

export function AiNavigatorProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const session = useUserSessionClient();
  const router = useRouter();
  const storageKey = safeStorageKey(session.email);
  const storageReadyRef = useRef(false);

  const [messages, setMessages] = useState<AiNavigatorMessage[]>(DEFAULT_MESSAGES);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [navigatorMode, setNavigatorMode] = useState<AiNavigatorMode>("chat");
  const [selectedTier, setSelectedTier] = useState<"nano" | "standard" | "pro">("standard");

  useEffect(() => {
    if (session.isLoading) {
      return;
    }

    storageReadyRef.current = false;
    let cancelled = false;

    const timeoutId = window.setTimeout(() => {
      const localMessages = readMessagesFromLocalStorage(storageKey);
      setMessages(localMessages);
      storageReadyRef.current = true;

      if (localMessages.length > DEFAULT_MESSAGES.length) {
        return;
      }

      void fetch("/api/messages", {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      })
        .then(async (response) => {
          if (!response.ok) return null;
          return (await response.json().catch(() => null)) as ServerChatHistoryResponse | null;
        })
        .then((payload) => {
          if (cancelled || payload?.success !== true || !Array.isArray(payload.messages) || payload.messages.length === 0) {
            return;
          }

          const restored: AiNavigatorMessage[] = payload.messages
            .filter((item) => typeof item.content === "string" && item.content.trim())
            .map((item, index) => ({
              id: Date.parse(item.created_at || "") || Date.now() + index,
              role: item.role === "user" ? "user" : "ai",
              text: item.content?.trim() ?? "",
              createdAt: item.created_at || new Date().toISOString(),
            }));

          if (restored.length > 0) {
            setMessages([DEFAULT_MESSAGES[0], ...restored]);
          }
        })
        .catch(() => {
          // Server history is optional recovery. Local chat remains usable.
        });
    }, 0);

    return () => {
      cancelled = true;
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
        JSON.stringify(serializeMessagesForLocalStorage(messages)),
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
        text: "\u0410\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c \u043f\u0440\u0438\u043d\u044f\u0442\u0430 \u043a\u0430\u043a local preview. \u0421\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u0439 gate — \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0435\u043d\u0438\u0435 \u043a Activity Capture review-flow.",
        createdAt: now,
      },
    ]);
  }, []);

  const sendMessage = useCallback(
    async (message?: string, options?: AiNavigatorSendOptions) => {
      const trimmedInput = (message ?? input).trim();
      const image = options?.image ?? null;
      const activityRequestId = options?.clientRequestId ?? createNavigatorRequestId();

      if ((!trimmedInput && !image) || isSending) {
        return;
      }

      if (navigatorMode !== "chat" && image) {
        throw new Error("IMAGE_ATTACHMENT_ACTIVITY_MODE_NOT_SUPPORTED");
      }

      const now = new Date().toISOString();
      const userMessageId = Date.now();
      const assistantMessageId = userMessageId + 1;
      const userText = trimmedInput || (image ? image.name : "");

      setMessages((previousMessages) => [
        ...previousMessages,
        {
          id: userMessageId,
          role: "user",
          text: userText,
          createdAt: now,
          attachment: image ?? undefined,
        },
        {
          id: assistantMessageId,
          role: "ai",
          text: "…",
          createdAt: now,
        },
      ]);

      setInput("");
      setIsSending(true);

      try {
        if (navigatorMode === "past" || navigatorMode === "future") {
          const result = await submitAiRailActivity(trimmedInput, navigatorMode, activityRequestId);
          const savedCopy = getActivitySavedCopy(navigatorMode);

          setMessages((previousMessages) =>
            previousMessages.map((messageItem) =>
              messageItem.id === assistantMessageId
                ? {
                    ...messageItem,
                    role: "ai",
                    text: savedCopy.text,
                    action: { href: result.href, label: savedCopy.label },
                    createdAt: new Date().toISOString(),
                  }
                : messageItem,
            ),
          );

          router.push(result.href);
          return;
        }

        const reply = await askLegacyAi(trimmedInput || "Describe the attached image.", selectedTier, {
          forceChat: true,
          image,
        });

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
        const rawError = error instanceof Error ? error.message : "AI_NAVIGATOR_REQUEST_FAILED";
        const errorMessage = rawError.startsWith("ACTIVITY_")
          ? friendlyAiError(undefined)
          : rawError === "IMAGE_ATTACHMENT_ACTIVITY_MODE_NOT_SUPPORTED"
            ? friendlyAiError(undefined)
            : rawError;

        setMessages((previousMessages) =>
          previousMessages.map((messageItem) =>
            messageItem.id === assistantMessageId
              ? {
                  ...messageItem,
                  role: "error",
                  text: errorMessage,
                  retryText: trimmedInput || undefined,
                  retryRequestId: navigatorMode === "chat" ? undefined : activityRequestId,
                  createdAt: new Date().toISOString(),
                }
              : messageItem,
          ),
        );
      } finally {
        setIsSending(false);
      }
    },
    [input, isSending, navigatorMode, router, selectedTier],
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
      navigatorMode,
      selectedTier,
      setNavigatorMode,
      setSelectedTier,
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
      navigatorMode,
      selectedTier,
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



