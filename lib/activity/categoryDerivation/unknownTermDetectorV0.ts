import {
  buildLocalControlledCategoryLookupV0,
  type LocalControlledCategoryLookupRawInputV0,
  type LocalControlledCategoryLookupResultV0,
} from "./localControlledCategoryLookupV0";

export const UNKNOWN_TERM_DETECTOR_POLICY_V0 =
  "unknown_term_detector_v0" as const;

export const UNKNOWN_TERM_DETECTOR_MODE_V0 =
  "read_only_unknown_term_detection_no_db_write" as const;

export type UnknownTermDetectorPolicyV0 =
  typeof UNKNOWN_TERM_DETECTOR_POLICY_V0;

export type UnknownTermDetectorModeV0 =
  typeof UNKNOWN_TERM_DETECTOR_MODE_V0;

export type UnknownTermDetectorLanguageV0 =
  | "ru"
  | "pl"
  | "en"
  | "de"
  | "es"
  | "uk"
  | "unknown";

export type UnknownTermCandidateKindV0 =
  | "single_token"
  | "short_phrase";

export type UnknownTermCandidateStatusV0 =
  | "candidate_unresolved"
  | "ignored_stopword"
  | "covered_by_local_category";

export type UnknownTermDetectorRawInputV0 =
  LocalControlledCategoryLookupRawInputV0 & {
    maxUnknownCandidates?: unknown;
  };

export type UnknownTermCandidateV0 = {
  candidateKey: string;
  termText: string;
  normalizedText: string;
  language: UnknownTermDetectorLanguageV0;
  kind: UnknownTermCandidateKindV0;
  status: "candidate_unresolved";
  source: "local_lookup_unmatched_token_preview_v0";
  reason: string;
  evidence: {
    inputText: string;
    normalizedInputText: string;
    token: string;
  };
  requiresUserReview: true;
  requiresResolverDecision: true;
  localControlledCategoryMatched: false;
  externalConceptCandidateAllowedLater: true;
  externalOntologyCalledNow: false;
  canEnterStableBundleNow: false;
  canCreateStateFact: false;
};

export type UnknownTermDetectorWritesV0 = {
  sqlExecuted: false;
  dbReadExecuted: false;
  dbWriteExecuted: false;
  supabaseReadExecuted: false;
  supabaseWriteExecuted: false;
  unknownTermCandidateInserted: false;
  externalConceptCandidateInserted: false;
  resolverCandidateInserted: false;
  stableBundleCreated: false;
  categoryInserted: false;
  categoryAliasInserted: false;
  activityEventInserted: false;
  valueObjectCreated: false;
  activityValueObjectLinkCreated: false;
  stateFactCreated: false;
  stateDeltaCreated: false;
  stateSnapshotCreated: false;
};

export type UnknownTermDetectorResultV0 = {
  ok: boolean;
  policy: UnknownTermDetectorPolicyV0;
  mode: UnknownTermDetectorModeV0;
  inputText: string | null;
  normalizedText: string | null;
  inputLanguage: UnknownTermDetectorLanguageV0;
  localLookup: LocalControlledCategoryLookupResultV0;
  unknownTermCandidates: UnknownTermCandidateV0[];
  ignoredTokens: string[];
  coveredTokens: string[];
  errors: string[];
  warnings: string[];
  safetyNotes: string[];
  writes: UnknownTermDetectorWritesV0;
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

function normalizeTextForUnknownTerm(value: string): string {
  return value
    .replace(/[łŁ]/g, "l")
    .replace(/[ёЁ]/g, "е")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toCandidateKey(term: string): string {
  const normalized = normalizeTextForUnknownTerm(term)
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "unknown-term";
}

function isProbablyNoiseToken(token: string): boolean {
  const normalized = normalizeTextForUnknownTerm(token);

  if (!normalized) {
    return true;
  }

  if (/^\d+$/.test(normalized)) {
    return true;
  }

  if (normalized.length < 3) {
    return true;
  }

  const stopwords = new Set([
    "for",
    "with",
    "the",
    "and",
    "but",
    "from",
    "into",
    "onto",
    "over",
    "under",
    "about",
    "after",
    "before",
    "minute",
    "minutes",
    "минут",
    "минуты",
    "минуту",
    "через",
    "после",
    "przez",
    "minut",
    "minuty",
    "oraz",
    "und",
    "oder",
    "minuten",
    "para",
    "con",
    "los",
    "las",
    "unos",
    "unas",
    "minutos",
  ]);

  return stopwords.has(normalized);
}

function collectCoveredTokens(
  localLookup: LocalControlledCategoryLookupResultV0
): string[] {
  const covered = new Set<string>();

  for (const match of localLookup.matches) {
    for (const evidence of match.evidence) {
      for (const token of evidence.matchedTokens) {
        covered.add(token);
      }
    }
  }

  return Array.from(covered).sort((left, right) => left.localeCompare(right));
}

function buildCandidate(params: {
  token: string;
  inputText: string;
  normalizedText: string;
  language: UnknownTermDetectorLanguageV0;
}): UnknownTermCandidateV0 {
  const normalizedToken = normalizeTextForUnknownTerm(params.token);

  return {
    candidateKey: toCandidateKey(normalizedToken),
    termText: params.token,
    normalizedText: normalizedToken,
    language: params.language,
    kind: normalizedToken.includes(" ") ? "short_phrase" : "single_token",
    status: "candidate_unresolved",
    source: "local_lookup_unmatched_token_preview_v0",
    reason:
      "Token was not matched by the local controlled category lookup and is not a known stopword/noise token.",
    evidence: {
      inputText: params.inputText,
      normalizedInputText: params.normalizedText,
      token: params.token,
    },
    requiresUserReview: true,
    requiresResolverDecision: true,
    localControlledCategoryMatched: false,
    externalConceptCandidateAllowedLater: true,
    externalOntologyCalledNow: false,
    canEnterStableBundleNow: false,
    canCreateStateFact: false,
  };
}

export function buildUnknownTermDetectorWritesV0(): UnknownTermDetectorWritesV0 {
  return {
    sqlExecuted: false,
    dbReadExecuted: false,
    dbWriteExecuted: false,
    supabaseReadExecuted: false,
    supabaseWriteExecuted: false,
    unknownTermCandidateInserted: false,
    externalConceptCandidateInserted: false,
    resolverCandidateInserted: false,
    stableBundleCreated: false,
    categoryInserted: false,
    categoryAliasInserted: false,
    activityEventInserted: false,
    valueObjectCreated: false,
    activityValueObjectLinkCreated: false,
    stateFactCreated: false,
    stateDeltaCreated: false,
    stateSnapshotCreated: false,
  };
}

export function buildUnknownTermDetectorV0(
  rawInput: UnknownTermDetectorRawInputV0
): UnknownTermDetectorResultV0 {
  const writes = buildUnknownTermDetectorWritesV0();
  const localLookup = buildLocalControlledCategoryLookupV0(rawInput);

  if (!localLookup.ok || !localLookup.inputText || !localLookup.normalizedText) {
    return {
      ok: false,
      policy: UNKNOWN_TERM_DETECTOR_POLICY_V0,
      mode: UNKNOWN_TERM_DETECTOR_MODE_V0,
      inputText: localLookup.inputText,
      normalizedText: localLookup.normalizedText,
      inputLanguage: localLookup.inputLanguage as UnknownTermDetectorLanguageV0,
      localLookup,
      unknownTermCandidates: [],
      ignoredTokens: [],
      coveredTokens: [],
      errors:
        localLookup.errors.length > 0
          ? localLookup.errors
          : ["Unknown term detector requires valid Activity text input."],
      warnings: [],
      safetyNotes: [
        "Invalid input cannot produce unknown term candidates.",
        "No SQL, DB write, Supabase write, external ontology call or state write is performed.",
      ],
      writes,
    };
  }

  const maxUnknownCandidates = readNumber(rawInput.maxUnknownCandidates);
  const coveredTokens = collectCoveredTokens(localLookup);
  const candidateTokens = Array.from(
    new Set(
      localLookup.unmatchedTokensPreview
        .map((token) => normalizeTextForUnknownTerm(token))
        .filter(Boolean)
    )
  );

  const ignoredTokens: string[] = [];
  const unknownTermCandidates: UnknownTermCandidateV0[] = [];

  for (const token of candidateTokens) {
    if (coveredTokens.includes(token)) {
      continue;
    }

    if (isProbablyNoiseToken(token)) {
      ignoredTokens.push(token);
      continue;
    }

    unknownTermCandidates.push(
      buildCandidate({
        token,
        inputText: localLookup.inputText,
        normalizedText: localLookup.normalizedText,
        language: localLookup.inputLanguage as UnknownTermDetectorLanguageV0,
      })
    );
  }

  const limitedCandidates =
    maxUnknownCandidates !== null && maxUnknownCandidates > 0
      ? unknownTermCandidates.slice(0, maxUnknownCandidates)
      : unknownTermCandidates;

  return {
    ok: true,
    policy: UNKNOWN_TERM_DETECTOR_POLICY_V0,
    mode: UNKNOWN_TERM_DETECTOR_MODE_V0,
    inputText: localLookup.inputText,
    normalizedText: localLookup.normalizedText,
    inputLanguage: localLookup.inputLanguage as UnknownTermDetectorLanguageV0,
    localLookup,
    unknownTermCandidates: limitedCandidates,
    ignoredTokens,
    coveredTokens,
    errors: [],
    warnings:
      limitedCandidates.length === 0
        ? [
            "No unknown term candidates found after local controlled category lookup.",
          ]
        : [],
    safetyNotes: [
      "Unknown term detector is read-only.",
      "It runs after local controlled category lookup.",
      "It does not insert unknown term candidates.",
      "It does not call external ontology providers.",
      "It does not create resolver rows, stable semantic bundles, Value Objects or state facts.",
      "Unknown terms cannot enter a stable semantic bundle until resolver decision and persistence gate are implemented.",
    ],
    writes,
  };
}

export function buildUnknownTermDetectorReadinessV0() {
  return {
    ok: true,
    policy: UNKNOWN_TERM_DETECTOR_POLICY_V0,
    mode: "route_contract_readiness_no_unknown_term_detection_execution",
    routeMode: UNKNOWN_TERM_DETECTOR_MODE_V0,
    sourceContracts: {
      localControlledCategoryLookup:
        "local_controlled_category_lookup_v0",
    },
    searchOrderPosition: {
      after: [
        "raw Activity Event capture",
        "language detection / normalization",
        "metric separation",
        "local controlled category lookup",
      ],
      before: [
        "external concept candidate lookup",
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
    ],
    safetyNotes: [
      "This detector only proposes unresolved unknown term candidates.",
      "No unknown term candidate is persisted.",
      "No external concept lookup is executed here.",
      "No persistence gate is opened by this contract.",
    ],
    writes: buildUnknownTermDetectorWritesV0(),
  };
}
