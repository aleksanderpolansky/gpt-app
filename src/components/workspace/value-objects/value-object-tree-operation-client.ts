import type {
  ValueObjectTreeRestructureContext,
  ValueObjectTreeRestructureError,
  ValueObjectTreeRollbackResult,
  ValueObjectTreeOperationSummary,
} from "@/types/value-object-tree-restructure";

export class ValueObjectTreeOperationClientError extends Error {
  readonly errorCode: string | null;

  constructor(message: string, errorCode: string | null = null) {
    super(message);
    this.name = "ValueObjectTreeOperationClientError";
    this.errorCode = errorCode;
  }
}

function normalizeId(value: string, errorCode: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new ValueObjectTreeOperationClientError(errorCode);
  }
  return normalized;
}

function normalizeIdempotencyKey(value: string) {
  const normalized = value.trim();
  if (normalized.length < 8 || normalized.length > 200) {
    throw new ValueObjectTreeOperationClientError(
      "TREE_OPERATION_IDEMPOTENCY_KEY_INVALID",
    );
  }
  return normalized;
}

function asClientError(
  payload:
    | ValueObjectTreeRestructureContext
    | ValueObjectTreeRollbackResult
    | ValueObjectTreeRestructureError
    | null,
  fallback: string,
) {
  if (payload && "error" in payload) {
    return new ValueObjectTreeOperationClientError(
      payload.error || fallback,
      payload.errorCode ?? null,
    );
  }
  return new ValueObjectTreeOperationClientError(fallback);
}

export function createValueObjectTreeOperationIdempotencyKey(
  prefix = "tree-operation",
) {
  const normalizedPrefix = prefix.trim() || "tree-operation";
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${normalizedPrefix}-${crypto.randomUUID()}`;
  }
  return `${normalizedPrefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getRollbackEligibleOperationId(
  operations: readonly ValueObjectTreeOperationSummary[],
): string | null {
  return (
    operations.find(
      (operation) =>
        operation.status === "applied" && operation.operationType !== "rollback",
    )?.id ?? null
  );
}

export async function loadValueObjectTreeRestructureContext(input: {
  valueObjectId: string;
}): Promise<ValueObjectTreeRestructureContext> {
  const valueObjectId = normalizeId(
    input.valueObjectId,
    "TREE_OPERATION_VALUE_OBJECT_REQUIRED",
  );
  const response = await fetch(
    `/api/value-objects/${encodeURIComponent(valueObjectId)}/tree-restructure/preview`,
    {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
    },
  );
  const payload = (await response.json().catch(() => null)) as
    | ValueObjectTreeRestructureContext
    | ValueObjectTreeRestructureError
    | null;

  if (!response.ok || !payload || !("current" in payload)) {
    throw asClientError(
      payload,
      `TREE_OPERATION_CONTEXT_HTTP_${response.status}`,
    );
  }
  if (payload.current.id !== valueObjectId) {
    throw new ValueObjectTreeOperationClientError(
      "TREE_OPERATION_CONTEXT_RESPONSE_MISMATCH",
    );
  }
  return payload;
}

export async function rollbackValueObjectTreeRestructureOperation(input: {
  operationId: string;
  idempotencyKey: string;
}): Promise<ValueObjectTreeRollbackResult> {
  const operationId = normalizeId(
    input.operationId,
    "TREE_OPERATION_ROLLBACK_ID_REQUIRED",
  );
  const idempotencyKey = normalizeIdempotencyKey(input.idempotencyKey);
  const response = await fetch(
    `/api/value-objects/tree-restructure/${encodeURIComponent(operationId)}/rollback`,
    {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ idempotencyKey }),
    },
  );
  const payload = (await response.json().catch(() => null)) as
    | ValueObjectTreeRollbackResult
    | ValueObjectTreeRestructureError
    | null;

  if (!response.ok || !payload || !("rollbackOperationId" in payload)) {
    throw asClientError(
      payload,
      `TREE_OPERATION_ROLLBACK_HTTP_${response.status}`,
    );
  }
  if (payload.rolledBackOperationId !== operationId) {
    throw new ValueObjectTreeOperationClientError(
      "TREE_OPERATION_ROLLBACK_RESPONSE_MISMATCH",
    );
  }
  return payload;
}
