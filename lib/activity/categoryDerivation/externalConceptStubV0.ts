import {
  buildUnknownTermDetectorV0,
  type UnknownTermCandidateV0,
  type UnknownTermDetectorRawInputV0,
  type UnknownTermDetectorResultV0,
} from "./unknownTermDetectorV0";

export const EXTERNAL_CONCEPT_STUB_POLICY_V0 =
  "external_concept_stub_v0" as const;

export const EXTERNAL_CONCEPT_STUB_MODE_V0 =
  "read_only_external_concept_candidate_stub_no_network_no_db_write" as const;

export type ExternalConceptStubPolicyV0 =
  typeof EXTERNAL_CONCEPT_STUB_POLICY_V0;

export type ExternalConceptStubModeV0 =
  typeof EXTERNAL_CONCEPT_STUB_MODE_V0;

export type ExternalConceptCandidateSourceV0 =
  | "stub_local_unknown_term_projection_v0";

export type ExternalConceptCandidateStatusV0 =
  | "candidate_preview_only_requires_future_external_lookup"
  | "not_created_known_local_only";

export type ExternalConceptCandidateV0 = {
  candidateKey: string;
  unknownTermCandidateKey: string;
  termText: string;
  normalizedText: string;
  language: string;
  source: ExternalConceptCandidateSourceV0;
  status: "candidate_preview_only_requires_future_external_lookup";
  externalSourceSystem: "stub_no_external_provider_called";
  externalId: null;
  externalUrl: null;
  label: string;
  description: string;
  confidence: number;
  requiresExternalLookupLater: true;
  requiresResolverDecision: true;
  canBecomeInternalCategoryNow: false;
  canEnterStableBundleNow: false;
  canCreateStateFact: false;
  evidence: {
    unknownTermStatus: UnknownTermCandidateV0["status"];
    unknownTermSource: UnknownTermCandidateV0["source"];
    reason: string;
  };
  safetyNotes: string[];
};

export type ExternalConceptStubRawInputV0 =
  UnknownTermDetectorRawInputV0 & {
    maxExternalConceptCandidates?: unknown;
  };

export type ExternalConceptStubWritesV0 = {
  sqlExecuted: false;
  dbReadExecuted: false;
  dbWriteExecuted: false;
  supabaseReadExecuted: false;
  supabaseWriteExecuted: false;
  externalNetworkCallExecuted: false;
  unknownTermCandidateInserted: false;
  externalConceptCandidateInserted: false;
  resolverCandidateInserted: false;
  categoryInserted: false;
  categoryAliasInserted: false;
  stableBundleCreated: false;
  activityEventInserted: false;
  valueObjectCreated: false;
  activityValueObjectLinkCreated: false;
  stateFactCreated: false;
  stateDeltaCreated: false;
  stateSnapshotCreated: false;
};

export type ExternalConceptStubResultV0 = {
  ok: boolean;
  policy: ExternalConceptStubPolicyV0;
  mode: ExternalConceptStubModeV0;
  inputText: string | null;
  normalizedText: string | null;
  inputLanguage: string;
  unknownTermDetector: UnknownTermDetectorResultV0;
  externalConceptCandidates: ExternalConceptCandidateV0[];
  errors: string[];
  warnings: string[];
  safetyNotes: string[];
  writes: ExternalConceptStubWritesV0;
};

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value.trim(), 10);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeCandidateKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "") || "external-concept";
}

function buildExternalConceptCandidate(
  unknownTerm: UnknownTermCandidateV0
): ExternalConceptCandidateV0 {
  const normalizedTerm = unknownTerm.normalizedText;
  const candidateKey = `external-stub-${normalizeCandidateKey(
    unknownTerm.language
  )}-${normalizeCandidateKey(normalizedTerm)}`;

  return {
    candidateKey,
    unknownTermCandidateKey: unknownTerm.candidateKey,
    termText: unknownTerm.termText,
    normalizedText: normalizedTerm,
    language: unknownTerm.language,
    source: "stub_local_unknown_term_projection_v0",
    status: "candidate_preview_only_requires_future_external_lookup",
    externalSourceSystem: "stub_no_external_provider_called",
    externalId: null,
    externalUrl: null,
    label: unknownTerm.termText,
    description:
      "Preview-only external concept candidate generated from an unresolved local unknown term. No external provider was called.",
    confidence: 0.25,
    requiresExternalLookupLater: true,
    requiresResolverDecision: true,
    canBecomeInternalCategoryNow: false,
    canEnterStableBundleNow: false,
    canCreateStateFact: false,
    evidence: {
      unknownTermStatus: unknownTerm.status,
      unknownTermSource: unknownTerm.source,
      reason:
        "Local controlled category lookup did not cover this term; unknown term detector marked it unresolved. External concept may be searched later, but not in this stub.",
    },
    safetyNotes: [
      "This is not an internal category.",
      "This is not an external ontology lookup result.",
      "This candidate is preview-only and cannot enter a stable semantic bundle now.",
      "Resolver decision is required before any mapping or category creation.",
      "No state fact, state delta or state snapshot can be created from this candidate.",
    ],
  };
}

export function buildExternalConceptStubWritesV0(): ExternalConceptStubWritesV0 {
  return {
    sqlExecuted: false,
    dbReadExecuted: false,
    dbWriteExecuted: false,
    supabaseReadExecuted: false,
    supabaseWriteExecuted: false,
    externalNetworkCallExecuted: false,
    unknownTermCandidateInserted: false,
    externalConceptCandidateInserted: false,
    resolverCandidateInserted: false,
    categoryInserted: false,
    categoryAliasInserted: false,
    stableBundleCreated: false,
    activityEventInserted: false,
    valueObjectCreated: false,
    activityValueObjectLinkCreated: false,
    stateFactCreated: false,
    stateDeltaCreated: false,
    stateSnapshotCreated: false,
  };
}

export function buildExternalConceptStubV0(
  rawInput: ExternalConceptStubRawInputV0
): ExternalConceptStubResultV0 {
  const writes = buildExternalConceptStubWritesV0();
  const unknownTermDetector = buildUnknownTermDetectorV0(rawInput);

  if (!unknownTermDetector.ok) {
    return {
      ok: false,
      policy: EXTERNAL_CONCEPT_STUB_POLICY_V0,
      mode: EXTERNAL_CONCEPT_STUB_MODE_V0,
      inputText: unknownTermDetector.inputText,
      normalizedText: unknownTermDetector.normalizedText,
      inputLanguage: unknownTermDetector.inputLanguage,
      unknownTermDetector,
      externalConceptCandidates: [],
      errors:
        unknownTermDetector.errors.length > 0
          ? unknownTermDetector.errors
          : ["External concept stub requires valid unknown term detector input."],
      warnings: [],
      safetyNotes: [
        "Invalid input cannot produce external concept candidates.",
        "No external ontology/network call is executed.",
        "No SQL, DB write, Supabase write or state write is performed.",
      ],
      writes,
    };
  }

  const maxExternalConceptCandidates = readNumber(
    rawInput.maxExternalConceptCandidates
  );

  const allCandidates = unknownTermDetector.unknownTermCandidates.map(
    buildExternalConceptCandidate
  );

  const externalConceptCandidates =
    maxExternalConceptCandidates !== null && maxExternalConceptCandidates > 0
      ? allCandidates.slice(0, maxExternalConceptCandidates)
      : allCandidates;

  return {
    ok: true,
    policy: EXTERNAL_CONCEPT_STUB_POLICY_V0,
    mode: EXTERNAL_CONCEPT_STUB_MODE_V0,
    inputText: unknownTermDetector.inputText,
    normalizedText: unknownTermDetector.normalizedText,
    inputLanguage: unknownTermDetector.inputLanguage,
    unknownTermDetector,
    externalConceptCandidates,
    errors: [],
    warnings:
      externalConceptCandidates.length === 0
        ? [
            "No external concept stub candidates were generated because the unknown term detector found no unresolved unknown terms.",
          ]
        : [],
    safetyNotes: [
      "External concept stub is read-only.",
      "It runs after local controlled category lookup and unknown term detection.",
      "It does not call external ontology providers.",
      "It does not insert external concept candidates.",
      "It does not create internal categories, resolver rows, stable semantic bundles, Value Objects or state facts.",
      "External concept candidates cannot become internal categories without resolver decision and future persistence gate.",
    ],
    writes,
  };
}

export function buildExternalConceptStubReadinessV0() {
  return {
    ok: true,
    policy: EXTERNAL_CONCEPT_STUB_POLICY_V0,
    mode: "route_contract_readiness_no_external_concept_stub_execution",
    routeMode: EXTERNAL_CONCEPT_STUB_MODE_V0,
    sourceContracts: {
      localControlledCategoryLookup: "local_controlled_category_lookup_v0",
      unknownTermDetector: "unknown_term_detector_v0",
    },
    searchOrderPosition: {
      after: [
        "raw Activity Event capture",
        "language detection / normalization",
        "metric separation",
        "local controlled category lookup",
        "unknown term candidate detection",
      ],
      before: [
        "resolver decision",
        "stable semantic bundle",
        "Value Object policy",
        "state hook generation",
      ],
    },
    supportedInputFields: [
      "rawText",
      "inputText",
      "naturalInput",
      "activityText",
      "text",
      "inputLanguage",
      "detectedLanguage",
      "languageCode",
      "maxResults",
      "maxUnknownCandidates",
      "maxExternalConceptCandidates",
    ],
    safetyNotes: [
      "This contract creates only preview-only external concept candidates in memory.",
      "No external provider is called.",
      "No external concept candidate is persisted.",
      "No internal category is created.",
      "No persistence gate is opened by this contract.",
    ],
    writes: buildExternalConceptStubWritesV0(),
  };
}
