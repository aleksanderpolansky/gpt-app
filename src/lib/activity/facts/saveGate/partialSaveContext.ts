export type ActivityFactsSaveGatePartialSaveContext = {
  readonly contextKey: "partialSaveContext";
  readonly mode: "no_write_preview";
  readonly partialReviewAllowed: true;
  readonly acceptedFactsSaveable: true;
  readonly editedFactsSaveable: true;
  readonly rejectedFactsCreateFacts: false;
  readonly deferredFactsCreateFacts: false;
  readonly ignoredFactsCreateFacts: false;
  readonly pendingFactsCreateFacts: false;
  readonly missingValueObjectBlocksWholeSave: false;
  readonly activityEventRequiresAcceptedOrEditedFact: true;
  readonly zeroAcceptedOrEditedFactsBlockCode: "NO_ACCEPTED_OR_EDITED_FACTS";
  readonly legacyNoAcceptedOrEditedFactsCode: "no_accepted_or_edited_fact_decisions";
  readonly confirmSaveEnabled: false;
  readonly confirmSaveBlockedBy: "ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED";
  readonly productionWriteEnabled: false;
  readonly browserWriteRule: "no direct browser Supabase write";
  readonly futureSaveableFactDecisions: readonly ["accepted", "edited"];
  readonly futureNonFactCreatingDecisions: readonly [
    "rejected",
    "deferred",
    "ignored",
    "pending",
  ];
  readonly missingValueObjectRule: "missing Value Object must not break unrelated accepted facts";
};

export function buildNoWritePartialSaveContext(): ActivityFactsSaveGatePartialSaveContext {
  return {
    contextKey: "partialSaveContext",
    mode: "no_write_preview",
    partialReviewAllowed: true,
    acceptedFactsSaveable: true,
    editedFactsSaveable: true,
    rejectedFactsCreateFacts: false,
    deferredFactsCreateFacts: false,
    ignoredFactsCreateFacts: false,
    pendingFactsCreateFacts: false,
    missingValueObjectBlocksWholeSave: false,
    activityEventRequiresAcceptedOrEditedFact: true,
    zeroAcceptedOrEditedFactsBlockCode: "NO_ACCEPTED_OR_EDITED_FACTS",
    legacyNoAcceptedOrEditedFactsCode: "no_accepted_or_edited_fact_decisions",
    confirmSaveEnabled: false,
    confirmSaveBlockedBy: "ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED",
    productionWriteEnabled: false,
    browserWriteRule: "no direct browser Supabase write",
    futureSaveableFactDecisions: ["accepted", "edited"],
    futureNonFactCreatingDecisions: [
      "rejected",
      "deferred",
      "ignored",
      "pending",
    ],
    missingValueObjectRule:
      "missing Value Object must not break unrelated accepted facts",
  };
}