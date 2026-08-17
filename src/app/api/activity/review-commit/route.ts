import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { getActivityUserContext } from "../../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type JsonRecord = Record<string, unknown>;

type Body = {
  activityEventId?: unknown;
  reviewDraftId?: unknown;
  idempotencyKey?: unknown;
  selectedLeafIds?: unknown;
  primaryLeafId?: unknown;
  primaryCorrection?: unknown;
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  return Object.fromEntries(
    Object.entries(value as JsonRecord)
      .filter(([, entry]) => typeof entry !== "undefined")
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonicalize(entry)]),
  );
}

function requestHash(value: unknown) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(canonicalize(value)), "utf8")
    .digest("hex");
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

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const activityEventId = text(body.activityEventId);
  const reviewDraftId = text(body.reviewDraftId);
  const idempotencyKey = text(body.idempotencyKey);

  if (!validUuid(activityEventId) || !validUuid(reviewDraftId)) {
    return NextResponse.json(
      {
        ok: false,
        error: "activityEventId and reviewDraftId must be UUIDs",
      },
      { status: 400 },
    );
  }

  if (!idempotencyKey || idempotencyKey.length > 180) {
    return NextResponse.json(
      { ok: false, error: "idempotencyKey is invalid" },
      { status: 400 },
    );
  }

  if (!Array.isArray(body.selectedLeafIds)) {
    return NextResponse.json(
      { ok: false, error: "selectedLeafIds must be an array" },
      { status: 400 },
    );
  }

  const selectedLeafIds = Array.from(
    new Set(
      body.selectedLeafIds
        .map((value) => text(value))
        .filter((value) => validUuid(value)),
    ),
  );

  if (
    selectedLeafIds.length !== body.selectedLeafIds.length ||
    selectedLeafIds.length < 1 ||
    selectedLeafIds.length > 30
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "selectedLeafIds must contain 1-30 unique UUIDs",
      },
      { status: 400 },
    );
  }

  const primaryLeafId = text(body.primaryLeafId);
  if (!validUuid(primaryLeafId) || !selectedLeafIds.includes(primaryLeafId)) {
    return NextResponse.json(
      {
        ok: false,
        error: "primaryLeafId must be a selected leaf UUID",
      },
      { status: 400 },
    );
  }

  const primaryCorrection = asRecord(body.primaryCorrection);

  const { data: draftData, error: draftReadError } = await supabase
    .from("activity_semantic_review_drafts_a31")
    .select("id,activity_event_id,app_user_id,actor_id,status,proposals_json")
    .eq("id", reviewDraftId)
    .eq("activity_event_id", activityEventId)
    .eq("app_user_id", appUser.id)
    .eq("actor_id", personActor.id)
    .eq("status", "draft")
    .maybeSingle();

  if (draftReadError) {
    return NextResponse.json(
      { ok: false, error: draftReadError.message },
      { status: 500 },
    );
  }

  if (!draftData) {
    return NextResponse.json(
      { ok: false, error: "Review draft not found" },
      { status: 404 },
    );
  }

  const proposals = Array.isArray(draftData.proposals_json)
    ? (draftData.proposals_json as unknown[])
    : [];
  const primaryIndex = proposals.findIndex(
    (item) => asRecord(item).isPrimary === true,
  );

  if (primaryIndex < 0) {
    return NextResponse.json(
      { ok: false, error: "Review draft primary proposal is missing" },
      { status: 409 },
    );
  }

  const primaryProposal = asRecord(proposals[primaryIndex]);
  const freeSemanticMode =
    primaryProposal.proposalKind === "semantic_proposal";

  if (freeSemanticMode) {
    const nextProposals = proposals.map((item, index) =>
      index === primaryIndex
        ? { ...asRecord(item), valueObjectId: primaryLeafId }
        : item,
    );

    const { error: draftUpdateError } = await supabase
      .from("activity_semantic_review_drafts_a31")
      .update({
        proposals_json: nextProposals,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reviewDraftId)
      .eq("status", "draft");

    if (draftUpdateError) {
      return NextResponse.json(
        { ok: false, error: draftUpdateError.message },
        { status: 409 },
      );
    }
  }

  const requestContract = {
    contract: "ARCTOR_AI_A3_1_REVIEW_FACT_COMMIT_V1",
    activityEventId,
    reviewDraftId,
    selectedLeafIds: [...selectedLeafIds].sort(),
    primaryLeafId,
    primaryCorrection: freeSemanticMode ? {} : primaryCorrection,
  };

  const { data, error } = await supabase.rpc(
    "commit_activity_semantic_review_a31_v1",
    {
      p_owner_user_id: appUser.id,
      p_owner_actor_id: personActor.id,
      p_activity_event_id: activityEventId,
      p_review_draft_id: reviewDraftId,
      p_idempotency_key: idempotencyKey,
      p_request_hash: requestHash(requestContract),
      p_selected_leaf_ids: selectedLeafIds,
      p_primary_correction: freeSemanticMode ? {} : primaryCorrection,
    },
  );

  if (error) {
    const status =
      error.message.includes("IDEMPOTENCY_CONFLICT") ? 409 :
      error.message.includes("NOT_OWNED") ||
      error.message.includes("ACCESS_DENIED") ? 403 :
      error.message.includes("NOT_FOUND") ? 404 :
      409;

    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        contract: "ARCTOR_AI_A3_1_REVIEW_FACT_COMMIT_V1",
      },
      { status },
    );
  }

  return NextResponse.json({
    ok: true,
    ...(asRecord(data)),
  });
}
