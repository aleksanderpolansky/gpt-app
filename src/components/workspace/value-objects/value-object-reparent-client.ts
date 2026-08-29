import type {
  ValueObjectTreeRestructureApplyResult,
  ValueObjectTreeRestructureError,
  ValueObjectTreeRestructurePreview,
} from "@/types/value-object-tree-restructure";

export class ValueObjectReparentClientError extends Error {
  readonly errorCode: string | null;

  constructor(message: string, errorCode: string | null = null) {
    super(message);
    this.name = "ValueObjectReparentClientError";
    this.errorCode = errorCode;
  }
}

function normalizeId(value: string, errorCode: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new ValueObjectReparentClientError(errorCode);
  }
  return normalized;
}

function asRestructureError(
  payload:
    | ValueObjectTreeRestructurePreview
    | ValueObjectTreeRestructureApplyResult
    | ValueObjectTreeRestructureError
    | null,
  fallback: string,
) {
  if (payload && "error" in payload) {
    return new ValueObjectReparentClientError(
      payload.error || fallback,
      payload.errorCode ?? null,
    );
  }
  return new ValueObjectReparentClientError(fallback);
}

export async function previewValueObjectReparent(input: {
  sourceId: string;
  newParentId: string;
}): Promise<ValueObjectTreeRestructurePreview> {
  const sourceId = normalizeId(input.sourceId, "REPARENT_SOURCE_REQUIRED");
  const newParentId = normalizeId(input.newParentId, "REPARENT_PARENT_REQUIRED");
  if (sourceId === newParentId) {
    throw new ValueObjectReparentClientError("REPARENT_SELF_PARENT_FORBIDDEN");
  }

  const response = await fetch(
    `/api/value-objects/${encodeURIComponent(sourceId)}/tree-restructure/preview`,
    {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        mode: "reparent",
        payload: { newParentValueObjectId: newParentId },
      }),
    },
  );
  const payload = (await response.json().catch(() => null)) as
    | ValueObjectTreeRestructurePreview
    | ValueObjectTreeRestructureError
    | null;

  if (!response.ok || !payload || !("previewHash" in payload)) {
    throw asRestructureError(payload, `REPARENT_PREVIEW_HTTP_${response.status}`);
  }
  if (
    payload.mode !== "reparent" ||
    payload.target.id !== sourceId ||
    payload.destinationParent?.id !== newParentId
  ) {
    throw new ValueObjectReparentClientError("REPARENT_PREVIEW_RESPONSE_MISMATCH");
  }

  return payload;
}

export async function applyValueObjectReparent(input: {
  sourceId: string;
  newParentId: string;
  preview: ValueObjectTreeRestructurePreview;
  idempotencyKey: string;
}): Promise<ValueObjectTreeRestructureApplyResult> {
  const sourceId = normalizeId(input.sourceId, "REPARENT_SOURCE_REQUIRED");
  const newParentId = normalizeId(input.newParentId, "REPARENT_PARENT_REQUIRED");
  const idempotencyKey = input.idempotencyKey.trim();
  if (sourceId === newParentId) {
    throw new ValueObjectReparentClientError("REPARENT_SELF_PARENT_FORBIDDEN");
  }
  if (idempotencyKey.length < 8 || idempotencyKey.length > 200) {
    throw new ValueObjectReparentClientError("REPARENT_IDEMPOTENCY_KEY_INVALID");
  }
  if (
    input.preview.mode !== "reparent" ||
    input.preview.target.id !== sourceId ||
    input.preview.destinationParent?.id !== newParentId ||
    !input.preview.previewHash?.trim()
  ) {
    throw new ValueObjectReparentClientError("REPARENT_PREVIEW_STALE");
  }

  const response = await fetch(
    `/api/value-objects/${encodeURIComponent(sourceId)}/tree-restructure/apply`,
    {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        mode: "reparent",
        payload: { newParentValueObjectId: newParentId },
        previewHash: input.preview.previewHash,
        idempotencyKey,
      }),
    },
  );
  const payload = (await response.json().catch(() => null)) as
    | ValueObjectTreeRestructureApplyResult
    | ValueObjectTreeRestructureError
    | null;

  if (!response.ok || !payload || !("operationId" in payload)) {
    throw asRestructureError(payload, `REPARENT_APPLY_HTTP_${response.status}`);
  }
  if (
    payload.operationType !== "reparent" ||
    payload.targetValueObjectId !== sourceId
  ) {
    throw new ValueObjectReparentClientError("REPARENT_APPLY_RESPONSE_MISMATCH");
  }

  return payload;
}
