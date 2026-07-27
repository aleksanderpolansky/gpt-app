import { supabase } from "../../../../lib/supabase";

import type {
  ActivityCreatePp1,
  ActivityCreateResultPp1,
} from "@/types/activity-model-pp1";

type RpcError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

export type CreateActivityEventRpcResultPp1 =
  | {
      ok: true;
      data: ActivityCreateResultPp1;
    }
  | {
      ok: false;
      errorCode: string | null;
      errorMessage: string;
      errorDetails: string | null;
      errorHint: string | null;
    };

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function parseResult(value: unknown): ActivityCreateResultPp1 | null {
  const row = asRecord(value);
  const disposition = asString(row.disposition);
  const activityEvent = asRecord(row.activityEvent);

  if (
    row.ok !== true ||
    (disposition !== "created" && disposition !== "idempotent_replay") ||
    !asString(activityEvent.id)
  ) {
    return null;
  }

  const calendarEventRaw = row.calendarEvent;
  const calendarEvent = calendarEventRaw === null
    ? null
    : asRecord(calendarEventRaw);

  return {
    ok: true,
    disposition,
    activityEvent,
    calendarEvent,
    plannedTargetValueObjectIds: asStringArray(row.plannedTargetValueObjectIds),
  };
}

export async function createActivityEventViaPp1Rpc(params: {
  ownerUserId: string;
  ownerActorId: string;
  idempotencyKey: string;
  activity: ActivityCreatePp1;
  plannedTargetValueObjectIds: readonly string[];
}): Promise<CreateActivityEventRpcResultPp1> {
  const { data, error } = await supabase.rpc("create_activity_event_pp1_v1", {
    p_owner_user_id: params.ownerUserId,
    p_owner_actor_id: params.ownerActorId,
    p_idempotency_key: params.idempotencyKey,
    p_activity: params.activity,
    p_planned_target_ids: [...params.plannedTargetValueObjectIds],
  });

  if (error) {
    const typedError = error as RpcError;

    return {
      ok: false,
      errorCode: typedError.code ?? null,
      errorMessage: typedError.message ?? "PP1 activity creation failed.",
      errorDetails: typedError.details ?? null,
      errorHint: typedError.hint ?? null,
    };
  }

  const parsed = parseResult(data);

  if (!parsed) {
    return {
      ok: false,
      errorCode: "PP1_ACTIVITY_RPC_RESPONSE_INVALID",
      errorMessage: "create_activity_event_pp1_v1 returned an invalid response.",
      errorDetails: JSON.stringify(data),
      errorHint: null,
    };
  }

  return { ok: true, data: parsed };
}
