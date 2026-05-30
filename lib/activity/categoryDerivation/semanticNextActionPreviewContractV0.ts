export const SEMANTIC_NEXT_ACTION_PREVIEW_POLICY_V0 =
  "semantic_next_action_preview_contract_v0" as const;

export const SEMANTIC_NEXT_ACTION_PREVIEW_MODE_V0 =
  "read_only_next_action_preview_no_db_write" as const;

export type SemanticNextActionPreviewPolicyV0 =
  typeof SEMANTIC_NEXT_ACTION_PREVIEW_POLICY_V0;

export type SemanticNextActionPreviewModeV0 =
  typeof SEMANTIC_NEXT_ACTION_PREVIEW_MODE_V0;

export type SemanticNextActionPreviewStatusV0 =
  | "preview_only"
  | "informational"
  | "requires_user_input"
  | "requires_user_confirmation"
  | "eligible_after_explicit_gate"
  | "blocked_now";

export type SemanticNextActionPreviewRiskLevelV0 =
  | "read_only"
  | "requires_user_confirmation"
  | "requires_persistence_gate"
  | "unknown";

export type SemanticNextActionPreviewWritesV0 = {
  sqlExecuted: false;
  dbReadExecuted: false;
  dbWriteExecuted: false;
  supabaseReadExecuted: false;
  supabaseWriteExecuted: false;
  activityEventInserted: false;
  valueObjectCreated: false;
  activityValueObjectLinkCreated: false;
  reviewActionPersisted: false;
  stateFactCreated: false;
  stateDeltaCreated: false;
  stateSnapshotCreated: false;
};

export type SemanticNextActionPreviewGateMatchV0 = {
  futureGateMatches: number;
  blockedGateMatches: number;
  matchedFutureStatuses: string[];
  matchedBlockedStatuses: string[];
  matchedReasons: string[];
};

export type SemanticNextActionPreviewCandidateV0 = {
  actionPreviewKey: string;
  sourceReviewActionKey: string;
  sourceActionKind: string;
  targetType: string;
  targetKey: string;
  targetTitle: string | null;
  label: string;
  userFacingTitle: string;
  userFacingDescription: string;
  status: SemanticNextActionPreviewStatusV0;
  riskLevel: SemanticNextActionPreviewRiskLevelV0;
  priority: number;
  enabledInReadOnly: boolean;
  sourceWouldWriteNow: boolean;
  wouldWriteNow: false;
  requiresPersistenceGate: boolean;
  requiresUserInput: boolean;
  requiresUserConfirmation: boolean;
  confidence: number | null;
  gateMatch: SemanticNextActionPreviewGateMatchV0;
  safetyNotes: string[];
};

export type SemanticNextActionPreviewBlockerV0 = {
  code: string;
  message: string;
  severity: string;
};

export type SemanticNextActionPreviewResultV0 = {
  ok: boolean;
  policy: SemanticNextActionPreviewPolicyV0;
  mode: SemanticNextActionPreviewModeV0;
  sourcePreviewPolicy: string | null;
  sourcePreviewMode: string | null;
  sourceActivityEventId: string | null;
  sourceReviewActionPolicy: string | null;
  sourcePersistenceGatePolicy: string | null;
  candidates: SemanticNextActionPreviewCandidateV0[];
  suggestedNextActionCandidates: SemanticNextActionPreviewCandidateV0[];
  requiresUserInputCandidates: SemanticNextActionPreviewCandidateV0[];
  requiresUserConfirmationCandidates: SemanticNextActionPreviewCandidateV0[];
  futureGateCandidates: SemanticNextActionPreviewCandidateV0[];
  informationalCandidates: SemanticNextActionPreviewCandidateV0[];
  blockedNowCandidates: SemanticNextActionPreviewCandidateV0[];
  persistenceGateSummary: {
    present: boolean;
    policy: string | null;
    mode: string | null;
    canPersistNow: boolean;
    requiresExplicitGate: boolean;
    requiresAuthenticatedActor: boolean;
    requiresRlsRuntimeVerification: boolean;
    requiresUserReview: boolean;
    eligibleFutureTargets: number;
    blockedNowTargets: number;
    blockers: SemanticNextActionPreviewBlockerV0[];
  };
  counts: {
    sourceReviewActionCandidates: number;
    nextActionPreviewCandidates: number;
    suggestedNextActionCandidates: number;
    requiresUserInputCandidates: number;
    requiresUserConfirmationCandidates: number;
    futureGateCandidates: number;
    informationalCandidates: number;
    blockedNowCandidates: number;
  };
  warnings: string[];
  safetyNotes: string[];
  writes: SemanticNextActionPreviewWritesV0;
};

export type BuildSemanticNextActionPreviewContractV0Params = {
  sourcePreview: unknown;
  requestedActionKey?: string | null;
  requestedTargetKey?: string | null;
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readValue(record: UnknownRecord | null, key: string): unknown {
  return record ? record[key] : undefined;
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

function readRecordArray(record: UnknownRecord | null, key: string): UnknownRecord[] {
  const value = readValue(record, key);

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord);
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => readString(item))
    .filter((item): item is string => item !== null);
}

export function buildSemanticNextActionPreviewWritesV0(): SemanticNextActionPreviewWritesV0 {
  return {
    sqlExecuted: false,
    dbReadExecuted: false,
    dbWriteExecuted: false,
    supabaseReadExecuted: false,
    supabaseWriteExecuted: false,
    activityEventInserted: false,
    valueObjectCreated: false,
    activityValueObjectLinkCreated: false,
    reviewActionPersisted: false,
    stateFactCreated: false,
    stateDeltaCreated: false,
    stateSnapshotCreated: false,
  };
}

function normalizeRiskLevel(value: unknown): SemanticNextActionPreviewRiskLevelV0 {
  const riskLevel = readString(value);

  if (
    riskLevel === "read_only" ||
    riskLevel === "requires_user_confirmation" ||
    riskLevel === "requires_persistence_gate"
  ) {
    return riskLevel;
  }

  return "unknown";
}

function stripReviewPrefix(value: string): string {
  return value.startsWith("review:") ? value.slice("review:".length) : value;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.length > 0)));
}

function rankActionKind(actionKind: string, riskLevel: SemanticNextActionPreviewRiskLevelV0): number {
  if (actionKind === "open_raw_json") {
    return 900;
  }

  if (actionKind.startsWith("confirm_")) {
    return riskLevel === "requires_user_confirmation" ? 100 : 150;
  }

  if (actionKind.startsWith("correct_")) {
    return 180;
  }

  if (actionKind.startsWith("request_")) {
    return 200;
  }

  if (actionKind.startsWith("allow_future_")) {
    return 260;
  }

  if (actionKind.startsWith("reject_")) {
    return 500;
  }

  if (actionKind.startsWith("suppress_")) {
    return 520;
  }

  if (actionKind.startsWith("block_future_")) {
    return 560;
  }

  return 700;
}

function buildActionPreviewKey(actionKey: string, index: number): string {
  return `next-action-preview:${index}:${actionKey}`;
}

function buildUserFacingTitle(params: {
  actionKind: string;
  targetTitle: string | null;
  targetType: string;
  label: string;
}): string {
  const targetTitle =
    params.targetTitle ?? params.label ?? params.targetType ?? "candidate";

  switch (params.actionKind) {
    case "confirm_category":
      return `Confirm category: ${targetTitle}`;
    case "reject_category":
      return `Reject category: ${targetTitle}`;
    case "correct_category":
      return `Correct category: ${targetTitle}`;
    case "confirm_value_object_candidate":
      return `Confirm Value Object candidate: ${targetTitle}`;
    case "reject_value_object_candidate":
      return `Reject Value Object candidate: ${targetTitle}`;
    case "request_value_object_context":
      return `Ask context for Value Object: ${targetTitle}`;
    case "confirm_exposure_candidate":
      return `Confirm exposure: ${targetTitle}`;
    case "suppress_exposure_candidate":
      return `Suppress exposure: ${targetTitle}`;
    case "allow_future_state_delta_candidate":
      return `Allow future state delta candidate: ${targetTitle}`;
    case "block_future_state_delta_candidate":
      return `Block future state delta candidate: ${targetTitle}`;
    case "open_raw_json":
      return "Open raw semantic preview JSON";
    default:
      return params.label || `Review ${params.targetType}: ${targetTitle}`;
  }
}

function buildUserFacingDescription(params: {
  status: SemanticNextActionPreviewStatusV0;
  requiresPersistenceGate: boolean;
  requiresUserInput: boolean;
  sourceWouldWriteNow: boolean;
}): string {
  if (params.sourceWouldWriteNow) {
    return "This source review action is marked as write-capable, so the next-action preview blocks execution in this read-only contract.";
  }

  if (params.requiresUserInput) {
    return "This candidate should ask the user for missing context before any future persistence route is called.";
  }

  if (params.status === "requires_user_confirmation") {
    return "This candidate can be shown as a user-confirmation option, but pressing it later must use a separate persistence-gated route.";
  }

  if (params.requiresPersistenceGate) {
    return "This candidate is eligible only after an explicit persistence gate, authenticated actor context, and RLS runtime verification.";
  }

  if (params.status === "informational") {
    return "This candidate is informational and can be shown safely in read-only mode.";
  }

  return "This candidate is preview-only and cannot write to the database.";
}

function matchGateTargets(params: {
  actionKey: string;
  targetKey: string;
  futureTargets: UnknownRecord[];
  blockedTargets: UnknownRecord[];
}): SemanticNextActionPreviewGateMatchV0 {
  const possibleKeys = uniqueStrings([
    params.actionKey,
    params.targetKey,
    stripReviewPrefix(params.actionKey),
    stripReviewPrefix(params.targetKey),
  ]);

  const futureMatches = params.futureTargets.filter((target) => {
    const targetKey = readString(readValue(target, "targetKey"));

    return targetKey !== null && possibleKeys.includes(targetKey);
  });

  const blockedMatches = params.blockedTargets.filter((target) => {
    const targetKey = readString(readValue(target, "targetKey"));

    return targetKey !== null && possibleKeys.includes(targetKey);
  });

  const matchedFutureStatuses = futureMatches
    .map((target) => readString(readValue(target, "status")))
    .filter((status): status is string => status !== null);

  const matchedBlockedStatuses = blockedMatches
    .map((target) => readString(readValue(target, "status")))
    .filter((status): status is string => status !== null);

  const matchedReasons = [...futureMatches, ...blockedMatches]
    .map((target) => readString(readValue(target, "reason")))
    .filter((reason): reason is string => reason !== null);

  return {
    futureGateMatches: futureMatches.length,
    blockedGateMatches: blockedMatches.length,
    matchedFutureStatuses: uniqueStrings(matchedFutureStatuses),
    matchedBlockedStatuses: uniqueStrings(matchedBlockedStatuses),
    matchedReasons: uniqueStrings(matchedReasons),
  };
}

function classifyStatus(params: {
  enabledInReadOnly: boolean;
  sourceWouldWriteNow: boolean;
  requiresUserInput: boolean;
  requiresUserConfirmation: boolean;
  requiresPersistenceGate: boolean;
  gateMatch: SemanticNextActionPreviewGateMatchV0;
  actionKind: string;
}): SemanticNextActionPreviewStatusV0 {
  if (!params.enabledInReadOnly || params.sourceWouldWriteNow) {
    return "blocked_now";
  }

  if (params.requiresUserInput) {
    return "requires_user_input";
  }

  if (params.requiresUserConfirmation) {
    return "requires_user_confirmation";
  }

  if (
    params.requiresPersistenceGate ||
    params.gateMatch.futureGateMatches > 0 ||
    params.actionKind.startsWith("allow_future_")
  ) {
    return "eligible_after_explicit_gate";
  }

  if (params.actionKind === "open_raw_json") {
    return "informational";
  }

  return "preview_only";
}

function buildCandidate(params: {
  action: UnknownRecord;
  index: number;
  futureTargets: UnknownRecord[];
  blockedTargets: UnknownRecord[];
}): SemanticNextActionPreviewCandidateV0 {
  const actionKind = readString(readValue(params.action, "actionKind")) ?? "unknown_action";
  const actionKey =
    readString(readValue(params.action, "actionKey")) ??
    `unknown-review-action-${params.index}`;
  const targetType = readString(readValue(params.action, "targetType")) ?? "unknown";
  const targetKey = readString(readValue(params.action, "targetKey")) ?? actionKey;
  const targetTitle = readString(readValue(params.action, "targetTitle"));
  const label =
    readString(readValue(params.action, "label")) ??
    targetTitle ??
    targetKey ??
    actionKey;

  const riskLevel = normalizeRiskLevel(readValue(params.action, "riskLevel"));
  const enabledInReadOnly = readBoolean(
    readValue(params.action, "enabledInReadOnly"),
    false
  );
  const sourceWouldWriteNow = readBoolean(
    readValue(params.action, "wouldWriteNow"),
    false
  );
  const requiresPersistenceGate = readBoolean(
    readValue(params.action, "requiresPersistenceGate"),
    true
  );
  const requiresUserInput = readBoolean(
    readValue(params.action, "requiresUserInput"),
    false
  );
  const requiresUserConfirmation =
    riskLevel === "requires_user_confirmation" ||
    actionKind.startsWith("confirm_");

  const confidence = readNumber(readValue(params.action, "confidence"));
  const safetyNotes = readStringArray(readValue(params.action, "safetyNotes"));

  const gateMatch = matchGateTargets({
    actionKey,
    targetKey,
    futureTargets: params.futureTargets,
    blockedTargets: params.blockedTargets,
  });

  const status = classifyStatus({
    enabledInReadOnly,
    sourceWouldWriteNow,
    requiresUserInput,
    requiresUserConfirmation,
    requiresPersistenceGate,
    gateMatch,
    actionKind,
  });

  const userFacingTitle = buildUserFacingTitle({
    actionKind,
    targetTitle,
    targetType,
    label,
  });

  return {
    actionPreviewKey: buildActionPreviewKey(actionKey, params.index),
    sourceReviewActionKey: actionKey,
    sourceActionKind: actionKind,
    targetType,
    targetKey,
    targetTitle,
    label,
    userFacingTitle,
    userFacingDescription: buildUserFacingDescription({
      status,
      requiresPersistenceGate,
      requiresUserInput,
      sourceWouldWriteNow,
    }),
    status,
    riskLevel,
    priority: rankActionKind(actionKind, riskLevel) + params.index / 1000,
    enabledInReadOnly,
    sourceWouldWriteNow,
    wouldWriteNow: false,
    requiresPersistenceGate,
    requiresUserInput,
    requiresUserConfirmation,
    confidence,
    gateMatch,
    safetyNotes: [
      ...safetyNotes,
      "Next Action Preview is read-only.",
      "Pressing a real action later must call a separate persistence-gated route.",
    ],
  };
}

function buildBlockers(gate: UnknownRecord | null): SemanticNextActionPreviewBlockerV0[] {
  return readRecordArray(gate, "blockers").map((blocker) => ({
    code: readString(readValue(blocker, "code")) ?? "unknown_blocker",
    message: readString(readValue(blocker, "message")) ?? "",
    severity: readString(readValue(blocker, "severity")) ?? "blocking",
  }));
}

function buildWarnings(params: {
  sourceOk: boolean;
  candidates: SemanticNextActionPreviewCandidateV0[];
  gatePresent: boolean;
}): string[] {
  const warnings: string[] = [];

  if (!params.sourceOk) {
    warnings.push("source_preview_ok_is_not_true");
  }

  if (params.candidates.length === 0) {
    warnings.push("no_review_action_candidates_available");
  }

  if (!params.gatePresent) {
    warnings.push("persistence_gate_missing_from_source_preview");
  }

  if (params.candidates.some((candidate) => candidate.sourceWouldWriteNow)) {
    warnings.push("source_review_action_declared_would_write_now");
  }

  return warnings;
}

export function buildSemanticNextActionPreviewContractV0(
  params: BuildSemanticNextActionPreviewContractV0Params
): SemanticNextActionPreviewResultV0 {
  const source = readRecord(params.sourcePreview) ?? {};
  const gate = readRecord(readValue(source, "persistenceGate"));
  const futureTargets = readRecordArray(gate, "eligibleFutureTargets");
  const blockedTargets = readRecordArray(gate, "blockedNowTargets");
  const reviewActions = readRecordArray(source, "reviewActionCandidates");

  const candidates = reviewActions
    .map((action, index) =>
      buildCandidate({
        action,
        index,
        futureTargets,
        blockedTargets,
      })
    )
    .sort((left, right) => left.priority - right.priority);

  const requestedActionKey = params.requestedActionKey ?? null;
  const requestedTargetKey = params.requestedTargetKey ?? null;

  const filteredCandidates = candidates.filter((candidate) => {
    if (requestedActionKey && candidate.sourceReviewActionKey !== requestedActionKey) {
      return false;
    }

    if (requestedTargetKey && candidate.targetKey !== requestedTargetKey) {
      return false;
    }

    return true;
  });

  const suggestedNextActionCandidates = filteredCandidates.filter(
    (candidate) =>
      candidate.status !== "blocked_now" &&
      candidate.status !== "informational"
  );

  const requiresUserInputCandidates = filteredCandidates.filter(
    (candidate) => candidate.status === "requires_user_input"
  );

  const requiresUserConfirmationCandidates = filteredCandidates.filter(
    (candidate) => candidate.status === "requires_user_confirmation"
  );

  const futureGateCandidates = filteredCandidates.filter(
    (candidate) => candidate.status === "eligible_after_explicit_gate"
  );

  const informationalCandidates = filteredCandidates.filter(
    (candidate) => candidate.status === "informational"
  );

  const blockedNowCandidates = filteredCandidates.filter(
    (candidate) => candidate.status === "blocked_now"
  );

  const sourceOk = readBoolean(readValue(source, "ok"), false);
  const gatePresent = gate !== null;

  return {
    ok: sourceOk,
    policy: SEMANTIC_NEXT_ACTION_PREVIEW_POLICY_V0,
    mode: SEMANTIC_NEXT_ACTION_PREVIEW_MODE_V0,
    sourcePreviewPolicy: readString(readValue(source, "policy")),
    sourcePreviewMode: readString(readValue(source, "mode")),
    sourceActivityEventId: readString(readValue(source, "activityEventId")),
    sourceReviewActionPolicy: readString(readValue(source, "reviewActionPolicy")),
    sourcePersistenceGatePolicy: readString(
      readValue(source, "persistenceGatePolicy")
    ),
    candidates: filteredCandidates,
    suggestedNextActionCandidates,
    requiresUserInputCandidates,
    requiresUserConfirmationCandidates,
    futureGateCandidates,
    informationalCandidates,
    blockedNowCandidates,
    persistenceGateSummary: {
      present: gatePresent,
      policy: readString(readValue(gate, "policy")),
      mode: readString(readValue(gate, "mode")),
      canPersistNow: readBoolean(readValue(gate, "canPersistNow"), false),
      requiresExplicitGate: readBoolean(
        readValue(gate, "requiresExplicitGate"),
        true
      ),
      requiresAuthenticatedActor: readBoolean(
        readValue(gate, "requiresAuthenticatedActor"),
        true
      ),
      requiresRlsRuntimeVerification: readBoolean(
        readValue(gate, "requiresRlsRuntimeVerification"),
        true
      ),
      requiresUserReview: readBoolean(readValue(gate, "requiresUserReview"), true),
      eligibleFutureTargets: futureTargets.length,
      blockedNowTargets: blockedTargets.length,
      blockers: buildBlockers(gate),
    },
    counts: {
      sourceReviewActionCandidates: reviewActions.length,
      nextActionPreviewCandidates: filteredCandidates.length,
      suggestedNextActionCandidates: suggestedNextActionCandidates.length,
      requiresUserInputCandidates: requiresUserInputCandidates.length,
      requiresUserConfirmationCandidates: requiresUserConfirmationCandidates.length,
      futureGateCandidates: futureGateCandidates.length,
      informationalCandidates: informationalCandidates.length,
      blockedNowCandidates: blockedNowCandidates.length,
    },
    warnings: buildWarnings({
      sourceOk,
      candidates: filteredCandidates,
      gatePresent,
    }),
    safetyNotes: [
      "Next Action Preview is a read-only planning layer.",
      "It converts reviewActionCandidates into user-facing candidate actions.",
      "It performs no SQL, no Supabase read/write and no state write.",
      "Any real button press must call a separate authenticated persistence-gated route.",
      "State delta candidates must not become state facts or snapshots from this layer.",
    ],
    writes: buildSemanticNextActionPreviewWritesV0(),
  };
}
