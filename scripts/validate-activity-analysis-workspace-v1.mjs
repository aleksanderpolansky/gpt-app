import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [];
const check = (name, passed, detail = "") => checks.push({ name, passed: Boolean(passed), detail });
const file = (rel) => path.join(root, rel);
const exists = (rel) => fs.existsSync(file(rel));
const read = (rel) => fs.readFileSync(file(rel), "utf8");
const has = (rel, ...needles) => needles.every((needle) => read(rel).includes(needle));
const lacks = (rel, ...needles) => needles.every((needle) => !read(rel).includes(needle));

const analyzer = "src/lib/activity/activity-basic-intake-analysis.server.ts";
const card = "src/components/activity/activity-basic-intake-analysis-card.tsx";
const aiLab = "src/app/activity-ai-lab/page.tsx";
const journal = "src/app/activity-today/page.tsx";

const quick = "src/app/api/activity/quick-capture/route.ts";
const provider = "src/components/app-shell/ai-navigator-provider.tsx";
const validator = "scripts/validate-activity-analysis-workspace-v1.mjs";
const recovery = "docs/recovery/ARCTOR_ACTIVITY_ANALYSIS_WORKSPACE_V1_RU.md";
const evidence = "docs/recovery/evidence/HELP_FILES/ARCTOR_ACTIVITY_ANALYSIS_WORKSPACE_V1_EVIDENCE.json";
const files = [analyzer, card, aiLab, validator, recovery, evidence];

for (const rel of files) check(`FILE_EXISTS:${rel}`, exists(rel));
for (const rel of files.filter(exists)) {
  const content = read(rel);
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  check(`TEXT_NO_TRAILING_WHITESPACE:${rel}`, !lines.some((line) => /[ \t]+$/.test(line)));
  check(`TEXT_SINGLE_FINAL_NEWLINE:${rel}`, content.endsWith("\n") && !content.endsWith("\n\n"));
}

check("ANALYZER_NANO_PRIMARY", has(analyzer, 'const MODEL_TIER = "nano"'));
check("ANALYZER_ONE_PROVIDER_CALL", (read(analyzer).match(/runAiJsonWithUsageMetadata</g) ?? []).length === 1);
check("ANALYZER_ZERO_RETRIES", has(analyzer, "const MAX_RETRIES = 0", "store: false"));
check("ANALYZER_NO_OBJECT_CATALOG", has(analyzer, "observationObjectCatalogSent: false", "impactProfilesSent: false"));
check("ANALYZER_SAFE_FALLBACK", has(analyzer, 'analysisMode: "safe_server_fallback"', "deterministicTemplateFallback", "extractDeterministicMeasurements"));
check("ANALYZER_FALLBACK_STRICT_TEMPLATE", has(analyzer, "candidate.score >= 0.98"));
check("ANALYZER_FALLBACK_REPETITIONS", has(analyzer, 'parameterCode: "repetition_count"', 'unit: "repetition"'));
check("ANALYZER_FALLBACK_DISTANCE", has(analyzer, 'parameterCode: "distance"'));
check("ANALYZER_FALLBACK_DURATION", has(analyzer, 'parameterCode: "duration"'));
check("ANALYZER_FALLBACK_MASS", has(analyzer, 'parameterCode: "mass"'));
check("ANALYZER_UNICODE_UNIT_BOUNDARY", has(analyzer, "(?=$|[^\\p{L}\\p{N}_])"));
check("ANALYZER_LENIENT_PROVIDER_ITEMS", lacks(analyzer, "BASIC_INTAKE_MEASUREMENT_CONTRACT_INVALID", "BASIC_INTAKE_TEMPLATE_MATCH_CONTRACT_INVALID"));
check("ANALYZER_NO_FACT_WRITE", lacks(analyzer, '.from("activity_object_facts")', "insert into activity_object_facts"));
check("ANALYZER_NO_TEMPLATE_APPLY", lacks(analyzer, "apply_activity_template_match_v2", "activity_template_id:"));

if (exists(quick)) {
  check("QUICK_CAPTURE_STILL_SAVES_FIRST", has(quick, "authenticatedActivityEventCreate", "scheduleBackgroundBasicIntakeAnalysis"));
  check("QUICK_CAPTURE_BACKGROUND_AFTER", has(quick, "after(async () =>", "analyzeBasicActivityIntakeV1"));
  check("QUICK_CAPTURE_NO_AUTO_TEMPLATE_MATCH", lacks(quick, "matchActivityToTypicalTemplateV1", "apply_activity_template_match_v2"));
  check("QUICK_CAPTURE_NO_AUTO_A31", lacks(quick, "runGlobalObservationPreview", "executeActivityQuickCaptureProcessingRules"));
}
if (exists(provider)) {
  check("RIGHT_RAIL_EXACT_RU_ACK", has(provider, "Активность зафиксирована. Активность доступна для анализа в Журнале активностей."));
  check("RIGHT_RAIL_NO_ANALYSIS_READY_NOTICE", lacks(provider, "Анализ активности готов", "Найдено 3 подходящие типовые активности"));
}

check("CARD_FALLBACK_WARNING", has(card, 'analysisMode?: string', 'analysis.analysisMode === "safe_server_fallback"'));
check("CARD_SEVEN_LOCALES", ["ru:", "en:", "pl:", "uk:", "de:", "es:", "cs:"].every((needle) => read(card).includes(needle)));

check("AI_LAB_ACTIVITY_EVENT_PARAM", has(aiLab, 'searchParams.get("activityEventId")', "/api/activity/events?limit=50"));
check("AI_LAB_USES_BASIC_ANALYSIS", has(aiLab, "useActivityBasicIntakeAnalyses", "ActivityBasicIntakeAnalysisCard", "ActivityLifecycleBadge"));
check("AI_LAB_NO_NEW_ACTIVITY_FORM", lacks(aiLab, "Сообщить, что произошло", "Разобрать произошедшее", "PlannedTargetSelectorPp1", "ActivitySemanticReviewA31"));
check("AI_LAB_NO_ACTION_BUTTONS", lacks(aiLab, "Сохранить связи", "Дополнительный анализ", "fact-materialize", "manual-link"));
check("AI_LAB_SEVEN_LOCALES", ["ru:", "en:", "pl:", "uk:", "de:", "es:", "cs:"].every((needle) => read(aiLab).includes(needle)));

if (exists(journal)) {
  check("JOURNAL_ANALYSIS_LINK", has(journal, "/activity-ai-lab?", "activityEventId"));
  check("JOURNAL_NO_DETAILED_ANALYSIS_CARD", lacks(journal, "<ActivityBasicIntakeAnalysisCard"));
  check("JOURNAL_NO_CONTAINER_BUTTON", lacks(journal, "href={item.containerHref}"));
  check("JOURNAL_NO_OPEN_BUTTON_BLOCK", lacks(journal, "{ui.open}\n                      </button>"));
  check("JOURNAL_NO_EDIT_BUTTON_BLOCK", lacks(journal, "onClick={() => openItem(item, true)}"));
  check("JOURNAL_COMPACT_ANALYSIS_STATUS", has(journal, "getBasicAnalysisStatusText"));
}

check("RECOVERY_SCOPE", has(recovery, "ARCTOR_ACTIVITY_ANALYSIS_WORKSPACE_V1", "safe_server_fallback", "не перезапускаются автоматически"));
check("RECOVERY_NO_DB_CHANGE", has(recovery, "DB schema change: NONE"));
check("EVIDENCE_NO_PROD_READ", has(evidence, '"production_supabase_used_for_analysis": false'));
check("EVIDENCE_BASELINE", has(evidence, '"baseline": "10149d098a6fbd9f5808002fb52f29573444c199"'));

const failed = checks.filter((item) => !item.passed);
for (const item of checks) console.log(`${item.passed ? "PASS" : "FAIL"} ${item.name}${item.detail ? ` ${item.detail}` : ""}`);
console.log(`SUMMARY total=${checks.length} passed=${checks.length - failed.length} failed=${failed.length}`);
if (failed.length) process.exit(1);
