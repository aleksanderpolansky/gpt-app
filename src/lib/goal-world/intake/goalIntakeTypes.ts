export const GOAL_INTAKE_SCHEMA_VERSION = 1 as const;

export const GOAL_INTAKE_FIELD_CODES = [
  "goal",
  "successDefinition",
  "currentState",
  "timeframe",
  "resources",
  "constraints",
  "motivation",
  "nonNegotiables",
  "context",
] as const;

export type GoalIntakeFieldCode =
  (typeof GOAL_INTAKE_FIELD_CODES)[number];

export const GOAL_INTAKE_FIELD_STATUS_CODES = [
  "known",
  "partial",
  "unknown",
  "clarification_required",
] as const;

export type GoalIntakeFieldStatusCode =
  (typeof GOAL_INTAKE_FIELD_STATUS_CODES)[number];

export const GOAL_INTAKE_EVIDENCE_ORIGIN_CODES = [
  "current_message",
  "user_confirmed_prior",
  "trusted_actor_context",
  "existing_reality_graph",
  "deterministic_derivation",
  "none",
] as const;

export type GoalIntakeEvidenceOriginCode =
  (typeof GOAL_INTAKE_EVIDENCE_ORIGIN_CODES)[number];

export const GOAL_FORM_CODES = [
  "achieve_outcome",
  "reach_state",
  "maintain_state",
  "execute_project",
  "build_routine",
  "make_decision",
  "explore",
  "avoid_outcome",
  "unknown",
] as const;

export type GoalFormCode = (typeof GOAL_FORM_CODES)[number];

export const GOAL_DOMAIN_MODULE_CODES = [
  "learning",
  "health",
  "relationship",
  "career_business",
  "financial",
  "location_transition",
  "creative",
  "other",
] as const;

export type GoalDomainModuleCode =
  (typeof GOAL_DOMAIN_MODULE_CODES)[number];

export type GoalIntakeField = {
  readonly statusCode: GoalIntakeFieldStatusCode;
  readonly summary: string | null;
  readonly items: readonly string[];
  readonly evidenceOriginCodes:
    readonly GoalIntakeEvidenceOriginCode[];
  readonly missingAspects: readonly string[];
};

export type GoalIntakeGoalField = {
  readonly statusCode: GoalIntakeFieldStatusCode;
  readonly normalizedTitle: string | null;
  readonly normalizedStatement: string | null;
  readonly evidenceOriginCodes:
    readonly GoalIntakeEvidenceOriginCode[];
  readonly missingAspects: readonly string[];
};

export type GoalIntakeDefinitionV1 = {
  readonly schemaVersion: 1;
  readonly sourceGoalText: string;
  readonly goalFormCode: GoalFormCode;
  readonly domainModuleCodes: readonly GoalDomainModuleCode[];
  readonly goal: GoalIntakeGoalField;
  readonly successDefinition: GoalIntakeField;
  readonly currentState: GoalIntakeField;
  readonly timeframe: GoalIntakeField;
  readonly resources: GoalIntakeField;
  readonly constraints: GoalIntakeField;
  readonly motivation: GoalIntakeField;
  readonly nonNegotiables: GoalIntakeField;
  readonly context: GoalIntakeField;
};

export function goalIntakeFieldStatus(
  definition: GoalIntakeDefinitionV1,
  fieldCode: GoalIntakeFieldCode,
): GoalIntakeFieldStatusCode {
  return definition[fieldCode].statusCode;
}
