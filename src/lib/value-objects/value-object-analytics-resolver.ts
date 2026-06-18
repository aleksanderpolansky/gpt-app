import type { ValueObjectTargetStandard } from "@/types/value-object-standards";
import type {
  ValueObjectAnalyticsDemoScenario,
  ValueObjectAnalyticsInputFact,
  ValueObjectAnalyticsPeriodWindow,
  ValueObjectAnalyticsResolverInput,
  ValueObjectAnalyticsResolverResult,
  ValueObjectAnalyticsResolutionStatus,
} from "@/types/value-object-analytics";

const RESOLVER_MARKER = "value-object-analytics-resolver-v0-step62" as const;

function toFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number") {
    return null;
  }

  if (!Number.isFinite(value)) {
    return null;
  }

  return value;
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function normalizeStatus(status: ValueObjectAnalyticsInputFact["status"]): string {
  return status ?? "accepted";
}

function isCountableFact(fact: ValueObjectAnalyticsInputFact): boolean {
  const status = normalizeStatus(fact.status);

  return status === "accepted" || status === "edited" || status === "derived";
}

function isInsidePeriodWindow(
  fact: ValueObjectAnalyticsInputFact,
  periodWindow: ValueObjectAnalyticsPeriodWindow | undefined,
): boolean {
  if (!periodWindow?.startsAt && !periodWindow?.endsAt) {
    return true;
  }

  if (!fact.occurredAt) {
    return true;
  }

  const factTime = Date.parse(fact.occurredAt);

  if (!Number.isFinite(factTime)) {
    return true;
  }

  if (periodWindow.startsAt) {
    const startTime = Date.parse(periodWindow.startsAt);

    if (Number.isFinite(startTime) && factTime < startTime) {
      return false;
    }
  }

  if (periodWindow.endsAt) {
    const endTime = Date.parse(periodWindow.endsAt);

    if (Number.isFinite(endTime) && factTime >= endTime) {
      return false;
    }
  }

  return true;
}

function collectSourceActivityIds(
  facts: readonly ValueObjectAnalyticsInputFact[],
): readonly string[] {
  const uniqueIds = new Set<string>();

  for (const fact of facts) {
    if (fact.activityId) {
      uniqueIds.add(fact.activityId);
    }
  }

  return [...uniqueIds].sort();
}

function resolveTargetMin(standard: ValueObjectTargetStandard): number | null {
  const explicitMin = toFiniteNumber(standard.targetMin);

  if (explicitMin !== null) {
    return explicitMin;
  }

  const ruleType = String(standard.ruleType);
  const targetValue = toFiniteNumber(standard.targetValue);

  if (
    targetValue !== null &&
    (ruleType.includes("minimum") ||
      ruleType.includes("min") ||
      ruleType.includes("range"))
  ) {
    return targetValue;
  }

  return null;
}

function resolveTargetMax(standard: ValueObjectTargetStandard): number | null {
  const explicitMax = toFiniteNumber(standard.targetMax);

  if (explicitMax !== null) {
    return explicitMax;
  }

  const ruleType = String(standard.ruleType);
  const targetValue = toFiniteNumber(standard.targetValue);

  if (
    targetValue !== null &&
    (ruleType.includes("maximum") ||
      ruleType.includes("max") ||
      ruleType.includes("range"))
  ) {
    return targetValue;
  }

  return null;
}

function resolvePrimaryTargetValue(standard: ValueObjectTargetStandard): number | null {
  const targetValue = toFiniteNumber(standard.targetValue);

  if (targetValue !== null) {
    return targetValue;
  }

  const targetMin = toFiniteNumber(standard.targetMin);

  if (targetMin !== null) {
    return targetMin;
  }

  return toFiniteNumber(standard.targetMax);
}

function resolveProgressPercent(
  actualValue: number,
  targetValue: number | null,
  targetMin: number | null,
  targetMax: number | null,
): number | null {
  const progressTarget = targetValue ?? targetMin ?? targetMax;

  if (progressTarget === null || progressTarget <= 0) {
    return null;
  }

  return roundToOneDecimal((actualValue / progressTarget) * 100);
}

function resolveStatusAndDelta(params: {
  readonly actualValue: number;
  readonly targetValue: number | null;
  readonly targetMin: number | null;
  readonly targetMax: number | null;
  readonly factCount: number;
  readonly ruleType: string;
}): {
  readonly status: ValueObjectAnalyticsResolutionStatus;
  readonly delta: number | null;
} {
  const { actualValue, targetValue, targetMin, targetMax, factCount, ruleType } = params;

  if (factCount === 0) {
    return {
      status: "no_data",
      delta: targetMin ?? targetValue ?? null,
    };
  }

  if (targetMin !== null && targetMax !== null) {
    if (actualValue < targetMin) {
      return {
        status: "below_target",
        delta: roundToOneDecimal(actualValue - targetMin),
      };
    }

    if (actualValue > targetMax) {
      return {
        status: "over_target",
        delta: roundToOneDecimal(targetMax - actualValue),
      };
    }

    return {
      status: "on_track",
      delta: 0,
    };
  }

  if (
    targetMin !== null ||
    ruleType.includes("minimum") ||
    ruleType.includes("min")
  ) {
    const comparisonTarget = targetMin ?? targetValue;

    if (comparisonTarget === null) {
      return {
        status: "on_track",
        delta: null,
      };
    }

    const delta = roundToOneDecimal(actualValue - comparisonTarget);

    return {
      status: delta < 0 ? "below_target" : "on_track",
      delta,
    };
  }

  if (
    targetMax !== null ||
    ruleType.includes("maximum") ||
    ruleType.includes("max")
  ) {
    const comparisonTarget = targetMax ?? targetValue;

    if (comparisonTarget === null) {
      return {
        status: "on_track",
        delta: null,
      };
    }

    const delta = roundToOneDecimal(comparisonTarget - actualValue);

    return {
      status: delta < 0 ? "over_target" : "on_track",
      delta,
    };
  }

  if (targetValue !== null) {
    const delta = roundToOneDecimal(actualValue - targetValue);

    return {
      status: delta < 0 ? "below_target" : "on_track",
      delta,
    };
  }

  return {
    status: "on_track",
    delta: null,
  };
}

function buildRecommendationCopy(params: {
  readonly actualValue: number;
  readonly targetValue: number | null;
  readonly targetMin: number | null;
  readonly targetMax: number | null;
  readonly delta: number | null;
  readonly status: ValueObjectAnalyticsResolutionStatus;
  readonly unit: string;
}): string {
  const { actualValue, targetValue, targetMin, targetMax, delta, status, unit } = params;
  const displayTarget = targetValue ?? targetMin ?? targetMax;

  if (status === "no_data") {
    return "Пока нет принятых фактов за выбранный период. Это только аналитический сигнал, не оценка личности.";
  }

  if (status === "below_target" && delta !== null) {
    return `Сейчас ${actualValue}/${displayTarget ?? "?"} ${unit}. Для ориентира желательно ещё ${Math.abs(delta)} ${unit}.`;
  }

  if (status === "over_target" && delta !== null) {
    return `Сейчас ${actualValue}/${displayTarget ?? "?"} ${unit}. Есть сигнал превышения ориентира на ${Math.abs(delta)} ${unit}.`;
  }

  if (status === "on_track") {
    return `Сейчас ${actualValue}/${displayTarget ?? actualValue} ${unit}. Ориентир за период выполняется.`;
  }

  return `Сейчас ${actualValue} ${unit}. Система показывает аналитический сигнал по выбранному периоду.`;
}

export function resolveValueObjectAnalytics(
  input: ValueObjectAnalyticsResolverInput,
): ValueObjectAnalyticsResolverResult {
  const standardValueObjectId = String(input.standard.valueObjectId);
  const metricType = String(input.standard.metricType);
  const unit = String(input.standard.unit);
  const period = input.periodWindow?.period ?? String(input.standard.period);
  const ruleType = String(input.standard.ruleType);

  const includedFacts = input.facts.filter((fact) => {
    return (
      fact.valueObjectId === standardValueObjectId &&
      String(fact.metricType) === metricType &&
      String(fact.unit) === unit &&
      isCountableFact(fact) &&
      isInsidePeriodWindow(fact, input.periodWindow)
    );
  });

  const actualValue = roundToOneDecimal(
    includedFacts.reduce((sum, fact) => sum + fact.value, 0),
  );

  const targetValue = resolvePrimaryTargetValue(input.standard);
  const targetMin = resolveTargetMin(input.standard);
  const targetMax = resolveTargetMax(input.standard);
  const progressPercent = resolveProgressPercent(actualValue, targetValue, targetMin, targetMax);

  const statusAndDelta = resolveStatusAndDelta({
    actualValue,
    targetValue,
    targetMin,
    targetMax,
    factCount: includedFacts.length,
    ruleType,
  });

  const sourceFactIds = includedFacts.map((fact) => fact.factId).sort();
  const sourceActivityIds = collectSourceActivityIds(includedFacts);

  return {
    resolverMarker: RESOLVER_MARKER,
    valueObjectId: input.valueObjectId,
    metricType,
    unit,
    period,
    ruleType,
    actualValue,
    targetValue,
    targetMin,
    targetMax,
    progressPercent,
    delta: statusAndDelta.delta,
    status: statusAndDelta.status,
    recommendationCopy: buildRecommendationCopy({
      actualValue,
      targetValue,
      targetMin,
      targetMax,
      delta: statusAndDelta.delta,
      status: statusAndDelta.status,
      unit,
    }),
    sourceFactIds,
    sourceActivityIds,
    factsIncluded: includedFacts.length,
    factsIgnored: input.facts.length - includedFacts.length,
    generatedAt: input.now ?? new Date().toISOString(),
  };
}

export const demoFamilyTimeAnalyticsScenario: ValueObjectAnalyticsDemoScenario = {
  title: "Family Time 30/60 demo",
  standard: {
    valueObjectId: "fixture_vo_family_time",
    metricType: "duration",
    targetValue: 60,
    unit: "minutes",
    period: "day",
    ruleType: "desired_minimum",
    priority: "high",
    source: "user_defined",
    status: "draft",
    label: "Daily family time",
    description: "Demo standard for Step 62 analytics resolver v0.",
  } as ValueObjectTargetStandard,
  facts: [
    {
      factId: "fact_demo_family_time_001",
      activityId: "activity_demo_family_football_001",
      valueObjectId: "fixture_vo_family_time",
      metricType: "duration",
      value: 30,
      unit: "minutes",
      status: "accepted",
      occurredAt: "2026-06-18T17:00:00.000Z",
      source: "demo",
    },
  ],
  expectedActualValue: 30,
  expectedTargetValue: 60,
  expectedDelta: -30,
  expectedStatus: "below_target",
};

export function resolveDemoFamilyTimeAnalytics(): ValueObjectAnalyticsResolverResult {
  return resolveValueObjectAnalytics({
    valueObjectId: "fixture_vo_family_time",
    standard: demoFamilyTimeAnalyticsScenario.standard,
    facts: demoFamilyTimeAnalyticsScenario.facts,
    periodWindow: {
      period: "day",
      startsAt: "2026-06-18T00:00:00.000Z",
      endsAt: "2026-06-19T00:00:00.000Z",
    },
    now: "2026-06-18T18:00:00.000Z",
  });
}
