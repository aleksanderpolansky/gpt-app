export const ARCTOR_BASIC_ACTIVITY_INTAKE_ANALYSIS_V1 =
  "ARCTOR_BASIC_ACTIVITY_INTAKE_ANALYSIS_V1" as const;

export const BASIC_INTAKE_MODEL_AVAILABILITY_PROCESSOR =
  "basic_activity_intake_ai_availability" as const;
export const BASIC_INTAKE_MODEL_AVAILABILITY_PROCESSOR_VERSION = "1" as const;

type JsonRecord = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function templateCandidates(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function hasCompletedTypicalActivitySearch(
  analysis: JsonRecord,
): boolean {
  const explicitSearchStatus = text(analysis.typicalActivitySearchStatus);
  const searchStatusCompleted =
    explicitSearchStatus.length > 0
      ? explicitSearchStatus === "completed"
      : analysis.analysisMode === "nano_model" &&
        analysis.providerAvailable === true;

  return (
    analysis.contract === ARCTOR_BASIC_ACTIVITY_INTAKE_ANALYSIS_V1 &&
    analysis.status === "completed" &&
    analysis.analysisMode === "nano_model" &&
    analysis.providerAvailable === true &&
    !text(analysis.candidateLoadWarning) &&
    searchStatusCompleted
  );
}

export function isConfirmedMissingTypicalActivityAnalysis(
  analysis: JsonRecord,
): boolean {
  return (
    hasCompletedTypicalActivitySearch(analysis) &&
    analysis.noSuitableTypicalActivity === true &&
    templateCandidates(analysis.templateCandidates).length === 0
  );
}

export function isOutstandingModelUnavailableAnalysis(
  analysis: JsonRecord,
): boolean {
  return (
    analysis.contract === ARCTOR_BASIC_ACTIVITY_INTAKE_ANALYSIS_V1 &&
    analysis.analysisMode === "safe_server_fallback" &&
    analysis.modelUnavailable !== false &&
    !hasCompletedTypicalActivitySearch(analysis)
  );
}
