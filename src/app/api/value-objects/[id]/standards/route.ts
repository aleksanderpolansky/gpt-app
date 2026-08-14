import { NextResponse } from "next/server";

import { isValueObjectLeafKindV2 } from "@/types/reality-core/reality-core-contracts-v2";
import type {
  P72B1ParameterAssignmentRead,
  P72B1ParameterDefinitionRead,
  P72B1TargetVersionRead,
  P72B1ValueObjectTargetReadError,
  P72B1ValueObjectTargetReadSuccess,
} from "@/types/value-object-target-read-v2";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../../lib/actor-context";
import { auth0 } from "../../../../../../lib/auth0";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_MARKER = "p7-2b1-real-target-read-route-v1" as const;
const READ_MODE = "p7_2b1_real_read_only" as const;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ValueObjectRow = {
  id: string;
  title: string;
  node_role_code: string | null;
  object_kind: string | null;
  object_kind_code: string | null;
  ontology_node_role_code: string | null;
  scope_code: string | null;
  origin_type_code: string | null;
  branch_type_code: string | null;
  root_value_object_id: string | null;
  parent_value_object_id: string | null;
  owner_user_id: string | null;
  owner_actor_id: string | null;
};

type AssignmentRow = {
  id: string;
  value_object_id: string;
  parameter_definition_id: string;
  owner_user_id: string;
  owner_actor_id: string;
  status: "active" | "inactive" | "retired";
  display_order: number;
  valid_from: string;
  valid_to: string | null;
};

type DefinitionRow = {
  id: string;
  scope_code: "system" | "actor";
  parameter_code: string;
  owner_user_id: string | null;
  owner_actor_id: string | null;
  title: string;
  description: string | null;
  dimension_code: string;
  value_type_code: "numeric" | "text" | "boolean" | "timestamp";
  canonical_unit_code: string;
  allowed_unit_codes: unknown;
  aggregation_method_code: string;
  default_window_code: string;
  status: "active" | "retired";
};

type TargetReadRow = {
  id: string;
  target_series_id: string;
  version: number;
  status_code: "draft" | "active" | "superseded" | "archived";
  parameter_assignment_id: string;
  target_kind_code: string;
  normalization_policy_code: string | null;

  original_value_numeric: number | string | null;
  original_min_numeric: number | string | null;
  original_max_numeric: number | string | null;
  original_value_boolean: boolean | null;
  original_value_text: string | null;
  original_unit_code: string | null;

  canonical_value_numeric: number | string | null;
  canonical_min_numeric: number | string | null;
  canonical_max_numeric: number | string | null;
  canonical_value_boolean: boolean | null;
  canonical_value_text: string | null;
  canonical_unit_code: string | null;

  period_count: number | string | null;
  period_unit_code: string | null;
  period_days_numeric: number | string | null;

  daily_equivalent_numeric: number | string | null;
  daily_equivalent_unit_code: string | null;
  normalization_state_code:
    | "derived"
    | "not_applicable"
    | "formula_required";
  normalization_formula_version: string | null;

  priority_code: string;
  source_type_code: string;
  label: string | null;
  description: string | null;
  safety_note: string | null;

  owner_user_id: string;
  owner_actor_id: string;
  supersedes_target_version_id: string | null;
  valid_from: string;
  valid_to: string | null;
  created_at: string;
  updated_at: string;
  metadata_json: unknown;
};

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function asNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string => typeof item === "string" && item.length > 0,
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function errorResponse(params: {
  status: number;
  errorCode: string;
  errorMessage: string;
  dbReadExecuted: boolean;
}) {
  const body: P72B1ValueObjectTargetReadError = {
    ok: false,
    routeMarker: ROUTE_MARKER,
    readMode: READ_MODE,
    errorCode: params.errorCode,
    errorMessage: params.errorMessage,
    sideEffects: {
      dbReadExecuted: params.dbReadExecuted,
      dbWriteExecuted: false,
      rowsActuallyWritten: 0,
    },
  };

  return NextResponse.json(body, { status: params.status });
}

function mapParameterDefinition(
  row: DefinitionRow,
): P72B1ParameterDefinitionRead {
  return {
    id: row.id,
    scopeCode: row.scope_code,
    parameterCode: row.parameter_code,
    title: row.title,
    description: row.description,
    dimensionCode: row.dimension_code,
    valueTypeCode: row.value_type_code,
    canonicalUnitCode: row.canonical_unit_code,
    allowedUnitCodes: asStringArray(row.allowed_unit_codes),
    aggregationMethodCode: row.aggregation_method_code,
    defaultWindowCode: row.default_window_code,
    status: row.status,
  };
}

function mapTargetVersion(row: TargetReadRow): P72B1TargetVersionRead {
  return {
    id: row.id,
    targetSeriesId: row.target_series_id,
    version: row.version,
    statusCode: row.status_code,
    targetKindCode: row.target_kind_code,
    normalizationPolicyCode: row.normalization_policy_code,

    originalValueNumeric: asNullableNumber(row.original_value_numeric),
    originalMinNumeric: asNullableNumber(row.original_min_numeric),
    originalMaxNumeric: asNullableNumber(row.original_max_numeric),
    originalValueBoolean: row.original_value_boolean,
    originalValueText: row.original_value_text,
    originalUnitCode: row.original_unit_code,

    canonicalValueNumeric: asNullableNumber(row.canonical_value_numeric),
    canonicalMinNumeric: asNullableNumber(row.canonical_min_numeric),
    canonicalMaxNumeric: asNullableNumber(row.canonical_max_numeric),
    canonicalValueBoolean: row.canonical_value_boolean,
    canonicalValueText: row.canonical_value_text,
    canonicalUnitCode: row.canonical_unit_code,

    periodCount: asNullableNumber(row.period_count),
    periodUnitCode: row.period_unit_code,
    periodDaysNumeric: asNullableNumber(row.period_days_numeric),

    dailyEquivalentNumeric: asNullableNumber(row.daily_equivalent_numeric),
    dailyEquivalentUnitCode: row.daily_equivalent_unit_code,
    normalizationStateCode: row.normalization_state_code,
    normalizationFormulaVersion: row.normalization_formula_version,

    priorityCode: row.priority_code,
    sourceTypeCode: row.source_type_code,
    label: row.label,
    description: row.description,
    safetyNote: row.safety_note,

    supersedesTargetVersionId: row.supersedes_target_version_id,
    validFrom: row.valid_from,
    validTo: row.valid_to,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    metadata: asRecord(row.metadata_json),
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const routeValueObjectId = decodeURIComponent(id);

  let session: Awaited<ReturnType<typeof auth0.getSession>> | null = null;

  try {
    session = await auth0.getSession();
  } catch {
    session = null;
  }

  const auth0Sub = asString(session?.user?.sub);

  if (!auth0Sub) {
    return errorResponse({
      status: 401,
      errorCode: "P7_2B1_TARGET_READ_UNAUTHENTICATED",
      errorMessage: "Authentication is required to read parameters and targets.",
      dbReadExecuted: false,
    });
  }

  let actorContext: Awaited<ReturnType<typeof resolveActiveActorContext>>;

  try {
    actorContext = await resolveActiveActorContext(auth0Sub);
  } catch (error) {
    if (error instanceof ActorContextError) {
      return errorResponse({
        status: error.status,
        errorCode: error.code,
        errorMessage: error.message,
        dbReadExecuted: true,
      });
    }

    return errorResponse({
      status: 500,
      errorCode: "P7_2B1_TARGET_READ_ACTOR_CONTEXT_FAILED",
      errorMessage: "Could not resolve the active actor context.",
      dbReadExecuted: true,
    });
  }

  const { data: valueObjectData, error: valueObjectError } = await supabase
    .from("value_objects")
    .select(
      `
      id,
      title,
      node_role_code,
      object_kind,
      object_kind_code,
      ontology_node_role_code,
      scope_code,
      origin_type_code,
      branch_type_code,
      root_value_object_id,
      parent_value_object_id,
      owner_user_id,
      owner_actor_id
    `,
    )
    .eq("id", routeValueObjectId)
    .maybeSingle();

  if (valueObjectError) {
    return errorResponse({
      status: 500,
      errorCode: "P7_2B1_VALUE_OBJECT_LOOKUP_FAILED",
      errorMessage: valueObjectError.message,
      dbReadExecuted: true,
    });
  }

  const valueObject = valueObjectData as ValueObjectRow | null;

  if (!valueObject) {
    return errorResponse({
      status: 404,
      errorCode: "P7_2B1_VALUE_OBJECT_NOT_FOUND",
      errorMessage: "Value Object not found.",
      dbReadExecuted: true,
    });
  }

  const isGlobalSystemObject =
    valueObject.scope_code === "global" &&
    valueObject.origin_type_code === "system_model";
  const isOwnedByActiveActor =
    valueObject.owner_user_id === actorContext.appUserId &&
    valueObject.owner_actor_id === actorContext.actorId;

  if (!isGlobalSystemObject && !isOwnedByActiveActor) {
    return errorResponse({
      status: 403,
      errorCode: "P7_2B1_VALUE_OBJECT_ACCESS_DENIED",
      errorMessage: "This Value Object is not owned by the active actor.",
      dbReadExecuted: true,
    });
  }

  const isSemanticLeaf = valueObject.ontology_node_role_code === "leaf";
  const isLegacyActivityLeaf =
    !valueObject.ontology_node_role_code &&
    valueObject.node_role_code === "activity_leaf" &&
    isValueObjectLeafKindV2(valueObject.object_kind) &&
    valueObject.parent_value_object_id !== null;

  if (!isSemanticLeaf && !isLegacyActivityLeaf) {
    return errorResponse({
      status: 409,
      errorCode: "P7_2B1_TARGET_READ_REQUIRES_ACTIVITY_LEAF",
      errorMessage:
        "Parameters and planned targets are available only for an activity observation leaf.",
      dbReadExecuted: true,
    });
  }

  if (isGlobalSystemObject) {
    return NextResponse.json(
      {
        ok: true,
        routeMarker: ROUTE_MARKER,
        readMode: READ_MODE,
        valueObject: {
          id: valueObject.id,
          title: valueObject.title,
          nodeRoleCode: "leaf",
          objectKind:
            valueObject.object_kind_code ?? valueObject.object_kind ?? "unknown",
          branchTypeCode: valueObject.branch_type_code,
          rootValueObjectId:
            valueObject.root_value_object_id ?? valueObject.id,
          parentValueObjectId: valueObject.parent_value_object_id,
        },
        assignments: [],
        counts: {
          assignments: 0,
          activeAssignments: 0,
          targetSeries: 0,
          targetVersions: 0,
        },
        sideEffects: {
          dbReadExecuted: true,
          dbWriteExecuted: false,
          rowsActuallyWritten: 0,
        },
        safety: {
          serverMediatedOnly: true,
          directBrowserSupabaseReadAllowed: false,
          clientProvidedOwnershipTrusted: false,
          writeActionsEnabled: false,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const { data: assignmentData, error: assignmentError } = await supabase
    .from("value_object_parameter_assignments")
    .select(
      `
      id,
      value_object_id,
      parameter_definition_id,
      owner_user_id,
      owner_actor_id,
      status,
      display_order,
      valid_from,
      valid_to
    `,
    )
    .eq("value_object_id", routeValueObjectId)
    .eq("owner_user_id", actorContext.appUserId)
    .eq("owner_actor_id", actorContext.actorId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (assignmentError) {
    return errorResponse({
      status: 500,
      errorCode: "P7_2B1_PARAMETER_ASSIGNMENT_READ_FAILED",
      errorMessage: assignmentError.message,
      dbReadExecuted: true,
    });
  }

  const assignmentRows = (assignmentData ?? []) as AssignmentRow[];
  const definitionIds = [
    ...new Set(assignmentRows.map((row) => row.parameter_definition_id)),
  ];

  let definitionRows: DefinitionRow[] = [];

  if (definitionIds.length > 0) {
    const { data: definitionData, error: definitionError } = await supabase
      .from("value_object_parameter_definitions")
      .select(
        `
        id,
        scope_code,
        parameter_code,
        owner_user_id,
        owner_actor_id,
        title,
        description,
        dimension_code,
        value_type_code,
        canonical_unit_code,
        allowed_unit_codes,
        aggregation_method_code,
        default_window_code,
        status
      `,
      )
      .in("id", definitionIds);

    if (definitionError) {
      return errorResponse({
        status: 500,
        errorCode: "P7_2B1_PARAMETER_DEFINITION_READ_FAILED",
        errorMessage: definitionError.message,
        dbReadExecuted: true,
      });
    }

    definitionRows = (definitionData ?? []) as DefinitionRow[];
  }

  const definitionsById = new Map(
    definitionRows.map((row) => [row.id, row] as const),
  );

  for (const assignment of assignmentRows) {
    const definition = definitionsById.get(
      assignment.parameter_definition_id,
    );

    if (!definition) {
      return errorResponse({
        status: 500,
        errorCode: "P7_2B1_PARAMETER_DEFINITION_MISSING",
        errorMessage:
          "An assigned parameter definition could not be resolved.",
        dbReadExecuted: true,
      });
    }

    const actorDefinitionMisaligned =
      definition.scope_code === "actor" &&
      (definition.owner_user_id !== actorContext.appUserId ||
        definition.owner_actor_id !== actorContext.actorId);

    if (actorDefinitionMisaligned) {
      return errorResponse({
        status: 500,
        errorCode: "P7_2B1_PARAMETER_DEFINITION_OWNER_MISMATCH",
        errorMessage:
          "An assigned actor parameter does not belong to the active actor.",
        dbReadExecuted: true,
      });
    }
  }

  const { data: targetData, error: targetError } = await supabase
    .from("value_object_target_standard_versions_read_v2")
    .select(
      `
      id,
      target_series_id,
      version,
      status_code,
      parameter_assignment_id,
      target_kind_code,
      normalization_policy_code,

      original_value_numeric,
      original_min_numeric,
      original_max_numeric,
      original_value_boolean,
      original_value_text,
      original_unit_code,

      canonical_value_numeric,
      canonical_min_numeric,
      canonical_max_numeric,
      canonical_value_boolean,
      canonical_value_text,
      canonical_unit_code,

      period_count,
      period_unit_code,
      period_days_numeric,

      daily_equivalent_numeric,
      daily_equivalent_unit_code,
      normalization_state_code,
      normalization_formula_version,

      priority_code,
      source_type_code,
      label,
      description,
      safety_note,

      owner_user_id,
      owner_actor_id,
      supersedes_target_version_id,
      valid_from,
      valid_to,
      created_at,
      updated_at,
      metadata_json
    `,
    )
    .eq("value_object_id", routeValueObjectId)
    .eq("owner_user_id", actorContext.appUserId)
    .eq("owner_actor_id", actorContext.actorId)
    .order("target_series_id", { ascending: true })
    .order("version", { ascending: false });

  if (targetError) {
    return errorResponse({
      status: 500,
      errorCode: "P7_2B1_TARGET_VERSION_READ_FAILED",
      errorMessage: targetError.message,
      dbReadExecuted: true,
    });
  }

  const targetRows = (targetData ?? []) as TargetReadRow[];
  const targetsByAssignmentId = new Map<string, P72B1TargetVersionRead[]>();

  for (const targetRow of targetRows) {
    const mappedTarget = mapTargetVersion(targetRow);
    const targets =
      targetsByAssignmentId.get(targetRow.parameter_assignment_id) ?? [];

    targets.push(mappedTarget);
    targetsByAssignmentId.set(targetRow.parameter_assignment_id, targets);
  }

  const assignments: P72B1ParameterAssignmentRead[] = assignmentRows.map(
    (assignment) => {
      const definition = definitionsById.get(
        assignment.parameter_definition_id,
      );

      if (!definition) {
        throw new Error("P7_2B1_PARAMETER_DEFINITION_MISSING_AFTER_VALIDATION");
      }

      const targetHistory = (
        targetsByAssignmentId.get(assignment.id) ?? []
      ).sort((left, right) => right.version - left.version);

      return {
        id: assignment.id,
        status: assignment.status,
        displayOrder: assignment.display_order,
        validFrom: assignment.valid_from,
        validTo: assignment.valid_to,
        parameter: mapParameterDefinition(definition),
        currentTarget:
          targetHistory.find((target) => target.statusCode === "active") ??
          null,
        targetHistory,
      };
    },
  );

  const targetSeries = new Set(
    targetRows.map((target) => target.target_series_id),
  );

  const body: P72B1ValueObjectTargetReadSuccess = {
    ok: true,
    routeMarker: ROUTE_MARKER,
    readMode: READ_MODE,
    valueObject: {
      id: valueObject.id,
      title: valueObject.title,
      nodeRoleCode: isSemanticLeaf ? "leaf" : "activity_leaf",
      objectKind:
        valueObject.object_kind ??
        valueObject.object_kind_code ??
        "unknown",
      branchTypeCode: valueObject.branch_type_code,
      rootValueObjectId:
        valueObject.root_value_object_id ?? valueObject.id,
      parentValueObjectId: valueObject.parent_value_object_id,
    },
    assignments,
    counts: {
      assignments: assignments.length,
      activeAssignments: assignments.filter(
        (assignment) => assignment.status === "active",
      ).length,
      targetSeries: targetSeries.size,
      targetVersions: targetRows.length,
    },
    sideEffects: {
      dbReadExecuted: true,
      dbWriteExecuted: false,
      rowsActuallyWritten: 0,
    },
    safety: {
      serverMediatedOnly: true,
      directBrowserSupabaseReadAllowed: false,
      clientProvidedOwnershipTrusted: false,
      writeActionsEnabled: true,
    },
  };

  return NextResponse.json(body, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
