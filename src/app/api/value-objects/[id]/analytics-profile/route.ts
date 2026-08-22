import { NextResponse } from "next/server";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../../lib/actor-context";
import { auth0 } from "../../../../../../lib/auth0";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type JsonRecord = Record<string, unknown>;
type CalculationMode =
  | "latest_value"
  | "sum_facts"
  | "baseline_plus_facts"
  | "effect_rules";
type DesiredDirection = "increase" | "decrease" | "maintain";

type ProfileRow = {
  id: string;
  owner_user_id: string;
  owner_actor_id: string;
  target_value_object_id: string;
  accumulated_unit_code: string;
  calculation_mode: CalculationMode;
  source_parameter_code: string;
  baseline_value: number;
  target_value: number | null;
  critical_value: number | null;
  desired_direction: DesiredDirection;
  refresh_period_days: number | null;
  inactivity_delta: number;
  trend_window_days: number;
  tracking_started_at: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type RuleRow = {
  id: string;
  client_rule_id: string;
  target_value_object_id: string;
  source_value_object_id: string;
  source_parameter_code: string;
  coefficient: number;
  status: string;
  created_at: string;
  retired_at: string | null;
};

type FactRow = {
  value_object_id: string | null;
  value_numeric: number | string | null;
  measure_type: string;
  period_start: string | null;
  period_end: string | null;
  metadata: JsonRecord | null;
  created_at: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PARAMETER_RE = /^[a-z][a-z0-9_]{0,79}$/;
const PAGE_SIZE = 1000;
const FACT_HARD_LIMIT = 50000;
const DAY_MS = 86_400_000;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function finiteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function integerOrNull(value: unknown): number | null {
  const parsed = finiteNumber(value);
  return parsed !== null && Number.isInteger(parsed) ? parsed : null;
}

function factParameterCode(fact: FactRow): string {
  const metadata = asRecord(fact.metadata);

  return (
    text(metadata.parameterCode) ||
    text(metadata.systemParameterCode) ||
    text(fact.measure_type)
  ).toLowerCase();
}

function factTimestampMs(fact: FactRow): number {
  const raw = fact.period_end || fact.period_start || fact.created_at;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function factNumericValue(fact: FactRow): number | null {
  return finiteNumber(fact.value_numeric);
}

async function resolveRequestContext() {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return {
      context: null,
      errorResponse: NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      ),
    };
  }

  try {
    return {
      context: await resolveActiveActorContext(session.user.sub),
      errorResponse: null,
    };
  } catch (error) {
    if (error instanceof ActorContextError) {
      return {
        context: null,
        errorResponse: NextResponse.json(
          { ok: false, error: error.message, errorCode: error.code },
          { status: error.status },
        ),
      };
    }
    throw error;
  }
}

async function loadAccessibleLeaf(
  valueObjectId: string,
  appUserId: string,
  actorId: string,
) {
  const { data, error } = await supabase
    .from("value_objects")
    .select(
      "id,title,scope_code,owner_user_id,owner_actor_id,status,ontology_node_role_code,facet_code,object_kind_code",
    )
    .eq("id", valueObjectId)
    .single();

  if (error || !data) {
    return null;
  }

  const row = data as {
    id: string;
    title: string;
    scope_code: string | null;
    owner_user_id: string | null;
    owner_actor_id: string | null;
    status: string;
    ontology_node_role_code: string | null;
    facet_code: string | null;
    object_kind_code: string | null;
  };

  if (row.ontology_node_role_code !== "leaf") {
    return null;
  }

  const globalAllowed =
    row.scope_code === "global" &&
    row.owner_user_id === null &&
    row.owner_actor_id === null &&
    row.status === "active";

  const actorAllowed =
    row.scope_code === "actor" &&
    row.owner_user_id === appUserId &&
    row.owner_actor_id === actorId &&
    (row.status === "draft" || row.status === "active");

  return globalAllowed || actorAllowed ? row : null;
}

async function loadFacts(
  appUserId: string,
  actorId: string,
  valueObjectIds: string[],
): Promise<FactRow[]> {
  if (valueObjectIds.length === 0) {
    return [];
  }

  const facts: FactRow[] = [];

  for (let from = 0; from < FACT_HARD_LIMIT; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("activity_object_analytics_inputs_v1")
      .select(
        "value_object_id,value_numeric,measure_type,period_start,period_end,metadata,created_at",
      )
      .eq("user_id", appUserId)
      .eq("acting_as_actor_id", actorId)
      .eq("fact_status", "confirmed")
      .in("value_object_id", valueObjectIds)
      .order("created_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(error.message);
    }

    const page = (data ?? []) as FactRow[];
    facts.push(...page);

    if (page.length < PAGE_SIZE) {
      return facts;
    }
  }

  throw new Error(
    `Analytics fact limit exceeded (${FACT_HARD_LIMIT}). Narrow the model before calculating.`,
  );
}

function countMissedRefreshPeriods(
  profile: ProfileRow,
  targetFacts: FactRow[],
  asOfMs: number,
): number {
  const refreshDays = profile.refresh_period_days;

  if (!refreshDays || refreshDays <= 0) {
    return 0;
  }

  const trackingStartMs = Date.parse(profile.tracking_started_at);
  if (!Number.isFinite(trackingStartMs) || asOfMs <= trackingStartMs) {
    return 0;
  }

  const refreshMs = refreshDays * DAY_MS;
  const fullPeriods = Math.floor((asOfMs - trackingStartMs) / refreshMs);
  if (fullPeriods <= 0) {
    return 0;
  }

  const targetFactTimes = targetFacts
    .map(factTimestampMs)
    .filter((time) => time >= trackingStartMs && time <= asOfMs)
    .sort((left, right) => left - right);

  let missed = 0;
  let cursor = 0;

  for (let index = 0; index < fullPeriods; index += 1) {
    const periodStart = trackingStartMs + index * refreshMs;
    const periodEnd = periodStart + refreshMs;

    while (
      cursor < targetFactTimes.length &&
      targetFactTimes[cursor] < periodStart
    ) {
      cursor += 1;
    }

    if (
      cursor >= targetFactTimes.length ||
      targetFactTimes[cursor] >= periodEnd
    ) {
      missed += 1;
    }
  }

  return missed;
}

function calculateAt(
  profile: ProfileRow,
  rules: RuleRow[],
  facts: FactRow[],
  asOfMs: number,
) {
  const trackingStartMs = Date.parse(profile.tracking_started_at);

  const eligibleFacts = facts.filter((fact) => {
    const time = factTimestampMs(fact);
    return (
      time > 0 &&
      time <= asOfMs &&
      (!Number.isFinite(trackingStartMs) || time >= trackingStartMs)
    );
  });

  const targetFacts = eligibleFacts.filter(
    (fact) => fact.value_object_id === profile.target_value_object_id,
  );

  const targetNumericFacts = targetFacts.filter(
    (fact) =>
      factParameterCode(fact) === profile.source_parameter_code &&
      factNumericValue(fact) !== null,
  );

  let value = profile.baseline_value;
  let factContributions = 0;

  if (profile.calculation_mode === "latest_value") {
    const latest = [...targetNumericFacts].sort(
      (left, right) => factTimestampMs(right) - factTimestampMs(left),
    )[0];
    const latestValue = latest ? factNumericValue(latest) : null;
    value = latestValue ?? profile.baseline_value;
    factContributions = latestValue === null ? 0 : 1;
  } else if (profile.calculation_mode === "sum_facts") {
    const values = targetNumericFacts
      .map(factNumericValue)
      .filter((item): item is number => item !== null);
    value = values.reduce((sum, item) => sum + item, 0);
    factContributions = values.length;
  } else if (profile.calculation_mode === "baseline_plus_facts") {
    const values = targetNumericFacts
      .map(factNumericValue)
      .filter((item): item is number => item !== null);
    value =
      profile.baseline_value + values.reduce((sum, item) => sum + item, 0);
    factContributions = values.length;
  } else {
    value = profile.baseline_value;

    for (const rule of rules.filter((item) => item.status === "active")) {
      for (const fact of eligibleFacts) {
        if (
          fact.value_object_id === rule.source_value_object_id &&
          factParameterCode(fact) === rule.source_parameter_code
        ) {
          const numeric = factNumericValue(fact);
          if (numeric !== null) {
            value += numeric * rule.coefficient;
            factContributions += 1;
          }
        }
      }
    }
  }

  const missedRefreshPeriods = countMissedRefreshPeriods(
    profile,
    targetFacts,
    asOfMs,
  );

  if (
    profile.calculation_mode === "baseline_plus_facts" ||
    profile.calculation_mode === "effect_rules"
  ) {
    value += missedRefreshPeriods * profile.inactivity_delta;
  }

  return { value, factContributions, missedRefreshPeriods };
}

function daysToBoundary(
  currentValue: number,
  boundary: number | null,
  ratePerDay: number | null,
): number | null {
  if (boundary === null) {
    return null;
  }

  if (boundary === currentValue) {
    return 0;
  }

  if (ratePerDay === null || ratePerDay === 0) {
    return null;
  }

  const days = (boundary - currentValue) / ratePerDay;
  return Number.isFinite(days) && days >= 0 ? days : null;
}

function expectedDate(asOfMs: number, days: number | null): string | null {
  return days === null ? null : new Date(asOfMs + days * DAY_MS).toISOString();
}

async function loadAnalyticsBundle(
  appUserId: string,
  actorId: string,
  targetValueObjectId: string,
) {
  const { data: profileData, error: profileError } = await supabase
    .from("value_object_analytics_profiles_v1")
    .select("*")
    .eq("owner_user_id", appUserId)
    .eq("owner_actor_id", actorId)
    .eq("target_value_object_id", targetValueObjectId)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  const { data: ruleData, error: ruleError } = await supabase
    .from("value_object_analytics_effect_rules_v1")
    .select(
      "id,client_rule_id,target_value_object_id,source_value_object_id,source_parameter_code,coefficient,status,created_at,retired_at",
    )
    .eq("owner_user_id", appUserId)
    .eq("owner_actor_id", actorId)
    .eq("target_value_object_id", targetValueObjectId)
    .order("created_at", { ascending: true });

  if (ruleError) {
    throw new Error(ruleError.message);
  }

  const profile = (profileData ?? null) as ProfileRow | null;
  const rules = (ruleData ?? []) as RuleRow[];

  if (!profile) {
    return { profile: null, rules: [], state: null };
  }

  const sourceIds = [
    targetValueObjectId,
    ...rules
      .filter((rule) => rule.status === "active")
      .map((rule) => rule.source_value_object_id),
  ];
  const uniqueSourceIds = [...new Set(sourceIds)];
  const facts = await loadFacts(appUserId, actorId, uniqueSourceIds);

  const nowMs = Date.now();
  const requestedPriorMs = nowMs - profile.trend_window_days * DAY_MS;
  const trackingStartMs = Date.parse(profile.tracking_started_at);
  const priorMs = Number.isFinite(trackingStartMs)
    ? Math.max(requestedPriorMs, trackingStartMs)
    : requestedPriorMs;

  const current = calculateAt(profile, rules, facts, nowMs);
  const previous = calculateAt(profile, rules, facts, priorMs);
  const actualTrendDays = Math.max((nowMs - priorMs) / DAY_MS, 0);
  const trendDelta = current.value - previous.value;
  const ratePerDay = actualTrendDays > 0 ? trendDelta / actualTrendDays : null;
  const daysToTarget = daysToBoundary(
    current.value,
    profile.target_value,
    ratePerDay,
  );
  const daysToCritical = daysToBoundary(
    current.value,
    profile.critical_value,
    ratePerDay,
  );

  const sourceObjectIds = [
    ...new Set(rules.map((rule) => rule.source_value_object_id)),
  ];
  const sourceTitles = new Map<string, string>();

  if (sourceObjectIds.length > 0) {
    const { data: sourceRows, error: sourceError } = await supabase
      .from("value_objects")
      .select("id,title")
      .in("id", sourceObjectIds);

    if (sourceError) {
      throw new Error(sourceError.message);
    }

    for (const row of sourceRows ?? []) {
      sourceTitles.set(String(row.id), String(row.title ?? row.id));
    }
  }

  return {
    profile,
    rules: rules.map((rule) => ({
      ...rule,
      sourceValueObjectTitle:
        sourceTitles.get(rule.source_value_object_id) ??
        rule.source_value_object_id,
    })),
    state: {
      currentValue: current.value,
      accumulatedUnitCode: profile.accumulated_unit_code,
      trendDelta,
      trendDirection:
        trendDelta > 0 ? "up" : trendDelta < 0 ? "down" : "flat",
      movingDesired:
        profile.desired_direction === "increase"
          ? trendDelta >= 0
          : profile.desired_direction === "decrease"
            ? trendDelta <= 0
            : trendDelta === 0,
      ratePerDay,
      actualTrendDays,
      targetValue: profile.target_value,
      criticalValue: profile.critical_value,
      daysToTarget,
      expectedTargetAt: expectedDate(nowMs, daysToTarget),
      daysToCritical,
      expectedCriticalAt: expectedDate(nowMs, daysToCritical),
      missedRefreshPeriods: current.missedRefreshPeriods,
      factContributions: current.factContributions,
      calculatedAt: new Date(nowMs).toISOString(),
    },
  };
}

export async function GET(_request: Request, routeContext: RouteContext) {
  const resolved = await resolveRequestContext();
  if (resolved.errorResponse) {
    return resolved.errorResponse;
  }
  if (!resolved.context) {
    return NextResponse.json(
      { ok: false, error: "Actor context unavailable" },
      { status: 500 },
    );
  }

  const { id } = await routeContext.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json(
      { ok: false, error: "Invalid Value Object id" },
      { status: 400 },
    );
  }

  const leaf = await loadAccessibleLeaf(
    id,
    resolved.context.appUserId,
    resolved.context.actorId,
  );
  if (!leaf) {
    return NextResponse.json(
      { ok: false, error: "Accessible ontology leaf not found" },
      { status: 404 },
    );
  }

  try {
    return NextResponse.json({
      ok: true,
      contract: "ARCTOR_VO_ANALYTICS_PROFILE_V1",
      target: leaf,
      ...(await loadAnalyticsBundle(
        resolved.context.appUserId,
        resolved.context.actorId,
        id,
      )),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Analytics read failed",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, routeContext: RouteContext) {
  const resolved = await resolveRequestContext();
  if (resolved.errorResponse) {
    return resolved.errorResponse;
  }
  if (!resolved.context) {
    return NextResponse.json(
      { ok: false, error: "Actor context unavailable" },
      { status: 500 },
    );
  }

  const { id } = await routeContext.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json(
      { ok: false, error: "Invalid Value Object id" },
      { status: 400 },
    );
  }

  const leaf = await loadAccessibleLeaf(
    id,
    resolved.context.appUserId,
    resolved.context.actorId,
  );
  if (!leaf) {
    return NextResponse.json(
      { ok: false, error: "Accessible ontology leaf not found" },
      { status: 404 },
    );
  }

  let body: JsonRecord;
  try {
    body = asRecord(await request.json());
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const accumulatedUnitCode = text(body.accumulatedUnitCode);
  const calculationMode = text(body.calculationMode);
  const sourceParameterCode = text(body.sourceParameterCode).toLowerCase();
  const baselineValue = finiteNumber(body.baselineValue);
  const targetValue = finiteNumber(body.targetValue);
  const criticalValue = finiteNumber(body.criticalValue);
  const desiredDirection = text(body.desiredDirection);
  const refreshPeriodDays =
    body.refreshPeriodDays === null || body.refreshPeriodDays === ""
      ? null
      : integerOrNull(body.refreshPeriodDays);
  const inactivityDelta = finiteNumber(body.inactivityDelta);
  const trendWindowDays = integerOrNull(body.trendWindowDays);

  if (
    !accumulatedUnitCode ||
    accumulatedUnitCode.length > 64 ||
    ![
      "latest_value",
      "sum_facts",
      "baseline_plus_facts",
      "effect_rules",
    ].includes(calculationMode) ||
    !PARAMETER_RE.test(sourceParameterCode) ||
    baselineValue === null ||
    !["increase", "decrease", "maintain"].includes(desiredDirection) ||
    (refreshPeriodDays !== null &&
      (refreshPeriodDays < 1 || refreshPeriodDays > 3650)) ||
    inactivityDelta === null ||
    trendWindowDays === null ||
    trendWindowDays < 1 ||
    trendWindowDays > 3650
  ) {
    return NextResponse.json(
      { ok: false, error: "Analytics profile payload is invalid" },
      { status: 400 },
    );
  }

  const { data: existing, error: existingError } = await supabase
    .from("value_object_analytics_profiles_v1")
    .select("tracking_started_at")
    .eq("owner_user_id", resolved.context.appUserId)
    .eq("owner_actor_id", resolved.context.actorId)
    .eq("target_value_object_id", id)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json(
      { ok: false, error: existingError.message },
      { status: 500 },
    );
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("value_object_analytics_profiles_v1")
    .upsert(
      {
        owner_user_id: resolved.context.appUserId,
        owner_actor_id: resolved.context.actorId,
        target_value_object_id: id,
        accumulated_unit_code: accumulatedUnitCode,
        calculation_mode: calculationMode,
        source_parameter_code: sourceParameterCode,
        baseline_value: baselineValue,
        target_value: targetValue,
        critical_value: criticalValue,
        desired_direction: desiredDirection,
        refresh_period_days: refreshPeriodDays,
        inactivity_delta: inactivityDelta,
        trend_window_days: trendWindowDays,
        tracking_started_at:
          (existing as { tracking_started_at?: string } | null)
            ?.tracking_started_at ?? now,
        status: "active",
        metadata_json: {
          contract: "ARCTOR_VO_ANALYTICS_PROFILE_V1",
          rawFactsRemainImmutable: true,
        },
        updated_at: now,
      },
      {
        onConflict: "owner_user_id,owner_actor_id,target_value_object_id",
      },
    );

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 409 },
    );
  }

  return NextResponse.json({
    ok: true,
    ...(await loadAnalyticsBundle(
      resolved.context.appUserId,
      resolved.context.actorId,
      id,
    )),
  });
}

export async function POST(request: Request, routeContext: RouteContext) {
  const resolved = await resolveRequestContext();
  if (resolved.errorResponse) {
    return resolved.errorResponse;
  }
  if (!resolved.context) {
    return NextResponse.json(
      { ok: false, error: "Actor context unavailable" },
      { status: 500 },
    );
  }

  const { id } = await routeContext.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json(
      { ok: false, error: "Invalid Value Object id" },
      { status: 400 },
    );
  }

  const target = await loadAccessibleLeaf(
    id,
    resolved.context.appUserId,
    resolved.context.actorId,
  );
  if (!target) {
    return NextResponse.json(
      { ok: false, error: "Accessible target leaf not found" },
      { status: 404 },
    );
  }

  let body: JsonRecord;
  try {
    body = asRecord(await request.json());
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const action = text(body.action);

  if (action === "retire_rule") {
    const ruleId = text(body.ruleId);
    if (!UUID_RE.test(ruleId)) {
      return NextResponse.json(
        { ok: false, error: "Invalid ruleId" },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("value_object_analytics_effect_rules_v1")
      .update({
        status: "retired",
        retired_at: now,
        updated_at: now,
      })
      .eq("id", ruleId)
      .eq("owner_user_id", resolved.context.appUserId)
      .eq("owner_actor_id", resolved.context.actorId)
      .eq("target_value_object_id", id)
      .eq("status", "active")
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        { ok: false, error: error?.message ?? "Rule not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      ...(await loadAnalyticsBundle(
        resolved.context.appUserId,
        resolved.context.actorId,
        id,
      )),
    });
  }

  if (action !== "save_rule") {
    return NextResponse.json(
      { ok: false, error: "Unknown analytics action" },
      { status: 400 },
    );
  }

  const clientRuleId = text(body.clientRuleId);
  const sourceValueObjectId = text(body.sourceValueObjectId);
  const sourceParameterCode = text(body.sourceParameterCode).toLowerCase();
  const coefficient = finiteNumber(body.coefficient);

  if (
    !UUID_RE.test(clientRuleId) ||
    !UUID_RE.test(sourceValueObjectId) ||
    !PARAMETER_RE.test(sourceParameterCode) ||
    coefficient === null
  ) {
    return NextResponse.json(
      { ok: false, error: "Analytics effect rule payload is invalid" },
      { status: 400 },
    );
  }

  const source = await loadAccessibleLeaf(
    sourceValueObjectId,
    resolved.context.appUserId,
    resolved.context.actorId,
  );
  if (!source) {
    return NextResponse.json(
      { ok: false, error: "Accessible source leaf not found" },
      { status: 404 },
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("value_object_analytics_profiles_v1")
    .select("id")
    .eq("owner_user_id", resolved.context.appUserId)
    .eq("owner_actor_id", resolved.context.actorId)
    .eq("target_value_object_id", id)
    .eq("status", "active")
    .maybeSingle();

  if (profileError) {
    return NextResponse.json(
      { ok: false, error: profileError.message },
      { status: 500 },
    );
  }

  if (!profile) {
    return NextResponse.json(
      {
        ok: false,
        error: "Save the analytics profile before adding effect rules",
      },
      { status: 409 },
    );
  }

  const { error } = await supabase
    .from("value_object_analytics_effect_rules_v1")
    .insert({
      client_rule_id: clientRuleId,
      owner_user_id: resolved.context.appUserId,
      owner_actor_id: resolved.context.actorId,
      target_value_object_id: id,
      source_value_object_id: sourceValueObjectId,
      source_parameter_code: sourceParameterCode,
      coefficient,
      status: "active",
      metadata_json: {
        contract: "ARCTOR_VO_ANALYTICS_EFFECT_RULE_V1",
        rawFactsRemainImmutable: true,
      },
    });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 409 },
    );
  }

  return NextResponse.json({
    ok: true,
    ...(await loadAnalyticsBundle(
      resolved.context.appUserId,
      resolved.context.actorId,
      id,
    )),
  });
}
