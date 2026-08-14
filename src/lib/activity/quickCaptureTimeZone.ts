export const QUICK_CAPTURE_TIME_ZONE_CONTRACT = "P5C_QUICK_CAPTURE_TIME_ZONE_V1" as const;

type TimeZoneParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function formatter(timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
}

function partsFor(date: Date, timeZone: string): TimeZoneParts | null {
  try {
    const values = new Map(
      formatter(timeZone)
        .formatToParts(date)
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, Number(part.value)] as const),
    );
    const result = {
      year: values.get("year") ?? Number.NaN,
      month: values.get("month") ?? Number.NaN,
      day: values.get("day") ?? Number.NaN,
      hour: values.get("hour") ?? Number.NaN,
      minute: values.get("minute") ?? Number.NaN,
      second: values.get("second") ?? Number.NaN,
    };
    return Object.values(result).every(Number.isFinite) ? result : null;
  } catch {
    return null;
  }
}

export function wallClockDateForTimeZone(instant: Date, timeZone: string) {
  const parts = partsFor(instant, timeZone);
  if (!parts) return new Date(instant.getTime());
  return new Date(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    0,
  );
}

export function dateKeyInTimeZone(instant: Date, timeZone: string) {
  const parts = partsFor(instant, timeZone);
  if (!parts) {
    const y = instant.getFullYear();
    const m = String(instant.getMonth() + 1).padStart(2, "0");
    const d = String(instant.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function parseLocal(value: string) {
  const match = value.trim().match(/^(20\d{2})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d)$/u);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  };
}

export function datetimeLocalInTimeZoneToIso(value: string, timeZone: string) {
  const local = parseLocal(value);
  if (!local) return null;
  let candidate = Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    local.hour,
    local.minute,
    0,
    0,
  );

  for (let iteration = 0; iteration < 3; iteration += 1) {
    const observed = partsFor(new Date(candidate), timeZone);
    if (!observed) return null;
    const observedAsUtc = Date.UTC(
      observed.year,
      observed.month - 1,
      observed.day,
      observed.hour,
      observed.minute,
      0,
      0,
    );
    const desiredAsUtc = Date.UTC(
      local.year,
      local.month - 1,
      local.day,
      local.hour,
      local.minute,
      0,
      0,
    );
    const delta = desiredAsUtc - observedAsUtc;
    if (delta === 0) return new Date(candidate).toISOString();
    candidate += delta;
  }

  const finalParts = partsFor(new Date(candidate), timeZone);
  if (
    !finalParts ||
    finalParts.year !== local.year ||
    finalParts.month !== local.month ||
    finalParts.day !== local.day ||
    finalParts.hour !== local.hour ||
    finalParts.minute !== local.minute
  ) {
    return null;
  }
  return new Date(candidate).toISOString();
}
