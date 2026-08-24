import { NextResponse } from "next/server";

import { getActivityUserContext } from "../../../../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_LINKS = 80;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const WRITABLE_SOURCE_CODES = new Set([
  "template",
  "semantic_review",
  "manual",
]);

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type Row = Record<string, unknown>;

type NormalizedLink = {
  valueObjectId: string;
  sourceCode: string;
  sourceTemplateProfileId: string | null;
};

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

function asBoolean(value: unknown): boolean {
  return value === true;
}

function invalid(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

async function loadOwnedFact(
  factId: string,
  appUserId: string,
  actorId: string,
) {
  const { data, error } = await supabase
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
        "created_at",
        "acting_as_actor_id",
      ].join(", "),
    )
    .eq("id", factId)
    .eq("user_id", appUserId)
    .eq("acting_as_actor_id", actorId)
    .maybeSingle();

  if (error) {
    return { fact: null, error: error.message };
  }

  return {
    fact: data ? asRecord(data) : null,
    error: null,
  };
}

async function loadEffectiveLinks(factId: string) {
  const { data, error } = await supabase
    .from("activity_fact_value_object_links_effective_v1")
    .select(
      "link_id,fact_id,value_object_id,source_code,source_template_profile_id,created_at,is_materialized",
    )
    .eq("fact_id", factId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return Array.isArray(data) ? data.map((row) => asRecord(row)) : [];
}

async function enrichLinks(rows: Row[]) {
  const ids = Array.from(
    new Set(
      rows
        .map((row) => asString(row.value_object_id))
        .filter((value): value is string => Boolean(value)),
    ),
  );

  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("value_objects")
    .select("id,title,canonical_key")
    .in("id", ids);

  if (error) {
    throw new Error(error.message);
  }

  const valueObjectById = new Map<string, Row>();
  for (const raw of data ?? []) {
    const row = asRecord(raw);
    const id = asString(row.id);
    if (id) valueObjectById.set(id, row);
  }

  return rows.flatMap((row) => {
    const valueObjectId = asString(row.value_object_id);
    if (!valueObjectId) return [];

    const valueObject = valueObjectById.get(valueObjectId) ?? {};
    return [
      {
        linkId: asString(row.link_id),
        valueObjectId,
        title:
          asString(valueObject.title) ??
          asString(valueObject.canonical_key) ??
          valueObjectId,
        canonicalKey: asString(valueObject.canonical_key),
        sourceCode: asString(row.source_code) ?? "unknown",
        sourceTemplateProfileId: asString(row.source_template_profile_id),
        confidence: null,
        isMaterialized: asBoolean(row.is_materialized),
      },
    ];
  });
}

function normalizeRequestedLinks(value: unknown):
  | { ok: true; links: NormalizedLink[] }
  | { ok: false; error: string } {
  if (!Array.isArray(value)) {
    return { ok: false, error: "links must be an array" };
  }

  if (value.length > MAX_LINKS) {
    return { ok: false, error: `links must contain at most ${MAX_LINKS} rows` };
  }

  const links: NormalizedLink[] = [];
  const seen = new Set<string>();

  for (const raw of value) {
    const row = asRecord(raw);
    const valueObjectId = asString(row.valueObjectId);
    const sourceCode = asString(row.sourceCode);
    const sourceTemplateProfileId = asString(row.sourceTemplateProfileId);

    if (!valueObjectId || !UUID_RE.test(valueObjectId)) {
      return { ok: false, error: "Every valueObjectId must be a UUID" };
    }

    if (!sourceCode || !WRITABLE_SOURCE_CODES.has(sourceCode)) {
      return { ok: false, error: `Unsupported sourceCode for ${valueObjectId}` };
    }

    if (seen.has(valueObjectId)) {
      return { ok: false, error: `Duplicate valueObjectId: ${valueObjectId}` };
    }
    seen.add(valueObjectId);

    if (
      sourceCode !== "template" &&
      sourceTemplateProfileId !== null
    ) {
      return {
        ok: false,
        error: `sourceTemplateProfileId is only valid for template links`,
      };
    }

    if (
      sourceCode === "template" &&
      (!sourceTemplateProfileId || !UUID_RE.test(sourceTemplateProfileId))
    ) {
      return {
        ok: false,
        error: `template requires a UUID sourceTemplateProfileId`,
      };
    }

    links.push({
      valueObjectId,
      sourceCode,
      sourceTemplateProfileId,
    });
  }

  return { ok: true, links };
}

export async function GET(_request: Request, routeContext: RouteContext) {
  const { appUser, personActor, errorResponse } =
    await getActivityUserContext();

  if (errorResponse) return errorResponse;
  if (!appUser || !personActor) {
    return invalid("Active actor context not found", 500);
  }

  const { id: factId } = await routeContext.params;
  if (!UUID_RE.test(factId)) {
    return invalid("fact id must be a UUID");
  }

  const owned = await loadOwnedFact(factId, appUser.id, personActor.id);
  if (owned.error) return invalid(owned.error, 500);
  if (!owned.fact) return invalid("Fact not found or access denied", 404);

  try {
    const effectiveRows = await loadEffectiveLinks(factId);
    const links = await enrichLinks(effectiveRows);

    return NextResponse.json(
      {
        ok: true,
        fact: {
          factId,
          activityEventId: asString(owned.fact.activity_event_id),
          measureId: asString(owned.fact.measure_id),
          semanticObjectKey: asString(owned.fact.semantic_object_key),
          measureType: asString(owned.fact.measure_type),
          factStatus: asString(owned.fact.fact_status),
          sourceType: asString(owned.fact.source_type),
          createdAt: asString(owned.fact.created_at),
        },
        links,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return invalid(
      error instanceof Error
        ? error.message
        : "Could not load effective fact tags",
      500,
    );
  }
}

export async function PUT(request: Request, routeContext: RouteContext) {
  const { appUser, personActor, errorResponse } =
    await getActivityUserContext();

  if (errorResponse) return errorResponse;
  if (!appUser || !personActor) {
    return invalid("Active actor context not found", 500);
  }

  const { id: factId } = await routeContext.params;
  if (!UUID_RE.test(factId)) {
    return invalid("fact id must be a UUID");
  }

  const owned = await loadOwnedFact(factId, appUser.id, personActor.id);
  if (owned.error) return invalid(owned.error, 500);
  if (!owned.fact) return invalid("Fact not found or access denied", 404);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalid("Request body must be valid JSON");
  }

  const normalized = normalizeRequestedLinks(asRecord(body).links);
  if (!normalized.ok) {
    return invalid(normalized.error);
  }

  let currentRows: Row[];
  try {
    currentRows = await loadEffectiveLinks(factId);
  } catch (error) {
    return invalid(
      error instanceof Error
        ? error.message
        : "Could not load current fact tags",
      500,
    );
  }

  const currentByValueObjectId = new Map<string, Row>();
  for (const row of currentRows) {
    const valueObjectId = asString(row.value_object_id);
    if (valueObjectId) currentByValueObjectId.set(valueObjectId, row);
  }

  for (const link of normalized.links) {
    if (link.sourceCode !== "template") continue;

    const current = currentByValueObjectId.get(link.valueObjectId);
    const currentSource = current ? asString(current.source_code) : null;
    const currentProfile = current
      ? asString(current.source_template_profile_id)
      : null;
    const currentMaterialized = current
      ? asBoolean(current.is_materialized)
      : false;

    if (
      !current ||
      currentSource !== "template" ||
      !currentMaterialized ||
      currentProfile !== link.sourceTemplateProfileId
    ) {
      return invalid(
        "template provenance can only be preserved from an existing materialized link",
        409,
      );
    }
  }

  const requestedIds = normalized.links.map((link) => link.valueObjectId);

  if (requestedIds.length > 0) {
    const { data: valueObjects, error: valueObjectsError } = await supabase
      .from("value_objects")
      .select(
        "id,status,scope_code,owner_user_id,owner_actor_id,ontology_is_active,ontology_node_role_code",
      )
      .in("id", requestedIds);

    if (valueObjectsError) {
      return invalid(valueObjectsError.message, 500);
    }

    const byId = new Map<string, Row>();
    for (const raw of valueObjects ?? []) {
      const row = asRecord(raw);
      const id = asString(row.id);
      if (id) byId.set(id, row);
    }

    for (const valueObjectId of requestedIds) {
      const row = byId.get(valueObjectId);
      if (!row) {
        return invalid(`Value object not found: ${valueObjectId}`, 409);
      }

      const isGlobal = asString(row.scope_code) === "global";
      const isOwned =
        asString(row.owner_user_id) === appUser.id &&
        asString(row.owner_actor_id) === personActor.id;
      const isActive =
        asString(row.status) === "active" &&
        row.ontology_is_active === true &&
        asString(row.ontology_node_role_code) === "leaf";

      if (!isActive) {
        return invalid(
          `Value object must be an active ontology leaf: ${valueObjectId}`,
          409,
        );
      }

      if (!isGlobal && !isOwned) {
        return invalid(
          `Value object is outside the active actor scope: ${valueObjectId}`,
          403,
        );
      }
    }
  }

  const rpcLinks = normalized.links.map((link) => ({
    valueObjectId: link.valueObjectId,
    sourceCode: link.sourceCode,
    sourceTemplateProfileId: link.sourceTemplateProfileId,
  }));

  const { data: replaceResult, error: replaceError } = await supabase.rpc(
    "replace_activity_fact_value_object_links_v1",
    {
      p_fact_id: factId,
      p_owner_actor_id: personActor.id,
      p_owner_user_id: appUser.id,
      p_links: rpcLinks,
    },
  );

  if (replaceError) {
    return invalid(replaceError.message, 409);
  }

  try {
    const finalRows = await loadEffectiveLinks(factId);
    const links = await enrichLinks(finalRows);

    return NextResponse.json(
      {
        ok: true,
        factId,
        replaced: replaceResult,
        links,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return invalid(
      error instanceof Error
        ? error.message
        : "Tags were saved but final verification read failed",
      500,
    );
  }
}
