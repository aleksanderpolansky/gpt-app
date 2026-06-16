export type ActivityFactsSaveGateIdempotencyContext = {
  readonly contextKey: "idempotencyContext";
  readonly mode: "no_write_preview";
  readonly idempotencyKey: string | null;
  readonly sourcePackageId: string | null;
  readonly idempotencyKeyRequiredForConfirmSave: true;
  readonly sourcePackageIdRequiredForConfirmSave: true;
  readonly replaySafe: true;
  readonly duplicateClickCreatesDuplicateFacts: false;
  readonly duplicateRequestPolicy: "same key same payload returns same result";
  readonly conflictPolicy: "same key different payload rejects conflict";
  readonly uniquenessScope: "user_id + idempotency_key";
  readonly requestHashRequiredForRealWrites: true;
  readonly serverMediatedPersistenceRequired: true;
  readonly directBrowserSupabaseWriteAllowed: false;
  readonly protectedTargets: readonly [
    "activity_events",
    "activity_event_measures",
    "activity_object_facts",
    "activity_fact_review_items",
    "activity_fact_recalculation_queue",
  ];
  readonly confirmSaveEnabled: false;
  readonly confirmSaveBlockedBy: "ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED";
  readonly currentImplementation: "contract_only_no_persistence";
  readonly browserWriteRule: "no direct browser Supabase write";
  readonly duplicateClickRule: "duplicate click must not duplicate facts";
  readonly packageRule: "one processing package must not create duplicate activity_event";
};

export function buildNoWriteIdempotencyContext(params: {
  readonly sourcePackageId: string | null;
  readonly idempotencyKey: string | null;
}): ActivityFactsSaveGateIdempotencyContext {
  return {
    contextKey: "idempotencyContext",
    mode: "no_write_preview",
    idempotencyKey: params.idempotencyKey,
    sourcePackageId: params.sourcePackageId,
    idempotencyKeyRequiredForConfirmSave: true,
    sourcePackageIdRequiredForConfirmSave: true,
    replaySafe: true,
    duplicateClickCreatesDuplicateFacts: false,
    duplicateRequestPolicy: "same key same payload returns same result",
    conflictPolicy: "same key different payload rejects conflict",
    uniquenessScope: "user_id + idempotency_key",
    requestHashRequiredForRealWrites: true,
    serverMediatedPersistenceRequired: true,
    directBrowserSupabaseWriteAllowed: false,
    protectedTargets: [
      "activity_events",
      "activity_event_measures",
      "activity_object_facts",
      "activity_fact_review_items",
      "activity_fact_recalculation_queue",
    ],
    confirmSaveEnabled: false,
    confirmSaveBlockedBy: "ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED",
    currentImplementation: "contract_only_no_persistence",
    browserWriteRule: "no direct browser Supabase write",
    duplicateClickRule: "duplicate click must not duplicate facts",
    packageRule: "one processing package must not create duplicate activity_event",
  };
}