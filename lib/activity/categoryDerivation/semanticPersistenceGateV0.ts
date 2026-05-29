import type {
  ResolvedCategoryCandidateV3,
  SemanticDerivationV3Result,
} from "./semanticContractV3";
import type {
  ActivityValueObjectExposureCandidateV0,
} from "./semanticActivityValueObjectExposureV0";
import type {
  SemanticReviewActionCandidateV0,
} from "./semanticReviewActionContractV0";
import type {
  StateDeltaCandidateV0,
} from "./semanticStateDeltaCandidatePolicyV0";
import type {
  ValueObjectCandidateV0,
} from "./semanticValueObjectCandidatePolicyV0";

export type SemanticPersistenceGatePolicyV0 =
  "semantic_persistence_gate_design_v0";

export type SemanticPersistenceGateModeV0 =
  | "read_only_persistence_gate_preview"
  | "blocked_until_explicit_gate";

export type SemanticPersistenceGateBlockerCodeV0 =
  | "read_only_preview_mode"
  | "explicit_persistence_gate_not_open"
  | "missing_authenticated_actor_context"
  | "missing_rls_runtime_verification"
  | "ambiguous_value_object_scope"
  | "state_fact_creation_forbidden"
  | "review_action_would_write_now"
  | "unsafe_state_delta_persistence_flag";

export type SemanticPersistenceGateTargetTypeV0 =
  | "activity_event"
  | "category_resolution"
  | "value_object_candidate"
  | "activity_value_object_exposure"
  | "state_delta_candidate"
  | "review_action";

export type SemanticPersistenceGateTargetStatusV0 =
  | "blocked_now"
  | "eligible_after_explicit_gate"
  | "requires_user_confirmation"
  | "forbidden_as_state_fact";

export type SemanticPersistenceGateBlockerV0 = {
  code: SemanticPersistenceGateBlockerCodeV0;
  message: string;
  severity: "info" | "warning" | "blocking";
};

export type SemanticPersistenceGateTargetV0 = {
  targetType: SemanticPersistenceGateTargetTypeV0;
  targetKey: string;
  targetTitle: string;
  status: SemanticPersistenceGateTargetStatusV0;
  confidence: number | null;
  reason: string;
};

export type SemanticPersistenceGateDecisionV0 = {
  policy: SemanticPersistenceGatePolicyV0;
  mode: SemanticPersistenceGateModeV0;
  canPersistNow: false;
  canCreateActivityEventNow: false;
  canCreateValueObjectNow: false;
  canCreateActivityValueObjectLinkNow: false;
  canCreateStateDeltaNow: false;
  canCreateStateFactNow: false;
  canCreateStateSnapshotNow: false;
  requiresExplicitGate: true;
  requiresAuthenticatedActor: true;
  requiresRlsRuntimeVerification: true;
  requiresUserReview: boolean;
  eligibleFutureTargets: SemanticPersistenceGateTargetV0[];
  blockedNowTargets: SemanticPersistenceGateTargetV0[];
  blockers: SemanticPersistenceGateBlockerV0[];
  warnings: string[];
  safetyNotes: string[];
  counts: {
    resolvedCategories: number;
    valueObjectCandidates: number;
    exposureCandidates: number;
    stateDeltaCandidates: number;
    reviewActionCandidates: number;
    eligibleFutureTargets: number;
    blockedNowTargets: number;
  };
};

export type BuildSemanticPersistenceGateV0Params = {
  inputText: string;
  semanticV3: SemanticDerivationV3Result;
  valueObjectCandidates: ValueObjectCandidateV0[];
  exposureCandidates: ActivityValueObjectExposureCandidateV0[];
  stateDeltaCandidates: StateDeltaCandidateV0[];
  reviewActionCandidates: SemanticReviewActionCandidateV0[];
};

function clamp(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
}

function addBlockerIfMissing(
  blockers: SemanticPersistenceGateBlockerV0[],
  blocker: SemanticPersistenceGateBlockerV0
): void {
  if (blockers.some((item) => item.code === blocker.code)) {
    return;
  }

  blockers.push(blocker);
}

function addTargetIfMissing(
  targets: SemanticPersistenceGateTargetV0[],
  target: SemanticPersistenceGateTargetV0
): void {
  if (
    targets.some(
      (item) =>
        item.targetType === target.targetType &&
        item.targetKey === target.targetKey &&
        item.status === target.status
    )
  ) {
    return;
  }

  targets.push(target);
}

function buildTarget(params: {
  targetType: SemanticPersistenceGateTargetTypeV0;
  targetKey: string;
  targetTitle: string;
  status: SemanticPersistenceGateTargetStatusV0;
  confidence?: number | null;
  reason: string;
}): SemanticPersistenceGateTargetV0 {
  return {
    targetType: params.targetType,
    targetKey: params.targetKey,
    targetTitle: params.targetTitle,
    status: params.status,
    confidence: clamp(params.confidence),
    reason: params.reason,
  };
}

function categoryTitle(category: ResolvedCategoryCandidateV3): string {
  return category.canonicalSlug || category.candidateSlug || "category";
}

function addCategoryTargets(
  eligibleFutureTargets: SemanticPersistenceGateTargetV0[],
  blockedNowTargets: SemanticPersistenceGateTargetV0[],
  category: ResolvedCategoryCandidateV3
): void {
  const key = category.candidateSlug || category.canonicalSlug || "category";
  const title = categoryTitle(category);

  addTargetIfMissing(
    blockedNowTargets,
    buildTarget({
      targetType: "category_resolution",
      targetKey: key,
      targetTitle: title,
      status: "blocked_now",
      confidence: category.confidence,
      reason:
        "Category resolution cannot be persisted from read-only semantic preview mode.",
    })
  );

  addTargetIfMissing(
    eligibleFutureTargets,
    buildTarget({
      targetType: "category_resolution",
      targetKey: key,
      targetTitle: title,
      status: category.needsUserConfirmation
        ? "requires_user_confirmation"
        : "eligible_after_explicit_gate",
      confidence: category.confidence,
      reason:
        "Resolved category may become persistence-eligible after explicit gate, actor context, RLS verification and review policy.",
    })
  );
}

function addValueObjectTargets(
  eligibleFutureTargets: SemanticPersistenceGateTargetV0[],
  blockedNowTargets: SemanticPersistenceGateTargetV0[],
  vo: ValueObjectCandidateV0
): void {
  addTargetIfMissing(
    blockedNowTargets,
    buildTarget({
      targetType: "value_object_candidate",
      targetKey: vo.candidateKey,
      targetTitle: vo.suggestedTitle,
      status: "blocked_now",
      confidence: vo.confidence,
      reason:
        "Value Object creation is forbidden in read-only preview mode.",
    })
  );

  addTargetIfMissing(
    eligibleFutureTargets,
    buildTarget({
      targetType: "value_object_candidate",
      targetKey: vo.candidateKey,
      targetTitle: vo.suggestedTitle,
      status:
        vo.needsUserConfirmation || vo.scope === "unknown"
          ? "requires_user_confirmation"
          : "eligible_after_explicit_gate",
      confidence: vo.confidence,
      reason:
        "Value Object candidate may be created or linked later only after scope, actor ownership and persistence gate are confirmed.",
    })
  );
}

function addExposureTargets(
  eligibleFutureTargets: SemanticPersistenceGateTargetV0[],
  blockedNowTargets: SemanticPersistenceGateTargetV0[],
  exposure: ActivityValueObjectExposureCandidateV0
): void {
  addTargetIfMissing(
    blockedNowTargets,
    buildTarget({
      targetType: "activity_value_object_exposure",
      targetKey: exposure.exposureKey,
      targetTitle: exposure.valueObjectSuggestedTitle,
      status: "blocked_now",
      confidence: exposure.confidence,
      reason:
        "Activity-to-Value-Object link cannot be created from read-only preview mode.",
    })
  );

  addTargetIfMissing(
    eligibleFutureTargets,
    buildTarget({
      targetType: "activity_value_object_exposure",
      targetKey: exposure.exposureKey,
      targetTitle: exposure.valueObjectSuggestedTitle,
      status:
        exposure.needsUserConfirmation || !exposure.shouldCreateActivityLink
          ? "requires_user_confirmation"
          : "eligible_after_explicit_gate",
      confidence: exposure.confidence,
      reason:
        "Exposure candidate may become an activity link later only after explicit gate and user/actor context checks.",
    })
  );
}

function addStateDeltaTargets(
  eligibleFutureTargets: SemanticPersistenceGateTargetV0[],
  blockedNowTargets: SemanticPersistenceGateTargetV0[],
  delta: StateDeltaCandidateV0
): void {
  addTargetIfMissing(
    blockedNowTargets,
    buildTarget({
      targetType: "state_delta_candidate",
      targetKey: delta.deltaKey,
      targetTitle: delta.targetValueObjectSuggestedTitle,
      status: "blocked_now",
      confidence: delta.confidence,
      reason:
        "State delta persistence is forbidden in read-only preview mode.",
    })
  );

  addTargetIfMissing(
    blockedNowTargets,
    buildTarget({
      targetType: "state_delta_candidate",
      targetKey: `${delta.deltaKey}:state-fact`,
      targetTitle: delta.targetValueObjectSuggestedTitle,
      status: "forbidden_as_state_fact",
      confidence: delta.confidence,
      reason:
        "A state delta candidate must not be converted into a state fact or snapshot by this preview layer.",
    })
  );

  addTargetIfMissing(
    eligibleFutureTargets,
    buildTarget({
      targetType: "state_delta_candidate",
      targetKey: delta.deltaKey,
      targetTitle: delta.targetValueObjectSuggestedTitle,
      status:
        delta.eligibleForFutureStateDelta && !delta.needsUserConfirmation
          ? "eligible_after_explicit_gate"
          : "requires_user_confirmation",
      confidence: delta.confidence,
      reason:
        "State delta candidate may be persisted later only after evidence, actor context, RLS, review approval and explicit persistence gate.",
    })
  );
}

function addReviewActionTargets(
  eligibleFutureTargets: SemanticPersistenceGateTargetV0[],
  blockedNowTargets: SemanticPersistenceGateTargetV0[],
  action: SemanticReviewActionCandidateV0
): void {
  addTargetIfMissing(
    blockedNowTargets,
    buildTarget({
      targetType: "review_action",
      targetKey: action.actionKey,
      targetTitle: action.label,
      status: "blocked_now",
      confidence: action.confidence,
      reason:
        "Review actions are only candidates in this mode; pressing a real button must call a separate persistence-gated route later.",
    })
  );

  addTargetIfMissing(
    eligibleFutureTargets,
    buildTarget({
      targetType: "review_action",
      targetKey: action.actionKey,
      targetTitle: action.label,
      status:
        action.requiresUserInput || action.riskLevel !== "read_only"
          ? "requires_user_confirmation"
          : "eligible_after_explicit_gate",
      confidence: action.confidence,
      reason:
        "Review action may become executable later only through a dedicated route with explicit persistence gate.",
    })
  );
}

export function buildSemanticPersistenceGateV0(
  params: BuildSemanticPersistenceGateV0Params
): SemanticPersistenceGateDecisionV0 {
  const eligibleFutureTargets: SemanticPersistenceGateTargetV0[] = [];
  const blockedNowTargets: SemanticPersistenceGateTargetV0[] = [];
  const blockers: SemanticPersistenceGateBlockerV0[] = [];
  const warnings: string[] = [];

  addBlockerIfMissing(blockers, {
    code: "read_only_preview_mode",
    message:
      "Current semantic preview pipeline is intentionally read-only.",
    severity: "blocking",
  });

  addBlockerIfMissing(blockers, {
    code: "explicit_persistence_gate_not_open",
    message:
      "No explicit persistence gate has been opened for this request.",
    severity: "blocking",
  });

  addBlockerIfMissing(blockers, {
    code: "missing_authenticated_actor_context",
    message:
      "Preview pipeline has no authenticated actor/user ownership context.",
    severity: "blocking",
  });

  addBlockerIfMissing(blockers, {
    code: "missing_rls_runtime_verification",
    message:
      "RLS/runtime ownership verification is not part of this preview request.",
    severity: "blocking",
  });

  addTargetIfMissing(
    blockedNowTargets,
    buildTarget({
      targetType: "activity_event",
      targetKey: "activity_event:preview-only",
      targetTitle: params.inputText,
      status: "blocked_now",
      confidence: 1,
      reason:
        "Raw activity text is previewed only; no activity_event row is inserted.",
    })
  );

  addTargetIfMissing(
    eligibleFutureTargets,
    buildTarget({
      targetType: "activity_event",
      targetKey: "activity_event:future",
      targetTitle: params.inputText,
      status: "eligible_after_explicit_gate",
      confidence: 1,
      reason:
        "Activity event may be persisted later after authenticated actor context and explicit persistence gate.",
    })
  );

  for (const category of params.semanticV3.resolvedCategoryCandidates) {
    addCategoryTargets(eligibleFutureTargets, blockedNowTargets, category);
  }

  for (const vo of params.valueObjectCandidates) {
    addValueObjectTargets(eligibleFutureTargets, blockedNowTargets, vo);

    if (vo.scope === "unknown") {
      addBlockerIfMissing(blockers, {
        code: "ambiguous_value_object_scope",
        message:
          "At least one Value Object candidate has unknown personal/organization scope.",
        severity: "warning",
      });

      warnings.push(
        `Value Object scope must be clarified before persistence: ${vo.candidateKey}`
      );
    }
  }

  for (const exposure of params.exposureCandidates) {
    addExposureTargets(eligibleFutureTargets, blockedNowTargets, exposure);
  }

  for (const delta of params.stateDeltaCandidates) {
    addStateDeltaTargets(eligibleFutureTargets, blockedNowTargets, delta);

    if (delta.shouldPersistNow !== false) {
      addBlockerIfMissing(blockers, {
        code: "unsafe_state_delta_persistence_flag",
        message:
          "A state delta candidate is not explicitly marked shouldPersistNow=false.",
        severity: "blocking",
      });
    }

    if (delta.notAStateFactYet !== true) {
      addBlockerIfMissing(blockers, {
        code: "state_fact_creation_forbidden",
        message:
          "State candidate must remain notAStateFactYet=true in preview mode.",
        severity: "blocking",
      });
    }
  }

  for (const action of params.reviewActionCandidates) {
    addReviewActionTargets(eligibleFutureTargets, blockedNowTargets, action);

    if (action.wouldWriteNow !== false) {
      addBlockerIfMissing(blockers, {
        code: "review_action_would_write_now",
        message:
          "A review action candidate is not explicitly marked wouldWriteNow=false.",
        severity: "blocking",
      });
    }
  }

  const requiresUserReview =
    params.semanticV3.resolvedCategoryCandidates.length > 0 ||
    params.valueObjectCandidates.length > 0 ||
    params.exposureCandidates.length > 0 ||
    params.stateDeltaCandidates.length > 0 ||
    params.reviewActionCandidates.length > 0;

  return {
    policy: "semantic_persistence_gate_design_v0",
    mode: "read_only_persistence_gate_preview",
    canPersistNow: false,
    canCreateActivityEventNow: false,
    canCreateValueObjectNow: false,
    canCreateActivityValueObjectLinkNow: false,
    canCreateStateDeltaNow: false,
    canCreateStateFactNow: false,
    canCreateStateSnapshotNow: false,
    requiresExplicitGate: true,
    requiresAuthenticatedActor: true,
    requiresRlsRuntimeVerification: true,
    requiresUserReview,
    eligibleFutureTargets,
    blockedNowTargets,
    blockers,
    warnings,
    safetyNotes: [
      "This persistence gate is a design/decision layer only.",
      "It performs no SQL, no Supabase insert and no state write.",
      "State hooks and state delta candidates are not state facts.",
      "Any future persistence route must require authenticated actor context, RLS verification and an explicit gate.",
      "Do not persist AI/external-derived categories as active global categories without resolver/governance approval.",
    ],
    counts: {
      resolvedCategories: params.semanticV3.resolvedCategoryCandidates.length,
      valueObjectCandidates: params.valueObjectCandidates.length,
      exposureCandidates: params.exposureCandidates.length,
      stateDeltaCandidates: params.stateDeltaCandidates.length,
      reviewActionCandidates: params.reviewActionCandidates.length,
      eligibleFutureTargets: eligibleFutureTargets.length,
      blockedNowTargets: blockedNowTargets.length,
    },
  };
}
