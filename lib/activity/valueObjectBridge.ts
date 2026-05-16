import type { SupabaseClient } from "@supabase/supabase-js";

type BridgeSource =
  | "rule"
  | "manual"
  | "ai_draft"
  | "api"
  | "system"
  | "correction"
  | "commercial";

type ValueObjectStateDeltaDirection =
  | "increase"
  | "decrease"
  | "neutral"
  | "set";

type ValueObjectInstanceStatus =
  | "draft"
  | "planned"
  | "active"
  | "completed"
  | "cancelled"
  | "archived";

type ActivityEventForValueObjectBridge = {
  id: string;
  user_id: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number | null;
  title: string | null;
  description: string | null;
  performed_by_actor_id?: string | null;
  acting_as_actor_id?: string | null;
  acting_for_actor_id?: string | null;
};

export type ValueObjectBridgeMapping = {
  valueObjectId: string;

  relationType?:
    | "executes"
    | "creates"
    | "uses"
    | "supports"
    | "consumes"
    | "updates_state"
    | "commercial_source"
    | "related_to";

  weight?: number;
  confidence?: number;
  source?: BridgeSource;

  instanceStatus?: ValueObjectInstanceStatus;
  instanceTitle?: string | null;
  instanceNote?: string | null;
  resultStatus?: string | null;
  qualityScore?: number | null;

  metricKey: string;
  metricUnit?: string | null;
  deltaValueNumeric?: number | null;
  deltaValueText?: string | null;
  deltaDirection?: ValueObjectStateDeltaDirection;

  aggregateDate?: string | null;
  aggregateType?: string;
  aggregateKey?: string;

  metadata?: Record<string, unknown>;
};

export type ProcessValueObjectBridgeInput = {
  supabase: SupabaseClient;
  eventId: string;
  mappings: ValueObjectBridgeMapping[];
  source?: BridgeSource;
  allowNonCompletedEvent?: boolean;
  processorName?: string;
};

export type ValueObjectBridgeCreatedItem = {
  valueObjectId: string;
  valueObjectInstanceId: string | null;
  linkId: string | null;
  stateDeltaId: string | null;
  aggregateId: string | null;
  snapshotId: string | null;
  skipped: boolean;
  skipReason: string | null;
};

export type ProcessValueObjectBridgeResult = {
  ok: boolean;
  skipped: boolean;
  skipReason: string | null;
  eventId: string;
  eventStatus: string | null;
  mappingsRequested: number;
  created: ValueObjectBridgeCreatedItem[];
  errors: string[];
};

function clamp01(value: number | null | undefined, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
}

function normalizeSource(value: string | null | undefined): BridgeSource {
  const allowed: BridgeSource[] = [
    "rule",
    "manual",
    "ai_draft",
    "api",
    "system",
    "correction",
    "commercial",
  ];

  if (allowed.includes(value as BridgeSource)) {
    return value as BridgeSource;
  }

  return "rule";
}

function normalizeDeltaDirection(
  value: string | null | undefined
): ValueObjectStateDeltaDirection {
  const allowed: ValueObjectStateDeltaDirection[] = [
    "increase",
    "decrease",
    "neutral",
    "set",
  ];

  if (allowed.includes(value as ValueObjectStateDeltaDirection)) {
    return value as ValueObjectStateDeltaDirection;
  }

  return "neutral";
}

function normalizeRelationType(
  value: string | null | undefined
): NonNullable<ValueObjectBridgeMapping["relationType"]> {
  const allowed: NonNullable<ValueObjectBridgeMapping["relationType"]>[] = [
    "executes",
    "creates",
    "uses",
    "supports",
    "consumes",
    "updates_state",
    "commercial_source",
    "related_to",
  ];

  if (
    allowed.includes(value as NonNullable<ValueObjectBridgeMapping["relationType"]>)
  ) {
    return value as NonNullable<ValueObjectBridgeMapping["relationType"]>;
  }

  return "executes";
}

function getDateFromEvent(event: ActivityEventForValueObjectBridge): string {
  const sourceDate = event.started_at ?? event.ended_at ?? new Date().toISOString();
  return sourceDate.slice(0, 10);
}

function getSignedNumericDelta(
  value: number | null | undefined,
  direction: ValueObjectStateDeltaDirection
): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  if (direction === "decrease") {
    return -Math.abs(value);
  }

  if (direction === "increase") {
    return Math.abs(value);
  }

  return value;
}

async function readActivityEvent(
  supabase: SupabaseClient,
  eventId: string
): Promise<{
  event: ActivityEventForValueObjectBridge | null;
  errorMessage: string | null;
}> {
  const { data, error } = await supabase
    .from("activity_events")
    .select(
      [
        "id",
        "user_id",
        "status",
        "started_at",
        "ended_at",
        "duration_minutes",
        "title",
        "description",
        "performed_by_actor_id",
        "acting_as_actor_id",
        "acting_for_actor_id",
      ].join(", ")
    )
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    return {
      event: null,
      errorMessage: error.message,
    };
  }

  return {
    event: (data as ActivityEventForValueObjectBridge | null) ?? null,
    errorMessage: null,
  };
}

async function readValueObjectOwnerContext(
  supabase: SupabaseClient,
  valueObjectId: string
): Promise<{
  ownerActorId: string | null;
  organizationId: string | null;
  errorMessage: string | null;
}> {
  const { data, error } = await supabase
    .from("value_objects")
    .select("id, owner_actor_id, organization_id")
    .eq("id", valueObjectId)
    .maybeSingle();

  if (error) {
    return {
      ownerActorId: null,
      organizationId: null,
      errorMessage: error.message,
    };
  }

  if (!data) {
    return {
      ownerActorId: null,
      organizationId: null,
      errorMessage: "Value object not found.",
    };
  }

  const row = data as {
    owner_actor_id: string | null;
    organization_id: string | null;
  };

  return {
    ownerActorId: row.owner_actor_id,
    organizationId: row.organization_id,
    errorMessage: null,
  };
}


async function readExistingStateDeltaForMapping(
  supabase: SupabaseClient,
  eventId: string,
  valueObjectId: string,
  metricKey: string
): Promise<{
  stateDeltaId: string | null;
  valueObjectInstanceId: string | null;
  errorMessage: string | null;
}> {
  const { data, error } = await supabase
    .from("value_object_state_deltas")
    .select("id, value_object_instance_id")
    .eq("event_id", eventId)
    .eq("value_object_id", valueObjectId)
    .eq("metric_key", metricKey)
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) {
    return {
      stateDeltaId: null,
      valueObjectInstanceId: null,
      errorMessage: error.message,
    };
  }

  const rows =
    (data as Array<{
      id: string;
      value_object_instance_id: string | null;
    }> | null) ?? [];

  const firstRow = rows[0] ?? null;

  if (!firstRow) {
    return {
      stateDeltaId: null,
      valueObjectInstanceId: null,
      errorMessage: null,
    };
  }

  return {
    stateDeltaId: firstRow.id,
    valueObjectInstanceId: firstRow.value_object_instance_id,
    errorMessage: null,
  };
}
async function readExistingNumericValue(
  supabase: SupabaseClient,
  tableName: "value_object_daily_aggregates" | "value_object_state_snapshots",
  filters: Record<string, string>,
  valueColumn: "metric_value_numeric"
): Promise<number | null> {
  let query = supabase.from(tableName).select(valueColumn);

  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as Record<string, unknown>;
  const value = row[valueColumn];

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

export async function processValueObjectBridgeForActivityEvent(
  input: ProcessValueObjectBridgeInput
): Promise<ProcessValueObjectBridgeResult> {
  const {
    supabase,
    eventId,
    mappings,
    source,
    allowNonCompletedEvent = false,
    processorName = "value_object_bridge_p4_7",
  } = input;

  const result: ProcessValueObjectBridgeResult = {
    ok: false,
    skipped: false,
    skipReason: null,
    eventId,
    eventStatus: null,
    mappingsRequested: mappings.length,
    created: [],
    errors: [],
  };

  if (mappings.length === 0) {
    result.ok = true;
    result.skipped = true;
    result.skipReason = "no_mappings";
    return result;
  }

  const { event, errorMessage } = await readActivityEvent(supabase, eventId);

  if (errorMessage) {
    result.errors.push(errorMessage);
    return result;
  }

  if (!event) {
    result.errors.push("Activity event not found.");
    return result;
  }

  result.eventStatus = event.status;

  if (!allowNonCompletedEvent && event.status !== "completed") {
    result.ok = true;
    result.skipped = true;
    result.skipReason = `event_status_${event.status}_not_completed`;
    return result;
  }

  for (const mapping of mappings) {
    const mappingSource = normalizeSource(mapping.source ?? source);
    const confidence = clamp01(mapping.confidence, 1);
    const weight = clamp01(mapping.weight, 1);
    const deltaDirection = normalizeDeltaDirection(mapping.deltaDirection);
    const relationType = normalizeRelationType(mapping.relationType);
    const aggregateDate = mapping.aggregateDate ?? getDateFromEvent(event);
    const aggregateType = mapping.aggregateType ?? "value_object";
    const aggregateKey = mapping.aggregateKey ?? mapping.valueObjectId;
    const signedDelta = getSignedNumericDelta(
      mapping.deltaValueNumeric ?? null,
      deltaDirection
    );

    const createdItem: ValueObjectBridgeCreatedItem = {
      valueObjectId: mapping.valueObjectId,
      valueObjectInstanceId: null,
      linkId: null,
      stateDeltaId: null,
      aggregateId: null,
      snapshotId: null,
      skipped: false,
      skipReason: null,
    };

    if (
      mapping.deltaValueNumeric === null &&
      mapping.deltaValueText === null &&
      typeof mapping.deltaValueNumeric !== "number" &&
      typeof mapping.deltaValueText !== "string"
    ) {
      createdItem.skipped = true;
      createdItem.skipReason = "missing_delta_value";
      result.created.push(createdItem);
      continue;
    }

    const existingStateDelta = await readExistingStateDeltaForMapping(
      supabase,
      event.id,
      mapping.valueObjectId,
      mapping.metricKey
    );

    if (existingStateDelta.errorMessage) {
      createdItem.skipped = true;
      createdItem.skipReason = existingStateDelta.errorMessage;
      result.created.push(createdItem);
      continue;
    }

    if (existingStateDelta.stateDeltaId) {
      createdItem.valueObjectInstanceId =
        existingStateDelta.valueObjectInstanceId;
      createdItem.stateDeltaId = existingStateDelta.stateDeltaId;
      createdItem.skipped = true;
      createdItem.skipReason = "already_processed_event_value_object_metric";
      result.created.push(createdItem);
      continue;
    }
    const ownerContext = await readValueObjectOwnerContext(
      supabase,
      mapping.valueObjectId
    );

    if (ownerContext.errorMessage) {
      createdItem.skipped = true;
      createdItem.skipReason = ownerContext.errorMessage;
      result.created.push(createdItem);
      continue;
    }

    const { data: voiData, error: voiError } = await supabase
      .from("value_object_instances")
      .insert({
        user_id: event.user_id,
        value_object_id: mapping.valueObjectId,
        source_event_id: event.id,
        owner_actor_id:
          ownerContext.ownerActorId ??
          event.acting_as_actor_id ??
          event.performed_by_actor_id ??
          null,
        organization_id: ownerContext.organizationId,
        status: mapping.instanceStatus ?? "completed",
        started_at: event.started_at,
        ended_at: event.ended_at,
        duration_minutes: event.duration_minutes,
        instance_title: mapping.instanceTitle ?? event.title,
        instance_note: mapping.instanceNote ?? event.description,
        result_status: mapping.resultStatus ?? null,
        quality_score: mapping.qualityScore ?? null,
        confidence,
        source: mappingSource,
        metadata_json: {
          processorName,
          eventId: event.id,
          mappingMetadata: mapping.metadata ?? {},
        },
      })
      .select("id")
      .single();

    if (voiError || !voiData) {
      createdItem.skipped = true;
      createdItem.skipReason = voiError?.message ?? "failed_to_create_voi";
      result.created.push(createdItem);
      continue;
    }

    const valueObjectInstanceId = (voiData as { id: string }).id;
    createdItem.valueObjectInstanceId = valueObjectInstanceId;

    const { data: linkData, error: linkError } = await supabase
      .from("activity_event_value_object_instance_links")
      .insert({
        user_id: event.user_id,
        event_id: event.id,
        value_object_instance_id: valueObjectInstanceId,
        relation_type: relationType,
        weight,
        confidence,
        source: mappingSource,
        metadata_json: {
          processorName,
          valueObjectId: mapping.valueObjectId,
        },
      })
      .select("id")
      .single();

    if (linkError) {
      result.errors.push(linkError.message);
    } else if (linkData) {
      createdItem.linkId = (linkData as { id: string }).id;
    }

    const { data: deltaData, error: deltaError } = await supabase
      .from("value_object_state_deltas")
      .insert({
        user_id: event.user_id,
        event_id: event.id,
        value_object_instance_id: valueObjectInstanceId,
        value_object_id: mapping.valueObjectId,
        rule_id: null,
        metric_key: mapping.metricKey,
        delta_value_numeric:
          typeof mapping.deltaValueNumeric === "number"
            ? Math.abs(mapping.deltaValueNumeric)
            : null,
        delta_value_text: mapping.deltaValueText ?? null,
        metric_unit: mapping.metricUnit ?? null,
        delta_direction: deltaDirection,
        source: mappingSource,
        confidence,
        metadata_json: {
          processorName,
          signedDelta,
          mappingMetadata: mapping.metadata ?? {},
        },
      })
      .select("id")
      .single();

    if (deltaError || !deltaData) {
      result.errors.push(deltaError?.message ?? "failed_to_create_state_delta");
      result.created.push(createdItem);
      continue;
    }

    const stateDeltaId = (deltaData as { id: string }).id;
    createdItem.stateDeltaId = stateDeltaId;

    let aggregateNumericValue: number | null = null;

    if (signedDelta !== null) {
      const currentAggregateValue = await readExistingNumericValue(
        supabase,
        "value_object_daily_aggregates",
        {
          user_id: event.user_id,
          value_object_id: mapping.valueObjectId,
          aggregate_date: aggregateDate,
          aggregate_type: aggregateType,
          aggregate_key: aggregateKey,
          metric_key: mapping.metricKey,
        },
        "metric_value_numeric"
      );

      aggregateNumericValue = (currentAggregateValue ?? 0) + signedDelta;
    }

    const { data: aggregateData, error: aggregateError } = await supabase
      .from("value_object_daily_aggregates")
      .upsert(
        {
          user_id: event.user_id,
          value_object_id: mapping.valueObjectId,
          aggregate_date: aggregateDate,
          aggregate_type: aggregateType,
          aggregate_key: aggregateKey,
          metric_key: mapping.metricKey,
          metric_value_numeric: aggregateNumericValue ?? 0,
          metric_value_text: mapping.deltaValueText ?? null,
          metric_unit: mapping.metricUnit ?? null,
          source: mappingSource,
          last_event_id: event.id,
          last_state_delta_id: stateDeltaId,
          updated_at: new Date().toISOString(),
          metadata_json: {
            processorName,
            lastSignedDelta: signedDelta,
          },
        },
        {
          onConflict:
            "user_id,value_object_id,aggregate_date,aggregate_type,aggregate_key,metric_key",
        }
      )
      .select("id")
      .single();

    if (aggregateError) {
      result.errors.push(aggregateError.message);
    } else if (aggregateData) {
      createdItem.aggregateId = (aggregateData as { id: string }).id;
    }

    let snapshotNumericValue: number | null = null;

    if (signedDelta !== null) {
      const currentSnapshotValue = await readExistingNumericValue(
        supabase,
        "value_object_state_snapshots",
        {
          user_id: event.user_id,
          value_object_id: mapping.valueObjectId,
          metric_key: mapping.metricKey,
        },
        "metric_value_numeric"
      );

      if (deltaDirection === "set") {
        snapshotNumericValue = mapping.deltaValueNumeric ?? 0;
      } else {
        snapshotNumericValue = (currentSnapshotValue ?? 0) + signedDelta;
      }
    }

    const { data: snapshotData, error: snapshotError } = await supabase
      .from("value_object_state_snapshots")
      .upsert(
        {
          user_id: event.user_id,
          value_object_id: mapping.valueObjectId,
          metric_key: mapping.metricKey,
          metric_value_numeric: snapshotNumericValue,
          metric_value_text: mapping.deltaValueText ?? null,
          metric_unit: mapping.metricUnit ?? null,
          last_event_id: event.id,
          last_state_delta_id: stateDeltaId,
          updated_at: new Date().toISOString(),
          source: mappingSource,
          metadata_json: {
            processorName,
            lastSignedDelta: signedDelta,
          },
        },
        {
          onConflict: "user_id,value_object_id,metric_key",
        }
      )
      .select("id")
      .single();

    if (snapshotError) {
      result.errors.push(snapshotError.message);
    } else if (snapshotData) {
      createdItem.snapshotId = (snapshotData as { id: string }).id;
    }

    result.created.push(createdItem);
  }

  result.ok = result.errors.length === 0;

  return result;
}


