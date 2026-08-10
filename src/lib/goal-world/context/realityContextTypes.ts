export const REALITY_CONTEXT_RUNTIME_PURPOSES = [
  "goal_intake",
  "goal_world_compile",
  "activity_interpretation",
  "analytics",
  "suitability_analysis",
  "decision_support",
] as const;

export type RealityContextRuntimePurpose =
  (typeof REALITY_CONTEXT_RUNTIME_PURPOSES)[number];

export const REALITY_CONTEXT_ITEM_CLASSES = [
  "observable_object",
  "observation",
  "derived_state",
  "activity",
  "relationship",
  "actor_context",
  "goal_definition",
  "goal_world_context",
] as const;

export type RealityContextItemClass =
  (typeof REALITY_CONTEXT_ITEM_CLASSES)[number];

export const STATEMENT_ROUTING_SCOPES = [
  "reality_candidate",
  "goal_specific",
  "both",
  "conversation_only",
  "unresolved",
] as const;

export type StatementRoutingScope =
  (typeof STATEMENT_ROUTING_SCOPES)[number];

export const STATEMENT_SEMANTIC_CODES = [
  "observation",
  "measurement",
  "capability_state",
  "resource",
  "constraint",
  "preference",
  "relationship_state",
  "biographical_context",
  "planned_activity",
  "actual_activity",
  "goal_specific_condition",
  "correction",
  "other",
] as const;

export type StatementSemanticCode =
  (typeof STATEMENT_SEMANTIC_CODES)[number];

export type RealityContextSourceRef = {
  readonly entityType: string;
  readonly entityId: string;
};

export type RealityContextTime = {
  readonly asOf: string;
  readonly effectiveAt: string | null;
  readonly effectiveUntil: string | null;
  readonly observedAt: string | null;
  readonly knownAt: string | null;
};

export type RealityContextItem = {
  readonly itemClass: RealityContextItemClass;
  readonly sourceRef: RealityContextSourceRef;
  readonly valueObjectId: string | null;
  readonly summary: string;
  readonly relevanceReasonCodes: readonly string[];
  readonly time: RealityContextTime;
  readonly derivationRef: RealityContextSourceRef | null;
};

export type RealityContextSnapshot = {
  readonly snapshotVersion: 1;
  readonly ownerActorId: string;
  readonly runtimePurpose: RealityContextRuntimePurpose;
  readonly asOf: string;
  readonly anchorRefs: readonly RealityContextSourceRef[];
  readonly allowedContextFamilies: readonly string[];
  readonly items: readonly RealityContextItem[];
};

export type StatementRouteTargetCandidate = {
  readonly valueObjectId: string | null;
  readonly parameterCode: string | null;
  readonly semanticMatchCode:
    | "exact"
    | "candidate"
    | "unresolved";
};

export type RoutedAtomicStatement = {
  readonly sourceText: string;
  readonly normalizedStatement: string;
  readonly routingScope: StatementRoutingScope;
  readonly semanticCode: StatementSemanticCode;
  readonly knownAt: string;
  readonly effectiveAt: string | null;
  readonly observedAt: string | null;
  readonly targetCandidates:
    readonly StatementRouteTargetCandidate[];
  readonly requiresConfirmation: boolean;
};

export type StatementRoutingResult = {
  readonly schemaVersion: 1;
  readonly sourceUtterance: string;
  readonly statements: readonly RoutedAtomicStatement[];
};
