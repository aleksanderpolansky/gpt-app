"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  CalendarPlus,
  ChevronDown,
  HelpCircle,
  ImagePlus,
  MessageSquare,
  Mic,
  Send,
  Sparkles,
  Target,
  X,
} from "lucide-react";

import {
  getLocaleSearchParam,
  getMessage,
  getNavigationMessage,
  type LocaleCode,
  type MessageParams,
  type NavigationMessageKey,
} from "@/i18n";

import { UserSessionMiniStatus } from "../auth/user-session-client";
import {
  useAiNavigator,
  type AiNavigatorImageAttachment,
  type AiNavigatorMessage,
  type AiNavigatorMode,
} from "./ai-navigator-provider";

export const ARCTOR_AI_RIGHT_RAIL_MESSENGER_UX_V1 =
  "ARCTOR_AI_RIGHT_RAIL_MESSENGER_UX_V1" as const;



type AiNavigatorMessageKey =
  | "aiNavigator.activityPreview"
  | "aiNavigator.defaultGreeting"
  | "aiNavigator.modelNanoCaption"
  | "aiNavigator.modelProCaption"
  | "aiNavigator.modelStandardCaption"
  | "aiNavigator.placeholder"
  | "aiNavigator.send"
  | "aiNavigator.singleInputDescription"
  | "aiNavigator.singleInputTitle"
  | "aiNavigator.modePast"
  | "aiNavigator.modeFuture"
  | "aiNavigator.modeChat"
  | "aiNavigator.placeholderPast"
  | "aiNavigator.placeholderFuture"
  | "aiNavigator.photoTooLarge"
  | "aiNavigator.photoUnsupported"
  | "aiNavigator.voiceUnsupported"
  | "aiNavigator.newMessages"
  | "aiNavigator.retry";

type AiNavigatorTranslate = (
  key: AiNavigatorMessageKey,
  params?: MessageParams,
) => string;

const aiNavigatorMessages: Record<AiNavigatorMessageKey, Record<LocaleCode, string>> = {
  "aiNavigator.activityPreview": {
    ru: "Предпросмотр активности",
    pl: "Podgląd aktywności",
    en: "Activity preview",
    es: "Vista previa de actividad",
    uk: "Попередній перегляд активності",
    de: "Aktivitätsvorschau",
    cs: "Náhled aktivity",
  },
  "aiNavigator.defaultGreeting": {
    ru: "Привет! Я AI-Навигатор. Могу помочь разобрать активность, подсказать следующий шаг или объяснить текущую страницу.",
    pl: "Cześć! Jestem AI-Nawigatorem. Mogę pomóc przeanalizować aktywność, podpowiedzieć następny krok albo wyjaśnić bieżącą stronę.",
    en: "Hi! I am the AI Navigator. I can help analyze an activity, suggest the next step, or explain the current page.",
    es: "¡Hola! Soy el Navegador AI. Puedo ayudar a analizar una actividad, sugerir el siguiente paso o explicar la página actual.",
    uk: "Привіт! Я AI-Навігатор. Можу допомогти розібрати активність, підказати наступний крок або пояснити поточну сторінку.",
    de: "Hallo! Ich bin der AI-Navigator. Ich kann helfen, eine Aktivität zu analysieren, den nächsten Schritt vorzuschlagen oder die aktuelle Seite zu erklären.",
    cs: "Ahoj! Jsem AI Navigátor. Pomohu analyzovat aktivitu, navrhnout další krok nebo vysvětlit aktuální stránku.",
  },
  "aiNavigator.modelNanoCaption": { ru: "эконом", pl: "ekonomia", en: "economy", es: "económico", uk: "економ", de: "sparsam", cs: "úsporný" },
  "aiNavigator.modelStandardCaption": { ru: "стандарт", pl: "standard", en: "standard", es: "estándar", uk: "стандарт", de: "standard", cs: "standard" },
  "aiNavigator.modelProCaption": { ru: "премиум", pl: "premium", en: "premium", es: "premium", uk: "преміум", de: "Premium", cs: "premium" },
  "aiNavigator.placeholder": {
    ru: "Напишите сообщение...",
    pl: "Napisz wiadomość...",
    en: "Write a message...",
    es: "Escribe un mensaje...",
    uk: "Напишіть повідомлення...",
    de: "Nachricht schreiben...",
    cs: "Napište zprávu...",
  },
  "aiNavigator.send": { ru: "Отправить", pl: "Wyślij", en: "Send", es: "Enviar", uk: "Надіслати", de: "Senden", cs: "Odeslat" },
  "aiNavigator.singleInputTitle": {
    ru: "Единое поле сообщения",
    pl: "Jedno pole wiadomości",
    en: "Single message input",
    es: "Un solo campo de mensaje",
    uk: "Єдине поле повідомлення",
    de: "Ein einziges Nachrichtenfeld",
    cs: "Jedno pole zprávy",
  },
  "aiNavigator.singleInputDescription": {
    ru: "Все действия проходят через нижнее поле «Написать сообщение». Быстрые примеры ниже только вставляют текст в единый composer и не создают отдельную точку ввода.",
    pl: "Wszystkie działania przechodzą przez dolne pole „Napisz wiadomość”. Szybkie przykłady poniżej tylko wstawiają tekst do jednego composera i nie tworzą osobnego punktu wejścia.",
    en: "All actions go through the bottom field “Write a message”. The quick examples below only insert text into the single composer and do not create a separate input point.",
    es: "Todas las acciones pasan por el campo inferior «Escribe un mensaje». Los ejemplos rápidos de abajo solo insertan texto en el compositor único y no crean otro punto de entrada.",
    uk: "Усі дії проходять через нижнє поле «Напишіть повідомлення». Швидкі приклади нижче лише вставляють текст у єдиний composer і не створюють окремої точки введення.",
    de: "Alle Aktionen laufen über das untere Feld „Nachricht schreiben“. Die Schnellbeispiele unten fügen nur Text in den einzigen Composer ein und erzeugen keinen zweiten Eingabepunkt.",
    cs: "Všechny akce procházejí spodním polem „Napište zprávu“. Rychlé příklady níže pouze vloží text do jediného composeru a nevytvářejí další vstupní místo.",
  },
  "aiNavigator.modePast": { ru: "Прошедшее", pl: "Wydarzyło się", en: "Past event", es: "Ocurrió", uk: "Відбулося", de: "Geschehen", cs: "Stalo se" },
  "aiNavigator.modeFuture": { ru: "Запланировать", pl: "Zaplanuj", en: "Plan", es: "Planificar", uk: "Запланувати", de: "Planen", cs: "Naplánovat" },
  "aiNavigator.modeChat": { ru: "Общение", pl: "Rozmowa", en: "Chat", es: "Chat", uk: "Спілкування", de: "Chat", cs: "Chat" },
  "aiNavigator.placeholderPast": { ru: "Что произошло?", pl: "Co się wydarzyło?", en: "What happened?", es: "¿Qué ocurrió?", uk: "Що відбулося?", de: "Was ist passiert?", cs: "Co se stalo?" },
  "aiNavigator.placeholderFuture": { ru: "Что нужно запланировать?", pl: "Co zaplanować?", en: "What should be planned?", es: "¿Qué quieres planificar?", uk: "Що запланувати?", de: "Was soll geplant werden?", cs: "Co naplánovat?" },
  "aiNavigator.photoTooLarge": { ru: "Фото должно быть не больше 3 МБ.", pl: "Zdjęcie może mieć maksymalnie 3 MB.", en: "The photo must be 3 MB or smaller.", es: "La foto debe tener 3 MB como máximo.", uk: "Фото має бути не більше 3 МБ.", de: "Das Foto darf höchstens 3 MB groß sein.", cs: "Fotografie může mít nejvýše 3 MB." },
  "aiNavigator.photoUnsupported": { ru: "Поддерживаются JPG, PNG и WebP.", pl: "Obsługiwane są JPG, PNG i WebP.", en: "JPG, PNG, and WebP are supported.", es: "Se admiten JPG, PNG y WebP.", uk: "Підтримуються JPG, PNG та WebP.", de: "JPG, PNG und WebP werden unterstützt.", cs: "Podporovány jsou JPG, PNG a WebP." },
  "aiNavigator.voiceUnsupported": { ru: "Голосовой ввод недоступен в этом браузере.", pl: "Wprowadzanie głosowe nie jest dostępne w tej przeglądarce.", en: "Voice input is not available in this browser.", es: "La entrada por voz no está disponible en este navegador.", uk: "Голосове введення недоступне в цьому браузері.", de: "Spracheingabe ist in diesem Browser nicht verfügbar.", cs: "Hlasový vstup není v tomto prohlížeči dostupný." },
  "aiNavigator.newMessages": { ru: "Новые сообщения", pl: "Nowe wiadomości", en: "New messages", es: "Mensajes nuevos", uk: "Нові повідомлення", de: "Neue Nachrichten", cs: "Nové zprávy" },
  "aiNavigator.retry": { ru: "Повторить", pl: "Spróbuj ponownie", en: "Retry", es: "Reintentar", uk: "Повторити", de: "Erneut versuchen", cs: "Zkusit znovu" },
};

function useInterfaceLocale(): LocaleCode {
  const [locale, setLocale] = useState<LocaleCode>("en");

  useEffect(() => {
    function readLocaleFromUrl() {
      if (typeof window === "undefined") {
        return;
      }

      setLocale(getLocaleSearchParam(new URLSearchParams(window.location.search)));
    }

    readLocaleFromUrl();
    window.addEventListener("popstate", readLocaleFromUrl);

    return () => {
      window.removeEventListener("popstate", readLocaleFromUrl);
    };
  }, []);

  return locale;
}

function useAiNavigatorTranslator(locale: LocaleCode): AiNavigatorTranslate {
  return (key, params) => getMessage(aiNavigatorMessages, key, locale, params);
}

function useNavigationTranslator(locale: LocaleCode) {
  return (key: NavigationMessageKey) => getNavigationMessage(key, locale);
}

export const UI_MINI_FIX_ACTIVITY_COMPOSER_ON_DEMAND_IN_GLOBAL_AI =
  "UI_MINI_FIX_ACTIVITY_COMPOSER_ON_DEMAND_IN_GLOBAL_AI" as const;

type ActivityReviewFieldStatus = "ready" | "warning" | "missing";

type ParsedActivityReviewPackage = {
  containerTitle: string;
  containerSubtitle: string;
  mode: string;
  status: string;
  fields: Array<{
    key: string;
    label: string;
    value: string;
    status: ActivityReviewFieldStatus;
  }>;
};

const ACTIVITY_REVIEW_UI_MARKER = "ACTIVITY_REVIEW_PACKAGE_UI_V1";

const ACTIVITY_REVIEW_FIELD_LABELS: Record<string, string> = {
  rawText: "\u0418\u0441\u0445\u043e\u0434\u043d\u044b\u0439 \u0442\u0435\u043a\u0441\u0442",
  activityTitle: "\u0417\u0430\u0433\u043e\u043b\u043e\u0432\u043e\u043a \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0438",
  recognizedType: "\u0420\u0430\u0441\u043f\u043e\u0437\u043d\u0430\u043d\u043d\u044b\u0439 \u0442\u0438\u043f",
  dateTime: "\u0414\u0430\u0442\u0430 / \u0432\u0440\u0435\u043c\u044f",
  duration: "\u0414\u043b\u0438\u0442\u0435\u043b\u044c\u043d\u043e\u0441\u0442\u044c",
  categoriesReady: "\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u0438: ready",
  categoriesDoubtful: "\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u0438: candidate",
  valueObjectCandidatesReady: "VO candidates",
  valueObjectExistingLookup: "\u041f\u043e\u0438\u0441\u043a existing VO",
  factPreviewsReady: "Fact previews",
  plannedFactBoundary: "Plan / fact boundary",
  plannedWrite: "\u0417\u0430\u043f\u043b\u0430\u043d\u0438\u0440\u043e\u0432\u0430\u0442\u044c",
  factWrite: "\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u043a\u0430\u043a \u0444\u0430\u043a\u0442",
  valueObjectCreate: "\u0421\u043e\u0437\u0434\u0430\u0442\u044c VO",
  actionsReady: "\u0414\u043e\u0441\u0442\u0443\u043f\u043d\u044b\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f",
  actionsMissing: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044f \u0435\u0449\u0451 \u043d\u0435 \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0435\u043d\u044b",
  noWriteSafety: "No-write safety",
  nextGate: "Next code gate",
};

function getActivityReviewFieldStatus(key: string, value: string): ActivityReviewFieldStatus {
  if (value.startsWith("NOT_IMPLEMENTED:") || key.toLowerCase().includes("missing")) {
    return "missing";
  }

  if (
    key.toLowerCase().includes("doubtful") ||
    key.toLowerCase().includes("boundary") ||
    value.toLowerCase().includes("candidate") ||
    value.toLowerCase().includes("requires")
  ) {
    return "warning";
  }

  return "ready";
}

function parseActivityReviewPackage(text: string): ParsedActivityReviewPackage | null {
  if (!text.includes(ACTIVITY_REVIEW_UI_MARKER)) {
    return null;
  }

  const lines = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines[0] !== ACTIVITY_REVIEW_UI_MARKER) {
    return null;
  }

  let containerTitle = "\u041a\u043e\u043d\u0442\u0435\u0439\u043d\u0435\u0440 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0438";
  let containerSubtitle = "Activities Container / Semantic Preview";
  let mode = "preview";
  let status = "preview_only";
  const fields: ParsedActivityReviewPackage["fields"] = [];

  for (const line of lines.slice(1)) {
    if (line === `${ACTIVITY_REVIEW_UI_MARKER}_END`) {
      break;
    }

    const separatorIndex = line.indexOf(":");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (key === "containerTitle") {
      containerTitle = value;
      continue;
    }

    if (key === "containerSubtitle") {
      containerSubtitle = value;
      continue;
    }

    if (key === "mode") {
      mode = value;
      continue;
    }

    if (key === "status") {
      status = value;
      continue;
    }

    fields.push({
      key,
      label: ACTIVITY_REVIEW_FIELD_LABELS[key] ?? key,
      value,
      status: getActivityReviewFieldStatus(key, value),
    });
  }

  return {
    containerTitle,
    containerSubtitle,
    mode,
    status,
    fields,
  };
}

function ActivityReviewStatusBadge({ status }: { readonly status: ActivityReviewFieldStatus }) {
  const statusClassName =
    status === "missing"
      ? "border-red-200 bg-red-50 text-red-700"
      : status === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";

  const label = status === "missing" ? "not implemented" : status === "warning" ? "candidate" : "ready";

  return (
    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${statusClassName}`}>
      {label}
    </span>
  );
}

function ActivityReviewPackageCard({ review }: { readonly review: ParsedActivityReviewPackage }) {
  const readyCount = review.fields.filter((field) => field.status === "ready").length;
  const warningCount = review.fields.filter((field) => field.status === "warning").length;
  const missingCount = review.fields.filter((field) => field.status === "missing").length;

  return (
    <div className="rounded-2xl border border-[#3b6ef8]/15 bg-gradient-to-br from-white via-[#f7f9ff] to-[#fff7fb] p-3 shadow-sm">
      <div className="mb-3 rounded-2xl border border-[#3b6ef8]/10 bg-white/85 p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-[#3b6ef8]">
              Semantic Preview / Activity Review Package
            </div>
            <h3 className="mt-1 text-[14px] font-bold leading-tight text-[#202844]">
              {review.containerTitle}
            </h3>
            <p className="mt-1 text-[11px] leading-relaxed text-[#68708b]">
              {review.containerSubtitle}
            </p>
          </div>
          <span className="rounded-full border border-[#3b6ef8]/15 bg-[#eef3ff] px-2 py-1 text-[9px] font-semibold uppercase text-[#3b6ef8]">
            {review.mode}
          </span>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-1.5">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-2 py-1.5 text-center">
          <div className="text-[14px] font-bold text-emerald-700">{readyCount}</div>
          <div className="text-[9px] font-semibold uppercase tracking-wide text-emerald-700/75">ready</div>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50/90 px-2 py-1.5 text-center">
          <div className="text-[14px] font-bold text-amber-700">{warningCount}</div>
          <div className="text-[9px] font-semibold uppercase tracking-wide text-amber-700/75">candidate</div>
        </div>
        <div className="rounded-xl border border-red-100 bg-red-50/90 px-2 py-1.5 text-center">
          <div className="text-[14px] font-bold text-red-600">{missingCount}</div>
          <div className="text-[9px] font-semibold uppercase tracking-wide text-red-600/75">missing</div>
        </div>
      </div>

      <div className="space-y-2">
        {review.fields.map((field) => {
          const statusClasses =
            field.status === "missing"
              ? "border-red-200 bg-red-50/90 text-red-800"
              : field.status === "warning"
                ? "border-amber-200 bg-amber-50/90 text-amber-900"
                : "border-[rgba(59,110,248,0.12)] bg-white/90 text-[#28314d]";

          return (
            <div key={field.key} className={`rounded-xl border px-2.5 py-2 ${statusClasses}`}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide opacity-75">
                  {field.label}
                </span>
                <ActivityReviewStatusBadge status={field.status} />
              </div>
              <div className="whitespace-pre-wrap break-words text-[12px] font-medium leading-relaxed">
                {field.value.replace(/^NOT_IMPLEMENTED:\s*/i, "")}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 rounded-xl border border-[#3b6ef8]/10 bg-white/80 p-2">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-[#3b6ef8]">
          Semantic preview only
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-[#5a6077]">
          \u042d\u0442\u0430 \u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0430 \u043d\u0438\u0447\u0435\u0433\u043e \u043d\u0435 \u0437\u0430\u043f\u0438\u0441\u044b\u0432\u0430\u0435\u0442 \u0432 \u0431\u0430\u0437\u0443. \u041a\u0440\u0430\u0441\u043d\u044b\u0435 \u0441\u0442\u0440\u043e\u043a\u0438 \u043f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u044e\u0442 \u043f\u043e\u043b\u044f \u0438 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f, \u043a\u043e\u0442\u043e\u0440\u044b\u0435 \u0435\u0449\u0451 \u043d\u0435 \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0435\u043d\u044b \u043a real write-gate.
        </p>
      </div>
    </div>
  );
}
function FormattedMessageContent({ text }: { text: string }) {
  const normalizedText = text.replace(/\r\n/g, "\n").trim();

  if (!normalizedText) {
    return null;
  }

  const lines = normalizedText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <span className="block space-y-2">
      {lines.map((line, index) => {
        const lowerLine = line.toLowerCase();
        const isCommandLine = line.startsWith("—") || line.startsWith("-");
        const isImportantLine =
          lowerLine.startsWith("text:") ||
          lowerLine.startsWith("duration:") ||
          lowerLine.startsWith("intent:") ||
          lowerLine.startsWith("confidence:") ||
          lowerLine.startsWith("category candidates:") ||
          lowerLine.startsWith("value object candidates:") ||
          lowerLine.startsWith("status:") ||
          lowerLine.startsWith("db write") ||
          lowerLine.startsWith("service log");

        return (
          <span
            key={`message-line-${index}-${line.slice(0, 32)}`}
            className={[
              "block whitespace-pre-wrap break-words",
              isCommandLine ? "border-l-2 border-[#3b6ef8]/30 pl-2 text-[#3b6ef8]" : "",
              isImportantLine ? "font-medium text-[#1f2a44]" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {line}
          </span>
        );
      })}
    </span>
  );
}
function formatMessageTime(createdAt: string, locale: LocaleCode) {
  const value = new Date(createdAt);
  if (Number.isNaN(value.getTime()) || value.getTime() === 0) return null;
  return new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

const MODE_ITEMS: Array<{ mode: AiNavigatorMode; icon: typeof Activity; labelKey: AiNavigatorMessageKey }> = [
  { mode: "past", icon: Activity, labelKey: "aiNavigator.modePast" },
  { mode: "future", icon: CalendarPlus, labelKey: "aiNavigator.modeFuture" },
  { mode: "chat", icon: MessageSquare, labelKey: "aiNavigator.modeChat" },
];

function getSpeechLocale(locale: LocaleCode) {
  return ({ ru: "ru-RU", pl: "pl-PL", en: "en-US", es: "es-ES", uk: "uk-UA", de: "de-DE", cs: "cs-CZ" } as const)[locale];
}

type SpeechResultEvent = {
  results: ArrayLike<{
    0: { transcript: string };
    isFinal?: boolean;
    length: number;
  }> & { length: number };
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function MessageBubble({
  message,
  t,
  navigationT,
  locale,
  onRetry,
}: {
  readonly message: AiNavigatorMessage;
  readonly t: AiNavigatorTranslate;
  readonly navigationT: (key: NavigationMessageKey) => string;
  readonly locale: LocaleCode;
  readonly onRetry?: (
    text: string,
    requestId?: string,
    image?: AiNavigatorImageAttachment,
  ) => void;
}) {
  const timeLabel = formatMessageTime(message.createdAt, locale);
  const activityReview = parseActivityReviewPackage(message.text);

  if (activityReview && message.role !== "user" && message.role !== "error") {
    return <ActivityReviewPackageCard review={activityReview} />;
  }

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[86%]">
          <div className="rounded-2xl rounded-br-md bg-[#3b6ef8] px-3 py-2.5 text-[12.5px] leading-relaxed text-white shadow-[0_3px_12px_rgba(59,110,248,0.16)]">
            {message.attachment?.dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={message.attachment.dataUrl}
                alt={message.attachment.name}
                className="mb-2 max-h-52 w-full rounded-xl object-cover"
              />
            ) : message.attachment ? (
              <div className="mb-2 flex items-center gap-1.5 rounded-lg bg-white/12 px-2 py-1.5 text-[10px] text-white/85">
                <ImagePlus size={12} />
                <span className="truncate">{message.attachment.name}</span>
              </div>
            ) : null}
            <FormattedMessageContent text={message.text} />
          </div>
          {timeLabel ? <div className="mt-1 pr-1 text-right text-[9px] text-[#a0a6b8]">{timeLabel}</div> : null}
        </div>
      </div>
    );
  }

  if (message.role === "error") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-3">
        <div className="mb-1.5 flex items-center gap-1.5">
          <HelpCircle size={11} className="text-red-600" />
          <span className="text-[10.5px] font-semibold uppercase tracking-wide text-red-600">
            {navigationT("navigation.aiError")}
          </span>
        </div>
        <p className="text-[12px] leading-relaxed text-red-700">
          <FormattedMessageContent text={message.text} />
        </p>
        {message.retryText !== undefined && onRetry ? (
          <button
            type="button"
            onClick={() => onRetry(
              message.retryText ?? "",
              message.retryRequestId,
              message.retryImage,
            )}
            className="mt-2 inline-flex min-h-8 items-center rounded-lg border border-red-200 bg-white px-2.5 text-[10.5px] font-semibold text-red-700 transition-colors hover:bg-red-100"
          >
            {t("aiNavigator.retry")}
          </button>
        ) : null}
        {message.text.includes("Need to sign in") ? (
          <a
            href="/auth/login?connection=google-oauth2&prompt=select_account"
            className="mt-2 inline-flex rounded-lg bg-red-600 px-3 py-1.5 text-[11.5px] font-semibold text-white transition-colors hover:bg-red-700"
          >
            {navigationT("navigation.signIn")}
          </a>
        ) : null}
      </div>
    );
  }

  if (message.role === "activity") {
    return (
      <div className="rounded-xl border border-[#3b6ef8]/15 bg-[#eef2ff] p-3">
        <div className="mb-1.5 flex items-center gap-1.5">
          <Activity size={11} className="text-[#3b6ef8]" />
          <span className="text-[10.5px] font-semibold uppercase tracking-wide text-[#3b6ef8]">
            {t("aiNavigator.activityPreview")}
          </span>
        </div>
        <p className="whitespace-pre-line text-[12px] leading-relaxed text-[#2d3047]">
          <FormattedMessageContent text={message.text} />
        </p>
      </div>
    );
  }

  if (message.role === "insight") {
    return (
      <div className="rounded-xl border border-[#8b5cf6]/15 bg-gradient-to-br from-[#eef2ff] to-[#f5f0ff] p-3">
        <div className="mb-1.5 flex items-center gap-1.5">
          <Sparkles size={11} className="text-[#8b5cf6]" />
          <span className="text-[10.5px] font-semibold uppercase tracking-wide text-[#8b5cf6]">
            {navigationT("navigation.context")}
          </span>
        </div>
        <p className="whitespace-pre-line text-[12px] leading-relaxed text-[#3d3657]">
          <FormattedMessageContent text={message.text} />
        </p>
      </div>
    );
  }

  if (message.role === "rec") {
    return (
      <div className="rounded-xl border border-[#22c55e]/20 bg-gradient-to-br from-[#f0fff4] to-[#f0fdf9] p-3">
        <div className="mb-1.5 flex items-center gap-1.5">
          <Target size={11} className="text-[#22c55e]" />
          <span className="text-[10.5px] font-semibold uppercase tracking-wide text-[#22c55e]">
            {navigationT("navigation.recommendation")}
          </span>
        </div>
        <p className="whitespace-pre-line text-[12px] leading-relaxed text-[#1a3d2e]">
          <FormattedMessageContent text={message.text} />
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-lg bg-[#eef2ff] text-[#3b6ef8]">
        <Sparkles size={10} />
      </div>
      <div className="max-w-[86%]">
        <div className="whitespace-pre-line rounded-2xl rounded-tl-md border border-[rgba(59,110,248,0.08)] bg-[#f5f6fb] px-3 py-2.5 text-[12.5px] leading-relaxed text-[#2d3047]">
          <FormattedMessageContent text={message.text} />
          {message.action ? (
            <Link
              href={message.action.href}
              className="mt-2 inline-flex min-h-9 items-center rounded-xl border border-[#3b6ef8]/15 bg-white px-3 text-[11.5px] font-semibold text-[#3b6ef8] shadow-sm transition-colors hover:bg-[#eef2ff] focus:outline-none focus:ring-2 focus:ring-[#3b6ef8]/30"
            >
              {message.action.label}
            </Link>
          ) : null}
        </div>
        {timeLabel ? <div className="mt-1 pl-1 text-[9px] text-[#a0a6b8]">{timeLabel}</div> : null}
      </div>
    </div>
  );
}

export function GlobalAiNavigator({
  className = "hidden w-[292px] flex-shrink-0 flex-col overflow-hidden border-l border-[rgba(0,0,0,0.07)] bg-white xl:flex",
  mobileDrawer = false,
}: {
  readonly className?: string;
  readonly mobileDrawer?: boolean;
}) {
  const {
    messages,
    input,
    isSending,
    navigatorMode,
    selectedTier,
    modelOptions,
    setNavigatorMode,
    setSelectedTier,
    setInput,
    sendMessage,
  } = useAiNavigator();

  const locale = useInterfaceLocale();
  const t = useAiNavigatorTranslator(locale);
  const navigationT = useNavigationTranslator(locale);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const stickToBottomRef = useRef(true);
  const [hasUnreadBelow, setHasUnreadBelow] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [composerNotice, setComposerNotice] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<AiNavigatorImageAttachment | null>(null);
  const initialGreetingCreatedAt = new Date(0).toISOString();

  const displayMessages = messages.map((message) =>
    message.id === 1 && message.createdAt === initialGreetingCreatedAt
      ? { ...message, text: t("aiNavigator.defaultGreeting") }
      : message,
  );

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messageEndRef.current?.scrollIntoView({ behavior, block: "end" });
    stickToBottomRef.current = true;
    setHasUnreadBelow(false);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => scrollToBottom("auto"), 0);
    return () => window.clearTimeout(timeoutId);
  }, [scrollToBottom]);

  const latestMessage = messages[messages.length - 1];
  useEffect(() => {
    if (!latestMessage) return;

    const timeoutId = window.setTimeout(() => {
      if (latestMessage.role === "user" || isSending || stickToBottomRef.current) {
        scrollToBottom(latestMessage.role === "user" ? "smooth" : "auto");
        return;
      }

      setHasUnreadBelow(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [isSending, latestMessage, scrollToBottom]);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  function handleMessageScroll() {
    const container = messageListRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const atBottom = distanceFromBottom < 72;
    stickToBottomRef.current = atBottom;
    if (atBottom) setHasUnreadBelow(false);
  }

  function startVoiceInput() {
    setComposerNotice(null);

    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const speechWindow = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Constructor = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    if (!Constructor) {
      setComposerNotice(t("aiNavigator.voiceUnsupported"));
      return;
    }

    const recognition = new Constructor();
    const inputBeforeSpeech = input.trim();
    recognition.lang = getSpeechLocale(locale);
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index]?.[0]?.transcript ?? "";
      }
      const joined = [inputBeforeSpeech, transcript.trim()].filter(Boolean).join(" ");
      setInput(joined);
    };
    recognition.onerror = () => {
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };
    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  }

  function changeNavigatorMode(mode: AiNavigatorMode) {
    setComposerNotice(null);
    setNavigatorMode(mode);
  }

  function choosePhoto() {
    setComposerNotice(null);
    fileInputRef.current?.click();
  }

  function handlePhotoSelected(file: File | null) {
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp"] as const;
    if (!allowed.includes(file.type as (typeof allowed)[number])) {
      setComposerNotice(t("aiNavigator.photoUnsupported"));
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setComposerNotice(t("aiNavigator.photoTooLarge"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      setSelectedImage({
        kind: "image",
        name: file.name,
        mimeType: file.type as AiNavigatorImageAttachment["mimeType"],
        dataUrl: reader.result,
      });
      setComposerNotice(null);
    };
    reader.onerror = () => setComposerNotice(t("aiNavigator.photoUnsupported"));
    reader.readAsDataURL(file);
  }

  async function submitComposer() {
    if (isSending) return;
    const currentImage = selectedImage;
    if (!input.trim() && !currentImage) return;
    setComposerNotice(null);
    await sendMessage(undefined, { image: currentImage });
    setSelectedImage(null);
  }

  const placeholder = navigatorMode === "past"
    ? t("aiNavigator.placeholderPast")
    : navigatorMode === "future"
      ? t("aiNavigator.placeholderFuture")
      : t("aiNavigator.placeholder");

  return (
    <aside
      className={className}
      style={{ fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
    >
      <div className={mobileDrawer ? "border-b border-[rgba(0,0,0,0.06)] pb-3 pl-14 pr-4 pt-4" : "border-b border-[rgba(0,0,0,0.06)] px-4 pb-3 pt-4"}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-[#3b6ef8]/10 bg-[#eef2ff] text-[#3b6ef8]">
            <Sparkles size={14} />
          </div>

          <div className="min-w-0">
            <div className="text-[14px] font-bold leading-none text-[#1a1d2e]">
              {navigationT("navigation.aiNavigator")}
            </div>
            <UserSessionMiniStatus className="mt-1" />
          </div>

          <div className="ml-auto flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
            <span className="text-[10px] font-medium text-[#22c55e]">
              {navigationT("navigation.online")}
            </span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl border border-[rgba(59,110,248,0.10)] bg-[#f5f6fb] p-1">
          {MODE_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = navigatorMode === item.mode;
            return (
              <button
                key={item.mode}
                type="button"
                aria-pressed={active}
                onClick={() => changeNavigatorMode(item.mode)}
                title={t(item.labelKey)}
                aria-label={t(item.labelKey)}
                className={active
                  ? "flex min-h-9 items-center justify-center gap-1 rounded-lg border border-[#3b6ef8]/15 bg-white px-2 text-[10px] font-semibold text-[#3b6ef8] shadow-sm transition-all"
                  : "flex min-h-9 items-center justify-center gap-1 rounded-lg border border-transparent px-2 text-[10px] font-medium text-[#727991] transition-colors hover:bg-white hover:text-[#3b6ef8]"}
              >
                <Icon size={14} />
                {mobileDrawer ? <span className="truncate">{t(item.labelKey)}</span> : <span className="sr-only">{t(item.labelKey)}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={messageListRef}
          onScroll={handleMessageScroll}
          className="scrollbar-hide h-full space-y-2.5 overflow-y-auto px-3 py-3"
        >
          {displayMessages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              t={t}
              navigationT={navigationT}
              locale={locale}
              onRetry={(text, requestId, image) => {
                void sendMessage(text, { clientRequestId: requestId, image });
              }}
            />
          ))}
          <div ref={messageEndRef} className="h-px" aria-hidden="true" />
        </div>

        {hasUnreadBelow ? (
          <button
            type="button"
            onClick={() => scrollToBottom("smooth")}
            className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-[#3b6ef8]/15 bg-white px-3 py-1.5 text-[10px] font-semibold text-[#3b6ef8] shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
          >
            <ChevronDown size={12} />
            {t("aiNavigator.newMessages")}
          </button>
        ) : null}
      </div>

      {navigatorMode === "chat" ? (
        <div className="px-3 pb-2">
          <div className="rounded-xl border border-[rgba(0,0,0,0.07)] bg-white p-2 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#b0b4c8]">
              {navigationT("navigation.aiModel")}
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {modelOptions.map((tier) => {
                const isSelected = selectedTier === tier.tierCode;
                return (
                  <button
                    key={tier.tierCode}
                    type="button"
                    onClick={() => setSelectedTier(tier.tierCode)}
                    aria-pressed={isSelected}
                    className={isSelected
                      ? "rounded-lg border border-[#3b6ef8]/25 bg-[#eef2ff] px-2 py-2 text-left shadow-[0_3px_10px_rgba(59,110,248,0.10)] transition-all"
                      : "rounded-lg border border-transparent bg-[#f5f6fb] px-2 py-2 text-left transition-all hover:border-[#3b6ef8]/15 hover:bg-[#eef2ff]"}
                  >
                    <span className={isSelected ? "block text-[11px] font-semibold leading-tight text-[#3b6ef8]" : "block text-[11px] font-semibold leading-tight text-[#2d3047]"}>{`5.6 ${tier.shortLabel}`}</span>
                    <span className={isSelected ? "mt-1 block text-[10px] font-medium leading-tight text-[#6f7fb8]" : "mt-1 block text-[10px] font-medium leading-tight text-[#7a8199]"}>{tier.reasoningEffort === "max" ? "Max" : tier.caption}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <div className="border-t border-[rgba(0,0,0,0.05)] bg-white px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
        {selectedImage?.dataUrl ? (
          <div className="mb-2 flex items-center gap-2 rounded-xl border border-[#3b6ef8]/15 bg-[#f7f9ff] p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selectedImage.dataUrl} alt={selectedImage.name} className="h-11 w-11 rounded-lg object-cover" />
            <span className="min-w-0 flex-1 truncate text-[10.5px] font-medium text-[#4f5670]">{selectedImage.name}</span>
            <button type="button" onClick={() => setSelectedImage(null)} className="flex h-7 w-7 items-center justify-center rounded-lg text-[#7a8199] hover:bg-white hover:text-[#3b6ef8]" aria-label="Remove image"><X size={14} /></button>
          </div>
        ) : null}

        {composerNotice ? <div className="mb-2 rounded-lg bg-[#fff7ed] px-2.5 py-1.5 text-[10px] leading-relaxed text-[#9a5b16]">{composerNotice}</div> : null}

        <div className="flex items-end gap-1.5 rounded-2xl border border-[rgba(0,0,0,0.08)] bg-[#f5f6fb] p-1.5 transition-all focus-within:border-[#3b6ef8]/40 focus-within:bg-white">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => {
              handlePhotoSelected(event.target.files?.[0] ?? null);
              event.currentTarget.value = "";
            }}
          />
          <button
            type="button"
            onClick={choosePhoto}
            aria-label="Attach photo"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-[#6f7690] transition-colors hover:bg-[#eef2ff] hover:text-[#3b6ef8]"
          >
            <ImagePlus size={17} />
          </button>
          <button
            type="button"
            onClick={startVoiceInput}
            aria-pressed={isListening}
            aria-label="Voice input"
            className={isListening
              ? "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#eef2ff] text-[#3b6ef8] shadow-inner"
              : "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-[#6f7690] transition-colors hover:bg-[#eef2ff] hover:text-[#3b6ef8]"}
          >
            <Mic size={17} />
          </button>
          <textarea
            rows={1}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void submitComposer();
              }
            }}
            placeholder={placeholder}
            className="max-h-28 min-h-9 flex-1 resize-none bg-transparent px-1 py-2 text-[12.5px] leading-5 text-[#1a1d2e] placeholder-[#aeb3c3] focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void submitComposer()}
            disabled={isSending || (!input.trim() && !selectedImage)}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#3b6ef8] text-white shadow-[0_4px_12px_rgba(59,110,248,0.22)] transition-colors hover:bg-[#2c5df0] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send size={14} />
            <span className="sr-only">{t("aiNavigator.send")}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

