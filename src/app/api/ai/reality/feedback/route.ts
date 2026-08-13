import { NextRequest, NextResponse } from "next/server";

import { auth0 } from "../../../../../../lib/auth0";
import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../../lib/actor-context";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SURFACE_CODE = "activity_ai_lab";
const EXECUTION_SURFACE_CODE = "global_observation_preview";
const EXECUTION_OPERATION_KIND = "activity_semantic_intake";
const MAX_EXPLANATION_CHARS = 4000;
const MAX_TARGET_KEY_CHARS = 240;
const MAX_CONTRACT_CHARS = 180;
const MAX_SNAPSHOT_BYTES = 24_000;
const MAX_METADATA_BYTES = 8_000;

const TARGET_KINDS = new Set([
  "primary_selection",
  "fact",
  "semantic_projection",
  "unresolved",
  "manual_leaf_link",
]);

const VERDICT_CODES = new Set([
  "confirmed",
  "rejected",
  "commented",
  "manual_link_added",
]);

type JsonRecord = Record<string, unknown>;

type FeedbackBody = {
  operationId?: unknown;
  clientFeedbackId?: unknown;
  targetKind?: unknown;
  targetKey?: unknown;
  targetValueObjectId?: unknown;
  verdictCode?: unknown;
  sourceContractCode?: unknown;
  proposalSnapshot?: unknown;
  explanationText?: unknown;
  metadata?: unknown;
};

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function asTrimmedText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asOptionalTrimmedText(value: unknown): string | null {
  const text = asTrimmedText(value);
  return text || null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function jsonByteLength(value: JsonRecord): number {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

function invalid(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
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

  let body: FeedbackBody;

  try {
    body = (await request.json()) as FeedbackBody;
  } catch {
    return invalid("Invalid JSON body");
  }

  const operationId = asTrimmedText(body.operationId);
  const clientFeedbackId = asTrimmedText(body.clientFeedbackId);
  const targetKind = asTrimmedText(body.targetKind);
  const targetKey = asTrimmedText(body.targetKey);
  const targetValueObjectId = asOptionalTrimmedText(body.targetValueObjectId);
  const verdictCode = asTrimmedText(body.verdictCode);
  const sourceContractCode = asOptionalTrimmedText(body.sourceContractCode);
  const explanationText = asOptionalTrimmedText(body.explanationText);
  const proposalSnapshot = asRecord(body.proposalSnapshot) ?? {};
  const metadata = asRecord(body.metadata) ?? {};

  if (!operationId || operationId.length > 180) {
    return invalid("operationId is required and must be 180 characters or fewer");
  }

  if (!isUuid(clientFeedbackId)) {
    return invalid("clientFeedbackId must be a UUID");
  }

  if (!TARGET_KINDS.has(targetKind)) {
    return invalid("Unsupported targetKind");
  }

  if (!targetKey || targetKey.length > MAX_TARGET_KEY_CHARS) {
    return invalid("targetKey is required and must be 240 characters or fewer");
  }

  if (targetValueObjectId && !isUuid(targetValueObjectId)) {
    return invalid("targetValueObjectId must be a UUID when provided");
  }

  if (!VERDICT_CODES.has(verdictCode)) {
    return invalid("Unsupported verdictCode");
  }

  if (targetKind === "manual_leaf_link") {
    if (verdictCode !== "manual_link_added" || !targetValueObjectId) {
      return invalid(
        "manual_leaf_link requires manual_link_added and targetValueObjectId",
      );
    }
  } else if (verdictCode === "manual_link_added") {
    return invalid("manual_link_added is reserved for manual_leaf_link");
  }

  if (sourceContractCode && sourceContractCode.length > MAX_CONTRACT_CHARS) {
    return invalid("sourceContractCode must be 180 characters or fewer");
  }

  if (explanationText && explanationText.length > MAX_EXPLANATION_CHARS) {
    return invalid("explanationText must be 4000 characters or fewer");
  }

  if (verdictCode === "commented" && !explanationText) {
    return invalid("commented feedback requires explanationText");
  }

  if (jsonByteLength(proposalSnapshot) > MAX_SNAPSHOT_BYTES) {
    return invalid("proposalSnapshot is too large");
  }

  if (jsonByteLength(metadata) > MAX_METADATA_BYTES) {
    return invalid("metadata is too large");
  }

  const { data: executionData, error: executionError } = await supabase
    .from("ai_analysis_executions")
    .select("id, app_user_id, actor_id, surface_code, operation_kind, status")
    .eq("surface_code", EXECUTION_SURFACE_CODE)
    .eq("external_operation_id", operationId)
    .eq("app_user_id", actorContext.appUserId)
    .eq("actor_id", actorContext.actorId)
    .maybeSingle();

  if (executionError) {
    return invalid(executionError.message, 500);
  }

  if (!executionData) {
    return invalid("Completed analysis execution not found for this operation", 404);
  }

  if (
    executionData.operation_kind !== EXECUTION_OPERATION_KIND ||
    executionData.status !== "completed"
  ) {
    return invalid("Analysis execution is not eligible for feedback", 409);
  }

  const insertRow = {
    client_feedback_id: clientFeedbackId,
    analysis_execution_id: executionData.id,
    app_user_id: actorContext.appUserId,
    actor_id: actorContext.actorId,
    surface_code: SURFACE_CODE,
    target_kind: targetKind,
    target_key: targetKey,
    target_value_object_id: targetValueObjectId,
    verdict_code: verdictCode,
    source_contract_code: sourceContractCode,
    proposal_snapshot_json: proposalSnapshot,
    explanation_text: explanationText,
    metadata_json: {
      ...metadata,
      contract: "ARCTOR_AI_A3_P2_FEEDBACK_REVIEW_UX_V1",
    },
  };

  const { data: inserted, error: insertError } = await supabase
    .from("ai_feedback_events")
    .insert(insertRow)
    .select(
      "id, client_feedback_id, target_kind, target_key, target_value_object_id, verdict_code, explanation_text, created_at",
    )
    .single();

  if (!insertError && inserted) {
    return NextResponse.json({
      ok: true,
      disposition: "inserted",
      feedbackEvent: inserted,
    });
  }

  if (insertError?.code !== "23505") {
    return invalid(insertError?.message || "Could not save feedback", 500);
  }

  const { data: existing, error: existingError } = await supabase
    .from("ai_feedback_events")
    .select(
      "id, client_feedback_id, target_kind, target_key, target_value_object_id, verdict_code, explanation_text, created_at",
    )
    .eq("app_user_id", actorContext.appUserId)
    .eq("client_feedback_id", clientFeedbackId)
    .maybeSingle();

  if (existingError || !existing) {
    return invalid(existingError?.message || "Feedback idempotency lookup failed", 500);
  }

  const sameRequest =
    existing.target_kind === targetKind &&
    existing.target_key === targetKey &&
    (existing.target_value_object_id ?? null) === targetValueObjectId &&
    existing.verdict_code === verdictCode &&
    (existing.explanation_text ?? null) === explanationText;

  if (!sameRequest) {
    return invalid("clientFeedbackId was already used for different feedback", 409);
  }

  return NextResponse.json({
    ok: true,
    disposition: "existing",
    feedbackEvent: existing,
  });
}
