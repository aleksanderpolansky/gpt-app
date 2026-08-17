import { NextResponse } from "next/server";

import { getActivityUserContext } from "../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type JsonRecord = Record<string, unknown>;

type CoefficientRuleDbRow = {
  id: string;
  target_value_object_id: string;
  target_parameter_code: string;
  source_value_object_id: string;
  source_parameter_code: string;
  condition_operator: string;
  condition_numeric_value: number | null;
  condition_text_value: string | null;
  condition_boolean_value: boolean | null;
  multiplier: number;
  priority: number;
  status: string;
  created_at: string;
  retired_at: string | null;
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function booleanOrNull(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function parameterCode(value: unknown) {
  const normalized = text(value).toLowerCase();
  return /^[a-z][a-z0-9_]{0,79}$/.test(normalized)
    ? normalized
    : null;
}

export async function GET(request: Request) {
  const { appUser, personActor, errorResponse } = await getActivityUserContext();
  if (errorResponse) return errorResponse;
  if (!appUser || !personActor) {
    return NextResponse.json(
      { ok: false, error: "User context not found" },
      { status: 500 },
    );
  }

  const targetValueObjectId = text(
    new URL(request.url).searchParams.get("targetValueObjectId"),
  );

  if (!validUuid(targetValueObjectId)) {
    return NextResponse.json(
      { ok: false, error: "targetValueObjectId must be a UUID" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("activity_leaf_fact_coefficient_rules_a31")
    .select(
      "id,target_value_object_id,target_parameter_code,source_value_object_id,source_parameter_code,condition_operator,condition_numeric_value,condition_text_value,condition_boolean_value,multiplier,priority,status,created_at,retired_at",
    )
    .eq("target_value_object_id", targetValueObjectId)
    .eq("rule_scope_code", "actor")
    .eq("owner_user_id", appUser.id)
    .eq("owner_actor_id", personActor.id)
    .order("priority")
    .order("created_at");

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  const sourceIds = Array.from(
    new Set(
      ((data ?? []) as CoefficientRuleDbRow[])
        .map((row) => text(row.source_value_object_id))
        .filter(Boolean),
    ),
  );

  const sourceTitles = new Map<string, string>();

  if (sourceIds.length > 0) {
    const { data: objects, error: objectError } = await supabase
      .from("value_objects")
      .select("id,title")
      .in("id", sourceIds);

    if (objectError) {
      return NextResponse.json(
        { ok: false, error: objectError.message },
        { status: 500 },
      );
    }

    for (const row of objects ?? []) {
      sourceTitles.set(String(row.id), String(row.title ?? row.id));
    }
  }

  return NextResponse.json({
    ok: true,
    contract: "ARCTOR_AI_A3_1_COEFFICIENT_RULE_V1",
    combinationMode: "multiply",
    missingContextMultiplier: 1,
    rules: ((data ?? []) as CoefficientRuleDbRow[]).map((row) => ({
      id: row.id,
      targetValueObjectId: row.target_value_object_id,
      targetParameterCode: row.target_parameter_code,
      sourceValueObjectId: row.source_value_object_id,
      sourceValueObjectTitle:
        sourceTitles.get(String(row.source_value_object_id)) ??
        String(row.source_value_object_id),
      sourceParameterCode: row.source_parameter_code,
      conditionOperator: row.condition_operator,
      conditionNumericValue: row.condition_numeric_value,
      conditionTextValue: row.condition_text_value,
      conditionBooleanValue: row.condition_boolean_value,
      multiplier: row.multiplier,
      priority: row.priority,
      status: row.status,
      createdAt: row.created_at,
      retiredAt: row.retired_at,
    })),
  });
}

export async function POST(request: Request) {
  const { appUser, personActor, errorResponse } = await getActivityUserContext();
  if (errorResponse) return errorResponse;
  if (!appUser || !personActor) {
    return NextResponse.json(
      { ok: false, error: "User context not found" },
      { status: 500 },
    );
  }

  let body: JsonRecord;
  try {
    body = asRecord(await request.json());
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const clientRuleId = text(body.clientRuleId);
  const targetValueObjectId = text(body.targetValueObjectId);
  const sourceValueObjectId = text(body.sourceValueObjectId);
  const targetParameterCode = parameterCode(body.targetParameterCode);
  const sourceParameterCode = parameterCode(body.sourceParameterCode);
  const conditionOperator = text(body.conditionOperator);
  const multiplier = numberOrNull(body.multiplier);
  const priorityRaw = numberOrNull(body.priority);
  const priority =
    priorityRaw !== null && Number.isInteger(priorityRaw)
      ? priorityRaw
      : 1000;

  if (
    !validUuid(clientRuleId) ||
    !validUuid(targetValueObjectId) ||
    !validUuid(sourceValueObjectId) ||
    !targetParameterCode ||
    !sourceParameterCode ||
    ![
      "lt",
      "lte",
      "numeric_eq",
      "gte",
      "gt",
      "text_eq",
      "boolean_eq",
    ].includes(conditionOperator) ||
    multiplier === null
  ) {
    return NextResponse.json(
      { ok: false, error: "Coefficient rule payload is invalid" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase.rpc(
    "save_activity_leaf_fact_coefficient_rule_a31_v1",
    {
      p_client_rule_id: clientRuleId,
      p_owner_user_id: appUser.id,
      p_owner_actor_id: personActor.id,
      p_target_value_object_id: targetValueObjectId,
      p_target_parameter_code: targetParameterCode,
      p_source_value_object_id: sourceValueObjectId,
      p_source_parameter_code: sourceParameterCode,
      p_condition_operator: conditionOperator,
      p_condition_numeric_value: numberOrNull(body.conditionNumericValue),
      p_condition_text_value: text(body.conditionTextValue) || null,
      p_condition_boolean_value: booleanOrNull(body.conditionBooleanValue),
      p_multiplier: multiplier,
      p_priority: priority,
    },
  );

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true, ...asRecord(data) });
}

export async function PATCH(request: Request) {
  const { appUser, personActor, errorResponse } = await getActivityUserContext();
  if (errorResponse) return errorResponse;
  if (!appUser || !personActor) {
    return NextResponse.json(
      { ok: false, error: "User context not found" },
      { status: 500 },
    );
  }

  let body: JsonRecord;
  try {
    body = asRecord(await request.json());
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const ruleId = text(body.ruleId);

  if (!validUuid(ruleId)) {
    return NextResponse.json(
      { ok: false, error: "ruleId must be a UUID" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase.rpc(
    "retire_activity_leaf_fact_coefficient_rule_a31_v1",
    {
      p_rule_id: ruleId,
      p_owner_user_id: appUser.id,
      p_owner_actor_id: personActor.id,
    },
  );

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true, ...asRecord(data) });
}
