export const VALUE_OBJECT_SEMANTIC_TREE_MODES_V1 = [
  "reparent",
  "insert_intermediate",
] as const;

export type ValueObjectSemanticTreeModeV1 =
  (typeof VALUE_OBJECT_SEMANTIC_TREE_MODES_V1)[number];

export type ValueObjectSemanticNodeRoleV1 =
  | "root"
  | "intermediate"
  | "leaf";

export type ValueObjectSemanticTreeNodeV1 = {
  id: string;
  canonicalKey: string;
  title: string;
  parentValueObjectId: string | null;
  rootValueObjectId: string;
  facetCode: string;
  objectKindCode: string;
  nodeRoleCode: ValueObjectSemanticNodeRoleV1;
  hierarchyRelationCode: string | null;
  statusCode: string;
  definitionVersion: number;
  depth?: number;
};

export type ValueObjectSemanticTreeContextV1 = {
  ok: true;
  contractVersion: "P2B_SEMANTIC_TREE_V1";
  current: ValueObjectSemanticTreeNodeV1;
  candidates: ValueObjectSemanticTreeNodeV1[];
  directChildren: ValueObjectSemanticTreeNodeV1[];
  capabilities: {
    canReparent: boolean;
    canInsertIntermediate: boolean;
  };
};

export type ValueObjectSemanticReparentPayloadV1 = {
  newParentValueObjectId: string;
};

export type ValueObjectSemanticInsertIntermediatePayloadV1 = {
  childValueObjectIds: string[];
  title: string;
  description: string;
  facetCode: string;
  objectKindCode: string;
  hierarchyRelationCode: "is_a" | "part_of" | "aspect_of" | "subprocess_of";
  visibilityCode?: "private" | "shared" | "public";
  privacyClassCode?: "public_ontology" | "standard" | "sensitive" | "restricted";
};

export type ValueObjectSemanticTreePayloadV1 =
  | ValueObjectSemanticReparentPayloadV1
  | ValueObjectSemanticInsertIntermediatePayloadV1;

export type ValueObjectSemanticTreePreviewV1 = {
  ok: true;
  allowed: true;
  contractVersion: "P2B_SEMANTIC_TREE_V1";
  mode: ValueObjectSemanticTreeModeV1;
  stateAlreadySatisfied: boolean;
  target: ValueObjectSemanticTreeNodeV1;
  sourceParent: ValueObjectSemanticTreeNodeV1 | null;
  destinationParent: ValueObjectSemanticTreeNodeV1 | null;
  oldPath: ValueObjectSemanticTreeNodeV1[];
  newPath: ValueObjectSemanticTreeNodeV1[];
  affectedNodes: ValueObjectSemanticTreeNodeV1[];
  selectedChildren: ValueObjectSemanticTreeNodeV1[];
  proposedIntermediate: {
    title: string;
    description: string;
    facetCode: string;
    objectKindCode: string;
    hierarchyRelationCode: string;
  } | null;
  historicalRecalculation: {
    started: false;
    automatic: false;
    requiresSeparateBudgetedConfirmation: true;
  };
  warnings: string[];
  previewHash: string;
};

export type ValueObjectSemanticTreeApplyResultV1 = {
  ok: true;
  contractVersion: "P2B_SEMANTIC_TREE_V1";
  idempotentReplay: boolean;
  operationStatus: "applied" | "rolled_back";
  rolledBackByOperationId: string | null;
  stateAlreadySatisfied: boolean;
  operationId: string;
  operationType: ValueObjectSemanticTreeModeV1;
  targetValueObjectId: string;
  createdValueObjectId: string | null;
  affectedValueObjectIds: string[];
  redirectValueObjectId: string;
  historicalRecalculation: {
    started: false;
    automatic: false;
    requiresSeparateBudgetedConfirmation: true;
  };
};

export type ValueObjectSemanticTreeRollbackResultV1 = {
  ok: true;
  contractVersion: "P2B_SEMANTIC_TREE_V1";
  idempotentReplay: boolean;
  rollbackOperationId: string;
  rolledBackOperationId: string;
  restoredValueObjectIds: string[];
  retiredCreatedValueObjectId: string | null;
  redirectValueObjectId: string;
};
