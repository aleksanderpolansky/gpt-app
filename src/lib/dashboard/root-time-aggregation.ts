export type RootTimeDurationFact = {
  readonly activityEventId: string;
  readonly valueObjectId: string;
  readonly valueNumeric: number;
  readonly unit: string;
};

export type RootTimeBucket = {
  readonly rootValueObjectId: string;
  readonly valueMinutes: number;
  readonly activityCount: number;
  readonly factProjectionCount: number;
};

export type RootTimeAggregation = {
  readonly roots: RootTimeBucket[];
  readonly totalSemanticMinutes: number;
  readonly uniqueActivityMinutes: number;
  readonly overlapDetected: boolean;
  readonly skippedFacts: number;
};

function roundHundredths(value: number): number {
  return Math.round(value * 100) / 100;
}

export function canonicalDurationMinutes(
  valueNumeric: number,
  unit: string,
): number | null {
  if (!Number.isFinite(valueNumeric) || valueNumeric < 0) return null;

  const normalizedUnit = unit.trim().toLowerCase();
  if (normalizedUnit === "minute") return valueNumeric;
  if (normalizedUnit === "hour") return valueNumeric * 60;
  return null;
}

export function aggregateRootTime(input: {
  readonly facts: readonly RootTimeDurationFact[];
  readonly leafToRoot: ReadonlyMap<string, string>;
  readonly eventDurationMinutes: ReadonlyMap<string, number>;
}): RootTimeAggregation {
  const activityRoot = new Map<
    string,
    {
      rootValueObjectId: string;
      activityEventId: string;
      valueMinutes: number;
      factProjectionCount: number;
    }
  >();
  const uniqueActivityMinutes = new Map<string, number>();
  let skippedFacts = 0;

  for (const fact of input.facts) {
    const rootValueObjectId = input.leafToRoot.get(fact.valueObjectId);
    if (!rootValueObjectId) {
      skippedFacts += 1;
      continue;
    }

    const fallbackMinutes = canonicalDurationMinutes(
      fact.valueNumeric,
      fact.unit,
    );
    const canonicalEventMinutes = input.eventDurationMinutes.get(
      fact.activityEventId,
    );
    const valueMinutes =
      canonicalEventMinutes !== undefined &&
      Number.isFinite(canonicalEventMinutes) &&
      canonicalEventMinutes >= 0
        ? canonicalEventMinutes
        : fallbackMinutes;

    if (valueMinutes === null || valueMinutes < 0) {
      skippedFacts += 1;
      continue;
    }

    const activityRootKey = `${fact.activityEventId}:${rootValueObjectId}`;
    const current = activityRoot.get(activityRootKey);

    if (current) {
      activityRoot.set(activityRootKey, {
        ...current,
        valueMinutes: Math.max(current.valueMinutes, valueMinutes),
        factProjectionCount: current.factProjectionCount + 1,
      });
    } else {
      activityRoot.set(activityRootKey, {
        rootValueObjectId,
        activityEventId: fact.activityEventId,
        valueMinutes,
        factProjectionCount: 1,
      });
    }

    const previousUnique = uniqueActivityMinutes.get(fact.activityEventId);
    uniqueActivityMinutes.set(
      fact.activityEventId,
      previousUnique === undefined
        ? valueMinutes
        : Math.max(previousUnique, valueMinutes),
    );
  }

  const rootBuckets = new Map<string, RootTimeBucket>();
  for (const projection of activityRoot.values()) {
    const current = rootBuckets.get(projection.rootValueObjectId);
    rootBuckets.set(projection.rootValueObjectId, {
      rootValueObjectId: projection.rootValueObjectId,
      valueMinutes:
        (current?.valueMinutes ?? 0) + projection.valueMinutes,
      activityCount: (current?.activityCount ?? 0) + 1,
      factProjectionCount:
        (current?.factProjectionCount ?? 0) +
        projection.factProjectionCount,
    });
  }

  const roots = Array.from(rootBuckets.values())
    .map((row) => ({
      ...row,
      valueMinutes: roundHundredths(row.valueMinutes),
    }))
    .sort(
      (left, right) =>
        right.valueMinutes - left.valueMinutes ||
        left.rootValueObjectId.localeCompare(right.rootValueObjectId),
    );

  const totalSemanticMinutes = roundHundredths(
    roots.reduce((sum, row) => sum + row.valueMinutes, 0),
  );
  const uniqueMinutes = roundHundredths(
    Array.from(uniqueActivityMinutes.values()).reduce(
      (sum, value) => sum + value,
      0,
    ),
  );

  return {
    roots,
    totalSemanticMinutes,
    uniqueActivityMinutes: uniqueMinutes,
    overlapDetected: totalSemanticMinutes > uniqueMinutes + 0.01,
    skippedFacts,
  };
}
