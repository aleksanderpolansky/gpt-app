import {
  clampConfidence,
  type CategoryCandidateV3,
  type CategoryType,
  type LocalLookupCandidateV3,
  type MappingStatus,
  type ResolutionStatus,
  type ResolvedCategoryCandidateV3,
  type SemanticDerivationV3Result,
} from "./semanticContractV3";

export type ResolveSemanticBundleV0Params = {
  result: SemanticDerivationV3Result;
};

function normalizeCategoryTypeForBundle(
  candidate: CategoryCandidateV3
): CategoryType {
  if (candidate.categoryType !== "unknown") {
    return candidate.categoryType;
  }

  if (candidate.semanticLayer === "purpose") {
    return "purpose";
  }

  if (candidate.semanticLayer === "care") {
    return "care_function";
  }

  if (candidate.semanticLayer === "context") {
    return "context";
  }

  if (candidate.semanticLayer === "domain") {
    return "domain";
  }

  if (candidate.semanticLayer === "object_or_instrument") {
    return "instrument";
  }

  if (candidate.semanticLayer === "action") {
    return "activity";
  }

  return "unknown";
}

function isMetricOnlyCandidate(candidate: CategoryCandidateV3): boolean {
  if (candidate.semanticLayer === "metric") {
    return true;
  }

  if (candidate.categoryType === "metric") {
    return true;
  }

  if (candidate.candidateSlug === "duration-minutes") {
    return true;
  }

  if (candidate.candidateSlug === "duration_minutes") {
    return true;
  }

  return false;
}

function isControlledLocalCandidate(candidate: CategoryCandidateV3): boolean {
  const sourceChain = candidate.evidence.sourceChain ?? [];

  if (isMetricOnlyCandidate(candidate)) {
    return false;
  }

  if (candidate.source !== "rule") {
    return false;
  }

  if (candidate.needsUserReview === true) {
    return false;
  }

  if (candidate.confidence < 0.65) {
    return false;
  }

  if (
    sourceChain.includes("deterministic_text_enrichment_v0") ||
    sourceChain.includes("current_output") ||
    sourceChain.includes("raw_input")
  ) {
    return true;
  }

  return candidate.isRequired === true || candidate.isCoreMeaning === true;
}

function getResolutionStatus(candidate: CategoryCandidateV3): ResolutionStatus {
  if (!isControlledLocalCandidate(candidate)) {
    return "needs_review";
  }

  return "created_suggested";
}

function getMappingStatus(candidate: CategoryCandidateV3): MappingStatus {
  if (!isControlledLocalCandidate(candidate)) {
    return "local_ambiguous";
  }

  return "local_exact";
}

function needsUserConfirmation(candidate: CategoryCandidateV3): boolean {
  if (!isControlledLocalCandidate(candidate)) {
    return true;
  }

  if (candidate.confidence < 0.75) {
    return true;
  }

  return false;
}

function toResolvedCategoryCandidate(
  candidate: CategoryCandidateV3
): ResolvedCategoryCandidateV3 {
  const resolutionStatus = getResolutionStatus(candidate);
  const mappingStatus = getMappingStatus(candidate);

  return {
    candidateSlug: candidate.candidateSlug,
    canonicalSlug: candidate.candidateSlug,
    categoryId: null,
    semanticLayer: candidate.semanticLayer,
    categoryType: normalizeCategoryTypeForBundle(candidate),
    resolutionStatus,
    mappingStatus,
    needsUserConfirmation: needsUserConfirmation(candidate),
    confidence: clampConfidence(candidate.confidence),
    evidence: {
      source: "resolver",
      surfaceText:
        candidate.evidence.surfaceText ??
        candidate.candidateTitle ??
        candidate.candidateSlug,
      matchedWords: candidate.evidence.matchedWords ?? [],
      sourceChain: [
        ...(candidate.evidence.sourceChain ?? []),
        "semantic_bundle_resolver_v0",
      ],
      raw: {
        sourceCandidate: {
          candidateSlug: candidate.candidateSlug,
          candidateTitle: candidate.candidateTitle,
          semanticLayer: candidate.semanticLayer,
          categoryType: candidate.categoryType,
          confidence: candidate.confidence,
        },
        note: "Preview resolver only. No internal category was created in DB.",
      },
    },
  };
}

function toLocalLookupCandidate(
  resolved: ResolvedCategoryCandidateV3
): LocalLookupCandidateV3 {
  return {
    source: "seed_rubricator",
    matchedCategoryId: resolved.categoryId ?? null,
    matchedSlug: resolved.canonicalSlug,
    matchedAlias:
      resolved.candidateSlug !== resolved.canonicalSlug
        ? resolved.candidateSlug
        : null,
    semanticLayer: resolved.semanticLayer,
    categoryType: resolved.categoryType,
    confidence: resolved.confidence,
    matchStatus:
      resolved.mappingStatus === "local_exact"
        ? "local_exact"
        : "local_ambiguous",
    evidence: {
      source: "local_lookup",
      surfaceText: resolved.evidence.surfaceText ?? resolved.candidateSlug,
      sourceChain: [
        ...(resolved.evidence.sourceChain ?? []),
        "local_lookup_candidate_v0",
      ],
      raw: {
        note: "Local controlled vocabulary preview. No DB category id yet.",
      },
    },
  };
}

function uniqueBySlug<T>(
  items: T[],
  keyGetter: (item: T) => string
): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    const key = keyGetter(item);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(item);
  }

  return result;
}

export function resolveSemanticBundleV0(
  params: ResolveSemanticBundleV0Params
): SemanticDerivationV3Result {
  const metricOnlyCandidateCount = params.result.categoryCandidates.filter(
    isMetricOnlyCandidate
  ).length;

  const semanticCategoryCandidates = params.result.categoryCandidates.filter(
    (candidate) => !isMetricOnlyCandidate(candidate)
  );

  const generatedResolved = semanticCategoryCandidates.map(
    toResolvedCategoryCandidate
  );

  const mergedResolved = uniqueBySlug(
    [...params.result.resolvedCategoryCandidates, ...generatedResolved],
    (item) => item.candidateSlug
  ).filter(
    (candidate) =>
      candidate.semanticLayer !== "metric" &&
      candidate.categoryType !== "metric" &&
      candidate.candidateSlug !== "duration-minutes" &&
      candidate.candidateSlug !== "duration_minutes"
  );

  const generatedLocalLookup = generatedResolved
    .filter((candidate) => candidate.mappingStatus !== "local_ambiguous")
    .map(toLocalLookupCandidate);

  const mergedLocalLookup = uniqueBySlug(
    [...params.result.localLookupCandidates, ...generatedLocalLookup],
    (item) => item.matchedSlug
  ).filter(
    (candidate) =>
      candidate.semanticLayer !== "metric" &&
      candidate.categoryType !== "metric" &&
      candidate.matchedSlug !== "duration-minutes" &&
      candidate.matchedSlug !== "duration_minutes"
  );

  const warnings = params.result.contractWarnings.filter(
    (warning) => warning !== "unresolved_terms_present"
  );

  if (!warnings.includes("semantic_bundle_resolver_v0_applied")) {
    warnings.push("semantic_bundle_resolver_v0_applied");
  }

  if (
    metricOnlyCandidateCount > 0 &&
    !warnings.includes("metric_candidates_excluded_from_resolved_bundle")
  ) {
    warnings.push("metric_candidates_excluded_from_resolved_bundle");
  }

  const hasNeedsReview = mergedResolved.some(
    (candidate) => candidate.resolutionStatus === "needs_review"
  );

  if (hasNeedsReview && !warnings.includes("needs_review_candidates_present")) {
    warnings.push("needs_review_candidates_present");
  }

  return {
    ...params.result,
    resolvedCategoryCandidates: mergedResolved,
    localLookupCandidates: mergedLocalLookup,
    contractWarnings: warnings,
  };
}
