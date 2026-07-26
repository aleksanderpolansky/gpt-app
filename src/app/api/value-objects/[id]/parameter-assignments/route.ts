import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import type {
  P72B2AssignmentCreateRequest,
  P72B2WriteError,
  P72B2WriteResult,
  P72B2WriteSuccess,
} from "@/types/value-object-parameter-assignment-v2";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../../lib/actor-context";
import { auth0 } from "../../../../../../lib/auth0";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_MARKER = "p7-2b2-parameter-assignment-route-v1" as const;
const WRITE_MODE = "p7_2b2_parameter_assignment" as const;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized.length > 0 ? normalized : null;
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

function errorStatus(errorCode: string): number {
  if (
    errorCode.includes("OWNER") ||
    errorCode.includes("ACTOR_NOT_OWNED") ||
    errorCode.includes("CREATOR_NOT_OWNED")
  ) {
    return 403;
  }

  if (errorCode.includes("NOT_FOUND")) {
    return 404;
  }

  if (
    errorCode.includes("DUPLICATE") ||
    errorCode.includes("REQUIRES_ACTIVITY_LEAF") ||
    errorCode.includes("USE_REACTIVATE") ||
    errorCode.includes("NOT_ACTIVE") ||
    errorCode.includes("IDEMPOTENCY_PAYLOAD_MISMATCH")
  ) {
    return 409;
  }

  if (
    errorCode.includes("INVALID") ||
    errorCode.includes("REQUIRED") ||
    errorCode.includes("MUST_BE")
  ) {
    return 400;
  }

  return 500;
}

function normalizedErrorCode(message: string | undefined): string {
  const candidate = message?.match(/P7_2B2_[A-Z0-9_]+/)?.[0];

  return candidate ?? "P7_2B2_PARAMETER_ASSIGNMENT_WRITE_FAILED";
}

function errorResponse(params: {
  status: number;
  errorCode: string;
  errorMessage: string;
  dbReadExecuted: boolean;
  dbWriteExecuted: boolean;
}) {
  const body: P72B2WriteError = {
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

function isCreateRequest(value: unknown): value is P72B2AssignmentCreateRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const row = value as Partial<P72B2AssignmentCreateRequest>;

  return (
    (row.mode === "assign_existing" ||
      row.mode === "create_custom_and_assign") &&
    typeof row.idempotencyKey === "string"
  );
}

function normalizePayload(
  request: P72B2AssignmentCreateRequest,
): Record<string, unknown> | null {
  const displayOrder =
    typeof request.displayOrder === "number" &&
    Number.isInteger(request.displayOrder) &&
    request.displayOrder > 0
      ? request.displayOrder
      : 1000;

  if (request.mode === "assign_existing") {
    if (!UUID_PATTERN.test(request.parameterDefinitionId)) {
      return null;
    }

    return {
      parameterDefinitionId: request.parameterDefinitionId,
      displayOrder,
    };
  }

  const definition = request.definition;

  if (
    !definition ||
    typeof definition.title !== "string" ||
    typeof definition.dimensionCode !== "string" ||
    typeof definition.valueTypeCode !== "string" ||
    typeof definition.canonicalUnitCode !== "string" ||
    !Array.isArray(definition.allowedUnitCodes) ||
    typeof definition.aggregationMethodCode !== "string" ||
    typeof definition.defaultWindowCode !== "string"
  ) {
    return null;
  }

  const title = definition.title.trim();
  const canonicalUnitCode = definition.canonicalUnitCode.trim();
  const allowedUnitCodes = [
    ...new Set(
      definition.allowedUnitCodes
        .filter((unit): unit is string => typeof unit === "string")
        .map((unit) => unit.trim())
        .filter(Boolean),
    ),
  ];

  if (
    title.length < 1 ||
    title.length > 200 ||
    !canonicalUnitCode ||
    !allowedUnitCodes.includes(canonicalUnitCode)
  ) {
    return null;
  }

  return {
    definition: {
      title,
      description: asString(definition.description),
      dimensionCode: definition.dimensionCode.trim(),
      valueTypeCode: definition.valueTypeCode,
      canonicalUnitCode,
      allowedUnitCodes,
      aggregationMethodCode: definition.aggregationMethodCode.trim(),
      defaultWindowCode: definition.defaultWindowCode.trim(),
      allowNegative: definition.allowNegative === true,
      validation: {},
    },
    displayOrder,
  };
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const valueObjectId = decodeURIComponent(id);

  if (!UUID_PATTERN.test(valueObjectId)) {
    return errorResponse({
      status: 400,
      errorCode: "P7_2B2_VALUE_OBJECT_ID_INVALID",
      errorMessage: "The Value Object id is invalid.",
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
      errorCode: "P7_2B2_WRITE_UNAUTHENTICATED",
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
      errorCode: "P7_2B2_WRITE_ACTOR_CONTEXT_FAILED",
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

  if (!isCreateRequest(body)) {
    return errorResponse({
      status: 400,
      errorCode: "P7_2B2_WRITE_REQUEST_INVALID",
      errorMessage: "The parameter assignment request is invalid.",
      dbReadExecuted: true,
      dbWriteExecuted: false,
    });
  }

  const idempotencyKey = body.idempotencyKey.trim();

  if (idempotencyKey.length < 8 || idempotencyKey.length > 200) {
    return errorResponse({
      status: 400,
      errorCode: "P7_2B2_IDEMPOTENCY_INVALID",
      errorMessage: "A valid idempotency key is required.",
      dbReadExecuted: true,
      dbWriteExecuted: false,
    });
  }

  const payload = normalizePayload(body);

  if (!payload) {
    return errorResponse({
      status: 400,
      errorCode: "P7_2B2_WRITE_PAYLOAD_INVALID",
      errorMessage: "The parameter payload is invalid.",
      dbReadExecuted: true,
      dbWriteExecuted: false,
    });
  }

  const hash = requestHash({
    mode: body.mode,
    valueObjectId,
    payload,
  });

  const { data, error } = await supabase.rpc(
    "save_value_object_parameter_assignment_v2",
    {
      p_owner_user_id: actorContext.appUserId,
      p_owner_actor_id: actorContext.actorId,
      p_created_by_actor_id: actorContext.actorId,
      p_value_object_id: valueObjectId,
      p_mode: body.mode,
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

  const result = data as P72B2WriteResult;
  const response: P72B2WriteSuccess = {
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
