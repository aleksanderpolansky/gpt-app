import { NextResponse } from "next/server";

import { auth0 } from "../../../../../lib/auth0";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ENDPOINT = "/api/activity/facts" as const;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

type Row = Record<string, unknown>;

type AuthenticatedFactsContext =
  | {
      ok: true;
      auth0Sub: string;
      appUserId: string;
    }
  | {
      ok: false;
      status: number;
      errorCode: string;
      errorMessage: string;
    };

function asRecord(value: unknown): Row {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Row;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function normalizeMetricValue(row: Row): number | string | boolean | null {
  const numericValue = asNumber(row.value_numeric);

  if (numericValue !== null) {
    return numericValue;
  }

  const textValue = asString(row.value_text);

  if (textValue !== null) {
    return textValue;
  }

  const booleanValue = asBoolean(row.value_boolean);

  if (booleanValue !== null) {
    return booleanValue;
  }

  return null;
}

function normalizeMetricValueSource(row: Row): string | null {
  if (asNumber(row.value_numeric) !== null) {
    return "activity_object_facts.value_numeric";
  }

  if (asString(row.value_text) !== null) {
    return "activity_object_facts.value_text";
  }

  if (asBoolean(row.value_boolean) !== null) {
    return "activity_object_facts.value_boolean";
  }

  return "activity_object_facts.value_missing";
}

function parseLimit(searchParams: URLSearchParams): number {
  const rawLimit = searchParams.get("limit");

  if (!rawLimit) {
    return DEFAULT_LIMIT;
  }

  const parsedLimit = Number.parseInt(rawLimit, 10);

  if (Number.isNaN(parsedLimit) || parsedLimit <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(parsedLimit, MAX_LIMIT);
}

function parseOptionalFilter(searchParams: URLSearchParams, key: string) {
  const value = searchParams.get(key);

  if (!value || value.trim().length === 0) {
    return null;
  }

  return value.trim();
}

function normalizeFactRow(row: Row) {
  return {
    factId: asString(row.id),
    userId: asString(row.user_id),
    activityEventId: asString(row.activity_event_id),
    measureId: asString(row.measure_id),
    semanticObjectKey: asString(row.semantic_object_key),
    valueObjectId: asString(row.value_object_id),
    measureType: asString(row.measure_type),
    metricValue: normalizeMetricValue(row),
    metricValueSource: normalizeMetricValueSource(row),
    unit: asString(row.unit),
    factStatus: asString(row.fact_status),
    sourceType: asString(row.source_type),
    confidence: asNumber(row.confidence),
    performedByActorId: asString(row.performed_by_actor_id),
    actingAsActorId: asString(row.acting_as_actor_id),
    actingForActorId: asString(row.acting_for_actor_id),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  };
}

async function resolveAuthenticatedFactsContext(): Promise<AuthenticatedFactsContext> {
  let session: Awaited<ReturnType<typeof auth0.getSession>> | null = null;

  try {
    session = await auth0.getSession();
  } catch {
    session = null;
  }

  const auth0Sub = asString(session?.user?.sub);

  if (!auth0Sub) {
    return {
      ok: false,
      status: 401,
      errorCode: "ACTIVITY_FACTS_READ_UNAUTHENTICATED",
      errorMessage: "Authentication is required to read activity facts.",
    };
  }

  const { data, error } = await supabase
    .from("app_users")
    .select("id")
    .eq("auth0_sub", auth0Sub)
    .limit(2);

  if (error) {
    return {
      ok: false,
      status: 500,
      errorCode: "ACTIVITY_FACTS_READ_APP_USER_LOOKUP_FAILED",
      errorMessage: "Could not resolve app user for authenticated session.",
    };
  }

  const rows = Array.isArray(data) ? data.map(asRecord) : [];

  if (rows.length !== 1) {
    return {
      ok: false,
      status: 403,
      errorCode: "ACTIVITY_FACTS_READ_APP_USER_NOT_LINKED",
      errorMessage:
        "Authenticated Auth0 user is not linked to exactly one app_users row.",
    };
  }

  const appUserId = asString(rows[0].id);

  if (!appUserId) {
    return {
      ok: false,
      status: 403,
      errorCode: "ACTIVITY_FACTS_READ_APP_USER_ID_MISSING",
      errorMessage: "Mapped app_users row has no id.",
    };
  }

  return {
    ok: true,
    auth0Sub,
    appUserId,
  };
}

export async function GET(request: Request) {
  const context = await resolveAuthenticatedFactsContext();

  if (!context.ok) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        readStatus: "blocked",
        errorCode: context.errorCode,
        errorMessage: context.errorMessage,
        sideEffects: {
          dbWritesExecuted: false,
          sqlExecuted: false,
          openAiCallExecuted: false,
        },
      },
      { status: context.status }
    );
  }

  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams);
  const semanticObjectKey = parseOptionalFilter(
    url.searchParams,
    "semanticObjectKey"
  );
  const valueObjectId = parseOptionalFilter(url.searchParams, "valueObjectId");
  const activityEventId = parseOptionalFilter(
    url.searchParams,
    "activityEventId"
  );
  const factStatus = parseOptionalFilter(url.searchParams, "factStatus");

  let query = supabase
    .from("activity_object_facts")
    .select(
      [
        "id",
        "user_id",
        "activity_event_id",
        "measure_id",
        "semantic_object_key",
        "value_object_id",
        "measure_type",
        "value_numeric",
        "value_text",
        "value_boolean",
        "unit",
        "fact_status",
        "source_type",
        "confidence",
        "performed_by_actor_id",
        "acting_as_actor_id",
        "acting_for_actor_id",
        "created_at",
        "updated_at",
      ].join(", ")
    )
    .eq("user_id", context.appUserId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (semanticObjectKey) {
    query = query.eq("semantic_object_key", semanticObjectKey);
  }

  if (valueObjectId) {
    query = query.eq("value_object_id", valueObjectId);
  }

  if (activityEventId) {
    query = query.eq("activity_event_id", activityEventId);
  }

  if (factStatus) {
    query = query.eq("fact_status", factStatus);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        readStatus: "error",
        errorCode: "ACTIVITY_FACTS_READ_QUERY_FAILED",
        errorMessage: error.message,
        filters: {
          limit,
          semanticObjectKey,
          valueObjectId,
          activityEventId,
          factStatus,
        },
        sideEffects: {
          dbWritesExecuted: false,
          sqlExecuted: false,
          openAiCallExecuted: false,
        },
      },
      { status: 500 }
    );
  }

  const facts = Array.isArray(data)
    ? data.map((row) => normalizeFactRow(asRecord(row)))
    : [];

  return NextResponse.json(
    {
      ok: true,
      endpoint: ENDPOINT,
      readStatus: "ready",
      facts,
      count: facts.length,
      filters: {
        limit,
        semanticObjectKey,
        valueObjectId,
        activityEventId,
        factStatus,
      },
      ownership: {
        appUserId: context.appUserId,
        rule: "activity_object_facts.user_id equals authenticated app_users.id",
      },
      schemaMode: {
        source: "activity_object_facts",
        strategy: "strict existing-column select",
        metricValueRule:
          "metricValue is read directly from activity_object_facts.value_numeric/value_text/value_boolean.",
      },
      sideEffects: {
        dbWritesExecuted: false,
        sqlExecuted: false,
        openAiCallExecuted: false,
      },
      nextSteps: {
        step54: "Wire /activity-facts UI table to this read endpoint.",
        step55: "Add user-facing filters.",
        step56: "Add correction actions through guarded routes.",
        step57: "Add links to Activity Event and Value Object pages.",
      },
    },
    { status: 200 }
  );
}

