export const GOAL_WORLD_LIFECYCLE_STATUS_CODES = [
  "draft",
  "definition_ready",
  "compiled",
  "ready_for_activity_intake",
  "active",
  "paused",
  "completed",
  "abandoned",
] as const;

export type GoalWorldLifecycleStatusCode =
  (typeof GOAL_WORLD_LIFECYCLE_STATUS_CODES)[number];

export const GOAL_WORLD_REVISION_REASON_CODES = [
  "initial_definition",
  "user_refinement",
  "new_reality_evidence",
  "changed_resources",
  "changed_constraints",
  "feasibility_correction",
  "changed_life_context",
  "other",
] as const;

export type GoalWorldRevisionReasonCode =
  (typeof GOAL_WORLD_REVISION_REASON_CODES)[number];

export const GOAL_WORLD_OBJECTIVE_ROLE_CODES = [
  "terminal",
  "intermediate",
  "supporting",
] as const;

export type GoalWorldObjectiveRoleCode =
  (typeof GOAL_WORLD_OBJECTIVE_ROLE_CODES)[number];

export const GOAL_WORLD_OBJECTIVE_ORIGIN_CODES = [
  "actor_declared_terminal",
  "compiler_derived",
  "user_added",
] as const;

export type GoalWorldObjectiveOriginCode =
  (typeof GOAL_WORLD_OBJECTIVE_ORIGIN_CODES)[number];

export const GOAL_WORLD_OBJECT_ROLE_CODES = [
  "target",
  "prerequisite",
  "constraint",
  "resource",
  "support",
  "indicator",
  "context",
  "risk",
] as const;

export type GoalWorldObjectRoleCode =
  (typeof GOAL_WORLD_OBJECT_ROLE_CODES)[number];

export const GOAL_WORLD_ORIENTATION_CODES = [
  "approach",
  "avoid",
  "maintain",
  "neutral",
] as const;

export type GoalWorldOrientationCode =
  (typeof GOAL_WORLD_ORIENTATION_CODES)[number];

export const GOAL_WORLD_TARGET_COMPARATOR_CODES = [
  "eq",
  "gte",
  "lte",
  "range",
  "contains",
  "state_is",
  "custom_rule",
] as const;

export type GoalWorldTargetComparatorCode =
  (typeof GOAL_WORLD_TARGET_COMPARATOR_CODES)[number];

export type GoalWorldEntityRef = {
  readonly entityType: string;
  readonly entityId: string;
};

export type GoalWorldProtocolRef = {
  readonly protocolCode: string;
  readonly version: number;
  readonly contentHash: string | null;
};

export type GoalWorldStableIdentity = {
  readonly worldId: string;
  readonly actorId: string;
  readonly lifecycleStatusCode:
    GoalWorldLifecycleStatusCode;
  readonly currentRevisionId: string;
  readonly currentRevisionNumber: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type GoalWorldSourceStatement = {
  readonly statementId: string;
  readonly exactText: string;
  readonly recordedAt: string;
};

export type GoalWorldDefinitionRef = {
  readonly goalDefinitionRevisionId: string;
  readonly sourceGoalStatementId: string;
  readonly schemaVersion: number;
  readonly completenessPercent: number;
};

export type GoalWorldObjective = {
  readonly objectiveId: string;
  readonly objectiveRoleCode:
    GoalWorldObjectiveRoleCode;
  readonly parentObjectiveId: string | null;
  readonly label: string;
  readonly primaryTargetValueObjectId:
    string | null;
  readonly originCode:
    GoalWorldObjectiveOriginCode;
};

export type GoalWorldObjectMembership = {
  readonly valueObjectId: string;
  readonly roleCodes:
    readonly GoalWorldObjectRoleCode[];
  readonly orientationCode:
    GoalWorldOrientationCode;
  readonly objectiveIds: readonly string[];
  readonly note: string | null;
};

export type GoalWorldTargetValue =
  | string
  | number
  | boolean
  | null;

export type GoalWorldTargetCriterion = {
  readonly criterionId: string;
  readonly objectiveId: string;
  readonly valueObjectId: string;
  readonly parameterCode: string | null;
  readonly comparatorCode:
    GoalWorldTargetComparatorCode;
  readonly targetValue: GoalWorldTargetValue;
  readonly targetValueUpper:
    GoalWorldTargetValue;
  readonly unitCode: string | null;
  readonly definitionText: string;
  readonly ruleRef: GoalWorldEntityRef | null;
};

export type GoalWorldCurrentStateProjectionItem = {
  readonly valueObjectId: string;
  readonly parameterCode: string | null;
  readonly observedOrDerivedValue:
    GoalWorldTargetValue;
  readonly unitCode: string | null;
  readonly effectiveAt: string | null;
  readonly observedAt: string | null;
  readonly knownAt: string | null;
  readonly provenanceRefs:
    readonly GoalWorldEntityRef[];
  readonly derivationRef:
    GoalWorldEntityRef | null;
};

export type GoalWorldGoalHypothesis = {
  readonly hypothesisId: string;
  readonly summary: string;
  readonly statusCode: "proposal_only";
  readonly evidenceRefs:
    readonly GoalWorldEntityRef[];
  readonly proposedAt: string;
};

export type GoalWorldRevision = {
  readonly revisionId: string;
  readonly worldId: string;
  readonly revisionNumber: number;
  readonly previousRevisionId: string | null;
  readonly revisionReasonCode:
    GoalWorldRevisionReasonCode;
  readonly sourceGoalStatement:
    GoalWorldSourceStatement;
  readonly goalDefinitionRef:
    GoalWorldDefinitionRef;
  readonly terminalObjectiveId: string;
  readonly objectives:
    readonly GoalWorldObjective[];
  readonly objectMemberships:
    readonly GoalWorldObjectMembership[];
  readonly targetCriteria:
    readonly GoalWorldTargetCriterion[];
  readonly goalHypotheses:
    readonly GoalWorldGoalHypothesis[];
  readonly unknownCodes:
    readonly string[];
  readonly protocolRefs:
    readonly GoalWorldProtocolRef[];
  readonly createdAt: string;
};

export type GoalWorldCardV1 = {
  readonly schemaVersion: 1;
  readonly identity:
    GoalWorldStableIdentity;
  readonly revision:
    GoalWorldRevision;
  readonly currentStateProjection: {
    readonly asOf: string;
    readonly items:
      readonly GoalWorldCurrentStateProjectionItem[];
  };
};
