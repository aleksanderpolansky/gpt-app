export const VALUE_OBJECT_ONTOLOGY_FACETS_V1 = [
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

export type ValueObjectOntologyFacetV1 =
  (typeof VALUE_OBJECT_ONTOLOGY_FACETS_V1)[number];

export const VALUE_OBJECT_ONTOLOGY_NODE_ROLES_V1 = [
  "root",
  "intermediate",
  "leaf",
] as const;

export type ValueObjectOntologyNodeRoleV1 =
  (typeof VALUE_OBJECT_ONTOLOGY_NODE_ROLES_V1)[number];

export const VALUE_OBJECT_HIERARCHY_RELATIONS_V1 = [
  "is_a",
  "part_of",
  "aspect_of",
  "subprocess_of",
] as const;

export type ValueObjectHierarchyRelationV1 =
  (typeof VALUE_OBJECT_HIERARCHY_RELATIONS_V1)[number];

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

export type ValueObjectOntologyCreateRequestV1 = {
  title: string;
  description: string;
  facetCode: ValueObjectOntologyFacetV1;
  objectKindCode: string;
  nodeRoleCode: ValueObjectOntologyNodeRoleV1;
  parentValueObjectId?: string | null;
  hierarchyRelationCode?: ValueObjectHierarchyRelationV1 | null;
  visibilityCode?: ValueObjectVisibilityCodeV1;
  privacyClassCode?: ValueObjectPrivacyClassCodeV1;
  idempotencyKey: string;
};

export type ValueObjectOntologyCardNodeV1 = {
  id: string;
  canonicalKey: string;
  title: string;
  description: string | null;
  facetCode: ValueObjectOntologyFacetV1;
  objectKindCode: string;
  nodeRoleCode: ValueObjectOntologyNodeRoleV1;
  parentValueObjectId: string | null;
  rootValueObjectId: string;
  hierarchyRelationCode: ValueObjectHierarchyRelationV1 | null;
  scopeCode: "actor" | "global";
  ownerActorId: string | null;
  statusCode: ValueObjectLifecycleCodeV1;
  visibilityCode: ValueObjectVisibilityCodeV1;
  privacyClassCode: ValueObjectPrivacyClassCodeV1;
  validFrom: string | null;
  validTo: string | null;
  definitionVersion: number;
  originTypeCode:
    | "system_model"
    | "expert_model"
    | "user_declared"
    | "ai_candidate"
    | "imported_standard"
    | "legacy";
  createdByActorId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ValueObjectOntologyCardV1 = {
  contractVersion: "value-object-ontology-card-v1";
  valueObject: ValueObjectOntologyCardNodeV1;
  parent: ValueObjectOntologyCardNodeV1 | null;
  root: ValueObjectOntologyCardNodeV1;
  facet: {
    facetCode: string;
    titleKey: string;
    descriptionKey: string;
    displayOrder: number;
    status: "active" | "inactive";
    version: number;
  };
  kind: {
    objectKindCode: string;
    facetCode: string;
    titleKey: string;
    descriptionKey: string;
    allowedNodeRoles: string[];
    policy: Record<string, unknown>;
    status: "active" | "inactive";
    version: number;
  };
  latestDefinition: {
    id: string;
    version: number;
    sourceContext: string | null;
    createdAt: string;
  } | null;
  allowedLifecycleActions: Array<"activate" | "deactivate" | "reactivate" | "retire">;
};

export function isValueObjectOntologyFacetV1(
  value: unknown,
): value is ValueObjectOntologyFacetV1 {
  return (
    typeof value === "string" &&
    (VALUE_OBJECT_ONTOLOGY_FACETS_V1 as readonly string[]).includes(value)
  );
}

export function isValueObjectOntologyNodeRoleV1(
  value: unknown,
): value is ValueObjectOntologyNodeRoleV1 {
  return (
    typeof value === "string" &&
    (VALUE_OBJECT_ONTOLOGY_NODE_ROLES_V1 as readonly string[]).includes(value)
  );
}

export function isValueObjectHierarchyRelationV1(
  value: unknown,
): value is ValueObjectHierarchyRelationV1 {
  return (
    typeof value === "string" &&
    (VALUE_OBJECT_HIERARCHY_RELATIONS_V1 as readonly string[]).includes(value)
  );
}

export function isValueObjectVisibilityCodeV1(
  value: unknown,
): value is ValueObjectVisibilityCodeV1 {
  return (
    typeof value === "string" &&
    (VALUE_OBJECT_VISIBILITY_CODES_V1 as readonly string[]).includes(value)
  );
}

export function isValueObjectPrivacyClassCodeV1(
  value: unknown,
): value is ValueObjectPrivacyClassCodeV1 {
  return (
    typeof value === "string" &&
    (VALUE_OBJECT_PRIVACY_CLASS_CODES_V1 as readonly string[]).includes(value)
  );
}
