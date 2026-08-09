/**
 * ARCTor.app — Goal World Constructor
 * P1 Ontology Kernel Data Contract v1
 *
 * P1A is additive. It defines the new semantic contract while current
 * production routes still use legacy node_role_code / branch_type_code fields.
 */

export const GOAL_WORLD_ONTOLOGY_KERNEL_VERSION_V1 =
  "goal-world-ontology-kernel-v1" as const;

export const VALUE_OBJECT_FACET_CODES_V1 = [
  "DOMAIN",
  "ENTITY",
  "PROCESS",
  "STATE",
  "RELATIONSHIP",
  "ROLE",
  "KNOWLEDGE",
  "BEHAVIOR",
  "CONTEXT",
] as const;

export type ValueObjectFacetCodeV1 =
  (typeof VALUE_OBJECT_FACET_CODES_V1)[number];

export const VALUE_OBJECT_ONTOLOGY_NODE_ROLE_CODES_V1 = [
  "root",
  "intermediate",
  "leaf",
] as const;

export type ValueObjectOntologyNodeRoleCodeV1 =
  (typeof VALUE_OBJECT_ONTOLOGY_NODE_ROLE_CODES_V1)[number];

export const VALUE_OBJECT_HIERARCHY_RELATION_CODES_V1 = [
  "is_a",
  "part_of",
  "aspect_of",
  "subprocess_of",
] as const;

export type ValueObjectHierarchyRelationCodeV1 =
  (typeof VALUE_OBJECT_HIERARCHY_RELATION_CODES_V1)[number];

export const VALUE_OBJECT_SCOPE_CODES_V1 = [
  "global",
  "actor",
] as const;

export type ValueObjectScopeCodeV1 =
  (typeof VALUE_OBJECT_SCOPE_CODES_V1)[number];

export const VALUE_OBJECT_VISIBILITY_CODES_V1 = [
  "private",
  "shared",
  "public",
] as const;

export type ValueObjectVisibilityCodeV1 =
  (typeof VALUE_OBJECT_VISIBILITY_CODES_V1)[number];

export const VALUE_OBJECT_PRIVACY_CLASS_CODES_V1 = [
  "public_ontology",
  "standard",
  "sensitive",
  "restricted",
] as const;

export type ValueObjectPrivacyClassCodeV1 =
  (typeof VALUE_OBJECT_PRIVACY_CLASS_CODES_V1)[number];

export const VALUE_OBJECT_LIFECYCLE_CODES_V1 = [
  "candidate",
  "draft",
  "active",
  "inactive",
  "retired",
] as const;

export type ValueObjectLifecycleCodeV1 =
  (typeof VALUE_OBJECT_LIFECYCLE_CODES_V1)[number];

export const VALUE_OBJECT_ORIGIN_TYPE_CODES_V1 = [
  "system_model",
  "expert_model",
  "user_declared",
  "ai_candidate",
  "imported_standard",
  "legacy",
] as const;

export type ValueObjectOriginTypeCodeV1 =
  (typeof VALUE_OBJECT_ORIGIN_TYPE_CODES_V1)[number];

export interface ValueObjectKindPolicyV1 {
  readonly objectKindCode: string;
  readonly facetCode: ValueObjectFacetCodeV1;
  readonly allowedNodeRoles: readonly ValueObjectOntologyNodeRoleCodeV1[];
  readonly policyVersion: number;
  readonly status: "active" | "inactive";
  readonly policy: Readonly<Record<string, unknown>>;
}

export interface ValueObjectOntologyCoreV1 {
  readonly id: string;
  readonly canonicalKey: string;
  readonly title: string;
  readonly description: string | null;

  readonly facetCode: ValueObjectFacetCodeV1;
  readonly objectKindCode: string;
  readonly nodeRoleCode: ValueObjectOntologyNodeRoleCodeV1;

  readonly parentValueObjectId: string | null;
  readonly rootValueObjectId: string;
  readonly hierarchyRelationCode: ValueObjectHierarchyRelationCodeV1 | null;

  readonly scopeCode: ValueObjectScopeCodeV1;
  readonly ownerActorId: string | null;

  readonly statusCode: ValueObjectLifecycleCodeV1;
  readonly visibilityCode: ValueObjectVisibilityCodeV1;
  readonly privacyClassCode: ValueObjectPrivacyClassCodeV1;

  readonly validFrom: string | null;
  readonly validTo: string | null;

  readonly definitionVersion: number;
  readonly originTypeCode: ValueObjectOriginTypeCodeV1;
  readonly createdByActorId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Temporary P1 bridge only.
 *
 * Existing production storage currently uses:
 * - node_role_code = structural | activity_leaf
 * - branch_type_code = July branch policy
 * - object_kind = July hard-coded kind
 *
 * These fields are not the final semantic ontology contract.
 */
export interface ValueObjectLegacyStorageBridgeV1 {
  readonly legacyObjectKind: string | null;
  readonly legacyNodeRoleCode: "structural" | "activity_leaf" | null;
  readonly legacyBranchTypeCode: string | null;
}

export interface ValueObjectDefinitionVersionV1
  extends ValueObjectOntologyCoreV1 {
  readonly definitionVersionId: string;
  readonly definitionSnapshot: Readonly<Record<string, unknown>>;
}
