import "server-only";

import { supabase } from "../../../lib/supabase";
import {
  createRawActivitySignal,
  markRawActivitySignalFailed,
  markRawActivitySignalProcessed,
} from "../../../lib/activity/rawActivitySignals";
import { createActivityEventViaPp1Rpc } from "@/lib/activity/pp1/createActivityEventRpc";
import {
  analyzeBasicActivityIntakeV1,
  markBasicActivityIntakeFailureV1,
} from "@/lib/activity/activity-basic-intake-analysis.server";
import { appendRealityCuratorJourneyEvent } from "@/lib/reality-curator/journey-log.server";
import type { ActivityTimingLocalePp1 } from "@/lib/activity/pp1/activityTiming";
import type { ActivityCreatePp1 } from "@/types/activity-model-pp1";

export const ARCTOR_COMMERCIAL_FEED_ACTIVITY_BRIDGE_STEP1_V1 =
  "ARCTOR_COMMERCIAL_FEED_ACTIVITY_BRIDGE_STEP1_V1" as const;

type JsonRecord = Record<string, unknown>;

type MessageObjectRow = {
  id: string;
  owner_user_id: string | null;
  created_by_actor_id: string | null;
  author_actor_id: string | null;
  author_display_name_snapshot: string | null;
  content_text: string | null;
  language_code: string | null;
  audience_scope_code: string;
  lifecycle_status: string;
  activated_at: string | null;
  source_published_at: string | null;
  origin_kind_code: string;
  origin_provider_code: string | null;
  metadata_json: unknown;
};

type CommercialBridgeReceipt = {
  messageObjectId: string;
  rawSignalId: string;
  activityEventId: string;
  ownerUserId: string;
  performedByActorId: string;
  actingAsActorId: string;
  actorResolutionStatus:
    | "resolved_author_actor"
    | "unresolved_reported_source";
};

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function compact(value: string, max: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

function normalizeLocale(value: unknown): ActivityTimingLocalePp1 {
  return value === "en" ||
    value === "pl" ||
    value === "ru" ||
    value === "uk" ||
    value === "de" ||
    value === "es" ||
    value === "cs"
    ? value
    : "ru";
}

async function actorControlledByUser(userId: string, actorId: string) {
  const { data, error } = await supabase.rpc(
    "message_actor_controlled_by_user_v1",
    {
      p_user_id: userId,
      p_actor_id: actorId,
    },
  );

  if (error) {
    throw new Error(
      `COMMERCIAL_FEED_ACTOR_CONTROL_CHECK_FAILED:${error.message}`,
    );
  }

  return data === true;
}

async function loadPublicMessageObject(
  messageObjectId: string,
): Promise<MessageObjectRow | null> {
  const { data, error } = await supabase
    .from("message_objects")
    .select(
      [
        "id",
        "owner_user_id",
        "created_by_actor_id",
        "author_actor_id",
        "author_display_name_snapshot",
        "content_text",
        "language_code",
        "audience_scope_code",
        "lifecycle_status",
        "activated_at",
        "source_published_at",
        "origin_kind_code",
        "origin_provider_code",
        "metadata_json",
      ].join(","),
    )
    .eq("id", messageObjectId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `COMMERCIAL_FEED_MESSAGE_READ_FAILED:${error.message}`,
    );
  }

  return data as MessageObjectRow | null;
}

async function readExistingBridge(
  messageObjectId: string,
): Promise<CommercialBridgeReceipt | null> {
  const { data, error } = await supabase
    .from("activity_events")
    .select(
      "id,user_id,performed_by_actor_id,acting_as_actor_id,metadata_json",
    )
    .eq("source_message_object_id", messageObjectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `COMMERCIAL_FEED_EXISTING_EVENT_READ_FAILED:${error.message}`,
    );
  }

  if (!data) return null;

  const metadata = record(data.metadata_json);
  const bridge = record(metadata.commercialFeedPublicationV1);
  const rawSignalId = text(bridge.rawSignalId);

  if (!rawSignalId) return null;

  return {
    messageObjectId,
    rawSignalId,
    activityEventId: String(data.id),
    ownerUserId: String(data.user_id),
    performedByActorId: String(data.performed_by_actor_id),
    actingAsActorId: String(data.acting_as_actor_id),
    actorResolutionStatus:
      bridge.actorResolutionStatus === "resolved_author_actor"
        ? "resolved_author_actor"
        : "unresolved_reported_source",
  };
}

async function findExistingSignal(input: {
  ownerUserId: string;
  idempotencyKey: string;
}) {
  const { data, error } = await supabase
    .from("raw_activity_signals")
    .select("id,output_event_id,processing_status")
    .eq("user_id", input.ownerUserId)
    .eq("source_type", "system_event")
    .eq("idempotency_key", input.idempotencyKey)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `COMMERCIAL_FEED_SIGNAL_READ_FAILED:${error.message}`,
    );
  }

  return data;
}

async function queueCommercialReview(input: {
  ownerUserId: string;
  rawSignalId: string;
  activityEventId: string;
  reasonCode: string;
  messageObjectId: string;
}) {
  await appendRealityCuratorJourneyEvent({
    userId: input.ownerUserId,
    rawSignalId: input.rawSignalId,
    activityEventId: input.activityEventId,
    eventCode: "curator_queue_registered",
    occurredAt: new Date().toISOString(),
    actorKind: "system",
    provenance: "commercial_feed_publication",
    extraMetadata: {
      sourceContract:
        ARCTOR_COMMERCIAL_FEED_ACTIVITY_BRIDGE_STEP1_V1,
      reasonCode: input.reasonCode,
      sourceMessageObjectId: input.messageObjectId,
      commercial: true,
    },
  }).catch((error) => {
    console.error(
      "COMMERCIAL_FEED_CURATOR_QUEUE_WRITE_FAILED",
      input.activityEventId,
      error,
    );
  });
}

async function markCommercialEvent(input: {
  activityEventId: string;
  status:
    | "pending"
    | "analysis_ready"
    | "auto_processed"
    | "needs_review"
    | "failed";
  error?: string | null;
  activityTemplateId?: string | null;
}) {
  const update: Record<string, unknown> = {
    commercial_processing_status: input.status,
    commercial_processing_error:
      input.error?.slice(0, 3000) ?? null,
    updated_at: new Date().toISOString(),
  };

  if (input.activityTemplateId !== undefined) {
    update.activity_template_id = input.activityTemplateId;
  }

  const { error } = await supabase
    .from("activity_events")
    .update(update)
    .eq("id", input.activityEventId)
    .eq("activity_context_code", "commercial");

  if (error) {
    throw new Error(
      `COMMERCIAL_FEED_EVENT_STATUS_UPDATE_FAILED:${error.message}`,
    );
  }
}

function readSingleHighConfidenceTemplate(
  analysis: JsonRecord,
): { templateId: string; confidence: number } | null {
  if (!Array.isArray(analysis.templateCandidates)) return null;

  const candidates = analysis.templateCandidates
    .map((value) => record(value))
    .flatMap((row) => {
      const templateId = text(row.templateId);
      const confidence =
        typeof row.confidence === "number" &&
        Number.isFinite(row.confidence)
          ? row.confidence
          : null;

      return templateId && confidence !== null && confidence >= 0.9
        ? [{ templateId, confidence }]
        : [];
    });

  return candidates.length === 1 ? candidates[0] : null;
}

async function templateAllowsAutomaticCommercialUse(templateId: string) {
  const { data, error } = await supabase
    .from("activity_templates")
    .select("id,default_metadata_json,status,is_active")
    .eq("id", templateId)
    .eq("status", "active")
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(
      `COMMERCIAL_FEED_TEMPLATE_READ_FAILED:${error.message}`,
    );
  }

  if (!data) return false;

  const metadata = record(data.default_metadata_json);
  const authoring = record(metadata.typicalActivityAuthoringV2);
  const applicability = text(authoring.actorApplicability);
  const acceptanceMode = text(authoring.acceptanceMode);

  return (
    (applicability === "commercial" || applicability === "both") &&
    acceptanceMode === "auto_if_unambiguous"
  );
}

export async function ensureCommercialFeedActivityV1(input: {
  messageObjectId: string;
}): Promise<CommercialBridgeReceipt | null> {
  const existing = await readExistingBridge(input.messageObjectId);
  if (existing) return existing;

  const message = await loadPublicMessageObject(input.messageObjectId);

  if (
    !message ||
    message.lifecycle_status !== "active" ||
    message.audience_scope_code !== "public"
  ) {
    return null;
  }

  const ownerUserId = text(message.owner_user_id);
  const creatorActorId = text(message.created_by_actor_id);
  const sourceText = text(message.content_text);

  if (!ownerUserId || !creatorActorId || !sourceText) {
    throw new Error(
      "COMMERCIAL_FEED_PUBLIC_MESSAGE_IDENTITY_OR_TEXT_MISSING",
    );
  }

  if (!(await actorControlledByUser(ownerUserId, creatorActorId))) {
    throw new Error(
      "COMMERCIAL_FEED_CREATOR_ACTOR_NOT_CONTROLLED",
    );
  }

  const requestedAuthorActorId = text(message.author_actor_id);
  const authorResolved =
    Boolean(requestedAuthorActorId) &&
    await actorControlledByUser(
      ownerUserId,
      requestedAuthorActorId,
    );

  const actingAsActorId = authorResolved
    ? requestedAuthorActorId
    : creatorActorId;

  const actorResolutionStatus =
    authorResolved
      ? "resolved_author_actor"
      : "unresolved_reported_source";

  const idempotencyKey =
    `commercial_feed_publication:${message.id}:v1`;

  let signal = await findExistingSignal({
    ownerUserId,
    idempotencyKey,
  });

  if (!signal) {
    const createdSignal =
      await createRawActivitySignal({
        userId: ownerUserId,
        sourceType: "system_event",
        sourceEventId: message.id,
        idempotencyKey,
        rawPayload: {
          contract:
            ARCTOR_COMMERCIAL_FEED_ACTIVITY_BRIDGE_STEP1_V1,
          messageObjectId: message.id,
          contentText: sourceText,
          languageCode: message.language_code,
          originKindCode: message.origin_kind_code,
          originProviderCode: message.origin_provider_code,
          sourcePublishedAt: message.source_published_at,
          activatedAt: message.activated_at,
        },
        normalizedPreview: {
          commercialFeedReceiptV1: {
            acceptedAt: new Date().toISOString(),
            sourceMessageObjectId: message.id,
          },
        },
        occurredAt:
          message.source_published_at ??
          message.activated_at ??
          new Date().toISOString(),
        trustLevel: "medium",
        privacyScope: "public",
        processingStatus: "pending",
        metadata: {
          sourceSurface: "feed",
          commercial: true,
          sourceMessageObjectId: message.id,
          actorResolutionStatus,
          reportedSourceLabel:
            message.author_display_name_snapshot,
          analyticsVisibility: "public",
          contract:
            ARCTOR_COMMERCIAL_FEED_ACTIVITY_BRIDGE_STEP1_V1,
        },
      });

    if (!createdSignal.ok || !createdSignal.signal) {
      signal = await findExistingSignal({
        ownerUserId,
        idempotencyKey,
      });

      if (!signal) {
        throw new Error(
          `COMMERCIAL_FEED_SIGNAL_CREATE_FAILED:${createdSignal.error ?? "unknown"}`,
        );
      }
    } else {
      signal = createdSignal.signal;
    }
  }

  const rawSignalId = String(signal.id);

  const activity: ActivityCreatePp1 = {
    activityRoleCode: "actual",
    title: compact(sourceText, 180),
    inputText: sourceText,
    description:
      `Source: public_feed_publication\nMessage object: ${message.id}`,
    source: "system_event",
    privacyScope: "private",
    status: "completed",
    startedAt:
      message.source_published_at ??
      message.activated_at ??
      new Date().toISOString(),
    endedAt:
      message.source_published_at ??
      message.activated_at ??
      new Date().toISOString(),
    durationMinutes: null,
    fulfillsPlannedActivityEventId: null,
    metadata: {
      sourceSurface: "feed",
      sourceMessageObjectId: message.id,
      commercialFeedPublicationV1: {
        contract:
          ARCTOR_COMMERCIAL_FEED_ACTIVITY_BRIDGE_STEP1_V1,
        activityContextCode: "commercial",
        analyticsVisibilityCode: "public",
        publicAnalyticsEligible: true,
        sourceMessageObjectId: message.id,
        rawSignalId,
        ownerUserId,
        creatorActorId,
        requestedAuthorActorId:
          requestedAuthorActorId || null,
        actingAsActorId,
        actorResolutionStatus,
        reportedSourceLabel:
          message.author_display_name_snapshot,
        originKindCode: message.origin_kind_code,
        originProviderCode:
          message.origin_provider_code,
      },
    },
  };

  const createdEvent =
    await createActivityEventViaPp1Rpc({
      ownerUserId,
      ownerActorId: creatorActorId,
      idempotencyKey,
      activity,
      plannedTargetValueObjectIds: [],
    });

  if (!createdEvent.ok) {
    await markRawActivitySignalFailed({
      signalId: rawSignalId,
      userId: ownerUserId,
      error: createdEvent.errorMessage,
    }).catch(() => null);

    throw new Error(
      `COMMERCIAL_FEED_ACTIVITY_CREATE_FAILED:${createdEvent.errorMessage}`,
    );
  }

  const activityEventId =
    text(createdEvent.data.activityEvent.id);

  if (!activityEventId) {
    throw new Error(
      "COMMERCIAL_FEED_ACTIVITY_EVENT_ID_MISSING",
    );
  }

  const currentMetadata =
    record(
      createdEvent.data.activityEvent
        .metadata_json,
    );

  const { error: updateError } = await supabase
    .from("activity_events")
    .update({
      acting_as_actor_id: actingAsActorId,
      source_message_object_id: message.id,
      activity_context_code: "commercial",
      analytics_visibility_code: "public",
      commercial_processing_status: "pending",
      commercial_processing_error: null,
      metadata_json: {
        ...currentMetadata,
        ...record(activity.metadata),
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", activityEventId)
    .eq("user_id", ownerUserId);

  if (updateError) {
    await markRawActivitySignalFailed({
      signalId: rawSignalId,
      userId: ownerUserId,
      error: updateError.message,
    }).catch(() => null);

    throw new Error(
      `COMMERCIAL_FEED_ACTIVITY_PROVENANCE_UPDATE_FAILED:${updateError.message}`,
    );
  }

  const markedSignal =
    await markRawActivitySignalProcessed({
      signalId: rawSignalId,
      userId: ownerUserId,
      outputEventId: activityEventId,
      normalizedPreview: {
        commercialFeedReceiptV1: {
          contract:
            ARCTOR_COMMERCIAL_FEED_ACTIVITY_BRIDGE_STEP1_V1,
          sourceMessageObjectId: message.id,
          activityEventId,
          actorResolutionStatus,
          acceptedAt: new Date().toISOString(),
        },
      },
    });

  if (!markedSignal.ok) {
    throw new Error(
      `COMMERCIAL_FEED_SIGNAL_FINALIZE_FAILED:${markedSignal.error ?? "unknown"}`,
    );
  }

  return {
    messageObjectId: message.id,
    rawSignalId,
    activityEventId,
    ownerUserId,
    performedByActorId: creatorActorId,
    actingAsActorId,
    actorResolutionStatus,
  };
}

export async function analyzeCommercialFeedActivityV1(
  receipt: CommercialBridgeReceipt,
) {
  const message = await loadPublicMessageObject(
    receipt.messageObjectId,
  );

  const locale = normalizeLocale(
    message?.language_code,
  );

  try {
    const analysis =
      await analyzeBasicActivityIntakeV1({
        appUserId: receipt.ownerUserId,
        actorId: receipt.actingAsActorId,
        signalId: receipt.rawSignalId,
        activityEventId:
          receipt.activityEventId,
        locale,
        timeZone: "UTC",
      }) as JsonRecord;

    const candidate =
      readSingleHighConfidenceTemplate(
        analysis,
      );

    if (
      receipt.actorResolutionStatus !==
        "resolved_author_actor"
    ) {
      await markCommercialEvent({
        activityEventId:
          receipt.activityEventId,
        status: "needs_review",
        error:
          "COMMERCIAL_FEED_AUTHOR_ACTOR_UNRESOLVED",
        activityTemplateId:
          candidate?.templateId ?? null,
      });

      await queueCommercialReview({
        ownerUserId:
          receipt.ownerUserId,
        rawSignalId:
          receipt.rawSignalId,
        activityEventId:
          receipt.activityEventId,
        reasonCode:
          "COMMERCIAL_FEED_AUTHOR_ACTOR_UNRESOLVED",
        messageObjectId:
          receipt.messageObjectId,
      });

      return {
        ok: true,
        status: "needs_review" as const,
        reason:
          "COMMERCIAL_FEED_AUTHOR_ACTOR_UNRESOLVED",
      };
    }

    if (
      !candidate ||
      !(await templateAllowsAutomaticCommercialUse(
        candidate.templateId,
      ))
    ) {
      const reason =
        candidate
          ? "COMMERCIAL_FEED_TEMPLATE_NOT_AUTO_COMMERCIAL"
          : "COMMERCIAL_FEED_TEMPLATE_NOT_UNAMBIGUOUS";

      await markCommercialEvent({
        activityEventId:
          receipt.activityEventId,
        status: "needs_review",
        error: reason,
        activityTemplateId:
          candidate?.templateId ?? null,
      });

      await queueCommercialReview({
        ownerUserId:
          receipt.ownerUserId,
        rawSignalId:
          receipt.rawSignalId,
        activityEventId:
          receipt.activityEventId,
        reasonCode: reason,
        messageObjectId:
          receipt.messageObjectId,
      });

      return {
        ok: true,
        status: "needs_review" as const,
        reason,
      };
    }

    await markCommercialEvent({
      activityEventId:
        receipt.activityEventId,
      status: "analysis_ready",
      error: null,
      activityTemplateId:
        candidate.templateId,
    });

    return {
      ok: true,
      status: "analysis_ready" as const,
      activityTemplateId:
        candidate.templateId,
      confidence:
        candidate.confidence,
    };
  } catch (error) {
    const messageText =
      error instanceof Error
        ? error.message
        : String(error);

    await markBasicActivityIntakeFailureV1({
      appUserId: receipt.ownerUserId,
      signalId: receipt.rawSignalId,
      activityEventId:
        receipt.activityEventId,
      error,
    }).catch(() => null);

    await markCommercialEvent({
      activityEventId:
        receipt.activityEventId,
      status: "failed",
      error: messageText,
    }).catch(() => null);

    await queueCommercialReview({
      ownerUserId:
        receipt.ownerUserId,
      rawSignalId:
        receipt.rawSignalId,
      activityEventId:
        receipt.activityEventId,
      reasonCode:
        "COMMERCIAL_FEED_ANALYSIS_FAILED",
      messageObjectId:
        receipt.messageObjectId,
    });

    throw error;
  }
}

export async function processPublicFeedMessageV1(input: {
  messageObjectId: string;
}) {
  const receipt =
    await ensureCommercialFeedActivityV1(
      input,
    );

  if (!receipt) {
    return {
      ok: true,
      skipped: true,
      reason:
        "MESSAGE_NOT_ACTIVE_PUBLIC",
    };
  }

  const analysis =
    await analyzeCommercialFeedActivityV1(
      receipt,
    );

  return {
    ok: true,
    skipped: false,
    receipt,
    analysis,
  };
}
