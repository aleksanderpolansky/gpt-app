import crypto from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { auth0 } from "../../../../../../lib/auth0";
import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../../lib/actor-context";
import { supabase } from "../../../../../../lib/supabase";
import {
  buildAiLabFactWriterRows,
  containsEvidenceFragment,
  normalizeAiLabFactMaterializationCandidates,
  type AiLabFactMaterializationVerdict,
} from "@/lib/activity/aiLabFactMaterialization";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EXECUTION_SURFACE_CODE = "global_observation_preview";
const EXECUTION_OPERATION_KIND = "activity_semantic_intake";
const CONTRACT_CODE = "AI_A3_P5A_ACTIVITY_FACT_MATERIALIZATION_V1";
const MAX_FACTS = 20;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type MaterializeBody = {
  activityEventId?: unknown;
  operationId?: unknown;
  candidates?: unknown;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function invalid(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function sha256(value: unknown): string {
  return crypto.createHash("sha256").update(stableJson(value), "utf8").digest("hex");
}

export async function POST(request: NextRequest) {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return invalid("Not authenticated", 401);
  }

  let actorContext: Awaited<ReturnType<typeof resolveActiveActorContext>>;

  try {
    actorContext = await resolveActiveActorContext(session.user.sub);
  } catch (error) {
    if (error instanceof ActorContextError) {
      return NextResponse.json(
        { ok: false, code: error.code, error: error.message },
        { status: error.status },
      );
    }
    return invalid("Could not resolve active actor context", 500);
  }

  let body: MaterializeBody;
  try {
    body = (await request.json()) as MaterializeBody;
  } catch {
    return invalid("Invalid JSON body");
  }

  const activityEventId = text(body.activityEventId);
  const operationId = text(body.operationId);
  const rawCandidates = Array.isArray(body.candidates) ? body.candidates : [];
  const candidates = normalizeAiLabFactMaterializationCandidates(rawCandidates);

  if (!UUID_RE.test(activityEventId)) {
    return invalid("activityEventId must be a UUID");
  }
  if (!operationId || operationId.length > 180) {
    return invalid("operationId is required and must be 180 characters or fewer");
  }
  if (
    rawCandidates.length === 0 ||
    rawCandidates.length > MAX_FACTS ||
    candidates.length !== rawCandidates.length
  ) {
    return invalid(`candidates must contain 1-${MAX_FACTS} valid fact rows`);
  }

  const { data: activity, error: activityError } = await supabase
    .from("activity_events")
    .select("id, user_id, acting_as_actor_id, input_text, metadata_json")
    .eq("id", activityEventId)
    .eq("user_id", actorContext.appUserId)
    .eq("acting_as_actor_id", actorContext.actorId)
    .maybeSingle();

  if (activityError) return invalid(activityError.message, 500);
  if (!activity) return invalid("Activity event not found or access denied", 404);

  const metadata =
    activity.metadata_json && typeof activity.metadata_json === "object"
      ? (activity.metadata_json as Record<string, unknown>)
      : {};

  if (
    metadata.sourceSurface !== "activity_ai_lab" ||
    metadata.aiAnalysisOperationId !== operationId
  ) {
    return invalid("Activity is not bound to this AI Lab analysis operation", 409);
  }

  const inputText = text(activity.input_text);
  if (!inputText) {
    return invalid("Activity input_text is required for fact evidence verification", 409);
  }

  if (candidates.some((candidate) => !containsEvidenceFragment(inputText, candidate.rawFragment))) {
    return invalid("One or more fact evidence fragments are not present in activity input_text", 409);
  }

  const { data: execution, error: executionError } = await supabase
    .from("ai_analysis_executions")
    .select("id, status, operation_kind")
    .eq("surface_code", EXECUTION_SURFACE_CODE)
    .eq("external_operation_id", operationId)
    .eq("app_user_id", actorContext.appUserId)
    .eq("actor_id", actorContext.actorId)
    .maybeSingle();

  if (executionError) return invalid(executionError.message, 500);
  if (!execution) return invalid("Completed analysis execution not found", 404);
  if (
    execution.status !== "completed" ||
    execution.operation_kind !== EXECUTION_OPERATION_KIND
  ) {
    return invalid("Analysis execution is not eligible for fact materialization", 409);
  }

  const valueObjectIds = Array.from(
    new Set(candidates.map((candidate) => candidate.targetValueObjectId)),
  );
  const { data: valueObjects, error: valueObjectError } = await supabase
    .from("value_objects")
    .select("id, canonical_key, scope_code, ontology_node_role_code, status")
    .in("id", valueObjectIds);

  if (valueObjectError) return invalid(valueObjectError.message, 500);

  const valueObjectById = new Map(
    (valueObjects ?? []).map((row) => [String(row.id), row]),
  );

  const invalidTarget = candidates.find((candidate) => {
    const target = valueObjectById.get(candidate.targetValueObjectId);
    return (
      !target ||
      target.canonical_key !== candidate.canonicalKey ||
      target.scope_code !== "global" ||
      target.ontology_node_role_code !== "leaf" ||
      target.status !== "active"
    );
  });

  if (invalidTarget) {
    return invalid("One or more fact targets are not active GLOBAL leaf objects", 409);
  }

  const targetKeys = candidates.map((candidate) => candidate.targetKey);
  const { data: feedbackRows, error: feedbackError } = await supabase
    .from("ai_feedback_events")
    .select("target_key, verdict_code, created_at")
    .eq("analysis_execution_id", execution.id)
    .eq("app_user_id", actorContext.appUserId)
    .eq("actor_id", actorContext.actorId)
    .eq("surface_code", "activity_ai_lab")
    .eq("target_kind", "fact")
    .in("target_key", targetKeys)
    .order("created_at", { ascending: true });

  if (feedbackError) return invalid(feedbackError.message, 500);

  const verdicts = new Map<string, AiLabFactMaterializationVerdict>();
  for (const row of feedbackRows ?? []) {
    const targetKey = text(row.target_key);
    const verdict = text(row.verdict_code);
    if (
      targetKey &&
      (verdict === "confirmed" || verdict === "rejected" || verdict === "commented")
    ) {
      verdicts.set(targetKey, verdict);
    }
  }

  const writerRows = buildAiLabFactWriterRows({
    candidates,
    verdictsByTargetKey: verdicts,
    analysisOperationId: operationId,
  });

  if (writerRows.length === 0) {
    return NextResponse.json({
      ok: true,
      contractVersion: CONTRACT_CODE,
      disposition: "nothing_to_materialize",
      activityEventId,
      submittedFactCount: candidates.length,
      rejectedFactCount: candidates.length,
      materializedFactCount: 0,
      rows: [],
    });
  }

  const requestHash = sha256({
    contractVersion: CONTRACT_CODE,
    activityEventId,
    operationId,
    facts: writerRows,
  });
  const idempotencyKey = `${CONTRACT_CODE}:${operationId}:${activityEventId}`;

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "attach_global_observation_facts_gsr1_v1",
    {
      p_owner_user_id: actorContext.appUserId,
      p_owner_actor_id: actorContext.actorId,
      p_activity_event_id: activityEventId,
      p_idempotency_key: idempotencyKey,
      p_request_hash: requestHash,
      p_facts: writerRows,
    },
  );

  if (rpcError) {
    return invalid(rpcError.message || "GLOBAL fact writer failed", 500);
  }

  return NextResponse.json({
    ok: true,
    contractVersion: CONTRACT_CODE,
    disposition: "materialized",
    activityEventId,
    submittedFactCount: candidates.length,
    rejectedFactCount: candidates.length - writerRows.length,
    materializedFactCount: writerRows.length,
    writerResult: rpcData,
  });
}
