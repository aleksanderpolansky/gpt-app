import { NextResponse } from "next/server";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../lib/actor-context";
import { auth0 } from "../../../../../lib/auth0";
import { supabase } from "../../../../../lib/supabase";
import { groupMutualFactProjections } from "@/lib/activity/mutualLinks";

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
      actorId: string;
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
    isUserConfirmed: asBoolean(row.is_user_confirmed),
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

  try {
    const actorContext = await resolveActiveActorContext(auth0Sub);

    return {
      ok: true,
      auth0Sub,
      appUserId: actorContext.appUserId,
      actorId: actorContext.actorId,
    };
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
      errorCode: "ACTIVITY_FACTS_READ_ACTOR_CONTEXT_FAILED",
      errorMessage: "Could not resolve active actor for activity facts.",
    };
  }
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
      { status: context.status },
    );
  }

  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams);
  const semanticObjectKey = parseOptionalFilter(
    url.searchParams,
    "semanticObjectKey",
  );
  const valueObjectId = parseOptionalFilter(url.searchParams, "valueObjectId");
  const activityEventId = parseOptionalFilter(
    url.searchParams,
    "activityEventId",
  );
  const factStatus = parseOptionalFilter(url.searchParams, "factStatus");

  let matchedFactIds: string[] | null = null;

  if (valueObjectId) {
    const { data: matchedLinks, error: matchedLinksError } = await supabase
      .from("activity_fact_value_object_links_effective_v1")
      .select("fact_id")
      .eq("value_object_id", valueObjectId)
      .limit(5000);

    if (matchedLinksError) {
      return NextResponse.json(
        {
          ok: false,
          endpoint: ENDPOINT,
          readStatus: "error",
          errorCode: "ACTIVITY_FACTS_EFFECTIVE_TAG_FILTER_FAILED",
          errorMessage: matchedLinksError.message,
        },
        { status: 500 },
      );
    }

    matchedFactIds = Array.from(
      new Set(
        (matchedLinks ?? [])
          .map((row) => asString(asRecord(row).fact_id))
          .filter((value): value is string => Boolean(value)),
      ),
    );

    if (matchedFactIds.length === 0) {
      return NextResponse.json({
        ok: true,
        endpoint: ENDPOINT,
        readStatus: "ready",
        facts: [],
        count: 0,
        filters: {
          limit,
          semanticObjectKey,
          valueObjectId,
          activityEventId,
          factStatus,
        },
        ownership: {
          appUserId: context.appUserId,
          actorId: context.actorId,
          rule:
            "activity_object_facts owner pair equals the authenticated app user and server-resolved active actor",
        },
        schemaMode: {
          source:
            "activity_object_facts + activity_fact_value_object_links_effective_v1",
          strategy:
            "measure-centric grouping with final effective fact tags",
        },
        sideEffects: {
          dbWritesExecuted: false,
          sqlExecuted: false,
          openAiCallExecuted: false,
        },
      });
    }
  }

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
        "is_user_confirmed",
        "source_type",
        "confidence",
        "performed_by_actor_id",
        "acting_as_actor_id",
        "acting_for_actor_id",
        "created_at",
        "updated_at",
      ].join(", "),
    )
    .eq("user_id", context.appUserId)
    .eq("acting_as_actor_id", context.actorId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (semanticObjectKey) {
    query = query.eq("semantic_object_key", semanticObjectKey);
  }

  if (matchedFactIds) {
    query = query.in("id", matchedFactIds);
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
      { status: 500 },
    );
  }

  const normalizedRows = Array.isArray(data)
    ? data.map((row) => normalizeFactRow(asRecord(row)))
    : [];

  const primaryMeasureIds = Array.from(
    new Set(
      normalizedRows
        .map((fact) => fact.measureId)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  let projectionRowsForGrouping = normalizedRows;

  if (primaryMeasureIds.length > 0) {
    const { data: siblingData, error: siblingError } = await supabase
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
          "is_user_confirmed",
          "source_type",
          "confidence",
          "performed_by_actor_id",
          "acting_as_actor_id",
          "acting_for_actor_id",
          "created_at",
          "updated_at",
        ].join(", "),
      )
      .eq("user_id", context.appUserId)
      .eq("acting_as_actor_id", context.actorId)
      .in("measure_id", primaryMeasureIds);

    if (siblingError) {
      return NextResponse.json(
        {
          ok: false,
          endpoint: ENDPOINT,
          readStatus: "error",
          errorCode: "ACTIVITY_FACTS_READ_PROJECTION_EXPANSION_FAILED",
          errorMessage: siblingError.message,
        },
        { status: 500 },
      );
    }

    const byFactId = new Map(
      normalizedRows
        .filter((fact) => Boolean(fact.factId))
        .map((fact) => [fact.factId as string, fact] as const),
    );

    for (const row of siblingData ?? []) {
      const fact = normalizeFactRow(asRecord(row));
      if (fact.factId && !byFactId.has(fact.factId)) {
        byFactId.set(fact.factId, fact);
      }
    }

    projectionRowsForGrouping = Array.from(byFactId.values());
  }

  const allFactIds = projectionRowsForGrouping
    .map((fact) => fact.factId)
    .filter((value): value is string => Boolean(value));

  const effectiveLinkRows: Row[] = [];
  for (let index = 0; index < allFactIds.length; index += 200) {
    const ids = allFactIds.slice(index, index + 200);
    const { data: linkData, error: linkError } = await supabase
      .from("activity_fact_value_object_links_effective_v1")
      .select(
        "fact_id,value_object_id,source_code,source_template_profile_id,is_materialized",
      )
      .in("fact_id", ids);

    if (linkError) {
      return NextResponse.json(
        {
          ok: false,
          endpoint: ENDPOINT,
          readStatus: "error",
          errorCode: "ACTIVITY_FACTS_EFFECTIVE_TAG_READ_FAILED",
          errorMessage: linkError.message,
        },
        { status: 500 },
      );
    }

    effectiveLinkRows.push(
      ...(Array.isArray(linkData)
        ? linkData.map((row) => asRecord(row))
        : []),
    );
  }

  const effectiveLinksByFactId = new Map<
    string,
    Array<{
      valueObjectId: string;
      sourceCode: string | null;
      sourceTemplateProfileId: string | null;
      confidence: number | null;
      isMaterialized: boolean | null;
    }>
  >();

  for (const row of effectiveLinkRows) {
    const factId = asString(row.fact_id);
    const linkedValueObjectId = asString(row.value_object_id);
    if (!factId || !linkedValueObjectId) continue;

    const current = effectiveLinksByFactId.get(factId) ?? [];
    current.push({
      valueObjectId: linkedValueObjectId,
      sourceCode: asString(row.source_code),
      sourceTemplateProfileId: asString(row.source_template_profile_id),
      confidence: null,
      isMaterialized: asBoolean(row.is_materialized),
    });
    effectiveLinksByFactId.set(factId, current);
  }

  const activityIds = Array.from(
    new Set(
      projectionRowsForGrouping
        .map((fact) => fact.activityEventId)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const finalValueObjectIds = Array.from(
    new Set(
      effectiveLinkRows
        .map((row) => asString(row.value_object_id))
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const [activityLookup, valueObjectLookup] = await Promise.all([
    activityIds.length > 0
      ? supabase
          .from("activity_events")
          .select("id,title")
          .eq("user_id", context.appUserId)
          .eq("acting_as_actor_id", context.actorId)
          .in("id", activityIds)
      : Promise.resolve({ data: [], error: null }),
    finalValueObjectIds.length > 0
      ? supabase
          .from("value_objects")
          .select(
            "id,title,canonical_key,ontology_node_role_code,node_role_code",
          )
          .in("id", finalValueObjectIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (activityLookup.error || valueObjectLookup.error) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        readStatus: "error",
        errorCode: "ACTIVITY_FACTS_READ_ENRICHMENT_FAILED",
        errorMessage:
          activityLookup.error?.message ?? valueObjectLookup.error?.message,
      },
      { status: 500 },
    );
  }

  const activityTitleById = new Map<string, string>();
  for (const row of activityLookup.data ?? []) {
    const record = asRecord(row);
    const id = asString(record.id);
    if (id) activityTitleById.set(id, asString(record.title) ?? id);
  }

  const valueObjectById = new Map<
    string,
    { id: string; title: string; canonicalKey: string | null }
  >();
  for (const row of valueObjectLookup.data ?? []) {
    const record = asRecord(row);
    const id = asString(record.id);
    const ontologyRole = asString(record.ontology_node_role_code);
    const legacyRole = asString(record.node_role_code);
    if (
      !id ||
      (ontologyRole !== "leaf" && legacyRole !== "activity_leaf")
    ) {
      continue;
    }
    valueObjectById.set(id, {
      id,
      title: asString(record.title) ?? asString(record.canonical_key) ?? id,
      canonicalKey: asString(record.canonical_key),
    });
  }

  const grouped = groupMutualFactProjections(
    projectionRowsForGrouping.flatMap((fact) => {
      if (!fact.factId || !fact.activityEventId) return [];
      return [
        {
          factId: fact.factId,
          measureId: fact.measureId,
          activityEventId: fact.activityEventId,
          valueObjectId: null,
          measureType: fact.measureType,
          metricValue: fact.metricValue,
          unit: fact.unit,
          factStatus: fact.factStatus,
          isUserConfirmed: fact.isUserConfirmed,
          sourceType: fact.sourceType,
          confidence: fact.confidence,
          createdAt: fact.createdAt,
        },
      ];
    }),
  );

  const rowsByFactId = new Map(
    projectionRowsForGrouping
      .filter((fact) => Boolean(fact.factId))
      .map((fact) => [fact.factId as string, fact] as const),
  );

  const facts = grouped.map((group) => {
    const base =
      rowsByFactId.get(group.projectionFactIds[0]) ??
      projectionRowsForGrouping[0];

    const finalLinks = new Map<
      string,
      {
        valueObjectId: string;
        sourceCode: string | null;
        sourceTemplateProfileId: string | null;
        confidence: number | null;
        isMaterialized: boolean | null;
      }
    >();

    for (const factId of group.projectionFactIds) {
      for (const link of effectiveLinksByFactId.get(factId) ?? []) {
        if (!finalLinks.has(link.valueObjectId)) {
          finalLinks.set(link.valueObjectId, link);
        }
      }
    }

    const finalLinkList = Array.from(finalLinks.values());
    const groupValueObjects = finalLinkList.flatMap((link) => {
      const valueObject = valueObjectById.get(link.valueObjectId);
      return valueObject ? [valueObject] : [];
    });

    return {
      ...base,
      factId: group.projectionFactIds[0] ?? null,
      projectionFactIds: group.projectionFactIds,
      projectionCount: group.projectionFactIds.length,
      measureId: group.measureId,
      metricValue: group.metricValue,
      measureType: group.measureType,
      unit: group.unit,
      factStatus: group.factStatus,
      sourceType: group.sourceType,
      confidence: group.confidence,
      createdAt: group.createdAt,
      activityEventId: group.activityEventId,
      activityTitle: activityTitleById.get(group.activityEventId) ?? null,
      valueObjectId: finalLinkList[0]?.valueObjectId ?? null,
      valueObjects: groupValueObjects,
      finalValueObjectLinks: finalLinkList,
    };
  });

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
        actorId: context.actorId,
        rule:
          "activity_object_facts owner pair equals the authenticated app user and server-resolved active actor",
      },
      schemaMode: {
        source:
          "activity_object_facts + activity_fact_value_object_links_effective_v1",
        strategy:
          "measure-centric grouping with final effective fact tags; no virtual template expansion",
        metricValueRule:
          "Legacy page metric values remain compatibility reads from activity_object_facts; dashboard analytics uses activity_fact_analytics_inputs_v1 canonical measure values.",
      },
      sideEffects: {
        dbWritesExecuted: false,
        sqlExecuted: false,
        openAiCallExecuted: false,
      },
      nextSteps: {
        factTagging:
          "Review semantic suggestions and persist final leaf tags through replace_activity_fact_value_object_links_v1.",
      },
    },
    { status: 200 },
  );
}
