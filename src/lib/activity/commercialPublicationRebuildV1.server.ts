import "server-only";

import { supabase } from "../../../lib/supabase";
import {
  createRawActivitySignal,
  markRawActivitySignalProcessed,
} from "../../../lib/activity/rawActivitySignals";
import { createActivityEventViaPp1Rpc } from "@/lib/activity/pp1/createActivityEventRpc";
import type { ActivityCreatePp1 } from "@/types/activity-model-pp1";

type Claim = {
  jobId: string;
  messageObjectId: string;
  appliedEditId: string;
  idempotencyKey: string;
  sourceSha256: string;
  contentText: string;
  languageCode: string | null;
  ownerUserId: string;
  creatorActorId: string;
  authorActorId: string;
  appliedAt: string;
  previousActivityIds: string[];
};

type Input = { ownerUserId: string; actorId: string; appliedEditId: string };

function compact(value: string, max: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= max ? normalized : `${normalized.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Creates ONE revision-specific RAW signal and PP1 activity. It deliberately does
 * not trigger semantic analysis, AI, or fact writers. A claimed job is
 * never automatically resumed after an ambiguous failure; curator reconciliation
 * is required, to avoid duplicate source evidence.
 */
export async function createCommercialPublicationRevisionEvidenceV1(input: Input) {
  const { data: receipt, error: claimError } = await supabase.rpc(
    "arctor_publication_claim_rebuild_v1",
    {
      p_owner_user_id: input.ownerUserId,
      p_requesting_actor_id: input.actorId,
      p_applied_edit_id: input.appliedEditId,
    },
  );
  if (claimError) throw new Error(`P36B23_CLAIM_FAILED:${claimError.message}`);
  const claim = receipt as Claim;
  if (!claim?.jobId || !claim.idempotencyKey || !claim.contentText || !claim.creatorActorId || !claim.appliedAt) {
    throw new Error("P36B23_INVALID_CLAIM_RECEIPT");
  }
  let rawSignalId: string | null = null;
  let activityEventId: string | null = null;
  try {
    const source = await createRawActivitySignal({
      userId: input.ownerUserId,
      sourceType: "system_event",
      // A revision is a distinct source event; the publication ID is retained as provenance.
      sourceEventId: `publication_revision:${claim.appliedEditId}`,
      idempotencyKey: claim.idempotencyKey,
      rawPayload: {
        contract: "ARCTOR_P36B23_REBUILD_EVIDENCE_V1",
        sourceKind: "applied_publication_revision",
        messageObjectId: claim.messageObjectId,
        appliedEditId: claim.appliedEditId,
        sourceSha256: claim.sourceSha256,
        contentText: claim.contentText,
        languageCode: claim.languageCode,
        previousActivityIds: claim.previousActivityIds,
      },
      normalizedPreview: { publicationRevisionRebuildV1: {
        appliedEditId: claim.appliedEditId, sourceSha256: claim.sourceSha256,
        analysisStarted: false, factsWritten: 0,
      } },
      occurredAt: claim.appliedAt,
      trustLevel: "medium",
      privacyScope: "public",
      processingStatus: "pending",
      metadata: { sourceSurface: "feed", commercial: true,
        publicationRevisionRebuildV1: { appliedEditId: claim.appliedEditId,
          originalActivityIds: claim.previousActivityIds, doNotRetryOriginalSignal: true } },
    });
    if (!source.ok || !source.signal?.id) {
      throw new Error(`P36B23_RAW_CREATE_FAILED:${source.error ?? "UNKNOWN"}`);
    }
    rawSignalId = source.signal.id;
    const { error: checkpointError } = await supabase.rpc("arctor_publication_checkpoint_rebuild_v1", {
      p_owner_user_id: input.ownerUserId, p_requesting_actor_id: input.actorId,
      p_job_id: claim.jobId, p_stage: "raw_recorded", p_raw_signal_id: rawSignalId,
      p_activity_event_id: null, p_error_code: null,
    });
    if (checkpointError) throw new Error(`P36B23_RAW_CHECKPOINT_FAILED:${checkpointError.message}`);

    const activity: ActivityCreatePp1 = {
      activityRoleCode: "actual",
      title: compact(claim.contentText, 180),
      inputText: claim.contentText,
      description: `Source: amended_public_feed_publication\nMessage object: ${claim.messageObjectId}\nApplied edit: ${claim.appliedEditId}`,
      source: "system_event",
      privacyScope: "private",
      status: "completed",
      startedAt: claim.appliedAt,
      endedAt: claim.appliedAt,
      durationMinutes: null,
      fulfillsPlannedActivityEventId: null,
      metadata: {
        sourceSurface: "feed", sourceMessageObjectId: claim.messageObjectId,
        publicationSourceRebuildV1: {
          contract: "ARCTOR_P36B23_REBUILD_EVIDENCE_V1",
          appliedEditId: claim.appliedEditId, sourceSha256: claim.sourceSha256,
          originalActivityIds: claim.previousActivityIds,
          sourceTimestamp: claim.appliedAt, analysisStarted: false,
        },
        commercialFeedPublicationV1: {
          contract: "ARCTOR_P36B23_REBUILD_EVIDENCE_V1",
          // Basic intake uses this metadata guard to select commercial-only templates.
          activityContextCode: "commercial",
          analyticsVisibilityCode: "public",
          sourceMessageObjectId: claim.messageObjectId, rawSignalId,
          actorResolutionStatus: "resolved_author_actor",
          creatorActorId: claim.creatorActorId, actingAsActorId: claim.authorActorId,
          ownerUserId: input.ownerUserId,
        },
      },
    };
    const created = await createActivityEventViaPp1Rpc({
      ownerUserId: input.ownerUserId,
      ownerActorId: claim.creatorActorId,
      idempotencyKey: `${claim.idempotencyKey}:activity`,
      activity,
      plannedTargetValueObjectIds: [],
    });
    if (!created.ok) throw new Error(`P36B23_PP1_ACTIVITY_FAILED:${created.errorMessage}`);
    activityEventId = String(created.data.activityEvent.id);
    const savedMetadata = created.data.activityEvent.metadata_json;
    const additionalMetadata = activity.metadata ?? {};
    const eventMeta = typeof savedMetadata === "object" && savedMetadata && !Array.isArray(savedMetadata)
      ? savedMetadata as Record<string, unknown> : {};
    const patchMeta = typeof additionalMetadata === "object" && additionalMetadata && !Array.isArray(additionalMetadata)
      ? additionalMetadata as Record<string, unknown> : {};
    const { data: events, error: updateError } = await supabase.from("activity_events")
      .update({
        acting_as_actor_id: claim.authorActorId,
        source_message_object_id: claim.messageObjectId,
        activity_context_code: "commercial",
        analytics_visibility_code: "public",
        commercial_processing_status: "needs_review",
        commercial_processing_error: "PUBLICATION_REVISION_NEW_SIGNAL_REVIEW_REQUIRED",
        metadata_json: { ...eventMeta, ...patchMeta },
        updated_at: new Date().toISOString(),
      })
      .eq("id", activityEventId).eq("user_id", input.ownerUserId)
      .select("id");
    if (updateError || !events?.length) throw new Error(`P36B23_ACTIVITY_LINK_FAILED:${updateError?.message ?? "MISSING"}`);
    const processed = await markRawActivitySignalProcessed({
      signalId: rawSignalId,
      userId: input.ownerUserId,
      outputEventId: activityEventId,
      normalizedPreview: {
        publicationRevisionRebuildV1: {
          appliedEditId: claim.appliedEditId,
          originalActivityIds: claim.previousActivityIds,
          activityEventId, analysisStarted: false, factsWritten: 0,
        },
      },
    });
    if (!processed.ok) throw new Error(`P36B23_RAW_FINALIZE_FAILED:${processed.error ?? "UNKNOWN"}`);
    const { error: finishError } = await supabase.rpc("arctor_publication_checkpoint_rebuild_v1", {
      p_owner_user_id: input.ownerUserId, p_requesting_actor_id: input.actorId,
      p_job_id: claim.jobId, p_stage: "completed", p_raw_signal_id: rawSignalId,
      p_activity_event_id: activityEventId, p_error_code: null,
    });
    if (finishError) throw new Error(`P36B23_FINAL_CHECKPOINT_FAILED:${finishError.message}`);
    return {
      jobId: claim.jobId, appliedEditId: claim.appliedEditId,
      rawSignalId, activityEventId,
      status: "completed" as const, aiCalls: 0, factsWritten: 0,
      analysisStarted: false,
    };
  } catch (error) {
    const errorCode = error instanceof Error ? error.message.split(":")[0] : "P36B23_UNKNOWN";
    const { error: failureLogError } = await supabase.rpc("arctor_publication_checkpoint_rebuild_v1", {
      p_owner_user_id: input.ownerUserId, p_requesting_actor_id: input.actorId,
      p_job_id: claim.jobId, p_stage: "manual_review", p_raw_signal_id: rawSignalId,
      p_activity_event_id: activityEventId, p_error_code: errorCode,
    });
    if (failureLogError) console.error("P36B23_MANUAL_REVIEW_CHECKPOINT_FAILED", claim.jobId, failureLogError.message);
    throw new Error("P36B23_MANUAL_RECONCILIATION_REQUIRED");
  }
}
