export const VALUE_OBJECT_TREE_RESTRUCTURE_MODES = [
  "reparent",
  "insert_intermediate",
] as const;

export type ValueObjectTreeRestructureMode =
  (typeof VALUE_OBJECT_TREE_RESTRUCTURE_MODES)[number];

export type ValueObjectTreeNodeSummary = {
  id: string;
  title: string;
  parentValueObjectId: string | null;
  rootValueObjectId: string;
  branchTypeCode: string;
  nodeRoleCode: "structural" | "activity_leaf";
  objectKind: string;
  status: string;
  depth?: number;
};

export type ValueObjectTreePathNodeSummary = Omit<
  ValueObjectTreeNodeSummary,
  "id"
> & {
  id: string | null;
};

export type ValueObjectTreeOperationSummary = {
  id: string;
  operationType: "reparent" | "insert_intermediate" | "rollback";
  status: "applying" | "applied" | "rolled_back" | "failed";
  targetValueObjectId: string;
  createdValueObjectId: string | null;
  rollbackOfOperationId: string | null;
  appliedAt: string | null;
  rolledBackAt: string | null;
  createdAt: string;
};

export type ReparentTreePayload = {
  newParentValueObjectId: string | null;
};

export type InsertIntermediateTreePayload = {
  childValueObjectIds: string[];
  title: string;
  description: string | null;
  objectKind: string;
};

export type ValueObjectTreeRestructurePayload =
  | ReparentTreePayload
  | InsertIntermediateTreePayload;

export type ValueObjectTreeRestructurePreview = {
  ok: true;
  allowed: true;
  mode: ValueObjectTreeRestructureMode;
  stateAlreadySatisfied: boolean;
  target: ValueObjectTreeNodeSummary;
  sourceParent: ValueObjectTreeNodeSummary | null;
  destinationParent: ValueObjectTreeNodeSummary | null;
  oldPath: ValueObjectTreePathNodeSummary[];
  newPath: ValueObjectTreePathNodeSummary[];
  affectedNodes: ValueObjectTreeNodeSummary[];
  selectedChildren: ValueObjectTreeNodeSummary[];
  proposedIntermediate: {
    title: string;
    description: string | null;
    objectKind: string;
  } | null;
  warnings: string[];
  previewHash: string;
};

export type ValueObjectTreeRestructureContext = {
  ok: true;
  current: ValueObjectTreeNodeSummary;
  candidates: ValueObjectTreeNodeSummary[];
  directChildren: ValueObjectTreeNodeSummary[];
  recentOperations: ValueObjectTreeOperationSummary[];
};

export type ValueObjectTreeRestructureApplyResult = {
  ok: true;
  idempotentReplay: boolean;
  stateAlreadySatisfied: boolean;
  operationId: string;
  operationType: "reparent" | "insert_intermediate";
  targetValueObjectId: string;
  createdValueObjectId: string | null;
  affectedValueObjectIds: string[];
  redirectValueObjectId: string;
};

export type ValueObjectTreeRollbackResult = {
  ok: true;
  idempotentReplay: boolean;
  rollbackOperationId: string;
  rolledBackOperationId: string;
  restoredValueObjectIds: string[];
  deletedCreatedValueObjectId: string | null;
  redirectValueObjectId: string;
};

export type ValueObjectTreeRestructureError = {
  ok?: false;
  error: string;
  errorCode?: string | null;
};
