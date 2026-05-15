import { NextResponse } from "next/server";
import {
  ACTIVITY_RECORDING_DISABLED_MESSAGE,
  ACTIVITY_RECORDING_ENABLED,
} from "../../../../../lib/activity/activityRecordingConfig";
import { getActivityUserContext } from "../../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type GenericRow = Record<string, unknown>;
type TraceMode = "full" | "summary";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }

  return null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return isPlainObject(value) ? value : {};
}

function getRecordField(row: GenericRow, field: string) {
  return asRecord(row[field]);
}

function getRecordString(
  record: Record<string, unknown>,
  field: string
): string | null {
  return asString(record[field]);
}

function getRecordBoolean(
  record: Record<string, unknown>,
  field: string
): boolean | null {
  return asBoolean(record[field]);
}

function unique(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter((value) => value.length > 0)
    )
  );
}

function parseList(value: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseLimit(value: string | null) {
  if (!value) {
    return DEFAULT_LIMIT;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(parsed, MAX_LIMIT);
}

function parseMode(value: string | null): TraceMode {
  const mode = asString(value)?.toLowerCase();

  if (mode === "summary") {
    return "summary";
  }

  return "full";
}

function getId(row: GenericRow) {
  return asString(row.id);
}

function getStringField(row: GenericRow, field: string) {
  return asString(row[field]);
}

function getNumberField(row: GenericRow, field: string) {
  return asNumber(row[field]);
}

function getBooleanField(row: GenericRow, field: string) {
  return asBoolean(row[field]);
}

function getFirstStringField(row: GenericRow, fields: string[]) {
  for (const field of fields) {
    const value = getStringField(row, field);

    if (value) {
      return value;
    }
  }

  return null;
}

function getFirstNumberField(row: GenericRow, fields: string[]) {
  for (const field of fields) {
    const value = getNumberField(row, field);

    if (value !== null) {
      return value;
    }
  }

  return null;
}

function getDateSortValue(row: GenericRow) {
  const dateValue = getFirstStringField(row, [
    "created_at",
    "received_at",
    "started_at",
    "occurred_at",
    "updated_at",
  ]);

  if (!dateValue) {
    return 0;
  }

  const parsed = Date.parse(dateValue);

  return Number.isFinite(parsed) ? parsed : 0;
}

function getJsonKeys(value: unknown) {
  if (isPlainObject(value)) {
    return Object.keys(value).sort();
  }

  if (Array.isArray(value)) {
    return [`array:${value.length}`];
  }

  if (value === null || value === undefined) {
    return [];
  }

  return [typeof value];
}

function getFieldKeys(row: GenericRow, field: string) {
  return getJsonKeys(row[field]);
}

function getChangedFieldNames(value: unknown) {
  if (Array.isArray(value)) {
    const stringValues = value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => item.length > 0);

    if (stringValues.length > 0) {
      return unique(stringValues);
    }

    const objectKeys = value.flatMap((item) =>
      isPlainObject(item) ? Object.keys(item) : []
    );

    return unique(objectKeys);
  }

  if (isPlainObject(value)) {
    return Object.keys(value).sort();
  }

  return [];
}

function mergeRows(existing: GenericRow[], incoming: GenericRow[]) {
  const byId = new Map<string, GenericRow>();

  for (const row of existing) {
    const id = getId(row);

    if (id) {
      byId.set(id, row);
    }
  }

  for (const row of incoming) {
    const id = getId(row);

    if (id) {
      byId.set(id, row);
    }
  }

  return Array.from(byId.values());
}

function addIdsFromRows(params: {
  rows: GenericRow[];
  eventIds: Set<string>;
  rawSignalIds: Set<string>;
  correctionIds: Set<string>;
  processingRunIds: Set<string>;
}) {
  const { rows, eventIds, rawSignalIds, correctionIds, processingRunIds } =
    params;

  for (const row of rows) {
    const id = getId(row);
    const outputEventId = getStringField(row, "output_event_id");
    const eventId =
      getStringField(row, "event_id") ?? getStringField(row, "activity_event_id");
    const rawSignalId = getStringField(row, "raw_signal_id");
    const correctionId =
      getStringField(row, "activity_correction_id") ??
      getStringField(row, "correction_id");
    const processingRunId = getStringField(row, "processing_run_id");

    const metadata = getRecordField(row, "metadata_json");
    const metadataRawSignalId = getRecordString(metadata, "rawSignalId");
    const metadataOutputEventId =
      getRecordString(metadata, "activityEventId") ??
      getRecordString(metadata, "outputEventId");

    if (id && row.processing_status !== undefined && row.raw_payload !== undefined) {
      rawSignalIds.add(id);
    }

    if (id && row.correction_type !== undefined && row.changed_fields !== undefined) {
      correctionIds.add(id);
    }

    if (outputEventId) {
      eventIds.add(outputEventId);
    }

    if (eventId) {
      eventIds.add(eventId);
    }

    if (rawSignalId) {
      rawSignalIds.add(rawSignalId);
    }

    if (metadataRawSignalId) {
      rawSignalIds.add(metadataRawSignalId);
    }

    if (metadataOutputEventId) {
      eventIds.add(metadataOutputEventId);
    }

    if (correctionId) {
      correctionIds.add(correctionId);
    }

    if (processingRunId) {
      processingRunIds.add(processingRunId);
    }
  }
}

async function fetchUserOwnedByIds(params: {
  table: string;
  userId: string;
  column: string;
  values: string[];
  limit: number;
  orderBy?: string;
  ascending?: boolean;
}) {
  const { table, userId, column, values, limit, orderBy, ascending } = params;

  if (values.length === 0) {
    return [];
  }

  let query = supabase
    .from(table)
    .select("*")
    .eq("user_id", userId)
    .in(column, values)
    .limit(limit);

  if (orderBy) {
    query = query.order(orderBy, { ascending: ascending ?? false });
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }

  return (data as GenericRow[] | null) ?? [];
}

async function fetchByEventIds(params: {
  table: string;
  column?: string;
  eventIds: string[];
  limit: number;
  orderBy?: string;
  ascending?: boolean;
}) {
  const { table, column, eventIds, limit, orderBy, ascending } = params;

  if (eventIds.length === 0) {
    return [];
  }

  let query = supabase
    .from(table)
    .select("*")
    .in(column ?? "event_id", eventIds)
    .limit(limit);

  if (orderBy) {
    query = query.order(orderBy, { ascending: ascending ?? false });
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }

  return (data as GenericRow[] | null) ?? [];
}

async function fetchTrace(params: {
  userId: string;
  eventIds: Set<string>;
  rawSignalIds: Set<string>;
  correctionIds: Set<string>;
  processingRunIds: Set<string>;
  limit: number;
}) {
  const { userId, eventIds, rawSignalIds, correctionIds, processingRunIds, limit } =
    params;

  let activityEvents: GenericRow[] = [];
  let rawActivitySignals: GenericRow[] = [];
  let activityProcessingLogs: GenericRow[] = [];
  let activityCorrections: GenericRow[] = [];
  let impactEvents: GenericRow[] = [];
  let eventLinks: GenericRow[] = [];

  activityEvents = mergeRows(
    activityEvents,
    await fetchUserOwnedByIds({
      table: "activity_events",
      userId,
      column: "id",
      values: Array.from(eventIds),
      limit,
      orderBy: "created_at",
      ascending: false,
    })
  );

  rawActivitySignals = mergeRows(
    rawActivitySignals,
    await fetchUserOwnedByIds({
      table: "raw_activity_signals",
      userId,
      column: "id",
      values: Array.from(rawSignalIds),
      limit,
      orderBy: "created_at",
      ascending: false,
    })
  );

  activityCorrections = mergeRows(
    activityCorrections,
    await fetchUserOwnedByIds({
      table: "activity_corrections",
      userId,
      column: "id",
      values: Array.from(correctionIds),
      limit,
      orderBy: "created_at",
      ascending: false,
    })
  );

  activityProcessingLogs = mergeRows(
    activityProcessingLogs,
    await fetchUserOwnedByIds({
      table: "activity_processing_logs",
      userId,
      column: "processing_run_id",
      values: Array.from(processingRunIds),
      limit,
      orderBy: "created_at",
      ascending: true,
    })
  );

  addIdsFromRows({
    rows: [
      ...activityEvents,
      ...rawActivitySignals,
      ...activityProcessingLogs,
      ...activityCorrections,
    ],
    eventIds,
    rawSignalIds,
    correctionIds,
    processingRunIds,
  });

  rawActivitySignals = mergeRows(
    rawActivitySignals,
    await fetchUserOwnedByIds({
      table: "raw_activity_signals",
      userId,
      column: "output_event_id",
      values: Array.from(eventIds),
      limit,
      orderBy: "created_at",
      ascending: false,
    })
  );

  activityCorrections = mergeRows(
    activityCorrections,
    await fetchUserOwnedByIds({
      table: "activity_corrections",
      userId,
      column: "event_id",
      values: Array.from(eventIds),
      limit,
      orderBy: "created_at",
      ascending: false,
    })
  );

  activityProcessingLogs = mergeRows(
    activityProcessingLogs,
    await fetchUserOwnedByIds({
      table: "activity_processing_logs",
      userId,
      column: "activity_event_id",
      values: Array.from(eventIds),
      limit,
      orderBy: "created_at",
      ascending: true,
    })
  );

  addIdsFromRows({
    rows: [
      ...activityEvents,
      ...rawActivitySignals,
      ...activityProcessingLogs,
      ...activityCorrections,
    ],
    eventIds,
    rawSignalIds,
    correctionIds,
    processingRunIds,
  });

  activityProcessingLogs = mergeRows(
    activityProcessingLogs,
    await fetchUserOwnedByIds({
      table: "activity_processing_logs",
      userId,
      column: "raw_signal_id",
      values: Array.from(rawSignalIds),
      limit,
      orderBy: "created_at",
      ascending: true,
    })
  );

  activityProcessingLogs = mergeRows(
    activityProcessingLogs,
    await fetchUserOwnedByIds({
      table: "activity_processing_logs",
      userId,
      column: "activity_correction_id",
      values: Array.from(correctionIds),
      limit,
      orderBy: "created_at",
      ascending: true,
    })
  );

  addIdsFromRows({
    rows: [
      ...activityEvents,
      ...rawActivitySignals,
      ...activityProcessingLogs,
      ...activityCorrections,
    ],
    eventIds,
    rawSignalIds,
    correctionIds,
    processingRunIds,
  });

  activityEvents = mergeRows(
    activityEvents,
    await fetchUserOwnedByIds({
      table: "activity_events",
      userId,
      column: "id",
      values: Array.from(eventIds),
      limit,
      orderBy: "created_at",
      ascending: false,
    })
  );

  const ownedEventIds = unique(activityEvents.map((row) => getId(row)));

  impactEvents = mergeRows(
    impactEvents,
    await fetchByEventIds({
      table: "impact_events",
      eventIds: ownedEventIds,
      limit,
      orderBy: "created_at",
      ascending: true,
    })
  );

  eventLinks = mergeRows(
    eventLinks,
    await fetchByEventIds({
      table: "event_links",
      eventIds: ownedEventIds,
      limit,
      orderBy: "created_at",
      ascending: true,
    })
  );

  return {
    activityEvents,
    rawActivitySignals,
    activityProcessingLogs,
    activityCorrections,
    impactEvents,
    eventLinks,
  };
}

function extractLifecycleMetadata(row: GenericRow) {
  const metadata = getRecordField(row, "metadata_json");

  return {
    metadataKeys: getJsonKeys(metadata),
    promotion: {
      promotionFlow: getRecordString(metadata, "promotionFlow"),
      promotedAt: getRecordString(metadata, "promotedAt"),
      rawSignalId: getRecordString(metadata, "rawSignalId"),
      rawSignalSourceType: getRecordString(metadata, "rawSignalSourceType"),
      rawSignalSourceEventId: getRecordString(
        metadata,
        "rawSignalSourceEventId"
      ),
      rawSignalIdempotencyKey: getRecordString(
        metadata,
        "rawSignalIdempotencyKey"
      ),
      rawSignalProcessingStatusBeforePromotion: getRecordString(
        metadata,
        "rawSignalProcessingStatusBeforePromotion"
      ),
      activityEventSource: getRecordString(metadata, "activityEventSource"),
      defaultActivityStatus: getRecordString(metadata, "defaultActivityStatus"),
      promotedActivityStatus: getRecordString(
        metadata,
        "promotedActivityStatus"
      ),
      requiresHumanReview: getRecordBoolean(metadata, "requiresHumanReview"),
      noImpactsCreated: getRecordBoolean(metadata, "noImpactsCreated"),
      noDailyAggregatesCreated: getRecordBoolean(
        metadata,
        "noDailyAggregatesCreated"
      ),
      noCurrentSnapshotsCreated: getRecordBoolean(
        metadata,
        "noCurrentSnapshotsCreated"
      ),
      reviewNote: getRecordString(metadata, "reviewNote"),
    },
    confirmation: {
      confirmationFlow: getRecordString(metadata, "confirmationFlow"),
      importedPendingConfirmed: getRecordBoolean(
        metadata,
        "importedPendingConfirmed"
      ),
      importedPendingConfirmedAt: getRecordString(
        metadata,
        "importedPendingConfirmedAt"
      ),
      importedPendingPreviousStatus: getRecordString(
        metadata,
        "importedPendingPreviousStatus"
      ),
      reviewNote: getRecordString(metadata, "reviewNote"),
    },
  };
}

function extractRawSignalPromotionPreview(row: GenericRow) {
  const normalizedPreview = getRecordField(row, "normalized_preview_json");
  const promotion = asRecord(normalizedPreview.promotion);
  const originalIntake = asRecord(normalizedPreview.originalIntake);

  return {
    normalizedPreviewKeys: getJsonKeys(normalizedPreview),
    promotion: {
      endpoint: getRecordString(promotion, "endpoint"),
      promotionFlow: getRecordString(promotion, "promotionFlow"),
      promotedAt: getRecordString(promotion, "promotedAt"),
      activityEventId: getRecordString(promotion, "activityEventId"),
      activityStatus: getRecordString(promotion, "activityStatus"),
      activityProcessingStatus: getRecordString(
        promotion,
        "activityProcessingStatus"
      ),
      activityEventSource: getRecordString(promotion, "activityEventSource"),
      noImpactsCreated: getRecordBoolean(promotion, "noImpactsCreated"),
    },
    originalIntake: {
      sourceType: getRecordString(originalIntake, "sourceType"),
      activityEventSource: getRecordString(
        originalIntake,
        "activityEventSource"
      ),
      sourceEventId: getRecordString(originalIntake, "sourceEventId"),
      idempotencyKey: getRecordString(originalIntake, "idempotencyKey"),
      defaultActivityStatus: getRecordString(
        originalIntake,
        "defaultActivityStatus"
      ),
      defaultRawProcessingStatus: getRecordString(
        originalIntake,
        "defaultRawProcessingStatus"
      ),
      requiresHumanReview: getRecordBoolean(
        originalIntake,
        "requiresHumanReview"
      ),
      shouldCreateImportedPendingEvent: getRecordBoolean(
        originalIntake,
        "shouldCreateImportedPendingEvent"
      ),
    },
  };
}

function compactActivityEvent(row: GenericRow) {
  return {
    id: getId(row),
    title: getStringField(row, "title"),
    status: getStringField(row, "status"),
    source: getStringField(row, "source"),
    privacyScope: getStringField(row, "privacy_scope"),
    processingStatus: getStringField(row, "processing_status"),
    startedAt: getStringField(row, "started_at"),
    endedAt: getStringField(row, "ended_at"),
    occurredAt: getStringField(row, "occurred_at"),
    durationMinutes: getNumberField(row, "duration_minutes"),
    activityTypeId: getStringField(row, "activity_type_id"),
    activityTemplateId: getStringField(row, "activity_template_id"),
    legacyTemplateId: getStringField(row, "legacy_template_id"),
    createdAt: getStringField(row, "created_at"),
    updatedAt: getStringField(row, "updated_at"),
    lifecycleMetadata: extractLifecycleMetadata(row),
  };
}

function compactRawSignal(row: GenericRow) {
  return {
    id: getId(row),
    source: getStringField(row, "source"),
    sourceType: getStringField(row, "source_type"),
    sourceEventId: getStringField(row, "source_event_id"),
    idempotencyKey: getStringField(row, "idempotency_key"),
    signalType: getStringField(row, "signal_type"),
    endpoint: getStringField(row, "endpoint"),
    trustLevel: getStringField(row, "trust_level"),
    privacyScope: getStringField(row, "privacy_scope"),
    processingStatus: getStringField(row, "processing_status"),
    processingError: getStringField(row, "processing_error"),
    outputEventId: getStringField(row, "output_event_id"),
    processingRunId: getStringField(row, "processing_run_id"),
    occurredAt: getStringField(row, "occurred_at"),
    measuredAt: getStringField(row, "measured_at"),
    receivedAt: getStringField(row, "received_at"),
    createdAt: getStringField(row, "created_at"),
    updatedAt: getStringField(row, "updated_at"),
    rawPayloadKeys: getFieldKeys(row, "raw_payload"),
    normalizedPreviewKeys: getFieldKeys(row, "normalized_preview_json"),
    metadataKeys: getFieldKeys(row, "metadata_json"),
    hasRawPayload: row.raw_payload !== undefined && row.raw_payload !== null,
    hasNormalizedPreview:
      row.normalized_preview_json !== undefined &&
      row.normalized_preview_json !== null,
    promotionPreview: extractRawSignalPromotionPreview(row),
  };
}

function compactProcessingLog(row: GenericRow) {
  return {
    id: getId(row),
    processingRunId: getStringField(row, "processing_run_id"),
    rawSignalId: getStringField(row, "raw_signal_id"),
    activityEventId: getStringField(row, "activity_event_id"),
    activityCorrectionId: getStringField(row, "activity_correction_id"),
    stage: getStringField(row, "stage"),
    status: getStringField(row, "status"),
    level: getStringField(row, "level"),
    message: getStringField(row, "message"),
    errorMessage:
      getStringField(row, "error_message") ?? getStringField(row, "error"),
    durationMs: getFirstNumberField(row, ["duration_ms", "elapsed_ms"]),
    createdAt: getStringField(row, "created_at"),
    metadataKeys: getFieldKeys(row, "metadata_json"),
    detailsKeys: getFieldKeys(row, "details_json"),
    normalizedPreviewKeys: getFieldKeys(row, "normalized_preview_json"),
    recalculationResultKeys: getFieldKeys(row, "recalculation_result_json"),
  };
}

function compactCorrection(row: GenericRow) {
  return {
    id: getId(row),
    eventId: getStringField(row, "event_id"),
    correctionType: getStringField(row, "correction_type"),
    status: getStringField(row, "status"),
    changedFieldNames: getChangedFieldNames(row.changed_fields),
    createdAt: getStringField(row, "created_at"),
    updatedAt: getStringField(row, "updated_at"),
    hasBeforeSnapshot:
      row.before_snapshot_json !== undefined && row.before_snapshot_json !== null,
    hasAfterSnapshot:
      row.after_snapshot_json !== undefined && row.after_snapshot_json !== null,
    hasRecalculationResult:
      row.recalculation_result_json !== undefined &&
      row.recalculation_result_json !== null,
    beforeSnapshotKeys: getFieldKeys(row, "before_snapshot_json"),
    afterSnapshotKeys: getFieldKeys(row, "after_snapshot_json"),
    recalculationResultKeys: getFieldKeys(row, "recalculation_result_json"),
  };
}

function buildImpactSummary(rows: GenericRow[]) {
  const groups = new Map<
    string,
    {
      targetType: string | null;
      targetKey: string | null;
      metric: string | null;
      direction: string | null;
      unit: string | null;
      count: number;
      numericSum: number | null;
      eventIds: string[];
      sampleImpactIds: string[];
      latestCreatedAt: string | null;
    }
  >();

  for (const row of rows) {
    const targetType = getStringField(row, "target_type");
    const targetKey = getStringField(row, "target_key");
    const metric = getStringField(row, "metric");
    const direction = getStringField(row, "direction");
    const unit = getStringField(row, "unit");
    const key = JSON.stringify([targetType, targetKey, metric, direction, unit]);
    const numericValue = getNumberField(row, "value_numeric");
    const eventId = getStringField(row, "event_id");
    const impactId = getId(row);
    const createdAt = getStringField(row, "created_at");

    const existing =
      groups.get(key) ??
      {
        targetType,
        targetKey,
        metric,
        direction,
        unit,
        count: 0,
        numericSum: null,
        eventIds: [],
        sampleImpactIds: [],
        latestCreatedAt: null,
      };

    existing.count += 1;

    if (numericValue !== null) {
      existing.numericSum = (existing.numericSum ?? 0) + numericValue;
    }

    if (eventId && !existing.eventIds.includes(eventId)) {
      existing.eventIds.push(eventId);
    }

    if (impactId && existing.sampleImpactIds.length < 10) {
      existing.sampleImpactIds.push(impactId);
    }

    if (
      createdAt &&
      (!existing.latestCreatedAt ||
        Date.parse(createdAt) > Date.parse(existing.latestCreatedAt))
    ) {
      existing.latestCreatedAt = createdAt;
    }

    groups.set(key, existing);
  }

  return Array.from(groups.values()).sort((left, right) => {
    const leftTime = left.latestCreatedAt ? Date.parse(left.latestCreatedAt) : 0;
    const rightTime = right.latestCreatedAt ? Date.parse(right.latestCreatedAt) : 0;

    return rightTime - leftTime;
  });
}

function buildEventLinksSummary(rows: GenericRow[]) {
  const groups = new Map<
    string,
    {
      eventId: string | null;
      linkType: string | null;
      targetType: string | null;
      targetId: string | null;
      count: number;
      sampleLinkIds: string[];
      latestCreatedAt: string | null;
    }
  >();

  for (const row of rows) {
    const eventId = getStringField(row, "event_id");
    const linkType = getStringField(row, "link_type");
    const targetType =
      getStringField(row, "target_type") ??
      getStringField(row, "linked_entity_type") ??
      getStringField(row, "entity_type");
    const targetId =
      getStringField(row, "target_id") ??
      getStringField(row, "linked_entity_id") ??
      getStringField(row, "entity_id");
    const key = JSON.stringify([eventId, linkType, targetType, targetId]);
    const linkId = getId(row);
    const createdAt = getStringField(row, "created_at");

    const existing =
      groups.get(key) ??
      {
        eventId,
        linkType,
        targetType,
        targetId,
        count: 0,
        sampleLinkIds: [],
        latestCreatedAt: null,
      };

    existing.count += 1;

    if (linkId && existing.sampleLinkIds.length < 10) {
      existing.sampleLinkIds.push(linkId);
    }

    if (
      createdAt &&
      (!existing.latestCreatedAt ||
        Date.parse(createdAt) > Date.parse(existing.latestCreatedAt))
    ) {
      existing.latestCreatedAt = createdAt;
    }

    groups.set(key, existing);
  }

  return Array.from(groups.values()).sort((left, right) => {
    const leftTime = left.latestCreatedAt ? Date.parse(left.latestCreatedAt) : 0;
    const rightTime = right.latestCreatedAt ? Date.parse(right.latestCreatedAt) : 0;

    return rightTime - leftTime;
  });
}

function buildRawImportedLinkage(trace: {
  activityEvents: GenericRow[];
  rawActivitySignals: GenericRow[];
}) {
  const rawSignalsByOutputEventId = new Map<string, GenericRow[]>();
  const rawSignalsById = new Map<string, GenericRow>();

  for (const rawSignal of trace.rawActivitySignals) {
    const rawSignalId = getId(rawSignal);
    const outputEventId = getStringField(rawSignal, "output_event_id");

    if (rawSignalId) {
      rawSignalsById.set(rawSignalId, rawSignal);
    }

    if (outputEventId) {
      const existing = rawSignalsByOutputEventId.get(outputEventId) ?? [];
      existing.push(rawSignal);
      rawSignalsByOutputEventId.set(outputEventId, existing);
    }
  }

  return trace.activityEvents
    .slice()
    .sort((left, right) => getDateSortValue(right) - getDateSortValue(left))
    .map((event) => {
      const eventId = getId(event);
      const eventMetadata = getRecordField(event, "metadata_json");
      const metadataRawSignalId = getRecordString(eventMetadata, "rawSignalId");

      const linkedRawSignals = unique([
        ...(eventId
          ? (rawSignalsByOutputEventId.get(eventId) ?? []).map((row) =>
              getId(row)
            )
          : []),
        metadataRawSignalId,
      ])
        .map((rawSignalId) => rawSignalsById.get(rawSignalId))
        .filter((row): row is GenericRow => Boolean(row));

      const primaryRawSignal = linkedRawSignals[0] ?? null;
      const eventLifecycleMetadata = extractLifecycleMetadata(event);
      const rawSignalPromotionPreview = primaryRawSignal
        ? extractRawSignalPromotionPreview(primaryRawSignal)
        : null;

      return {
        eventId,
        eventTitle: getStringField(event, "title"),
        eventStatus: getStringField(event, "status"),
        eventProcessingStatus: getStringField(event, "processing_status"),
        eventSource: getStringField(event, "source"),
        isImportedPending: getStringField(event, "status") === "imported_pending",
        isCompleted: getStringField(event, "status") === "completed",
        isArchived: getStringField(event, "status") === "archived",
        linkedRawSignalsCount: linkedRawSignals.length,
        rawSignal: primaryRawSignal
          ? {
              id: getId(primaryRawSignal),
              sourceType: getStringField(primaryRawSignal, "source_type"),
              sourceEventId: getStringField(
                primaryRawSignal,
                "source_event_id"
              ),
              idempotencyKey: getStringField(
                primaryRawSignal,
                "idempotency_key"
              ),
              processingStatus: getStringField(
                primaryRawSignal,
                "processing_status"
              ),
              outputEventId: getStringField(primaryRawSignal, "output_event_id"),
              occurredAt: getStringField(primaryRawSignal, "occurred_at"),
              measuredAt: getStringField(primaryRawSignal, "measured_at"),
              receivedAt: getStringField(primaryRawSignal, "received_at"),
            }
          : null,
        linkedRawSignalIds: linkedRawSignals
          .map((row) => getId(row))
          .filter((id): id is string => Boolean(id)),
        promotion: {
          eventMetadata: eventLifecycleMetadata.promotion,
          rawSignalPromotionPreview: rawSignalPromotionPreview?.promotion ?? null,
          originalIntake: rawSignalPromotionPreview?.originalIntake ?? null,
        },
        confirmation: eventLifecycleMetadata.confirmation,
        linkageChecks: {
          hasLinkedRawSignal: linkedRawSignals.length > 0,
          rawSignalOutputPointsToEvent:
            Boolean(primaryRawSignal) &&
            Boolean(eventId) &&
            getStringField(primaryRawSignal as GenericRow, "output_event_id") ===
              eventId,
          eventMetadataPointsToRawSignal:
            Boolean(metadataRawSignalId) &&
            linkedRawSignals.some((row) => getId(row) === metadataRawSignalId),
          hasPromotionMetadata:
            Boolean(eventLifecycleMetadata.promotion.promotionFlow) ||
            Boolean(rawSignalPromotionPreview?.promotion?.promotionFlow),
          hasConfirmationMetadata: Boolean(
            eventLifecycleMetadata.confirmation.confirmationFlow
          ),
        },
      };
    });
}

function isProblemStatus(value: string | null) {
  if (!value) {
    return false;
  }

  const normalized = value.toLowerCase();

  return (
    normalized.includes("fail") ||
    normalized.includes("error") ||
    normalized.includes("warn") ||
    normalized.includes("invalid")
  );
}

function inferSeverity(value: string | null): "error" | "warning" {
  if (!value) {
    return "warning";
  }

  const normalized = value.toLowerCase();

  if (
    normalized.includes("fail") ||
    normalized.includes("error") ||
    normalized.includes("invalid")
  ) {
    return "error";
  }

  return "warning";
}

function buildErrorsAndWarnings(trace: {
  activityEvents: GenericRow[];
  rawActivitySignals: GenericRow[];
  activityProcessingLogs: GenericRow[];
  activityCorrections: GenericRow[];
}) {
  const problems: Array<{
    sourceTable: string;
    sourceId: string | null;
    severity: "error" | "warning";
    status: string | null;
    stage: string | null;
    message: string | null;
    createdAt: string | null;
  }> = [];

  for (const row of trace.activityEvents) {
    const status =
      getStringField(row, "processing_status") ?? getStringField(row, "status");

    if (isProblemStatus(status)) {
      problems.push({
        sourceTable: "activity_events",
        sourceId: getId(row),
        severity: inferSeverity(status),
        status,
        stage: null,
        message:
          getStringField(row, "processing_error") ??
          getStringField(row, "error_message") ??
          getStringField(row, "comment"),
        createdAt: getStringField(row, "created_at"),
      });
    }
  }

  for (const row of trace.rawActivitySignals) {
    const status = getStringField(row, "processing_status");

    if (isProblemStatus(status)) {
      problems.push({
        sourceTable: "raw_activity_signals",
        sourceId: getId(row),
        severity: inferSeverity(status),
        status,
        stage: null,
        message:
          getStringField(row, "processing_error") ??
          getStringField(row, "error_message"),
        createdAt: getStringField(row, "created_at"),
      });
    }
  }

  for (const row of trace.activityProcessingLogs) {
    const status =
      getStringField(row, "status") ?? getStringField(row, "level");

    if (
      isProblemStatus(status) ||
      getStringField(row, "error_message") ||
      getStringField(row, "error")
    ) {
      problems.push({
        sourceTable: "activity_processing_logs",
        sourceId: getId(row),
        severity: inferSeverity(status),
        status,
        stage: getStringField(row, "stage"),
        message:
          getStringField(row, "error_message") ??
          getStringField(row, "error") ??
          getStringField(row, "message"),
        createdAt: getStringField(row, "created_at"),
      });
    }
  }

  for (const row of trace.activityCorrections) {
    const status = getStringField(row, "status");

    if (isProblemStatus(status)) {
      problems.push({
        sourceTable: "activity_corrections",
        sourceId: getId(row),
        severity: inferSeverity(status),
        status,
        stage: getStringField(row, "correction_type"),
        message:
          getStringField(row, "error_message") ??
          getStringField(row, "processing_error"),
        createdAt: getStringField(row, "created_at"),
      });
    }
  }

  return problems.sort((left, right) => {
    const leftTime = left.createdAt ? Date.parse(left.createdAt) : 0;
    const rightTime = right.createdAt ? Date.parse(right.createdAt) : 0;

    return leftTime - rightTime;
  });
}

function buildTraceHealth(params: {
  trace: {
    activityEvents: GenericRow[];
    rawActivitySignals: GenericRow[];
    activityProcessingLogs: GenericRow[];
    activityCorrections: GenericRow[];
    impactEvents: GenericRow[];
    eventLinks: GenericRow[];
  };
  errorsAndWarnings: Array<{ severity: "error" | "warning" }>;
}) {
  const { trace, errorsAndWarnings } = params;
  const hasErrors = errorsAndWarnings.some((item) => item.severity === "error");
  const hasWarnings = errorsAndWarnings.some(
    (item) => item.severity === "warning"
  );
  const hasRootTrace =
    trace.activityEvents.length > 0 ||
    trace.rawActivitySignals.length > 0 ||
    trace.activityCorrections.length > 0 ||
    trace.activityProcessingLogs.length > 0;

  const rawImportedLinkage = buildRawImportedLinkage({
    activityEvents: trace.activityEvents,
    rawActivitySignals: trace.rawActivitySignals,
  });

  return {
    status: hasErrors ? "error" : hasWarnings ? "warning" : "ok",
    hasErrors,
    hasWarnings,
    hasRootTrace,
    counts: {
      activityEvents: trace.activityEvents.length,
      rawSignals: trace.rawActivitySignals.length,
      processingLogs: trace.activityProcessingLogs.length,
      corrections: trace.activityCorrections.length,
      impactEvents: trace.impactEvents.length,
      eventLinks: trace.eventLinks.length,
      errorsAndWarnings: errorsAndWarnings.length,
      rawImportedLinkages: rawImportedLinkage.length,
    },
    checks: {
      activityEventFound: trace.activityEvents.length > 0,
      rawSignalFound: trace.rawActivitySignals.length > 0,
      rawImportedLinkageFound: rawImportedLinkage.some(
        (link) => link.linkageChecks.hasLinkedRawSignal
      ),
      processingTimelineFound: trace.activityProcessingLogs.length > 0,
      correctionFound: trace.activityCorrections.length > 0,
      impactsFound: trace.impactEvents.length > 0,
      eventLinksFound: trace.eventLinks.length > 0,
      compactTraceDoesNotExposeRawPayload: true,
      compactTraceDoesNotExposeAuditSnapshots: true,
      compactTraceDoesNotExposeRecalculationJson: true,
    },
  };
}

function buildCompactTrace(trace: {
  activityEvents: GenericRow[];
  rawActivitySignals: GenericRow[];
  activityProcessingLogs: GenericRow[];
  activityCorrections: GenericRow[];
  impactEvents: GenericRow[];
  eventLinks: GenericRow[];
}) {
  const errorsAndWarnings = buildErrorsAndWarnings(trace);

  return {
    activityEvents: trace.activityEvents
      .slice()
      .sort((left, right) => getDateSortValue(right) - getDateSortValue(left))
      .map(compactActivityEvent),
    rawSignals: trace.rawActivitySignals
      .slice()
      .sort((left, right) => getDateSortValue(right) - getDateSortValue(left))
      .map(compactRawSignal),
    rawImportedLinkage: buildRawImportedLinkage({
      activityEvents: trace.activityEvents,
      rawActivitySignals: trace.rawActivitySignals,
    }),
    processingTimeline: trace.activityProcessingLogs
      .slice()
      .sort((left, right) => getDateSortValue(left) - getDateSortValue(right))
      .map(compactProcessingLog),
    corrections: trace.activityCorrections
      .slice()
      .sort((left, right) => getDateSortValue(right) - getDateSortValue(left))
      .map(compactCorrection),
    impactSummary: buildImpactSummary(trace.impactEvents),
    eventLinksSummary: buildEventLinksSummary(trace.eventLinks),
    errorsAndWarnings,
    health: buildTraceHealth({
      trace,
      errorsAndWarnings,
    }),
  };
}

function buildTraceCounts(trace: {
  activityEvents: GenericRow[];
  rawActivitySignals: GenericRow[];
  activityProcessingLogs: GenericRow[];
  activityCorrections: GenericRow[];
  impactEvents: GenericRow[];
  eventLinks: GenericRow[];
}) {
  return {
    activityEvents: trace.activityEvents.length,
    rawActivitySignals: trace.rawActivitySignals.length,
    activityProcessingLogs: trace.activityProcessingLogs.length,
    activityCorrections: trace.activityCorrections.length,
    impactEvents: trace.impactEvents.length,
    eventLinks: trace.eventLinks.length,
  };
}

export async function GET(request: Request) {
  if (!ACTIVITY_RECORDING_ENABLED) {
    return NextResponse.json(
      {
        ok: false,
        error: ACTIVITY_RECORDING_DISABLED_MESSAGE,
      },
      { status: 503 }
    );
  }

  const { appUser, errorResponse } = await getActivityUserContext();

  if (errorResponse) {
    return errorResponse;
  }

  if (!appUser) {
    return NextResponse.json(
      {
        ok: false,
        error: "User context not found",
      },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const limit = parseLimit(searchParams.get("limit"));
  const mode = parseMode(searchParams.get("mode"));

  const eventIds = new Set(
    unique([
      asString(searchParams.get("eventId")),
      ...parseList(searchParams.get("eventIds")),
    ])
  );

  const rawSignalIds = new Set(
    unique([
      asString(searchParams.get("rawSignalId")),
      ...parseList(searchParams.get("rawSignalIds")),
    ])
  );

  const correctionIds = new Set(
    unique([
      asString(searchParams.get("correctionId")),
      ...parseList(searchParams.get("correctionIds")),
    ])
  );

  const processingRunIds = new Set(
    unique([
      asString(searchParams.get("processingRunId")),
      ...parseList(searchParams.get("processingRunIds")),
    ])
  );

  const requestedFilters = {
    eventIds: Array.from(eventIds),
    rawSignalIds: Array.from(rawSignalIds),
    correctionIds: Array.from(correctionIds),
    processingRunIds: Array.from(processingRunIds),
  };

  const hasAnyFilter =
    eventIds.size > 0 ||
    rawSignalIds.size > 0 ||
    correctionIds.size > 0 ||
    processingRunIds.size > 0;

  if (!hasAnyFilter) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Provide at least one filter: eventId, rawSignalId, correctionId or processingRunId.",
        examples: [
          "/api/activity/debug-trace?eventId=<activity_event_id>",
          "/api/activity/debug-trace?rawSignalId=<raw_signal_id>",
          "/api/activity/debug-trace?processingRunId=<processing_run_id>",
          "/api/activity/debug-trace?correctionId=<activity_correction_id>",
          "/api/activity/debug-trace?eventId=<activity_event_id>&mode=summary",
          "/api/activity/debug-trace?rawSignalId=<raw_signal_id>&mode=summary",
        ],
      },
      { status: 400 }
    );
  }

  try {
    const trace = await fetchTrace({
      userId: appUser.id,
      eventIds,
      rawSignalIds,
      correctionIds,
      processingRunIds,
      limit,
    });

    const summary = buildTraceCounts(trace);

    return NextResponse.json({
      ok: true,
      endpoint: "/api/activity/debug-trace",
      mode,
      filters: {
        requested: requestedFilters,
        expanded: {
          eventIds: Array.from(eventIds),
          rawSignalIds: Array.from(rawSignalIds),
          correctionIds: Array.from(correctionIds),
          processingRunIds: Array.from(processingRunIds),
        },
        limit,
      },
      summary,
      trace: mode === "summary" ? buildCompactTrace(trace) : trace,
      note:
        mode === "summary"
          ? "Summary mode includes rawImportedLinkage, sourceEventId, idempotencyKey and lifecycle metadata keys without exposing rawPayload, audit snapshots or recalculation JSON."
          : "Full mode returns owner-only raw rows for private debugging. Do not expose full mode in public UI.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load activity debug trace.",
      },
      { status: 500 }
    );
  }
}
