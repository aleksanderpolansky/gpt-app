import { NextResponse } from "next/server";

import type {
  P72B2CatalogParameter,
  P72B2ParameterCatalogError,
  P72B2ParameterCatalogSuccess,
} from "@/types/value-object-parameter-assignment-v2";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../../lib/actor-context";
import { auth0 } from "../../../../../../lib/auth0";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_MARKER = "p7-2b2-parameter-catalog-route-v1" as const;
const READ_MODE = "p7_2b2_parameter_catalog" as const;

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
  parent_value_object_id: string | null;
  owner_user_id: string;
  owner_actor_id: string;
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

type AssignmentRow = {
  id: string;
  parameter_definition_id: string;
  status: "active" | "inactive" | "retired";
  display_order: number;
  valid_from: string;
  valid_to: string | null;
};

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized.length > 0 ? normalized : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string => typeof item === "string" && item.length > 0,
  );
}

function errorResponse(params: {
  status: number;
  errorCode: string;
  errorMessage: string;
  dbReadExecuted: boolean;
}) {
  const body: P72B2ParameterCatalogError = {
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

function mapCatalogParameter(params: {
  definition: DefinitionRow;
  assignment: AssignmentRow | null;
}): P72B2CatalogParameter {
  const { definition, assignment } = params;

  return {
    id: definition.id,
    scopeCode: definition.scope_code,
    parameterCode: definition.parameter_code,
    title: definition.title,
    description: definition.description,
    dimensionCode: definition.dimension_code,
    valueTypeCode: definition.value_type_code,
    canonicalUnitCode: definition.canonical_unit_code,
    allowedUnitCodes: asStringArray(definition.allowed_unit_codes),
    aggregationMethodCode: definition.aggregation_method_code,
    defaultWindowCode: definition.default_window_code,
    status: definition.status,
    assignment: assignment
      ? {
          id: assignment.id,
          status: assignment.status,
          displayOrder: assignment.display_order,
          validFrom: assignment.valid_from,
          validTo: assignment.valid_to,
        }
      : null,
    availableForAssignment:
      definition.status === "active" && assignment === null,
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const valueObjectId = decodeURIComponent(id);

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
      errorCode: "P7_2B2_CATALOG_UNAUTHENTICATED",
      errorMessage: "Authentication is required.",
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
      errorCode: "P7_2B2_CATALOG_ACTOR_CONTEXT_FAILED",
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
      parent_value_object_id,
      owner_user_id,
      owner_actor_id
    `,
    )
    .eq("id", valueObjectId)
    .maybeSingle();

  if (valueObjectError) {
    return errorResponse({
      status: 500,
      errorCode: "P7_2B2_CATALOG_VALUE_OBJECT_LOOKUP_FAILED",
      errorMessage: valueObjectError.message,
      dbReadExecuted: true,
    });
  }

  const valueObject = valueObjectData as ValueObjectRow | null;

  if (!valueObject) {
    return errorResponse({
      status: 404,
      errorCode: "P7_2B2_CATALOG_VALUE_OBJECT_NOT_FOUND",
      errorMessage: "Value Object not found.",
      dbReadExecuted: true,
    });
  }

  if (
    valueObject.owner_user_id !== actorContext.appUserId ||
    valueObject.owner_actor_id !== actorContext.actorId
  ) {
    return errorResponse({
      status: 403,
      errorCode: "P7_2B2_CATALOG_ACCESS_DENIED",
      errorMessage: "This Value Object is not owned by the active actor.",
      dbReadExecuted: true,
    });
  }

  if (
    valueObject.node_role_code !== "activity_leaf" ||
    valueObject.object_kind !== "activity_pattern" ||
    valueObject.parent_value_object_id === null
  ) {
    return errorResponse({
      status: 409,
      errorCode: "P7_2B2_CATALOG_REQUIRES_ACTIVITY_LEAF",
      errorMessage: "Parameters can be managed only for an activity leaf.",
      dbReadExecuted: true,
    });
  }

  const { data: assignmentData, error: assignmentError } = await supabase
    .from("value_object_parameter_assignments")
    .select(
      `
      id,
      parameter_definition_id,
      status,
      display_order,
      valid_from,
      valid_to
    `,
    )
    .eq("value_object_id", valueObjectId)
    .eq("owner_user_id", actorContext.appUserId)
    .eq("owner_actor_id", actorContext.actorId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (assignmentError) {
    return errorResponse({
      status: 500,
      errorCode: "P7_2B2_CATALOG_ASSIGNMENTS_READ_FAILED",
      errorMessage: assignmentError.message,
      dbReadExecuted: true,
    });
  }

  const assignmentRows = (assignmentData ?? []) as AssignmentRow[];
  const assignmentsByDefinitionId = new Map(
    assignmentRows.map(
      (assignment) =>
        [assignment.parameter_definition_id, assignment] as const,
    ),
  );

  const { data: systemData, error: systemError } = await supabase
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
    .eq("scope_code", "system")
    .eq("status", "active")
    .order("title", { ascending: true });

  if (systemError) {
    return errorResponse({
      status: 500,
      errorCode: "P7_2B2_SYSTEM_CATALOG_READ_FAILED",
      errorMessage: systemError.message,
      dbReadExecuted: true,
    });
  }

  const { data: actorData, error: actorError } = await supabase
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
    .eq("scope_code", "actor")
    .eq("owner_user_id", actorContext.appUserId)
    .eq("owner_actor_id", actorContext.actorId)
    .order("status", { ascending: true })
    .order("title", { ascending: true });

  if (actorError) {
    return errorResponse({
      status: 500,
      errorCode: "P7_2B2_ACTOR_CATALOG_READ_FAILED",
      errorMessage: actorError.message,
      dbReadExecuted: true,
    });
  }

  const systemParameters = ((systemData ?? []) as DefinitionRow[]).map(
    (definition) =>
      mapCatalogParameter({
        definition,
        assignment: assignmentsByDefinitionId.get(definition.id) ?? null,
      }),
  );

  const actorParameters = ((actorData ?? []) as DefinitionRow[]).map(
    (definition) =>
      mapCatalogParameter({
        definition,
        assignment: assignmentsByDefinitionId.get(definition.id) ?? null,
      }),
  );

  const body: P72B2ParameterCatalogSuccess = {
    ok: true,
    routeMarker: ROUTE_MARKER,
    readMode: READ_MODE,
    valueObject: {
      id: valueObject.id,
      title: valueObject.title,
      nodeRoleCode: "activity_leaf",
    },
    systemParameters,
    actorParameters,
    counts: {
      systemParameters: systemParameters.length,
      actorParameters: actorParameters.length,
      activeAssignments: assignmentRows.filter(
        (assignment) => assignment.status === "active",
      ).length,
      inactiveAssignments: assignmentRows.filter(
        (assignment) => assignment.status === "inactive",
      ).length,
    },
    sideEffects: {
      dbReadExecuted: true,
      dbWriteExecuted: false,
      rowsActuallyWritten: 0,
    },
  };

  return NextResponse.json(body, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
