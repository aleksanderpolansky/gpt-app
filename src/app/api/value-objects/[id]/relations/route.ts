import { NextResponse } from "next/server";

import {
  ActorContextError,
  type ResolvedActorContext,
  resolveActiveActorContext,
} from "../../../../../../lib/actor-context";
import { auth0 } from "../../../../../../lib/auth0";
import { supabase } from "../../../../../../lib/supabase";
import type {
  ValueObjectRelationCandidateDto,
  ValueObjectRelationDirectionality,
  ValueObjectRelationPerspective,
  ValueObjectRelationTypeDto,
  ValueObjectSemanticRelationDto,
  ValueObjectSemanticRelationListResponse,
  ValueObjectSemanticRelationMutationResponse,
} from "@/types/value-object-semantic-relation";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ValueObjectRow = {
  id: string;
  title: string;
  branch_type_code: string | null;
  object_kind: string | null;
  node_role_code: string | null;
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
};

type RelationRow = {
  id: string;
  source_value_object_id: string;
  target_value_object_id: string;
  relation_type_code: string;
  status: string;
  provenance_code: string;
  created_at: string;
  updated_at: string;
  deactivated_at: string | null;
  reactivated_at: string | null;
};

type CreateRelationBody = {
  targetValueObjectId?: unknown;
  relationTypeCode?: unknown;
  provenanceCode?: unknown;
  idempotencyKey?: unknown;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CODE_PATTERN = /^[a-z][a-z0-9_]{1,79}$/;

function normalizeUuid(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return UUID_PATTERN.test(normalized) ? normalized : null;
}

function normalizeCode(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return CODE_PATTERN.test(normalized) ? normalized : null;
}

function normalizeIdempotencyKey(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length >= 8 && normalized.length <= 200
    ? normalized
    : null;
}

function normalizeProvenanceCode(value: unknown): "manual" {
  return value === "manual" ? "manual" : "manual";
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

function toCandidateDto(row: ValueObjectRow): ValueObjectRelationCandidateDto {
  return {
    id: row.id,
    title: row.title,
    branchTypeCode: row.branch_type_code,
    objectKind: row.object_kind,
    nodeRoleCode: row.node_role_code,
    status: row.status,
  };
}

async function resolveRouteActorContext(): Promise<
  | { actorContext: ResolvedActorContext; errorResponse: null }
  | { actorContext: null; errorResponse: NextResponse }
> {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return {
      actorContext: null,
      errorResponse: NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 },
      ),
    };
  }

  try {
    return {
      actorContext: await resolveActiveActorContext(session.user.sub),
      errorResponse: null,
    };
  } catch (error) {
    if (error instanceof ActorContextError) {
      return {
        actorContext: null,
        errorResponse: NextResponse.json(
          { ok: false, error: error.message, errorCode: error.code },
          { status: error.status },
        ),
      };
    }

    return {
      actorContext: null,
      errorResponse: NextResponse.json(
        { ok: false, error: "Could not resolve active actor context" },
        { status: 500 },
      ),
    };
  }
}

async function readOwnedValueObject(
  valueObjectId: string,
  actorContext: ResolvedActorContext,
) {
  return supabase
    .from("value_objects")
    .select(
      "id, title, branch_type_code, object_kind, node_role_code, status",
    )
    .eq("id", valueObjectId)
    .eq("owner_user_id", actorContext.appUserId)
    .eq("owner_actor_id", actorContext.actorId)
    .maybeSingle();
}

function mapRpcErrorStatus(message: string) {
  if (message.includes("P10_IDEMPOTENCY_CONFLICT")) {
    return 409;
  }

  if (
    message.includes("P10_RELATION_OWNER_MISMATCH") ||
    message.includes("P10_CREATE_ACTOR_MISMATCH")
  ) {
    return 403;
  }

  if (
    message.includes("P10_SELF_LINK_FORBIDDEN") ||
    message.includes("P10_RELATION_TYPE_NOT_ACTIVE_ORDINARY") ||
    message.includes("P10_CREATE_ARGUMENT_REQUIRED") ||
    message.includes("P10_IDEMPOTENCY_KEY_INVALID")
  ) {
    return 400;
  }

  return 500;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  const valueObjectId = normalizeUuid(rawId);

  if (!valueObjectId) {
    return NextResponse.json(
      { ok: false, error: "Invalid value object id" },
      { status: 400 },
    );
  }

  const { actorContext, errorResponse } = await resolveRouteActorContext();

  if (errorResponse || !actorContext) {
    return errorResponse;
  }

  const { data: valueObject, error: valueObjectError } =
    await readOwnedValueObject(valueObjectId, actorContext);

  if (valueObjectError) {
    return NextResponse.json(
      { ok: false, error: valueObjectError.message },
      { status: 500 },
    );
  }

  if (!valueObject) {
    return NextResponse.json(
      { ok: false, error: "Value object not found or access denied" },
      { status: 404 },
    );
  }

  const [relationTypesResult, candidatesResult, relationsResult] =
    await Promise.all([
      supabase
        .from("value_object_relation_types")
        .select(
          "relation_type_code, directionality_code, from_scope_code, to_scope_code, title_key, description_key, reverse_title_key, reverse_description_key, allow_self_link, contract_version, display_order, status",
        )
        .order("display_order", { ascending: true })
        .order("relation_type_code", { ascending: true }),
      supabase
        .from("value_objects")
        .select(
          "id, title, branch_type_code, object_kind, node_role_code, status",
        )
        .eq("owner_user_id", actorContext.appUserId)
        .eq("owner_actor_id", actorContext.actorId)
        .neq("id", valueObjectId)
        .not("node_role_code", "is", null)
        .not("branch_type_code", "is", null)
        .in("status", ["draft", "active"])
        .order("title", { ascending: true })
        .order("id", { ascending: true }),
      supabase
        .from("value_object_relations")
        .select(
          "id, source_value_object_id, target_value_object_id, relation_type_code, status, provenance_code, created_at, updated_at, deactivated_at, reactivated_at",
        )
        .eq("owner_user_id", actorContext.appUserId)
        .eq("owner_actor_id", actorContext.actorId)
        .or(
          `source_value_object_id.eq.${valueObjectId},target_value_object_id.eq.${valueObjectId}`,
        )
        .order("updated_at", { ascending: false }),
    ]);

  if (relationTypesResult.error) {
    return NextResponse.json(
      { ok: false, error: relationTypesResult.error.message },
      { status: 500 },
    );
  }

  if (candidatesResult.error) {
    return NextResponse.json(
      { ok: false, error: candidatesResult.error.message },
      { status: 500 },
    );
  }

  if (relationsResult.error) {
    return NextResponse.json(
      { ok: false, error: relationsResult.error.message },
      { status: 500 },
    );
  }

  const relationTypeRows =
    (relationTypesResult.data ?? []) as RelationTypeRow[];
  const allRelationTypes = relationTypeRows.map(toRelationTypeDto);
  const relationTypes = allRelationTypes.filter(
    (relationType) =>
      relationType.status === "active" &&
      (relationType.fromScopeCode === "ordinary" ||
        relationType.fromScopeCode === "both") &&
      (relationType.toScopeCode === "ordinary" ||
        relationType.toScopeCode === "both"),
  );
  const relationTypesByCode = new Map(
    allRelationTypes.map((relationType) => [
      relationType.relationTypeCode,
      relationType,
    ]),
  );
  const candidateRows = (candidatesResult.data ?? []) as ValueObjectRow[];
  const candidates = candidateRows.map(toCandidateDto);
  const relationRows = (relationsResult.data ?? []) as RelationRow[];
  const relatedIds = [
    ...new Set(
      relationRows.map((relation) =>
        relation.source_value_object_id === valueObjectId
          ? relation.target_value_object_id
          : relation.source_value_object_id,
      ),
    ),
  ];

  let relatedRows: ValueObjectRow[] = [];

  if (relatedIds.length > 0) {
    const { data, error } = await supabase
      .from("value_objects")
      .select(
        "id, title, branch_type_code, object_kind, node_role_code, status",
      )
      .eq("owner_user_id", actorContext.appUserId)
      .eq("owner_actor_id", actorContext.actorId)
      .in("id", relatedIds);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    relatedRows = (data ?? []) as ValueObjectRow[];
  }

  const relatedById = new Map(
    relatedRows.map((row) => [row.id, toCandidateDto(row)] as const),
  );
  const relations: ValueObjectSemanticRelationDto[] = [];

  for (const relation of relationRows) {
    const relationType = relationTypesByCode.get(relation.relation_type_code);
    const relatedId =
      relation.source_value_object_id === valueObjectId
        ? relation.target_value_object_id
        : relation.source_value_object_id;
    const relatedValueObject = relatedById.get(relatedId);

    if (!relationType || !relatedValueObject) {
      continue;
    }

    let perspective: ValueObjectRelationPerspective = "outgoing";

    if (relationType.directionalityCode === "symmetric") {
      perspective = "symmetric";
    } else if (relation.target_value_object_id === valueObjectId) {
      perspective = "incoming";
    }

    const status = relation.status === "inactive" ? "inactive" : "active";

    relations.push({
      id: relation.id,
      relationTypeCode: relation.relation_type_code,
      directionalityCode: relationType.directionalityCode,
      perspective,
      titleKey: relationType.titleKey,
      descriptionKey: relationType.descriptionKey,
      reverseTitleKey: relationType.reverseTitleKey,
      reverseDescriptionKey: relationType.reverseDescriptionKey,
      relatedValueObject,
      status,
      provenanceCode: relation.provenance_code,
      createdAt: relation.created_at,
      updatedAt: relation.updated_at,
      deactivatedAt: relation.deactivated_at,
      reactivatedAt: relation.reactivated_at,
      canDeactivate: status === "active",
      canReactivate: status === "inactive" && relationType.status === "active",
    });
  }

  const response: ValueObjectSemanticRelationListResponse = {
    ok: true,
    valueObjectId,
    relationTypes,
    candidates,
    relations,
  };

  return NextResponse.json(response, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  const sourceValueObjectId = normalizeUuid(rawId);

  if (!sourceValueObjectId) {
    return NextResponse.json(
      { ok: false, error: "Invalid source value object id" },
      { status: 400 },
    );
  }

  const { actorContext, errorResponse } = await resolveRouteActorContext();

  if (errorResponse || !actorContext) {
    return errorResponse;
  }

  let body: CreateRelationBody;

  try {
    body = (await request.json()) as CreateRelationBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const targetValueObjectId = normalizeUuid(body.targetValueObjectId);
  const relationTypeCode = normalizeCode(body.relationTypeCode);
  const idempotencyKey = normalizeIdempotencyKey(body.idempotencyKey);
  const provenanceCode = normalizeProvenanceCode(body.provenanceCode);

  if (!targetValueObjectId || !relationTypeCode || !idempotencyKey) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "targetValueObjectId, relationTypeCode and idempotencyKey are required",
      },
      { status: 400 },
    );
  }

  const { data: sourceValueObject, error: sourceError } =
    await readOwnedValueObject(sourceValueObjectId, actorContext);

  if (sourceError) {
    return NextResponse.json(
      { ok: false, error: sourceError.message },
      { status: 500 },
    );
  }

  if (!sourceValueObject) {
    return NextResponse.json(
      { ok: false, error: "Source value object not found or access denied" },
      { status: 404 },
    );
  }

  const { data, error } = await supabase.rpc(
    "create_or_reactivate_value_object_relation_v1",
    {
      p_owner_user_id: actorContext.appUserId,
      p_owner_actor_id: actorContext.actorId,
      p_created_by_actor_id: actorContext.actorId,
      p_source_value_object_id: sourceValueObjectId,
      p_target_value_object_id: targetValueObjectId,
      p_relation_type_code: relationTypeCode,
      p_provenance_code: provenanceCode,
      p_idempotency_key: idempotencyKey,
    },
  );

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        errorCode: error.code ?? null,
      } satisfies ValueObjectSemanticRelationMutationResponse,
      { status: mapRpcErrorStatus(error.message) },
    );
  }

  return NextResponse.json(
    data as ValueObjectSemanticRelationMutationResponse,
    { headers: { "Cache-Control": "no-store" } },
  );
}
