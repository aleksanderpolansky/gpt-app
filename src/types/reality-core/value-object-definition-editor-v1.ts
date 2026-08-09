export const VALUE_OBJECT_DEFINITION_EDIT_KINDS_V1 = [
  "rename",
  "semantic_definition",
] as const;

export type ValueObjectDefinitionEditKindV1 =
  (typeof VALUE_OBJECT_DEFINITION_EDIT_KINDS_V1)[number];

export const VALUE_OBJECT_DEFINITION_VISIBILITY_CODES_V1 = [
  "private",
  "shared",
  "public",
] as const;

export type ValueObjectDefinitionVisibilityCodeV1 =
  (typeof VALUE_OBJECT_DEFINITION_VISIBILITY_CODES_V1)[number];

export const VALUE_OBJECT_DEFINITION_PRIVACY_CODES_V1 = [
  "public_ontology",
  "standard",
  "sensitive",
  "restricted",
] as const;

export type ValueObjectDefinitionPrivacyCodeV1 =
  (typeof VALUE_OBJECT_DEFINITION_PRIVACY_CODES_V1)[number];

export const VALUE_OBJECT_DEFINITION_HIERARCHY_RELATIONS_V1 = [
  "is_a",
  "part_of",
  "aspect_of",
  "subprocess_of",
] as const;

export type ValueObjectDefinitionHierarchyRelationV1 =
  (typeof VALUE_OBJECT_DEFINITION_HIERARCHY_RELATIONS_V1)[number];

export type ValueObjectDefinitionEditorCardV1 = {
  readonly ok: true;
  readonly contractVersion: "P2C_VALUE_OBJECT_DEFINITION_EDITOR_V1";
  readonly valueObject: {
    readonly id: string;
    readonly canonicalKey: string;
    readonly title: string;
    readonly description: string | null;
    readonly facetCode: string;
    readonly objectKindCode: string;
    readonly nodeRoleCode: "root" | "intermediate" | "leaf";
    readonly parentValueObjectId: string | null;
    readonly rootValueObjectId: string;
    readonly hierarchyRelationCode:
      | ValueObjectDefinitionHierarchyRelationV1
      | null;
    readonly statusCode: string;
    readonly visibilityCode: ValueObjectDefinitionVisibilityCodeV1;
    readonly privacyClassCode: ValueObjectDefinitionPrivacyCodeV1;
    readonly definitionVersion: number;
  };
  readonly permissions: {
    readonly actorOwner: true;
    readonly canRename: boolean;
    readonly canEditSemanticDefinition: boolean;
    readonly canEditStructureThroughP2C: false;
    readonly canManageAliasesThroughP2C: false;
    readonly platformAdminOverride: false;
  };
  readonly versionProvenance: {
    readonly latestVersion: number;
    readonly latestSourceContext: string | null;
    readonly latestCreatedAt: string | null;
  };
};

export type ValueObjectRenamePatchV1 = {
  readonly title: string;
};

export type ValueObjectSemanticDefinitionPatchV1 = {
  readonly description?: string | null;
  readonly hierarchyRelationCode?:
    | ValueObjectDefinitionHierarchyRelationV1
    | null;
  readonly visibilityCode?: ValueObjectDefinitionVisibilityCodeV1;
  readonly privacyClassCode?: ValueObjectDefinitionPrivacyCodeV1;
};

export type ValueObjectDefinitionEditRequestV1 =
  | {
      readonly editKind: "rename";
      readonly patch: ValueObjectRenamePatchV1;
      readonly idempotencyKey: string;
    }
  | {
      readonly editKind: "semantic_definition";
      readonly patch: ValueObjectSemanticDefinitionPatchV1;
      readonly idempotencyKey: string;
    };

export type ValueObjectDefinitionEditResultV1 = {
  readonly ok: true;
  readonly contractVersion: "P2C_VALUE_OBJECT_DEFINITION_EDITOR_V1";
  readonly idempotentReplay: boolean;
  readonly stateAlreadySatisfied: boolean;
  readonly editRequestId: string;
  readonly editKind: ValueObjectDefinitionEditKindV1;
  readonly valueObjectId: string;
  readonly beforeDefinitionVersion: number;
  readonly afterDefinitionVersion: number;
  readonly definitionVersionChanged: boolean;
  readonly sourceContext:
    | "P2C_RENAME_V1"
    | "P2C_SEMANTIC_DEFINITION_EDIT_V1";
  readonly editor: ValueObjectDefinitionEditorCardV1;
};
