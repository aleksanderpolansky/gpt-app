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
    targetType:
      asString(row.impact_target_type) ??
      asString(row.target_type),
    targetKey:
      asString(row.impact_target_key) ??
      asString(row.target_key),
    metric:
      asString(row.impact_metric) ??
      asString(row.metric) ??
      asString(row.metric_key),
    valueNumeric:
      asNumber(row.impact_value_numeric) ??
      asNumber(row.value_numeric) ??
      asNumber(row.value_numeric_delta),
    valueText:
      asString(row.impact_value_text) ??
      asString(row.value_text),
    unit:
      asString(row.impact_unit) ??
      asString(row.unit) ??
      asString(row.metric_unit),
    direction:
      asString(row.impact_direction) ??
      asString(row.direction),
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
  const limit = parseLimit(url.searchParams);
  const status = parseOptionalString(url.searchParams, "status");
  const sourceType = parseOptionalString(url.searchParams, "sourceType");
  const templateId = parseOptionalString(url.searchParams, "templateId");
  const dateRange = parseDateRange(url.searchParams);

  let eventsQuery = supabase
    .from("activity_events")
    .select("*")
    .eq("user_id", appUser.id);

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

  const eventRows = (eventRowsRaw ?? []) as Row[];
  const eventIds = uniqueStrings(eventRows.map((event) => asString(event.id)));

  if (eventIds.length === 0) {
    return NextResponse.json({
      ok: true,
      limit,
      filters: {
        status,
        sourceType,
        templateId,
        date: url.searchParams.get("date"),
      },
      count: 0,
      events: [],
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

  const { data: eventLinkRowsRaw, error: eventLinksError } = await supabase
    .from("event_links")
    .select("*")
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
    .select("*")
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

    activityTemplateRows.push(...((data ?? []) as Row[]));
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

    legacyTemplateRows.push(...((data ?? []) as Row[]));
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

    activityTypeRows.push(...((data ?? []) as Row[]));
  }

  const linksByEventId = groupByEventId((eventLinkRowsRaw ?? []) as Row[]);
  const impactsByEventId = groupByEventId((impactEventRowsRaw ?? []) as Row[]);
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
    limit,
    filters: {
      status,
      sourceType,
      templateId,
      date: url.searchParams.get("date"),
    },
    count: events.length,
    events,
  });
}
