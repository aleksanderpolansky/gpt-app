import {
  NEW_CONCEPT_CANDIDATE_DISPLAY_ROUTE_MODE,
  runNewConceptCandidateDisplayAdapterV0,
  type NewConceptCandidateDisplayInputV0,
} from "../semanticReview/newConceptCandidateDisplayAdapterV0";

export const VALUE_OBJECT_CANDIDATE_DISPLAY_ADAPTER_VERSION =
  "value_object_candidate_display_adapter_v0" as const;

export const VALUE_OBJECT_CANDIDATE_DISPLAY_ROUTE_MODE =
  "value_object_candidates_preview_no_write_v0" as const;

export const VALUE_OBJECT_CANDIDATE_DISPLAY_ROUTE =
  "/api/activity/value-objects/candidates-preview" as const;

const SIDE_EFFECTS = {
  sqlExecuted: false,
  dbReadExecuted: false,
  dbWriteExecuted: false,
  valueObjectCreated: false,
  activityValueObjectLinkCreated: false,
  offerCreated: false,
  certificateBaseCreated: false,
  activeCategoryCreated: false,
  externalConceptMappingCreated: false,
  semanticCapitalWritten: false,
  stateFactCreated: false,
  stateDeltaCreated: false,
  stateSnapshotCreated: false,
  productionWriteGateOpened: false,
  sandboxWriteGateOpened: false,
  rowsActuallyWritten: 0,
} as const;

type ValueObjectCandidateStatusV0 =
  | "candidate"
  | "needs_user_review"
  | "needs_organization_context"
  | "needs_commercial_context"
  | "blocked_from_auto_creation";

type ValueObjectCandidateScopeV0 =
  | "personal_candidate"
  | "organization_candidate"
  | "commercial_candidate";

type ValueObjectCandidateKindV0 =
  | "activity_target"
  | "care_function"
  | "learning_object"
  | "business_process"
  | "product_or_service_base"
  | "offer_or_certificate_base";

export type ValueObjectCandidateDisplayInputV0 =
  NewConceptCandidateDisplayInputV0;

export type ValueObjectCandidateDisplayV0 = {
  candidateId: string;
  sourceRoute: typeof VALUE_OBJECT_CANDIDATE_DISPLAY_ROUTE;
  sourceRouteMode: typeof VALUE_OBJECT_CANDIDATE_DISPLAY_ROUTE_MODE;
  sourceSemanticReviewRouteMode: typeof NEW_CONCEPT_CANDIDATE_DISPLAY_ROUTE_MODE;
  sourceActivityText: string;
  suggestedTitle: string;
  reason: string;
  candidateStatus: ValueObjectCandidateStatusV0;
  candidateScope: ValueObjectCandidateScopeV0;
  candidateKind: ValueObjectCandidateKindV0;
  notCreatedYet: true;
  notLinkedYet: true;
  notPublishedYet: true;
  canCreateNow: false;
  canLinkNow: false;
  canExposeNow: false;
  requiresFutureValueObjectGate: true;
  displayLabels: {
    titleEn: "Value Object candidate";
    titleRu: "Кандидат в ценные объекты";
    markerEn: "This is a Value Object candidate, not a created Value Object.";
    markerRu: "Это кандидат в ценные объекты, а не созданный ценный объект.";
  };
  sideEffects: typeof SIDE_EFFECTS;
  warnings: string[];
};

export type ValueObjectCandidateDisplayResultV0 = {
  ok: boolean;
  httpStatus: 200 | 400 | 500;
  adapterVersion: typeof VALUE_OBJECT_CANDIDATE_DISPLAY_ADAPTER_VERSION;
  routeMode: typeof VALUE_OBJECT_CANDIDATE_DISPLAY_ROUTE_MODE;
  sourceSemanticReviewRouteMode: typeof NEW_CONCEPT_CANDIDATE_DISPLAY_ROUTE_MODE;
  valueObjectCandidateDisplayReady: boolean;
  sourceReviewReady: boolean;
  internalServiceCalled: boolean;
  debugRouteCalled: false;
  candidateCount: number;
  candidates: ValueObjectCandidateDisplayV0[];
  valueObjectPanelDraft: {
    title: "Value Object candidates";
    userFacingTitleRu: "Кандидаты в ценные объекты";
    status: "not_created_yet";
    notCreatedYet: true;
    notLinkedYet: true;
    notPublishedYet: true;
    canCreateNow: false;
    canLinkNow: false;
    canExposeNow: false;
    requiresFutureValueObjectGate: true;
  };
  sourceDiagnostics: {
    reviewCandidateCount: number;
    reviewCandidateDisplayReady: boolean;
    transactionStepCount: number;
    memberTransactionStepCount: number;
    blockedAuditTransactionStepCount: number;
  };
  sideEffects: typeof SIDE_EFFECTS;
  errors: string[];
  warnings: string[];
};

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function hasAny(text: string, words: string[]): boolean {
  const lower = text.toLowerCase();

  return words.some((word) => lower.includes(word.toLowerCase()));
}

function makeCandidate(
  index: number,
  sourceActivityText: string,
  suggestedTitle: string,
  reason: string,
  candidateScope: ValueObjectCandidateScopeV0,
  candidateKind: ValueObjectCandidateKindV0,
  candidateStatus: ValueObjectCandidateStatusV0 = "candidate"
): ValueObjectCandidateDisplayV0 {
  return {
    candidateId: `vo-preview-candidate-${index + 1}`,
    sourceRoute: VALUE_OBJECT_CANDIDATE_DISPLAY_ROUTE,
    sourceRouteMode: VALUE_OBJECT_CANDIDATE_DISPLAY_ROUTE_MODE,
    sourceSemanticReviewRouteMode: NEW_CONCEPT_CANDIDATE_DISPLAY_ROUTE_MODE,
    sourceActivityText,
    suggestedTitle,
    reason,
    candidateStatus,
    candidateScope,
    candidateKind,
    notCreatedYet: true,
    notLinkedYet: true,
    notPublishedYet: true,
    canCreateNow: false,
    canLinkNow: false,
    canExposeNow: false,
    requiresFutureValueObjectGate: true,
    displayLabels: {
      titleEn: "Value Object candidate",
      titleRu: "Кандидат в ценные объекты",
      markerEn: "This is a Value Object candidate, not a created Value Object.",
      markerRu: "Это кандидат в ценные объекты, а не созданный ценный объект.",
    },
    sideEffects: SIDE_EFFECTS,
    warnings: [
      "Value Object candidate is provisional.",
      "No Value Object was created.",
      "No Activity-to-Value-Object link was created.",
      "No offer or certificate base was created.",
      "No Semantic Capital was written.",
    ],
  };
}

function dedupeCandidates(
  candidates: ValueObjectCandidateDisplayV0[]
): ValueObjectCandidateDisplayV0[] {
  const seen = new Set<string>();
  const result: ValueObjectCandidateDisplayV0[] = [];

  for (const candidate of candidates) {
    const key = [
      candidate.suggestedTitle.toLowerCase(),
      candidate.candidateScope,
      candidate.candidateKind,
    ].join("|");

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push({
      ...candidate,
      candidateId: `vo-preview-candidate-${result.length + 1}`,
    });
  }

  return result;
}

function inferValueObjectCandidates(
  sourceActivityText: string,
  reviewCandidateCount: number
): ValueObjectCandidateDisplayV0[] {
  const normalized = normalizeText(sourceActivityText);
  const candidates: ValueObjectCandidateDisplayV0[] = [];

  if (normalized.length === 0) {
    return [];
  }

  if (hasAny(normalized, ["math", "mathematics", "матем", "matematy", "mathe"])) {
    candidates.push(
      makeCandidate(
        candidates.length,
        normalized,
        "Math learning support",
        "Activity mentions math learning/support context.",
        "personal_candidate",
        "learning_object",
        "candidate"
      )
    );
  }

  if (hasAny(normalized, ["child", "kid", "dzieck", "реб", "kind"])) {
    candidates.push(
      makeCandidate(
        candidates.length,
        normalized,
        "Child education support",
        "Activity mentions a child and may represent support for learning.",
        "personal_candidate",
        "care_function",
        "candidate"
      )
    );

    candidates.push(
      makeCandidate(
        candidates.length,
        normalized,
        "Parental care / childcare",
        "Activity may represent a care/duty function, not only learning content.",
        "personal_candidate",
        "care_function",
        "candidate"
      )
    );
  }

  if (hasAny(normalized, ["study", "studied", "learn", "learning", "учил", "nauka", "lernen"])) {
    candidates.push(
      makeCandidate(
        candidates.length,
        normalized,
        "Learning session",
        "Activity contains a learning/study signal.",
        "personal_candidate",
        "activity_target",
        "candidate"
      )
    );
  }

  if (hasAny(normalized, ["customer", "client", "sales", "b2b", "lead", "crm", "deal"])) {
    candidates.push(
      makeCandidate(
        candidates.length,
        normalized,
        "B2B sales process",
        "Activity contains business/sales process signals.",
        "organization_candidate",
        "business_process",
        "needs_organization_context"
      )
    );
  }

  if (hasAny(normalized, ["offer", "certificate", "service", "product", "booking"])) {
    candidates.push(
      makeCandidate(
        candidates.length,
        normalized,
        "Commercial product/service base",
        "Activity contains product/service/offer exposure signals.",
        "commercial_candidate",
        "product_or_service_base",
        "needs_commercial_context"
      )
    );
  }

  if (reviewCandidateCount > 0) {
    candidates.push(
      makeCandidate(
        candidates.length,
        normalized,
        "Review-dependent Value Object candidate",
        "Semantic Review produced provisional concept candidates; VO candidate requires later review.",
        "personal_candidate",
        "activity_target",
        "needs_user_review"
      )
    );
  }

  if (candidates.length === 0) {
    candidates.push(
      makeCandidate(
        candidates.length,
        normalized,
        "General activity value target",
        "Fallback candidate for a meaningful activity target.",
        "personal_candidate",
        "activity_target",
        "candidate"
      )
    );
  }

  return dedupeCandidates(candidates);
}

function buildPanelDraft(): ValueObjectCandidateDisplayResultV0["valueObjectPanelDraft"] {
  return {
    title: "Value Object candidates",
    userFacingTitleRu: "Кандидаты в ценные объекты",
    status: "not_created_yet",
    notCreatedYet: true,
    notLinkedYet: true,
    notPublishedYet: true,
    canCreateNow: false,
    canLinkNow: false,
    canExposeNow: false,
    requiresFutureValueObjectGate: true,
  };
}

export function runValueObjectCandidateDisplayAdapterV0(
  input: ValueObjectCandidateDisplayInputV0
): ValueObjectCandidateDisplayResultV0 {
  const sourceReview = runNewConceptCandidateDisplayAdapterV0(input);

  const sourceDiagnostics = {
    reviewCandidateCount: sourceReview.candidateCount,
    reviewCandidateDisplayReady: sourceReview.reviewCandidateDisplayReady,
    transactionStepCount: sourceReview.sourceDiagnostics.transactionStepCount,
    memberTransactionStepCount:
      sourceReview.sourceDiagnostics.memberTransactionStepCount,
    blockedAuditTransactionStepCount:
      sourceReview.sourceDiagnostics.blockedAuditTransactionStepCount,
  };

  if (!sourceReview.ok) {
    return {
      ok: false,
      httpStatus: sourceReview.httpStatus === 400 ? 400 : 500,
      adapterVersion: VALUE_OBJECT_CANDIDATE_DISPLAY_ADAPTER_VERSION,
      routeMode: VALUE_OBJECT_CANDIDATE_DISPLAY_ROUTE_MODE,
      sourceSemanticReviewRouteMode: NEW_CONCEPT_CANDIDATE_DISPLAY_ROUTE_MODE,
      valueObjectCandidateDisplayReady: false,
      sourceReviewReady: false,
      internalServiceCalled: sourceReview.internalServiceCalled,
      debugRouteCalled: false,
      candidateCount: 0,
      candidates: [],
      valueObjectPanelDraft: buildPanelDraft(),
      sourceDiagnostics,
      sideEffects: SIDE_EFFECTS,
      errors: sourceReview.errors,
      warnings: [
        ...sourceReview.warnings,
        "Value Object candidates were not produced because source review preview was denied.",
        "No Value Object was created.",
      ],
    };
  }

  const sourceActivityText =
    typeof input.rawText === "string" ? normalizeText(input.rawText) : "";

  const candidates = inferValueObjectCandidates(
    sourceActivityText,
    sourceReview.candidateCount
  );

  return {
    ok: true,
    httpStatus: 200,
    adapterVersion: VALUE_OBJECT_CANDIDATE_DISPLAY_ADAPTER_VERSION,
    routeMode: VALUE_OBJECT_CANDIDATE_DISPLAY_ROUTE_MODE,
    sourceSemanticReviewRouteMode: NEW_CONCEPT_CANDIDATE_DISPLAY_ROUTE_MODE,
    valueObjectCandidateDisplayReady: true,
    sourceReviewReady: true,
    internalServiceCalled: sourceReview.internalServiceCalled,
    debugRouteCalled: false,
    candidateCount: candidates.length,
    candidates,
    valueObjectPanelDraft: buildPanelDraft(),
    sourceDiagnostics,
    sideEffects: SIDE_EFFECTS,
    errors: sourceReview.errors,
    warnings: [
      ...sourceReview.warnings,
      "Value Object candidates are provisional.",
      "This is a Value Object candidate, not a created Value Object.",
      "No Value Object was created.",
      "No Activity-to-Value-Object link was created.",
      "No offer or certificate base was created.",
      "No Semantic Capital was written.",
      "No State record was created.",
    ],
  };
}
