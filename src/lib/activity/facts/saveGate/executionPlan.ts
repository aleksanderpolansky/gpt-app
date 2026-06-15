import type { ActivityFactsSaveGateValidationResult } from "@/lib/activity/facts/saveGate/requestValidation";

export type ActivityFactsSaveGatePlanOperation = "insert";

export type ActivityFactsSaveGatePlanTargetTable =
  | "activity_events"
  | "activity_event_measures"
  | "value_objects"
  | "activity_object_facts"
  | "activity_fact_review_items"
  | "activity_fact_recalculation_queue";

export type ActivityFactsSaveGatePlannedWrite = {
  targetTable: ActivityFactsSaveGatePlanTargetTable;
  operation: ActivityFactsSaveGatePlanOperation;
  localSourceId: string;
  plannedDbId: null;
  descriptionRu: string;
  writeStatus: "not_executed_contract_preview";
};

export type ActivityFactsSaveGatePlanSkipped = {
  factLocalIds: string[];
  semanticObjectKeys: string[];
  reasonsRu: string[];
};

export type ActivityFactsSaveGateNoWriteExecutionPlan = {
  ok: boolean;
  planMode: "no_write_execution_plan_v1";
  planStatus: "preview_only_not_executed";
  sourcePackageId: string | null;
  idempotencyKey: string | null;
  acceptedFactLocalIds: string[];
  rejectedFactLocalIds: string[];
  deferredFactLocalIds: string[];
  editedFactLocalIds: string[];
  valueObjectCreateCandidateKeys: string[];
  valueObjectUseExistingCandidateKeys: string[];
  valueObjectSkippedCandidateKeys: string[];
  valueObjectDeferredCandidateKeys: string[];
  plannedWrites: ActivityFactsSaveGatePlannedWrite[];
  skipped: ActivityFactsSaveGatePlanSkipped;
  noWriteGuarantee: {
    dbReadExecuted: false;
    dbWriteExecuted: false;
    sqlExecuted: false;
    openAiCallExecuted: false;
    rowsActuallyWritten: 0;
  };
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as UnknownRecord;
  }

  return {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function pushPlannedWrite(
  plannedWrites: ActivityFactsSaveGatePlannedWrite[],
  write: ActivityFactsSaveGatePlannedWrite
) {
  plannedWrites.push(write);
}

function classifyFactDecisions(requestRecord: UnknownRecord) {
  const acceptedFactLocalIds: string[] = [];
  const rejectedFactLocalIds: string[] = [];
  const deferredFactLocalIds: string[] = [];

  for (const rawDecision of asArray(requestRecord.factDecisions)) {
    const decision = asRecord(rawDecision);
    const factLocalId = asString(decision.factLocalId);
    const decisionValue = asString(decision.decision);

    if (!factLocalId) {
      continue;
    }

    if (decisionValue === "accept") {
      acceptedFactLocalIds.push(factLocalId);
    }

    if (decisionValue === "reject") {
      rejectedFactLocalIds.push(factLocalId);
    }

    if (decisionValue === "defer") {
      deferredFactLocalIds.push(factLocalId);
    }
  }

  return {
    acceptedFactLocalIds,
    rejectedFactLocalIds,
    deferredFactLocalIds,
  };
}

function collectEditedFactLocalIds(requestRecord: UnknownRecord): string[] {
  const editedFactLocalIds: string[] = [];

  for (const rawDecision of asArray(requestRecord.editedFactDecisions)) {
    const decision = asRecord(rawDecision);
    const factLocalId = asString(decision.factLocalId);

    if (factLocalId) {
      editedFactLocalIds.push(factLocalId);
    }
  }

  return editedFactLocalIds;
}

function classifyValueObjectCandidateDecisions(requestRecord: UnknownRecord) {
  const valueObjectCreateCandidateKeys: string[] = [];
  const valueObjectUseExistingCandidateKeys: string[] = [];
  const valueObjectSkippedCandidateKeys: string[] = [];
  const valueObjectDeferredCandidateKeys: string[] = [];

  for (const rawDecision of asArray(
    requestRecord.valueObjectCandidateDecisions
  )) {
    const decision = asRecord(rawDecision);
    const semanticObjectKey = asString(decision.semanticObjectKey);
    const decisionValue = asString(decision.decision);

    if (!semanticObjectKey) {
      continue;
    }

    if (decisionValue === "create_new") {
      valueObjectCreateCandidateKeys.push(semanticObjectKey);
    }

    if (decisionValue === "use_existing") {
      valueObjectUseExistingCandidateKeys.push(semanticObjectKey);
    }

    if (decisionValue === "skip") {
      valueObjectSkippedCandidateKeys.push(semanticObjectKey);
    }

    if (decisionValue === "defer") {
      valueObjectDeferredCandidateKeys.push(semanticObjectKey);
    }
  }

  return {
    valueObjectCreateCandidateKeys,
    valueObjectUseExistingCandidateKeys,
    valueObjectSkippedCandidateKeys,
    valueObjectDeferredCandidateKeys,
  };
}

function buildSkipped(params: {
  rejectedFactLocalIds: string[];
  deferredFactLocalIds: string[];
  valueObjectSkippedCandidateKeys: string[];
  valueObjectDeferredCandidateKeys: string[];
}): ActivityFactsSaveGatePlanSkipped {
  const factLocalIds = [
    ...params.rejectedFactLocalIds,
    ...params.deferredFactLocalIds,
  ];

  const semanticObjectKeys = [
    ...params.valueObjectSkippedCandidateKeys,
    ...params.valueObjectDeferredCandidateKeys,
  ];

  const reasonsRu: string[] = [];

  for (const factLocalId of params.rejectedFactLocalIds) {
    reasonsRu.push(`Факт ${factLocalId} отклонён пользователем.`);
  }

  for (const factLocalId of params.deferredFactLocalIds) {
    reasonsRu.push(`Факт ${factLocalId} отложен пользователем.`);
  }

  for (const semanticObjectKey of params.valueObjectSkippedCandidateKeys) {
    reasonsRu.push(
      `Кандидат Value Object ${semanticObjectKey} пропущен пользователем.`
    );
  }

  for (const semanticObjectKey of params.valueObjectDeferredCandidateKeys) {
    reasonsRu.push(
      `Кандидат Value Object ${semanticObjectKey} отложен пользователем.`
    );
  }

  return {
    factLocalIds,
    semanticObjectKeys,
    reasonsRu,
  };
}

export function buildNoWriteExecutionPlan(
  validation: ActivityFactsSaveGateValidationResult
): ActivityFactsSaveGateNoWriteExecutionPlan {
  const requestRecord = validation.requestRecord;

  const {
    acceptedFactLocalIds,
    rejectedFactLocalIds,
    deferredFactLocalIds,
  } = classifyFactDecisions(requestRecord);

  const editedFactLocalIds = collectEditedFactLocalIds(requestRecord);

  const {
    valueObjectCreateCandidateKeys,
    valueObjectUseExistingCandidateKeys,
    valueObjectSkippedCandidateKeys,
    valueObjectDeferredCandidateKeys,
  } = classifyValueObjectCandidateDecisions(requestRecord);

  const plannedWrites: ActivityFactsSaveGatePlannedWrite[] = [];

  const acceptedOrEditedFactLocalIds = [
    ...acceptedFactLocalIds,
    ...editedFactLocalIds,
  ];

  if (acceptedOrEditedFactLocalIds.length > 0) {
    pushPlannedWrite(plannedWrites, {
      targetTable: "activity_events",
      operation: "insert",
      localSourceId:
        validation.summary.sourcePackageId ?? "unknown-source-package",
      plannedDbId: null,
      descriptionRu:
        "Будущий save gate создаст activity_event как хронологический источник фактов.",
      writeStatus: "not_executed_contract_preview",
    });
  }

  for (const factLocalId of acceptedOrEditedFactLocalIds) {
    pushPlannedWrite(plannedWrites, {
      targetTable: "activity_object_facts",
      operation: "insert",
      localSourceId: factLocalId,
      plannedDbId: null,
      descriptionRu:
        `Будущий save gate создаст user-owned activity_object_fact для ${factLocalId}.`,
      writeStatus: "not_executed_contract_preview",
    });

    pushPlannedWrite(plannedWrites, {
      targetTable: "activity_fact_review_items",
      operation: "insert",
      localSourceId: `review-${factLocalId}`,
      plannedDbId: null,
      descriptionRu:
        `Будущий save gate создаст review/audit item для ${factLocalId}.`,
      writeStatus: "not_executed_contract_preview",
    });
  }

  for (const semanticObjectKey of valueObjectCreateCandidateKeys) {
    pushPlannedWrite(plannedWrites, {
      targetTable: "value_objects",
      operation: "insert",
      localSourceId: semanticObjectKey,
      plannedDbId: null,
      descriptionRu:
        `Будущий save gate создаст Value Object для semanticObjectKey=${semanticObjectKey}.`,
      writeStatus: "not_executed_contract_preview",
    });
  }

  if (
    acceptedOrEditedFactLocalIds.length > 0 ||
    valueObjectCreateCandidateKeys.length > 0 ||
    valueObjectUseExistingCandidateKeys.length > 0
  ) {
    pushPlannedWrite(plannedWrites, {
      targetTable: "activity_fact_recalculation_queue",
      operation: "insert",
      localSourceId:
        validation.summary.idempotencyKey ?? "unknown-idempotency-key",
      plannedDbId: null,
      descriptionRu:
        "Будущий save gate поставит затронутые user-owned facts в очередь пересчёта аналитики.",
      writeStatus: "not_executed_contract_preview",
    });
  }

  const skipped = buildSkipped({
    rejectedFactLocalIds,
    deferredFactLocalIds,
    valueObjectSkippedCandidateKeys,
    valueObjectDeferredCandidateKeys,
  });

  return {
    ok: validation.ok,
    planMode: "no_write_execution_plan_v1",
    planStatus: "preview_only_not_executed",
    sourcePackageId: validation.summary.sourcePackageId,
    idempotencyKey: validation.summary.idempotencyKey,
    acceptedFactLocalIds,
    rejectedFactLocalIds,
    deferredFactLocalIds,
    editedFactLocalIds,
    valueObjectCreateCandidateKeys,
    valueObjectUseExistingCandidateKeys,
    valueObjectSkippedCandidateKeys,
    valueObjectDeferredCandidateKeys,
    plannedWrites,
    skipped,
    noWriteGuarantee: {
      dbReadExecuted: false,
      dbWriteExecuted: false,
      sqlExecuted: false,
      openAiCallExecuted: false,
      rowsActuallyWritten: 0,
    },
  };
}
