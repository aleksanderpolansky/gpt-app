import { NextResponse } from "next/server";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../lib/actor-context";
import { auth0 } from "../../../../../lib/auth0";
import { supabase } from "../../../../../lib/supabase";
import {
  groupMutualFactProjections,
  type MutualLinkActivity,
  type MutualLinkFactProjection,
  type MutualLinkMetricValue,
  type MutualLinkValueObject,
} from "@/lib/activity/mutualLinks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ENDPOINT = "/api/activity/mutual-links" as const;
const MAX_ACTIVITY_IDS = 50;
const MAX_HISTORY_ACTIVITIES = 100;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Row = Record<string, unknown>;

type Context =
  | { ok: true; appUserId: string; actorId: string }
  | { ok: false; status: number; errorCode: string; errorMessage: string };

function asRecord(value: unknown): Row {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Row)
    : {};
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

function metricValue(row: Row): MutualLinkMetricValue {
  const numeric = asNumber(row.value_numeric);
  if (numeric !== null) return numeric;
  const text = asString(row.value_text);
  if (text !== null) return text;
  return asBoolean(row.value_boolean);
}

function uniqueStrings(values: Array<string | null>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function parseActivityIds(searchParams: URLSearchParams) {
  const raw = searchParams.get("activityEventIds") ?? "";
  const ids = uniqueStrings(
    raw
      .split(",")
      .map((value) => value.trim())
      .filter((value) => UUID_RE.test(value)),
  );
  return ids.slice(0, MAX_ACTIVITY_IDS);
}

async function resolveContext(): Promise<Context> {
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
      errorCode: "P5B_MUTUAL_LINKS_UNAUTHENTICATED",
      errorMessage: "Authentication is required.",
    };
  }

  try {
    const actor = await resolveActiveActorContext(auth0Sub);
    return { ok: true, appUserId: actor.appUserId, actorId: actor.actorId };
  } catch (error) {
    if (error instanceof ActorContextError) {
      return {
        ok: false,
        status: error.status,
        errorCode: error.code,
        errorMessage: error.message,
      };
    }
    return {
      ok: false,
      status: 500,
      errorCode: "P5B_MUTUAL_LINKS_ACTOR_CONTEXT_FAILED",
      errorMessage: "Could not resolve the active actor.",
    };
  }
}

function normalizeProjection(row: Row): MutualLinkFactProjection | null {
  const factId = asString(row.id);
  const activityEventId = asString(row.activity_event_id);
  if (!factId || !activityEventId) return null;

  return {
    factId,
    measureId: asString(row.measure_id),
    activityEventId,
    valueObjectId: asString(row.value_object_id),
    measureType: asString(row.measure_type),
    metricValue: metricValue(row),
    unit: asString(row.unit),
    factStatus: asString(row.fact_status),
    isUserConfirmed: asBoolean(row.is_user_confirmed),
    sourceType: asString(row.source_type),
    confidence: asNumber(row.confidence),
    createdAt: asString(row.created_at),
  };
}

export async function GET(request: Request) {
  const context = await resolveContext();
  if (!context.ok) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        errorCode: context.errorCode,
        errorMessage: context.errorMessage,
      },
      { status: context.status },
    );
  }

  const url = new URL(request.url);
  const requestedActivityIds = parseActivityIds(url.searchParams);
  const valueObjectIdRaw = asString(url.searchParams.get("valueObjectId"));
  const factIdRaw = asString(url.searchParams.get("factId"));
  const valueObjectId = valueObjectIdRaw && UUID_RE.test(valueObjectIdRaw) ? valueObjectIdRaw : null;
  const factId = factIdRaw && UUID_RE.test(factIdRaw) ? factIdRaw : null;

  if (requestedActivityIds.length === 0 && !valueObjectId && !factId) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        errorCode: "P5B_MUTUAL_LINKS_FILTER_REQUIRED",
        errorMessage: "activityEventIds, valueObjectId, or factId is required.",
      },
      { status: 400 },
    );
  }

  let activityIds = [...requestedActivityIds];

  if (valueObjectId) {
    const [{ data: factRows, error: factError }, { data: linkRows, error: linkError }] =
      await Promise.all([
        supabase
          .from("activity_object_facts")
          .select("activity_event_id")
          .eq("user_id", context.appUserId)
          .eq("acting_as_actor_id", context.actorId)
          .eq("value_object_id", valueObjectId)
          .order("created_at", { ascending: false })
          .limit(MAX_HISTORY_ACTIVITIES),
        supabase
          .from("activity_value_object_links")
          .select("activity_event_id")
          .eq("app_user_id", context.appUserId)
          .eq("actor_id", context.actorId)
          .eq("value_object_id", valueObjectId)
          .eq("status", "active")
          .in("link_type", ["semantic_exposure", "planned_target"])
          .order("created_at", { ascending: false })
          .limit(MAX_HISTORY_ACTIVITIES),
      ]);

    if (factError || linkError) {
      return NextResponse.json(
        {
          ok: false,
          endpoint: ENDPOINT,
          errorCode: "P5B_MUTUAL_LINKS_VALUE_OBJECT_LOOKUP_FAILED",
          errorMessage: factError?.message ?? linkError?.message,
        },
        { status: 500 },
      );
    }

    activityIds = uniqueStrings([
      ...activityIds,
      ...(factRows ?? []).map((row) => asString(asRecord(row).activity_event_id)),
      ...(linkRows ?? []).map((row) => asString(asRecord(row).activity_event_id)),
    ]).slice(0, MAX_HISTORY_ACTIVITIES);
  }

  if (factId) {
    const { data: factRow, error: factError } = await supabase
      .from("activity_object_facts")
      .select("activity_event_id")
      .eq("id", factId)
      .eq("user_id", context.appUserId)
      .eq("acting_as_actor_id", context.actorId)
      .maybeSingle();

    if (factError) {
      return NextResponse.json(
        {
          ok: false,
          endpoint: ENDPOINT,
          errorCode: "P5B_MUTUAL_LINKS_FACT_LOOKUP_FAILED",
          errorMessage: factError.message,
        },
        { status: 500 },
      );
    }

    const activityEventId = asString(asRecord(factRow).activity_event_id);
    if (activityEventId) activityIds = uniqueStrings([...activityIds, activityEventId]);
  }

  if (activityIds.length === 0) {
    return NextResponse.json({ ok: true, endpoint: ENDPOINT, activities: [], count: 0 });
  }

  const { data: activityRows, error: activityError } = await supabase
    .from("activity_events")
    .select(
      "id,title,status,activity_role_code,temporal_direction,started_at,ended_at,duration_minutes,scheduled_date,created_at,metadata_json",
    )
    .eq("user_id", context.appUserId)
    .eq("acting_as_actor_id", context.actorId)
    .in("id", activityIds)
    .order("created_at", { ascending: false });

  if (activityError) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        errorCode: "P5B_MUTUAL_LINKS_ACTIVITY_QUERY_FAILED",
        errorMessage: activityError.message,
      },
      { status: 500 },
    );
  }

  const ownedActivityRows = Array.isArray(activityRows) ? activityRows.map(asRecord) : [];
  const ownedActivityIds = uniqueStrings(ownedActivityRows.map((row) => asString(row.id)));

  if (ownedActivityIds.length === 0) {
    return NextResponse.json({ ok: true, endpoint: ENDPOINT, activities: [], count: 0 });
  }

  const [{ data: projectionRows, error: projectionError }, { data: semanticLinkRows, error: linkError }] =
    await Promise.all([
      supabase
        .from("activity_object_facts")
        .select(
          "id,activity_event_id,measure_id,value_object_id,measure_type,value_numeric,value_text,value_boolean,unit,fact_status,is_user_confirmed,source_type,confidence,created_at",
        )
        .eq("user_id", context.appUserId)
        .eq("acting_as_actor_id", context.actorId)
        .in("activity_event_id", ownedActivityIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("activity_value_object_links")
        .select(
          "activity_event_id,value_object_id,link_type,status,provenance_code,semantic_match_confidence,semantic_match_method_code",
        )
        .eq("app_user_id", context.appUserId)
        .eq("actor_id", context.actorId)
        .eq("status", "active")
        .in("link_type", ["semantic_exposure", "planned_target"])
        .in("activity_event_id", ownedActivityIds),
    ]);

  if (projectionError || linkError) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        errorCode: "P5B_MUTUAL_LINKS_RELATION_QUERY_FAILED",
        errorMessage: projectionError?.message ?? linkError?.message,
      },
      { status: 500 },
    );
  }

  const projections = (projectionRows ?? [])
    .map((row) => normalizeProjection(asRecord(row)))
    .filter((row): row is MutualLinkFactProjection => Boolean(row));
  const semanticLinks = (semanticLinkRows ?? []).map(asRecord);

  let factProjections = projections;

  if (valueObjectId) {
    factProjections = factProjections.filter(
      (projection) => projection.valueObjectId === valueObjectId,
    );
  }

  if (factId) {
    const requestedProjection = projections.find(
      (projection) => projection.factId === factId,
    );

    if (!requestedProjection) {
      factProjections = [];
    } else if (requestedProjection.measureId) {
      factProjections = factProjections.filter(
        (projection) => projection.measureId === requestedProjection.measureId,
      );
    } else {
      factProjections = factProjections.filter(
        (projection) => projection.factId === factId,
      );
    }
  }
  const valueObjectIds = uniqueStrings([
    ...projections.map((row) => row.valueObjectId),
    ...semanticLinks.map((row) => asString(row.value_object_id)),
  ]);

  let valueObjectRows: Row[] = [];
  if (valueObjectIds.length > 0) {
    const { data, error } = await supabase
      .from("value_objects")
      .select(
        "id,title,canonical_key,scope_code,ontology_node_role_code,node_role_code,branch_type_code,object_kind,parent_value_object_id,status",
      )
      .in("id", valueObjectIds);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          endpoint: ENDPOINT,
          errorCode: "P5B_MUTUAL_LINKS_VALUE_OBJECT_QUERY_FAILED",
          errorMessage: error.message,
        },
        { status: 500 },
      );
    }
    valueObjectRows = (data ?? []).map(asRecord);
  }

  const voById = new Map<string, Row>();
  for (const row of valueObjectRows) {
    const id = asString(row.id);
    if (id) voById.set(id, row);
  }

  const factsByActivity = new Map<string, MutualLinkFactProjection[]>();
  for (const projection of factProjections) {
    const list = factsByActivity.get(projection.activityEventId) ?? [];
    list.push(projection);
    factsByActivity.set(projection.activityEventId, list);
  }

  const linksByActivity = new Map<string, Row[]>();
  for (const link of semanticLinks) {
    const activityEventId = asString(link.activity_event_id);
    if (!activityEventId) continue;
    const list = linksByActivity.get(activityEventId) ?? [];
    list.push(link);
    linksByActivity.set(activityEventId, list);
  }

  const activities: MutualLinkActivity[] = ownedActivityRows.flatMap((activityRow) => {
    const activityEventId = asString(activityRow.id);
    if (!activityEventId) return [];

    const activityProjections = factsByActivity.get(activityEventId) ?? [];
    const facts = groupMutualFactProjections(activityProjections);
    const activityLinks = linksByActivity.get(activityEventId) ?? [];
    const voIds = uniqueStrings([
      ...activityProjections.map((row) => row.valueObjectId),
      ...activityLinks.map((row) => asString(row.value_object_id)),
    ]);

    const valueObjects: MutualLinkValueObject[] = voIds.flatMap((id) => {
      const vo = voById.get(id);
      if (!vo) return [];
      const ontologyRole = asString(vo.ontology_node_role_code);
      const legacyRole = asString(vo.node_role_code);
      if (ontologyRole !== "leaf" && legacyRole !== "activity_leaf") return [];
      const linkTypes = uniqueStrings(
        activityLinks
          .filter((row) => asString(row.value_object_id) === id)
          .map((row) => asString(row.link_type)),
      );
      return [{
        id,
        title: asString(vo.title) ?? asString(vo.canonical_key) ?? id,
        canonicalKey: asString(vo.canonical_key),
        scopeCode: asString(vo.scope_code),
        ontologyNodeRoleCode: ontologyRole,
        nodeRoleCode: legacyRole,
        branchTypeCode: asString(vo.branch_type_code),
        objectKind: asString(vo.object_kind),
        parentValueObjectId: asString(vo.parent_value_object_id),
        linkTypes,
      }];
    });

    const metadata = asRecord(activityRow.metadata_json);
    return [{
      activityEventId,
      title: asString(activityRow.title),
      status: asString(activityRow.status),
      activityRoleCode: asString(activityRow.activity_role_code),
      temporalDirection: asString(activityRow.temporal_direction),
      startedAt: asString(activityRow.started_at),
      endedAt: asString(activityRow.ended_at),
      durationMinutes: asNumber(activityRow.duration_minutes),
      observedDate: asString(metadata.observedDate),
      scheduledDate: asString(activityRow.scheduled_date),
      createdAt: asString(activityRow.created_at),
      valueObjects,
      facts,
    }];
  });

  return NextResponse.json({
    ok: true,
    endpoint: ENDPOINT,
    activities,
    count: activities.length,
    ownership: { appUserId: context.appUserId, actorId: context.actorId },
    sideEffects: { dbWritesExecuted: false, openAiCallExecuted: false },
  });
}
