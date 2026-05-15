import {
  ACTIVITY_STATUS_COMPLETED,
  ACTIVITY_STATUS_DRAFT,
  ACTIVITY_STATUS_IMPORTED_PENDING,
  type ActivityStatus,
} from "./activityLifecycle";
import type {
  RawActivitySignalProcessingStatus,
  RawActivitySignalSourceType,
  RawActivitySignalTrustLevel,
} from "./rawActivitySignals";

export const RAW_ACTIVITY_SIGNAL_SOURCE_VALUES = [
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
] as const;

export const ACTIVITY_EVENT_SOURCE_VALUES = [
  "manual",
  "chat_ai",
  "calendar",
  "booking",
  "rule",
  "import",
  "system",
  "manual_form",
  "manual_chat",
  "voice_input",
  "app_action",
  "system_event",
  "api_webhook",
  "nfc_sensor",
  "wearable_import",
  "calendar_import",
  "ai_suggested",
  "legacy_code",
] as const;

export type ActivityEventSourceType =
  (typeof ACTIVITY_EVENT_SOURCE_VALUES)[number];

export type ActivityIntakeDecision = {
  rawSourceType: RawActivitySignalSourceType;
  activityEventSource: ActivityEventSourceType;
  defaultTrustLevel: RawActivitySignalTrustLevel;
  defaultRawProcessingStatus: RawActivitySignalProcessingStatus;
  defaultActivityStatus: ActivityStatus;
  shouldCreateImportedPendingEvent: boolean;
  shouldCreateDraftEvent: boolean;
  shouldCreateCompletedEvent: boolean;
  requiresHumanReview: boolean;
  reason: string;
};

const RAW_ACTIVITY_SIGNAL_SOURCE_SET = new Set<string>(
  RAW_ACTIVITY_SIGNAL_SOURCE_VALUES
);

const ACTIVITY_EVENT_SOURCE_SET = new Set<string>(
  ACTIVITY_EVENT_SOURCE_VALUES
);

const DIRECT_USER_SOURCE_SET = new Set<RawActivitySignalSourceType>([
  "manual_form",
  "manual_chat",
  "app_action",
]);

const REVIEW_REQUIRED_SOURCE_SET = new Set<RawActivitySignalSourceType>([
  "api_webhook",
  "nfc_sensor",
  "wearable_import",
  "calendar_import",
  "file_import",
  "external_import",
  "unknown",
]);

const DRAFT_BY_DEFAULT_SOURCE_SET = new Set<RawActivitySignalSourceType>([
  "voice_input",
  "ai_suggested",
]);

function asTrimmedString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function normalizeKeyPart(value: unknown) {
  const text = asTrimmedString(value);

  if (!text) {
    return "none";
  }

  return encodeURIComponent(text)
    .replace(/%/g, "_")
    .replace(/[^a-zA-Z0-9_.:-]/g, "_")
    .slice(0, 120);
}

export function isRawActivitySignalSourceType(
  value: unknown
): value is RawActivitySignalSourceType {
  const sourceType = asTrimmedString(value);

  if (!sourceType) {
    return false;
  }

  return RAW_ACTIVITY_SIGNAL_SOURCE_SET.has(sourceType);
}

export function isActivityEventSourceType(
  value: unknown
): value is ActivityEventSourceType {
  const sourceType = asTrimmedString(value);

  if (!sourceType) {
    return false;
  }

  return ACTIVITY_EVENT_SOURCE_SET.has(sourceType);
}

export function normalizeRawActivitySignalSourceType(
  value: unknown,
  fallback: RawActivitySignalSourceType = "unknown"
): RawActivitySignalSourceType {
  const sourceType = asTrimmedString(value);

  if (isRawActivitySignalSourceType(sourceType)) {
    return sourceType;
  }

  return fallback;
}

export function normalizeActivityEventSourceType(
  value: unknown,
  fallback: ActivityEventSourceType = "import"
): ActivityEventSourceType {
  const sourceType = asTrimmedString(value);

  if (isActivityEventSourceType(sourceType)) {
    return sourceType;
  }

  return fallback;
}

export function mapRawSourceTypeToActivityEventSource(
  sourceType: RawActivitySignalSourceType
): ActivityEventSourceType {
  switch (sourceType) {
    case "manual_chat":
    case "manual_form":
    case "voice_input":
    case "app_action":
    case "system_event":
    case "api_webhook":
    case "nfc_sensor":
    case "wearable_import":
    case "calendar_import":
    case "ai_suggested":
      return sourceType;

    case "file_import":
    case "external_import":
    case "unknown":
      return "import";

    default:
      return "import";
  }
}

export function getDefaultTrustLevelForSourceType(
  sourceType: RawActivitySignalSourceType
): RawActivitySignalTrustLevel {
  switch (sourceType) {
    case "manual_form":
    case "manual_chat":
    case "app_action":
      return "medium";

    case "system_event":
      return "system";

    case "api_webhook":
      return "low";

    case "nfc_sensor":
    case "wearable_import":
    case "calendar_import":
      return "medium";

    case "voice_input":
    case "ai_suggested":
      return "low";

    case "file_import":
    case "external_import":
    case "unknown":
      return "untrusted";

    default:
      return "untrusted";
  }
}

export function getDefaultRawProcessingStatusForSourceType(
  sourceType: RawActivitySignalSourceType
): RawActivitySignalProcessingStatus {
  if (sourceType === "unknown") {
    return "received";
  }

  return "pending";
}

export function getDefaultActivityStatusForRawSource(
  sourceType: RawActivitySignalSourceType
): ActivityStatus {
  if (DIRECT_USER_SOURCE_SET.has(sourceType)) {
    return ACTIVITY_STATUS_COMPLETED;
  }

  if (DRAFT_BY_DEFAULT_SOURCE_SET.has(sourceType)) {
    return ACTIVITY_STATUS_DRAFT;
  }

  return ACTIVITY_STATUS_IMPORTED_PENDING;
}

export function shouldCreateImportedPendingEvent(
  sourceType: RawActivitySignalSourceType
) {
  return REVIEW_REQUIRED_SOURCE_SET.has(sourceType);
}

export function shouldCreateDraftEvent(sourceType: RawActivitySignalSourceType) {
  return DRAFT_BY_DEFAULT_SOURCE_SET.has(sourceType);
}

export function shouldCreateCompletedEvent(
  sourceType: RawActivitySignalSourceType
) {
  return DIRECT_USER_SOURCE_SET.has(sourceType);
}

export function buildRawSignalIdempotencyKey(params: {
  sourceType: RawActivitySignalSourceType;
  externalId?: unknown;
  occurredAt?: unknown;
  measuredAt?: unknown;
  fallbackKey?: unknown;
}) {
  const sourceType = normalizeRawActivitySignalSourceType(params.sourceType);

  const externalId = normalizeKeyPart(params.externalId);
  const occurredAt = normalizeKeyPart(params.occurredAt);
  const measuredAt = normalizeKeyPart(params.measuredAt);
  const fallbackKey = normalizeKeyPart(params.fallbackKey);

  return [
    "raw-activity",
    sourceType,
    externalId,
    occurredAt,
    measuredAt,
    fallbackKey,
  ].join(":");
}

export function decideActivityIntake(params: {
  sourceType: unknown;
  trustLevel?: RawActivitySignalTrustLevel | null;
}): ActivityIntakeDecision {
  const rawSourceType = normalizeRawActivitySignalSourceType(params.sourceType);
  const activityEventSource = mapRawSourceTypeToActivityEventSource(
    rawSourceType
  );

  const defaultTrustLevel =
    params.trustLevel ?? getDefaultTrustLevelForSourceType(rawSourceType);

  const defaultRawProcessingStatus =
    getDefaultRawProcessingStatusForSourceType(rawSourceType);

  const defaultActivityStatus =
    getDefaultActivityStatusForRawSource(rawSourceType);

  const importedPending = shouldCreateImportedPendingEvent(rawSourceType);
  const draft = shouldCreateDraftEvent(rawSourceType);
  const completed = shouldCreateCompletedEvent(rawSourceType);

  return {
    rawSourceType,
    activityEventSource,
    defaultTrustLevel,
    defaultRawProcessingStatus,
    defaultActivityStatus,
    shouldCreateImportedPendingEvent: importedPending,
    shouldCreateDraftEvent: draft,
    shouldCreateCompletedEvent: completed,
    requiresHumanReview: importedPending || draft,
    reason: importedPending
      ? "External or imported signal should create an imported_pending event until reviewed."
      : draft
        ? "Unstructured or AI-suggested signal should create a draft until classified or confirmed."
        : "Direct trusted user action can create a completed event through the normal activity pipeline.",
  };
}
