import type {
  RealityContextRuntimePurpose,
  StatementRoutingScope,
} from "./realityContextTypes";

export type RealityContextPolicy = {
  readonly runtimePurpose: RealityContextRuntimePurpose;
  readonly allowedContextFamilies: readonly string[];
  readonly maximumStructuralDepth: number;
  readonly allowSemanticRelationExpansion: boolean;
  readonly allowDerivedState: boolean;
  readonly requireDerivationReferenceForDerivedState: boolean;
};

export const REALITY_CONTEXT_POLICIES:
  Readonly<Record<RealityContextRuntimePurpose, RealityContextPolicy>> = {
  goal_intake: {
    runtimePurpose: "goal_intake",
    allowedContextFamilies: [
      "goal_relevant_value_objects",
      "current_state",
      "recent_relevant_observations",
      "goal_relevant_actor_context",
    ],
    maximumStructuralDepth: 4,
    allowSemanticRelationExpansion: true,
    allowDerivedState: true,
    requireDerivationReferenceForDerivedState: true,
  },
  goal_world_compile: {
    runtimePurpose: "goal_world_compile",
    allowedContextFamilies: [
      "goal_definition",
      "goal_relevant_value_objects",
      "current_state",
      "relevant_relationships",
      "relevant_resources_constraints",
      "relevant_behavioral_patterns",
    ],
    maximumStructuralDepth: 6,
    allowSemanticRelationExpansion: true,
    allowDerivedState: true,
    requireDerivationReferenceForDerivedState: true,
  },
  activity_interpretation: {
    runtimePurpose: "activity_interpretation",
    allowedContextFamilies: [
      "activity_target_candidates",
      "recent_relevant_observations",
      "current_state",
    ],
    maximumStructuralDepth: 4,
    allowSemanticRelationExpansion: true,
    allowDerivedState: true,
    requireDerivationReferenceForDerivedState: true,
  },
  analytics: {
    runtimePurpose: "analytics",
    allowedContextFamilies: [
      "selected_analysis_scope",
      "observation_history",
      "derived_state_history",
      "relevant_activities",
      "behavioral_trajectory",
    ],
    maximumStructuralDepth: 8,
    allowSemanticRelationExpansion: true,
    allowDerivedState: true,
    requireDerivationReferenceForDerivedState: true,
  },
  suitability_analysis: {
    runtimePurpose: "suitability_analysis",
    allowedContextFamilies: [
      "candidate_relevant_capabilities",
      "current_state",
      "trajectory",
      "resources_constraints",
      "preferences_self_reported",
      "behavioral_patterns_observed",
      "stress_recovery_patterns",
      "environment_lifestyle_response",
      "family_social_context",
    ],
    maximumStructuralDepth: 6,
    allowSemanticRelationExpansion: true,
    allowDerivedState: true,
    requireDerivationReferenceForDerivedState: true,
  },
  decision_support: {
    runtimePurpose: "decision_support",
    allowedContextFamilies: [
      "decision_relevant_state",
      "resources_constraints",
      "preferences_self_reported",
      "behavioral_patterns_observed",
      "goal_context",
    ],
    maximumStructuralDepth: 6,
    allowSemanticRelationExpansion: true,
    allowDerivedState: true,
    requireDerivationReferenceForDerivedState: true,
  },
} as const;

export function isCanonicalRealityRoutingScope(
  scope: StatementRoutingScope,
): boolean {
  return scope === "reality_candidate" || scope === "both";
}

export function validateRealityContextPolicy(
  policy: RealityContextPolicy,
): readonly string[] {
  const errors: string[] = [];

  if (policy.maximumStructuralDepth < 0) {
    errors.push("REALITY_CONTEXT_DEPTH_NEGATIVE");
  }

  if (
    policy.allowDerivedState &&
    !policy.requireDerivationReferenceForDerivedState
  ) {
    errors.push(
      "REALITY_CONTEXT_DERIVED_STATE_REQUIRES_DERIVATION_REF",
    );
  }

  if (policy.allowedContextFamilies.length === 0) {
    errors.push("REALITY_CONTEXT_ALLOWED_FAMILIES_EMPTY");
  }

  return errors;
}
