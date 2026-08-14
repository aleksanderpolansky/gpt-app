export const AI_A3_P5C_EXPLICIT_TEMPORAL_MODE_CONTRACT =
  "AI_A3_P5C_EXPLICIT_TEMPORAL_MODE_V1" as const;

export type QuickCaptureTemporalMode = "past" | "future";

const CLOCK_RE = /(?:^|[^\d])(?:[01]?\d|2[0-3])[:.]\d{2}(?=$|[^\d])/u;
const DATE_RE = /(?:^|[^\d])(?:20\d{2}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}(?:[-/.]\d{2,4})?)(?=$|[^\d])/u;
const RELATIVE_DATE_RE = /(?:^|[^\p{L}])(?:сегодня|завтра|послезавтра|вчера|позавчера|сьогодні|післязавтра|вчора|позавчора|dziś|dzisiaj|jutro|pojutrze|wczoraj|przedwczoraj|today|tomorrow|yesterday|heute|morgen|übermorgen|uebermorgen|gestern|vorgestern|hoy|mañana|manana|ayer|anteayer|dnes|zítra|zitra|pozítří|pozitri|včera|vcera|předevčírem|predevcirem)(?=$|[^\p{L}])/iu;

export function normalizeQuickCaptureTemporalMode(
  value: unknown,
): QuickCaptureTemporalMode | null {
  return value === "past" || value === "future" ? value : null;
}

export function hasExplicitQuickCaptureTemporalEvidence(value: string) {
  const normalized = value.normalize("NFKC");
  return CLOCK_RE.test(normalized) || DATE_RE.test(normalized) || RELATIVE_DATE_RE.test(normalized);
}

function parseInstant(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function assertQuickCaptureTemporalModeConsistency(input: {
  mode: QuickCaptureTemporalMode;
  explicitTemporalEvidence: boolean;
  reportedAtIso: string;
  reportedDateKey: string;
  startedAtIso?: string | null;
  focusDate?: string | null;
  toleranceMs?: number;
}) {
  if (!input.explicitTemporalEvidence) return;

  const reportedAt = parseInstant(input.reportedAtIso);
  if (!reportedAt) {
    throw new Error("P5C_TEMPORAL_MODE_REPORTED_AT_INVALID");
  }

  const toleranceMs = Number.isFinite(input.toleranceMs)
    ? Math.max(0, Number(input.toleranceMs))
    : 30_000;
  const startedAt = parseInstant(input.startedAtIso);

  if (
    input.mode === "past" &&
    startedAt &&
    startedAt.getTime() > reportedAt.getTime() + toleranceMs
  ) {
    throw new Error("P5C_TEMPORAL_MODE_CONFLICT_FUTURE_TIME_FOR_ACTUAL");
  }

  if (
    input.mode === "future" &&
    startedAt &&
    startedAt.getTime() < reportedAt.getTime() - toleranceMs
  ) {
    throw new Error("P5C_TEMPORAL_MODE_CONFLICT_PAST_TIME_FOR_PLANNED");
  }

  const focusDate = input.focusDate?.trim() || "";
  const reportedDateKey = input.reportedDateKey.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(focusDate) || !/^\d{4}-\d{2}-\d{2}$/u.test(reportedDateKey)) {
    return;
  }

  if (input.mode === "past" && focusDate > reportedDateKey) {
    throw new Error("P5C_TEMPORAL_MODE_CONFLICT_FUTURE_DATE_FOR_ACTUAL");
  }

  if (input.mode === "future" && focusDate < reportedDateKey) {
    throw new Error("P5C_TEMPORAL_MODE_CONFLICT_PAST_DATE_FOR_PLANNED");
  }
}
