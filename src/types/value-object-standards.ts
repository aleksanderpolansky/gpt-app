export const VALUE_OBJECT_STANDARD_METRIC_TYPES = [
  "duration",
  "volume",
  "count",
  "distance",
  "energy",
  "money",
  "score",
] as const;

export type ValueObjectStandardMetricType =
  (typeof VALUE_OBJECT_STANDARD_METRIC_TYPES)[number];

export const VALUE_OBJECT_STANDARD_UNITS = [
  "minutes",
  "hours",
  "liters",
  "milliliters",
  "steps",
  "repetitions",
  "kilometers",
  "kcal",
  "PLN",
  "EUR",
  "points",
  "score",
] as const;

export type ValueObjectStandardUnit =
  (typeof VALUE_OBJECT_STANDARD_UNITS)[number];

export const VALUE_OBJECT_STANDARD_PERIODS = [
  "day",
  "week",
  "month",
  "quarter",
  "year",
  "rolling_7_days",
  "rolling_30_days",
] as const;

export type ValueObjectStandardPeriod =
  (typeof VALUE_OBJECT_STANDARD_PERIODS)[number];

export const VALUE_OBJECT_STANDARD_RULE_TYPES = [
  "desired_minimum",
  "desired_maximum",
  "desired_range",
  "exact_target",
  "frequency_minimum",
] as const;

export type ValueObjectStandardRuleType =
  (typeof VALUE_OBJECT_STANDARD_RULE_TYPES)[number];

export const VALUE_OBJECT_STANDARD_PRIORITIES = [
  "low",
  "normal",
  "high",
  "critical",
] as const;

export type ValueObjectStandardPriority =
  (typeof VALUE_OBJECT_STANDARD_PRIORITIES)[number];

export const VALUE_OBJECT_STANDARD_SOURCES = [
  "user_defined",
  "system_default",
  "professional_guideline",
  "manual",
  "imported",
] as const;

export type ValueObjectStandardSource =
  (typeof VALUE_OBJECT_STANDARD_SOURCES)[number];

export const VALUE_OBJECT_STANDARD_STATUSES = [
  "draft",
  "active",
  "archived",
] as const;

export type ValueObjectStandardStatus =
  (typeof VALUE_OBJECT_STANDARD_STATUSES)[number];

export type ValueObjectTargetStandard = {
  standardId?: string;
  valueObjectId: string;
  metricType: ValueObjectStandardMetricType;
  targetValue: number;
  targetMin?: number;
  targetMax?: number;
  unit: ValueObjectStandardUnit;
  period: ValueObjectStandardPeriod;
  ruleType: ValueObjectStandardRuleType;
  priority: ValueObjectStandardPriority;
  source: ValueObjectStandardSource;
  status: ValueObjectStandardStatus;
  label?: string;
  description?: string;
  safetyNote?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ValueObjectTargetStandardDraft = Omit<
  ValueObjectTargetStandard,
  "standardId" | "createdAt" | "updatedAt"
>;

export type ValueObjectTargetStandardValidationResult = {
  ok: boolean;
  errors: string[];
};

export const VALUE_OBJECT_TARGET_STANDARD_SAFETY_NOTE =
  "Standards are analytics targets and reference thresholds, not medical diagnosis, legal advice, or guaranteed productivity truth.";

export const VALUE_OBJECT_STANDARD_METRIC_TYPE_LABELS: Record<
  ValueObjectStandardMetricType,
  string
> = {
  duration: "Duration",
  volume: "Volume",
  count: "Count",
  distance: "Distance",
  energy: "Energy",
  money: "Money",
  score: "Score",
};

export const VALUE_OBJECT_STANDARD_UNIT_LABELS: Record<
  ValueObjectStandardUnit,
  string
> = {
  minutes: "minutes",
  hours: "hours",
  liters: "liters",
  milliliters: "milliliters",
  steps: "steps",
  repetitions: "repetitions",
  kilometers: "kilometers",
  kcal: "kcal",
  PLN: "PLN",
  EUR: "EUR",
  points: "points",
  score: "score",
};

export const VALUE_OBJECT_STANDARD_PERIOD_LABELS: Record<
  ValueObjectStandardPeriod,
  string
> = {
  day: "per day",
  week: "per week",
  month: "per month",
  quarter: "per quarter",
  year: "per year",
  rolling_7_days: "per rolling 7 days",
  rolling_30_days: "per rolling 30 days",
};

export const VALUE_OBJECT_STANDARD_RULE_TYPE_LABELS: Record<
  ValueObjectStandardRuleType,
  string
> = {
  desired_minimum: "desired minimum",
  desired_maximum: "desired maximum",
  desired_range: "desired range",
  exact_target: "exact target",
  frequency_minimum: "minimum frequency",
};

function includesLiteral<T extends readonly string[]>(
  values: T,
  value: string
): value is T[number] {
  return (values as readonly string[]).includes(value);
}

export function isValueObjectStandardMetricType(
  value: string
): value is ValueObjectStandardMetricType {
  return includesLiteral(VALUE_OBJECT_STANDARD_METRIC_TYPES, value);
}

export function isValueObjectStandardUnit(
  value: string
): value is ValueObjectStandardUnit {
  return includesLiteral(VALUE_OBJECT_STANDARD_UNITS, value);
}

export function isValueObjectStandardPeriod(
  value: string
): value is ValueObjectStandardPeriod {
  return includesLiteral(VALUE_OBJECT_STANDARD_PERIODS, value);
}

export function isValueObjectStandardRuleType(
  value: string
): value is ValueObjectStandardRuleType {
  return includesLiteral(VALUE_OBJECT_STANDARD_RULE_TYPES, value);
}

export function isValueObjectStandardPriority(
  value: string
): value is ValueObjectStandardPriority {
  return includesLiteral(VALUE_OBJECT_STANDARD_PRIORITIES, value);
}

export function isValueObjectStandardSource(
  value: string
): value is ValueObjectStandardSource {
  return includesLiteral(VALUE_OBJECT_STANDARD_SOURCES, value);
}

export function isValueObjectStandardStatus(
  value: string
): value is ValueObjectStandardStatus {
  return includesLiteral(VALUE_OBJECT_STANDARD_STATUSES, value);
}

function isFiniteNumber(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value);
}

export function validateValueObjectTargetStandard(
  standard: ValueObjectTargetStandard
): ValueObjectTargetStandardValidationResult {
  const errors: string[] = [];

  if (standard.valueObjectId.trim().length === 0) {
    errors.push("valueObjectId is required.");
  }

  if (!Number.isFinite(standard.targetValue)) {
    errors.push("targetValue must be a finite number.");
  }

  if (standard.ruleType === "desired_range") {
    if (!isFiniteNumber(standard.targetMin)) {
      errors.push("targetMin is required for desired_range.");
    }

    if (!isFiniteNumber(standard.targetMax)) {
      errors.push("targetMax is required for desired_range.");
    }

    if (
      isFiniteNumber(standard.targetMin) &&
      isFiniteNumber(standard.targetMax) &&
      standard.targetMin > standard.targetMax
    ) {
      errors.push("targetMin must be less than or equal to targetMax.");
    }
  }

  if (standard.safetyNote && standard.safetyNote.trim().length > 500) {
    errors.push("safetyNote must be 500 characters or shorter.");
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

export function formatValueObjectTargetStandardValue(
  standard: ValueObjectTargetStandard
) {
  const unitLabel = VALUE_OBJECT_STANDARD_UNIT_LABELS[standard.unit];

  if (
    standard.ruleType === "desired_range" &&
    isFiniteNumber(standard.targetMin) &&
    isFiniteNumber(standard.targetMax)
  ) {
    return `${standard.targetMin}–${standard.targetMax} ${unitLabel}`;
  }

  return `${standard.targetValue} ${unitLabel}`;
}

export function formatValueObjectTargetStandardSummary(
  standard: ValueObjectTargetStandard
) {
  const metricLabel =
    VALUE_OBJECT_STANDARD_METRIC_TYPE_LABELS[standard.metricType];
  const ruleLabel = VALUE_OBJECT_STANDARD_RULE_TYPE_LABELS[standard.ruleType];
  const periodLabel = VALUE_OBJECT_STANDARD_PERIOD_LABELS[standard.period];
  const valueLabel = formatValueObjectTargetStandardValue(standard);

  return `${metricLabel}: ${ruleLabel} ${valueLabel} ${periodLabel}`;
}
