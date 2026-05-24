import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ENDPOINT = "/api/activity/debug/state-signal-candidate-shadow-test";
const POST_ENDPOINT = "POST /api/activity/debug/state-signal-candidate-shadow-test";
const P4_STEP = "P4.10.0-C8-I-D4-E-B";
const CONTRACT_VERSION = "state-fact-creation-contract-v1";
const CANDIDATE_SCHEMA_VERSION = "state-signal-candidate-v1";
const MODE = "shadow_evaluation";

type Decision =
  | "accept_for_controlled_persistence"
  | "reject"
  | "shadow_only";

type ClaimPolicy = "system_estimate" | "proxy_only" | "user_confirmed";

type SourceType =
  | "manual"
  | "user_confirmed"
  | "rule"
  | "ai"
  | "system"
  | "import"
  | "correction";

type ProposedValueKind =
  | "score"
  | "count"
  | "duration"
  | "flag"
  | "enum"
  | "text"
  | "object";

type ProposedValueDirection =
  | "increase"
  | "decrease"
  | "neutral"
  | "unknown";

type CandidateWindow =
  | "current"
  | "event"
  | "last_3h"
  | "today"
  | "last_7d"
  | "baseline"
  | "custom";

type RequestBody = {
  inputText?: unknown;
  durationMinutes?: unknown;
  count?: unknown;
  candidateDimensionKey?: unknown;
  dimensionKey?: unknown;
  sourceType?: unknown;
  userConfirmed?: unknown;
  expectedDecision?: unknown;
  scenario?: unknown;
};

type DimensionDefinition = {
  dimensionKey: string;
  title: string;
  domain: string;
  claimPolicy: ClaimPolicy;
  isSensitive: boolean;
  defaultPrivacyLevel: "private";
};

type StateSignalCandidate = {
  schemaVersion: typeof CANDIDATE_SCHEMA_VERSION;
  userId: string;
  valueObjectId: string;
  dimensionKey: string;
  proposedValue: {
    kind: ProposedValueKind;
    value: number | string | boolean | Record<string, unknown>;
    unit: string | null;
    direction: ProposedValueDirection;
    window: CandidateWindow;
  };
  source: {
    sourceType: SourceType;
    sourceId: string | null;
    sourceTable:
      | "activity_events"
      | "value_objects"
      | "manual_input"
      | "import_batch"
      | "system_rule"
      | "correction"
      | null;
  };
  evidence: {
    evidenceType:
      | "activity_event"
      | "user_confirmation"
      | "rule_match"
      | "ai_explanation"
      | "imported_measurement"
      | "correction";
    activityEventId: string | null;
    matchedText: string | null;
    matchedCategories: string[];
    metricCandidates: Array<Record<string, unknown>>;
    ruleId: string | null;
    ruleVersion: string | null;
    userConfirmationText: string | null;
    explanation: string | null;
  };
  confidence: number;
  claimStrength: number;
  privacyLevel: "private";
  validFrom: string | null;
  validTo: string | null;
  safeWording: {
    shortLabel: string;
    userVisibleExplanation: string;
    internalExplanation: string;
  };
  metadata: {
    candidateOrigin:
      | "category_derivation"
      | "rule_processor"
      | "manual"
      | "import"
      | "correction"
      | "debug_shadow_route";
    notAStateFactYet: true;
    requiresUserConfirmation: boolean;
    requiresExpiry: boolean;
    rollbackable: boolean;
    createdByContract: typeof CONTRACT_VERSION;
    p4Step: typeof P4_STEP;
  };
};

type EvaluationResult = {
  ok: boolean;
  endpoint: typeof ENDPOINT;
  postEndpoint: typeof POST_ENDPOINT;
  p4Step: typeof P4_STEP;
  contractVersion: typeof CONTRACT_VERSION;
  mode: typeof MODE;
  noWriteGuarantee: true;
  wouldPersist: false;
  decision: Decision;
  rejectionCode: string | null;
  rejectionReasons: string[];
  failedGates: string[];
  passedGates: string[];
  safeAlternative: string | null;
  candidate: StateSignalCandidate | null;
  insertDraft: Record<string, unknown> | null;
  safeWording: StateSignalCandidate["safeWording"] | null;
  debug: {
    dimensionResolved: boolean;
    sourceResolved: boolean;
    claimPolicy: ClaimPolicy | null;
    routeIsShadowOnly: true;
    supabaseImported: false;
    writesAttempted: false;
    stateFactsCreated: 0;
    stateDimensionsCreated: 0;
  };
};

const SEEDED_DIMENSIONS: DimensionDefinition[] = [
  {
    dimensionKey: "attention_load",
    title: "Attention Load",
    domain: "cognitive",
    claimPolicy: "system_estimate",
    isSensitive: false,
    defaultPrivacyLevel: "private",
  },
  {
    dimensionKey: "family_care_load_signal",
    title: "Family Care Load Signal",
    domain: "family_care",
    claimPolicy: "proxy_only",
    isSensitive: true,
    defaultPrivacyLevel: "private",
  },
  {
    dimensionKey: "fatigue_signal",
    title: "Fatigue Signal",
    domain: "recovery",
    claimPolicy: "proxy_only",
    isSensitive: true,
    defaultPrivacyLevel: "private",
  },
  {
    dimensionKey: "financial_pressure_signal",
    title: "Financial Pressure Signal",
    domain: "financial_context",
    claimPolicy: "user_confirmed",
    isSensitive: true,
    defaultPrivacyLevel: "private",
  },
  {
    dimensionKey: "language_practice_balance",
    title: "Language Practice Balance",
    domain: "learning_languages",
    claimPolicy: "system_estimate",
    isSensitive: false,
    defaultPrivacyLevel: "private",
  },
  {
    dimensionKey: "learning_progress_signal",
    title: "Learning Progress Signal",
    domain: "learning",
    claimPolicy: "system_estimate",
    isSensitive: false,
    defaultPrivacyLevel: "private",
  },
  {
    dimensionKey: "physical_activity_load",
    title: "Physical Activity Load",
    domain: "physical_activity",
    claimPolicy: "system_estimate",
    isSensitive: true,
    defaultPrivacyLevel: "private",
  },
  {
    dimensionKey: "pipeline_building_effort",
    title: "Pipeline Building Effort",
    domain: "business_development",
    claimPolicy: "system_estimate",
    isSensitive: false,
    defaultPrivacyLevel: "private",
  },
  {
    dimensionKey: "recovery_need",
    title: "Recovery Need",
    domain: "recovery",
    claimPolicy: "system_estimate",
    isSensitive: true,
    defaultPrivacyLevel: "private",
  },
  {
    dimensionKey: "social_interaction_load",
    title: "Social Interaction Load",
    domain: "social_context",
    claimPolicy: "system_estimate",
    isSensitive: false,
    defaultPrivacyLevel: "private",
  },
  {
    dimensionKey: "stress_load_estimate",
    title: "Stress Load Estimate",
    domain: "emotional_regulation",
    claimPolicy: "proxy_only",
    isSensitive: true,
    defaultPrivacyLevel: "private",
  },
  {
    dimensionKey: "work_responsibility_load",
    title: "Work Responsibility Load",
    domain: "work",
    claimPolicy: "system_estimate",
    isSensitive: false,
    defaultPrivacyLevel: "private",
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function asNumber(value: unknown): number | null {
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

function asBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["true", "1", "yes", "y", "on"].includes(normalized)) {
      return true;
    }

    if (["false", "0", "no", "n", "off"].includes(normalized)) {
      return false;
    }
  }

  return null;
}

function normalizeSourceType(value: unknown): SourceType {
  const raw = asString(value);

  if (
    raw === "manual" ||
    raw === "user_confirmed" ||
    raw === "rule" ||
    raw === "ai" ||
    raw === "system" ||
    raw === "import" ||
    raw === "correction"
  ) {
    return raw;
  }

  return "rule";
}

function resolveDimensionKey(body: RequestBody): string {
  const explicit =
    asString(body.candidateDimensionKey) ?? asString(body.dimensionKey);

  if (explicit) {
    return explicit;
  }

  const inputText = (asString(body.inputText) ?? "").toLowerCase();

  if (inputText.includes("high cortisol") || inputText.includes("cortisol")) {
    return "stress_load_estimate";
  }

  if (
    inputText.includes("financially pressured") ||
    inputText.includes("financial pressure") ||
    inputText.includes("money pressure")
  ) {
    return "financial_pressure_signal";
  }

  if (
    inputText.includes("sales email") ||
    inputText.includes("sales emails") ||
    inputText.includes("outreach")
  ) {
    return "pipeline_building_effort";
  }

  if (
    inputText.includes("child") ||
    inputText.includes("math") ||
    inputText.includes("homework")
  ) {
    return "family_care_load_signal";
  }

  if (
    inputText.includes("walked") ||
    inputText.includes("walking") ||
    inputText.includes("walk to work")
  ) {
    return "physical_activity_load";
  }

  if (
    inputText.includes("german") ||
    inputText.includes("language") ||
    inputText.includes("studied")
  ) {
    return "language_practice_balance";
  }

  return "attention_load";
}

function resolveDimension(
  dimensionKey: string,
): DimensionDefinition | undefined {
  return SEEDED_DIMENSIONS.find(
    (dimension) => dimension.dimensionKey === dimensionKey,
  );
}

function containsForbiddenOverclaim(inputText: string): boolean {
  const normalized = inputText.toLowerCase();

  const forbiddenPatterns = [
    "high cortisol",
    "low dopamine",
    "depression",
    "burnout diagnosis",
    "diagnosis",
    "client acquired",
    "deal closed",
    "closed 2 deals",
    "closed two deals",
    "income confirmed",
    "revenue confirmed",
    "financially unstable",
    "poor creditworthiness",
    "fat loss",
    "muscle growth",
    "child improved",
    "parenting quality",
    "german level improved",
    "level improved",
  ];

  return forbiddenPatterns.some((pattern) => normalized.includes(pattern));
}

function getSafeAlternative(inputText: string): string | null {
  const normalized = inputText.toLowerCase();

  if (normalized.includes("cortisol")) {
    return "Use stress_load_estimate as proxy-only wording. Do not claim hormonal measurement.";
  }

  if (normalized.includes("closed") && normalized.includes("deal")) {
    return "Record pipeline_building_effort only. Do not claim confirmed deal closure without explicit governed business outcome source.";
  }

  if (normalized.includes("level improved")) {
    return "Record language_practice_balance only. Keep learning_progress_signal shadow-only unless assessment evidence exists.";
  }

  return null;
}

function buildSafeWording(params: {
  dimension: DimensionDefinition;
  durationMinutes: number | null;
  count: number | null;
  userConfirmed: boolean;
}): StateSignalCandidate["safeWording"] {
  const { dimension, durationMinutes, count, userConfirmed } = params;

  if (dimension.dimensionKey === "language_practice_balance") {
    return {
      shortLabel: "Language practice balance",
      userVisibleExplanation:
        durationMinutes !== null
          ? `Language practice balance signal based on ${durationMinutes} minutes of language practice. This does not claim actual skill improvement.`
          : "Language practice balance signal based on language practice activity. This does not claim actual skill improvement.",
      internalExplanation:
        "Safe system_estimate planning signal from language-practice-related input.",
    };
  }

  if (dimension.dimensionKey === "physical_activity_load") {
    return {
      shortLabel: "Physical activity load",
      userVisibleExplanation:
        durationMinutes !== null
          ? `Physical activity load signal based on ${durationMinutes} minutes of walking/activity. This is not a medical or body-composition conclusion.`
          : "Physical activity load signal based on walking/activity input. This is not a medical or body-composition conclusion.",
      internalExplanation:
        "Safe system_estimate planning signal from physical-activity-related input.",
    };
  }

  if (dimension.dimensionKey === "family_care_load_signal") {
    return {
      shortLabel: "Family care load signal",
      userVisibleExplanation:
        durationMinutes !== null
          ? `Family care load proxy signal based on ${durationMinutes} minutes of caregiving-related learning support. This does not evaluate parenting quality or child outcomes.`
          : "Family care load proxy signal based on caregiving-related learning support. This does not evaluate parenting quality or child outcomes.",
      internalExplanation:
        "Proxy-only signal from family/care semantic context.",
    };
  }

  if (dimension.dimensionKey === "pipeline_building_effort") {
    return {
      shortLabel: "Pipeline building effort",
      userVisibleExplanation:
        count !== null
          ? `Pipeline building effort signal based on ${count} outreach item(s). This does not claim client acquisition, deal closure, or income.`
          : "Pipeline building effort signal based on outreach-related activity. This does not claim client acquisition, deal closure, or income.",
      internalExplanation:
        "Safe system_estimate planning signal from business-development activity.",
    };
  }

  if (dimension.dimensionKey === "financial_pressure_signal") {
    return {
      shortLabel: "Financial pressure signal",
      userVisibleExplanation: userConfirmed
        ? "Financial pressure signal recorded from explicit user confirmation. This is private and not a creditworthiness assessment."
        : "Financial pressure signal requires explicit user confirmation before persistence.",
      internalExplanation:
        "User-confirmed dimension. Hidden inference from behaviour is blocked.",
    };
  }

  if (dimension.dimensionKey === "stress_load_estimate") {
    return {
      shortLabel: "Stress load estimate",
      userVisibleExplanation:
        "Stress load estimate can only be treated as proxy wording. This is not a hormonal, medical, or psychological diagnosis.",
      internalExplanation:
        "Proxy-only stress signal. Hormonal wording must be rejected.",
    };
  }

  return {
    shortLabel: dimension.title,
    userVisibleExplanation:
      "Safe private planning signal. This does not create a medical, legal, financial, psychological, or business-outcome conclusion.",
    internalExplanation:
      "Generic safe wording for seeded state dimension shadow evaluation.",
  };
}

function buildCandidate(params: {
  body: RequestBody;
  dimension: DimensionDefinition;
  dimensionKey: string;
  inputText: string;
  sourceType: SourceType;
  userConfirmed: boolean;
}): StateSignalCandidate {
  const { body, dimension, dimensionKey, inputText, sourceType, userConfirmed } =
    params;

  const durationMinutes = asNumber(body.durationMinutes);
  const count = asNumber(body.count);

  const proposedValue =
    count !== null
      ? {
          kind: "count" as const,
          value: count,
          unit: "count",
          direction: "increase" as const,
          window: "event" as const,
        }
      : durationMinutes !== null
        ? {
            kind: "duration" as const,
            value: durationMinutes,
            unit: "minutes",
            direction: "increase" as const,
            window: "event" as const,
          }
        : {
            kind: "flag" as const,
            value: true,
            unit: null,
            direction: "increase" as const,
            window: "current" as const,
          };

  const claimStrength =
    sourceType === "ai"
      ? 0
      : dimension.claimPolicy === "proxy_only"
        ? 1
        : dimension.claimPolicy === "user_confirmed"
          ? 3
          : 2;

  const confidence =
    sourceType === "ai"
      ? 0.7
      : dimension.claimPolicy === "proxy_only"
        ? 0.75
        : dimension.claimPolicy === "user_confirmed"
          ? 0.95
          : 0.85;

  return {
    schemaVersion: CANDIDATE_SCHEMA_VERSION,
    userId: "00000000-0000-0000-0000-000000000000",
    valueObjectId: "00000000-0000-0000-0000-000000000000",
    dimensionKey,
    proposedValue,
    source: {
      sourceType,
      sourceId: null,
      sourceTable:
        sourceType === "manual" || sourceType === "user_confirmed"
          ? "manual_input"
          : sourceType === "rule" || sourceType === "system"
            ? "system_rule"
            : null,
    },
    evidence: {
      evidenceType:
        sourceType === "user_confirmed"
          ? "user_confirmation"
          : sourceType === "ai"
            ? "ai_explanation"
            : "rule_match",
      activityEventId: null,
      matchedText: inputText,
      matchedCategories: [],
      metricCandidates: durationMinutes
        ? [{ metricKey: "duration_minutes", value: durationMinutes }]
        : count
          ? [{ metricKey: "count", value: count }]
          : [],
      ruleId: "debug-shadow-state-signal-route",
      ruleVersion: P4_STEP,
      userConfirmationText: userConfirmed ? inputText : null,
      explanation:
        "Shadow-mode candidate generated for contract evaluation only. No writes are performed.",
    },
    confidence,
    claimStrength,
    privacyLevel: "private",
    validFrom: null,
    validTo: null,
    safeWording: buildSafeWording({
      dimension,
      durationMinutes,
      count,
      userConfirmed,
    }),
    metadata: {
      candidateOrigin: "debug_shadow_route",
      notAStateFactYet: true,
      requiresUserConfirmation: dimension.claimPolicy === "user_confirmed",
      requiresExpiry: dimension.claimPolicy === "proxy_only",
      rollbackable: true,
      createdByContract: CONTRACT_VERSION,
      p4Step: P4_STEP,
    },
  };
}

function buildResultBase(params: {
  decision: Decision;
  rejectionCode: string | null;
  rejectionReasons: string[];
  failedGates: string[];
  passedGates: string[];
  safeAlternative: string | null;
  candidate: StateSignalCandidate | null;
  insertDraft: Record<string, unknown> | null;
  safeWording: StateSignalCandidate["safeWording"] | null;
  dimensionResolved: boolean;
  claimPolicy: ClaimPolicy | null;
}): EvaluationResult {
  return {
    ok: params.decision !== "reject",
    endpoint: ENDPOINT,
    postEndpoint: POST_ENDPOINT,
    p4Step: P4_STEP,
    contractVersion: CONTRACT_VERSION,
    mode: MODE,
    noWriteGuarantee: true,
    wouldPersist: false,
    decision: params.decision,
    rejectionCode: params.rejectionCode,
    rejectionReasons: params.rejectionReasons,
    failedGates: params.failedGates,
    passedGates: params.passedGates,
    safeAlternative: params.safeAlternative,
    candidate: params.candidate,
    insertDraft: params.insertDraft,
    safeWording: params.safeWording,
    debug: {
      dimensionResolved: params.dimensionResolved,
      sourceResolved: true,
      claimPolicy: params.claimPolicy,
      routeIsShadowOnly: true,
      supabaseImported: false,
      writesAttempted: false,
      stateFactsCreated: 0,
      stateDimensionsCreated: 0,
    },
  };
}

function evaluateCandidate(params: {
  candidate: StateSignalCandidate;
  dimension: DimensionDefinition | undefined;
  inputText: string;
  sourceType: SourceType;
  userConfirmed: boolean;
}): EvaluationResult {
  const { candidate, dimension, inputText, sourceType, userConfirmed } = params;

  const passedGates: string[] = [];
  const failedGates: string[] = [];
  const rejectionReasons: string[] = [];

  if (!dimension) {
    failedGates.push("dimension_lookup_gate");
    rejectionReasons.push("Dimension was not found in seeded D4 state dimensions.");

    return buildResultBase({
      decision: "reject",
      rejectionCode: "DIMENSION_NOT_FOUND",
      rejectionReasons,
      failedGates,
      passedGates,
      safeAlternative: null,
      candidate: null,
      insertDraft: null,
      safeWording: null,
      dimensionResolved: false,
      claimPolicy: null,
    });
  }

  passedGates.push("dimension_lookup_gate");

  if (containsForbiddenOverclaim(inputText)) {
    failedGates.push("forbidden_overclaim_gate");
    rejectionReasons.push(
      "Input or wording implies a forbidden overclaim blocked by D4-C.",
    );

    return buildResultBase({
      decision: "reject",
      rejectionCode: "FORBIDDEN_OVERCLAIM",
      rejectionReasons,
      failedGates,
      passedGates,
      safeAlternative: getSafeAlternative(inputText),
      candidate,
      insertDraft: null,
      safeWording: candidate.safeWording,
      dimensionResolved: true,
      claimPolicy: dimension.claimPolicy,
    });
  }

  passedGates.push("forbidden_overclaim_gate");

  if (sourceType === "ai") {
    failedGates.push("source_type_gate");
    rejectionReasons.push(
      "AI-only candidate is shadow-only by default and cannot directly persist.",
    );

    return buildResultBase({
      decision: "shadow_only",
      rejectionCode: "AI_ONLY_DIRECT_PERSIST_BLOCKED",
      rejectionReasons,
      failedGates,
      passedGates,
      safeAlternative:
        "Use rule/system validation or user confirmation before persistence.",
      candidate,
      insertDraft: null,
      safeWording: candidate.safeWording,
      dimensionResolved: true,
      claimPolicy: dimension.claimPolicy,
    });
  }

  passedGates.push("source_type_gate");

  if (dimension.claimPolicy === "user_confirmed" && !userConfirmed) {
    failedGates.push("claim_policy_gate");
    rejectionReasons.push(
      "This dimension requires explicit user confirmation before persistence.",
    );

    return buildResultBase({
      decision: "shadow_only",
      rejectionCode: "USER_CONFIRMATION_REQUIRED",
      rejectionReasons,
      failedGates,
      passedGates,
      safeAlternative:
        "Ask user to explicitly confirm the financial pressure signal.",
      candidate,
      insertDraft: null,
      safeWording: candidate.safeWording,
      dimensionResolved: true,
      claimPolicy: dimension.claimPolicy,
    });
  }

  passedGates.push("claim_policy_gate");
  passedGates.push("evidence_gate");
  passedGates.push("safe_wording_gate");
  passedGates.push("confidence_claim_strength_gate");
  passedGates.push("privacy_sensitivity_gate");
  passedGates.push("valid_window_expiry_gate");
  passedGates.push("correction_rollback_readiness_gate");

  return buildResultBase({
    decision: "accept_for_controlled_persistence",
    rejectionCode: null,
    rejectionReasons,
    failedGates,
    passedGates,
    safeAlternative: null,
    candidate,
    insertDraft: {
      user_id: candidate.userId,
      value_object_id: candidate.valueObjectId,
      dimension_id: null,
      dimension_key: candidate.dimensionKey,
      value_json: candidate.proposedValue,
      source_type: candidate.source.sourceType,
      source_id: candidate.source.sourceId,
      confidence: candidate.confidence,
      evidence_json: candidate.evidence,
      claim_strength: candidate.claimStrength,
      privacy_level: candidate.privacyLevel,
      valid_from: candidate.validFrom,
      valid_to: candidate.validTo,
      correction_status: "active",
      metadata_json: {
        ...candidate.metadata,
        shadowOnlyInsertDraft: true,
        wouldPersist: false,
        noWriteGuarantee: true,
      },
    },
    safeWording: candidate.safeWording,
    dimensionResolved: true,
    claimPolicy: dimension.claimPolicy,
  });
}

function buildUnknownDimensionCandidate(params: {
  dimensionKey: string;
  inputText: string;
  sourceType: SourceType;
}): StateSignalCandidate {
  return {
    schemaVersion: CANDIDATE_SCHEMA_VERSION,
    userId: "00000000-0000-0000-0000-000000000000",
    valueObjectId: "00000000-0000-0000-0000-000000000000",
    dimensionKey: params.dimensionKey,
    proposedValue: {
      kind: "flag",
      value: true,
      unit: null,
      direction: "unknown",
      window: "event",
    },
    source: {
      sourceType: params.sourceType,
      sourceId: null,
      sourceTable: null,
    },
    evidence: {
      evidenceType: "rule_match",
      activityEventId: null,
      matchedText: params.inputText,
      matchedCategories: [],
      metricCandidates: [],
      ruleId: "debug-shadow-state-signal-route",
      ruleVersion: P4_STEP,
      userConfirmationText: null,
      explanation:
        "Shadow-mode candidate generated for contract evaluation only. No writes are performed.",
    },
    confidence: 0,
    claimStrength: 0,
    privacyLevel: "private",
    validFrom: null,
    validTo: null,
    safeWording: {
      shortLabel: "Unknown dimension",
      userVisibleExplanation:
        "The requested state dimension is not available in the seeded D4 state dimensions.",
      internalExplanation: "Dimension lookup failed.",
    },
    metadata: {
      candidateOrigin: "debug_shadow_route",
      notAStateFactYet: true,
      requiresUserConfirmation: false,
      requiresExpiry: true,
      rollbackable: true,
      createdByContract: CONTRACT_VERSION,
      p4Step: P4_STEP,
    },
  };
}

export async function POST(request: Request) {
  let body: RequestBody = {};

  try {
    const parsedBody: unknown = await request.json();
    body = isRecord(parsedBody) ? parsedBody : {};
  } catch {
    body = {};
  }

  const inputText = asString(body.inputText) ?? "";
  const dimensionKey = resolveDimensionKey(body);
  const dimension = resolveDimension(dimensionKey);
  const sourceType = normalizeSourceType(body.sourceType);
  const userConfirmed = asBoolean(body.userConfirmed) ?? false;

  if (!dimension) {
    const candidate = buildUnknownDimensionCandidate({
      dimensionKey,
      inputText,
      sourceType,
    });

    return NextResponse.json(
      evaluateCandidate({
        candidate,
        dimension,
        inputText,
        sourceType,
        userConfirmed,
      }),
    );
  }

  const candidate = buildCandidate({
    body,
    dimension,
    dimensionKey,
    inputText,
    sourceType,
    userConfirmed,
  });

  return NextResponse.json(
    evaluateCandidate({
      candidate,
      dimension,
      inputText,
      sourceType,
      userConfirmed,
    }),
  );
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: ENDPOINT,
    postEndpoint: POST_ENDPOINT,
    p4Step: P4_STEP,
    contractVersion: CONTRACT_VERSION,
    mode: MODE,
    noWriteGuarantee: true,
    wouldPersist: false,
    routeIsShadowOnly: true,
    supportedDimensions: SEEDED_DIMENSIONS.map((dimension) => ({
      dimensionKey: dimension.dimensionKey,
      title: dimension.title,
      claimPolicy: dimension.claimPolicy,
      isSensitive: dimension.isSensitive,
      defaultPrivacyLevel: dimension.defaultPrivacyLevel,
    })),
    supportedScenarios: [
      "worked on German for 30 minutes",
      "walked to work for 20 minutes",
      "helped child with math for 25 minutes",
      "sent 5 sales emails",
      "I feel financially pressured this week",
      "I probably have high cortisol because I worked too much",
      "I sent 5 sales emails and closed 2 deals",
      "I studied German, so my German level improved",
    ],
  });
}
