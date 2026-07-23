import { NextResponse } from "next/server";
import {
  ACTIVITY_RECORDING_DEFAULT_LIMIT,
  ACTIVITY_RECORDING_DISABLED_MESSAGE,
  ACTIVITY_RECORDING_ENABLED,
  ACTIVITY_RECORDING_MAX_LIMIT,
} from "../../../../../lib/activity/activityRecordingConfig";
import { getActivityUserContext } from "../../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../../lib/supabase";

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


/* Step 10A Activity Journal container write helpers */
type ActivityJournalContainerBody = {
  title?: unknown;
  rawText?: unknown;
  inputText?: unknown;
  description?: unknown;
  startTime?: unknown;
  startedAt?: unknown;
  endTime?: unknown;
  endedAt?: unknown;
  durationMinutes?: unknown;
  status?: unknown;
  source?: unknown;
  temporalDirection?: unknown;
};

function parseIsoDate(value: unknown): string | null {
  const text = asString(value);

  if (!text) {
    return null;
  }

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function calculateDurationFromIso(startedAt: string | null, endedAt: string | null) {
  if (!startedAt || !endedAt) {
    return null;
  }

  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();

  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return null;
  }

  return Math.round((end - start) / 60000);
}

function normalizeActivityJournalStatus(value: unknown) {
  const text = asString(value)?.toLowerCase();

  if (text === "cancelled" || text === "canceled") {
    return "cancelled";
  }

  if (text === "started" || text === "running") {
    return "started";
  }

  return "completed";
}

function normalizeActivityJournalSource(value: unknown) {
  const text = asString(value);

  if (
    text === "manual_chat" ||
    text === "manual_form" ||
    text === "voice_input" ||
    text === "app_action" ||
    text === "system_event" ||
    text === "api_webhook" ||
    text === "nfc_sensor" ||
    text === "wearable_import" ||
    text === "calendar_import" ||
    text === "ai_suggested" ||
    text === "file_import" ||
    text === "external_import" ||
    text === "unknown"
  ) {
    return text;
  }

  return "manual_form";
}

function summarizeActivityJournalEvent(row: Row) {
  return {
    id: asString(row.id),
    title: asString(row.title),
    status: asString(row.status),
    source: asString(row.source),
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

  let body: ActivityJournalContainerBody;

  try {
    body = (await request.json()) as ActivityJournalContainerBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid JSON body",
      },
      { status: 400 }
    );
  }

  const rawText = asString(body.rawText) ?? asString(body.inputText);
  const title = asString(body.title) ?? rawText ?? "Activity";
  const description = asString(body.description) ?? rawText;
  const startedAt = parseIsoDate(body.startedAt) ?? parseIsoDate(body.startTime);

  if (!startedAt) {
    return NextResponse.json(
      {
        ok: false,
        error: "Valid startTime or startedAt is required.",
      },
      { status: 400 }
    );
  }

  const durationMinutes = asNumber(body.durationMinutes) ?? 30;
  const endedAt =
    parseIsoDate(body.endedAt) ??
    parseIsoDate(body.endTime) ??
    new Date(new Date(startedAt).getTime() + durationMinutes * 60000).toISOString();

  const finalDurationMinutes =
    asNumber(body.durationMinutes) ??
    calculateDurationFromIso(startedAt, endedAt) ??
    durationMinutes;

  const status = normalizeActivityJournalStatus(body.status);
  const source = normalizeActivityJournalSource(body.source);

  const { data: createdEvent, error: insertError } = await supabase
    .from("activity_events")
    .insert({
      user_id: appUser.id,
      performed_by_actor_id: personActor.id,
      acting_as_actor_id: personActor.id,
      acting_for_actor_id: personActor.id,
      input_text: rawText ?? title,
      title,
      description,
      started_at: startedAt,
      ended_at: endedAt,
      duration_minutes: finalDurationMinutes,
      source,
      temporal_direction: "past",
      status,
      privacy_scope: "private",
      processing_status: "pending",
      metadata_json: {
        parser: "activity_container_review_v1",
        temporal_direction: "past",
        source_entry_point: "activity_journal",
        save_gate: "activity_journal_review_add_gate_v1",
        requested_source: asString(body.source),
        facts_created: false,
        value_objects_linked: false,
        plan_metrics_created: false,
        analytics_zones_created: false,
      },
    })
    .select("*")
    .single();

  if (insertError || !createdEvent) {
    return NextResponse.json(
      {
        ok: false,
        error: insertError?.message ?? "Failed to create activity event.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    event: summarizeActivityJournalEvent(createdEvent as Row),
    container: {
      temporalDirection: "past",
      persistenceTarget: "activity_events",
      factsCreated: false,
      valueObjectsLinked: false,
    },
  });
}
