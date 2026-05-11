import { supabase } from "../supabase";

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

export type ProcessActivityImpactsInput = {
  eventId: string;
  userId: string;
  activityTemplateId?: string | null;
  activityTypeId?: string | null;
  durationMinutes?: number | null;
  startedAt?: string | null;
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
}) {
  const { eventId, impactRules, durationMinutes } = params;

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

function resolveAggregateDate(startedAt?: string | null) {
  if (startedAt) {
    return startedAt.slice(0, 10);
  }

  return new Date().toISOString().slice(0, 10);
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
  aggregateType: string;
  aggregateKey: string;
  metricKey: string;
  metricUnit: string | null;
  delta: number;
}) {
  const {
    userId,
    eventId,
    aggregateDate,
    aggregateType,
    aggregateKey,
    metricKey,
    metricUnit,
    delta,
  } = params;

  const { data: existingAggregate, error: existingAggregateError } =
    await supabase
      .from("daily_aggregates")
      .select("*")
      .eq("user_id", userId)
      .eq("aggregate_date", aggregateDate)
      .eq("aggregate_type", aggregateType)
      .eq("aggregate_key", aggregateKey)
      .eq("metric_key", metricKey)
      .maybeSingle();

  if (existingAggregateError) {
    throw new Error(existingAggregateError.message);
  }

  if (existingAggregate) {
    const currentValue = asNumber(existingAggregate.metric_value_numeric) ?? 0;

    const { data: updatedAggregate, error: updateError } = await supabase
      .from("daily_aggregates")
      .update({
        metric_value_numeric: currentValue + delta,
        metric_unit: metricUnit,
        last_event_id: eventId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingAggregate.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    return updatedAggregate;
  }

  const { data: createdAggregate, error: insertError } = await supabase
    .from("daily_aggregates")
    .insert({
      user_id: userId,
      aggregate_date: aggregateDate,
      aggregate_type: aggregateType,
      aggregate_key: aggregateKey,
      metric_key: metricKey,
      metric_value_numeric: delta,
      metric_unit: metricUnit,
      source: "rule",
      last_event_id: eventId,
      metadata_json: {
        processor: "activityImpactProcessor.v1",
      },
    })
    .select()
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return createdAggregate;
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

  const { data: existingSnapshot, error: existingSnapshotError } =
    await supabase
      .from("current_snapshots")
      .select("*")
      .eq("user_id", userId)
      .eq("snapshot_entity_type", snapshotEntityType)
      .eq("snapshot_entity_key", snapshotEntityKey)
      .eq("metric_key", metricKey)
      .maybeSingle();

  if (existingSnapshotError) {
    throw new Error(existingSnapshotError.message);
  }

  if (existingSnapshot) {
    const currentNumericValue =
      asNumber(existingSnapshot.metric_value_numeric) ?? 0;

    const nextNumericValue =
      metricValueNumeric === null
        ? existingSnapshot.metric_value_numeric
        : currentNumericValue + metricValueNumeric;

    const { data: updatedSnapshot, error: updateError } = await supabase
      .from("current_snapshots")
      .update({
        metric_value_numeric: nextNumericValue,
        metric_value_text:
          metricValueText ?? existingSnapshot.metric_value_text,
        metric_unit: metricUnit ?? existingSnapshot.metric_unit,
        last_event_id: eventId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingSnapshot.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    return updatedSnapshot;
  }

  const { data: createdSnapshot, error: insertError } = await supabase
    .from("current_snapshots")
    .insert({
      user_id: userId,
      snapshot_entity_type: snapshotEntityType,
      snapshot_entity_key: snapshotEntityKey,
      metric_key: metricKey,
      metric_value_numeric: metricValueNumeric,
      metric_value_text: metricValueText,
      metric_unit: metricUnit,
      last_event_id: eventId,
      metadata_json: {
        processor: "activityImpactProcessor.v1",
      },
    })
    .select()
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return createdSnapshot;
}

async function updateDerivedMetrics(params: {
  userId: string;
  eventId: string;
  aggregateDate: string;
  impactRules: ImpactRuleRow[];
  impactRows: ImpactEventInsertRow[];
}) {
  const { userId, eventId, aggregateDate, impactRules, impactRows } = params;

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
  } = input;

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
  });

  const { data: impactEvents, error: impactEventsError } =
    impactRows.length > 0
      ? await supabase.from("impact_events").insert(impactRows).select()
      : { data: [], error: null };

  if (impactEventsError) {
    throw new Error(impactEventsError.message);
  }

  const aggregateDate = resolveAggregateDate(startedAt);

  const { dailyAggregates, currentSnapshots } = await updateDerivedMetrics({
    userId,
    eventId,
    aggregateDate,
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