import { NextRequest, NextResponse } from "next/server";

import { auth0 } from "../../../../../../lib/auth0";
import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../../lib/actor-context";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_FEEDBACK_IDS = 24;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type MaterializeBody = {
  activityEventId?: unknown;
  operationId?: unknown;
  feedbackEventIds?: unknown;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function uuidArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => text(item))
        .filter((item) => UUID_RE.test(item)),
    ),
  ).slice(0, MAX_FEEDBACK_IDS);
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

  let body: MaterializeBody;

  try {
    body = (await request.json()) as MaterializeBody;
  } catch {
    return invalid("Invalid JSON body");
  }

  const activityEventId = text(body.activityEventId);
  const operationId = text(body.operationId);
  const rawFeedbackIds = Array.isArray(body.feedbackEventIds)
    ? body.feedbackEventIds
    : [];
  const feedbackEventIds = uuidArray(rawFeedbackIds);

  if (!UUID_RE.test(activityEventId)) {
    return invalid("activityEventId must be a UUID");
  }

  if (!operationId || operationId.length > 180) {
    return invalid("operationId is required and must be 180 characters or fewer");
  }

  if (
    rawFeedbackIds.length === 0 ||
    rawFeedbackIds.length > MAX_FEEDBACK_IDS ||
    feedbackEventIds.length !== rawFeedbackIds.length
  ) {
    return invalid(`feedbackEventIds must contain 1-${MAX_FEEDBACK_IDS} unique UUIDs`);
  }

  const { data: activity, error: activityError } = await supabase
    .from("activity_events")
    .select("id, user_id, acting_as_actor_id")
    .eq("id", activityEventId)
    .eq("user_id", actorContext.appUserId)
    .eq("acting_as_actor_id", actorContext.actorId)
    .maybeSingle();

  if (activityError) {
    return invalid(activityError.message, 500);
  }

  if (!activity) {
    return invalid("Activity event not found or access denied", 404);
  }

  const { data: execution, error: executionError } = await supabase
    .from("ai_analysis_executions")
    .select("id")
    .eq("surface_code", "global_observation_preview")
    .eq("external_operation_id", operationId)
    .eq("app_user_id", actorContext.appUserId)
    .eq("actor_id", actorContext.actorId)
    .eq("status", "completed")
    .maybeSingle();

  if (executionError) {
    return invalid(executionError.message, 500);
  }

  if (!execution) {
    return invalid("Completed analysis execution not found", 404);
  }

  const { data: feedbackRows, error: feedbackError } = await supabase
    .from("ai_feedback_events")
    .select("id, analysis_execution_id, target_value_object_id, target_key")
    .eq("app_user_id", actorContext.appUserId)
    .eq("actor_id", actorContext.actorId)
    .eq("surface_code", "activity_ai_lab")
    .eq("target_kind", "manual_leaf_link")
    .eq("verdict_code", "manual_link_added")
    .eq("analysis_execution_id", execution.id)
    .in("id", feedbackEventIds);

  if (feedbackError) {
    return invalid(feedbackError.message, 500);
  }

  if ((feedbackRows ?? []).length !== feedbackEventIds.length) {
    return invalid("One or more manual link intents are missing or do not belong to this analysis", 409);
  }

  const rows = (feedbackRows ?? []).map((feedback) => ({
    activity_event_id: activityEventId,
    value_object_id: feedback.target_value_object_id,
    actor_id: actorContext.actorId,
    app_user_id: actorContext.appUserId,
    link_type: "semantic_exposure",
    exposure_type: null,
    confidence: 1,
    evidence: {
      feedbackEventId: feedback.id,
      source: "activity_ai_lab_manual_leaf_link",
    },
    metadata: {
      contract: "ARCTOR_AI_A3_P2_FEEDBACK_REVIEW_UX_V1",
      analysisOperationId: operationId,
      feedbackTargetKey: feedback.target_key,
    },
    status: "active",
    provenance_code: "manual",
    created_by_actor_id: actorContext.actorId,
    semantic_match_confidence: 1,
    semantic_match_method_code: "user_confirmed",
  }));

  if (rows.some((row) => !row.value_object_id)) {
    return invalid("Manual link intent is missing target_value_object_id", 409);
  }

  const { data: links, error: linkError } = await supabase
    .from("activity_value_object_links")
    .upsert(rows, {
      onConflict: "activity_event_id,value_object_id,link_type",
      ignoreDuplicates: true,
    })
    .select("id, activity_event_id, value_object_id, link_type, provenance_code, semantic_match_method_code");

  if (linkError) {
    return invalid(linkError.message, 500);
  }

  return NextResponse.json({
    ok: true,
    disposition: "materialized",
    activityEventId,
    feedbackEventIds,
    requestedLinkCount: rows.length,
    insertedLinkCount: links?.length ?? 0,
    links: links ?? [],
  });
}
