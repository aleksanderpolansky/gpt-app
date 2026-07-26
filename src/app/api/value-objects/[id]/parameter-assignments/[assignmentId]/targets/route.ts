import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import type {
  P72B3NormalizationPolicyCode,
  P72B3PeriodUnitCode,
  P72B3PriorityCode,
  P72B3TargetCreateVersionRequest,
  P72B3TargetKindCode,
  P72B3TargetWriteError,
  P72B3TargetWriteResult,
  P72B3TargetWriteSuccess,
} from "@/types/value-object-target-write-v2";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../../../../lib/actor-context";
import { auth0 } from "../../../../../../../../lib/auth0";
import { supabase } from "../../../../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_MARKER = "p7-2b3-target-write-route-v1" as const;
const WRITE_MODE = "p7_2b3_target_write" as const;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const TARGET_KINDS = new Set<P72B3TargetKindCode>([
  "amount_per_period",
  "count_per_period",
  "point_value",
  "range",
  "threshold_min",
  "threshold_max",
  "boolean_condition",
  "qualitative_criterion",
]);

const NORMALIZATION_POLICIES = new Set<P72B3NormalizationPolicyCode>([
  "linear_rate",
  "cadence_rate",
  "no_daily_division",
  "custom_formula",
]);

const PERIOD_UNITS = new Set<P72B3PeriodUnitCode>([
  "day",
  "week",
  "month",
  "quarter",
  "year",
  "rolling_7_days",
  "rolling_30_days",
]);

const PRIORITIES = new Set<P72B3PriorityCode>([
  "low",
  "normal",
  "high",
  "critical",
]);

const REQUIRED_PERIOD_KINDS = new Set<P72B3TargetKindCode>([
  "amount_per_period",
  "count_per_period",
]);

const FORBIDDEN_PERIOD_KINDS = new Set<P72B3TargetKindCode>([
  "point_value",
  "boolean_condition",
  "qualitative_criterion",
]);

const NUMERIC_KINDS = new Set<P72B3TargetKindCode>([
  "amount_per_period",
  "count_per_period",
  "point_value",
  "range",
  "threshold_min",
  "threshold_max",
]);

const DEFAULT_POLICY: Record<
  P72B3TargetKindCode,
  P72B3NormalizationPolicyCode
> = {
  amount_per_period: "linear_rate",
  count_per_period: "cadence_rate",
  point_value: "no_daily_division",
  range: "no_daily_division",
  threshold_min: "no_daily_division",
  threshold_max: "no_daily_division",
  boolean_condition: "no_daily_division",
  qualitative_criterion: "no_daily_division",
};

type RouteContext = {
  params: Promise<{
    id: string;
    assignmentId: string;
  }>;
};

type ValueObjectRow = {
  id: string;
  owner_user_id: string;
  owner_actor_id: string;
  node_role_code: string | null;
  object_kind: string | null;
  parent_value_object_id: string | null;
};

type AssignmentRow = {
  id: string;
  value_object_id: string;
  parameter_definition_id: string;
  owner_user_id: string;
  owner_actor_id: string;
  status: "active" | "inactive" | "retired";
};

type DefinitionRow = {
  id: string;
  value_type_code: "numeric" | "text" | "boolean" | "timestamp";
  allowed_unit_codes: unknown;
  status: "active" | "retired";
  scope_code: "system" | "actor";
  owner_user_id: string | null;
  owner_actor_id: string | null;
};

type ActiveTargetRow = {
  target_series_id: string;
};

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized.length > 0 ? normalized : null;
}

function asOptionalText(value: unknown, maximumLength: number): string | null {
  const normalized = asString(value);

  if (!normalized) {
    return null;
  }

  return normalized.length <= maximumLength ? normalized : null;
}

function asFiniteNumber(value: unknown): number | null {
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

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableValue(item)]),
    );
  }

  return value;
}

function requestHash(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(stableValue(value)))
    .digest("hex")
    .toUpperCase();
}

function isCreateVersionRequest(
  value: unknown,
): value is P72B3TargetCreateVersionRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const row = value as Partial<P72B3TargetCreateVersionRequest>;

  return (
    (row.mode === "create_series" || row.mode === "new_version") &&
    typeof row.targetKindCode === "string" &&
    TARGET_KINDS.has(row.targetKindCode as P72B3TargetKindCode) &&
    typeof row.idempotencyKey === "string"
  );
}

function normalizedErrorCode(message: string | undefined): string {
  const candidate = message?.match(/P7_2(?:B3)?_[A-Z0-9_]+/)?.[0];

  return candidate ?? "P7_2B3_TARGET_WRITE_FAILED";
}

function errorStatus(errorCode: string): number {
  if (
    errorCode.includes("OWNER") ||
    errorCode.includes("ACCESS_DENIED") ||
    errorCode.includes("ACTOR_NOT_OWNED") ||
    errorCode.includes("CREATOR_NOT_OWNED")
  ) {
    return 403;
  }

  if (errorCode.includes("NOT_FOUND")) {
    return 404;
  }

  if (
    errorCode.includes("IDEMPOTENCY_PAYLOAD_MISMATCH") ||
    errorCode.includes("REQUIRES_ACTIVITY_LEAF") ||
    errorCode.includes("NOT_ACTIVE") ||
    errorCode.includes("ALREADY_EXISTS") ||
    errorCode.includes("NOT_ALLOWED") ||
    errorCode.includes("FORBIDDEN") ||
    errorCode.includes("IDENTITY_CHANGE") ||
    errorCode.includes("SEQUENCE")
  ) {
    return 409;
  }

  if (
    errorCode.includes("INVALID") ||
    errorCode.includes("REQUIRED") ||
    errorCode.includes("MUST_BE") ||
    errorCode.includes("SHAPE") ||
    errorCode.includes("NOT_SUPPORTED")
  ) {
    return 400;
  }

  return 500;
}

function errorResponse(params: {
  status: number;
  errorCode: string;
  errorMessage: string;
  dbReadExecuted: boolean;
  dbWriteExecuted: boolean;
}) {
  const body: P72B3TargetWriteError = {
    ok: false,
    routeMarker: ROUTE_MARKER,
    writeMode: WRITE_MODE,
    errorCode: params.errorCode,
    errorMessage: params.errorMessage,
    sideEffects: {
      dbReadExecuted: params.dbReadExecuted,
      dbWriteExecuted: params.dbWriteExecuted,
      rowsActuallyWritten: 0,
    },
  };

  return NextResponse.json(body, { status: params.status });
}

function normalizeRequest(params: {
  request: P72B3TargetCreateVersionRequest;
  definition: DefinitionRow;
}):
  | {
      mode: "create_series" | "new_version";
      targetSeriesId: string | null;
      payload: Record<string, unknown>;
      idempotencyKey: string;
    }
  | null {
  const { request, definition } = params;
  const idempotencyKey = request.idempotencyKey.trim();

  if (idempotencyKey.length < 8 || idempotencyKey.length > 200) {
    return null;
  }

  const targetSeriesId = asString(request.targetSeriesId);

  if (
    (request.mode === "new_version" &&
      (!targetSeriesId || !UUID_PATTERN.test(targetSeriesId))) ||
    (request.mode === "create_series" && targetSeriesId !== null)
  ) {
    return null;
  }

  const targetKindCode = request.targetKindCode;
  const requestedPolicy = asString(request.normalizationPolicyCode);
  const normalizationPolicyCode = requestedPolicy
    ? (requestedPolicy as P72B3NormalizationPolicyCode)
    : DEFAULT_POLICY[targetKindCode];

  if (!NORMALIZATION_POLICIES.has(normalizationPolicyCode)) {
    return null;
  }

  if (
    normalizationPolicyCode !== DEFAULT_POLICY[targetKindCode] &&
    normalizationPolicyCode !== "custom_formula"
  ) {
    return null;
  }

  if (
    (definition.value_type_code === "numeric" &&
      !NUMERIC_KINDS.has(targetKindCode)) ||
    (definition.value_type_code === "boolean" &&
      targetKindCode !== "boolean_condition") ||
    (definition.value_type_code === "text" &&
      targetKindCode !== "qualitative_criterion") ||
    definition.value_type_code === "timestamp"
  ) {
    return null;
  }

  const originalValueNumeric = asFiniteNumber(request.originalValueNumeric);
  const originalMinNumeric = asFiniteNumber(request.originalMinNumeric);
  const originalMaxNumeric = asFiniteNumber(request.originalMaxNumeric);
  const originalValueBoolean =
    typeof request.originalValueBoolean === "boolean"
      ? request.originalValueBoolean
      : null;
  const originalValueText = asOptionalText(request.originalValueText, 4000);
  const originalUnitCode = asString(request.originalUnitCode);
  const periodCount = asFiniteNumber(request.periodCount);
  const rawPeriodUnit = asString(request.periodUnitCode);
  const periodUnitCode = rawPeriodUnit
    ? (rawPeriodUnit as P72B3PeriodUnitCode)
    : null;

  if (definition.value_type_code === "numeric") {
    const allowedUnits = asStringArray(definition.allowed_unit_codes);

    if (!originalUnitCode || !allowedUnits.includes(originalUnitCode)) {
      return null;
    }

    if (targetKindCode === "range") {
      if (
        originalMinNumeric === null ||
        originalMaxNumeric === null ||
        originalMinNumeric > originalMaxNumeric
      ) {
        return null;
      }
    } else if (originalValueNumeric === null) {
      return null;
    }
  }

  if (
    definition.value_type_code === "boolean" &&
    originalValueBoolean === null
  ) {
    return null;
  }

  if (definition.value_type_code === "text" && !originalValueText) {
    return null;
  }

  if (REQUIRED_PERIOD_KINDS.has(targetKindCode)) {
    if (
      periodCount === null ||
      periodCount <= 0 ||
      !periodUnitCode ||
      !PERIOD_UNITS.has(periodUnitCode)
    ) {
      return null;
    }
  } else if (FORBIDDEN_PERIOD_KINDS.has(targetKindCode)) {
    if (periodCount !== null || periodUnitCode !== null) {
      return null;
    }
  } else if (
    (periodCount === null) !== (periodUnitCode === null) ||
    (periodUnitCode !== null && !PERIOD_UNITS.has(periodUnitCode)) ||
    (periodCount !== null && periodCount <= 0)
  ) {
    return null;
  }

  const priorityCode = request.priorityCode ?? "normal";

  if (!PRIORITIES.has(priorityCode)) {
    return null;
  }

  return {
    mode: request.mode,
    targetSeriesId,
    idempotencyKey,
    payload: {
      parameterAssignmentId: "__ROUTE_ASSIGNMENT_ID__",
      ...(targetSeriesId ? { targetSeriesId } : {}),
      targetKindCode,
      normalizationPolicyCode,
      originalValueNumeric:
        targetKindCode === "range" ? null : originalValueNumeric,
      originalMinNumeric:
        targetKindCode === "range" ? originalMinNumeric : null,
      originalMaxNumeric:
        targetKindCode === "range" ? originalMaxNumeric : null,
      originalValueBoolean:
        definition.value_type_code === "boolean"
          ? originalValueBoolean
          : null,
      originalValueText:
        definition.value_type_code === "text" ? originalValueText : null,
      originalUnitCode:
        definition.value_type_code === "numeric" ? originalUnitCode : null,
      periodCount,
      periodUnitCode,
      priorityCode,
      sourceTypeCode: "user_defined",
      statusCode: "active",
      label: asOptionalText(request.label, 200),
      description: asOptionalText(request.description, 4000),
      safetyNote: asOptionalText(request.safetyNote, 4000),
      metadata: {
        writeContract: "p7-2b3-target-write-v1",
      },
    },
  };
}

function mapResult(params: {
  data: unknown;
  mode: "create_series" | "new_version";
}): P72B3TargetWriteResult | null {
  const response = asRecord(params.data);
  const target = asRecord(response.target);
  const targetSeriesId = asString(target.target_series_id);
  const targetVersionId = asString(target.id);
  const version = asFiniteNumber(target.version);
  const statusCode = asString(target.status_code);
  const normalizationStateCode = asString(target.normalization_state_code);
  const dailyEquivalentNumeric = asFiniteNumber(
    target.daily_equivalent_numeric,
  );
  const idempotentReplay = response.idempotentReplay === true;

  if (
    !targetSeriesId ||
    !targetVersionId ||
    version === null ||
    !statusCode ||
    !normalizationStateCode
  ) {
    return null;
  }

  return {
    targetSeriesId,
    targetVersionId,
    version,
    statusCode: statusCode as P72B3TargetWriteResult["statusCode"],
    normalizationStateCode:
      normalizationStateCode as P72B3TargetWriteResult["normalizationStateCode"],
    dailyEquivalentNumeric,
    idempotentReplay,
    rowsActuallyWritten: idempotentReplay
      ? 0
      : params.mode === "new_version"
        ? 2
        : 1,
  };
}

export async function POST(request: Request, context: RouteContext) {
  const { id, assignmentId } = await context.params;
  const valueObjectId = decodeURIComponent(id);
  const decodedAssignmentId = decodeURIComponent(assignmentId);

  if (
    !UUID_PATTERN.test(valueObjectId) ||
    !UUID_PATTERN.test(decodedAssignmentId)
  ) {
    return errorResponse({
      status: 400,
      errorCode: "P7_2B3_IDENTIFIER_INVALID",
      errorMessage: "The Value Object or assignment id is invalid.",
      dbReadExecuted: false,
      dbWriteExecuted: false,
    });
  }

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
      errorCode: "P7_2B3_WRITE_UNAUTHENTICATED",
      errorMessage: "Authentication is required.",
      dbReadExecuted: false,
      dbWriteExecuted: false,
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
        dbWriteExecuted: false,
      });
    }

    return errorResponse({
      status: 500,
      errorCode: "P7_2B3_WRITE_ACTOR_CONTEXT_FAILED",
      errorMessage: "Could not resolve the active actor context.",
      dbReadExecuted: true,
      dbWriteExecuted: false,
    });
  }

  const { data: valueObjectData, error: valueObjectError } = await supabase
    .from("value_objects")
    .select(
      "id, owner_user_id, owner_actor_id, node_role_code, object_kind, parent_value_object_id",
    )
    .eq("id", valueObjectId)
    .maybeSingle();

  if (valueObjectError) {
    return errorResponse({
      status: 500,
      errorCode: "P7_2B3_VALUE_OBJECT_LOOKUP_FAILED",
      errorMessage: valueObjectError.message,
      dbReadExecuted: true,
      dbWriteExecuted: false,
    });
  }

  const valueObject = valueObjectData as ValueObjectRow | null;

  if (!valueObject) {
    return errorResponse({
      status: 404,
      errorCode: "P7_2B3_VALUE_OBJECT_NOT_FOUND",
      errorMessage: "Value Object not found.",
      dbReadExecuted: true,
      dbWriteExecuted: false,
    });
  }

  if (
    valueObject.owner_user_id !== actorContext.appUserId ||
    valueObject.owner_actor_id !== actorContext.actorId
  ) {
    return errorResponse({
      status: 403,
      errorCode: "P7_2B3_VALUE_OBJECT_ACCESS_DENIED",
      errorMessage: "This Value Object is not owned by the active actor.",
      dbReadExecuted: true,
      dbWriteExecuted: false,
    });
  }

  if (
    valueObject.node_role_code !== "activity_leaf" ||
    valueObject.object_kind !== "activity_pattern" ||
    valueObject.parent_value_object_id === null
  ) {
    return errorResponse({
      status: 409,
      errorCode: "P7_2B3_TARGET_REQUIRES_ACTIVITY_LEAF",
      errorMessage: "Targets are available only for an activity observation leaf.",
      dbReadExecuted: true,
      dbWriteExecuted: false,
    });
  }

  const { data: assignmentData, error: assignmentError } = await supabase
    .from("value_object_parameter_assignments")
    .select(
      "id, value_object_id, parameter_definition_id, owner_user_id, owner_actor_id, status",
    )
    .eq("id", decodedAssignmentId)
    .maybeSingle();

  if (assignmentError) {
    return errorResponse({
      status: 500,
      errorCode: "P7_2B3_ASSIGNMENT_LOOKUP_FAILED",
      errorMessage: assignmentError.message,
      dbReadExecuted: true,
      dbWriteExecuted: false,
    });
  }

  const assignment = assignmentData as AssignmentRow | null;

  if (!assignment || assignment.value_object_id !== valueObjectId) {
    return errorResponse({
      status: 404,
      errorCode: "P7_2B3_ASSIGNMENT_NOT_FOUND",
      errorMessage: "The parameter assignment was not found on this leaf.",
      dbReadExecuted: true,
      dbWriteExecuted: false,
    });
  }

  if (
    assignment.owner_user_id !== actorContext.appUserId ||
    assignment.owner_actor_id !== actorContext.actorId
  ) {
    return errorResponse({
      status: 403,
      errorCode: "P7_2B3_ASSIGNMENT_OWNER_MISMATCH",
      errorMessage: "The parameter assignment is not owned by the active actor.",
      dbReadExecuted: true,
      dbWriteExecuted: false,
    });
  }

  if (assignment.status !== "active") {
    return errorResponse({
      status: 409,
      errorCode: "P7_2B3_PARAMETER_ASSIGNMENT_NOT_ACTIVE",
      errorMessage: "Only an active parameter assignment can receive a target.",
      dbReadExecuted: true,
      dbWriteExecuted: false,
    });
  }

  const { data: definitionData, error: definitionError } = await supabase
    .from("value_object_parameter_definitions")
    .select(
      "id, value_type_code, allowed_unit_codes, status, scope_code, owner_user_id, owner_actor_id",
    )
    .eq("id", assignment.parameter_definition_id)
    .maybeSingle();

  if (definitionError) {
    return errorResponse({
      status: 500,
      errorCode: "P7_2B3_PARAMETER_DEFINITION_LOOKUP_FAILED",
      errorMessage: definitionError.message,
      dbReadExecuted: true,
      dbWriteExecuted: false,
    });
  }

  const definition = definitionData as DefinitionRow | null;

  if (!definition || definition.status !== "active") {
    return errorResponse({
      status: 409,
      errorCode: "P7_2B3_PARAMETER_DEFINITION_NOT_ACTIVE",
      errorMessage: "The assigned parameter definition is not active.",
      dbReadExecuted: true,
      dbWriteExecuted: false,
    });
  }

  if (
    definition.scope_code === "actor" &&
    (definition.owner_user_id !== actorContext.appUserId ||
      definition.owner_actor_id !== actorContext.actorId)
  ) {
    return errorResponse({
      status: 403,
      errorCode: "P7_2B3_TARGET_PARAMETER_OWNER_MISMATCH",
      errorMessage: "The actor parameter is not owned by the active actor.",
      dbReadExecuted: true,
      dbWriteExecuted: false,
    });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    body = null;
  }

  if (!isCreateVersionRequest(body)) {
    return errorResponse({
      status: 400,
      errorCode: "P7_2B3_WRITE_REQUEST_INVALID",
      errorMessage: "The target write request is invalid.",
      dbReadExecuted: true,
      dbWriteExecuted: false,
    });
  }

  const normalized = normalizeRequest({ request: body, definition });

  if (!normalized) {
    return errorResponse({
      status: 400,
      errorCode: "P7_2B3_TARGET_PAYLOAD_INVALID",
      errorMessage: "The target payload is invalid for this parameter.",
      dbReadExecuted: true,
      dbWriteExecuted: false,
    });
  }

  const payload = {
    ...normalized.payload,
    parameterAssignmentId: decodedAssignmentId,
    metadata: {
      writeContract: "p7-2b3-target-write-v1",
      routeValueObjectId: valueObjectId,
    },
  };

  const { data: activeTargetData, error: activeTargetError } = await supabase
    .from("value_object_target_standard_versions")
    .select("target_series_id")
    .eq("parameter_assignment_id", decodedAssignmentId)
    .eq("owner_user_id", actorContext.appUserId)
    .eq("owner_actor_id", actorContext.actorId)
    .eq("status_code", "active");

  if (activeTargetError) {
    return errorResponse({
      status: 500,
      errorCode: "P7_2B3_ACTIVE_TARGET_LOOKUP_FAILED",
      errorMessage: activeTargetError.message,
      dbReadExecuted: true,
      dbWriteExecuted: false,
    });
  }

  const activeTargets = (activeTargetData ?? []) as ActiveTargetRow[];

  if (normalized.mode === "create_series" && activeTargets.length > 0) {
    return errorResponse({
      status: 409,
      errorCode: "P7_2B3_ACTIVE_TARGET_ALREADY_EXISTS",
      errorMessage: "This assignment already has an active target.",
      dbReadExecuted: true,
      dbWriteExecuted: false,
    });
  }

  if (
    normalized.mode === "new_version" &&
    !activeTargets.some(
      (target) => target.target_series_id === normalized.targetSeriesId,
    )
  ) {
    return errorResponse({
      status: 404,
      errorCode: "P7_2B3_ACTIVE_TARGET_SERIES_NOT_FOUND",
      errorMessage: "The active target series was not found on this assignment.",
      dbReadExecuted: true,
      dbWriteExecuted: false,
    });
  }

  const hash = requestHash({
    mode: normalized.mode,
    valueObjectId,
    assignmentId: decodedAssignmentId,
    payload,
  });

  const { data, error } = await supabase.rpc(
    "save_value_object_target_standard_v2",
    {
      p_owner_user_id: actorContext.appUserId,
      p_owner_actor_id: actorContext.actorId,
      p_created_by_actor_id: actorContext.actorId,
      p_mode: normalized.mode,
      p_payload: payload,
      p_idempotency_key: normalized.idempotencyKey,
      p_request_hash: hash,
    },
  );

  if (error) {
    const errorCode = normalizedErrorCode(error.message);

    return errorResponse({
      status: errorStatus(errorCode),
      errorCode,
      errorMessage: error.message,
      dbReadExecuted: true,
      dbWriteExecuted: true,
    });
  }

  const result = mapResult({ data, mode: normalized.mode });

  if (!result) {
    return errorResponse({
      status: 500,
      errorCode: "P7_2B3_TARGET_RESULT_INVALID",
      errorMessage: "The target writer returned an invalid response.",
      dbReadExecuted: true,
      dbWriteExecuted: true,
    });
  }

  const response: P72B3TargetWriteSuccess = {
    ok: true,
    routeMarker: ROUTE_MARKER,
    writeMode: WRITE_MODE,
    result,
    sideEffects: {
      dbReadExecuted: true,
      dbWriteExecuted: true,
      rowsActuallyWritten: result.rowsActuallyWritten,
    },
  };

  return NextResponse.json(response, {
    status: result.idempotentReplay ? 200 : 201,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
