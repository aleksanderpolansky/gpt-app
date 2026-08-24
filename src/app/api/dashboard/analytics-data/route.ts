import { NextResponse } from "next/server";

import { getActivityUserContext } from "../../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../../lib/supabase";
import { listPublicGiftCertificates } from "@/app/certificates/gift-certificate-data";
import { isDashboardAnalyticsV2Supported } from "@/lib/dashboard/analytics-contract";
import { resolveLocalizedContentField } from "@/lib/localization/contentLocalization";
import {
  localizeGlobalSystemValueObject,
  normalizeGlobalSystemValueObjectLocale,
} from "@/lib/reality-core/global-system-value-object-localization";
import { aggregateRootTime } from "@/lib/dashboard/root-time-aggregation";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asRecord(value: unknown): Row {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Row;
}

function normalizeTimeZone(value: string | null): string {
  const candidate = value?.trim();
  if (!candidate || candidate.length > 100) return "UTC";

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return "UTC";
  }
}

function dateKeyInTimeZone(value: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return year && month && day
    ? `${year}-${month}-${day}`
    : value.toISOString().slice(0, 10);
}

function shiftDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function eventDateKey(row: Row, timeZone: string): string | null {
  const startedAt = asString(row.started_at);

  if (startedAt) {
    const startedDate = new Date(startedAt);
    if (!Number.isNaN(startedDate.getTime())) {
      return dateKeyInTimeZone(startedDate, timeZone);
    }
  }

  const observedDate = asString(asRecord(row.metadata_json).observedDate);
  if (observedDate && /^\d{4}-\d{2}-\d{2}$/.test(observedDate)) return observedDate;

  const createdAt = asString(row.created_at);
  if (!createdAt) return null;

  const createdDate = new Date(createdAt);
  return Number.isNaN(createdDate.getTime())
    ? null
    : dateKeyInTimeZone(createdDate, timeZone);
}

function durationMinutesForRow(row: Row): number {
  const canonicalDuration = asNumber(row.duration_minutes);
  if (canonicalDuration !== null && canonicalDuration >= 0) return canonicalDuration;

  const startedAt = asString(row.started_at);
  const endedAt = asString(row.ended_at);
  if (!startedAt || !endedAt) return 0;

  const started = new Date(startedAt);
  const ended = new Date(endedAt);

  if (
    Number.isNaN(started.getTime()) ||
    Number.isNaN(ended.getTime()) ||
    ended.getTime() <= started.getTime()
  ) return 0;

  return (ended.getTime() - started.getTime()) / 60_000;
}


function factDateKey(row: Row, timeZone: string): string | null {
  const periodStart = asString(row.period_start);
  if (periodStart) {
    const date = new Date(periodStart);
    if (!Number.isNaN(date.getTime())) return dateKeyInTimeZone(date, timeZone);
  }

  const createdAt = asString(row.created_at);
  if (!createdAt) return null;
  const createdDate = new Date(createdAt);
  return Number.isNaN(createdDate.getTime())
    ? null
    : dateKeyInTimeZone(createdDate, timeZone);
}

function chunkStrings(values: readonly string[], size = 200): string[][] {
  const chunks: string[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

async function buildFactDurationByRootResponse(input: {
  readonly blockId: string;
  readonly appUserId: string;
  readonly actorId: string;
  readonly periodDays: number;
  readonly timeZone: string;
  readonly locale: ReturnType<typeof normalizeGlobalSystemValueObjectLocale>;
}) {
  const todayKey = dateKeyInTimeZone(new Date(), input.timeZone);
  const firstKey = shiftDateKey(todayKey, -(input.periodDays - 1));
  const queryFromKey = shiftDateKey(firstKey, -1);
  const queryFromIso = queryFromKey + "T00:00:00.000Z";

  const ownedFactRows: Row[] = [];
  const factPageSize = 1000;
  const factHardLimit = 50000;

  for (let offset = 0; offset < factHardLimit; offset += factPageSize) {
    const { data, error } = await supabase
      .from("activity_object_facts")
      .select("id,period_start,created_at,fact_status,measure_type")
      .eq("user_id", input.appUserId)
      .eq("acting_as_actor_id", input.actorId)
      .eq("fact_status", "confirmed")
      .eq("measure_type", "duration")
      .or("period_start.gte." + queryFromIso + ",created_at.gte." + queryFromIso)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + factPageSize - 1);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const page = Array.isArray(data) ? (data as Row[]) : [];
    ownedFactRows.push(...page);
    if (page.length < factPageSize) break;

    if (ownedFactRows.length >= factHardLimit) {
      return NextResponse.json(
        { ok: false, error: "DASHBOARD_ROOT_TIME_FACT_HARD_LIMIT_REACHED" },
        { status: 409 },
      );
    }
  }

  const eligibleBaseFacts = ownedFactRows.filter((row) => {
    const date = factDateKey(row, input.timeZone);
    return Boolean(date && date >= firstKey && date <= todayKey);
  });

  const eligibleFactIds = eligibleBaseFacts
    .map((row) => asString(row.id))
    .filter((value): value is string => Boolean(value));

  const analyticsRows: Row[] = [];
  for (const ids of chunkStrings(eligibleFactIds)) {
    const { data, error } = await supabase
      .from("activity_fact_analytics_inputs_v1")
      .select(
        "fact_id,activity_event_id,value_object_id,metric_value_numeric,unit,occurred_at,created_at,measure_type",
      )
      .in("fact_id", ids);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    analyticsRows.push(...(Array.isArray(data) ? (data as Row[]) : []));
  }

  const durationProjectionRows = analyticsRows.filter(
    (row) =>
      asString(row.measure_type) === "duration" &&
      Boolean(asString(row.value_object_id)),
  );

  const leafIds = Array.from(
    new Set(
      durationProjectionRows
        .map((row) => asString(row.value_object_id))
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const activityEventIds = Array.from(
    new Set(
      durationProjectionRows
        .map((row) => asString(row.activity_event_id))
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const leafRows: Row[] = [];
  for (const ids of chunkStrings(leafIds)) {
    const { data, error } = await supabase
      .from("value_objects")
      .select("id,root_value_object_id")
      .in("id", ids);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    leafRows.push(...(Array.isArray(data) ? (data as Row[]) : []));
  }

  const leafToRoot = new Map<string, string>();
  for (const row of leafRows) {
    const leafId = asString(row.id);
    const rootId = asString(row.root_value_object_id);
    if (leafId && rootId) leafToRoot.set(leafId, rootId);
  }

  const eventDurationMinutes = new Map<string, number>();
  for (const ids of chunkStrings(activityEventIds)) {
    const { data, error } = await supabase
      .from("activity_events")
      .select("id,started_at,ended_at,duration_minutes")
      .eq("user_id", input.appUserId)
      .eq("acting_as_actor_id", input.actorId)
      .in("id", ids);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    for (const raw of Array.isArray(data) ? data : []) {
      const row = raw as Row;
      const activityEventId = asString(row.id);
      if (!activityEventId) continue;
      const minutes = durationMinutesForRow(row);
      if (Number.isFinite(minutes) && minutes >= 0) {
        eventDurationMinutes.set(activityEventId, minutes);
      }
    }
  }

  const aggregation = aggregateRootTime({
    facts: durationProjectionRows.flatMap((row) => {
      const activityEventId = asString(row.activity_event_id);
      const valueObjectId = asString(row.value_object_id);
      const valueNumeric = asNumber(row.metric_value_numeric);
      const unit = asString(row.unit);
      return activityEventId && valueObjectId && valueNumeric !== null && unit
        ? [{ activityEventId, valueObjectId, valueNumeric, unit }]
        : [];
    }),
    leafToRoot,
    eventDurationMinutes,
  });

  const rootIds = aggregation.roots.map((row) => row.rootValueObjectId);
  const rootRows: Row[] = [];
  for (const ids of chunkStrings(rootIds)) {
    const { data, error } = await supabase
      .from("value_objects")
      .select("id,title,canonical_key,scope_code,metadata_json")
      .in("id", ids);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    rootRows.push(...(Array.isArray(data) ? (data as Row[]) : []));
  }

  const rootTitles = new Map<string, string>();
  for (const row of rootRows) {
    const id = asString(row.id);
    if (!id) continue;

    const fallbackTitle = asString(row.title) ?? id;
    const localizedTitle =
      asString(row.scope_code) === "global"
        ? asString(
            localizeGlobalSystemValueObject(
              {
                canonical_key: asString(row.canonical_key),
                title: fallbackTitle,
              },
              input.locale,
            ).title,
          ) ?? fallbackTitle
        : resolveLocalizedContentField({
            metadata: row.metadata_json,
            locale: input.locale,
            fieldCode: "title",
            fallback: fallbackTitle,
          }) ?? fallbackTitle;

    rootTitles.set(id, localizedTitle);
  }

  const rootBreakdown = aggregation.roots.map((row) => ({
    rootValueObjectId: row.rootValueObjectId,
    rootTitle: rootTitles.get(row.rootValueObjectId) ?? row.rootValueObjectId,
    valueMinutes: row.valueMinutes,
    valueHours: Math.round((row.valueMinutes / 60) * 100) / 100,
    percentage:
      aggregation.totalSemanticMinutes > 0
        ? Math.round(
            (row.valueMinutes / aggregation.totalSemanticMinutes) * 10000,
          ) / 100
        : 0,
    activityCount: row.activityCount,
    factProjectionCount: row.factProjectionCount,
  }));

  return NextResponse.json({
    ok: true,
    kind: "fact-duration-by-root",
    blockId: input.blockId,
    timeZone: input.timeZone,
    locale: input.locale,
    sourceType: "facts",
    metricKey: "duration_minutes",
    aggregationKey: "sum",
    groupByKey: "observation_object",
    periodDays: input.periodDays,
    unit: "minutes",
    totalSemanticMinutes: aggregation.totalSemanticMinutes,
    uniqueActivityMinutes: aggregation.uniqueActivityMinutes,
    overlapDetected: aggregation.overlapDetected,
    skippedFactCount: aggregation.skippedFacts,
    sourceFactCount: eligibleBaseFacts.length,
    sourceProjectionCount: durationProjectionRows.length,
    aggregationPolicy:
      "owned confirmed duration facts -> final fact tags -> canonical measure values -> leaf root; once per activity/root; canonical activity duration preferred",
    schemaMode:
      "activity_fact_analytics_inputs_v1 (final tags + activity_event_measures value source)",
    rootBreakdown,
  });
}

async function buildCertificateMapResponse(blockId: string) {
  try {
    const certificates = await listPublicGiftCertificates();
    const markers = certificates
      .filter(
        (item) =>
          item.flowState === "available" &&
          item.publicVisibilityStatus === "visible" &&
          item.providerLocation?.latitude !== null &&
          item.providerLocation?.latitude !== undefined &&
          item.providerLocation?.longitude !== null &&
          item.providerLocation?.longitude !== undefined,
      )
      .map((item) => ({
        activityEventId: item.activityEventId,
        title: item.title,
        providerDisplayName: item.providerDisplayName,
        latitude: item.providerLocation?.latitude ?? null,
        longitude: item.providerLocation?.longitude ?? null,
        city: item.providerLocation?.city ?? null,
        district: item.providerLocation?.district ?? null,
        countryCode: item.providerLocation?.countryCode ?? null,
        pointsPrice: item.pointsPrice,
        moneyRemainder: item.moneyRemainder,
        providerCurrency: item.providerCurrency,
      }))
      .filter(
        (item) =>
          typeof item.latitude === "number" &&
          Number.isFinite(item.latitude) &&
          typeof item.longitude === "number" &&
          Number.isFinite(item.longitude),
      );

    return NextResponse.json({
      ok: true,
      kind: "certificate-map",
      blockId,
      availableCertificateCount: markers.length,
      markers,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not load certificate map",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const { appUser, personActor, errorResponse } = await getActivityUserContext();

  if (errorResponse) return errorResponse;

  if (!appUser || !personActor) {
    return NextResponse.json(
      { ok: false, error: "Dashboard actor context not found" },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const blockId = url.searchParams.get("blockId")?.trim();
  const timeZone = normalizeTimeZone(url.searchParams.get("timeZone"));
  const locale = normalizeGlobalSystemValueObjectLocale(
    url.searchParams.get("locale"),
  );

  if (!blockId) {
    return NextResponse.json(
      { ok: false, error: "Analytics block id is required" },
      { status: 400 },
    );
  }

  const { data: blockRaw, error: blockError } = await supabase
    .from("dashboard_analytics_blocks")
    .select("*")
    .eq("id", blockId)
    .eq("owner_user_id", appUser.id)
    .eq("owner_actor_id", personActor.id)
    .eq("is_visible", true)
    .single();

  if (blockError || !blockRaw) {
    return NextResponse.json(
      { ok: false, error: blockError?.message ?? "Analytics block not found" },
      { status: blockError?.code === "PGRST116" ? 404 : 500 },
    );
  }

  const block = blockRaw as Row;
  const input = {
    visualizationType: asString(block.visualization_type) as
      | "line"
      | "bar"
      | "metric"
      | "map"
      | "donut",
    sourceType: asString(block.source_type) as
      | "activities"
      | "facts"
      | "certificates",
    metricKey: asString(block.metric_key) ?? "",
    aggregationKey: asString(block.aggregation_key) as "sum" | "count",
    groupByKey: asString(block.group_by_key) as
      | "day"
      | "observation_object"
      | "location",
    periodDays: Number(block.period_days),
  };

  if (!isDashboardAnalyticsV2Supported(input)) {
    return NextResponse.json(
      { ok: false, error: "Analytics block configuration is not executable in v2" },
      { status: 422 },
    );
  }

  if (
    input.visualizationType === "donut" &&
    input.sourceType === "facts" &&
    input.metricKey === "duration_minutes" &&
    input.aggregationKey === "sum" &&
    input.groupByKey === "observation_object"
  ) {
    return buildFactDurationByRootResponse({
      blockId,
      appUserId: appUser.id,
      actorId: personActor.id,
      periodDays: input.periodDays,
      timeZone,
      locale,
    });
  }

  if (input.visualizationType === "map" && input.sourceType === "certificates") {
    return buildCertificateMapResponse(blockId);
  }

  const todayKey = dateKeyInTimeZone(new Date(), timeZone);
  const firstKey = shiftDateKey(todayKey, -(input.periodDays - 1));
  const queryFromKey = shiftDateKey(firstKey, -1);
  const queryFromIso = `${queryFromKey}T00:00:00.000Z`;

  const { data: eventRowsRaw, error: eventsError } = await supabase
    .from("activity_events")
    .select("id,status,activity_role_code,started_at,ended_at,duration_minutes,created_at,metadata_json")
    .eq("user_id", appUser.id)
    .eq("acting_as_actor_id", personActor.id)
    .eq("activity_role_code", "actual")
    .neq("status", "cancelled")
    .neq("status", "archived")
    .or(`started_at.gte.${queryFromIso},created_at.gte.${queryFromIso}`)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (eventsError) {
    return NextResponse.json({ ok: false, error: eventsError.message }, { status: 500 });
  }

  const buckets = new Map<string, { valueMinutes: number; activityCount: number }>();

  for (let offset = 0; offset < input.periodDays; offset += 1) {
    buckets.set(shiftDateKey(firstKey, offset), { valueMinutes: 0, activityCount: 0 });
  }

  for (const rawRow of Array.isArray(eventRowsRaw) ? eventRowsRaw : []) {
    const row = rawRow as Row;
    const date = eventDateKey(row, timeZone);
    if (!date || !buckets.has(date)) continue;

    const current = buckets.get(date);
    if (!current) continue;

    current.valueMinutes += durationMinutesForRow(row);
    current.activityCount += 1;
  }

  const series = Array.from(buckets.entries()).map(([date, bucket]) => ({
    date,
    valueMinutes: Math.round(bucket.valueMinutes * 100) / 100,
    valueHours: Math.round((bucket.valueMinutes / 60) * 100) / 100,
    activityCount: bucket.activityCount,
  }));

  const totalMinutes =
    Math.round(series.reduce((sum, row) => sum + row.valueMinutes, 0) * 100) / 100;

  return NextResponse.json({
    ok: true,
    kind:
      input.metricKey === "activity_count"
        ? "activity-count"
        : "activity-duration",
    blockId,
    timeZone,
    sourceType: input.sourceType,
    metricKey: input.metricKey,
    aggregationKey: input.aggregationKey,
    groupByKey: input.groupByKey,
    periodDays: input.periodDays,
    unit: "minutes",
    totalMinutes,
    activityCount: series.reduce((sum, row) => sum + row.activityCount, 0),
    series,
  });
}