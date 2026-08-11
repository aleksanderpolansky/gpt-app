/**
 * ARCTor.app — Global System Reality Seed v1
 *
 * Machine contract corresponding to:
 * ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811
 *
 * This file intentionally does NOT seed the database.
 * It defines the deterministic shape used by the JSON registry, validator,
 * future SQL migration, AI router and pilot fixtures.
 */

export const GLOBAL_SYSTEM_REALITY_SEED_VERSION_V1 =
  "arctor-global-system-reality-seed-v1" as const;

export const GLOBAL_SYSTEM_REALITY_STRATEGY_MODES_V1 = [
  "OBSERVE",
  "TARGET",
  "MAINTAIN",
  "RANGE",
  "AVOID",
] as const;

export type GlobalSystemRealityStrategyModeV1 =
  (typeof GLOBAL_SYSTEM_REALITY_STRATEGY_MODES_V1)[number];

export const GLOBAL_SYSTEM_REALITY_ROUTING_LIMITS_V1 = {
  maxRootCandidates: 3,
  maxLeafCandidates: 20,
  maxRelationCandidates: 12,
  allowCanonicalCreateByAi: false,
  unknownLeafAction: "PROPOSE",
  unknownParameterAction: "PROPOSE",
  allowPassiveObservationToPromoteCausality: false,
} as const;

export type GlobalSystemRealityFacetCodeV1 =
  | "DOMAIN"
  | "ENTITY"
  | "PROCESS"
  | "STATE"
  | "RELATIONSHIP"
  | "ROLE"
  | "KNOWLEDGE"
  | "BEHAVIOR"
  | "CONTEXT";

export type GlobalSystemRealityNodeRoleV1 =
  | "root"
  | "intermediate"
  | "leaf";

export type GlobalSystemRealityHierarchyRelationV1 =
  | "is_a"
  | "part_of"
  | "aspect_of"
  | "subprocess_of";

export interface GlobalSystemRealitySeedNodeV1 {
  readonly canonicalKey: string;
  readonly titleRu: string;
  readonly descriptionRu?: string;
  readonly facetCode: GlobalSystemRealityFacetCodeV1;
  readonly objectKindCode: string;
  readonly nodeRoleCode: GlobalSystemRealityNodeRoleV1;
  readonly hierarchyRelationCode:
    | GlobalSystemRealityHierarchyRelationV1
    | null;
  readonly parentCanonicalKey: string | null;
  readonly rootCanonicalKey: string;
  readonly scopeCode: "global";
  readonly visibilityCode: "public";
  readonly privacyClassCode: "public_ontology";
  readonly originTypeCode: "system_model";
  readonly statusCode: "active";
}

export interface GlobalSystemRealityLeafParameterContractV1 {
  readonly leafCanonicalKey: string;
  readonly allowedParameterCodes: readonly string[];
  readonly optionalParameterCodes: readonly string[];
  readonly sources: string;
  readonly aggregationPolicyRu: string;
}

export type GlobalSystemRealityStorageMappingStatusV1 =
  | "reuse"
  | "reuse_guarded"
  | "derived"
  | "leaf_specific"
  | "extend"
  | "extend_unit";

export interface GlobalSystemRealityStorageParameterMappingV1 {
  readonly status: GlobalSystemRealityStorageMappingStatusV1;
  readonly storageCode: string | null;
  readonly note: string;
}

export const GLOBAL_SYSTEM_REALITY_ROUTING_PIPELINE_V1 = [
  "SEGMENT_EVENTS",
  "CLASSIFY_FACET",
  "RETRIEVE_ROOTS",
  "RETRIEVE_BRANCHES",
  "RETRIEVE_LEAF_CANDIDATES",
  "NARROW_PARAMETERS_AND_RELATIONS",
  "STRUCTURED_AI_EXTRACTION",
  "DETERMINISTIC_VALIDATION",
  "WRITE_EXPLICIT_FACTS_AND_LINKS",
  "RUN_DETERMINISTIC_DERIVATIONS",
] as const;
