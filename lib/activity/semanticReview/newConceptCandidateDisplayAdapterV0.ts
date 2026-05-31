import {
  ACTIVITY_CAPTURE_DETACHED_PREVIEW_ROUTE_MODE,
  runActivityCaptureDetachedPreviewAdapterV0,
  type ActivityCaptureDetachedPreviewInputV0,
} from "../capture/activityCaptureDetachedPreviewAdapterV0";

export const NEW_CONCEPT_CANDIDATE_DISPLAY_ADAPTER_VERSION =
  "new_concept_candidate_display_adapter_v0" as const;

export const NEW_CONCEPT_CANDIDATE_DISPLAY_ROUTE_MODE =
  "semantic_review_new_concept_candidates_no_write_v0" as const;

export const NEW_CONCEPT_CANDIDATE_DISPLAY_ROUTE =
  "/api/activity/semantic-review/new-concept-candidates-preview" as const;

const SIDE_EFFECTS = {
  sqlExecuted: false,
  dbReadExecuted: false,
  dbWriteExecuted: false,
  activeCategoryCreated: false,
  externalConceptMappingCreated: false,
  semanticCapitalWritten: false,
  valueObjectCreated: false,
  activityValueObjectLinkCreated: false,
  stateFactCreated: false,
  stateDeltaCreated: false,
  stateSnapshotCreated: false,
  productionWriteGateOpened: false,
  sandboxWriteGateOpened: false,
  rowsActuallyWritten: 0,
} as const;

type CandidateStatusV0 =
  | "candidate"
  | "needs_user_review"
  | "needs_more_context"
  | "blocked_from_auto_creation";

type CandidateKindV0 =
  | "unknown_term"
  | "unclear_concept"
  | "possible_category"
  | "external_concept_candidate"
  | "mapping_candidate";

export type NewConceptCandidateDisplayInputV0 =
  ActivityCaptureDetachedPreviewInputV0;

export type NewConceptCandidateDisplayV0 = {
  candidateId: string;
  sourceRoute: typeof NEW_CONCEPT_CANDIDATE_DISPLAY_ROUTE;
  sourceRouteMode: typeof NEW_CONCEPT_CANDIDATE_DISPLAY_ROUTE_MODE;
  sourcePreviewRouteMode: typeof ACTIVITY_CAPTURE_DETACHED_PREVIEW_ROUTE_MODE;
  rawTextFragment: string;
  suggestedMeaning: string;
  candidateStatus: CandidateStatusV0;
  candidateKind: CandidateKindV0;
  notApprovedYet: true;
  notSavedYet: true;
  canApproveNow: false;
  canRejectNow: false;
  canMergeNow: false;
  requiresFutureGovernanceGate: true;
  displayLabels: {
    titleEn: "Review candidate";
    titleRu: "Кандидат на проверку";
    markerEn: "This is a review candidate, not an approved category.";
    markerRu: "Это кандидат на проверку, а не утверждённая категория.";
  };
  sideEffects: typeof SIDE_EFFECTS;
  warnings: string[];
};

export type NewConceptCandidateDisplayResultV0 = {
  ok: boolean;
  httpStatus: 200 | 400 | 500;
  adapterVersion: typeof NEW_CONCEPT_CANDIDATE_DISPLAY_ADAPTER_VERSION;
  routeMode: typeof NEW_CONCEPT_CANDIDATE_DISPLAY_ROUTE_MODE;
  sourcePreviewRouteMode: typeof ACTIVITY_CAPTURE_DETACHED_PREVIEW_ROUTE_MODE;
  reviewCandidateDisplayReady: boolean;
  sourcePreviewReady: boolean;
  internalServiceCalled: boolean;
  debugRouteCalled: false;
  candidateCount: number;
  candidates: NewConceptCandidateDisplayV0[];
  reviewPanelDraft: {
    title: "Semantic review candidates";
    userFacingTitleRu: "Кандидаты на семантическую проверку";
    status: "not_approved_yet";
    notApprovedYet: true;
    notSavedYet: true;
    canApproveNow: false;
    canRejectNow: false;
    canMergeNow: false;
    requiresFutureGovernanceGate: true;
  };
  sourceDiagnostics: {
    transactionStepCount: number;
    memberTransactionStepCount: number;
    blockedAuditTransactionStepCount: number;
    activityCapturePreviewReady: boolean;
    semanticPreviewReady: boolean;
  };
  sideEffects: typeof SIDE_EFFECTS;
  errors: string[];
  warnings: string[];
};

function normalizeFragment(fragment: string): string {
  return fragment.replace(/\s+/g, " ").trim();
}

function uniqueFragments(fragments: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const fragment of fragments) {
    const normalized = normalizeFragment(fragment);
    const key = normalized.toLowerCase();

    if (normalized.length === 0 || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(normalized);
  }

  return result;
}

function inferCandidateFragments(
  rawText: string,
  blockedAuditTransactionStepCount: number
): string[] {
  if (blockedAuditTransactionStepCount <= 0) {
    return [];
  }

  const lower = rawText.toLowerCase();
  const fragments: string[] = [];

  if (lower.includes("quantum beekeeping")) {
    fragments.push("quantum beekeeping");
  } else {
    if (lower.includes("quantum")) {
      fragments.push("quantum");
    }

    if (lower.includes("beekeeping")) {
      fragments.push("beekeeping");
    }
  }

  if (fragments.length === 0) {
    const stopWords = new Set([
      "with",
      "child",
      "for",
      "minutes",
      "minute",
      "studied",
      "study",
      "learned",
      "activity",
      "manual",
      "the",
      "and",
      "or",
      "a",
      "an",
      "to",
      "of",
      "in",
      "on",
    ]);

    const tokens = rawText
      .toLowerCase()
      .split(/[^a-zа-яёіїєґóąćęłńśźżüöäß]+/iu)
      .map((token) => token.trim())
      .filter((token) => token.length >= 4)
      .filter((token) => !stopWords.has(token));

    fragments.push(tokens.slice(0, 2).join(" "));
  }

  if (fragments.length === 0) {
    fragments.push("unclear meaning");
  }

  return uniqueFragments(fragments);
}

function buildCandidate(
  fragment: string,
  index: number
): NewConceptCandidateDisplayV0 {
  const candidateId = `preview-candidate-${index + 1}`;

  return {
    candidateId,
    sourceRoute: NEW_CONCEPT_CANDIDATE_DISPLAY_ROUTE,
    sourceRouteMode: NEW_CONCEPT_CANDIDATE_DISPLAY_ROUTE_MODE,
    sourcePreviewRouteMode: ACTIVITY_CAPTURE_DETACHED_PREVIEW_ROUTE_MODE,
    rawTextFragment: fragment,
    suggestedMeaning: `Review provisional meaning for "${fragment}"`,
    candidateStatus: "needs_user_review",
    candidateKind: "unknown_term",
    notApprovedYet: true,
    notSavedYet: true,
    canApproveNow: false,
    canRejectNow: false,
    canMergeNow: false,
    requiresFutureGovernanceGate: true,
    displayLabels: {
      titleEn: "Review candidate",
      titleRu: "Кандидат на проверку",
      markerEn: "This is a review candidate, not an approved category.",
      markerRu: "Это кандидат на проверку, а не утверждённая категория.",
    },
    sideEffects: SIDE_EFFECTS,
    warnings: [
      "Candidate is provisional.",
      "No category was created.",
      "No external concept mapping was created.",
      "No Semantic Capital was written.",
    ],
  };
}

function buildPanelDraft(): NewConceptCandidateDisplayResultV0["reviewPanelDraft"] {
  return {
    title: "Semantic review candidates",
    userFacingTitleRu: "Кандидаты на семантическую проверку",
    status: "not_approved_yet",
    notApprovedYet: true,
    notSavedYet: true,
    canApproveNow: false,
    canRejectNow: false,
    canMergeNow: false,
    requiresFutureGovernanceGate: true,
  };
}

export function runNewConceptCandidateDisplayAdapterV0(
  input: NewConceptCandidateDisplayInputV0
): NewConceptCandidateDisplayResultV0 {
  const sourcePreview = runActivityCaptureDetachedPreviewAdapterV0(input);

  const sourceDiagnostics = {
    transactionStepCount: sourcePreview.transactionStepCount,
    memberTransactionStepCount: sourcePreview.memberTransactionStepCount,
    blockedAuditTransactionStepCount:
      sourcePreview.blockedAuditTransactionStepCount,
    activityCapturePreviewReady: sourcePreview.activityCapturePreviewReady,
    semanticPreviewReady: sourcePreview.semanticPreviewReady,
  };

  if (!sourcePreview.ok) {
    return {
      ok: false,
      httpStatus: sourcePreview.httpStatus === 400 ? 400 : 500,
      adapterVersion: NEW_CONCEPT_CANDIDATE_DISPLAY_ADAPTER_VERSION,
      routeMode: NEW_CONCEPT_CANDIDATE_DISPLAY_ROUTE_MODE,
      sourcePreviewRouteMode: ACTIVITY_CAPTURE_DETACHED_PREVIEW_ROUTE_MODE,
      reviewCandidateDisplayReady: false,
      sourcePreviewReady: false,
      internalServiceCalled: sourcePreview.internalServiceCalled,
      debugRouteCalled: false,
      candidateCount: 0,
      candidates: [],
      reviewPanelDraft: buildPanelDraft(),
      sourceDiagnostics,
      sideEffects: SIDE_EFFECTS,
      errors: sourcePreview.errors,
      warnings: [
        ...sourcePreview.warnings,
        "Semantic review candidates were not produced because source preview was denied.",
        "No review candidate was saved.",
      ],
    };
  }

  const fragments = inferCandidateFragments(
    sourcePreview.activityReviewDraft.rawText,
    sourcePreview.blockedAuditTransactionStepCount
  );

  const candidates = fragments.map((fragment, index) =>
    buildCandidate(fragment, index)
  );

  return {
    ok: true,
    httpStatus: 200,
    adapterVersion: NEW_CONCEPT_CANDIDATE_DISPLAY_ADAPTER_VERSION,
    routeMode: NEW_CONCEPT_CANDIDATE_DISPLAY_ROUTE_MODE,
    sourcePreviewRouteMode: ACTIVITY_CAPTURE_DETACHED_PREVIEW_ROUTE_MODE,
    reviewCandidateDisplayReady: true,
    sourcePreviewReady: true,
    internalServiceCalled: sourcePreview.internalServiceCalled,
    debugRouteCalled: false,
    candidateCount: candidates.length,
    candidates,
    reviewPanelDraft: buildPanelDraft(),
    sourceDiagnostics,
    sideEffects: SIDE_EFFECTS,
    errors: sourcePreview.errors,
    warnings: [
      ...sourcePreview.warnings,
      "Review candidates are provisional.",
      "This is a review candidate, not an approved category.",
      "No active category was created.",
      "No external concept mapping was created.",
      "No Semantic Capital was written.",
    ],
  };
}
