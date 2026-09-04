import fs from "node:fs";
import path from "node:path";
const ROOT = process.cwd();
let failures = 0;

function check(name, condition, detail = "") {
  if (condition) {
    console.log(`${name}: PASS`);
    return;
  }
  failures += 1;
  console.error(`${name}: FAIL${detail ? ` - ${detail}` : ""}`);
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const state = read("src/lib/activity/basic-intake-analysis-state.ts");
const analyzer = read("src/lib/activity/activity-basic-intake-analysis.server.ts");
const summary = read("src/lib/reality-curator/model-availability-summary.server.ts");
const journey = read("src/lib/reality-curator/journey-log.server.ts");
const queue = read("src/app/api/admin/reality-curator/signals/route.ts");
const client = read("src/app/admin/reality-curator/signals/reality-curator-signals-client.tsx");
const backfill = read("scripts/reality-curator/backfill-journey-v1.mjs");

check("SAFE_FALLBACK_SEARCH_STATUS", analyzer.includes('typicalActivitySearchStatus: "not_run" | "failed"'));
check("SAFE_FALLBACK_NO_NO_MATCH", !/fallbackAnalysis[\s\S]{0,2600}noSuitableTypicalActivity:\s*templateCandidates\.length\s*===\s*0/.test(analyzer));
check("SAFE_FALLBACK_RETRYABLE", analyzer.includes('analysisMode: "safe_server_fallback"') && analyzer.includes("fullAiAnalysisCompleted: false") && analyzer.includes("retryable: true"));
check("SAFE_FALLBACK_MEASUREMENTS_RETAINED", analyzer.includes("measurements: deterministicMeasurements"));
check("FULL_AI_SHORT_CIRCUIT_ONLY", analyzer.includes("hasCompletedTypicalActivitySearch(existing)"));
check("MODEL_UNAVAILABLE_APPEND_LOG", analyzer.includes("BASIC_INTAKE_MODEL_AVAILABILITY_PROCESSOR") && analyzer.includes('eventCode: "model_unavailable"'));
check("MODEL_UNAVAILABLE_ONLY_BEFORE_PROVIDER_COMPLETION", analyzer.includes("let providerCallCompleted = false") && analyzer.includes("providerCallCompleted = true") && analyzer.includes("const modelUnavailable = !providerCallCompleted") && analyzer.includes("if (modelUnavailable)"));
check("PROVIDER_ATTEMPT_STATE", analyzer.includes("providerCallStarted ? \"failed\" : \"not_run\""));
check("CANDIDATE_LOAD_FAILURE_NOT_COMPLETED_SEARCH", analyzer.includes("const typicalActivitySearchCompleted = !candidateLoadWarning"));

check("ELIGIBILITY_REQUIRES_NANO", state.includes('analysis.analysisMode === "nano_model"'));
check("ELIGIBILITY_REQUIRES_PROVIDER", state.includes("analysis.providerAvailable === true"));
check("ELIGIBILITY_REJECTS_CANDIDATE_WARNING", state.includes("!text(analysis.candidateLoadWarning)"));
check("ELIGIBILITY_REQUIRES_NO_MATCH_AFTER_SEARCH", state.includes("isConfirmedMissingTypicalActivityAnalysis"));
check("OUTSTANDING_EXCLUDES_KNOWN_NON_MODEL_FAILURE", state.includes("analysis.modelUnavailable !== false"));

const protectedRoutes = [
  "src/app/api/admin/reality-curator/signals/route.ts",
  "src/app/api/admin/reality-curator/signals/work/route.ts",
  "src/app/api/admin/reality-curator/signals/object-bootstrap/route.ts",
  "src/app/api/admin/reality-curator/signals/template-parameters/route.ts",
  "src/app/api/admin/reality-curator/signals/templates/route.ts",
];
for (const rel of protectedRoutes) {
  check(`CURATOR_ELIGIBILITY_HELPER ${rel}`, read(rel).includes("isConfirmedMissingTypicalActivityAnalysis"));
}
check("JOURNEY_ELIGIBILITY_HELPER", journey.includes("isConfirmedMissingTypicalActivityAnalysis(input.analysis)"));
check("BACKFILL_REJECTS_FALLBACK", backfill.includes('analysis.analysisMode === "nano_model"') && backfill.includes("analysis.providerAvailable === true"));

const previousPos = summary.indexOf("const previousVisitAt = await readPreviousVisit");
const statsPos = summary.indexOf("const [unavailableSincePreviousVisit, outstandingActivityCount]", previousPos);
const appendPos = summary.indexOf("await appendVisit({", statsPos);
check("VISIT_ORDER_READ_THEN_STATS_THEN_WRITE", previousPos >= 0 && statsPos > previousPos && appendPos > statsPos);
check("VISIT_IDEMPOTENT", summary.includes("readExistingVisit") && summary.includes("visitLogId"));
check("VISIT_EXCLUDES_CURRENT_ID_FROM_PREVIOUS_LOOKUP", summary.includes('.neq("id", visitLogId(input.curatorAppUserId, input.visitId))'));
check("FIRST_COUNT_EVENTS", summary.includes("countUnavailableSince") && summary.includes("processing_status\", \"failed"));
check("SECOND_COUNT_UNIQUE_ACTIVITIES", summary.includes("const activityEventIds = new Set<string>()") && summary.includes("return activityEventIds.size"));
check("LEGACY_FALLBACK_OUTSTANDING_VISIBLE", summary.includes("isOutstandingModelUnavailableAnalysis"));
check("QUEUE_RETURNS_AVAILABILITY", queue.includes("modelAvailability,"));
check("RU_COPY_EXACT", client.includes("С последнего визита куратора модель была недоступна ${unavailableCount} раз. Не обработано ${outstandingActivityCount} активностей."));
check("CLIENT_REUSES_VISIT_ID", client.includes("visitIdRef.current = globalThis.crypto.randomUUID()") && client.includes("visitId: visitIdRef.current") && client.includes("visitIdRef.current = data.modelAvailability.visitId"));

const fixtureSafeFallback = {
  contract: "ARCTOR_BASIC_ACTIVITY_INTAKE_ANALYSIS_V1",
  status: "completed",
  analysisMode: "safe_server_fallback",
  providerAvailable: false,
  modelUnavailable: true,
  typicalActivitySearchStatus: "failed",
  templateCandidates: [],
};
const fixtureNanoNoMatch = {
  contract: "ARCTOR_BASIC_ACTIVITY_INTAKE_ANALYSIS_V1",
  status: "completed",
  analysisMode: "nano_model",
  providerAvailable: true,
  typicalActivitySearchStatus: "completed",
  noSuitableTypicalActivity: true,
  templateCandidates: [],
};
const fixtureNanoCandidateFailure = {
  ...fixtureNanoNoMatch,
  typicalActivitySearchStatus: "failed",
  candidateLoadWarning: "CANDIDATE_LOAD_FAILED",
};

function fixtureEligible(analysis) {
  const searchStatus = String(analysis.typicalActivitySearchStatus ?? "").trim();
  const searchCompleted = searchStatus
    ? searchStatus === "completed"
    : analysis.analysisMode === "nano_model" && analysis.providerAvailable === true;
  return (
    analysis.contract === "ARCTOR_BASIC_ACTIVITY_INTAKE_ANALYSIS_V1" &&
    analysis.status === "completed" &&
    analysis.analysisMode === "nano_model" &&
    analysis.providerAvailable === true &&
    !String(analysis.candidateLoadWarning ?? "").trim() &&
    searchCompleted &&
    analysis.noSuitableTypicalActivity === true &&
    Array.isArray(analysis.templateCandidates) &&
    analysis.templateCandidates.length === 0
  );
}

check("FIXTURE_SAFE_FALLBACK_REJECTED", fixtureEligible(fixtureSafeFallback) === false);
check("FIXTURE_REAL_NO_MATCH_ACCEPTED", fixtureEligible(fixtureNanoNoMatch) === true);
check("FIXTURE_CANDIDATE_LOAD_FAILURE_REJECTED", fixtureEligible(fixtureNanoCandidateFailure) === false);

function fixtureOutstandingModelUnavailable(analysis) {
  return (
    analysis.contract === "ARCTOR_BASIC_ACTIVITY_INTAKE_ANALYSIS_V1" &&
    analysis.analysisMode === "safe_server_fallback" &&
    analysis.modelUnavailable !== false &&
    !fixtureEligible(analysis)
  );
}

check("FIXTURE_MODEL_UNAVAILABLE_OUTSTANDING", fixtureOutstandingModelUnavailable(fixtureSafeFallback) === true);
check("FIXTURE_INTERNAL_FALLBACK_NOT_MODEL_UNAVAILABLE", fixtureOutstandingModelUnavailable({ ...fixtureSafeFallback, modelUnavailable: false, providerAvailable: true }) === false);

if (failures > 0) {
  console.error(`ARCTOR_REALITY_CURATOR_MODEL_UNAVAILABILITY_HOTFIX_V1_VALIDATION: FAIL (${failures})`);
  process.exit(1);
}
console.log("ARCTOR_REALITY_CURATOR_MODEL_UNAVAILABILITY_HOTFIX_V1_VALIDATION: PASS");
