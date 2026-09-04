import fs from "node:fs";

const files = {
  analyzer: "src/lib/activity/activity-basic-intake-analysis.server.ts",
  retryRoute: "src/app/api/activity/intake-analysis/route.ts",
  journey: "src/lib/reality-curator/journey-log.server.ts",
  processing: "src/lib/reality-curator/processing-log.server.ts",
  activityCard: "src/components/activity/activity-basic-intake-analysis-card.tsx",
  curatorClient: "src/app/admin/reality-curator/signals/reality-curator-signals-client.tsx",
};

function read(path) {
  return fs.readFileSync(path, "utf8").replace(/\r\n?/g, "\n");
}

function assertContains(source, needle, label) {
  if (!source.includes(needle)) {
    throw new Error(`${label}: missing ${JSON.stringify(needle)}`);
  }
}

function assertNotContains(source, needle, label) {
  if (source.includes(needle)) {
    throw new Error(`${label}: forbidden ${JSON.stringify(needle)}`);
  }
}

const analyzer = read(files.analyzer);
const retryRoute = read(files.retryRoute);
const journey = read(files.journey);
const processing = read(files.processing);
const activityCard = read(files.activityCard);
const curatorClient = read(files.curatorClient);

assertContains(analyzer, 'type BasicIntakeAnalysisTrigger = "initial" | "retry";', "analysis trigger type");
assertContains(analyzer, 'analysisTrigger?: BasicIntakeAnalysisTrigger;', "analysis trigger input");
assertContains(analyzer, '["repetition", "repetitions", "rep", "reps"].includes(raw)', "canonical repetition aliases");
assertContains(analyzer, 'return "repetition";', "canonical repetition unit");
assertNotContains(analyzer, 'const unit = text(item.unit).toLowerCase();', "raw model unit must not bypass canonicalization");
assertContains(analyzer, 'analysisMode: "nano_model",\n      analysisTrigger,', "successful analysis trigger evidence");
assertContains(analyzer, 'analysisMode: "safe_server_fallback",\n      analysisTrigger,', "fallback trigger evidence");

assertContains(retryRoute, 'analysisTrigger: "retry",', "retry route provenance");

assertContains(journey, 'text(input.analysis.analysisTrigger) === "retry" ? "retry" : "initial";', "journey trigger read");
assertContains(journey, 'labelRu: "Повторный AI-анализ завершён"', "retry journey RU label");
assertContains(journey, 'resultSummaryEn: "AI re-analysis of the activity was completed."', "retry journey EN summary");
assertContains(journey, 'analysisTrigger,\n        ...retryAnalysisMetadata,', "journey trigger metadata persistence");

assertContains(processing, 'return "activity_capture";', "activity capture block");
assertContains(processing, 'return "background_analysis";', "background analysis block");
assertContains(processing, 'return "curator_queue";', "curator queue block");
assertNotContains(processing, 'return "activity_intake";', "legacy conflated block");
assertContains(processing, 'return { ru: "AI-анализ активности", en: "Activity AI analysis" };', "analysis block title");
assertContains(processing, 'return { ru: "Передача в очередь куратора", en: "Curator queue handoff" };', "queue block title");
assertContains(processing, 'analysisEvent?.analysisTrigger === "retry"', "retry-aware processing summary");
assertContains(processing, 'metadata.analysisTrigger === "initial" || metadata.analysisTrigger === "retry"', "processing trigger decode");

assertContains(activityCard, '["repetition", "repetitions", "rep", "reps"].includes(unitCode)', "activity card stored alias compatibility");
assertContains(activityCard, 'UNIT_LABELS[locale][canonicalUnitCode] ?? canonicalUnitCode', "activity card localized canonical unit");

assertContains(curatorClient, 'const REPETITION_UNIT_LABELS: Record<LocaleCode, string>', "curator repetition localization map");
assertContains(curatorClient, '["repetition", "repetitions", "rep", "reps"].includes(code)', "curator stored alias compatibility");
assertContains(curatorClient, '{formatMeasurement(item, locale)}', "curator locale-aware measurement formatting");
assertNotContains(curatorClient, '{formatMeasurement(item)}', "curator raw measurement formatting");

const canonicalizeRepetition = (unit) =>
  ["repetition", "repetitions", "rep", "reps"].includes(unit.toLowerCase())
    ? "repetition"
    : unit.toLowerCase();
for (const alias of ["repetition", "repetitions", "rep", "reps", "REPETITIONS"]) {
  if (canonicalizeRepetition(alias) !== "repetition") {
    throw new Error(`fixture repetition alias failed: ${alias}`);
  }
}

const blockFor = (eventCode) => {
  if (["candidate_signal_registered", "activity_event_saved"].includes(eventCode)) return "activity_capture";
  if (["background_analysis_completed", "missing_typical_activity_detected"].includes(eventCode)) return "background_analysis";
  if (eventCode === "curator_queue_registered") return "curator_queue";
  return "other";
};
if (blockFor("activity_event_saved") !== "activity_capture") throw new Error("fixture activity capture block failed");
if (blockFor("background_analysis_completed") !== "background_analysis") throw new Error("fixture background analysis block failed");
if (blockFor("curator_queue_registered") !== "curator_queue") throw new Error("fixture curator queue block failed");

console.log("ARCTOR_BASIC_INTAKE_LIVE_ACCEPTANCE_CLEANUP_V1_VALIDATION: PASS");
