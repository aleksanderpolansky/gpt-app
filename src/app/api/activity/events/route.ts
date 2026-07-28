import { after, NextResponse } from "next/server";
import {
  ACTIVITY_RECORDING_DEFAULT_LIMIT,
  ACTIVITY_RECORDING_DISABLED_MESSAGE,
  ACTIVITY_RECORDING_ENABLED,
  ACTIVITY_RECORDING_MAX_LIMIT,
} from "../../../../../lib/activity/activityRecordingConfig";
import { getActivityUserContext } from "../../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../../lib/supabase";
import { createActivityEventViaPp1Rpc } from "@/lib/activity/pp1/createActivityEventRpc";
import {
  claimActivitySemanticEnrichmentRunCux4,
  createActivitySemanticEnrichmentRunCux4,
  processActivitySemanticEnrichmentRunCux4,
} from "@/lib/calendar/activitySemanticEnrichment.server";
import type {
  ActivityCreatePp1,
  ActivityScheduleModeCodePp1,
} from "@/types/activity-model-pp1";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

type DateRange = {
  from: string;
  to: string;
};

function parseLimit(searchParams: URLSearchParams): number {
  const rawLimit = searchParams.get("limit");

  if (!rawLimit) {
    return ACTIVITY_RECORDING_DEFAULT_LIMIT;
  }

  const parsedLimit = Number.parseInt(rawLimit, 10);

  if (Number.isNaN(parsedLimit) || parsedLimit <= 0) {
    return ACTIVITY_RECORDING_DEFAULT_LIMIT;
  }

  return Math.min(parsedLimit, ACTIVITY_RECORDING_MAX_LIMIT);
}

function parseOptionalString(
  searchParams: URLSearchParams,
  key: string
): string | null {
  const value = searchParams.get(key);

  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed ? trimmed : null;
}

function parseBooleanFlag(searchParams: URLSearchParams, key: string): boolean {
  const value = searchParams.get(key);

  if (!value) {
    return false;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function parseDateRange(searchParams: URLSearchParams): DateRange | null {
  const date = searchParams.get("date");

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null;
  }

  const from = `${date}T00:00:00.000Z`;
  const toDate = new Date(from);
  toDate.setUTCDate(toDate.getUTCDate() + 1);

  return {
    from,
    to: toDate.toISOString(),
  };
}

function toRows(value: unknown): Row[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value as Row[];
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  return value;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function asRecord(value: unknown): Row {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Row;
}

function getActivityTemporalDirection(row: Row) {
  const metadata = asRecord(row.metadata_json);

  return (
    asString(row.temporal_direction) ??
    asString(metadata.temporal_direction)
  );
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }

  return null;
}

function uniqueStrings(values: Array<string | null>): string[] {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value)))
  );
}

function indexById(rows: Row[]): Map<string, Row> {
  const indexed = new Map<string, Row>();

  for (const row of rows) {
    const id = asString(row.id);

    if (id) {
      indexed.set(id, row);
    }
  }

  return indexed;
}

function groupByEventId(rows: Row[]): Map<string, Row[]> {
  const grouped = new Map<string, Row[]>();

  for (const row of rows) {
    const eventId = asString(row.event_id);

    if (!eventId) {
      continue;
    }

    const existingRows = grouped.get(eventId) ?? [];
    existingRows.push(row);
    grouped.set(eventId, existingRows);
  }

  return grouped;
}

function normalizeEventLink(row: Row) {
  return {
    id: asString(row.id),
    eventId: asString(row.event_id),
    entityType:
      asString(row.linked_entity_type) ??
      asString(row.entity_type) ??
      asString(row.target_type),
    entityId:
      asString(row.linked_entity_id) ??
      asString(row.entity_id) ??
      asString(row.target_id),
    entityKey:
      asString(row.linked_entity_key) ??
      asString(row.entity_key) ??
      asString(row.target_key),
    role: asString(row.link_role) ?? asString(row.role),
    relationType: asString(row.relation_type),
    source: asString(row.source),
    weight: asNumber(row.weight),
    confidence: asNumber(row.confidence),
    createdAt: asString(row.created_at),
    raw: row,
  };
}

function normalizeImpactEvent(row: Row) {
  return {
    id: asString(row.id),
    eventId: asString(row.event_id),
    targetType: asString(row.impact_target_type) ?? asString(row.target_type),
    targetKey: asString(row.impact_target_key) ?? asString(row.target_key),
    metric:
      asString(row.impact_metric) ??
      asString(row.metric) ??
      asString(row.metric_key),
    valueNumeric:
      asNumber(row.impact_value_numeric) ??
      asNumber(row.value_numeric) ??
      asNumber(row.value_numeric_delta),
    valueText: asString(row.impact_value_text) ?? asString(row.value_text),
    unit:
      asString(row.impact_unit) ??
      asString(row.unit) ??
      asString(row.metric_unit),
    direction: asString(row.impact_direction) ?? asString(row.direction),
    intensity: asString(row.intensity),
    source: asString(row.source),
    confidence: asNumber(row.confidence),
    ruleId: asString(row.rule_id),
    createdAt: asString(row.created_at),
    raw: row,
  };
}

function normalizeActivityTemplate(row: Row | null) {
  if (!row) {
    return null;
  }

  return {
    id: asString(row.id),
    slug: asString(row.slug),
    title: asString(row.title),
    description: asString(row.description),
    templateScope: asString(row.template_scope),
    visibility: asString(row.visibility),
    defaultDurationMinutes: asNumber(row.default_duration_minutes),
    defaultSourceType: asString(row.default_source_type),
    defaultPrivacyScope: asString(row.default_privacy_scope),
    isActive: asBoolean(row.is_active),
  };
}

function normalizeLegacyTemplate(row: Row | null) {
  if (!row) {
    return null;
  }

  return {
    id: asString(row.id),
    code: asString(row.code),
    title: asString(row.title),
    description: asString(row.description),
  };
}

function normalizeActivityType(row: Row | null) {
  if (!row) {
    return null;
  }

  return {
    id: asString(row.id),
    code: asString(row.code),
    title: asString(row.title),
    description: asString(row.description),
  };
}


/* PP1B canonical activity create helpers */
type ActivityCanonicalCreateBody = {
  idempotencyKey?: unknown;
  activityRoleCode?: unknown;
  title?: unknown;
  rawText?: unknown;
  inputText?: unknown;
  description?: unknown;
  startedAt?: unknown;
  endedAt?: unknown;
  durationMinutes?: unknown;
  status?: unknown;
  source?: unknown;
  privacyScope?: unknown;
  fulfillsPlannedActivityEventId?: unknown;
  scheduleModeCode?: unknown;
  scheduledDate?: unknown;
  scheduleStartDate?: unknown;
  scheduleEndDate?: unknown;
  deadlineAt?: unknown;
  createCalendarProjection?: unknown;
  plannedTargetValueObjectIds?: unknown;
  temporalDirection?: unknown;
  metadata?: unknown;
};

function parseIsoDate(value: unknown): string | null {
  const text = asString(value);

  if (!text) {
    return null;
  }

  const date = new Date(text);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const DEFAULT_EXACT_DURATION_MINUTES = 15;

function addMinutesToIso(value: string, minutes: number) {
  const parsed = new Date(value);
  parsed.setMinutes(parsed.getMinutes() + minutes);
  return parsed.toISOString();
}

function parseDateKey(value: unknown): string | null {
  const text = asString(value);

  return text && /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function parseUuid(value: unknown): string | null {
  const text = asString(value);

  return text && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)
    ? text
    : null;
}

function parseUuidArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(value.map(parseUuid).filter((item): item is string => Boolean(item))));
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => asString(item))
        .filter((item): item is string => Boolean(item)),
    ),
  );
}

function normalizeCux4Locale(value: unknown) {
  return value === "en" ||
    value === "pl" ||
    value === "ru" ||
    value === "uk" ||
    value === "de" ||
    value === "es" ||
    value === "cs"
    ? value
    : "pl";
}

function normalizeActivityRole(value: unknown): "planned" | "actual" | null {
  return value === "planned" || value === "actual" ? value : null;
}

function normalizeScheduleMode(value: unknown): ActivityScheduleModeCodePp1 | null {
  return value === "unscheduled" ||
    value === "date_only" ||
    value === "date_range" ||
    value === "deadline" ||
    value === "exact"
    ? value
    : null;
}

function normalizeSource(value: unknown) {
  const source = asString(value);

  return source ?? "manual_form";
}

function normalizePrivacyScope(value: unknown) {
  const scope = asString(value);

  return scope ?? "private";
}

function normalizeMetadata(value: unknown) {
  return asRecord(value);
}

function mapPp1ErrorStatus(message: string) {
  if (message.includes("IDEMPOTENCY_CONFLICT")) {
    return 409;
  }

  if (message.includes("OWNER") || message.includes("ACTOR")) {
    return 403;
  }

  if (/PP1_/.test(message)) {
    return 400;
  }

  return 500;
}

function summarizeActivityJournalEvent(row: Row) {
  return {
    id: asString(row.id),
    title: asString(row.title),
    status: asString(row.status),
    source: asString(row.source),
    activityRoleCode: asString(row.activity_role_code),
    fulfillsPlannedActivityEventId: asString(row.fulfills_planned_activity_event_id),
    scheduleModeCode: asString(row.schedule_mode_code),
    scheduledDate: asString(row.scheduled_date),
    scheduleStartDate: asString(row.schedule_start_date),
    scheduleEndDate: asString(row.schedule_end_date),
    deadlineAt: asString(row.deadline_at),
    observedDate: asString(asRecord(row.metadata_json).observedDate),
    temporalDirection: getActivityTemporalDirection(row),
    privacyScope: asString(row.privacy_scope),
    processingStatus: asString(row.processing_status),
    startedAt: asString(row.started_at),
    endedAt: asString(row.ended_at),
    durationMinutes: asNumber(row.duration_minutes),
    comment: asString(row.description) ?? asString(row.input_text),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
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

  const { appUser, personActor, errorResponse } =
    await getActivityUserContext();

  if (errorResponse) {
    return errorResponse;
  }

  if (!appUser || !personActor) {
    return NextResponse.json(
      {
        ok: false,
        error: "User context not found",
      },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams);
  const status = parseOptionalString(url.searchParams, "status");
  const sourceType = parseOptionalString(url.searchParams, "sourceType");
  const templateId = parseOptionalString(url.searchParams, "templateId");
  const dateRange = parseDateRange(url.searchParams);
  const includeDetails = parseBooleanFlag(url.searchParams, "includeDetails");

  const mode = includeDetails ? "details" : "summary";

  let eventsQuery = supabase
    .from("activity_events")
    .select("*")
    .eq("user_id", appUser.id)
    .eq("acting_as_actor_id", personActor.id);

  if (status) {
    eventsQuery = eventsQuery.eq("status", status);
  }

  if (sourceType) {
    eventsQuery = eventsQuery.eq("source", sourceType);
  }

  if (templateId) {
    eventsQuery = eventsQuery.eq("activity_template_id", templateId);
  }

  if (dateRange) {
    eventsQuery = eventsQuery
      .gte("created_at", dateRange.from)
      .lt("created_at", dateRange.to);
  }

  const { data: eventRowsRaw, error: eventsError } = await eventsQuery
    .order("created_at", { ascending: false })
    .limit(limit);

  if (eventsError) {
    return NextResponse.json(
      {
        ok: false,
        error: eventsError.message,
      },
      { status: 500 }
    );
  }

  const eventRows = toRows(eventRowsRaw);
  const eventIds = uniqueStrings(eventRows.map((event) => asString(event.id)));

  const filters = {
    status,
    sourceType,
    templateId,
    date: url.searchParams.get("date"),
    includeDetails,
  };

  if (eventIds.length === 0) {
    return NextResponse.json({
      ok: true,
      mode,
      limit,
      filters,
      count: 0,
      events: [],
    });
  }

  const eventLinkSelect = includeDetails ? "*" : "id,event_id";
  const impactEventSelect = includeDetails ? "*" : "id,event_id";

  const { data: eventLinkRowsRaw, error: eventLinksError } = await supabase
    .from("event_links")
    .select(eventLinkSelect)
    .in("event_id", eventIds);

  if (eventLinksError) {
    return NextResponse.json(
      {
        ok: false,
        error: eventLinksError.message,
      },
      { status: 500 }
    );
  }

  const { data: impactEventRowsRaw, error: impactEventsError } = await supabase
    .from("impact_events")
    .select(impactEventSelect)
    .in("event_id", eventIds);

  if (impactEventsError) {
    return NextResponse.json(
      {
        ok: false,
        error: impactEventsError.message,
      },
      { status: 500 }
    );
  }

  const eventLinkRows = toRows(eventLinkRowsRaw);
  const impactEventRows = toRows(impactEventRowsRaw);

  const linksByEventId = groupByEventId(eventLinkRows);
  const impactsByEventId = groupByEventId(impactEventRows);

  if (!includeDetails) {
    const events = eventRows.map((event) => {
      const eventId = asString(event.id);
      const source = asString(event.source) ?? asString(event.source_type);

      return {
        id: eventId,
        title: asString(event.title),
        status: asString(event.status),
        source,
        sourceType: source,
        privacyScope: asString(event.privacy_scope),
        processingStatus: asString(event.processing_status),
        startedAt: asString(event.started_at),
        endedAt: asString(event.ended_at),
        durationMinutes:
          asNumber(event.duration_minutes) ?? asNumber(event.durationMinutes),
        comment:
          asString(event.description) ??
          asString(event.comment) ??
          asString(event.input_text),
        activityTypeId: asString(event.activity_type_id),
        activityTemplateId: asString(event.activity_template_id),
        legacyTemplateId: asString(event.template_id),
        activityRoleCode: asString(event.activity_role_code),
        fulfillsPlannedActivityEventId: asString(event.fulfills_planned_activity_event_id),
        scheduleModeCode: asString(event.schedule_mode_code),
        scheduledDate: asString(event.scheduled_date),
        scheduleStartDate: asString(event.schedule_start_date),
        scheduleEndDate: asString(event.schedule_end_date),
        deadlineAt: asString(event.deadline_at),
        observedDate: asString(asRecord(event.metadata_json).observedDate),
        temporalDirection: getActivityTemporalDirection(event),
        createdAt: asString(event.created_at),
        updatedAt: asString(event.updated_at),
        eventLinksCount: eventId
          ? linksByEventId.get(eventId)?.length ?? 0
          : 0,
        impactEventsCount: eventId
          ? impactsByEventId.get(eventId)?.length ?? 0
          : 0,
      };
    });

    return NextResponse.json({
      ok: true,
      mode: "summary",
      limit,
      filters,
      count: events.length,
      events,
    });
  }

  const activityTemplateIds = uniqueStrings(
    eventRows.map((event) => asString(event.activity_template_id))
  );
  const legacyTemplateIds = uniqueStrings(
    eventRows.map((event) => asString(event.template_id))
  );
  const activityTypeIds = uniqueStrings(
    eventRows.map((event) => asString(event.activity_type_id))
  );

  const activityTemplateRows: Row[] = [];

  if (activityTemplateIds.length > 0) {
    const { data, error } = await supabase
      .from("activity_templates")
      .select("*")
      .in("id", activityTemplateIds);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    activityTemplateRows.push(...toRows(data));
  }

  const legacyTemplateRows: Row[] = [];

  if (legacyTemplateIds.length > 0) {
    const { data, error } = await supabase
      .from("activity_code_templates")
      .select("*")
      .in("id", legacyTemplateIds);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    legacyTemplateRows.push(...toRows(data));
  }

  const activityTypeRows: Row[] = [];

  if (activityTypeIds.length > 0) {
    const { data, error } = await supabase
      .from("activity_types")
      .select("*")
      .in("id", activityTypeIds);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    activityTypeRows.push(...toRows(data));
  }

  const activityTemplatesById = indexById(activityTemplateRows);
  const legacyTemplatesById = indexById(legacyTemplateRows);
  const activityTypesById = indexById(activityTypeRows);

  const events = eventRows.map((event) => {
    const eventId = asString(event.id);
    const activityTemplateId = asString(event.activity_template_id);
    const legacyTemplateId = asString(event.template_id);
    const activityTypeId = asString(event.activity_type_id);

    const eventLinks = eventId
      ? (linksByEventId.get(eventId) ?? []).map(normalizeEventLink)
      : [];

    const impactEvents = eventId
      ? (impactsByEventId.get(eventId) ?? []).map(normalizeImpactEvent)
      : [];

    const source = asString(event.source) ?? asString(event.source_type);

    return {
      id: eventId,
      title: asString(event.title),
      status: asString(event.status),
      source,
      sourceType: source,
      privacyScope: asString(event.privacy_scope),
      processingStatus: asString(event.processing_status),
      startedAt: asString(event.started_at),
      endedAt: asString(event.ended_at),
      durationMinutes:
        asNumber(event.duration_minutes) ?? asNumber(event.durationMinutes),
      comment:
        asString(event.description) ??
        asString(event.comment) ??
        asString(event.input_text),
      activityTypeId,
      activityTemplateId,
      legacyTemplateId,
      activityRoleCode: asString(event.activity_role_code),
      fulfillsPlannedActivityEventId: asString(event.fulfills_planned_activity_event_id),
      scheduleModeCode: asString(event.schedule_mode_code),
      scheduledDate: asString(event.scheduled_date),
      scheduleStartDate: asString(event.schedule_start_date),
      scheduleEndDate: asString(event.schedule_end_date),
      deadlineAt: asString(event.deadline_at),
      observedDate: asString(asRecord(event.metadata_json).observedDate),
      temporalDirection: getActivityTemporalDirection(event),
      createdAt: asString(event.created_at),
      updatedAt: asString(event.updated_at),
      activityTemplate: normalizeActivityTemplate(
        activityTemplateId
          ? activityTemplatesById.get(activityTemplateId) ?? null
          : null
      ),
      legacyTemplate: normalizeLegacyTemplate(
        legacyTemplateId
          ? legacyTemplatesById.get(legacyTemplateId) ?? null
          : null
      ),
      activityType: normalizeActivityType(
        activityTypeId ? activityTypesById.get(activityTypeId) ?? null : null
      ),
      eventLinksCount: eventLinks.length,
      impactEventsCount: impactEvents.length,
      eventLinks,
      impactEvents,
      raw: event,
    };
  });

  return NextResponse.json({
    ok: true,
    mode: "details",
    limit,
    filters,
    count: events.length,
    events,
  });
}
export async function POST(request: Request) {
  if (!ACTIVITY_RECORDING_ENABLED) {
    return NextResponse.json(
      { ok: false, error: ACTIVITY_RECORDING_DISABLED_MESSAGE },
      { status: 503 }
    );
  }

  const { appUser, personActor, errorResponse } = await getActivityUserContext();

  if (errorResponse) {
    return errorResponse;
  }

  if (!appUser || !personActor) {
    return NextResponse.json(
      { ok: false, error: "User context not found" },
      { status: 500 }
    );
  }

  let body: ActivityCanonicalCreateBody;

  try {
    body = await request.json() as ActivityCanonicalCreateBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const idempotencyKey = asString(body.idempotencyKey);
  const activityRoleCode = normalizeActivityRole(body.activityRoleCode);
  const inputText = asString(body.inputText) ?? asString(body.rawText);
  const title = asString(body.title) ?? inputText;

  if (!idempotencyKey || !activityRoleCode || !title) {
    return NextResponse.json(
      { ok: false, error: "idempotencyKey, activityRoleCode and title are required" },
      { status: 400 }
    );
  }

  const durationMinutesRaw = asNumber(body.durationMinutes);
  const requestedDurationMinutes =
    durationMinutesRaw !== null && durationMinutesRaw > 0
      ? Math.round(durationMinutesRaw)
      : null;
  const plannedScheduleModeCode =
    activityRoleCode === "planned"
      ? normalizeScheduleMode(body.scheduleModeCode)
      : null;
  const requestedStartedAt = parseIsoDate(body.startedAt);
  const requestedEndedAt = parseIsoDate(body.endedAt);
  const exactStartOnlyDefaultApplied =
    activityRoleCode === "planned" &&
    plannedScheduleModeCode === "exact" &&
    requestedStartedAt !== null &&
    requestedEndedAt === null &&
    requestedDurationMinutes === null;
  const durationMinutes = exactStartOnlyDefaultApplied
    ? DEFAULT_EXACT_DURATION_MINUTES
    : requestedDurationMinutes;
  const resolvedEndedAt =
    exactStartOnlyDefaultApplied && requestedStartedAt
      ? addMinutesToIso(
          requestedStartedAt,
          DEFAULT_EXACT_DURATION_MINUTES,
        )
      : requestedEndedAt;
  const normalizedMetadata = normalizeMetadata(body.metadata);
  const common = {
    activityRoleCode,
    title,
    inputText,
    description: asString(body.description),
    durationMinutes,
    source: normalizeSource(body.source),
    privacyScope: normalizePrivacyScope(body.privacyScope),
    metadata: {
      ...normalizedMetadata,
      pp1bWritePath: "/api/activity/events",
    },
  } as const;

  let activity: ActivityCreatePp1;
  let plannedTargetValueObjectIds: string[] = [];

  if (activityRoleCode === "planned") {
    const scheduleModeCode = plannedScheduleModeCode;

    if (!scheduleModeCode) {
      return NextResponse.json(
        { ok: false, error: "scheduleModeCode is required for planned activities" },
        { status: 400 }
      );
    }

    plannedTargetValueObjectIds = parseUuidArray(body.plannedTargetValueObjectIds);
    const scheduleFields = {
      scheduleModeCode,
      ...(scheduleModeCode === "date_only"
        ? { scheduledDate: parseDateKey(body.scheduledDate) ?? "" }
        : {}),
      ...(scheduleModeCode === "date_range"
        ? {
            scheduleStartDate: parseDateKey(body.scheduleStartDate) ?? "",
            scheduleEndDate: parseDateKey(body.scheduleEndDate) ?? "",
          }
        : {}),
      ...(scheduleModeCode === "deadline"
        ? { deadlineAt: parseIsoDate(body.deadlineAt) ?? "" }
        : {}),
      ...(scheduleModeCode === "exact"
        ? {
            startedAt: requestedStartedAt ?? "",
            endedAt: resolvedEndedAt,
            createCalendarProjection: body.createCalendarProjection !== false,
          }
        : {}),
    };

    activity = {
      ...common,
      activityRoleCode: "planned",
      status: body.status === "draft" || body.status === "confirmed" || body.status === "cancelled" || body.status === "missed" || body.status === "archived"
        ? body.status
        : "planned",
      ...scheduleFields,
      plannedTargetValueObjectIds,
    } as ActivityCreatePp1;
  } else {
    activity = {
      ...common,
      activityRoleCode: "actual",
      status: body.status === "draft" || body.status === "started" || body.status === "paused" || body.status === "corrected" || body.status === "cancelled" || body.status === "imported_pending" || body.status === "archived"
        ? body.status
        : "completed",
      startedAt: requestedStartedAt,
      endedAt: requestedEndedAt,
      fulfillsPlannedActivityEventId: parseUuid(body.fulfillsPlannedActivityEventId),
    };
  }

  const result = await createActivityEventViaPp1Rpc({
    ownerUserId: appUser.id,
    ownerActorId: personActor.id,
    idempotencyKey,
    activity,
    plannedTargetValueObjectIds,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.errorMessage,
        errorCode: result.errorCode,
        errorDetails: result.errorDetails,
        errorHint: result.errorHint,
      },
      { status: mapPp1ErrorStatus(result.errorMessage) }
    );
  }

  const activityEvent = result.data.activityEvent as Row;
  const activityEventId = asString(activityEvent.id);
  const cux4Metadata = asRecord(normalizedMetadata.cux4);
  const backgroundAnalysisRequested =
    activityRoleCode === "planned" &&
    cux4Metadata.backgroundAnalysis === true &&
    Boolean(activityEventId) &&
    Boolean(inputText?.trim());
  let semanticEnrichment: {
    runId: string | null;
    status: string;
    disposition: string | null;
    error: string | null;
  } | null = null;

  if (
    backgroundAnalysisRequested &&
    activityEventId &&
    inputText?.trim()
  ) {
    try {
      const locale = normalizeCux4Locale(normalizedMetadata.locale);
      const protectedFieldCodes = parseStringArray(
        cux4Metadata.protectedFieldCodes,
      );
      const run = await createActivitySemanticEnrichmentRunCux4({
        ownerUserId: appUser.id,
        ownerActorId: personActor.id,
        activityEventId,
        requestKey: `capture:${idempotencyKey}`,
        sourceLocale: locale,
        sourceText: inputText,
        protectedFieldCodes,
        inputSnapshot: {
          title,
          scheduleModeCode:
            activityRoleCode === "planned"
              ? (activity as ActivityCreatePp1 & {
                  scheduleModeCode?: string;
                }).scheduleModeCode ?? null
              : null,
          plannedTargetValueObjectIds,
          metadata: normalizedMetadata,
        },
      });

      const claim = await claimActivitySemanticEnrichmentRunCux4({
        ownerUserId: appUser.id,
        ownerActorId: personActor.id,
        runId: run.runId,
      });

      semanticEnrichment = {
        runId: run.runId,
        status: claim.status,
        disposition: claim.disposition ?? run.disposition,
        error: null,
      };

      if (claim.claimed) {
        const previewUrl = new URL(
          "/api/calendar/activity-review/semantic-preview",
          request.url,
        ).toString();

        after(async () => {
          await processActivitySemanticEnrichmentRunCux4({
            ownerUserId: appUser.id,
            ownerActorId: personActor.id,
            runId: run.runId,
            previewUrl,
            sourceLocale: locale,
            sourceText: inputText,
            alreadyClaimed: true,
          });
        });
      }
    } catch (error) {
      semanticEnrichment = {
        runId: null,
        status: "failed_to_start",
        disposition: null,
        error:
          error instanceof Error
            ? error.message
            : "CUX4 semantic enrichment could not be started.",
      };
    }
  }

  return NextResponse.json({
    ok: true,
    disposition: result.data.disposition,
    event: summarizeActivityJournalEvent(activityEvent),
    activityEvent: result.data.activityEvent,
    calendarEvent: result.data.calendarEvent,
    plannedTargetValueObjectIds: result.data.plannedTargetValueObjectIds,
    semanticEnrichment,
    container: {
      activityRoleCode,
      persistenceTarget: "activity_events",
      calendarProjectionCreated: result.data.calendarEvent !== null,
      requiredActivityContainer:
        cux4Metadata.requiredActivityContainer === true,
    },
  });
}
