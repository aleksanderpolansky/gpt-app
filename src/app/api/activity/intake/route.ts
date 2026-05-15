import { NextResponse } from "next/server";
import {
  ACTIVITY_RECORDING_DISABLED_MESSAGE,
  ACTIVITY_RECORDING_ENABLED,
} from "../../../../../lib/activity/activityRecordingConfig";
import { getActivityUserContext } from "../../../../../lib/activity/activityUserContext";
import {
  buildRawSignalIdempotencyKey,
  decideActivityIntake,
  normalizeRawActivitySignalSourceType,
} from "../../../../../lib/activity/activitySourceIntake";
import {
  createRawActivitySignal,
  type RawActivitySignalPrivacyScope,
  type RawActivitySignalRow,
  type RawActivitySignalSourceType,
  type RawActivitySignalTrustLevel,
} from "../../../../../lib/activity/rawActivitySignals";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type ActivityIntakeBody = {
  sourceType?: unknown;
  sourceEventId?: unknown;
  externalId?: unknown;
  idempotencyKey?: unknown;
  occurredAt?: unknown;
  measuredAt?: unknown;
  trustLevel?: unknown;
  privacyScope?: unknown;
  payload?: unknown;
  rawPayload?: unknown;
  normalizedPreview?: unknown;
  metadata?: unknown;
};

type ExistingRawSignalMatch = {
  signal: RawActivitySignalRow;
  matchedBy: "idempotency_key" | "source_event_id";
};

const ENDPOINT = "/api/activity/intake";

const ALLOWED_TRUST_LEVELS = new Set([
  "untrusted",
  "low",
  "medium",
  "high",
  "trusted",
  "system",
]);

const ALLOWED_PRIVACY_SCOPES = new Set([
  "private",
  "shared_with_org",
  "public_masked",
  "public",
]);

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function normalizeTrustLevel(
  value: unknown,
  fallback: RawActivitySignalTrustLevel
): RawActivitySignalTrustLevel {
  const trustLevel = asString(value);

  if (trustLevel && ALLOWED_TRUST_LEVELS.has(trustLevel)) {
    return trustLevel as RawActivitySignalTrustLevel;
  }

  return fallback;
}

function normalizePrivacyScope(
  value: unknown,
  fallback: RawActivitySignalPrivacyScope = "private"
): RawActivitySignalPrivacyScope {
  const privacyScope = asString(value);

  if (privacyScope && ALLOWED_PRIVACY_SCOPES.has(privacyScope)) {
    return privacyScope as RawActivitySignalPrivacyScope;
  }

  return fallback;
}

function normalizeOptionalIsoDate(value: unknown) {
  const rawValue = asString(value);

  if (!rawValue) {
    return null;
  }

  const date = new Date(rawValue);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function summarizeRawSignal(rawSignal: RawActivitySignalRow) {
  return {
    id: rawSignal.id,
    sourceType: rawSignal.source_type,
    sourceEventId: rawSignal.source_event_id,
    idempotencyKey: rawSignal.idempotency_key,
    trustLevel: rawSignal.trust_level,
    privacyScope: rawSignal.privacy_scope,
    processingStatus: rawSignal.processing_status,
    occurredAt: rawSignal.occurred_at,
    measuredAt: rawSignal.measured_at,
    outputEventId: rawSignal.output_event_id,
    createdAt: rawSignal.created_at,
  };
}

function buildNormalizedPreview(params: {
  body: ActivityIntakeBody;
  decision: ReturnType<typeof decideActivityIntake>;
  sourceEventId: string | null;
  idempotencyKey: string;
  occurredAt: string | null;
  measuredAt: string | null;
}) {
  const {
    body,
    decision,
    sourceEventId,
    idempotencyKey,
    occurredAt,
    measuredAt,
  } = params;

  return {
    ...(asRecord(body.normalizedPreview)),
    intake: {
      sourceType: decision.rawSourceType,
      activityEventSource: decision.activityEventSource,
      sourceEventId,
      idempotencyKey,
      occurredAt,
      measuredAt,
      defaultActivityStatus: decision.defaultActivityStatus,
      defaultRawProcessingStatus: decision.defaultRawProcessingStatus,
      requiresHumanReview: decision.requiresHumanReview,
      shouldCreateImportedPendingEvent:
        decision.shouldCreateImportedPendingEvent,
      shouldCreateDraftEvent: decision.shouldCreateDraftEvent,
      shouldCreateCompletedEvent: decision.shouldCreateCompletedEvent,
    },
  };
}

async function findExistingRawSignal(params: {
  userId: string;
  sourceType: RawActivitySignalSourceType;
  sourceEventId: string | null;
  idempotencyKey: string | null;
}): Promise<ExistingRawSignalMatch | null> {
  const { userId, sourceType, sourceEventId, idempotencyKey } = params;

  if (idempotencyKey) {
    const { data, error } = await supabase
      .from("raw_activity_signals")
      .select("*")
      .eq("user_id", userId)
      .eq("source_type", sourceType)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (data) {
      return {
        signal: data as RawActivitySignalRow,
        matchedBy: "idempotency_key",
      };
    }
  }

  if (sourceEventId) {
    const { data, error } = await supabase
      .from("raw_activity_signals")
      .select("*")
      .eq("user_id", userId)
      .eq("source_type", sourceType)
      .eq("source_event_id", sourceEventId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (data) {
      return {
        signal: data as RawActivitySignalRow,
        matchedBy: "source_event_id",
      };
    }
  }

  return null;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: ENDPOINT,
    method: "POST",
    enabled: ACTIVITY_RECORDING_ENABLED,
    status: ACTIVITY_RECORDING_ENABLED ? "ready" : "disabled",
    message: ACTIVITY_RECORDING_ENABLED
      ? "API-ready raw activity intake endpoint. This endpoint captures raw signals only and does not create completed activity events automatically."
      : ACTIVITY_RECORDING_DISABLED_MESSAGE,
    example: {
      sourceType: "api_webhook",
      externalId: "external-event-123",
      occurredAt: new Date().toISOString(),
      payload: {
        title: "External activity signal",
        durationMinutes: 10,
      },
      metadata: {
        adapter: "example",
      },
    },
    duplicateHandling: {
      status: "P4.2.7",
      behavior:
        "Repeated external signals with the same sourceEventId or idempotencyKey return a controlled duplicate response instead of a server error.",
    },
    supportedSourceTypes: [
      "manual_chat",
      "manual_form",
      "voice_input",
      "app_action",
      "system_event",
      "api_webhook",
      "nfc_sensor",
      "wearable_import",
      "calendar_import",
      "ai_suggested",
      "file_import",
      "external_import",
      "unknown",
    ],
    note:
      "P4.2.7 stores raw_activity_signals only. Imported or external signals should be reviewed before becoming completed activities.",
  });
}

export async function POST(request: Request) {
  if (!ACTIVITY_RECORDING_ENABLED) {
    return NextResponse.json(
      {
        ok: false,
        error: ACTIVITY_RECORDING_DISABLED_MESSAGE,
      },
      { status: 503 }
    );
  }

  const { appUser, errorResponse } = await getActivityUserContext();

  if (errorResponse) {
    return errorResponse;
  }

  if (!appUser) {
    return NextResponse.json(
      {
        ok: false,
        error: "User context not found",
      },
      { status: 500 }
    );
  }

  let body: ActivityIntakeBody;

  try {
    body = (await request.json()) as ActivityIntakeBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid JSON body",
      },
      { status: 400 }
    );
  }

  const rawSourceType = normalizeRawActivitySignalSourceType(body.sourceType);
  const decision = decideActivityIntake({
    sourceType: rawSourceType,
  });

  const occurredAt = normalizeOptionalIsoDate(body.occurredAt);
  const measuredAt = normalizeOptionalIsoDate(body.measuredAt);
  const sourceEventId = asString(body.sourceEventId) ?? asString(body.externalId);

  const explicitIdempotencyKey = asString(body.idempotencyKey);
  const idempotencyKey =
    explicitIdempotencyKey ??
    buildRawSignalIdempotencyKey({
      sourceType: rawSourceType,
      externalId: sourceEventId,
      occurredAt,
      measuredAt,
      fallbackKey: JSON.stringify(body.payload ?? body.rawPayload ?? {}),
    });

  const trustLevel = normalizeTrustLevel(
    body.trustLevel,
    decision.defaultTrustLevel
  );

  const privacyScope = normalizePrivacyScope(body.privacyScope, "private");

  const rawPayload = {
    endpoint: ENDPOINT,
    sourceType: rawSourceType,
    sourceEventId,
    idempotencyKey,
    occurredAt,
    measuredAt,
    payload: body.payload ?? body.rawPayload ?? {},
    metadata: asRecord(body.metadata),
  };

  const normalizedPreview = buildNormalizedPreview({
    body,
    decision,
    sourceEventId,
    idempotencyKey,
    occurredAt,
    measuredAt,
  });

  const rawSignalResult = await createRawActivitySignal({
    userId: appUser.id,
    sourceType: rawSourceType,
    sourceEventId,
    idempotencyKey,
    rawPayload,
    normalizedPreview,
    occurredAt,
    measuredAt,
    trustLevel,
    privacyScope,
    processingStatus: decision.defaultRawProcessingStatus,
    metadata: {
      ...(asRecord(body.metadata)),
      endpoint: ENDPOINT,
      intakeVersion: "P4.2.7",
      activityEventSource: decision.activityEventSource,
      defaultActivityStatus: decision.defaultActivityStatus,
      requiresHumanReview: decision.requiresHumanReview,
      noActivityEventCreated: true,
    },
  });

  if (!rawSignalResult.ok || !rawSignalResult.signal) {
    try {
      const existingRawSignal = await findExistingRawSignal({
        userId: appUser.id,
        sourceType: rawSourceType,
        sourceEventId,
        idempotencyKey,
      });

      if (existingRawSignal) {
        return NextResponse.json({
          ok: true,
          status: "duplicate",
          endpoint: ENDPOINT,
          decision,
          duplicate: {
            detected: true,
            matchedBy: existingRawSignal.matchedBy,
            originalRawSignalId: existingRawSignal.signal.id,
            originalProcessingStatus:
              existingRawSignal.signal.processing_status,
            insertError: rawSignalResult.error,
          },
          rawSignal: summarizeRawSignal(existingRawSignal.signal),
          activityEvent: null,
          note:
            "Duplicate raw activity signal was not inserted. Existing raw signal is returned. No completed activity event was created.",
        });
      }
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to inspect duplicate raw activity signal",
          originalInsertError: rawSignalResult.error,
          decision,
          activityEvent: null,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: rawSignalResult.error ?? "Failed to create raw activity signal",
        decision,
        activityEvent: null,
      },
      { status: 500 }
    );
  }

  const rawSignal = rawSignalResult.signal;

  return NextResponse.json({
    ok: true,
    status: "raw_signal_received",
    endpoint: ENDPOINT,
    decision,
    rawSignal: summarizeRawSignal(rawSignal),
    activityEvent: null,
    note:
      "P4.2.7 stores the raw signal only. Imported/external signals are not completed activities until a later review or adapter flow creates or confirms an activity event.",
  });
}
