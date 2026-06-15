export type ControlledFlowStageStatus =
  | "done_preview"
  | "current_preview"
  | "future_gate"
  | "blocked_until_previous_gate";

export type FlowMapPlacementStatus =
  | "matched_existing_tree_node"
  | "candidate_tree_node"
  | "needs_user_confirmation"
  | "deferred_privacy_sensitive"
  | "not_mapped_yet";

export interface ControlledFlowStage {
  order: number;
  titleRu: string;
  status: ControlledFlowStageStatus;
  route: string | null;
  descriptionRu: string;
  noWriteBoundary: boolean;
}

export interface FactToTreeFlowMapRow {
  factLocalId: string;
  semanticObjectKey: string;
  factStatus: string;
  valueObjectId: string | null;
  valueObjectTitle: string | null;
  treeNodeId: string | null;
  treeNodeTitle: string | null;
  treeParentTitle: string | null;
  placementStatus: FlowMapPlacementStatus;
  measureLabel: string;
  nextActionRu: string;
}

export interface ControlledFlowMapPackage {
  packageId: string;
  status: "read_only_fixture";
  flowName: "activity_to_value_objects_controlled_flow";
  stages: ControlledFlowStage[];
  factToTreeRows: FactToTreeFlowMapRow[];
  safety: {
    previewOnly: true;
    dbWriteAllowed: false;
    sqlAllowed: false;
    openAiCallAllowed: false;
    autoCreateValueObjectsAllowed: false;
    notes: string[];
  };
}
