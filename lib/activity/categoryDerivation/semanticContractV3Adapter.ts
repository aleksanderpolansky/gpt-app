import {
  SEMANTIC_CONTRACT_V3_REQUIRED_INVARIANT_CODES,
DEFAULT_FORBIDDEN_OVERCLAIMS,
  SEMANTIC_CONTRACT_V3_ADAPTER_VERSION,
  SEMANTIC_CONTRACT_V3_SCHEMA_VERSION,
  clampConfidence,
  createStateHookCandidateV3,
  normalizeMappingStatus,
  normalizeResolutionStatus,
  type CategoryCandidateV3,
  type CategoryType,
  type CandidateSource,
  type DetectedLanguageCode,
  type LocalLookupCandidateV3,
  type MappingStatus,
  type MetricCandidateV3,
  type MissingInformationQuestionV3,
  type ResolutionStatus,
  type ResolvedCategoryCandidateV3,
  type SemanticDerivationV3Result,
  type SemanticEvidence,
  type SemanticLayer,
  type StateHookCandidateV3,
  type UnknownTermCandidateV3,
} from "./semanticContractV3";
export const SEMANTIC_CONTRACT_V3_ADAPTER_INVARIANT_CODES = [
  ...SEMANTIC_CONTRACT_V3_REQUIRED_INVARIANT_CODES,
] as const;


export type BuildSemanticDerivationV3FromCurrentOutputParams = {
  inputText?: string | null;
  detectedLanguage?: string | null;
  normalizedActivity?: string | null;
  durationMinutes?: number | null;
  extractionResult?: unknown;
  resolutionResult?: unknown;
  categoryDerivationResult?: unknown;
};

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRecord(value: unknown, key: string): RecordValue | null {
  if (!isRecord(value)) {
    return null;
  }

  const nested = value[key];

  return isRecord(nested) ? nested : null;
}

function readString(value: unknown, keys: string[]): string | null {
  if (!isRecord(value)) {
    return null;
  }

  for (const key of keys) {
    const property = value[key];

    if (typeof property === "string" && property.trim().length > 0) {
      return property.trim();
    }
  }

  return null;
}

function readNumber(value: unknown, keys: string[]): number | null {
  if (!isRecord(value)) {
    return null;
  }

  for (const key of keys) {
    const property = value[key];

    if (typeof property === "number" && Number.isFinite(property)) {
      return property;
    }

    if (typeof property === "string" && property.trim().length > 0) {
      const parsed = Number(property.trim().replace(",", "."));

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function readBoolean(value: unknown, keys: string[]): boolean | null {
  if (!isRecord(value)) {
    return null;
  }

  for (const key of keys) {
    const property = value[key];

    if (typeof property === "boolean") {
      return property;
    }

    if (typeof property === "string") {
      const normalized = property.trim().toLowerCase();

      if (["true", "1", "yes", "y", "on"].includes(normalized)) {
        return true;
      }

      if (["false", "0", "no", "n", "off"].includes(normalized)) {
        return false;
      }
    }
  }

  return null;
}

function readArray(value: unknown, key: string): unknown[] {
  if (!isRecord(value)) {
    return [];
  }

  const property = value[key];

  return Array.isArray(property) ? property : [];
}

function readStringArray(value: unknown, keys: string[]): string[] {
  if (!isRecord(value)) {
    return [];
  }

  for (const key of keys) {
    const property = value[key];

    if (Array.isArray(property)) {
      return property.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0
      );
    }
  }

  return [];
}

function readPrimitiveMetricValue(item: RecordValue): MetricCandidateV3["value"] {
  const rawValue =
    item.value ??
    item.metricValue ??
    item.metric_value ??
    item.amount ??
    null;

  if (
    rawValue === null ||
    typeof rawValue === "string" ||
    typeof rawValue === "number" ||
    typeof rawValue === "boolean"
  ) {
    return rawValue;
  }

  return null;
}

function normalizeLanguage(value: string | null | undefined): DetectedLanguageCode {
  const normalized = (value ?? "").trim().toLowerCase();

  if (
    normalized === "ru" ||
    normalized === "pl" ||
    normalized === "en" ||
    normalized === "de" ||
    normalized === "es" ||
    normalized === "uk"
  ) {
    return normalized;
  }

  return "unknown";
}

function normalizeSemanticLayer(value: string | null): SemanticLayer {
  const normalized = (value ?? "").trim().toLowerCase();

  switch (normalized) {
    case "action":
    case "object":
    case "object_or_instrument":
    case "context":
    case "domain":
    case "role":
    case "duty":
    case "care":
    case "purpose":
    case "metric":
    case "participant":
    case "location":
    case "time_context":
    case "state_hook_source":
      return normalized;
    default:
      return "unknown";
  }
}

function normalizeCategoryType(value: string | null): CategoryType {
  const normalized = (value ?? "").trim().toLowerCase();

  switch (normalized) {
    case "activity":
    case "object":
    case "instrument":
    case "context":
    case "domain":
    case "role":
    case "responsibility":
    case "care_function":
    case "purpose":
    case "metric":
    case "commercial":
    case "personal":
    case "derived":
      return normalized;
    default:
      return "unknown";
  }
}

function normalizeCandidateSource(value: string | null): CandidateSource {
  const normalized = (value ?? "").trim().toLowerCase();

  switch (normalized) {
    case "raw_input":
    case "rule":
    case "ai":
    case "parser":
    case "local_lookup":
    case "external_concept":
    case "resolver":
    case "user_feedback":
    case "system":
      return normalized;
    default:
      return "unknown";
  }
}

function slugify(value: string | null, fallback: string): string {
  const source = (value ?? "").trim().toLowerCase();

  if (!source) {
    return fallback;
  }

  const slug = source
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9а-яёіїєґąćęłńóśźżäöüßñ]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return slug.length > 0 ? slug : fallback;
}

function collectCandidatesFromExtraction(extractionResult: unknown): unknown[] {
  const direct = readArray(extractionResult, "candidates");

  if (direct.length > 0) {
    return direct;
  }

  const extraction = readRecord(extractionResult, "extraction");
  const fromExtraction = readArray(extraction, "candidates");

  if (fromExtraction.length > 0) {
    return fromExtraction;
  }

  const derivationResult = readRecord(extractionResult, "derivationResult");
  const fromDerivationResult = readArray(derivationResult, "candidates");

  if (fromDerivationResult.length > 0) {
    return fromDerivationResult;
  }

  return [];
}

function collectCandidatesFromResolution(resolutionResult: unknown): unknown[] {
  const direct = readArray(resolutionResult, "candidates");

  if (direct.length > 0) {
    return direct;
  }

  const resolution = readRecord(resolutionResult, "resolution");
  const fromResolution = readArray(resolution, "candidates");

  if (fromResolution.length > 0) {
    return fromResolution;
  }

  const resolvedCandidates = readArray(resolutionResult, "resolvedCandidates");

  if (resolvedCandidates.length > 0) {
    return resolvedCandidates;
  }

  return [];
}

function collectMetricCandidates(source: unknown): MetricCandidateV3[] {
  const rawMetrics = readArray(source, "metricCandidates");
  const result: MetricCandidateV3[] = [];

  rawMetrics.forEach((item) => {
    if (!isRecord(item)) {
      return;
    }

    const metricKey = readString(item, ["metricKey", "metric_key", "key"]);

    if (!metricKey) {
      return;
    }

    result.push({
      metricKey,
      value: readPrimitiveMetricValue(item),
      unit: readString(item, ["unit", "metricUnit", "metric_unit"]),
      confidence: clampConfidence(readNumber(item, ["confidence", "score"]), 0.5),
      evidence: buildEvidence(item, {
        source: "rule",
        fallbackSurfaceText: metricKey,
        sourceChain: ["current_output", "metric_candidate"],
      }),
    });
  });

  return result;
}

function buildEvidence(
  source: unknown,
  params: {
    source: CandidateSource;
    fallbackSurfaceText?: string | null;
    sourceChain: string[];
  }
): SemanticEvidence {
  const evidence = readRecord(source, "evidence");
  const evidenceMatchedWords = readStringArray(evidence, [
    "matchedWords",
    "matched_words",
  ]);
  const sourceMatchedWords = readStringArray(source, [
    "matchedWords",
    "matched_words",
  ]);

  const matchedWords =
    evidenceMatchedWords.length > 0 ? evidenceMatchedWords : sourceMatchedWords;

  const surfaceText =
    readString(evidence, ["surfaceText", "surface_text"]) ??
    readString(source, ["surfaceText", "surface_text", "candidateTitle", "title"]) ??
    params.fallbackSurfaceText ??
    null;

  return {
    source: params.source,
    surfaceText,
    matchedWords,
    sourceChain: params.sourceChain,
    raw: isRecord(source) ? source : null,
  };
}

function mapCategoryCandidate(item: unknown, index: number): CategoryCandidateV3 | null {
  if (!isRecord(item)) {
    return null;
  }

  const title = readString(item, [
    "candidateTitle",
    "candidate_title",
    "title",
    "label",
    "name",
  ]);

  const candidateSlug =
    readString(item, [
      "candidateSlug",
      "candidate_slug",
      "categorySlug",
      "category_slug",
      "slug",
    ]) ?? slugify(title, `candidate-${index + 1}`);

  const semanticLayer = normalizeSemanticLayer(
    readString(item, ["semanticLayer", "semantic_layer", "layer"])
  );

  const categoryType = normalizeCategoryType(
    readString(item, ["categoryType", "category_type", "type"])
  );

  const confidence = clampConfidence(
    readNumber(item, ["confidence", "score"]),
    0.5
  );

  const source = normalizeCandidateSource(
    readString(item, ["source", "sourceType", "source_type"])
  );

  return {
    candidateSlug,
    candidateTitle: title,
    semanticLayer,
    categoryType,
    confidence,
    isRequired: readBoolean(item, ["isRequired", "is_required"]) ?? undefined,
    isCoreMeaning:
      readBoolean(item, ["isCoreMeaning", "is_core_meaning"]) ?? undefined,
    needsUserReview:
      readBoolean(item, ["needsUserReview", "needs_user_review"]) ?? undefined,
    evidence: buildEvidence(item, {
      source: source === "unknown" ? "rule" : source,
      fallbackSurfaceText: title ?? candidateSlug,
      sourceChain: ["current_output", "category_candidate"],
    }),
    resolutionStatus: normalizeResolutionStatus(
      readString(item, ["resolutionStatus", "resolution_status"]),
      "unresolved"
    ),
    source: source === "unknown" ? "rule" : source,
  };
}

function inferMappingStatusFromResolution(
  resolutionStatus: ResolutionStatus,
  rawMappingStatus: string | null
): MappingStatus {
  const normalized = normalizeMappingStatus(rawMappingStatus, "none");

  if (normalized !== "none") {
    return normalized;
  }

  if (resolutionStatus === "resolved_existing") {
    return "local_exact";
  }

  if (resolutionStatus === "created_suggested") {
    return "local_alias";
  }

  if (resolutionStatus === "suggested_new" || resolutionStatus === "needs_review") {
    return "local_ambiguous";
  }

  if (resolutionStatus === "rejected") {
    return "rejected";
  }

  if (resolutionStatus === "merged") {
    return "merged";
  }

  return "none";
}

function mapResolvedCandidate(
  item: unknown,
  index: number
): ResolvedCategoryCandidateV3 | null {
  if (!isRecord(item)) {
    return null;
  }

  const title = readString(item, [
    "candidateTitle",
    "candidate_title",
    "title",
    "label",
    "name",
  ]);

  const candidateSlug =
    readString(item, [
      "candidateSlug",
      "candidate_slug",
      "categorySlug",
      "category_slug",
      "slug",
    ]) ?? slugify(title, `resolved-candidate-${index + 1}`);

  const canonicalSlug =
    readString(item, [
      "canonicalSlug",
      "canonical_slug",
      "resolvedSlug",
      "resolved_slug",
      "matchedSlug",
      "matched_slug",
    ]) ?? candidateSlug;

  const rawResolutionStatus = readString(item, [
    "resolutionStatus",
    "resolution_status",
  ]);

  const hasCategoryId = Boolean(
    readString(item, [
      "categoryId",
      "category_id",
      "resolvedCategoryId",
      "resolved_category_id",
    ])
  );

  const resolutionStatus = normalizeResolutionStatus(
    rawResolutionStatus,
    hasCategoryId ? "resolved_existing" : "unresolved"
  );

  const mappingStatus = inferMappingStatusFromResolution(
    resolutionStatus,
    readString(item, ["mappingStatus", "mapping_status"])
  );

  const confidence = clampConfidence(
    readNumber(item, ["confidence", "score"]),
    0.5
  );

  const needsUserReview =
    readBoolean(item, ["needsUserReview", "needs_user_review"]) ?? false;

  const explicitNeedsUserConfirmation = readBoolean(item, [
    "needsUserConfirmation",
    "needs_user_confirmation",
  ]);

  const inferredNeedsUserConfirmation =
    needsUserReview ||
    resolutionStatus === "unresolved" ||
    resolutionStatus === "needs_review" ||
    resolutionStatus === "suggested_new" ||
    confidence < 0.6 ||
    mappingStatus === "local_ambiguous" ||
    mappingStatus === "external_suggested";

  const needsUserConfirmation =
    explicitNeedsUserConfirmation ?? inferredNeedsUserConfirmation;

  return {
    candidateSlug,
    canonicalSlug,
    categoryId: readString(item, [
      "categoryId",
      "category_id",
      "resolvedCategoryId",
      "resolved_category_id",
    ]),
    semanticLayer: normalizeSemanticLayer(
      readString(item, ["semanticLayer", "semantic_layer", "layer"])
    ),
    categoryType: normalizeCategoryType(
      readString(item, ["categoryType", "category_type", "type"])
    ),
    resolutionStatus,
    mappingStatus,
    needsUserConfirmation,
    confidence,
    evidence: buildEvidence(item, {
      source: "resolver",
      fallbackSurfaceText: title ?? candidateSlug,
      sourceChain: ["current_output", "resolver"],
    }),
  };
}

function buildLocalLookupCandidates(
  resolvedCandidates: ResolvedCategoryCandidateV3[]
): LocalLookupCandidateV3[] {
  return resolvedCandidates
    .filter(
      (candidate) =>
        candidate.resolutionStatus === "resolved_existing" &&
        candidate.mappingStatus !== "rejected"
    )
    .map((candidate) => ({
      source: "resolver_cache",
      matchedCategoryId: candidate.categoryId ?? null,
      matchedSlug: candidate.canonicalSlug,
      matchedAlias:
        candidate.candidateSlug !== candidate.canonicalSlug
          ? candidate.candidateSlug
          : null,
      semanticLayer: candidate.semanticLayer,
      categoryType: candidate.categoryType,
      confidence: candidate.confidence,
      matchStatus:
        candidate.mappingStatus === "local_alias"
          ? "local_alias"
          : "local_exact",
      evidence: {
        source: "local_lookup",
        surfaceText: candidate.evidence.surfaceText ?? candidate.candidateSlug,
        sourceChain: ["resolver", "local_lookup_candidate"],
        raw: candidate.evidence.raw ?? null,
      },
    }));
}

function buildUnknownTermsFromCandidates(params: {
  candidates: CategoryCandidateV3[];
  resolvedCandidates: ResolvedCategoryCandidateV3[];
  detectedLanguage: DetectedLanguageCode;
}): UnknownTermCandidateV3[] {
  const resolvedSlugs = new Set(
    params.resolvedCandidates
      .filter(
        (candidate) =>
          candidate.resolutionStatus === "resolved_existing" ||
          candidate.resolutionStatus === "created_suggested"
      )
      .map((candidate) => candidate.candidateSlug)
  );

  return params.candidates
    .filter((candidate) => {
      if (resolvedSlugs.has(candidate.candidateSlug)) {
        return false;
      }

      return (
        candidate.needsUserReview === true ||
        candidate.confidence < 0.55 ||
        candidate.resolutionStatus === "unresolved" ||
        candidate.resolutionStatus === "needs_review"
      );
    })
    .map((candidate) => ({
      surfaceText:
        candidate.evidence.surfaceText ??
        candidate.candidateTitle ??
        candidate.candidateSlug,
      lemma: candidate.candidateSlug,
      languageCode: params.detectedLanguage,
      possibleSemanticLayers: [candidate.semanticLayer],
      localMatchStatus:
        candidate.resolutionStatus === "needs_review"
          ? "ambiguous"
          : "no_confident_match",
      requiresExternalLookup: true,
      ambiguityReason:
        candidate.needsUserReview === true
          ? "candidate_marked_for_user_review"
          : candidate.confidence < 0.55
            ? "low_confidence"
            : null,
      confidence: candidate.confidence,
      evidence: {
        source: "rule",
        surfaceText:
          candidate.evidence.surfaceText ??
          candidate.candidateTitle ??
          candidate.candidateSlug,
        matchedWords: candidate.evidence.matchedWords ?? [],
        sourceChain: ["category_candidate", "unknown_term_detector_v0"],
        raw: candidate.evidence.raw ?? null,
      },
    }));
}

function buildMissingInformationQuestions(
  unknownTerms: UnknownTermCandidateV3[]
): MissingInformationQuestionV3[] {
  return unknownTerms
    .filter(
      (candidate) =>
        candidate.localMatchStatus === "ambiguous" ||
        candidate.localMatchStatus === "multiple_matches" ||
        candidate.confidence < 0.6
    )
    .slice(0, 3)
    .map((candidate) => ({
      questionKey: `clarify-${slugify(candidate.lemma, "unknown-term")}`,
      questionText: `Что именно ты имел в виду под "${candidate.surfaceText}"?`,
      blockingLevel: "blocks_resolution",
      relatedUnknownTerms: [candidate.surfaceText],
      relatedCandidateSlugs: [candidate.lemma],
    }));
}

function buildStateHooksFromResolvedCandidates(
  resolvedCandidates: ResolvedCategoryCandidateV3[]
): StateHookCandidateV3[] {
  const hooks = new Map<string, StateHookCandidateV3>();

  function addHook(candidate: ResolvedCategoryCandidateV3, hookKey: string): void {
    if (hooks.has(hookKey)) {
      return;
    }

    hooks.set(
      hookKey,
      createStateHookCandidateV3({
        hookKey,
        direction: "increase",
        confidence: Math.min(candidate.confidence, 0.75),
        evidence: {
          source: "resolver",
          surfaceText: candidate.evidence.surfaceText ?? candidate.candidateSlug,
          sourceChain: ["resolved_category_candidate", "state_hook_v0"],
          raw: {
            candidateSlug: candidate.candidateSlug,
            canonicalSlug: candidate.canonicalSlug,
            semanticLayer: candidate.semanticLayer,
            categoryType: candidate.categoryType,
            note: "State hook only. Not a state fact.",
          },
        },
      })
    );
  }

  for (const candidate of resolvedCandidates) {
    const slugText =
      `${candidate.candidateSlug} ${candidate.canonicalSlug}`.toLowerCase();

    if (
      slugText.includes("walk") ||
      slugText.includes("walking") ||
      slugText.includes("cycling") ||
      slugText.includes("bicycle") ||
      slugText.includes("sport") ||
      slugText.includes("exercise") ||
      slugText.includes("physical")
    ) {
      addHook(candidate, "physical_load");
    }

    if (
      slugText.includes("child") ||
      slugText.includes("family") ||
      slugText.includes("care") ||
      slugText.includes("parent")
    ) {
      addHook(candidate, "family_care_load");
    }

    if (
      slugText.includes("lead") ||
      slugText.includes("sales") ||
      slugText.includes("client") ||
      slugText.includes("income") ||
      slugText.includes("business")
    ) {
      addHook(candidate, "income_action_attention");
    }

    if (
      slugText.includes("coding") ||
      slugText.includes("deep-work") ||
      slugText.includes("analysis") ||
      slugText.includes("learning") ||
      slugText.includes("study")
    ) {
      addHook(candidate, "cognitive_load");
    }

    if (
      slugText.includes("rest") ||
      slugText.includes("sleep") ||
      slugText.includes("recovery")
    ) {
      addHook(candidate, "recovery_need");
    }
  }

  return Array.from(hooks.values());
}

function calculateOverallConfidence(params: {
  categoryCandidates: CategoryCandidateV3[];
  resolvedCategoryCandidates: ResolvedCategoryCandidateV3[];
  metricCandidates: MetricCandidateV3[];
}): number {
  const values = [
    ...params.categoryCandidates.map((candidate) => candidate.confidence),
    ...params.resolvedCategoryCandidates.map((candidate) => candidate.confidence),
    ...params.metricCandidates.map((candidate) => candidate.confidence),
  ];

  if (values.length === 0) {
    return 0.5;
  }

  const average =
    values.reduce((sum, value) => sum + value, 0) / values.length;

  return clampConfidence(average, 0.5);
}

function buildWarnings(params: {
  unknownTerms: UnknownTermCandidateV3[];
  resolvedCandidates: ResolvedCategoryCandidateV3[];
}): string[] {
  const warnings: string[] = [];

  if (params.unknownTerms.length > 0) {
    warnings.push("unresolved_terms_present");
  }

  if (
    params.resolvedCandidates.some(
      (candidate) => candidate.resolutionStatus === "needs_review"
    )
  ) {
    warnings.push("needs_review_candidates_present");
  }

  if (
    params.resolvedCandidates.some(
      (candidate) => candidate.mappingStatus === "external_suggested"
    )
  ) {
    warnings.push("external_suggested_mapping_requires_confirmation");
  }

  return warnings;
}

export function buildSemanticDerivationV3FromCurrentOutput(
  params: BuildSemanticDerivationV3FromCurrentOutputParams
): SemanticDerivationV3Result {
  const categoryDerivationResult = params.categoryDerivationResult;

  const extractionSource =
    params.extractionResult ??
    readRecord(categoryDerivationResult, "extraction") ??
    categoryDerivationResult;

  const resolutionSource =
    params.resolutionResult ??
    readRecord(categoryDerivationResult, "resolution") ??
    categoryDerivationResult;

  const detectedLanguage = normalizeLanguage(params.detectedLanguage);

  const normalizedActivity =
    params.normalizedActivity?.trim() ||
    params.inputText?.trim() ||
    "unknown activity";

  const metricCandidates = collectMetricCandidates(extractionSource);

  if (
    typeof params.durationMinutes === "number" &&
    Number.isFinite(params.durationMinutes) &&
    !metricCandidates.some((candidate) => candidate.metricKey === "duration_minutes")
  ) {
    metricCandidates.push({
      metricKey: "duration_minutes",
      value: params.durationMinutes,
      unit: "minutes",
      confidence: 0.95,
      evidence: {
        source: "raw_input",
        surfaceText: String(params.durationMinutes),
        sourceChain: ["input", "duration_minutes"],
      },
    });
  }

  const categoryCandidates = collectCandidatesFromExtraction(extractionSource)
    .map(mapCategoryCandidate)
    .filter((candidate): candidate is CategoryCandidateV3 => candidate !== null);

  const resolvedCategoryCandidates = collectCandidatesFromResolution(
    resolutionSource
  )
    .map(mapResolvedCandidate)
    .filter(
      (candidate): candidate is ResolvedCategoryCandidateV3 =>
        candidate !== null
    );

  const localLookupCandidates = buildLocalLookupCandidates(
    resolvedCategoryCandidates
  );

  const unknownTermCandidates = buildUnknownTermsFromCandidates({
    candidates: categoryCandidates,
    resolvedCandidates: resolvedCategoryCandidates,
    detectedLanguage,
  });

  const stateHookCandidates = buildStateHooksFromResolvedCandidates(
    resolvedCategoryCandidates
  );

  const missingInformationQuestions =
    buildMissingInformationQuestions(unknownTermCandidates);

  const riskFlags =
    stateHookCandidates.length > 0
      ? ["do_not_overclaim_state_fact_from_category"]
      : [];

  const contractWarnings = buildWarnings({
    unknownTerms: unknownTermCandidates,
    resolvedCandidates: resolvedCategoryCandidates,
  });

  const contractErrors = resolvedCategoryCandidates.some(
    (candidate) =>
      candidate.mappingStatus === "external_suggested" &&
      candidate.resolutionStatus === "resolved_existing" &&
      candidate.needsUserConfirmation === false
  )
    ? ["external_suggested_mapping_must_not_be_auto_trusted"]
    : [];

  return {
    schemaVersion: SEMANTIC_CONTRACT_V3_SCHEMA_VERSION,
    adapterVersion: SEMANTIC_CONTRACT_V3_ADAPTER_VERSION,
    detectedLanguage,
    normalizedActivity,
    overallConfidence: calculateOverallConfidence({
      categoryCandidates,
      resolvedCategoryCandidates,
      metricCandidates,
    }),
    metricCandidates,
    categoryCandidates,
    unknownTermCandidates,
    localLookupCandidates,
    externalConceptCandidates: [],
    resolvedCategoryCandidates,
    stateHookCandidates,
    riskFlags,
    forbiddenOverclaims: [...DEFAULT_FORBIDDEN_OVERCLAIMS],
    missingInformationQuestions,
    contractWarnings,
    contractErrors,
  };
}

