export type MutualLinkMetricValue = number | string | boolean | null;

export type MutualLinkValueObject = {
  id: string;
  title: string;
  canonicalKey: string | null;
  scopeCode: string | null;
  ontologyNodeRoleCode: string | null;
  nodeRoleCode: string | null;
  branchTypeCode: string | null;
  objectKind: string | null;
  parentValueObjectId: string | null;
  linkTypes: string[];
};

export type MutualLinkFactProjection = {
  factId: string;
  measureId: string | null;
  activityEventId: string;
  valueObjectId: string | null;
  measureType: string | null;
  metricValue: MutualLinkMetricValue;
  unit: string | null;
  factStatus: string | null;
  isUserConfirmed: boolean | null;
  sourceType: string | null;
  confidence: number | null;
  createdAt: string | null;
};

export type MutualLinkFact = {
  measureKey: string;
  measureId: string | null;
  activityEventId: string;
  projectionFactIds: string[];
  valueObjectIds: string[];
  measureType: string | null;
  metricValue: MutualLinkMetricValue;
  unit: string | null;
  factStatus: string | null;
  isUserConfirmed: boolean | null;
  sourceType: string | null;
  confidence: number | null;
  createdAt: string | null;
};

export type MutualLinkActivity = {
  activityEventId: string;
  title: string | null;
  status: string | null;
  activityRoleCode: string | null;
  temporalDirection: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationMinutes: number | null;
  observedDate: string | null;
  scheduledDate: string | null;
  createdAt: string | null;
  valueObjects: MutualLinkValueObject[];
  facts: MutualLinkFact[];
};

export type MutualLinksApiResponse = {
  ok?: boolean;
  activities?: MutualLinkActivity[];
  count?: number;
  errorCode?: string;
  errorMessage?: string;
};

export function groupMutualFactProjections(
  projections: MutualLinkFactProjection[],
): MutualLinkFact[] {
  const grouped = new Map<string, MutualLinkFact>();

  for (const projection of projections) {
    const measureKey = projection.measureId
      ? `measure:${projection.measureId}`
      : `legacy-fact:${projection.factId}`;

    const current = grouped.get(measureKey);

    if (!current) {
      grouped.set(measureKey, {
        measureKey,
        measureId: projection.measureId,
        activityEventId: projection.activityEventId,
        projectionFactIds: [projection.factId],
        valueObjectIds: projection.valueObjectId ? [projection.valueObjectId] : [],
        measureType: projection.measureType,
        metricValue: projection.metricValue,
        unit: projection.unit,
        factStatus: projection.factStatus,
        isUserConfirmed: projection.isUserConfirmed,
        sourceType: projection.sourceType,
        confidence: projection.confidence,
        createdAt: projection.createdAt,
      });
      continue;
    }

    if (!current.projectionFactIds.includes(projection.factId)) {
      current.projectionFactIds.push(projection.factId);
    }

    if (
      projection.valueObjectId &&
      !current.valueObjectIds.includes(projection.valueObjectId)
    ) {
      current.valueObjectIds.push(projection.valueObjectId);
    }

    if (projection.factStatus === "confirmed") {
      current.factStatus = "confirmed";
    }

    if (projection.isUserConfirmed === true) {
      current.isUserConfirmed = true;
    }

    if (
      typeof projection.confidence === "number" &&
      (current.confidence === null || projection.confidence > current.confidence)
    ) {
      current.confidence = projection.confidence;
    }

    if (
      projection.createdAt &&
      (!current.createdAt || projection.createdAt > current.createdAt)
    ) {
      current.createdAt = projection.createdAt;
    }
  }

  return Array.from(grouped.values()).sort((left, right) =>
    String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? "")),
  );
}

export function formatMutualMetricValue(value: MutualLinkMetricValue) {
  if (value === null) return "—";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}
