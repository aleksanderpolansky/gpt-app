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
  type RawActivitySignalTrustLevel,
} from "../../../../../lib/activity/rawActivitySignals";

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

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/activity/intake",
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
      "P4.2.5 stores raw_activity_signals only. Imported or external signals should be reviewed before becoming completed activities.",
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
    endpoint: "/api/activity/intake",
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
      endpoint: "/api/activity/intake",
      intakeVersion: "P4.2.5",
      activityEventSource: decision.activityEventSource,
      defaultActivityStatus: decision.defaultActivityStatus,
      requiresHumanReview: decision.requiresHumanReview,
      noActivityEventCreated: true,
    },
  });

  if (!rawSignalResult.ok || !rawSignalResult.signal) {
    return NextResponse.json(
      {
        ok: false,
        error: rawSignalResult.error ?? "Failed to create raw activity signal",
        decision,
      },
      { status: 500 }
    );
  }

  const rawSignal = rawSignalResult.signal;

  return NextResponse.json({
    ok: true,
    status: "raw_signal_received",
    endpoint: "/api/activity/intake",
    decision,
    rawSignal: {
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
    },
    activityEvent: null,
    note:
      "P4.2.5 stores the raw signal only. Imported/external signals are not completed activities until a later review or adapter flow creates or confirms an activity event.",
  });
}
