import { footballWithChildActivityProcessingPreview } from "@/data/activity-to-value-objects/football-with-child-preview";
import type {
  ActivityFactsSaveGateRequest,
  ActivityFactsSaveGateResponse,
} from "@/types/activity-facts-save-gate";

export const saveGateContractPreviewRequest: ActivityFactsSaveGateRequest = {
  routeMode: "contract_preview_only",
  idempotencyKey: "fixture-save-gate-football-with-child-30m-v1",
  sourcePackageId: footballWithChildActivityProcessingPreview.packageId,
  activityProcessingPackage: footballWithChildActivityProcessingPreview,
  factDecisions: [
    {
      factLocalId: "fact-family-time-30m",
      decision: "accept",
      reasonRu: "Семейное время найдено как существующий Value Object.",
    },
    {
      factLocalId: "fact-physical-activity-30m",
      decision: "accept",
      reasonRu: "Физическая активность найдена как существующий Value Object.",
    },
    {
      factLocalId: "fact-football-30m",
      decision: "defer",
      reasonRu: "Сначала нужно подтвердить создание или выбор Value Object 'Футбол'.",
    },
    {
      factLocalId: "fact-play-with-child-30m",
      decision: "defer",
      reasonRu: "Сначала нужно подтвердить создание 'Игра с ребёнком'.",
    },
    {
      factLocalId: "fact-outdoor-time-30m",
      decision: "defer",
      reasonRu: "Нужно уточнить, была ли активность действительно на свежем воздухе.",
    },
  ],
  editedFactDecisions: [],
  valueObjectCandidateDecisions: [
    {
      semanticObjectKey: "football",
      proposedTitleRu: "Футбол",
      decision: "defer",
      selectedExistingValueObjectId: null,
      selectedExistingValueObjectTitle: null,
      proposedParentValueObjectId: "VO_DEMO_PHYSICAL_ACTIVITY",
      proposedParentTitleRu: "Физическая активность",
      reasonRu: "Пользователь ещё не подтвердил создание объекта 'Футбол'.",
    },
    {
      semanticObjectKey: "play_with_child",
      proposedTitleRu: "Игра с ребёнком",
      decision: "defer",
      selectedExistingValueObjectId: null,
      selectedExistingValueObjectTitle: null,
      proposedParentValueObjectId: "VO_DEMO_FAMILY_TIME",
      proposedParentTitleRu: "Семейное время",
      reasonRu: "Пользователь ещё не подтвердил создание объекта 'Игра с ребёнком'.",
    },
    {
      semanticObjectKey: "outdoor_time",
      proposedTitleRu: "Время на свежем воздухе",
      decision: "defer",
      selectedExistingValueObjectId: null,
      selectedExistingValueObjectTitle: null,
      proposedParentValueObjectId: "VO_DEMO_ORGANISM",
      proposedParentTitleRu: "Организм",
      reasonRu: "Нужно уточнить контекст, потому что улица не указана явно.",
    },
  ],
  clientSafetyConfirmation: {
    userReviewedPreview: true,
    userConfirmedMissingValueObjectCreation: false,
    userConfirmedFactWrite: false,
    userUnderstandsPreviewIsNotDiagnosis: true,
  },
};

export const saveGateContractPreviewResponse: ActivityFactsSaveGateResponse = {
  ok: true,
  routeMode: "contract_preview_only",
  writeStatus: "not_executed_contract_preview",
  endpoint: "/api/activity/facts/save-gate",
  dbWriteExecuted: false,
  sqlExecuted: false,
  openAiCallExecuted: false,
  createdIds: {
    activityEventId: null,
    measureIds: [],
    valueObjectIds: [],
    factIds: [],
    reviewItemIds: [],
    recalculationQueueIds: [],
  },
  skipped: {
    factLocalIds: [
      "fact-football-30m",
      "fact-play-with-child-30m",
      "fact-outdoor-time-30m",
    ],
    semanticObjectKeys: ["football", "play_with_child", "outdoor_time"],
    reasonsRu: [
      "Нет подтверждения создания или выбора Value Object 'Футбол'.",
      "Нет подтверждения создания Value Object 'Игра с ребёнком'.",
      "Не подтверждено, что активность была на свежем воздухе.",
    ],
  },
  plannedWrites: [
    {
      targetTable: "activity_events",
      operation: "insert",
      localSourceId: "fixture-football-with-child-30m-v1",
      plannedDbId: null,
      descriptionRu:
        "Будущий save gate создаст activity_event для исходной активности.",
      writeStatus: "not_executed_contract_preview",
    },
    {
      targetTable: "activity_event_measures",
      operation: "insert",
      localSourceId: "measure-duration-30m",
      plannedDbId: null,
      descriptionRu:
        "Будущий save gate создаст measure duration=30 minute.",
      writeStatus: "not_executed_contract_preview",
    },
    {
      targetTable: "activity_object_facts",
      operation: "insert",
      localSourceId: "fact-family-time-30m",
      plannedDbId: null,
      descriptionRu:
        "Будущий save gate создаст user-owned fact: family_time 30 minute.",
      writeStatus: "not_executed_contract_preview",
    },
    {
      targetTable: "activity_object_facts",
      operation: "insert",
      localSourceId: "fact-physical-activity-30m",
      plannedDbId: null,
      descriptionRu:
        "Будущий save gate создаст user-owned fact: physical_activity 30 minute.",
      writeStatus: "not_executed_contract_preview",
    },
    {
      targetTable: "activity_fact_review_items",
      operation: "insert",
      localSourceId: "review-family-time-30m",
      plannedDbId: null,
      descriptionRu:
        "Будущий save gate создаст review/audit item для принятого факта family_time.",
      writeStatus: "not_executed_contract_preview",
    },
    {
      targetTable: "activity_fact_recalculation_queue",
      operation: "insert",
      localSourceId: "queue-family-time-physical-activity",
      plannedDbId: null,
      descriptionRu:
        "Будущий save gate поставит аналитику в очередь пересчёта по family_time и physical_activity.",
      writeStatus: "not_executed_contract_preview",
    },
  ],
  safety: {
    serverMediatedOnly: true,
    directBrowserSupabaseWriteAllowed: false,
    duplicateChronologicalTimeAllowed: false,
    medicalDiagnosisAllowed: false,
    notes: [
      "This response is a contract preview only.",
      "No route was created in Step 07.",
      "No database write was executed in Step 07.",
      "The future stable endpoint should be /api/activity/facts/save-gate.",
      "One activity can create several object facts, but total chronological time remains 30 minutes.",
      "Facts linked to shared/system Value Objects remain private user-owned rows.",
    ],
  },
};
