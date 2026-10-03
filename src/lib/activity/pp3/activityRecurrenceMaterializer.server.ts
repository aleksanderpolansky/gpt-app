import { supabase } from "../../../../lib/supabase";

export const ACTIVITY_RECURRENCE_MATERIALIZER_CONTRACT_PP3B2 =
  "ARCTOR_ACTIVITY_RECURRENCE_MATERIALIZER_PP3B2_V1" as const;

export const DEFAULT_RECURRENCE_MATERIALIZATION_HORIZON_DAYS_PP3B2 = 56;

export type ActivityRecurrenceMaterializationResultPp3b2 = {
  contractVersion: typeof ACTIVITY_RECURRENCE_MATERIALIZER_CONTRACT_PP3B2;
  ruleId: string;
  sourceActivityEventId: string;
  timezone: string;
  windowStart: string;
  windowEnd: string;
  horizonDays: number;
  consideredCount: number;
  createdCount: number;
  replayedCount: number;
  materializedActivityEventIds: string[];
};

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export async function materializeActivityRecurrenceRulePp3b2(input: {
  ownerUserId: string;
  ownerActorId: string;
  ruleId: string;
  horizonDays?: number;
}): Promise<ActivityRecurrenceMaterializationResultPp3b2> {
  const horizonDays =
    input.horizonDays ?? DEFAULT_RECURRENCE_MATERIALIZATION_HORIZON_DAYS_PP3B2;

  if (!Number.isInteger(horizonDays) || horizonDays < 1 || horizonDays > 366) {
    throw new Error("PP3B2_MATERIALIZER_HORIZON_OUT_OF_RANGE");
  }

  const { data, error } = await supabase.rpc(
    "materialize_activity_recurrence_rule_pp3b2",
    {
      p_owner_user_id: input.ownerUserId,
      p_owner_actor_id: input.ownerActorId,
      p_rule_id: input.ruleId,
      p_horizon_days: horizonDays,
    },
  );

  if (error) {
    throw new Error(
      `PP3B2_RECURRENCE_MATERIALIZATION_FAILED:${error.message}`,
    );
  }

  const row = asRecord(data);
  const contractVersion = asString(row.contractVersion);
  const ruleId = asString(row.ruleId);
  const sourceActivityEventId = asString(row.sourceActivityEventId);
  const timezone = asString(row.timezone);
  const windowStart = asString(row.windowStart);
  const windowEnd = asString(row.windowEnd);
  const resultHorizonDays = asInteger(row.horizonDays);
  const consideredCount = asInteger(row.consideredCount);
  const createdCount = asInteger(row.createdCount);
  const replayedCount = asInteger(row.replayedCount);

  if (
    row.ok !== true ||
    contractVersion !== ACTIVITY_RECURRENCE_MATERIALIZER_CONTRACT_PP3B2 ||
    !ruleId ||
    !sourceActivityEventId ||
    !timezone ||
    !windowStart ||
    !windowEnd ||
    resultHorizonDays === null ||
    consideredCount === null ||
    createdCount === null ||
    replayedCount === null
  ) {
    throw new Error("PP3B2_RECURRENCE_MATERIALIZATION_RESPONSE_INVALID");
  }

  return {
    contractVersion: ACTIVITY_RECURRENCE_MATERIALIZER_CONTRACT_PP3B2,
    ruleId,
    sourceActivityEventId,
    timezone,
    windowStart,
    windowEnd,
    horizonDays: resultHorizonDays,
    consideredCount,
    createdCount,
    replayedCount,
    materializedActivityEventIds: asStringArray(
      row.materializedActivityEventIds,
    ),
  };
}
