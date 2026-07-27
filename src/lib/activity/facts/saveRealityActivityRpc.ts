import { createHash } from "node:crypto";

import { supabase } from "../../../../lib/supabase";

type JsonPrimitive = string | number | boolean | null;
type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export type RealityCoreRpcFactInput = {
  readonly localFactId: string;
  readonly decision: "accept" | "edit";
  readonly semanticObjectKey: string;
  readonly semanticObjectLabel: string;
  readonly valueObjectId: string | null;
  readonly measureType: string;
  readonly parameterCode: string;
  readonly unitCode: string;
  readonly canonicalUnitCode: string;
  readonly valueNumeric: number | null;
  readonly valueText: string | null;
  readonly valueBoolean: boolean | null;
  readonly confidence: number;
  readonly rawFragment: string | null;
  readonly normalizedFragment: string | null;
  readonly reasonRu: string | null;
  readonly metadata: Readonly<Record<string, unknown>>;
};

export type RealityCoreRpcSaveInput = {
  readonly ownerUserId: string;
  readonly requestHash: string;
  readonly actorContext: Readonly<Record<string, unknown>>;
  readonly activity: Readonly<Record<string, unknown>>;
  readonly facts: readonly RealityCoreRpcFactInput[];
};

export type RealityCoreRpcSaveData = {
  readonly ok: true;
  readonly transactional: true;
  readonly writeStatus: "written" | "idempotent_replay";
  readonly activityEventId: string;
  readonly measureIds: string[];
  readonly factIds: string[];
  readonly reviewItemIds: string[];
  readonly recalculationQueueIds: string[];
  readonly rowsActuallyWritten: number;
  readonly dbWriteExecuted: boolean;
  readonly requestHash: string;
};

export type RealityCoreRpcSaveResult =
  | {
      readonly ok: true;
      readonly data: RealityCoreRpcSaveData;
    }
  | {
      readonly ok: false;
      readonly errorCode: string | null;
      readonly errorMessage: string;
      readonly errorDetails: string | null;
      readonly errorHint: string | null;
    };

function normalizeForStableJson(value: unknown): JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Reality Core request hash cannot include non-finite numbers.");
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value.map(normalizeForStableJson);
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const result: Record<string, JsonValue> = {};

    for (const key of Object.keys(record).sort()) {
      const current = record[key];

      if (current === undefined) {
        continue;
      }

      result[key] = normalizeForStableJson(current);
    }

    return result;
  }

  throw new Error(
    `Reality Core request hash cannot serialize ${typeof value}.`
  );
}

export function buildRealityCoreRequestHash(value: unknown): string {
  const canonicalJson = JSON.stringify(normalizeForStableJson(value));

  return createHash("sha256")
    .update(canonicalJson, "utf8")
    .digest("hex");
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseRpcData(value: unknown): RealityCoreRpcSaveData | null {
  const row = asRecord(value);
  const writeStatus = asString(row.writeStatus);
  const activityEventId = asString(row.activityEventId);
  const requestHash = asString(row.requestHash);
  const rowsActuallyWritten = asNumber(row.rowsActuallyWritten);

  if (
    row.ok !== true ||
    row.transactional !== true ||
    (writeStatus !== "written" && writeStatus !== "idempotent_replay") ||
    !activityEventId ||
    !requestHash ||
    rowsActuallyWritten === null
  ) {
    return null;
  }

  return {
    ok: true,
    transactional: true,
    writeStatus,
    activityEventId,
    measureIds: asStringArray(row.measureIds),
    factIds: asStringArray(row.factIds),
    reviewItemIds: asStringArray(row.reviewItemIds),
    recalculationQueueIds: asStringArray(row.recalculationQueueIds),
    rowsActuallyWritten,
    dbWriteExecuted: row.dbWriteExecuted === true,
    requestHash,
  };
}

export async function saveRealityActivityViaRpc(
  input: RealityCoreRpcSaveInput
): Promise<RealityCoreRpcSaveResult> {
  const { data, error } = await supabase.rpc("save_reality_activity_v1", {
    p_owner_user_id: input.ownerUserId,
    p_request_hash: input.requestHash,
    p_actor_context: input.actorContext,
    p_activity: input.activity,
    p_facts: input.facts,
  });

  if (error) {
    return {
      ok: false,
      errorCode: error.code ?? null,
      errorMessage: error.message,
      errorDetails: error.details ?? null,
      errorHint: error.hint ?? null,
    };
  }

  const parsed = parseRpcData(data);

  if (!parsed) {
    return {
      ok: false,
      errorCode: "REALITY_CORE_RPC_RESPONSE_INVALID",
      errorMessage:
        "save_reality_activity_v1 returned an invalid response contract.",
      errorDetails: JSON.stringify(data),
      errorHint: null,
    };
  }

  return {
    ok: true,
    data: parsed,
  };
}

export async function attachRealityFactsToExistingActivityPp1ViaRpc(
  input: RealityCoreRpcSaveInput
): Promise<RealityCoreRpcSaveResult> {
  const { data, error } = await supabase.rpc(
    "attach_reality_facts_to_activity_pp1_v1",
    {
      p_owner_user_id: input.ownerUserId,
      p_request_hash: input.requestHash,
      p_actor_context: input.actorContext,
      p_activity: input.activity,
      p_facts: input.facts,
    }
  );

  if (error) {
    return {
      ok: false,
      errorCode: error.code ?? null,
      errorMessage: error.message,
      errorDetails: error.details ?? null,
      errorHint: error.hint ?? null,
    };
  }

  const parsed = parseRpcData(data);

  if (!parsed) {
    return {
      ok: false,
      errorCode: "PP1_FACT_RPC_RESPONSE_INVALID",
      errorMessage:
        "attach_reality_facts_to_activity_pp1_v1 returned an invalid response contract.",
      errorDetails: JSON.stringify(data),
      errorHint: null,
    };
  }

  return {
    ok: true,
    data: parsed,
  };
}
