import type {
  ActivityFactsSaveGateNoWriteExecutionPlan,
  ActivityFactsSaveGatePlanTargetTable,
  ActivityFactsSaveGatePlannedWrite,
} from "./executionPlan";
import type { ActivityFactsSaveGateValidationResult } from "./requestValidation";

export type ActivityFactsGuardedPersistenceMode =
  | "contract_preview_only"
  | "server_mediated_write_disabled"
  | "server_mediated_write_enabled_future";

export type ActivityFactsGuardedPersistenceWriteStatus =
  | "not_executed_contract_preview"
  | "blocked_write_not_enabled"
  | "ready_for_future_guarded_write";

export type ActivityFactsGuardedPersistenceActorScope = {
  readonly authenticatedUserId: string | null;
  readonly ownerActorId: string | null;
  readonly personId: string | null;
  readonly organizationId: string | null;
  readonly timezone: string;
};

export type ActivityFactsGuardedPersistenceDraftIdMap = {
  readonly activityEventId: string;
  readonly measureIdsByLocalMeasureId: Record<string, string>;
  readonly factIdsByLocalFactId: Record<string, string>;
  readonly reviewItemIdsByLocalFactId: Record<string, string>;
  readonly recalculationQueueItemIds: string[];
  readonly valueObjectIdsBySemanticObjectKey: Record<string, string>;
};

export type ActivityFactsGuardedPersistenceActivityEventDraftRow = {
  readonly table: "activity_events";
  readonly draftId: string;
  readonly ownerActorId: string | null;
  readonly personId: string | null;
  readonly organizationId: string | null;
  readonly sourcePackageId: string | null;
  readonly idempotencyKey: string | null;
  readonly sourceText: string | null;
  readonly eventStatus: "draft_from_save_gate" | "ready_for_insert";
  readonly occurredAtIso: string | null;
  readonly startedAtIso: string | null;
  readonly endedAtIso: string | null;
  readonly timezone: string;
  readonly writeStatus: ActivityFactsGuardedPersistenceWriteStatus;
};

export type ActivityFactsGuardedPersistenceMeasureDraftRow = {
  readonly table: "activity_event_measures";
  readonly draftId: string;
  readonly activityEventDraftId: string;
  readonly localMeasureId: string;
  readonly measureType: string;
  readonly numericValue: number | null;
  readonly unit: string | null;
  readonly confidence: number | null;
  readonly source: "save_gate_contract" | "future_parser" | "user_edited";
  readonly writeStatus: ActivityFactsGuardedPersistenceWriteStatus;
};

export type ActivityFactsGuardedPersistenceObjectFactDraftRow = {
  readonly table: "activity_object_facts";
  readonly draftId: string;
  readonly activityEventDraftId: string;
  readonly measureDraftId: string | null;
  readonly localFactId: string;
  readonly semanticObjectKey: string;
  readonly valueObjectId: string | null;
  readonly measureType: string | null;
  readonly numericValue: number | null;
  readonly unit: string | null;
  readonly reviewStatus: "accepted" | "edited" | "pending" | "rejected" | "ignored";
  readonly factSourceType: "ai_proposed" | "user_confirmed" | "user_edited" | "rule_derived";
  readonly ownerActorId: string | null;
  readonly writeStatus: ActivityFactsGuardedPersistenceWriteStatus;
};

export type ActivityFactsGuardedPersistenceReviewItemDraftRow = {
  readonly table: "activity_fact_review_items";
  readonly draftId: string;
  readonly activityEventDraftId: string;
  readonly objectFactDraftId: string | null;
  readonly localFactId: string;
  readonly reviewDecision: "accept" | "edit" | "reject" | "ignore" | "defer";
  readonly reasonRu: string | null;
  readonly reviewerActorId: string | null;
  readonly writeStatus: ActivityFactsGuardedPersistenceWriteStatus;
};

export type ActivityFactsGuardedPersistenceRecalculationQueueDraftRow = {
  readonly table: "activity_fact_recalculation_queue";
  readonly draftId: string;
  readonly activityEventDraftId: string;
  readonly reason:
    | "activity_fact_created"
    | "value_object_created"
    | "value_object_linked"
    | "future_correction"
    | "manual_recalc";
  readonly affectedValueObjectIds: string[];
  readonly affectedSemanticObjectKeys: string[];
  readonly ownerActorId: string | null;
  readonly writeStatus: ActivityFactsGuardedPersistenceWriteStatus;
};

export type ActivityFactsGuardedPersistenceDraftRows = {
  readonly activityEvent: ActivityFactsGuardedPersistenceActivityEventDraftRow | null;
  readonly measures: ActivityFactsGuardedPersistenceMeasureDraftRow[];
  readonly objectFacts: ActivityFactsGuardedPersistenceObjectFactDraftRow[];
  readonly reviewItems: ActivityFactsGuardedPersistenceReviewItemDraftRow[];
  readonly recalculationQueueItems: ActivityFactsGuardedPersistenceRecalculationQueueDraftRow[];
};

export type ActivityFactsGuardedPersistenceContract = {
  readonly contractMode: "activity_facts_guarded_persistence_contract_v1";
  readonly persistenceMode: ActivityFactsGuardedPersistenceMode;
  readonly sourcePackageId: string | null;
  readonly idempotencyKey: string | null;
  readonly actorScope: ActivityFactsGuardedPersistenceActorScope;
  readonly noWritePlan: ActivityFactsSaveGateNoWriteExecutionPlan;
  readonly draftIdMap: ActivityFactsGuardedPersistenceDraftIdMap;
  readonly draftRows: ActivityFactsGuardedPersistenceDraftRows;
  readonly plannedWrites: ActivityFactsSaveGatePlannedWrite[];
  readonly plannedTargetTables: ActivityFactsSaveGatePlanTargetTable[];
  readonly safety: {
    readonly dbReadExecuted: false;
    readonly dbWriteExecuted: false;
    readonly sqlExecuted: false;
    readonly externalAiCallExecuted: false;
    readonly rowsActuallyWritten: 0;
    readonly productionWriteEnabled: false;
  };
  readonly blockers: string[];
  readonly warnings: string[];
};

type MinimalFactDecision = {
  readonly factLocalId?: unknown;
  readonly decision?: unknown;
  readonly reasonRu?: unknown;
};

type MinimalValueObjectDecision = {
  readonly semanticObjectKey?: unknown;
  readonly decision?: unknown;
  readonly selectedExistingValueObjectId?: unknown;
  readonly proposedTitleRu?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}


function normalizeReviewDecision(
  decision: unknown
): "accept" | "edit" | "reject" | "ignore" | "defer" {
  if (decision === "accept") {
    return "accept";
  }

  if (decision === "edit") {
    return "edit";
  }

  if (decision === "reject") {
    return "reject";
  }

  if (decision === "ignore") {
    return "ignore";
  }

  return "defer";
}

function normalizeObjectFactReviewStatus(
  decision: unknown
): "accepted" | "edited" | "pending" | "rejected" | "ignored" {
  if (decision === "accept") {
    return "accepted";
  }

  if (decision === "edit") {
    return "edited";
  }

  if (decision === "reject") {
    return "rejected";
  }

  if (decision === "ignore") {
    return "ignored";
  }

  return "pending";
}

function stableDraftId(prefix: string, value: string | null, fallback: string): string {
  const raw = value ?? fallback;
  const normalized = raw
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${prefix}_${normalized || fallback}`;
}

function collectFactDecisions(validation: ActivityFactsSaveGateValidationResult): MinimalFactDecision[] {
  const body = asRecord(validation.normalizedBody);
  return asArray(body.factDecisions).map((item) => asRecord(item));
}

function collectValueObjectDecisions(
  validation: ActivityFactsSaveGateValidationResult
): MinimalValueObjectDecision[] {
  const body = asRecord(validation.normalizedBody);
  return asArray(body.valueObjectCandidateDecisions).map((item) => asRecord(item));
}

function findPlannedWritesForTable(
  plan: ActivityFactsSaveGateNoWriteExecutionPlan,
  table: ActivityFactsSaveGatePlanTargetTable
): ActivityFactsSaveGatePlannedWrite[] {
  return plan.plannedWrites.filter((write) => write.targetTable === table);
}

export function buildActivityFactsGuardedPersistenceContract(input: {
  readonly validation: ActivityFactsSaveGateValidationResult;
  readonly noWritePlan: ActivityFactsSaveGateNoWriteExecutionPlan;
  readonly actorScope?: Partial<ActivityFactsGuardedPersistenceActorScope>;
}): ActivityFactsGuardedPersistenceContract {
  const { validation, noWritePlan } = input;
  const body = asRecord(validation.normalizedBody);
  const sourcePackageId = asString(body.sourcePackageId) ?? noWritePlan.sourcePackageId;
  const idempotencyKey = asString(body.idempotencyKey) ?? noWritePlan.idempotencyKey;
  const factDecisions = collectFactDecisions(validation);
  const valueObjectDecisions = collectValueObjectDecisions(validation);
  const activityEventDraftId = stableDraftId("draft_activity_event", sourcePackageId, "activity");

  const actorScope: ActivityFactsGuardedPersistenceActorScope = {
    authenticatedUserId: input.actorScope?.authenticatedUserId ?? null,
    ownerActorId: input.actorScope?.ownerActorId ?? null,
    personId: input.actorScope?.personId ?? null,
    organizationId: input.actorScope?.organizationId ?? null,
    timezone: input.actorScope?.timezone ?? "Europe/Warsaw",
  };

  const acceptedOrEditedFacts = factDecisions.filter((decision) => {
    return decision.decision === "accept" || decision.decision === "edit";
  });

  const activityEventPlanned = findPlannedWritesForTable(noWritePlan, "activity_events").length > 0;

  const activityEvent: ActivityFactsGuardedPersistenceActivityEventDraftRow | null =
    activityEventPlanned || acceptedOrEditedFacts.length > 0
      ? {
          table: "activity_events",
          draftId: activityEventDraftId,
          ownerActorId: actorScope.ownerActorId,
          personId: actorScope.personId,
          organizationId: actorScope.organizationId,
          sourcePackageId,
          idempotencyKey,
          sourceText: asString(body.rawText) ?? null,
          eventStatus: "draft_from_save_gate",
          occurredAtIso: null,
          startedAtIso: null,
          endedAtIso: null,
          timezone: actorScope.timezone,
          writeStatus: "not_executed_contract_preview",
        }
      : null;

  const measureIdsByLocalMeasureId: Record<string, string> = {};
  const factIdsByLocalFactId: Record<string, string> = {};
  const reviewItemIdsByLocalFactId: Record<string, string> = {};
  const valueObjectIdsBySemanticObjectKey: Record<string, string> = {};

  const measures: ActivityFactsGuardedPersistenceMeasureDraftRow[] = [];
  const objectFacts: ActivityFactsGuardedPersistenceObjectFactDraftRow[] = [];
  const reviewItems: ActivityFactsGuardedPersistenceReviewItemDraftRow[] = [];

  acceptedOrEditedFacts.forEach((decision, index) => {
    const localFactId = asString(decision.factLocalId) ?? `fact-${index + 1}`;
    const measureLocalId = `measure-${localFactId}`;
    const measureDraftId = stableDraftId("draft_measure", measureLocalId, `measure-${index + 1}`);
    const factDraftId = stableDraftId("draft_fact", localFactId, `fact-${index + 1}`);
    const reviewDraftId = stableDraftId("draft_review", localFactId, `review-${index + 1}`);

    measureIdsByLocalMeasureId[measureLocalId] = measureDraftId;
    factIdsByLocalFactId[localFactId] = factDraftId;
    reviewItemIdsByLocalFactId[localFactId] = reviewDraftId;

    measures.push({
      table: "activity_event_measures",
      draftId: measureDraftId,
      activityEventDraftId,
      localMeasureId: measureLocalId,
      measureType: "duration",
      numericValue: null,
      unit: null,
      confidence: null,
      source: decision.decision === "edit" ? "user_edited" : "save_gate_contract",
      writeStatus: "not_executed_contract_preview",
    });

    objectFacts.push({
      table: "activity_object_facts",
      draftId: factDraftId,
      activityEventDraftId,
      measureDraftId,
      localFactId,
      semanticObjectKey: localFactId,
      valueObjectId: null,
      measureType: "duration",
      numericValue: null,
      unit: null,
      reviewStatus: normalizeObjectFactReviewStatus(decision.decision),
      factSourceType: decision.decision === "edit" ? "user_edited" : "user_confirmed",
      ownerActorId: actorScope.ownerActorId,
      writeStatus: "not_executed_contract_preview",
    });

    reviewItems.push({
      table: "activity_fact_review_items",
      draftId: reviewDraftId,
      activityEventDraftId,
      objectFactDraftId: factDraftId,
      localFactId,
      reviewDecision: normalizeReviewDecision(decision.decision),
      reasonRu: asString(decision.reasonRu),
      reviewerActorId: actorScope.ownerActorId,
      writeStatus: "not_executed_contract_preview",
    });
  });

  valueObjectDecisions.forEach((decision, index) => {
    const semanticObjectKey = asString(decision.semanticObjectKey) ?? `semantic-object-${index + 1}`;
    const selectedExistingValueObjectId = asString(decision.selectedExistingValueObjectId);

    if (selectedExistingValueObjectId) {
      valueObjectIdsBySemanticObjectKey[semanticObjectKey] = selectedExistingValueObjectId;
      return;
    }

    if (decision.decision === "create_new") {
      valueObjectIdsBySemanticObjectKey[semanticObjectKey] = stableDraftId(
        "future_value_object",
        semanticObjectKey,
        `value-object-${index + 1}`
      );
    }
  });

  const recalculationQueueItems: ActivityFactsGuardedPersistenceRecalculationQueueDraftRow[] =
    acceptedOrEditedFacts.length > 0
      ? [
          {
            table: "activity_fact_recalculation_queue",
            draftId: stableDraftId("draft_recalc_queue", sourcePackageId, "activity"),
            activityEventDraftId,
            reason: "activity_fact_created",
            affectedValueObjectIds: Object.values(valueObjectIdsBySemanticObjectKey),
            affectedSemanticObjectKeys: [
              ...acceptedOrEditedFacts.map((decision) => {
                return asString(decision.factLocalId) ?? "unknown_fact";
              }),
              ...Object.keys(valueObjectIdsBySemanticObjectKey),
            ],
            ownerActorId: actorScope.ownerActorId,
            writeStatus: "not_executed_contract_preview",
          },
        ]
      : [];

  const draftIdMap: ActivityFactsGuardedPersistenceDraftIdMap = {
    activityEventId: activityEventDraftId,
    measureIdsByLocalMeasureId,
    factIdsByLocalFactId,
    reviewItemIdsByLocalFactId,
    recalculationQueueItemIds: recalculationQueueItems.map((row) => row.draftId),
    valueObjectIdsBySemanticObjectKey,
  };

  const plannedTargetTables: ActivityFactsSaveGatePlanTargetTable[] = [];

  noWritePlan.plannedWrites.forEach((write) => {
    if (!plannedTargetTables.includes(write.targetTable)) {
      plannedTargetTables.push(write.targetTable);
    }
  });

  const blockers: string[] = [];

  if (!validation.ok) {
    blockers.push("validation_not_ok");
  }

  if (!activityEvent) {
    blockers.push("no_activity_event_draft_row");
  }

  if (acceptedOrEditedFacts.length === 0) {
    blockers.push("no_accepted_or_edited_fact_decisions");
  }

  return {
    contractMode: "activity_facts_guarded_persistence_contract_v1",
    persistenceMode: "server_mediated_write_disabled",
    sourcePackageId,
    idempotencyKey,
    actorScope,
    noWritePlan,
    draftIdMap,
    draftRows: {
      activityEvent,
      measures,
      objectFacts,
      reviewItems,
      recalculationQueueItems,
    },
    plannedWrites: noWritePlan.plannedWrites,
    plannedTargetTables,
    safety: {
      dbReadExecuted: false,
      dbWriteExecuted: false,
      sqlExecuted: false,
      externalAiCallExecuted: false,
      rowsActuallyWritten: 0,
      productionWriteEnabled: false,
    },
    blockers,
    warnings: [
      "contract_only_no_persistence",
      "draft_rows_are_not_database_rows",
      "real_write_requires_separate_runtime_gate",
    ],
  };
}

