import {
  VALUE_OBJECT_CANDIDATE_DISPLAY_ROUTE_MODE,
  runValueObjectCandidateDisplayAdapterV0,
  type ValueObjectCandidateDisplayInputV0,
} from "../valueObjects/valueObjectCandidateDisplayAdapterV0";

export const STATE_HOOK_PREVIEW_ADAPTER_VERSION =
  "state_hook_preview_adapter_v0" as const;

export const STATE_HOOK_PREVIEW_ROUTE_MODE =
  "state_hooks_preview_no_write_v0" as const;

export const STATE_HOOK_PREVIEW_ROUTE =
  "/api/activity/state-hooks/preview" as const;

const SIDE_EFFECTS = {
  sqlExecuted: false,
  dbReadExecuted: false,
  dbWriteExecuted: false,
  stateFactCreated: false,
  stateDeltaCreated: false,
  stateSnapshotCreated: false,
  semanticCapitalWritten: false,
  valueObjectCreated: false,
  activityValueObjectLinkCreated: false,
  activeCategoryCreated: false,
  externalConceptMappingCreated: false,
  medicalDiagnosisCreated: false,
  financialAdviceCreated: false,
  productivityScoreCreated: false,
  productionWriteGateOpened: false,
  sandboxWriteGateOpened: false,
  rowsActuallyWritten: 0,
} as const;

const FORBIDDEN_STATE_HOOK_FIELDS = [
  "allowStateFactCreation",
  "allowStateDeltaCreation",
  "allowStateSnapshotCreation",
  "allowStateHookPersistence",
  "allowMedicalConclusion",
  "allowFinancialAdvice",
  "allowProductivityScoring",
  "allowSemanticCapitalWrite",
  "allowValueObjectCreation",
  "allowActivityValueObjectLinkCreation",
  "forceConfirmed",
  "forceMeasured",
  "forceApplied",
  "productionStateWriteEnabled",
  "stateWriteGateOpened",
] as const;

type StateHookDomainV0 =
  | "health"
  | "fatigue"
  | "attention"
  | "cognitive_load"
  | "recovery"
  | "learning"
  | "family_care"
  | "productivity"
  | "money"
  | "business"
  | "risk";

type StateHookKindV0 =
  | "possible_state_fact"
  | "possible_state_delta"
  | "possible_state_snapshot_input"
  | "monitoring_suggestion"
  | "review_prompt";

type StateHookDirectionV0 = "increase" | "decrease" | "neutral" | "unknown";

type StateHookCandidateStatusV0 =
  | "candidate"
  | "needs_user_review"
  | "needs_sensor_or_manual_confirmation"
  | "needs_context"
  | "blocked_from_auto_state_write";

export type StateHookPreviewInputV0 = ValueObjectCandidateDisplayInputV0;

export type StateHookDisplayV0 = {
  hookId: string;
  sourceRoute: typeof STATE_HOOK_PREVIEW_ROUTE;
  sourceRouteMode: typeof STATE_HOOK_PREVIEW_ROUTE_MODE;
  sourceValueObjectRouteMode: typeof VALUE_OBJECT_CANDIDATE_DISPLAY_ROUTE_MODE;
  sourceActivityText: string;
  suggestedStateLabel: string;
  reason: string;
  stateDomain: StateHookDomainV0;
  hookKind: StateHookKindV0;
  hookDirection: StateHookDirectionV0;
  candidateStatus: StateHookCandidateStatusV0;
  notConfirmedYet: true;
  notMeasuredYet: true;
  notSavedYet: true;
  notAppliedYet: true;
  canCreateStateFactNow: false;
  canCreateStateDeltaNow: false;
  canUpdateStateSnapshotNow: false;
  requiresFutureStateWriteGate: true;
  displayLabels: {
    titleEn: "State hook";
    titleRu: "Сигнал состояния";
    markerEn: "This is a State hook, not a confirmed State Fact.";
    markerRu: "Это сигнал состояния, а не подтверждённый факт состояния.";
  };
  safety: {
    nonDiagnostic: true;
    notMedicalAdvice: true;
    notFinancialAdvice: true;
    notProductivityTruth: true;
    requiresHumanConfirmation: true;
  };
  sideEffects: typeof SIDE_EFFECTS;
  warnings: string[];
};

export type StateHookPreviewResultV0 = {
  ok: boolean;
  httpStatus: 200 | 400 | 500;
  adapterVersion: typeof STATE_HOOK_PREVIEW_ADAPTER_VERSION;
  routeMode: typeof STATE_HOOK_PREVIEW_ROUTE_MODE;
  sourceValueObjectRouteMode: typeof VALUE_OBJECT_CANDIDATE_DISPLAY_ROUTE_MODE;
  stateHookPreviewReady: boolean;
  sourceValueObjectPreviewReady: boolean;
  internalServiceCalled: boolean;
  debugRouteCalled: false;
  hookCount: number;
  hooks: StateHookDisplayV0[];
  stateHookPanelDraft: {
    title: "State hooks";
    userFacingTitleRu: "Сигналы состояния";
    status: "not_confirmed_yet";
    notConfirmedYet: true;
    notMeasuredYet: true;
    notSavedYet: true;
    notAppliedYet: true;
    canCreateStateFactNow: false;
    canCreateStateDeltaNow: false;
    canUpdateStateSnapshotNow: false;
    requiresFutureStateWriteGate: true;
  };
  sourceDiagnostics: {
    valueObjectCandidateCount: number;
    valueObjectCandidateDisplayReady: boolean;
    reviewCandidateCount: number;
    transactionStepCount: number;
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

function detectForbiddenFields(input: StateHookPreviewInputV0): string[] {
  if (!input || typeof input !== "object") {
    return [];
  }

  const record = input as Record<string, unknown>;

  return FORBIDDEN_STATE_HOOK_FIELDS.filter((field) => {
    return record[field] !== undefined && record[field] !== false;
  });
}

function makeHook(
  index: number,
  sourceActivityText: string,
  suggestedStateLabel: string,
  reason: string,
  stateDomain: StateHookDomainV0,
  hookKind: StateHookKindV0,
  hookDirection: StateHookDirectionV0,
  candidateStatus: StateHookCandidateStatusV0
): StateHookDisplayV0 {
  const isSensitiveDomain =
    stateDomain === "health" || stateDomain === "fatigue" || stateDomain === "money" || stateDomain === "risk";

  return {
    hookId: `state-hook-preview-${index + 1}`,
    sourceRoute: STATE_HOOK_PREVIEW_ROUTE,
    sourceRouteMode: STATE_HOOK_PREVIEW_ROUTE_MODE,
    sourceValueObjectRouteMode: VALUE_OBJECT_CANDIDATE_DISPLAY_ROUTE_MODE,
    sourceActivityText,
    suggestedStateLabel,
    reason,
    stateDomain,
    hookKind,
    hookDirection,
    candidateStatus,
    notConfirmedYet: true,
    notMeasuredYet: true,
    notSavedYet: true,
    notAppliedYet: true,
    canCreateStateFactNow: false,
    canCreateStateDeltaNow: false,
    canUpdateStateSnapshotNow: false,
    requiresFutureStateWriteGate: true,
    displayLabels: {
      titleEn: "State hook",
      titleRu: "Сигнал состояния",
      markerEn: "This is a State hook, not a confirmed State Fact.",
      markerRu: "Это сигнал состояния, а не подтверждённый факт состояния.",
    },
    safety: {
      nonDiagnostic: true,
      notMedicalAdvice: true,
      notFinancialAdvice: true,
      notProductivityTruth: true,
      requiresHumanConfirmation: true,
    },
    sideEffects: SIDE_EFFECTS,
    warnings: [
      "State hook is provisional.",
      "No State Fact was created.",
      "No State Delta was created.",
      "No State Snapshot was created.",
      "No Semantic Capital was written.",
      ...(isSensitiveDomain
        ? ["Sensitive domain: requires stricter wording and later confirmation before persistence."]
        : []),
    ],
  };
}

function dedupeHooks(hooks: StateHookDisplayV0[]): StateHookDisplayV0[] {
  const seen = new Set<string>();
  const result: StateHookDisplayV0[] = [];

  for (const hook of hooks) {
    const key = [
      hook.suggestedStateLabel.toLowerCase(),
      hook.stateDomain,
      hook.hookKind,
      hook.hookDirection,
    ].join("|");

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push({
      ...hook,
      hookId: `state-hook-preview-${result.length + 1}`,
    });
  }

  return result;
}

function inferStateHooks(
  sourceActivityText: string,
  valueObjectCandidateCount: number,
  reviewCandidateCount: number
): StateHookDisplayV0[] {
  const normalized = normalizeText(sourceActivityText);
  const hooks: StateHookDisplayV0[] = [];

  if (normalized.length === 0) {
    return [];
  }

  if (hasAny(normalized, ["study", "studied", "learn", "learning", "math", "mathematics", "учил", "nauka", "lernen"])) {
    hooks.push(
      makeHook(
        hooks.length,
        normalized,
        "Learning effort signal",
        "Activity contains learning/study context.",
        "learning",
        "monitoring_suggestion",
        "neutral",
        "candidate"
      )
    );

    hooks.push(
      makeHook(
        hooks.length,
        normalized,
        "Cognitive load signal",
        "Learning activity may require attention and cognitive effort.",
        "cognitive_load",
        "possible_state_snapshot_input",
        "increase",
        "needs_user_review"
      )
    );
  }

  if (hasAny(normalized, ["child", "kid", "dzieck", "реб", "kind"])) {
    hooks.push(
      makeHook(
        hooks.length,
        normalized,
        "Family/care duty load signal",
        "Activity mentions a child and may represent care/responsibility load.",
        "family_care",
        "monitoring_suggestion",
        "increase",
        "candidate"
      )
    );
  }

  if (hasAny(normalized, ["tired", "fatigue", "sleep", "rest", "recovery", "устал", "сон", "odpoczynek"])) {
    hooks.push(
      makeHook(
        hooks.length,
        normalized,
        "Possible fatigue/recovery signal",
        "Activity text contains fatigue, sleep, rest or recovery signal.",
        "fatigue",
        "review_prompt",
        "unknown",
        "needs_sensor_or_manual_confirmation"
      )
    );
  }

  if (hasAny(normalized, ["service", "offer", "certificate", "product", "booking", "sales", "client", "b2b", "money", "payment"])) {
    hooks.push(
      makeHook(
        hooks.length,
        normalized,
        "Business/money attention signal",
        "Activity text contains business, product, offer, certificate, client or money signal.",
        "business",
        "monitoring_suggestion",
        "neutral",
        "needs_user_review"
      )
    );

    hooks.push(
      makeHook(
        hooks.length,
        normalized,
        "Possible money-related review signal",
        "Money/business context may be useful for later review but is not financial advice.",
        "money",
        "review_prompt",
        "unknown",
        "needs_user_review"
      )
    );
  }

  if (valueObjectCandidateCount > 0) {
    hooks.push(
      makeHook(
        hooks.length,
        normalized,
        "Value-area tracking signal",
        "Value Object candidates exist; a later state hook may connect activity to tracked value areas.",
        "productivity",
        "monitoring_suggestion",
        "neutral",
        "candidate"
      )
    );
  }

  if (reviewCandidateCount > 0) {
    hooks.push(
      makeHook(
        hooks.length,
        normalized,
        "Review-dependent state hook",
        "Semantic Review produced provisional candidates; state hook requires later review.",
        "risk",
        "review_prompt",
        "unknown",
        "needs_context"
      )
    );
  }

  if (hooks.length === 0) {
    hooks.push(
      makeHook(
        hooks.length,
        normalized,
        "General time allocation signal",
        "Fallback hook for meaningful activity time allocation.",
        "productivity",
        "monitoring_suggestion",
        "neutral",
        "candidate"
      )
    );
  }

  return dedupeHooks(hooks);
}

function buildPanelDraft(): StateHookPreviewResultV0["stateHookPanelDraft"] {
  return {
    title: "State hooks",
    userFacingTitleRu: "Сигналы состояния",
    status: "not_confirmed_yet",
    notConfirmedYet: true,
    notMeasuredYet: true,
    notSavedYet: true,
    notAppliedYet: true,
    canCreateStateFactNow: false,
    canCreateStateDeltaNow: false,
    canUpdateStateSnapshotNow: false,
    requiresFutureStateWriteGate: true,
  };
}

export function runStateHookPreviewAdapterV0(
  input: StateHookPreviewInputV0
): StateHookPreviewResultV0 {
  const forbiddenFields = detectForbiddenFields(input);

  if (forbiddenFields.length > 0) {
    return {
      ok: false,
      httpStatus: 400,
      adapterVersion: STATE_HOOK_PREVIEW_ADAPTER_VERSION,
      routeMode: STATE_HOOK_PREVIEW_ROUTE_MODE,
      sourceValueObjectRouteMode: VALUE_OBJECT_CANDIDATE_DISPLAY_ROUTE_MODE,
      stateHookPreviewReady: false,
      sourceValueObjectPreviewReady: false,
      internalServiceCalled: false,
      debugRouteCalled: false,
      hookCount: 0,
      hooks: [],
      stateHookPanelDraft: buildPanelDraft(),
      sourceDiagnostics: {
        valueObjectCandidateCount: 0,
        valueObjectCandidateDisplayReady: false,
        reviewCandidateCount: 0,
        transactionStepCount: 0,
        blockedAuditTransactionStepCount: 0,
      },
      sideEffects: SIDE_EFFECTS,
      errors: [
        `State hook preview denies write/conclusion flags: ${forbiddenFields.join(", ")}`,
      ],
      warnings: [
        "No State hook was produced because forbidden write/conclusion flags were supplied.",
        "No State Fact was created.",
        "No State Delta was created.",
        "No State Snapshot was created.",
      ],
    };
  }

  const sourceValueObjectPreview = runValueObjectCandidateDisplayAdapterV0(input);

  const sourceDiagnostics = {
    valueObjectCandidateCount: sourceValueObjectPreview.candidateCount,
    valueObjectCandidateDisplayReady:
      sourceValueObjectPreview.valueObjectCandidateDisplayReady,
    reviewCandidateCount:
      sourceValueObjectPreview.sourceDiagnostics.reviewCandidateCount,
    transactionStepCount:
      sourceValueObjectPreview.sourceDiagnostics.transactionStepCount,
    blockedAuditTransactionStepCount:
      sourceValueObjectPreview.sourceDiagnostics.blockedAuditTransactionStepCount,
  };

  if (!sourceValueObjectPreview.ok) {
    return {
      ok: false,
      httpStatus: sourceValueObjectPreview.httpStatus === 400 ? 400 : 500,
      adapterVersion: STATE_HOOK_PREVIEW_ADAPTER_VERSION,
      routeMode: STATE_HOOK_PREVIEW_ROUTE_MODE,
      sourceValueObjectRouteMode: VALUE_OBJECT_CANDIDATE_DISPLAY_ROUTE_MODE,
      stateHookPreviewReady: false,
      sourceValueObjectPreviewReady: false,
      internalServiceCalled: sourceValueObjectPreview.internalServiceCalled,
      debugRouteCalled: false,
      hookCount: 0,
      hooks: [],
      stateHookPanelDraft: buildPanelDraft(),
      sourceDiagnostics,
      sideEffects: SIDE_EFFECTS,
      errors: sourceValueObjectPreview.errors,
      warnings: [
        ...sourceValueObjectPreview.warnings,
        "State hooks were not produced because source Value Object preview was denied.",
        "No State Fact was created.",
      ],
    };
  }

  const sourceActivityText =
    typeof input.rawText === "string" ? normalizeText(input.rawText) : "";

  const hooks = inferStateHooks(
    sourceActivityText,
    sourceValueObjectPreview.candidateCount,
    sourceValueObjectPreview.sourceDiagnostics.reviewCandidateCount
  );

  return {
    ok: true,
    httpStatus: 200,
    adapterVersion: STATE_HOOK_PREVIEW_ADAPTER_VERSION,
    routeMode: STATE_HOOK_PREVIEW_ROUTE_MODE,
    sourceValueObjectRouteMode: VALUE_OBJECT_CANDIDATE_DISPLAY_ROUTE_MODE,
    stateHookPreviewReady: true,
    sourceValueObjectPreviewReady: true,
    internalServiceCalled: sourceValueObjectPreview.internalServiceCalled,
    debugRouteCalled: false,
    hookCount: hooks.length,
    hooks,
    stateHookPanelDraft: buildPanelDraft(),
    sourceDiagnostics,
    sideEffects: SIDE_EFFECTS,
    errors: sourceValueObjectPreview.errors,
    warnings: [
      ...sourceValueObjectPreview.warnings,
      "State hooks are provisional.",
      "This is a State hook, not a confirmed State Fact.",
      "No State Fact was created.",
      "No State Delta was created.",
      "No State Snapshot was created.",
      "No Semantic Capital was written.",
      "No medical/financial/productivity conclusion was created as truth.",
    ],
  };
}
