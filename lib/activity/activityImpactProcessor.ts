import { supabase } from "../supabase";

const DEFAULT_AGGREGATE_TIMEZONE = "Europe/Warsaw";

type ImpactRuleRow = {
  id: string;
  template_id: string | null;
  activity_template_id: string | null;
  activity_type_id: string | null;
  rule_code: string;
  title: string;
  description: string | null;
  impact_target_type: string;
  impact_target_key: string;
  impact_metric: string;
  impact_unit: string | null;
  impact_value_mode: string;
  impact_value_numeric: number | string | null;
  impact_value_text: string | null;
  impact_direction: string;
  intensity: string | null;
  rule_source: string;
  is_active: boolean;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type ImpactEventInsertRow = {
  event_id: string;
  rule_id: string;
  impact_target_type: string;
  impact_target_key: string;
  impact_metric: string;
  impact_value_numeric: number | null;
  impact_value_text: string | null;
  impact_unit: string | null;
  impact_direction: string;
  intensity: string | null;
  source: string;
  confidence: number;
  metadata_json: Record<string, unknown>;
};

type ImpactEventRow = {
  id: string;
  event_id: string;
  rule_id: string | null;
  impact_target_type: string;
  impact_target_key: string;
  impact_metric: string;
  impact_value_numeric: number | string | null;
  impact_value_text: string | null;
  impact_unit: string | null;
  impact_direction: string;
  intensity: string | null;
  source: string;
  confidence: number | string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
};

export type ProcessActivityImpactsInput = {
  eventId: string;
  userId: string;
  activityTemplateId?: string | null;
  activityTypeId?: string | null;
  durationMinutes?: number | null;
  startedAt?: string | null;
  timezone?: string | null;
};

export type ProcessActivityImpactsResult = {
  ok: boolean;
  skipped: boolean;
  reason: string | null;
  impactEvents: unknown[];
  dailyAggregates: unknown[];
  currentSnapshots: unknown[];
  counts: {
    impactRules: number;
    impactEvents: number;
    dailyAggregates: number;
    currentSnapshots: number;
  };
};

export type RecalculateActivityImpactsInput = {
  eventId: string;
  userId: string;
  activityTemplateId?: string | null;
  activityTypeId?: string | null;
  durationMinutes?: number | null;
  startedAt?: string | null;
  previousStartedAt?: string | null;
  timezone?: string | null;
  reason?: string | null;
};

export type RecalculateActivityImpactsResult = {
  ok: boolean;
  skipped: boolean;
  reason: string | null;
  previousImpactEvents: unknown[];
  rollbackDailyAggregates: unknown[];
  recalculatedImpactEvents: unknown[];
  recalculatedDailyAggregates: unknown[];
  recalculatedCurrentSnapshots: unknown[];
  counts: {
    previousImpactEvents: number;
    rollbackDailyAggregates: number;
    deletedImpactEvents: number;
    recalculatedImpactRules: number;
    recalculatedImpactEvents: number;
    recalculatedDailyAggregates: number;
    recalculatedCurrentSnapshots: number;
  };
  recalculatedProcessor: ProcessActivityImpactsResult;
};

export type RollbackActivityImpactsInput = {
  eventId: string;
  userId: string;
  previousStartedAt?: string | null;
  timezone?: string | null;
  reason?: string | null;
  cleanupCurrentSnapshots?: boolean;
};

export type RollbackActivityImpactsResult = {
  ok: boolean;
  skipped: boolean;
  reason: string | null;
  previousImpactEvents: unknown[];
  rollbackDailyAggregates: unknown[];
  counts: {
    previousImpactEvents: number;
    rollbackDailyAggregates: number;
    deletedImpactEvents: number;
    deletedCurrentSnapshots: number;
  };
};

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

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
    const normalized = value.trim().replace(",", ".");
    const parsed = Number.parseFloat(normalized);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function isValidTimeZone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function resolveImpactTimezone(timezone?: string | null) {
  const trimmedTimezone = timezone?.trim();

  if (trimmedTimezone && isValidTimeZone(trimmedTimezone)) {
    return trimmedTimezone;
  }

  return DEFAULT_AGGREGATE_TIMEZONE;
}

function getDatePartsInTimezone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return new Date().toISOString().slice(0, 10);
  }

  return `${year}-${month}-${day}`;
}

function resolveLegacyUtcAggregateDate(startedAt?: string | null) {
  if (startedAt && /^\d{4}-\d{2}-\d{2}/.test(startedAt)) {
    return startedAt.slice(0, 10);
  }

  if (startedAt) {
    const startedAtDate = new Date(startedAt);

    if (!Number.isNaN(startedAtDate.getTime())) {
      return startedAtDate.toISOString().slice(0, 10);
    }
  }

  return new Date().toISOString().slice(0, 10);
}

function uniqueImpactRules(rules: ImpactRuleRow[]) {
  const rulesById = new Map<string, ImpactRuleRow>();

  for (const rule of rules) {
    rulesById.set(rule.id, rule);
  }

  return Array.from(rulesById.values()).sort((a, b) =>
    a.rule_code.localeCompare(b.rule_code)
  );
}

async function getExistingImpactEventsCount(eventId: string) {
  const { count, error } = await supabase
    .from("impact_events")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("event_id", eventId);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

async function getExistingImpactEvents(eventId: string) {
  const { data, error } = await supabase
    .from("impact_events")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ImpactEventRow[];
}

async function deleteImpactEvents(eventId: string) {
  const { count, error } = await supabase
    .from("impact_events")
    .delete({ count: "exact" })
    .eq("event_id", eventId);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

async function deleteCurrentSnapshotsForEvent(params: {
  userId: string;
  eventId: string;
}) {
  const { userId, eventId } = params;

  const { count, error } = await supabase
    .from("current_snapshots")
    .delete({ count: "exact" })
    .eq("user_id", userId)
    .eq("last_event_id", eventId);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

async function getImpactRules(params: {
  activityTemplateId?: string | null;
  activityTypeId?: string | null;
}) {
  const { activityTemplateId, activityTypeId } = params;

  const collectedRules: ImpactRuleRow[] = [];

  if (activityTemplateId) {
    const { data, error } = await supabase
      .from("impact_rules")
      .select("*")
      .eq("activity_template_id", activityTemplateId)
      .eq("is_active", true);

    if (error) {
      throw new Error(error.message);
    }

    collectedRules.push(...((data ?? []) as ImpactRuleRow[]));
  }

  if (activityTypeId) {
    const { data, error } = await supabase
      .from("impact_rules")
      .select("*")
      .eq("activity_type_id", activityTypeId)
      .eq("is_active", true);

    if (error) {
      throw new Error(error.message);
    }

    collectedRules.push(...((data ?? []) as ImpactRuleRow[]));
  }

  return uniqueImpactRules(collectedRules);
}

function calculateImpactValue(params: {
  rule: ImpactRuleRow;
  durationMinutes: number | null;
}) {
  const { rule, durationMinutes } = params;

  if (rule.impact_value_mode === "duration_minutes") {
    return {
      impactValueNumeric: durationMinutes,
      impactValueText: rule.impact_value_text,
    };
  }

  if (rule.impact_value_mode === "fixed") {
    return {
      impactValueNumeric: asNumber(rule.impact_value_numeric),
      impactValueText: rule.impact_value_text,
    };
  }

  if (rule.impact_value_mode === "multiplier") {
    const multiplier = asNumber(rule.impact_value_numeric) ?? 1;

    return {
      impactValueNumeric:
        durationMinutes === null ? null : durationMinutes * multiplier,
      impactValueText: rule.impact_value_text,
    };
  }

  return {
    impactValueNumeric: asNumber(rule.impact_value_numeric),
    impactValueText: rule.impact_value_text,
  };
}

function buildImpactEventRows(params: {
  eventId: string;
  impactRules: ImpactRuleRow[];
  durationMinutes: number | null;
  aggregateTimezone: string;
}) {
  const { eventId, impactRules, durationMinutes, aggregateTimezone } = params;

  return impactRules.map((rule): ImpactEventInsertRow => {
    const { impactValueNumeric, impactValueText } = calculateImpactValue({
      rule,
      durationMinutes,
    });

    return {
      event_id: eventId,
      rule_id: rule.id,
      impact_target_type: rule.impact_target_type,
      impact_target_key: rule.impact_target_key,
      impact_metric: rule.impact_metric,
      impact_value_numeric: impactValueNumeric,
      impact_value_text: impactValueText,
      impact_unit: rule.impact_unit,
      impact_direction: rule.impact_direction,
      intensity: rule.intensity,
      source: "rule",
      confidence: 1,
      metadata_json: {
        processor: "activityImpactProcessor.v1",
        processor_update_mode: "atomic_rpc",
        aggregate_timezone: aggregateTimezone,
        rule_code: rule.rule_code,
        rule_title: rule.title,
        impact_value_mode: rule.impact_value_mode,
        activity_template_id: rule.activity_template_id,
        legacy_template_id: rule.template_id,
        rule_metadata: asRecord(rule.metadata_json),
      },
    };
  });
}

function resolveAggregateDate(params: {
  startedAt?: string | null;
  timezone: string;
}) {
  const { startedAt, timezone } = params;

  if (startedAt) {
    const startedAtDate = new Date(startedAt);

    if (!Number.isNaN(startedAtDate.getTime())) {
      return getDatePartsInTimezone(startedAtDate, timezone);
    }
  }

  return getDatePartsInTimezone(new Date(), timezone);
}

function resolveRollbackAggregateDate(params: {
  impactRow: ImpactEventRow;
  previousStartedAt?: string | null;
  fallbackTimezone: string;
}) {
  const { impactRow, previousStartedAt, fallbackTimezone } = params;
  const impactMetadata = asRecord(impactRow.metadata_json);
  const storedAggregateTimezone = asString(impactMetadata.aggregate_timezone);

  if (storedAggregateTimezone && isValidTimeZone(storedAggregateTimezone)) {
    return {
      aggregateDate: resolveAggregateDate({
        startedAt: previousStartedAt,
        timezone: storedAggregateTimezone,
      }),
      aggregateTimezone: storedAggregateTimezone,
      dateMode: "stored_timezone",
    };
  }

  return {
    aggregateDate: resolveLegacyUtcAggregateDate(previousStartedAt),
    aggregateTimezone: fallbackTimezone,
    dateMode: "legacy_utc",
  };
}

function resolveAggregateDelta(params: {
  dailyMetricKey: string;
  impactValueNumeric: number | null;
}) {
  const { dailyMetricKey, impactValueNumeric } = params;

  if (dailyMetricKey === "count") {
    return 1;
  }

  return impactValueNumeric ?? 0;
}

function resolveAggregateMetricUnit(params: {
  dailyMetricKey: string;
  impactUnit: string | null;
}) {
  const { dailyMetricKey, impactUnit } = params;

  if (dailyMetricKey === "count") {
    return "count";
  }

  return impactUnit;
}

async function updateDailyAggregate(params: {
  userId: string;
  eventId: string;
  aggregateDate: string;
  aggregateTimezone: string;
  aggregateType: string;
  aggregateKey: string;
  metricKey: string;
  metricUnit: string | null;
  delta: number;
  updateReason?: string | null;
  rollbackDateMode?: string | null;
}) {
  const {
    userId,
    eventId,
    aggregateDate,
    aggregateTimezone,
    aggregateType,
    aggregateKey,
    metricKey,
    metricUnit,
    delta,
    updateReason = null,
    rollbackDateMode = null,
  } = params;

  const metadata: Record<string, unknown> = {
    processor: "activityImpactProcessor.v1",
    processor_update_mode: "atomic_rpc",
    aggregate_timezone: aggregateTimezone,
  };

  if (updateReason) {
    metadata.update_reason = updateReason;
  }

  if (rollbackDateMode) {
    metadata.rollback_date_mode = rollbackDateMode;
  }

  const { data, error } = await supabase.rpc("increment_daily_aggregate", {
    p_user_id: userId,
    p_event_id: eventId,
    p_aggregate_date: aggregateDate,
    p_aggregate_type: aggregateType,
    p_aggregate_key: aggregateKey,
    p_metric_key: metricKey,
    p_metric_unit: metricUnit,
    p_delta: delta,
    p_source: "rule",
    p_metadata_json: metadata,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function updateCurrentSnapshot(params: {
  userId: string;
  eventId: string;
  snapshotEntityType: string;
  snapshotEntityKey: string;
  metricKey: string;
  metricValueNumeric: number | null;
  metricValueText: string | null;
  metricUnit: string | null;
}) {
  const {
    userId,
    eventId,
    snapshotEntityType,
    snapshotEntityKey,
    metricKey,
    metricValueNumeric,
    metricValueText,
    metricUnit,
  } = params;

  const { data, error } = await supabase.rpc("upsert_current_snapshot", {
    p_user_id: userId,
    p_event_id: eventId,
    p_snapshot_entity_type: snapshotEntityType,
    p_snapshot_entity_key: snapshotEntityKey,
    p_metric_key: metricKey,
    p_metric_value_numeric: metricValueNumeric,
    p_metric_value_text: metricValueText,
    p_metric_unit: metricUnit,
    p_metadata_json: {
      processor: "activityImpactProcessor.v1",
      processor_update_mode: "atomic_rpc",
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function updateDerivedMetrics(params: {
  userId: string;
  eventId: string;
  aggregateDate: string;
  aggregateTimezone: string;
  impactRules: ImpactRuleRow[];
  impactRows: ImpactEventInsertRow[];
}) {
  const {
    userId,
    eventId,
    aggregateDate,
    aggregateTimezone,
    impactRules,
    impactRows,
  } = params;

  const dailyAggregates: unknown[] = [];
  const currentSnapshots: unknown[] = [];

  for (const impactRow of impactRows) {
    const matchingRule = impactRules.find(
      (rule) => rule.id === impactRow.rule_id
    );

    const ruleMetadata = asRecord(matchingRule?.metadata_json);

    const dailyAggregateType = asString(ruleMetadata.daily_aggregate_type);
    const dailyAggregateKey = asString(ruleMetadata.daily_aggregate_key);
    const dailyMetricKey = asString(ruleMetadata.daily_metric_key);

    if (dailyAggregateType && dailyAggregateKey && dailyMetricKey) {
      const aggregateDelta = resolveAggregateDelta({
        dailyMetricKey,
        impactValueNumeric: impactRow.impact_value_numeric,
      });

      const metricUnit = resolveAggregateMetricUnit({
        dailyMetricKey,
        impactUnit: impactRow.impact_unit,
      });

      const dailyAggregate = await updateDailyAggregate({
        userId,
        eventId,
        aggregateDate,
        aggregateTimezone,
        aggregateType: dailyAggregateType,
        aggregateKey: dailyAggregateKey,
        metricKey: dailyMetricKey,
        metricUnit,
        delta: aggregateDelta,
      });

      dailyAggregates.push(dailyAggregate);
    }

    const currentSnapshot = await updateCurrentSnapshot({
      userId,
      eventId,
      snapshotEntityType: impactRow.impact_target_type,
      snapshotEntityKey: impactRow.impact_target_key,
      metricKey: impactRow.impact_metric,
      metricValueNumeric: impactRow.impact_value_numeric,
      metricValueText: impactRow.impact_value_text,
      metricUnit: impactRow.impact_unit,
    });

    currentSnapshots.push(currentSnapshot);
  }

  return {
    dailyAggregates,
    currentSnapshots,
  };
}

async function rollbackDailyAggregatesForImpactRows(params: {
  userId: string;
  eventId: string;
  previousStartedAt?: string | null;
  fallbackTimezone: string;
  impactRows: ImpactEventRow[];
  reason?: string | null;
}) {
  const {
    userId,
    eventId,
    previousStartedAt = null,
    fallbackTimezone,
    impactRows,
    reason = null,
  } = params;

  const rollbackDailyAggregates: unknown[] = [];

  for (const impactRow of impactRows) {
    const impactMetadata = asRecord(impactRow.metadata_json);
    const ruleMetadata = asRecord(impactMetadata.rule_metadata);

    const dailyAggregateType = asString(ruleMetadata.daily_aggregate_type);
    const dailyAggregateKey = asString(ruleMetadata.daily_aggregate_key);
    const dailyMetricKey = asString(ruleMetadata.daily_metric_key);

    if (!dailyAggregateType || !dailyAggregateKey || !dailyMetricKey) {
      continue;
    }

    const rollbackInfo = resolveRollbackAggregateDate({
      impactRow,
      previousStartedAt,
      fallbackTimezone,
    });

    const rollbackDelta =
      -1 *
      resolveAggregateDelta({
        dailyMetricKey,
        impactValueNumeric: asNumber(impactRow.impact_value_numeric),
      });

    const metricUnit = resolveAggregateMetricUnit({
      dailyMetricKey,
      impactUnit: impactRow.impact_unit,
    });

    const rollbackDailyAggregate = await updateDailyAggregate({
      userId,
      eventId,
      aggregateDate: rollbackInfo.aggregateDate,
      aggregateTimezone: rollbackInfo.aggregateTimezone,
      aggregateType: dailyAggregateType,
      aggregateKey: dailyAggregateKey,
      metricKey: dailyMetricKey,
      metricUnit,
      delta: rollbackDelta,
      updateReason: reason ?? "impact_recalculation_rollback",
      rollbackDateMode: rollbackInfo.dateMode,
    });

    rollbackDailyAggregates.push(rollbackDailyAggregate);
  }

  return rollbackDailyAggregates;
}

export async function processActivityImpacts(
  input: ProcessActivityImpactsInput
): Promise<ProcessActivityImpactsResult> {
  const {
    eventId,
    userId,
    activityTemplateId = null,
    activityTypeId = null,
    durationMinutes = null,
    startedAt = null,
    timezone = null,
  } = input;

  const aggregateTimezone = resolveImpactTimezone(timezone);
  const existingImpactEventsCount = await getExistingImpactEventsCount(eventId);

  if (existingImpactEventsCount > 0) {
    return {
      ok: true,
      skipped: true,
      reason: "Impact events already exist for this activity event.",
      impactEvents: [],
      dailyAggregates: [],
      currentSnapshots: [],
      counts: {
        impactRules: 0,
        impactEvents: existingImpactEventsCount,
        dailyAggregates: 0,
        currentSnapshots: 0,
      },
    };
  }

  const impactRules = await getImpactRules({
    activityTemplateId,
    activityTypeId,
  });

  if (impactRules.length === 0) {
    return {
      ok: true,
      skipped: true,
      reason: "No active impact rules found for this activity event.",
      impactEvents: [],
      dailyAggregates: [],
      currentSnapshots: [],
      counts: {
        impactRules: 0,
        impactEvents: 0,
        dailyAggregates: 0,
        currentSnapshots: 0,
      },
    };
  }

  const impactRows = buildImpactEventRows({
    eventId,
    impactRules,
    durationMinutes,
    aggregateTimezone,
  });

  const { data: impactEvents, error: impactEventsError } =
    impactRows.length > 0
      ? await supabase.from("impact_events").insert(impactRows).select()
      : { data: [], error: null };

  if (impactEventsError) {
    throw new Error(impactEventsError.message);
  }

  const aggregateDate = resolveAggregateDate({
    startedAt,
    timezone: aggregateTimezone,
  });

  const { dailyAggregates, currentSnapshots } = await updateDerivedMetrics({
    userId,
    eventId,
    aggregateDate,
    aggregateTimezone,
    impactRules,
    impactRows,
  });

  return {
    ok: true,
    skipped: false,
    reason: null,
    impactEvents: impactEvents ?? [],
    dailyAggregates,
    currentSnapshots,
    counts: {
      impactRules: impactRules.length,
      impactEvents: impactEvents?.length ?? 0,
      dailyAggregates: dailyAggregates.length,
      currentSnapshots: currentSnapshots.length,
    },
  };
}

export async function recalculateActivityImpacts(
  input: RecalculateActivityImpactsInput
): Promise<RecalculateActivityImpactsResult> {
  const {
    eventId,
    userId,
    activityTemplateId = null,
    activityTypeId = null,
    durationMinutes = null,
    startedAt = null,
    previousStartedAt = null,
    timezone = null,
    reason = null,
  } = input;

  const aggregateTimezone = resolveImpactTimezone(timezone);
  const previousImpactEvents = await getExistingImpactEvents(eventId);

  const rollbackDailyAggregates = await rollbackDailyAggregatesForImpactRows({
    userId,
    eventId,
    previousStartedAt,
    fallbackTimezone: aggregateTimezone,
    impactRows: previousImpactEvents,
    reason: reason ?? "activity_event_correction",
  });

  const deletedImpactEvents = await deleteImpactEvents(eventId);

  const recalculatedProcessor = await processActivityImpacts({
    eventId,
    userId,
    activityTemplateId,
    activityTypeId,
    durationMinutes,
    startedAt,
    timezone: aggregateTimezone,
  });

  return {
    ok: true,
    skipped: false,
    reason: null,
    previousImpactEvents,
    rollbackDailyAggregates,
    recalculatedImpactEvents: recalculatedProcessor.impactEvents,
    recalculatedDailyAggregates: recalculatedProcessor.dailyAggregates,
    recalculatedCurrentSnapshots: recalculatedProcessor.currentSnapshots,
    counts: {
      previousImpactEvents: previousImpactEvents.length,
      rollbackDailyAggregates: rollbackDailyAggregates.length,
      deletedImpactEvents,
      recalculatedImpactRules: recalculatedProcessor.counts.impactRules,
      recalculatedImpactEvents: recalculatedProcessor.counts.impactEvents,
      recalculatedDailyAggregates: recalculatedProcessor.counts.dailyAggregates,
      recalculatedCurrentSnapshots:
        recalculatedProcessor.counts.currentSnapshots,
    },
    recalculatedProcessor,
  };
}

export async function rollbackActivityImpacts(
  input: RollbackActivityImpactsInput
): Promise<RollbackActivityImpactsResult> {
  const {
    eventId,
    userId,
    previousStartedAt = null,
    timezone = null,
    reason = null,
    cleanupCurrentSnapshots = true,
  } = input;

  const aggregateTimezone = resolveImpactTimezone(timezone);
  const previousImpactEvents = await getExistingImpactEvents(eventId);

  const rollbackDailyAggregates = await rollbackDailyAggregatesForImpactRows({
    userId,
    eventId,
    previousStartedAt,
    fallbackTimezone: aggregateTimezone,
    impactRows: previousImpactEvents,
    reason: reason ?? "activity_event_status_rollback",
  });

  const deletedImpactEvents = await deleteImpactEvents(eventId);

  const deletedCurrentSnapshots = cleanupCurrentSnapshots
    ? await deleteCurrentSnapshotsForEvent({
        userId,
        eventId,
      })
    : 0;

  const skipped =
    previousImpactEvents.length === 0 &&
    rollbackDailyAggregates.length === 0 &&
    deletedImpactEvents === 0 &&
    deletedCurrentSnapshots === 0;

  return {
    ok: true,
    skipped,
    reason: skipped
      ? "No impact events, daily aggregates or current snapshots needed rollback."
      : null,
    previousImpactEvents,
    rollbackDailyAggregates,
    counts: {
      previousImpactEvents: previousImpactEvents.length,
      rollbackDailyAggregates: rollbackDailyAggregates.length,
      deletedImpactEvents,
      deletedCurrentSnapshots,
    },
  };
}