import type {
  ResolvedCategoryCandidateV3,
  SemanticDerivationV3Result,
} from "./semanticContractV3";
import type {
  ActivityValueObjectExposureCandidateV0,
} from "./semanticActivityValueObjectExposureV0";
import type {
  StateDeltaCandidateV0,
} from "./semanticStateDeltaCandidatePolicyV0";
import type {
  ValueObjectCandidateV0,
} from "./semanticValueObjectCandidatePolicyV0";

export type SemanticReviewActionKindV0 =
  | "confirm_category"
  | "reject_category"
  | "correct_category"
  | "confirm_value_object_candidate"
  | "reject_value_object_candidate"
  | "request_value_object_context"
  | "confirm_exposure_candidate"
  | "suppress_exposure_candidate"
  | "allow_future_state_delta_candidate"
  | "block_future_state_delta_candidate"
  | "request_user_context"
  | "open_raw_json";

export type SemanticReviewActionTargetTypeV0 =
  | "category"
  | "value_object_candidate"
  | "exposure_candidate"
  | "state_delta_candidate"
  | "pipeline";

export type SemanticReviewActionRiskLevelV0 =
  | "read_only"
  | "requires_user_confirmation"
  | "requires_persistence_gate";

export type SemanticReviewActionCandidateV0 = {
  actionKey: string;
  actionKind: SemanticReviewActionKindV0;
  label: string;
  targetType: SemanticReviewActionTargetTypeV0;
  targetKey: string;
  targetTitle: string;
  riskLevel: SemanticReviewActionRiskLevelV0;
  enabledInReadOnly: true;
  wouldWriteNow: false;
  requiresUserInput: boolean;
  requiresPersistenceGate: boolean;
  confidence: number | null;
  reasoning: string;
  safetyNotes: string[];
};

export type BuildSemanticReviewActionCandidatesV0Params = {
  semanticV3: SemanticDerivationV3Result;
  valueObjectCandidates: ValueObjectCandidateV0[];
  exposureCandidates: ActivityValueObjectExposureCandidateV0[];
  stateDeltaCandidates: StateDeltaCandidateV0[];
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

function addActionIfMissing(
  result: SemanticReviewActionCandidateV0[],
  action: SemanticReviewActionCandidateV0
): void {
  if (result.some((item) => item.actionKey === action.actionKey)) {
    return;
  }

  result.push(action);
}

function buildAction(params: {
  actionKey: string;
  actionKind: SemanticReviewActionKindV0;
  label: string;
  targetType: SemanticReviewActionTargetTypeV0;
  targetKey: string;
  targetTitle: string;
  riskLevel?: SemanticReviewActionRiskLevelV0;
  requiresUserInput?: boolean;
  requiresPersistenceGate?: boolean;
  confidence?: number | null;
  reasoning: string;
  safetyNotes?: string[];
}): SemanticReviewActionCandidateV0 {
  return {
    actionKey: params.actionKey,
    actionKind: params.actionKind,
    label: params.label,
    targetType: params.targetType,
    targetKey: params.targetKey,
    targetTitle: params.targetTitle,
    riskLevel: params.riskLevel ?? "read_only",
    enabledInReadOnly: true,
    wouldWriteNow: false,
    requiresUserInput: params.requiresUserInput ?? false,
    requiresPersistenceGate: params.requiresPersistenceGate ?? true,
    confidence: clamp(params.confidence),
    reasoning: params.reasoning,
    safetyNotes: params.safetyNotes ?? [
      "This is a review action candidate only.",
      "No database write is performed by this contract.",
    ],
  };
}

function categoryTitle(category: ResolvedCategoryCandidateV3): string {
  return category.canonicalSlug || category.candidateSlug || "category";
}

function addCategoryActions(
  result: SemanticReviewActionCandidateV0[],
  category: ResolvedCategoryCandidateV3
): void {
  const key = category.candidateSlug;
  const title = categoryTitle(category);

  addActionIfMissing(
    result,
    buildAction({
      actionKey: `review:category:${key}:confirm`,
      actionKind: "confirm_category",
      label: `Confirm category: ${title}`,
      targetType: "category",
      targetKey: key,
      targetTitle: title,
      riskLevel: category.needsUserConfirmation
        ? "requires_user_confirmation"
        : "read_only",
      confidence: category.confidence,
      reasoning:
        "The reviewer can confirm that this resolved category belongs to the activity.",
    })
  );

  addActionIfMissing(
    result,
    buildAction({
      actionKey: `review:category:${key}:reject`,
      actionKind: "reject_category",
      label: `Reject category: ${title}`,
      targetType: "category",
      targetKey: key,
      targetTitle: title,
      confidence: category.confidence,
      reasoning:
        "The reviewer can reject this category before it is used for Value Object or state processing.",
    })
  );

  addActionIfMissing(
    result,
    buildAction({
      actionKey: `review:category:${key}:correct`,
      actionKind: "correct_category",
      label: `Correct category: ${title}`,
      targetType: "category",
      targetKey: key,
      targetTitle: title,
      riskLevel: "requires_user_confirmation",
      requiresUserInput: true,
      confidence: category.confidence,
      reasoning:
        "The reviewer can provide a corrected category label, layer or semantic role.",
      safetyNotes: [
        "Correction requires user input.",
        "The corrected value must still pass resolver/governance before persistence.",
      ],
    })
  );
}

function addValueObjectActions(
  result: SemanticReviewActionCandidateV0[],
  vo: ValueObjectCandidateV0
): void {
  addActionIfMissing(
    result,
    buildAction({
      actionKey: `review:vo:${vo.candidateKey}:confirm`,
      actionKind: "confirm_value_object_candidate",
      label: `Confirm VO candidate: ${vo.suggestedTitle}`,
      targetType: "value_object_candidate",
      targetKey: vo.candidateKey,
      targetTitle: vo.suggestedTitle,
      riskLevel: vo.needsUserConfirmation
        ? "requires_user_confirmation"
        : "read_only",
      confidence: vo.confidence,
      reasoning:
        "The reviewer can confirm that this Value Object candidate is a correct target for the activity.",
    })
  );

  addActionIfMissing(
    result,
    buildAction({
      actionKey: `review:vo:${vo.candidateKey}:reject`,
      actionKind: "reject_value_object_candidate",
      label: `Reject VO candidate: ${vo.suggestedTitle}`,
      targetType: "value_object_candidate",
      targetKey: vo.candidateKey,
      targetTitle: vo.suggestedTitle,
      confidence: vo.confidence,
      reasoning:
        "The reviewer can reject this Value Object candidate before any future creation/linking.",
    })
  );

  if (vo.scope === "unknown" || vo.needsUserConfirmation) {
    addActionIfMissing(
      result,
      buildAction({
        actionKey: `review:vo:${vo.candidateKey}:request-context`,
        actionKind: "request_value_object_context",
        label: `Ask context for VO: ${vo.suggestedTitle}`,
        targetType: "value_object_candidate",
        targetKey: vo.candidateKey,
        targetTitle: vo.suggestedTitle,
        riskLevel: "requires_user_confirmation",
        requiresUserInput: true,
        confidence: vo.confidence,
        reasoning:
          "This VO needs actor/scope/context clarification before it can be safely used.",
        safetyNotes: [
          "Do not create personal or organization Value Object until scope is known.",
          "This action only asks for missing context.",
        ],
      })
    );
  }
}

function addExposureActions(
  result: SemanticReviewActionCandidateV0[],
  exposure: ActivityValueObjectExposureCandidateV0
): void {
  addActionIfMissing(
    result,
    buildAction({
      actionKey: `review:exposure:${exposure.exposureKey}:confirm`,
      actionKind: "confirm_exposure_candidate",
      label: `Confirm exposure: ${exposure.activityLinkType}`,
      targetType: "exposure_candidate",
      targetKey: exposure.exposureKey,
      targetTitle: exposure.valueObjectSuggestedTitle,
      riskLevel: exposure.needsUserConfirmation
        ? "requires_user_confirmation"
        : "read_only",
      confidence: exposure.confidence,
      reasoning:
        "The reviewer can confirm that this activity-to-VO relation is correct.",
    })
  );

  addActionIfMissing(
    result,
    buildAction({
      actionKey: `review:exposure:${exposure.exposureKey}:suppress`,
      actionKind: "suppress_exposure_candidate",
      label: `Suppress exposure: ${exposure.activityLinkType}`,
      targetType: "exposure_candidate",
      targetKey: exposure.exposureKey,
      targetTitle: exposure.valueObjectSuggestedTitle,
      confidence: exposure.confidence,
      reasoning:
        "The reviewer can suppress this exposure so it will not become a future activity link.",
    })
  );
}

function addStateDeltaActions(
  result: SemanticReviewActionCandidateV0[],
  delta: StateDeltaCandidateV0
): void {
  addActionIfMissing(
    result,
    buildAction({
      actionKey: `review:state-delta:${delta.deltaKey}:allow-future`,
      actionKind: "allow_future_state_delta_candidate",
      label: `Allow future delta: ${delta.dimensionKey}`,
      targetType: "state_delta_candidate",
      targetKey: delta.deltaKey,
      targetTitle: delta.targetValueObjectSuggestedTitle,
      riskLevel: "requires_persistence_gate",
      confidence: delta.confidence,
      reasoning:
        "The reviewer can mark this candidate as acceptable for future state-delta persistence after the persistence gate.",
      safetyNotes: [
        "This action does not persist a state delta now.",
        "Future persistence requires actor context, RLS policy, evidence and explicit gate.",
      ],
    })
  );

  addActionIfMissing(
    result,
    buildAction({
      actionKey: `review:state-delta:${delta.deltaKey}:block`,
      actionKind: "block_future_state_delta_candidate",
      label: `Block future delta: ${delta.dimensionKey}`,
      targetType: "state_delta_candidate",
      targetKey: delta.deltaKey,
      targetTitle: delta.targetValueObjectSuggestedTitle,
      confidence: delta.confidence,
      reasoning:
        "The reviewer can block this candidate from becoming a future state delta.",
    })
  );
}

export function buildSemanticReviewActionCandidatesV0(
  params: BuildSemanticReviewActionCandidatesV0Params
): SemanticReviewActionCandidateV0[] {
  const result: SemanticReviewActionCandidateV0[] = [];

  for (const category of params.semanticV3.resolvedCategoryCandidates) {
    addCategoryActions(result, category);
  }

  for (const vo of params.valueObjectCandidates) {
    addValueObjectActions(result, vo);
  }

  for (const exposure of params.exposureCandidates) {
    addExposureActions(result, exposure);
  }

  for (const delta of params.stateDeltaCandidates) {
    addStateDeltaActions(result, delta);
  }

  addActionIfMissing(
    result,
    buildAction({
      actionKey: "review:pipeline:open-raw-json",
      actionKind: "open_raw_json",
      label: "Open raw semantic preview JSON",
      targetType: "pipeline",
      targetKey: "semantic_preview_pipeline_v0",
      targetTitle: "Semantic preview pipeline",
      riskLevel: "read_only",
      requiresPersistenceGate: false,
      confidence: null,
      reasoning:
        "The reviewer can inspect the full raw response before confirming any semantic layer.",
      safetyNotes: [
        "Raw JSON view is read-only.",
      ],
    })
  );

  return result;
}
