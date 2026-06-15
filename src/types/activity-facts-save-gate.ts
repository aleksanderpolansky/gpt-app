import type {
  ActivityObjectFactPreview,
  ActivityProcessingPackage,
} from "@/types/activity-to-value-objects";

export type ActivityFactsSaveGateRouteMode =
  | "contract_preview_only"
  | "future_server_mediated_write";

export type ActivityFactsSaveGateDecision =
  | "accept"
  | "reject"
  | "edit"
  | "defer";

export type ActivityFactsSaveGateValueObjectDecision =
  | "use_existing"
  | "create_new"
  | "skip"
  | "defer";

export type ActivityFactsSaveGateWriteStatus =
  | "not_executed_contract_preview"
  | "would_write_after_gate"
  | "written"
  | "partially_written"
  | "failed";

export interface ActivityFactsSaveGateAcceptedFactDecision {
  factLocalId: string;
  decision: ActivityFactsSaveGateDecision;
  reasonRu: string;
}

export interface ActivityFactsSaveGateEditedFactDecision {
  factLocalId: string;
  decision: "edit";
  editedFact: Partial<
    Pick<
      ActivityObjectFactPreview,
      | "semanticObjectKey"
      | "valueObjectId"
      | "valueObjectTitle"
      | "measureType"
      | "unit"
      | "numericValue"
      | "textValue"
    >
  >;
  reasonRu: string;
}

export interface ActivityFactsSaveGateValueObjectCandidateDecision {
  semanticObjectKey: string;
  proposedTitleRu: string;
  decision: ActivityFactsSaveGateValueObjectDecision;
  selectedExistingValueObjectId: string | null;
  selectedExistingValueObjectTitle: string | null;
  proposedParentValueObjectId: string | null;
  proposedParentTitleRu: string | null;
  reasonRu: string;
}

export interface ActivityFactsSaveGateRequest {
  routeMode: ActivityFactsSaveGateRouteMode;
  idempotencyKey: string;
  sourcePackageId: string;
  activityProcessingPackage: ActivityProcessingPackage;
  factDecisions: ActivityFactsSaveGateAcceptedFactDecision[];
  editedFactDecisions: ActivityFactsSaveGateEditedFactDecision[];
  valueObjectCandidateDecisions: ActivityFactsSaveGateValueObjectCandidateDecision[];
  clientSafetyConfirmation: {
    userReviewedPreview: boolean;
    userConfirmedMissingValueObjectCreation: boolean;
    userConfirmedFactWrite: boolean;
    userUnderstandsPreviewIsNotDiagnosis: boolean;
  };
}

export interface ActivityFactsSaveGatePlannedWriteRow {
  targetTable:
    | "activity_events"
    | "activity_event_measures"
    | "value_objects"
    | "activity_object_facts"
    | "activity_fact_review_items"
    | "activity_fact_recalculation_queue";
  operation: "insert" | "update" | "upsert" | "skip";
  localSourceId: string;
  plannedDbId: string | null;
  descriptionRu: string;
  writeStatus: ActivityFactsSaveGateWriteStatus;
}

export interface ActivityFactsSaveGateResponse {
  ok: boolean;
  routeMode: ActivityFactsSaveGateRouteMode;
  writeStatus: ActivityFactsSaveGateWriteStatus;
  endpoint: "/api/activity/facts/save-gate";
  dbWriteExecuted: boolean;
  sqlExecuted: boolean;
  openAiCallExecuted: boolean;
  createdIds: {
    activityEventId: string | null;
    measureIds: string[];
    valueObjectIds: string[];
    factIds: string[];
    reviewItemIds: string[];
    recalculationQueueIds: string[];
  };
  skipped: {
    factLocalIds: string[];
    semanticObjectKeys: string[];
    reasonsRu: string[];
  };
  plannedWrites: ActivityFactsSaveGatePlannedWriteRow[];
  safety: {
    serverMediatedOnly: boolean;
    directBrowserSupabaseWriteAllowed: false;
    duplicateChronologicalTimeAllowed: false;
    medicalDiagnosisAllowed: false;
    notes: string[];
  };
}
