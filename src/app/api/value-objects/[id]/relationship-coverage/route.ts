import { NextResponse } from "next/server";

import { supabase } from "../../../../../../lib/supabase";
import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";

const PRIMARY_ROOTS = {
  systems_structures: "1f86ed22-e220-562a-b2a4-341abf5c5780",
  states_needs: "6ba4ecf1-8a05-5eaa-b280-4eb7aff2a42a",
  actions_processes: "5b0746a5-0089-5ef4-8cb9-f8279c0ca233",
} as const;

type PlaneCode = keyof typeof PRIMARY_ROOTS | "other";
type RelationDirection = "symmetric" | "outgoing" | "incoming";
type ReviewOutcome =
  | "links_confirmed"
  | "no_links_required"
  | "not_applicable"
  | "expected_missing";

type RelationTypeRow = {
  relation_type_code: string;
  directionality_code: "directed" | "symmetric";
  title_key: string;
  reverse_title_key: string;
  display_order: number;
  allowed_source_facet_codes: string[] | null;
  allowed_target_facet_codes: string[] | null;
  allowed_source_node_roles: string[] | null;
  allowed_target_node_roles: string[] | null;
};

type ValueObjectRow = {
  id: string;
  title: string;
  facet_code: string | null;
  node_role_code: string | null;
  root_value_object_id: string | null;
  owner_user_id: string | null;
  owner_actor_id: string | null;
  status: string | null;
};

type SystemRelationRow = {
  id: string;
  relation_type_code: string;
  source_value_object_id: string;
  target_value_object_id: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type ReviewRow = {
  zone_key: string;
  outcome_code: ReviewOutcome;
  reviewed_at: string;
  next_review_at: string | null;
  review_note: string | null;
};

function planeOf(row: Pick<ValueObjectRow, "id" | "root_value_object_id">): PlaneCode {
  const rootId = row.root_value_object_id ?? row.id;
  for (const [plane, id] of Object.entries(PRIMARY_ROOTS)) {
    if (rootId === id) return plane as keyof typeof PRIMARY_ROOTS;
  }
  return "other";
}

function isGlobalSystemObject(row: ValueObjectRow) {
  return row.owner_user_id === null && row.owner_actor_id === null;
}

function reviewState(review: ReviewRow | undefined, hasLinks: boolean) {
  if (!review) {
    return {
      code: "unreviewed" as const,
      label: "not_reviewed",
      reviewedAt: null,
      nextReviewAt: null,
      outcome: null,
    };
  }

  // A relation-set mutation can invalidate any previous decision, including
  // "not applicable" and "expected missing". In that case stale wins.
  if (review.next_review_at && new Date(review.next_review_at).getTime() <= Date.now()) {
    return {
      code: "stale" as const,
      label: "review_stale",
      reviewedAt: review.reviewed_at,
      nextReviewAt: review.next_review_at,
      outcome: review.outcome_code,
    };
  }

  if (review.outcome_code === "not_applicable") {
    return {
      code: "not_applicable" as const,
      label: "not_applicable",
      reviewedAt: review.reviewed_at,
      nextReviewAt: review.next_review_at,
      outcome: review.outcome_code,
    };
  }

  if (review.outcome_code === "expected_missing" && !hasLinks) {
    return {
      code: "model_gap" as const,
      label: "model_gap",
      reviewedAt: review.reviewed_at,
      nextReviewAt: review.next_review_at,
      outcome: review.outcome_code,
    };
  }

  return {
    code: "reviewed" as const,
    label: "reviewed",
    reviewedAt: review.reviewed_at,
    nextReviewAt: review.next_review_at,
    outcome: review.outcome_code,
  };
}


function isCoverageSchemaPending(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : String(error ?? "");

  return (
    message.includes("system_value_object_relations") ||
    message.includes("value_object_relation_zone_reviews") ||
    message.includes("PGRST205") ||
    message.includes("42P01")
  );
}

async function loadObject(id: string) {
  const { data, error } = await supabase
    .from("value_objects")
    .select(
      "id,title,facet_code,node_role_code,root_value_object_id,owner_user_id,owner_actor_id,status",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as ValueObjectRow | null;
}

async function loadRelationsForObject(id: string) {
  const { data, error } = await supabase
    .from("system_value_object_relations")
    .select(
      "id,relation_type_code,source_value_object_id,target_value_object_id,status,created_at,updated_at",
    )
    .or(`source_value_object_id.eq.${id},target_value_object_id.eq.${id}`)
    .eq("status", "active");

  if (error) throw error;
  return (data ?? []) as SystemRelationRow[];
}

async function markReviewZonesStale(valueObjectId: string, zoneKeys: string[]) {
  const unique = Array.from(new Set(zoneKeys.map((key) => key.trim()).filter(Boolean)));
  if (unique.length === 0) return;

  const { error } = await supabase
    .from("value_object_relation_zone_reviews")
    .update({
      next_review_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("value_object_id", valueObjectId)
    .in("zone_key", unique);

  if (error) throw error;
}

function semanticZoneKey(
  relationTypeCode: string,
  directionalityCode: "directed" | "symmetric",
  direction: RelationDirection,
) {
  const normalizedDirection =
    directionalityCode === "symmetric" ? "symmetric" : direction;
  return `relation:${relationTypeCode}:${normalizedDirection}`;
}

function crossPlaneZoneKey(
  current: Pick<ValueObjectRow, "id" | "root_value_object_id">,
  other: Pick<ValueObjectRow, "id" | "root_value_object_id">,
) {
  const currentPlane = planeOf(current);
  const otherPlane = planeOf(other);
  if (otherPlane === "other" || otherPlane === currentPlane) return null;
  return `plane:${otherPlane}`;
}

async function responseForObject(id: string) {
  const target = await loadObject(id);
  if (!target) {
    return NextResponse.json({ ok: false, error: "VALUE_OBJECT_NOT_FOUND" }, { status: 404 });
  }
  if (!isGlobalSystemObject(target)) {
    return NextResponse.json(
      { ok: false, error: "COVERAGE_REVIEW_GLOBAL_SYSTEM_ONLY" },
      { status: 409 },
    );
  }

  const [{ data: relationTypesData, error: relationTypesError }, relations, reviewsResult] =
    await Promise.all([
      supabase
        .from("value_object_relation_types")
        .select(
          "relation_type_code,directionality_code,title_key,reverse_title_key,display_order,allowed_source_facet_codes,allowed_target_facet_codes,allowed_source_node_roles,allowed_target_node_roles",
        )
        .eq("status", "active")
        .eq("canonical_write_policy_code", "enabled")
        .order("display_order", { ascending: true }),
      loadRelationsForObject(id),
      supabase
        .from("value_object_relation_zone_reviews")
        .select("zone_key,outcome_code,reviewed_at,next_review_at,review_note")
        .eq("value_object_id", id),
    ]);

  if (relationTypesError) throw relationTypesError;
  if (reviewsResult.error) throw reviewsResult.error;

  const relationTypes = (relationTypesData ?? []) as RelationTypeRow[];
  const reviews = (reviewsResult.data ?? []) as ReviewRow[];
  const reviewMap = new Map(reviews.map((row) => [row.zone_key, row]));

  const relatedIds = Array.from(
    new Set(
      relations.flatMap((row) => [row.source_value_object_id, row.target_value_object_id]).filter((x) => x !== id),
    ),
  );

  const relatedObjects = new Map<string, ValueObjectRow>();
  if (relatedIds.length > 0) {
    const { data, error } = await supabase
      .from("value_objects")
      .select(
        "id,title,facet_code,node_role_code,root_value_object_id,owner_user_id,owner_actor_id,status",
      )
      .in("id", relatedIds);
    if (error) throw error;
    for (const row of (data ?? []) as ValueObjectRow[]) relatedObjects.set(row.id, row);
  }

  const { data: globalCandidatesData, error: globalCandidatesError } = await supabase
    .from("value_objects")
    .select("id,title,facet_code,node_role_code,root_value_object_id,owner_user_id,owner_actor_id,status")
    .is("owner_user_id", null)
    .is("owner_actor_id", null)
    .eq("status", "active")
    .neq("id", id)
    .order("title", { ascending: true });
  if (globalCandidatesError) throw globalCandidatesError;
  const globalCandidates = ((globalCandidatesData ?? []) as ValueObjectRow[]).map((object) => ({
    id: object.id,
    title: object.title,
    facetCode: object.facet_code,
    nodeRoleCode: object.node_role_code,
    plane: planeOf(object),
  }));

  const relationZones = relationTypes.flatMap((relationType) => {
    const directions: RelationDirection[] =
      relationType.directionality_code === "symmetric"
        ? ["symmetric"]
        : ["outgoing", "incoming"];

    return directions.map((direction) => {
      const zoneKey = `relation:${relationType.relation_type_code}:${direction}`;
      const matching = relations.filter((relation) => {
        if (relation.relation_type_code !== relationType.relation_type_code) return false;
        if (direction === "symmetric") return true;
        if (direction === "outgoing") return relation.source_value_object_id === id;
        return relation.target_value_object_id === id;
      });

      const links = matching
        .map((relation) => {
          const relatedId =
            relation.source_value_object_id === id
              ? relation.target_value_object_id
              : relation.source_value_object_id;
          const object = relatedObjects.get(relatedId);
          if (!object) return null;
          return {
            relationId: relation.id,
            id: object.id,
            title: object.title,
            facetCode: object.facet_code,
            nodeRoleCode: object.node_role_code,
            plane: planeOf(object),
          };
        })
        .filter(Boolean);

      return {
        zoneKey,
        kind: "relation" as const,
        relationTypeCode: relationType.relation_type_code,
        direction,
        titleKey:
          direction === "incoming" ? relationType.reverse_title_key : relationType.title_key,
        displayOrder: relationType.display_order,
        links,
        review: reviewState(reviewMap.get(zoneKey), links.length > 0),
      };
    });
  });

  const currentPlane = planeOf(target);
  const crossPlaneZones = (Object.keys(PRIMARY_ROOTS) as Array<keyof typeof PRIMARY_ROOTS>)
    .filter((plane) => plane !== currentPlane)
    .map((plane, index) => {
      const zoneKey = `plane:${plane}`;
      const links = relations
        .map((relation) => {
          const relatedId =
            relation.source_value_object_id === id
              ? relation.target_value_object_id
              : relation.source_value_object_id;
          const object = relatedObjects.get(relatedId);
          if (!object || planeOf(object) !== plane) return null;
          return {
            relationId: relation.id,
            relationTypeCode: relation.relation_type_code,
            id: object.id,
            title: object.title,
            facetCode: object.facet_code,
            nodeRoleCode: object.node_role_code,
            plane,
          };
        })
        .filter(Boolean);

      return {
        zoneKey,
        kind: "cross_plane" as const,
        plane,
        displayOrder: 1000 + index,
        links,
        review: reviewState(reviewMap.get(zoneKey), links.length > 0),
      };
    });

  const allZones = [...relationZones, ...crossPlaneZones];
  const counters = allZones.reduce(
    (acc, zone) => {
      acc.total += 1;
      acc[zone.review.code] += 1;
      return acc;
    },
    {
      total: 0,
      reviewed: 0,
      unreviewed: 0,
      stale: 0,
      not_applicable: 0,
      model_gap: 0,
    },
  );

  return NextResponse.json({
    ok: true,
    canReview: true,
    valueObject: {
      id: target.id,
      title: target.title,
      facetCode: target.facet_code,
      nodeRoleCode: target.node_role_code,
      plane: currentPlane,
    },
    relationZones,
    crossPlaneZones,
    candidates: globalCandidates,
    counters,
    reviewPolicy: { staleAfterDays: 30 },
  });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await requirePlatformAdmin();
  if (!admin.ok) return platformAdminErrorResponse(admin, "ON_RELATIONSHIP_COVERAGE_REVIEW_V1");

  try {
    const { id } = await context.params;
    return await responseForObject(id);
  } catch (error) {
    if (isCoverageSchemaPending(error)) {
      return NextResponse.json(
        { ok: false, error: "RELATIONSHIP_COVERAGE_SCHEMA_PENDING" },
        { status: 409 },
      );
    }

    console.error("relationship coverage GET failed", error);
    return NextResponse.json(
      { ok: false, error: "RELATIONSHIP_COVERAGE_READ_FAILED" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await requirePlatformAdmin();
  if (!admin.ok) return platformAdminErrorResponse(admin, "ON_RELATIONSHIP_COVERAGE_REVIEW_V1");

  try {
    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "";
    const target = await loadObject(id);
    if (!target || !isGlobalSystemObject(target)) {
      return NextResponse.json({ ok: false, error: "GLOBAL_SYSTEM_OBJECT_REQUIRED" }, { status: 409 });
    }

    if (action === "review") {
      const zoneKey = typeof body.zoneKey === "string" ? body.zoneKey.trim() : "";
      const outcomeCode = typeof body.outcomeCode === "string" ? body.outcomeCode : "";
      const note = typeof body.note === "string" ? body.note.trim().slice(0, 2000) : null;
      const allowedOutcomes = new Set<ReviewOutcome>([
        "links_confirmed",
        "no_links_required",
        "not_applicable",
        "expected_missing",
      ]);
      if (!zoneKey || !allowedOutcomes.has(outcomeCode as ReviewOutcome)) {
        return NextResponse.json({ ok: false, error: "INVALID_REVIEW_PAYLOAD" }, { status: 400 });
      }

      const reviewedAt = new Date();
      const nextReviewAt = new Date(reviewedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
      const { error } = await supabase.from("value_object_relation_zone_reviews").upsert(
        {
          value_object_id: id,
          zone_key: zoneKey,
          outcome_code: outcomeCode,
          reviewed_at: reviewedAt.toISOString(),
          next_review_at:
            outcomeCode === "not_applicable" ? null : nextReviewAt.toISOString(),
          reviewed_by_user_id: admin.appUser.id,
          review_note: note || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "value_object_id,zone_key" },
      );
      if (error) throw error;
      return await responseForObject(id);
    }

    if (action === "reset_review") {
      const zoneKey = typeof body.zoneKey === "string" ? body.zoneKey.trim() : "";
      if (!zoneKey) {
        return NextResponse.json({ ok: false, error: "ZONE_KEY_REQUIRED" }, { status: 400 });
      }

      const { error } = await supabase
        .from("value_object_relation_zone_reviews")
        .delete()
        .eq("value_object_id", id)
        .eq("zone_key", zoneKey);
      if (error) throw error;

      return await responseForObject(id);
    }

    if (action === "add_relation") {
      const relationTypeCode =
        typeof body.relationTypeCode === "string" ? body.relationTypeCode.trim() : "";
      const targetValueObjectId =
        typeof body.targetValueObjectId === "string" ? body.targetValueObjectId.trim() : "";
      const direction =
        body.direction === "incoming" || body.direction === "outgoing" || body.direction === "symmetric"
          ? body.direction
          : "outgoing";
      const requestedZoneKey =
        typeof body.zoneKey === "string" ? body.zoneKey.trim() : "";
      if (!relationTypeCode || !targetValueObjectId || targetValueObjectId === id) {
        return NextResponse.json({ ok: false, error: "INVALID_RELATION_PAYLOAD" }, { status: 400 });
      }

      const [other, relationTypeResult] = await Promise.all([
        loadObject(targetValueObjectId),
        supabase
          .from("value_object_relation_types")
          .select(
            "relation_type_code,directionality_code,status,canonical_write_policy_code,allowed_source_facet_codes,allowed_target_facet_codes,allowed_source_node_roles,allowed_target_node_roles",
          )
          .eq("relation_type_code", relationTypeCode)
          .maybeSingle(),
      ]);
      if (!other || !isGlobalSystemObject(other) || other.status !== "active") {
        return NextResponse.json({ ok: false, error: "INVALID_GLOBAL_RELATION_TARGET" }, { status: 400 });
      }
      if (relationTypeResult.error) throw relationTypeResult.error;
      const relationType = relationTypeResult.data as (RelationTypeRow & {
        status: string;
        canonical_write_policy_code: string;
      }) | null;
      if (!relationType || relationType.status !== "active" || relationType.canonical_write_policy_code !== "enabled") {
        return NextResponse.json({ ok: false, error: "RELATION_TYPE_NOT_WRITABLE" }, { status: 400 });
      }

      let source = target;
      let destination = other;
      if (relationType.directionality_code === "directed" && direction === "incoming") {
        source = other;
        destination = target;
      }
      const sourceFacet = source.facet_code ?? "";
      const targetFacet = destination.facet_code ?? "";
      const sourceRole = source.node_role_code ?? "";
      const targetRole = destination.node_role_code ?? "";
      if (
        !(relationType.allowed_source_facet_codes ?? []).includes(sourceFacet) ||
        !(relationType.allowed_target_facet_codes ?? []).includes(targetFacet) ||
        !(relationType.allowed_source_node_roles ?? []).includes(sourceRole) ||
        !(relationType.allowed_target_node_roles ?? []).includes(targetRole)
      ) {
        return NextResponse.json({ ok: false, error: "RELATION_GUARD_REJECTED" }, { status: 400 });
      }

      const { error } = await supabase.from("system_value_object_relations").upsert(
        {
          relation_type_code: relationTypeCode,
          source_value_object_id: source.id,
          target_value_object_id: destination.id,
          status: "active",
          provenance_code: "curator_manual",
          created_by_user_id: admin.appUser.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "relation_type_code,source_value_object_id,target_value_object_id" },
      );
      if (error) throw error;

      const changedSemanticZone = semanticZoneKey(
        relationTypeCode,
        relationType.directionality_code,
        relationType.directionality_code === "symmetric" ? "symmetric" : direction,
      );
      const changedPlaneZone = crossPlaneZoneKey(target, other);
      await markReviewZonesStale(
        id,
        [requestedZoneKey, changedSemanticZone, changedPlaneZone ?? ""],
      );

      return await responseForObject(id);
    }

    if (action === "remove_relation") {
      const relationId = typeof body.relationId === "string" ? body.relationId.trim() : "";
      const requestedZoneKey =
        typeof body.zoneKey === "string" ? body.zoneKey.trim() : "";
      if (!relationId) {
        return NextResponse.json({ ok: false, error: "RELATION_ID_REQUIRED" }, { status: 400 });
      }

      const { data: relationData, error: relationReadError } = await supabase
        .from("system_value_object_relations")
        .select("id,relation_type_code,source_value_object_id,target_value_object_id,status")
        .eq("id", relationId)
        .or(`source_value_object_id.eq.${id},target_value_object_id.eq.${id}`)
        .maybeSingle();
      if (relationReadError) throw relationReadError;
      if (!relationData) {
        return NextResponse.json({ ok: false, error: "RELATION_NOT_FOUND" }, { status: 404 });
      }

      const relation = relationData as Pick<
        SystemRelationRow,
        "id" | "relation_type_code" | "source_value_object_id" | "target_value_object_id" | "status"
      >;
      const relatedId =
        relation.source_value_object_id === id
          ? relation.target_value_object_id
          : relation.source_value_object_id;

      const [other, relationTypeResult] = await Promise.all([
        loadObject(relatedId),
        supabase
          .from("value_object_relation_types")
          .select("relation_type_code,directionality_code")
          .eq("relation_type_code", relation.relation_type_code)
          .maybeSingle(),
      ]);
      if (relationTypeResult.error) throw relationTypeResult.error;

      const { error } = await supabase
        .from("system_value_object_relations")
        .update({ status: "inactive", updated_at: new Date().toISOString() })
        .eq("id", relationId)
        .or(`source_value_object_id.eq.${id},target_value_object_id.eq.${id}`);
      if (error) throw error;

      const directionality =
        relationTypeResult.data?.directionality_code === "symmetric"
          ? "symmetric"
          : "directed";
      const direction: RelationDirection =
        directionality === "symmetric"
          ? "symmetric"
          : relation.source_value_object_id === id
            ? "outgoing"
            : "incoming";
      const changedSemanticZone = semanticZoneKey(
        relation.relation_type_code,
        directionality,
        direction,
      );
      const changedPlaneZone = other ? crossPlaneZoneKey(target, other) : null;

      await markReviewZonesStale(
        id,
        [requestedZoneKey, changedSemanticZone, changedPlaneZone ?? ""],
      );

      return await responseForObject(id);
    }


    return NextResponse.json({ ok: false, error: "UNKNOWN_ACTION" }, { status: 400 });
  } catch (error) {
    if (isCoverageSchemaPending(error)) {
      return NextResponse.json(
        { ok: false, error: "RELATIONSHIP_COVERAGE_SCHEMA_PENDING" },
        { status: 409 },
      );
    }

    console.error("relationship coverage POST failed", error);
    return NextResponse.json(
      { ok: false, error: "RELATIONSHIP_COVERAGE_WRITE_FAILED" },
      { status: 500 },
    );
  }
}
