export const ACTIVITY_CAPTURE_INPUT_CONTRACT_POLICY_V0 =
  "activity_capture_input_contract_v0" as const;

export const ACTIVITY_CAPTURE_INPUT_CONTRACT_MODE_V0 =
  "read_only_activity_capture_input_no_db_write" as const;

export type ActivityCaptureInputContractPolicyV0 =
  typeof ACTIVITY_CAPTURE_INPUT_CONTRACT_POLICY_V0;

export type ActivityCaptureInputContractModeV0 =
  typeof ACTIVITY_CAPTURE_INPUT_CONTRACT_MODE_V0;

export type ActivityCaptureSourceV0 =
  | "manual"
  | "chat_ai"
  | "quick_action"
  | "debug"
  | "import"
  | "calendar"
  | "booking"
  | "purchase_confirmation"
  | "certificate"
  | "system"
  | "unknown";

export type ActivityCaptureLanguageCodeV0 =
  | "ru"
  | "pl"
  | "en"
  | "de"
  | "es"
  | "uk"
  | "unknown";

export type ActivityCaptureValidationSeverityV0 =
  | "info"
  | "warning"
  | "error";

export type ActivityCaptureValidationIssueV0 = {
  code: string;
  severity: ActivityCaptureValidationSeverityV0;
  message: string;
  field: string | null;
};

export type ActivityCaptureClientTrustV0 = {
  clientIdentityTrusted: false;
  canTrustClientUserId: false;
  canTrustClientActorId: false;
  canTrustClientSpaceId: false;
  canOpenWriteGate: false;
  requiresServerAuthResolution: true;
  requiresActorResolution: true;
  requiresRlsRuntimeVerification: true;
  notes: string[];
};

export type ActivityCaptureInputWritesV0 = {
  sqlExecuted: false;
  dbReadExecuted: false;
  dbWriteExecuted: false;
  supabaseReadExecuted: false;
  supabaseWriteExecuted: false;
  activityEventInserted: false;
  activityEventUpdated: false;
  valueObjectCreated: false;
  activityValueObjectLinkCreated: false;
  stateFactCreated: false;
  stateDeltaCreated: false;
  stateSnapshotCreated: false;
};

export type ActivityCaptureRawInputV0 = {
  rawText?: unknown;
  inputText?: unknown;
  naturalInput?: unknown;
  activityText?: unknown;
  text?: unknown;
  title?: unknown;
  description?: unknown;
  source?: unknown;
  durationMinutes?: unknown;
  inputLanguage?: unknown;
  detectedLanguage?: unknown;
  languageCode?: unknown;
  occurredAtIso?: unknown;
  occurredAt?: unknown;
  timestamp?: unknown;
  timezone?: unknown;
  context?: unknown;
  clientUserId?: unknown;
  clientActorId?: unknown;
  clientSpaceId?: unknown;
  requestedActionKey?: unknown;
  requestedTargetKey?: unknown;
};

export type ActivityCaptureNormalizedInputV0 = {
  rawText: string;
  inputText: string;
  title: string | null;
  description: string | null;
  source: ActivityCaptureSourceV0;
  durationMinutes: number | null;
  inputLanguage: ActivityCaptureLanguageCodeV0;
  occurredAtIso: string | null;
  timezone: string | null;
  context: Record<string, unknown> | null;
  clientUserId: string | null;
  clientActorId: string | null;
  clientSpaceId: string | null;
  requestedActionKey: string | null;
  requestedTargetKey: string | null;
};

export type ActivityCaptureSemanticPreviewRequestV0 = {
  inputText: string;
  title: string | null;
  description: string | null;
  durationMinutes: number | null;
  inputLanguage: ActivityCaptureLanguageCodeV0;
};

export type ActivityCaptureNextActionPreviewRequestV0 =
  ActivityCaptureSemanticPreviewRequestV0 & {
    requestedActionKey: string | null;
    requestedTargetKey: string | null;
  };

export type ActivityCaptureInputContractResultV0 = {
  ok: boolean;
  policy: ActivityCaptureInputContractPolicyV0;
  mode: ActivityCaptureInputContractModeV0;
  routeMode: ActivityCaptureInputContractModeV0;
  normalizedInput: ActivityCaptureNormalizedInputV0 | null;
  semanticPreviewRequest: ActivityCaptureSemanticPreviewRequestV0 | null;
  nextActionPreviewRequest: ActivityCaptureNextActionPreviewRequestV0 | null;
  validationIssues: ActivityCaptureValidationIssueV0[];
  clientTrust: ActivityCaptureClientTrustV0;
  safetyNotes: string[];
  writes: ActivityCaptureInputWritesV0;
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    const parsed = Number.parseFloat(normalized);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function readContext(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function normalizeLanguageCode(value: unknown): ActivityCaptureLanguageCodeV0 {
  const language = readString(value)?.toLowerCase();

  if (
    language === "ru" ||
    language === "pl" ||
    language === "en" ||
    language === "de" ||
    language === "es" ||
    language === "uk"
  ) {
    return language;
  }

  return "unknown";
}

function normalizeSource(value: unknown): ActivityCaptureSourceV0 {
  const source = readString(value)?.toLowerCase();

  if (
    source === "manual" ||
    source === "chat_ai" ||
    source === "quick_action" ||
    source === "debug" ||
    source === "import" ||
    source === "calendar" ||
    source === "booking" ||
    source === "purchase_confirmation" ||
    source === "certificate" ||
    source === "system"
  ) {
    return source;
  }

  return "unknown";
}

function buildIssue(params: {
  code: string;
  severity: ActivityCaptureValidationSeverityV0;
  message: string;
  field?: string | null;
}): ActivityCaptureValidationIssueV0 {
  return {
    code: params.code,
    severity: params.severity,
    message: params.message,
    field: params.field ?? null,
  };
}

function firstTextValue(input: ActivityCaptureRawInputV0): string | null {
  return (
    readString(input.rawText) ??
    readString(input.inputText) ??
    readString(input.naturalInput) ??
    readString(input.activityText) ??
    readString(input.text)
  );
}

function firstLanguageValue(input: ActivityCaptureRawInputV0): ActivityCaptureLanguageCodeV0 {
  return normalizeLanguageCode(
    input.inputLanguage ?? input.detectedLanguage ?? input.languageCode
  );
}

function firstOccurredAtIso(input: ActivityCaptureRawInputV0): string | null {
  const value =
    readString(input.occurredAtIso) ??
    readString(input.occurredAt) ??
    readString(input.timestamp);

  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);

  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

export function buildActivityCaptureInputWritesV0(): ActivityCaptureInputWritesV0 {
  return {
    sqlExecuted: false,
    dbReadExecuted: false,
    dbWriteExecuted: false,
    supabaseReadExecuted: false,
    supabaseWriteExecuted: false,
    activityEventInserted: false,
    activityEventUpdated: false,
    valueObjectCreated: false,
    activityValueObjectLinkCreated: false,
    stateFactCreated: false,
    stateDeltaCreated: false,
    stateSnapshotCreated: false,
  };
}

export function buildActivityCaptureClientTrustV0(): ActivityCaptureClientTrustV0 {
  return {
    clientIdentityTrusted: false,
    canTrustClientUserId: false,
    canTrustClientActorId: false,
    canTrustClientSpaceId: false,
    canOpenWriteGate: false,
    requiresServerAuthResolution: true,
    requiresActorResolution: true,
    requiresRlsRuntimeVerification: true,
    notes: [
      "Client-provided user/actor/space identifiers are captured as hints only.",
      "Server-side auth, actor resolution and RLS verification must happen before any future write gate.",
      "This contract is read-only and cannot open persistence.",
    ],
  };
}

export function buildActivityCaptureInputContractV0(
  rawInput: ActivityCaptureRawInputV0
): ActivityCaptureInputContractResultV0 {
  const validationIssues: ActivityCaptureValidationIssueV0[] = [];
  const rawText = firstTextValue(rawInput);
  const durationMinutes = readNumber(rawInput.durationMinutes);
  const occurredAtIso = firstOccurredAtIso(rawInput);
  const rawOccurredAtText =
    readString(rawInput.occurredAtIso) ??
    readString(rawInput.occurredAt) ??
    readString(rawInput.timestamp);

  if (!rawText) {
    validationIssues.push(
      buildIssue({
        code: "missing_activity_text",
        severity: "error",
        message:
          "Activity Capture input requires one of rawText, inputText, naturalInput, activityText or text.",
        field: "rawText",
      })
    );
  }

  if (durationMinutes !== null && durationMinutes < 0) {
    validationIssues.push(
      buildIssue({
        code: "invalid_duration_minutes",
        severity: "error",
        message: "durationMinutes must be greater than or equal to 0.",
        field: "durationMinutes",
      })
    );
  }

  if (rawInput.durationMinutes !== undefined && durationMinutes === null) {
    validationIssues.push(
      buildIssue({
        code: "unparseable_duration_minutes",
        severity: "warning",
        message:
          "durationMinutes was provided but could not be parsed as a finite number.",
        field: "durationMinutes",
      })
    );
  }

  if (rawOccurredAtText && !occurredAtIso) {
    validationIssues.push(
      buildIssue({
        code: "unparseable_occurred_at",
        severity: "warning",
        message:
          "occurredAt/timestamp was provided but could not be parsed as an ISO-compatible datetime.",
        field: "occurredAtIso",
      })
    );
  }

  const hasBlockingError = validationIssues.some(
    (issue) => issue.severity === "error"
  );

  const clientTrust = buildActivityCaptureClientTrustV0();
  const writes = buildActivityCaptureInputWritesV0();

  if (hasBlockingError || !rawText) {
    return {
      ok: false,
      policy: ACTIVITY_CAPTURE_INPUT_CONTRACT_POLICY_V0,
      mode: ACTIVITY_CAPTURE_INPUT_CONTRACT_MODE_V0,
      routeMode: ACTIVITY_CAPTURE_INPUT_CONTRACT_MODE_V0,
      normalizedInput: null,
      semanticPreviewRequest: null,
      nextActionPreviewRequest: null,
      validationIssues,
      clientTrust,
      safetyNotes: [
        "Invalid Activity Capture input cannot be sent to semantic preview.",
        "No SQL, DB write, Supabase write or state write is performed by this contract.",
      ],
      writes,
    };
  }

  const normalizedInput: ActivityCaptureNormalizedInputV0 = {
    rawText,
    inputText: rawText,
    title: readString(rawInput.title),
    description: readString(rawInput.description),
    source: normalizeSource(rawInput.source),
    durationMinutes,
    inputLanguage: firstLanguageValue(rawInput),
    occurredAtIso,
    timezone: readString(rawInput.timezone),
    context: readContext(rawInput.context),
    clientUserId: readString(rawInput.clientUserId),
    clientActorId: readString(rawInput.clientActorId),
    clientSpaceId: readString(rawInput.clientSpaceId),
    requestedActionKey: readString(rawInput.requestedActionKey),
    requestedTargetKey: readString(rawInput.requestedTargetKey),
  };

  const semanticPreviewRequest: ActivityCaptureSemanticPreviewRequestV0 = {
    inputText: normalizedInput.inputText,
    title: normalizedInput.title,
    description: normalizedInput.description,
    durationMinutes: normalizedInput.durationMinutes,
    inputLanguage: normalizedInput.inputLanguage,
  };

  const nextActionPreviewRequest: ActivityCaptureNextActionPreviewRequestV0 = {
    ...semanticPreviewRequest,
    requestedActionKey: normalizedInput.requestedActionKey,
    requestedTargetKey: normalizedInput.requestedTargetKey,
  };

  return {
    ok: true,
    policy: ACTIVITY_CAPTURE_INPUT_CONTRACT_POLICY_V0,
    mode: ACTIVITY_CAPTURE_INPUT_CONTRACT_MODE_V0,
    routeMode: ACTIVITY_CAPTURE_INPUT_CONTRACT_MODE_V0,
    normalizedInput,
    semanticPreviewRequest,
    nextActionPreviewRequest,
    validationIssues,
    clientTrust,
    safetyNotes: [
      "Activity Capture input contract is read-only.",
      "It only normalizes user input for Semantic Preview and Next Action Preview.",
      "It does not persist Activity Events.",
      "It does not create Value Objects or activity-to-VO links.",
      "It does not create state facts, state deltas or state snapshots.",
      "Client-provided identity fields remain untrusted until server-auth and RLS runtime verification.",
    ],
    writes,
  };
}
