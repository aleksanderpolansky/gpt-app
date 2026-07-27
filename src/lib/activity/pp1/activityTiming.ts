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

const DATE_ISO_PATTERN = /\b(20\d{2})-(\d{2})-(\d{2})\b/g;
const DATE_DMY_PATTERN = /\b(\d{1,2})[./-](\d{1,2})(?:[./-](20\d{2}))?\b/g;

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

function extractDateKeys(rawText: string, now: Date) {
  const keys: string[] = [];
  const lower = rawText.toLowerCase();

  if (includesAny(lower, ["послезавтра", "післязавтра", "pojutrze", "day after tomorrow", "übermorgen", "pasado mañana", "pozítří"])) {
    keys.push(toDateKeyPp1(addDays(now, 2)));
  } else if (includesAny(lower, ["завтра", "завтра", "jutro", "tomorrow", "morgen", "mañana", "zítra"])) {
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
    const year = match[3] ? Number(match[3]) : now.getFullYear();
    const key = validDateKey(year, Number(match[2]), Number(match[1]));

    if (key) {
      keys.push(key);
    }
  }

  return Array.from(new Set(keys));
}

function extractClock(rawText: string) {
  const lower = rawText.toLowerCase();
  const match = lower.match(/(?:^|\s)(?:в|о|o|at|um|a las|às)?\s*(\d{1,2})[:.](\d{2})(?:\s|$)/i);

  if (match) {
    const hour = Number(match[1]);
    const minute = Number(match[2]);

    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return { hour, minute };
    }
  }

  const hourOnly = lower.match(/(?:^|\s)(?:в|о|o|at|um)\s+(\d{1,2})(?:\s|$)/i);

  if (hourOnly) {
    const hour = Number(hourOnly[1]);

    if (hour >= 0 && hour <= 23) {
      return { hour, minute: 0 };
    }
  }

  return null;
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

function isDeadlineText(rawText: string) {
  const lower = rawText.toLowerCase();

  return includesAny(lower, [
    "дедлайн",
    "крайний срок",
    "до ",
    "не позднее",
    "термін",
    "до ",
    "deadline",
    "by ",
    "frist",
    "spätestens",
    "hasta ",
    "nejpozději",
  ]);
}

function hasRangeText(rawText: string) {
  const lower = rawText.toLowerCase();

  return includesAny(lower, [" с ", " по ", "від ", " до ", "from ", " to ", "od ", " do ", "von ", " bis ", "de ", " a "]);
}

function composeLocalDateTime(dateKey: string, clock: { hour: number; minute: number }) {
  return `${dateKey}T${pad2(clock.hour)}:${pad2(clock.minute)}`;
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

export function inferActivityTimingDraftPp1(
  rawText: string,
  temporalDirection: ActivityTemporalDirectionPp1,
  now = new Date(),
): ActivityTimingDraftPp1 {
  const draft = emptyActivityTimingDraftPp1();
  const dateKeys = extractDateKeys(rawText, now);
  const clock = extractClock(rawText);
  const relativeStart = extractRelativeStart(rawText, now);
  const durationMinutes = extractDurationMinutes(rawText);

  draft.durationMinutes = durationMinutes ? String(durationMinutes) : "";
  draft.observedDate = dateKeys[0] ?? "";

  if (temporalDirection === "past") {
    if (relativeStart) {
      draft.startedAtLocal = toDatetimeLocalPp1(relativeStart);
    } else if (dateKeys[0] && clock) {
      draft.startedAtLocal = composeLocalDateTime(dateKeys[0], clock);
    }

    return draft;
  }

  if (relativeStart) {
    draft.scheduleModeCode = "exact";
    draft.startedAtLocal = toDatetimeLocalPp1(relativeStart);
    return draft;
  }

  if (dateKeys.length >= 2 && hasRangeText(rawText)) {
    draft.scheduleModeCode = "date_range";
    draft.scheduleStartDate = dateKeys[0];
    draft.scheduleEndDate = dateKeys[1];
    return draft;
  }

  if (isDeadlineText(rawText)) {
    draft.scheduleModeCode = "deadline";

    if (dateKeys[0] && clock) {
      draft.deadlineLocal = composeLocalDateTime(dateKeys[0], clock);
    }

    return draft;
  }

  if (dateKeys[0] && clock) {
    draft.scheduleModeCode = "exact";
    draft.startedAtLocal = composeLocalDateTime(dateKeys[0], clock);
    return draft;
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
  const durationMinutes = parsePositiveDurationMinutesPp1(draft.durationMinutes);

  if (draft.durationMinutes.trim() && durationMinutes === null) {
    errors.push("duration_invalid");
  }

  const startedAt = datetimeLocalToIsoPp1(draft.startedAtLocal);
  const endedAt = datetimeLocalToIsoPp1(draft.endedAtLocal);

  if (draft.startedAtLocal.trim() && !startedAt) {
    errors.push("start_invalid");
  }

  if (draft.endedAtLocal.trim() && !endedAt) {
    errors.push("end_invalid");
  }

  if (startedAt && endedAt && new Date(endedAt).getTime() < new Date(startedAt).getTime()) {
    errors.push("time_order_invalid");
  }

  if (temporalDirection === "past") {
    if (endedAt && !startedAt) {
      errors.push("actual_end_requires_start");
    }

    return { ok: errors.length === 0, errors };
  }

  switch (draft.scheduleModeCode) {
    case "unscheduled":
      break;
    case "date_only":
      if (!draft.scheduledDate) {
        errors.push("scheduled_date_required");
      }
      break;
    case "date_range":
      if (!draft.scheduleStartDate || !draft.scheduleEndDate) {
        errors.push("date_range_required");
      } else if (draft.scheduleEndDate < draft.scheduleStartDate) {
        errors.push("date_range_order_invalid");
      }
      break;
    case "deadline":
      if (!datetimeLocalToIsoPp1(draft.deadlineLocal)) {
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
