import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import type {
  P72B3TargetArchiveRequest,
  P72B3TargetWriteError,
  P72B3TargetWriteResult,
  P72B3TargetWriteSuccess,
} from "@/types/value-object-target-write-v2";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../../../../../lib/actor-context";
import { auth0 } from "../../../../../../../../../lib/auth0";
import { supabase } from "../../../../../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_MARKER = "p7-2b3-target-write-route-v1" as const;
const WRITE_MODE = "p7_2b3_target_write" as const;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RouteContext = {
  params: Promise<{
    id: string;
    assignmentId: string;
    targetSeriesId: string;
  }>;
};

type AssignmentRow = {
  id: string;
  value_object_id: string;
  owner_user_id: string;
  owner_actor_id: string;
  status: "active" | "inactive" | "retired";
};

type TargetRow = {
  id: string;
  target_series_id: string;
  version: number | string;
  status_code: "draft" | "active" | "superseded" | "archived";
  parameter_assignment_id: string;
  normalization_state_code:
    | "derived"
    | "not_applicable"
    | "formula_required";
  daily_equivalent_numeric: number | string | null;
};

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized.length > 0 ? normalized : null;
}

function asFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : null;
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

function isArchiveRequest(value: unknown): value is P72B3TargetArchiveRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const row = value as Partial<P72B3TargetArchiveRequest>;

  return row.mode === "archive" && typeof row.idempotencyKey === "string";
}

function normalizedErrorCode(message: string | undefined): string {
  const candidate = message?.match(/P7_2(?:B3)?_[A-Z0-9_]+/)?.[0];

  return candidate ?? "P7_2B3_TARGET_ARCHIVE_FAILED";
}

function errorStatus(errorCode: string): number {
  if (
    errorCode.includes("OWNER") ||
    errorCode.includes("ACCESS_DENIED") ||
    errorCode.includes("ACTOR_NOT_OWNED")
  ) {
    return 403;
  }

  if (errorCode.includes("NOT_FOUND")) {
    return 404;
  }

  if (
    errorCode.includes("REQUIRES_ACTIVITY_LEAF") ||
    errorCode.includes("NOT_ACTIVE") ||
    errorCode.includes("IDEMPOTENCY_PAYLOAD_MISMATCH")
  ) {
    return 409;
  }

  if (errorCode.includes("INVALID") || errorCode.includes("REQUIRED")) {
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

function mapResult(data: unknown): P72B3TargetWriteResult | null {
  const response = asRecord(data);
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
    rowsActuallyWritten: idempotentReplay ? 0 : 1,
  };
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id, assignmentId, targetSeriesId } = await context.params;
  const valueObjectId = decodeURIComponent(id);
  const decodedAssignmentId = decodeURIComponent(assignmentId);
  const decodedTargetSeriesId = decodeURIComponent(targetSeriesId);

  if (
    !UUID_PATTERN.test(valueObjectId) ||
    !UUID_PATTERN.test(decodedAssignmentId) ||
    !UUID_PATTERN.test(decodedTargetSeriesId)
  ) {
    return errorResponse({
      status: 400,
      errorCode: "P7_2B3_IDENTIFIER_INVALID",
      errorMessage: "The Value Object, assignment or target series id is invalid.",
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

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    body = null;
  }

  if (!isArchiveRequest(body)) {
    return errorResponse({
      status: 400,
      errorCode: "P7_2B3_ARCHIVE_REQUEST_INVALID",
      errorMessage: "The archive request is invalid.",
      dbReadExecuted: true,
      dbWriteExecuted: false,
    });
  }

  const idempotencyKey = body.idempotencyKey.trim();

  if (idempotencyKey.length < 8 || idempotencyKey.length > 200) {
    return errorResponse({
      status: 400,
      errorCode: "P7_2B3_IDEMPOTENCY_INVALID",
      errorMessage: "A valid idempotency key is required.",
      dbReadExecuted: true,
      dbWriteExecuted: false,
    });
  }

  const { data: assignmentData, error: assignmentError } = await supabase
    .from("value_object_parameter_assignments")
    .select("id, value_object_id, owner_user_id, owner_actor_id, status")
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

  const { data: targetData, error: targetError } = await supabase
    .from("value_object_target_standard_versions")
    .select(
      "id, target_series_id, version, status_code, parameter_assignment_id, normalization_state_code, daily_equivalent_numeric",
    )
    .eq("target_series_id", decodedTargetSeriesId)
    .eq("parameter_assignment_id", decodedAssignmentId)
    .eq("owner_user_id", actorContext.appUserId)
    .eq("owner_actor_id", actorContext.actorId)
    .in("status_code", ["active", "archived"])
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (targetError) {
    return errorResponse({
      status: 500,
      errorCode: "P7_2B3_TARGET_LOOKUP_FAILED",
      errorMessage: targetError.message,
      dbReadExecuted: true,
      dbWriteExecuted: false,
    });
  }

  const target = targetData as TargetRow | null;

  if (!target) {
    return errorResponse({
      status: 404,
      errorCode: "P7_2B3_TARGET_SERIES_NOT_FOUND",
      errorMessage: "The target series was not found on this assignment.",
      dbReadExecuted: true,
      dbWriteExecuted: false,
    });
  }

  const payload = {
    targetSeriesId: decodedTargetSeriesId,
  };
  const hash = requestHash({
    mode: "archive",
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
      p_mode: "archive",
      p_payload: payload,
      p_idempotency_key: idempotencyKey,
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

  const result = mapResult(data);

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
    status: 200,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
