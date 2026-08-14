import type { ActivityScheduleModeCodePp1 } from "@/types/activity-model-pp1";

export type ActivityTimingLocalePp1 = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";
export type ActivityTemporalDirectionPp1 = "future" | "past";

export type ActivityTimingDraftPp1 = {
  scheduleModeCode: ActivityScheduleModeCodePp1;
  scheduledDate: string;
  scheduleStartDate: string;
  scheduleEndDate: string;
  deadlineLocal: string;
  startedAtLocal: string;
  endedAtLocal: string;
  durationMinutes: string;
  observedDate: string;
};

export type ActivityTimingValidationPp1 = {
  ok: boolean;
  errors: string[];
};

export const DEFAULT_EXACT_DURATION_MINUTES_PP1 = 15;

const DATE_ISO_PATTERN = /\b(20\d{2})-(\d{2})-(\d{2})\b/g;
const DATE_DMY_PATTERN = /\b(\d{1,2})[./-](\d{1,2})(?:[./-](20\d{2}))?\b/g;
const CLOCK_PATTERN = /(?:^|[^\d])([01]?\d|2[0-3])[:.]([0-5]\d)(?!\d)/g;

const MONTH_ALIASES: Array<{ month: number; values: string[] }> = [
  { month: 1, values: ["января", "январь", "січня", "stycznia", "january", "januar", "enero", "ledna"] },
  { month: 2, values: ["февраля", "февраль", "лютого", "lutego", "february", "februar", "febrero", "února", "unora"] },
  { month: 3, values: ["марта", "март", "березня", "marca", "march", "märz", "maerz", "marzo", "března", "brezna"] },
  { month: 4, values: ["апреля", "апрель", "квітня", "kwietnia", "april", "abril", "dubna"] },
  { month: 5, values: ["мая", "май", "травня", "maja", "may", "mai", "mayo", "května", "kvetna"] },
  { month: 6, values: ["июня", "июнь", "червня", "czerwca", "june", "juni", "junio", "června", "cervna"] },
  { month: 7, values: ["июля", "июль", "липня", "lipca", "july", "juli", "julio", "července", "cervence"] },
  { month: 8, values: ["августа", "август", "серпня", "sierpnia", "august", "agosto", "srpna"] },
  { month: 9, values: ["сентября", "сентябрь", "вересня", "września", "wrzesnia", "september", "septiembre", "září", "zari"] },
  { month: 10, values: ["октября", "октябрь", "жовтня", "października", "pazdziernika", "october", "oktober", "octubre", "října", "rijna"] },
  { month: 11, values: ["ноября", "ноябрь", "листопада", "listopada", "november", "noviembre"] },
  { month: 12, values: ["декабря", "декабрь", "грудня", "grudnia", "december", "dezember", "diciembre", "prosince"] },
];

const MONTH_LOOKUP = new Map<string, number>(
  MONTH_ALIASES.flatMap((entry) => entry.values.map((value) => [value, entry.month] as const)),
);
const MONTH_TOKEN_PATTERN = Array.from(MONTH_LOOKUP.keys())
  .sort((left, right) => right.length - left.length)
  .map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");
const DATE_MONTH_NAME_PATTERN = new RegExp(
  `(?:^|\\s)(\\d{1,2})\\.?\\s+(${MONTH_TOKEN_PATTERN})(?:\\s+(20\\d{2}))?(?=$|\\s|[,.;])`,
  "giu",
);

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function toDateKeyPp1(value: Date) {
  return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
}

export function toDatetimeLocalPp1(value: Date) {
  return `${toDateKeyPp1(value)}T${pad2(value.getHours())}:${pad2(value.getMinutes())}`;
}

export function datetimeLocalToIsoPp1(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function parsePositiveDurationMinutesPp1(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value.replace(",", "."));

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed);
}

function includesAny(value: string, markers: string[]) {
  return markers.some((marker) => value.includes(marker));
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function validDateKey(year: number, month: number, day: number) {
  const value = new Date(year, month - 1, day);

  if (
    value.getFullYear() !== year ||
    value.getMonth() !== month - 1 ||
    value.getDate() !== day
  ) {
    return null;
  }

  return toDateKeyPp1(value);
}

function resolveImplicitYear(
  month: number,
  day: number,
  now: Date,
  temporalDirection: ActivityTemporalDirectionPp1,
) {
  const currentYear = now.getFullYear();
  const currentCandidate = new Date(currentYear, month - 1, day, 12, 0, 0, 0);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);

  if (temporalDirection === "future" && currentCandidate.getTime() < today.getTime()) {
    return currentYear + 1;
  }

  if (temporalDirection === "past" && currentCandidate.getTime() > today.getTime()) {
    return currentYear - 1;
  }

  return currentYear;
}

function extractDateKeys(
  rawText: string,
  now: Date,
  temporalDirection: ActivityTemporalDirectionPp1,
) {
  const keys: string[] = [];
  const lower = rawText.toLowerCase().replace(/\u00a0/g, " ");

  if (includesAny(lower, ["послезавтра", "післязавтра", "pojutrze", "day after tomorrow", "übermorgen", "pasado mañana", "pozítří"])) {
    keys.push(toDateKeyPp1(addDays(now, 2)));
  } else if (includesAny(lower, ["завтра", "jutro", "tomorrow", "morgen", "mañana", "zítra"])) {
    keys.push(toDateKeyPp1(addDays(now, 1)));
  } else if (includesAny(lower, ["сегодня", "сьогодні", "dzisiaj", "dziś", "today", "heute", "hoy", "dnes"])) {
    keys.push(toDateKeyPp1(now));
  } else if (includesAny(lower, ["вчера", "учора", "wczoraj", "yesterday", "gestern", "ayer", "včera"])) {
    keys.push(toDateKeyPp1(addDays(now, -1)));
  }

  for (const match of rawText.matchAll(DATE_ISO_PATTERN)) {
    const key = validDateKey(Number(match[1]), Number(match[2]), Number(match[3]));

    if (key) {
      keys.push(key);
    }
  }

  for (const match of rawText.matchAll(DATE_DMY_PATTERN)) {
    const month = Number(match[2]);
    const day = Number(match[1]);
    const year = match[3]
      ? Number(match[3])
      : resolveImplicitYear(month, day, now, temporalDirection);
    const key = validDateKey(year, month, day);

    if (key) {
      keys.push(key);
    }
  }

  DATE_MONTH_NAME_PATTERN.lastIndex = 0;
  for (const match of lower.matchAll(DATE_MONTH_NAME_PATTERN)) {
    const month = MONTH_LOOKUP.get(match[2]);
    const day = Number(match[1]);

    if (!month) {
      continue;
    }

    const year = match[3]
      ? Number(match[3])
      : resolveImplicitYear(month, day, now, temporalDirection);
    const key = validDateKey(year, month, day);

    if (key) {
      keys.push(key);
    }
  }

  return Array.from(new Set(keys));
}

type ClockMatch = {
  hour: number;
  minute: number;
  index: number;
};

function extractClocks(rawText: string) {
  const values: ClockMatch[] = [];
  CLOCK_PATTERN.lastIndex = 0;

  for (const match of rawText.matchAll(CLOCK_PATTERN)) {
    const hour = Number(match[1]);
    const minute = Number(match[2]);

    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      values.push({ hour, minute, index: match.index ?? 0 });
    }
  }

  return values;
}

function extractRelativeStart(rawText: string, now: Date) {
  const lower = rawText.toLowerCase();
  const minuteMatch = lower.match(/(?:через|за|in)\s+(\d{1,3})\s*(?:минут|мин|хвилин|хв|minute|minutes|minut|minuty|minutos|minuten)/i);

  if (minuteMatch) {
    const minutes = Number(minuteMatch[1]);

    if (Number.isFinite(minutes) && minutes > 0) {
      return new Date(now.getTime() + minutes * 60_000);
    }
  }

  const hourMatch = lower.match(/(?:через|за|in)\s+(\d{1,2})\s*(?:час|часа|часов|годин|hour|hours|godz|hora|horas|stunde|stunden)/i);

  if (hourMatch) {
    const hours = Number(hourMatch[1]);

    if (Number.isFinite(hours) && hours > 0) {
      return new Date(now.getTime() + hours * 60 * 60_000);
    }
  }

  return null;
}

function extractDurationMinutes(rawText: string) {
  const lower = rawText
    .toLowerCase()
    .replace(/(?:через|за|in)\s+\d{1,3}\s*(?:минут|мин|хвилин|хв|minute|minutes|minut|minuty|minutos|minuten)/gi, " ")
    .replace(/(?:через|за|in)\s+\d{1,2}\s*(?:час|часа|часов|годин|hour|hours|godz|hora|horas|stunde|stunden)/gi, " ");

  if (includesAny(lower, ["полчас", "півгод", "pół godz", "pol godz", "half an hour", "half hour", "media hora", "halbe stunde", "půl hod"])) {
    return 30;
  }

  const minuteMatch = lower.match(/(\d{1,4})\s*(?:минут|мин|хвилин|хв|minute|minutes|minut|minuty|minuta|min|minutos|minuten)/i);

  if (minuteMatch) {
    const minutes = Number(minuteMatch[1]);

    return Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : null;
  }

  const hourMatch = lower.match(/(\d{1,3}(?:[.,]\d+)?)\s*(?:час|часа|часов|годин|hour|hours|godz|hora|horas|stunde|stunden)/i);

  if (hourMatch) {
    const hours = Number(hourMatch[1].replace(",", "."));

    return Number.isFinite(hours) && hours > 0 ? Math.round(hours * 60) : null;
  }

  return null;
}

function hasExplicitTimeRange(rawText: string, clocks: ClockMatch[]) {
  if (clocks.length < 2) {
    return false;
  }

  const lower = rawText.toLowerCase();
  const between = lower.slice(clocks[0].index, clocks[1].index + 6);

  return includesAny(between, [" до ", " — ", " – ", "-", " to ", " bis ", " a ", " do ", " по ", " till ", " until "]);
}

function hasDateRangeText(rawText: string) {
  const lower = rawText.toLowerCase();

  return includesAny(lower, [" с ", " по ", "від ", "from ", " to ", "od ", " do ", "von ", " bis ", "de ", " a "]);
}

function isDeadlineText(rawText: string, clocks: ClockMatch[]) {
  const lower = rawText.toLowerCase();

  if (hasExplicitTimeRange(rawText, clocks)) {
    return false;
  }

  if (includesAny(lower, [
    "дедлайн",
    "крайний срок",
    "не позднее",
    "срок до",
    "завершить до",
    "сделать до",
    "крайній термін",
    "не пізніше",
    "deadline",
    "due by",
    "no later than",
    "frist",
    "spätestens",
    "fecha límite",
    "fecha limite",
    "nejpozději",
  ])) {
    return true;
  }

  return /(?:^|\s)(?:до|by|bis|hasta)\s+(?:\d{1,2}[./-]|\d{1,2}\s+[\p{L}])/iu.test(lower);
}

function composeLocalDateTime(dateKey: string, clock: { hour: number; minute: number }) {
  return `${dateKey}T${pad2(clock.hour)}:${pad2(clock.minute)}`;
}

function nextFutureClockDateKeyPp1(now: Date, clock: { hour: number; minute: number }) {
  const target = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    clock.hour,
    clock.minute,
    0,
    0,
  );

  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }

  return toDateKeyPp1(target);
}

function addMinutesToLocal(value: string, minutes: number) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  parsed.setMinutes(parsed.getMinutes() + minutes);
  return toDatetimeLocalPp1(parsed);
}

export function applyExactStartOnlyDefaultPp1(
  draft: ActivityTimingDraftPp1,
): ActivityTimingDraftPp1 {
  if (
    draft.scheduleModeCode !== "exact" ||
    !draft.startedAtLocal.trim() ||
    draft.endedAtLocal.trim() ||
    draft.durationMinutes.trim()
  ) {
    return draft;
  }

  const endedAtLocal = addMinutesToLocal(
    draft.startedAtLocal,
    DEFAULT_EXACT_DURATION_MINUTES_PP1,
  );

  if (!endedAtLocal) {
    return draft;
  }

  return {
    ...draft,
    endedAtLocal,
    durationMinutes: String(DEFAULT_EXACT_DURATION_MINUTES_PP1),
  };
}

function durationBetweenLocal(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }

  const minutes = Math.round((endDate.getTime() - startDate.getTime()) / 60_000);
  return minutes > 0 ? minutes : null;
}

export function emptyActivityTimingDraftPp1(): ActivityTimingDraftPp1 {
  return {
    scheduleModeCode: "unscheduled",
    scheduledDate: "",
    scheduleStartDate: "",
    scheduleEndDate: "",
    deadlineLocal: "",
    startedAtLocal: "",
    endedAtLocal: "",
    durationMinutes: "",
    observedDate: "",
  };
}

export function mergeActivityTimingDraftPp1(
  base: ActivityTimingDraftPp1,
  candidate: Partial<ActivityTimingDraftPp1> | null | undefined,
) {
  if (!candidate) {
    return base;
  }

  const next: ActivityTimingDraftPp1 = { ...base };
  const mode = candidate.scheduleModeCode;

  if (
    mode === "unscheduled" ||
    mode === "date_only" ||
    mode === "date_range" ||
    mode === "deadline" ||
    mode === "exact"
  ) {
    next.scheduleModeCode = mode;
  }

  for (const key of [
    "scheduledDate",
    "scheduleStartDate",
    "scheduleEndDate",
    "deadlineLocal",
    "startedAtLocal",
    "endedAtLocal",
    "durationMinutes",
    "observedDate",
  ] as const) {
    const value = candidate[key];

    if (typeof value === "string" && value.trim()) {
      next[key] = value.trim();
    }
  }

  return applyExactStartOnlyDefaultPp1(next);
}

export function inferActivityTimingDraftPp1(
  rawText: string,
  temporalDirection: ActivityTemporalDirectionPp1,
  now = new Date(),
): ActivityTimingDraftPp1 {
  const draft = emptyActivityTimingDraftPp1();
  const dateKeys = extractDateKeys(rawText, now, temporalDirection);
  const clocks = extractClocks(rawText);
  const relativeStart = extractRelativeStart(rawText, now);
  const explicitDurationMinutes = extractDurationMinutes(rawText);

  draft.durationMinutes = explicitDurationMinutes ? String(explicitDurationMinutes) : "";
  draft.observedDate = dateKeys[0] ?? "";

  if (temporalDirection === "past") {
    if (relativeStart) {
      draft.startedAtLocal = toDatetimeLocalPp1(relativeStart);
    } else if (dateKeys[0] && clocks[0]) {
      draft.startedAtLocal = composeLocalDateTime(dateKeys[0], clocks[0]);
    }

    if (dateKeys[0] && clocks.length >= 2 && hasExplicitTimeRange(rawText, clocks)) {
      draft.startedAtLocal = composeLocalDateTime(dateKeys[0], clocks[0]);
      draft.endedAtLocal = composeLocalDateTime(dateKeys[0], clocks[1]);

      if (new Date(draft.endedAtLocal).getTime() <= new Date(draft.startedAtLocal).getTime()) {
        draft.endedAtLocal = addMinutesToLocal(draft.endedAtLocal, 24 * 60);
      }

      if (!draft.durationMinutes) {
        const duration = durationBetweenLocal(draft.startedAtLocal, draft.endedAtLocal);
        draft.durationMinutes = duration ? String(duration) : "";
      }
    }

    return draft;
  }

  if (relativeStart) {
    draft.scheduleModeCode = "exact";
    draft.startedAtLocal = toDatetimeLocalPp1(relativeStart);

    if (explicitDurationMinutes) {
      draft.endedAtLocal = addMinutesToLocal(draft.startedAtLocal, explicitDurationMinutes);
    }

    return applyExactStartOnlyDefaultPp1(draft);
  }

  if (dateKeys[0] && clocks.length >= 2 && hasExplicitTimeRange(rawText, clocks)) {
    draft.scheduleModeCode = "exact";
    draft.startedAtLocal = composeLocalDateTime(dateKeys[0], clocks[0]);
    draft.endedAtLocal = composeLocalDateTime(dateKeys[0], clocks[1]);

    if (new Date(draft.endedAtLocal).getTime() <= new Date(draft.startedAtLocal).getTime()) {
      draft.endedAtLocal = addMinutesToLocal(draft.endedAtLocal, 24 * 60);
    }

    if (!draft.durationMinutes) {
      const duration = durationBetweenLocal(draft.startedAtLocal, draft.endedAtLocal);
      draft.durationMinutes = duration ? String(duration) : "";
    }

    return draft;
  }

  if (dateKeys.length >= 2 && hasDateRangeText(rawText)) {
    draft.scheduleModeCode = "date_range";
    draft.scheduleStartDate = dateKeys[0];
    draft.scheduleEndDate = dateKeys[1];
    return draft;
  }

  if (isDeadlineText(rawText, clocks)) {
    draft.scheduleModeCode = "deadline";

    if (dateKeys[0]) {
      draft.deadlineLocal = composeLocalDateTime(dateKeys[0], clocks[0] ?? { hour: 23, minute: 59 });
    }

    return draft;
  }

  if (dateKeys[0] && clocks[0]) {
    draft.scheduleModeCode = "exact";
    draft.startedAtLocal = composeLocalDateTime(dateKeys[0], clocks[0]);

    if (explicitDurationMinutes) {
      draft.endedAtLocal = addMinutesToLocal(draft.startedAtLocal, explicitDurationMinutes);
    }

    return applyExactStartOnlyDefaultPp1(draft);
  }

  if (clocks[0]) {
    const dateKey = nextFutureClockDateKeyPp1(now, clocks[0]);
    draft.scheduleModeCode = "exact";
    draft.startedAtLocal = composeLocalDateTime(dateKey, clocks[0]);

    if (explicitDurationMinutes) {
      draft.endedAtLocal = addMinutesToLocal(draft.startedAtLocal, explicitDurationMinutes);
    }

    return applyExactStartOnlyDefaultPp1(draft);
  }

  if (dateKeys[0]) {
    draft.scheduleModeCode = "date_only";
    draft.scheduledDate = dateKeys[0];
  }

  return draft;
}

export function validateActivityTimingDraftPp1(
  draft: ActivityTimingDraftPp1,
  temporalDirection: ActivityTemporalDirectionPp1,
): ActivityTimingValidationPp1 {
  const errors: string[] = [];
  const effectiveDraft =
    temporalDirection === "future"
      ? applyExactStartOnlyDefaultPp1(draft)
      : draft;
  const durationMinutes = parsePositiveDurationMinutesPp1(
    effectiveDraft.durationMinutes,
  );

  if (effectiveDraft.durationMinutes.trim() && durationMinutes === null) {
    errors.push("duration_invalid");
  }

  const startedAt = datetimeLocalToIsoPp1(effectiveDraft.startedAtLocal);
  const endedAt = datetimeLocalToIsoPp1(effectiveDraft.endedAtLocal);

  if (effectiveDraft.startedAtLocal.trim() && !startedAt) {
    errors.push("start_invalid");
  }

  if (effectiveDraft.endedAtLocal.trim() && !endedAt) {
    errors.push("end_invalid");
  }

  if (startedAt && endedAt && new Date(endedAt).getTime() <= new Date(startedAt).getTime()) {
    errors.push("time_order_invalid");
  }

  if (startedAt && endedAt && durationMinutes !== null) {
    const actualDuration = Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60_000);

    if (actualDuration !== durationMinutes) {
      errors.push("end_duration_conflict");
    }
  }

  if (temporalDirection === "past") {
    if (endedAt && !startedAt) {
      errors.push("actual_end_requires_start");
    }

    return { ok: errors.length === 0, errors };
  }

  switch (effectiveDraft.scheduleModeCode) {
    case "unscheduled":
      break;
    case "date_only":
      if (!effectiveDraft.scheduledDate) {
        errors.push("scheduled_date_required");
      }
      break;
    case "date_range":
      if (!effectiveDraft.scheduleStartDate || !effectiveDraft.scheduleEndDate) {
        errors.push("date_range_required");
      } else if (effectiveDraft.scheduleEndDate < effectiveDraft.scheduleStartDate) {
        errors.push("date_range_order_invalid");
      }
      break;
    case "deadline":
      if (!datetimeLocalToIsoPp1(effectiveDraft.deadlineLocal)) {
        errors.push("deadline_required");
      }
      break;
    case "exact":
      if (!startedAt) {
        errors.push("exact_start_required");
      }
      if (!endedAt && durationMinutes === null) {
        errors.push("exact_end_or_duration_required");
      }
      break;
  }

  return { ok: errors.length === 0, errors };
}

export function getTimingFocusDatePp1(
  draft: ActivityTimingDraftPp1,
  temporalDirection: ActivityTemporalDirectionPp1,
) {
  if (temporalDirection === "past") {
    return draft.observedDate || draft.startedAtLocal.slice(0, 10) || null;
  }

  if (draft.scheduleModeCode === "date_only") {
    return draft.scheduledDate || null;
  }

  if (draft.scheduleModeCode === "date_range") {
    return draft.scheduleStartDate || null;
  }

  if (draft.scheduleModeCode === "deadline") {
    return draft.deadlineLocal.slice(0, 10) || null;
  }

  if (draft.scheduleModeCode === "exact") {
    return draft.startedAtLocal.slice(0, 10) || null;
  }

  return null;
}

export function formatActivityTimingDraftPp1(
  draft: ActivityTimingDraftPp1,
  temporalDirection: ActivityTemporalDirectionPp1,
  locale: ActivityTimingLocalePp1,
) {
  const localeTag: Record<ActivityTimingLocalePp1, string> = {
    en: "en-GB",
    pl: "pl-PL",
    ru: "ru-RU",
    uk: "uk-UA",
    de: "de-DE",
    es: "es-ES",
    cs: "cs-CZ",
  };
  const tag = localeTag[locale];
  const words: Record<ActivityTimingLocalePp1, {
    noExactTime: string;
    unscheduled: string;
    deadline: string;
  }> = {
    en: { noExactTime: "No exact time", unscheduled: "Unscheduled", deadline: "Deadline" },
    pl: { noExactTime: "Bez dokładnego czasu", unscheduled: "Bez terminu", deadline: "Termin" },
    ru: { noExactTime: "Без точного времени", unscheduled: "Без даты", deadline: "Срок" },
    uk: { noExactTime: "Без точного часу", unscheduled: "Без дати", deadline: "Строк" },
    de: { noExactTime: "Keine genaue Zeit", unscheduled: "Ohne Termin", deadline: "Frist" },
    es: { noExactTime: "Sin hora exacta", unscheduled: "Sin fecha", deadline: "Fecha límite" },
    cs: { noExactTime: "Bez přesného času", unscheduled: "Bez termínu", deadline: "Termín" },
  };
  const copy = words[locale];
  const duration = parsePositiveDurationMinutesPp1(draft.durationMinutes);
  const durationSuffix = duration ? ` · ${duration} min` : "";

  const formatDate = (value: string) => {
    if (!value) {
      return "—";
    }

    const parsed = new Date(`${value}T12:00:00`);

    return Number.isNaN(parsed.getTime())
      ? value
      : new Intl.DateTimeFormat(tag, { dateStyle: "medium" }).format(parsed);
  };

  const formatDateTime = (value: string) => {
    if (!value) {
      return "—";
    }

    const parsed = new Date(value);

    return Number.isNaN(parsed.getTime())
      ? value
      : new Intl.DateTimeFormat(tag, { dateStyle: "medium", timeStyle: "short" }).format(parsed);
  };

  if (temporalDirection === "past") {
    const start = draft.startedAtLocal ? formatDateTime(draft.startedAtLocal) : null;
    const observed = draft.observedDate ? formatDate(draft.observedDate) : null;

    return `${start ?? observed ?? copy.noExactTime}${durationSuffix}`;
  }

  switch (draft.scheduleModeCode) {
    case "unscheduled":
      return `${copy.unscheduled}${durationSuffix}`;
    case "date_only":
      return `${formatDate(draft.scheduledDate)}${durationSuffix}`;
    case "date_range":
      return `${formatDate(draft.scheduleStartDate)} – ${formatDate(draft.scheduleEndDate)}${durationSuffix}`;
    case "deadline":
      return `${copy.deadline}: ${formatDateTime(draft.deadlineLocal)}${durationSuffix}`;
    case "exact": {
      const start = formatDateTime(draft.startedAtLocal);
      const end = draft.endedAtLocal ? ` – ${formatDateTime(draft.endedAtLocal)}` : "";
      return `${start}${end}${durationSuffix}`;
    }
  }
}
