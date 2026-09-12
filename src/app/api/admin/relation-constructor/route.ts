import crypto from "node:crypto";

import { NextResponse } from "next/server";

import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
  type RequirePlatformAdminSuccess,
} from "@/lib/admin/require-platform-admin";
import {
  localizeGlobalSystemValueObject,
  normalizeGlobalSystemValueObjectLocale,
} from "@/lib/reality-core/global-system-value-object-localization";
import type {
  ValueObjectRelationDirectionality,
  ValueObjectRelationTypeDto,
} from "@/types/value-object-semantic-relation";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_MARKER = "admin-relation-constructor-v1" as const;
const CONTRACT = "ARCTOR_SYSTEM_VALUE_OBJECT_RELATION_CONSTRUCTOR_V1" as const;
const PROCESSOR_NAME = "reality_curator_relation_constructor" as const;
const PROCESSOR_VERSION = "1" as const;
const EVENT_CODE = "system_value_object_relation_curator_rationale_recorded" as const;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CODE_RE = /^[a-z][a-z0-9_]{1,79}$/;

type JsonRecord = Record<string, unknown>;

type GlobalValueObjectRow = {
  id: string;
  title: string;
  description: string | null;
  canonical_key: string | null;
  metadata_json: unknown;
  facet_code: string | null;
  node_role_code: string | null;
  ontology_node_role_code: string | null;
  scope_code: string | null;
  origin_type_code: string | null;
  owner_user_id: string | null;
  owner_actor_id: string | null;
  status: string;
};

type RelationTypeRow = {
  relation_type_code: string;
  directionality_code: string;
  from_scope_code: string;
  to_scope_code: string;
  title_key: string;
  description_key: string;
  reverse_title_key: string;
  reverse_description_key: string;
  allow_self_link: boolean;
  contract_version: number;
  display_order: number;
  status: string;
  canonical_write_policy_code: string | null;
  allowed_source_facet_codes: string[] | null;
  allowed_target_facet_codes: string[] | null;
  allowed_source_node_roles: string[] | null;
  allowed_target_node_roles: string[] | null;
};

type RelationRow = {
  id: string;
  relation_type_code: string;
  source_value_object_id: string;
  target_value_object_id: string;
  status: string;
  provenance_code: string;
  created_at: string;
  updated_at: string;
};

type CreateBody = {
  sourceValueObjectId?: unknown;
  targetValueObjectId?: unknown;
  relationTypeCode?: unknown;
  comment?: unknown;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function stableUuid(seed: string): string {
  const bytes = Buffer.from(
    crypto.createHash("sha256").update(seed, "utf8").digest().subarray(0, 16),
  );
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function adminMetadata(guard: RequirePlatformAdminSuccess): JsonRecord {
  return {
    curatorAppUserId: guard.appUser.id,
    curatorAdminId: guard.platformAdmin.id,
    curatorRole: guard.platformAdmin.role,
    curatorNameSnapshot: guard.appUser.name,
    curatorEmailSnapshot: guard.appUser.email,
  };
}

function errorResponse(errorCode: string, error: string, status: number) {
  return NextResponse.json(
    { ok: false, routeMarker: ROUTE_MARKER, errorCode, error },
    { status },
  );
}

function isDirectionality(
  value: string,
): value is ValueObjectRelationDirectionality {
  return value === "directed" || value === "symmetric";
}

function toRelationTypeDto(row: RelationTypeRow): ValueObjectRelationTypeDto {
  return {
    relationTypeCode: row.relation_type_code,
    directionalityCode: isDirectionality(row.directionality_code)
      ? row.directionality_code
      : "directed",
    fromScopeCode: row.from_scope_code,
    toScopeCode: row.to_scope_code,
    titleKey: row.title_key,
    descriptionKey: row.description_key,
    reverseTitleKey: row.reverse_title_key,
    reverseDescriptionKey: row.reverse_description_key,
    allowSelfLink: row.allow_self_link,
    contractVersion: row.contract_version,
    displayOrder: row.display_order,
    status: row.status,
  };
}

async function loadCatalog(localeValue: unknown) {
  const locale = normalizeGlobalSystemValueObjectLocale(localeValue);
  const [objectsResult, relationTypesResult] = await Promise.all([
    supabase
      .from("value_objects")
      .select(
        "id,title,description,canonical_key,metadata_json,facet_code,node_role_code,ontology_node_role_code,scope_code,origin_type_code,owner_user_id,owner_actor_id,status",
      )
      .eq("scope_code", "global")
      .eq("origin_type_code", "system_model")
      .is("owner_user_id", null)
      .is("owner_actor_id", null)
      .eq("status", "active")
      .eq("ontology_node_role_code", "leaf")
      .order("title", { ascending: true })
      .limit(5000),
    supabase
      .from("value_object_relation_types")
      .select(
        "relation_type_code,directionality_code,from_scope_code,to_scope_code,title_key,description_key,reverse_title_key,reverse_description_key,allow_self_link,contract_version,display_order,status,canonical_write_policy_code,allowed_source_facet_codes,allowed_target_facet_codes,allowed_source_node_roles,allowed_target_node_roles",
      )
      .eq("status", "active")
      .eq("canonical_write_policy_code", "enabled")
      .order("display_order", { ascending: true })
      .order("relation_type_code", { ascending: true }),
  ]);

  if (objectsResult.error) {
    throw new Error(
      `RELATION_CONSTRUCTOR_OBJECT_CATALOG_READ_FAILED:${objectsResult.error.message}`,
    );
  }
  if (relationTypesResult.error) {
    throw new Error(
      `RELATION_CONSTRUCTOR_TYPE_CATALOG_READ_FAILED:${relationTypesResult.error.message}`,
    );
  }

  const objects = ((objectsResult.data ?? []) as GlobalValueObjectRow[])
    .map((row) => {
      const localized = localizeGlobalSystemValueObject(row, locale);
      const english = localizeGlobalSystemValueObject(row, "en");
      return {
        id: localized.id,
        title: localized.title,
        description: localized.description,
        titleEn: english.title,
        descriptionEn: english.description,
        canonicalKey: localized.canonical_key,
        facetCode: localized.facet_code,
        nodeRoleCode: row.ontology_node_role_code,
      };
    })
    .sort((left, right) => left.title.localeCompare(right.title, locale));

  const relationTypes = ((relationTypesResult.data ?? []) as RelationTypeRow[])
    .map(toRelationTypeDto);

  return { locale, objects, relationTypes };
}

async function loadRelationEndpoints(sourceId: string, targetId: string) {
  const { data, error } = await supabase
    .from("value_objects")
    .select(
      "id,title,description,canonical_key,metadata_json,facet_code,node_role_code,ontology_node_role_code,scope_code,origin_type_code,owner_user_id,owner_actor_id,status",
    )
    .in("id", [sourceId, targetId]);

  if (error) {
    throw new Error(`RELATION_CONSTRUCTOR_ENDPOINT_READ_FAILED:${error.message}`);
  }

  const rows = (data ?? []) as GlobalValueObjectRow[];
  const source = rows.find((row) => row.id === sourceId) ?? null;
  const target = rows.find((row) => row.id === targetId) ?? null;

  for (const [label, row] of [
    ["SOURCE", source],
    ["TARGET", target],
  ] as const) {
    if (
      !row ||
      row.status !== "active" ||
      row.scope_code !== "global" ||
      row.origin_type_code !== "system_model" ||
      row.owner_user_id !== null ||
      row.owner_actor_id !== null
    ) {
      throw new Error(`RELATION_CONSTRUCTOR_${label}_NOT_AVAILABLE`);
    }

    if (row.ontology_node_role_code !== "leaf") {
      throw new Error(`RELATION_CONSTRUCTOR_${label}_NOT_LEAF`);
    }
  }

  return {
    source: source as GlobalValueObjectRow,
    target: target as GlobalValueObjectRow,
  };
}

async function loadWritableRelationType(relationTypeCode: string) {
  const { data, error } = await supabase
    .from("value_object_relation_types")
    .select(
      "relation_type_code,directionality_code,from_scope_code,to_scope_code,title_key,description_key,reverse_title_key,reverse_description_key,allow_self_link,contract_version,display_order,status,canonical_write_policy_code,allowed_source_facet_codes,allowed_target_facet_codes,allowed_source_node_roles,allowed_target_node_roles",
    )
    .eq("relation_type_code", relationTypeCode)
    .eq("status", "active")
    .eq("canonical_write_policy_code", "enabled")
    .limit(1);

  if (error) {
    throw new Error(`RELATION_CONSTRUCTOR_TYPE_READ_FAILED:${error.message}`);
  }

  const row = (data?.[0] as RelationTypeRow | undefined) ?? null;
  if (!row) throw new Error("RELATION_CONSTRUCTOR_TYPE_NOT_WRITABLE");
  return row;
}

function endpointCompatibilitySnapshot(input: {
  source: GlobalValueObjectRow;
  target: GlobalValueObjectRow;
  relationType: RelationTypeRow;
}): JsonRecord {
  const sourceFacet = text(input.source.facet_code);
  const targetFacet = text(input.target.facet_code);
  const sourceRole = text(input.source.ontology_node_role_code);
  const targetRole = text(input.target.ontology_node_role_code);
  const sourceFacets = input.relationType.allowed_source_facet_codes ?? [];
  const targetFacets = input.relationType.allowed_target_facet_codes ?? [];
  const sourceRoles = input.relationType.allowed_source_node_roles ?? [];
  const targetRoles = input.relationType.allowed_target_node_roles ?? [];

  return {
    sourceFacet,
    targetFacet,
    sourceRole,
    targetRole,
    facetCompatible:
      (sourceFacets.length === 0 || sourceFacets.includes(sourceFacet)) &&
      (targetFacets.length === 0 || targetFacets.includes(targetFacet)),
    nodeRoleCompatible:
      (sourceRoles.length === 0 || sourceRoles.includes(sourceRole)) &&
      (targetRoles.length === 0 || targetRoles.includes(targetRole)),
    enforcementMode: "curator_manual_advisory_only",
  };
}

async function findExistingRelation(
  relationType: RelationTypeRow,
  sourceId: string,
  targetId: string,
): Promise<RelationRow | null> {
  let query = supabase
    .from("system_value_object_relations")
    .select(
      "id,relation_type_code,source_value_object_id,target_value_object_id,status,provenance_code,created_at,updated_at",
    )
    .eq("relation_type_code", relationType.relation_type_code);

  if (relationType.directionality_code === "symmetric") {
    query = query.or(
      `and(source_value_object_id.eq.${sourceId},target_value_object_id.eq.${targetId}),and(source_value_object_id.eq.${targetId},target_value_object_id.eq.${sourceId})`,
    );
  } else {
    query = query
      .eq("source_value_object_id", sourceId)
      .eq("target_value_object_id", targetId);
  }

  const { data, error } = await query.limit(1);
  if (error) {
    throw new Error(
      `RELATION_CONSTRUCTOR_EXISTING_RELATION_READ_FAILED:${error.message}`,
    );
  }

  return (data?.[0] as RelationRow | undefined) ?? null;
}

async function beginCuratorRationaleLog(input: {
  guard: RequirePlatformAdminSuccess;
  source: GlobalValueObjectRow;
  target: GlobalValueObjectRow;
  relationType: RelationTypeRow;
  comment: string;
  registryCompatibility: JsonRecord;
}) {
  const commentHash = crypto
    .createHash("sha256")
    .update(input.comment, "utf8")
    .digest("hex")
    .toUpperCase();
  const id = stableUuid(
    `${CONTRACT}|${input.source.id}|${input.target.id}|${input.relationType.relation_type_code}|${commentHash}`,
  );
  const now = new Date().toISOString();

  const { error } = await supabase.from("activity_processing_logs").insert({
    id,
    user_id: input.guard.appUser.id,
    processor_name: PROCESSOR_NAME,
    processor_version: PROCESSOR_VERSION,
    processing_stage: "validate",
    processing_status: "started",
    severity: "notice",
    message: "Reality curator relation constructor rationale",
    input_json: {},
    output_json: {},
    error_json: {},
    metadata_json: {
      contract: CONTRACT,
      eventCode: EVENT_CODE,
      actorKind: "curator",
      provenance: "curator_action",
      ...adminMetadata(input.guard),
      sourceValueObjectId: input.source.id,
      sourceValueObjectTitleSnapshot: input.source.title,
      targetValueObjectId: input.target.id,
      targetValueObjectTitleSnapshot: input.target.title,
      relationTypeCode: input.relationType.relation_type_code,
      curatorComment: input.comment,
      commentHash,
      registryCompatibility: input.registryCompatibility,
    },
    started_at: now,
  });

  if (error && error.code !== "23505") {
    throw new Error(
      `RELATION_CONSTRUCTOR_RATIONALE_WRITE_FAILED:${error.message}`,
    );
  }

  return id;
}

async function finishCuratorRationaleLog(input: {
  id: string;
  relationId?: string;
  error?: string;
}) {
  const now = new Date().toISOString();
  const payload = input.error
    ? {
        processing_status: "failed",
        severity: "error",
        error_json: { error: input.error },
        finished_at: now,
      }
    : {
        processing_status: "completed",
        severity: "notice",
        output_json: { relationId: input.relationId ?? null },
        finished_at: now,
      };

  const { error } = await supabase
    .from("activity_processing_logs")
    .update(payload)
    .eq("id", input.id)
    .eq("processor_name", PROCESSOR_NAME)
    .eq("processor_version", PROCESSOR_VERSION);

  if (error) {
    console.error(
      "RELATION_CONSTRUCTOR_RATIONALE_FINALIZE_FAILED",
      error.message,
    );
  }
}

async function loadRelationById(relationId: string): Promise<RelationRow | null> {
  const { data, error } = await supabase
    .from("system_value_object_relations")
    .select(
      "id,relation_type_code,source_value_object_id,target_value_object_id,status,provenance_code,created_at,updated_at",
    )
    .eq("id", relationId)
    .limit(1);

  if (error) {
    throw new Error(
      `RELATION_CONSTRUCTOR_RELATION_READ_FAILED:${error.message}`,
    );
  }

  return (data?.[0] as RelationRow | undefined) ?? null;
}

async function loadLatestCuratorComment(
  relationId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("activity_processing_logs")
    .select("metadata_json")
    .eq("processor_name", PROCESSOR_NAME)
    .eq("processor_version", PROCESSOR_VERSION)
    .eq("processing_status", "completed")
    .contains("output_json", { relationId })
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(
      `RELATION_CONSTRUCTOR_COMMENT_READ_FAILED:${error.message}`,
    );
  }

  for (const row of data ?? []) {
    const metadata =
      row.metadata_json &&
      typeof row.metadata_json === "object" &&
      !Array.isArray(row.metadata_json)
        ? (row.metadata_json as JsonRecord)
        : {};
    const comment = text(metadata.curatorComment);
    if (comment) return comment;
  }

  return null;
}

async function writeRelationAuditLog(input: {
  guard: RequirePlatformAdminSuccess;
  eventCode:
    | "system_value_object_relation_updated"
    | "system_value_object_relation_deleted";
  relationId: string;
  sourceValueObjectId: string;
  targetValueObjectId: string;
  relationTypeCode: string;
  comment?: string | null;
}) {
  const now = new Date().toISOString();
  const { error } = await supabase.from("activity_processing_logs").insert({
    id: crypto.randomUUID(),
    user_id: input.guard.appUser.id,
    processor_name: PROCESSOR_NAME,
    processor_version: PROCESSOR_VERSION,
    processing_stage: "validate",
    processing_status: "completed",
    severity: "notice",
    message:
      input.eventCode === "system_value_object_relation_deleted"
        ? "Reality curator system relation deleted"
        : "Reality curator system relation updated",
    input_json: {},
    output_json: { relationId: input.relationId },
    error_json: {},
    metadata_json: {
      contract: CONTRACT,
      eventCode: input.eventCode,
      actorKind: "curator",
      provenance: "curator_action",
      ...adminMetadata(input.guard),
      sourceValueObjectId: input.sourceValueObjectId,
      targetValueObjectId: input.targetValueObjectId,
      relationTypeCode: input.relationTypeCode,
      curatorComment: input.comment ?? null,
      changedAt: now,
    },
    started_at: now,
    finished_at: now,
    duration_ms: 0,
  });

  if (error) {
    throw new Error(`RELATION_CONSTRUCTOR_AUDIT_WRITE_FAILED:${error.message}`);
  }
}

export async function GET(request: Request) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return platformAdminErrorResponse(guard, ROUTE_MARKER);

  try {
    const url = new URL(request.url);
    const catalog = await loadCatalog(url.searchParams.get("locale"));
    const relationId = text(url.searchParams.get("relationId"));

    let editingRelation: {
      id: string;
      sourceValueObjectId: string;
      targetValueObjectId: string;
      relationTypeCode: string;
      comment: string;
      status: string;
    } | null = null;

    if (relationId) {
      if (!UUID_RE.test(relationId)) {
        return errorResponse(
          "RELATION_CONSTRUCTOR_RELATION_ID_INVALID",
          "relationId is invalid",
          400,
        );
      }

      const relation = await loadRelationById(relationId);
      if (!relation || relation.status !== "active") {
        return errorResponse(
          "RELATION_CONSTRUCTOR_RELATION_NOT_FOUND",
          "Active relation was not found",
          404,
        );
      }

      editingRelation = {
        id: relation.id,
        sourceValueObjectId: relation.source_value_object_id,
        targetValueObjectId: relation.target_value_object_id,
        relationTypeCode: relation.relation_type_code,
        comment: (await loadLatestCuratorComment(relation.id)) ?? "",
        status: relation.status,
      };
    }

    return NextResponse.json({
      ok: true,
      routeMarker: ROUTE_MARKER,
      ...catalog,
      editingRelation,
      contract: CONTRACT,
      fields: [
        "sourceValueObjectId",
        "targetValueObjectId",
        "relationTypeCode",
        "comment",
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResponse("RELATION_CONSTRUCTOR_GET_FAILED", message, 500);
  }
}

export async function POST(request: Request) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return platformAdminErrorResponse(guard, ROUTE_MARKER);

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return errorResponse(
      "RELATION_CONSTRUCTOR_JSON_INVALID",
      "Invalid JSON body",
      400,
    );
  }

  const sourceValueObjectId = text(body.sourceValueObjectId);
  const targetValueObjectId = text(body.targetValueObjectId);
  const relationTypeCode = text(body.relationTypeCode);
  const comment = text(body.comment);

  if (!UUID_RE.test(sourceValueObjectId)) {
    return errorResponse(
      "RELATION_CONSTRUCTOR_SOURCE_INVALID",
      "sourceValueObjectId is invalid",
      400,
    );
  }
  if (!UUID_RE.test(targetValueObjectId)) {
    return errorResponse(
      "RELATION_CONSTRUCTOR_TARGET_INVALID",
      "targetValueObjectId is invalid",
      400,
    );
  }
  if (sourceValueObjectId === targetValueObjectId) {
    return errorResponse(
      "RELATION_CONSTRUCTOR_SELF_LINK_FORBIDDEN",
      "Source and target observation objects must be different",
      400,
    );
  }
  if (!CODE_RE.test(relationTypeCode)) {
    return errorResponse(
      "RELATION_CONSTRUCTOR_TYPE_INVALID",
      "relationTypeCode is invalid",
      400,
    );
  }
  if (!comment || comment.length > 4000) {
    return errorResponse(
      "RELATION_CONSTRUCTOR_COMMENT_REQUIRED",
      "comment is required and must be 4000 characters or fewer",
      400,
    );
  }

  try {
    const [{ source, target }, relationType] = await Promise.all([
      loadRelationEndpoints(sourceValueObjectId, targetValueObjectId),
      loadWritableRelationType(relationTypeCode),
    ]);

    const registryCompatibility = endpointCompatibilitySnapshot({
      source,
      target,
      relationType,
    });

    const rationaleLogId = await beginCuratorRationaleLog({
      guard,
      source,
      target,
      relationType,
      comment,
      registryCompatibility,
    });

    try {
      const existing = await findExistingRelation(
        relationType,
        source.id,
        target.id,
      );

      let writeSourceId = existing?.source_value_object_id ?? source.id;
      let writeTargetId = existing?.target_value_object_id ?? target.id;

      if (!existing && relationType.directionality_code === "symmetric") {
        if (writeSourceId.localeCompare(writeTargetId) > 0) {
          [writeSourceId, writeTargetId] = [writeTargetId, writeSourceId];
        }
      }

      const { data, error } = await supabase
        .from("system_value_object_relations")
        .upsert(
          {
            relation_type_code: relationType.relation_type_code,
            source_value_object_id: writeSourceId,
            target_value_object_id: writeTargetId,
            status: "active",
            provenance_code: "curator_manual",
            created_by_user_id: guard.appUser.id,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict:
              "relation_type_code,source_value_object_id,target_value_object_id",
          },
        )
        .select(
          "id,relation_type_code,source_value_object_id,target_value_object_id,status,provenance_code,created_at,updated_at",
        )
        .single();

      if (error || !data) {
        throw new Error(
          `RELATION_CONSTRUCTOR_RELATION_WRITE_FAILED:${error?.message ?? "NO_ROW"}`,
        );
      }

      const relation = data as RelationRow;
      await finishCuratorRationaleLog({
        id: rationaleLogId,
        relationId: relation.id,
      });

      return NextResponse.json({
        ok: true,
        routeMarker: ROUTE_MARKER,
        relation: {
          id: relation.id,
          relationTypeCode: relation.relation_type_code,
          sourceValueObjectId: relation.source_value_object_id,
          targetValueObjectId: relation.target_value_object_id,
          status: relation.status,
        },
        curatorCommentRecorded: true,
        duplicateOrReactivated: Boolean(existing),
      });
    } catch (writeError) {
      const message =
        writeError instanceof Error ? writeError.message : String(writeError);
      await finishCuratorRationaleLog({
        id: rationaleLogId,
        error: message,
      });
      throw writeError;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status =
      message.includes("NOT_AVAILABLE") ||
      message.includes("NOT_WRITABLE") ||
      message.includes("NOT_LEAF")
        ? 409
        : 500;
    return errorResponse("RELATION_CONSTRUCTOR_POST_FAILED", message, status);
  }
}

export async function PUT(request: Request) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return platformAdminErrorResponse(guard, ROUTE_MARKER);

  const relationId = text(new URL(request.url).searchParams.get("relationId"));
  if (!UUID_RE.test(relationId)) {
    return errorResponse(
      "RELATION_CONSTRUCTOR_RELATION_ID_INVALID",
      "relationId is invalid",
      400,
    );
  }

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return errorResponse(
      "RELATION_CONSTRUCTOR_JSON_INVALID",
      "Invalid JSON body",
      400,
    );
  }

  const sourceValueObjectId = text(body.sourceValueObjectId);
  const targetValueObjectId = text(body.targetValueObjectId);
  const relationTypeCode = text(body.relationTypeCode);
  const comment = text(body.comment);

  if (!UUID_RE.test(sourceValueObjectId)) {
    return errorResponse(
      "RELATION_CONSTRUCTOR_SOURCE_INVALID",
      "sourceValueObjectId is invalid",
      400,
    );
  }
  if (!UUID_RE.test(targetValueObjectId)) {
    return errorResponse(
      "RELATION_CONSTRUCTOR_TARGET_INVALID",
      "targetValueObjectId is invalid",
      400,
    );
  }
  if (sourceValueObjectId === targetValueObjectId) {
    return errorResponse(
      "RELATION_CONSTRUCTOR_SELF_LINK_FORBIDDEN",
      "Source and target observation objects must be different",
      400,
    );
  }
  if (!CODE_RE.test(relationTypeCode)) {
    return errorResponse(
      "RELATION_CONSTRUCTOR_TYPE_INVALID",
      "relationTypeCode is invalid",
      400,
    );
  }
  if (!comment || comment.length > 4000) {
    return errorResponse(
      "RELATION_CONSTRUCTOR_COMMENT_REQUIRED",
      "comment is required and must be 4000 characters or fewer",
      400,
    );
  }

  try {
    const current = await loadRelationById(relationId);
    if (!current || current.status !== "active") {
      return errorResponse(
        "RELATION_CONSTRUCTOR_RELATION_NOT_FOUND",
        "Active relation was not found",
        404,
      );
    }

    const [{ source, target }, relationType] = await Promise.all([
      loadRelationEndpoints(sourceValueObjectId, targetValueObjectId),
      loadWritableRelationType(relationTypeCode),
    ]);

    let writeSourceId = source.id;
    let writeTargetId = target.id;
    if (relationType.directionality_code === "symmetric") {
      if (writeSourceId.localeCompare(writeTargetId) > 0) {
        [writeSourceId, writeTargetId] = [writeTargetId, writeSourceId];
      }
    }

    const duplicate = await findExistingRelation(
      relationType,
      writeSourceId,
      writeTargetId,
    );
    if (duplicate && duplicate.id !== relationId) {
      return errorResponse(
        "RELATION_CONSTRUCTOR_DUPLICATE_ACTIVE_RELATION",
        "Another active relation with the same identity already exists",
        409,
      );
    }

    const { data, error } = await supabase
      .from("system_value_object_relations")
      .update({
        relation_type_code: relationType.relation_type_code,
        source_value_object_id: writeSourceId,
        target_value_object_id: writeTargetId,
        status: "active",
        provenance_code: "curator_manual",
        updated_at: new Date().toISOString(),
      })
      .eq("id", relationId)
      .select(
        "id,relation_type_code,source_value_object_id,target_value_object_id,status,provenance_code,created_at,updated_at",
      )
      .single();

    if (error || !data) {
      throw new Error(
        `RELATION_CONSTRUCTOR_RELATION_UPDATE_FAILED:${error?.message ?? "NO_ROW"}`,
      );
    }

    const relation = data as RelationRow;
    await writeRelationAuditLog({
      guard,
      eventCode: "system_value_object_relation_updated",
      relationId: relation.id,
      sourceValueObjectId: relation.source_value_object_id,
      targetValueObjectId: relation.target_value_object_id,
      relationTypeCode: relation.relation_type_code,
      comment,
    });

    return NextResponse.json({
      ok: true,
      routeMarker: ROUTE_MARKER,
      relation: {
        id: relation.id,
        relationTypeCode: relation.relation_type_code,
        sourceValueObjectId: relation.source_value_object_id,
        targetValueObjectId: relation.target_value_object_id,
        status: relation.status,
      },
      curatorCommentRecorded: true,
      updated: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status =
      message.includes("NOT_AVAILABLE") ||
      message.includes("NOT_WRITABLE") ||
      message.includes("NOT_LEAF") ||
      message.includes("duplicate key")
        ? 409
        : 500;
    return errorResponse("RELATION_CONSTRUCTOR_PUT_FAILED", message, status);
  }
}

export async function DELETE(request: Request) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return platformAdminErrorResponse(guard, ROUTE_MARKER);

  const relationId = text(new URL(request.url).searchParams.get("relationId"));
  if (!UUID_RE.test(relationId)) {
    return errorResponse(
      "RELATION_CONSTRUCTOR_RELATION_ID_INVALID",
      "relationId is invalid",
      400,
    );
  }

  try {
    const relation = await loadRelationById(relationId);
    if (!relation || relation.status !== "active") {
      return errorResponse(
        "RELATION_CONSTRUCTOR_RELATION_NOT_FOUND",
        "Active relation was not found",
        404,
      );
    }

    const { error } = await supabase
      .from("system_value_object_relations")
      .update({
        status: "inactive",
        updated_at: new Date().toISOString(),
      })
      .eq("id", relationId)
      .eq("status", "active");

    if (error) {
      throw new Error(
        `RELATION_CONSTRUCTOR_RELATION_DELETE_FAILED:${error.message}`,
      );
    }

    await writeRelationAuditLog({
      guard,
      eventCode: "system_value_object_relation_deleted",
      relationId: relation.id,
      sourceValueObjectId: relation.source_value_object_id,
      targetValueObjectId: relation.target_value_object_id,
      relationTypeCode: relation.relation_type_code,
      comment: null,
    });

    return NextResponse.json({
      ok: true,
      routeMarker: ROUTE_MARKER,
      relationId,
      deleted: true,
      deleteMode: "soft_inactive",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResponse(
      "RELATION_CONSTRUCTOR_DELETE_FAILED",
      message,
      500,
    );
  }
}
