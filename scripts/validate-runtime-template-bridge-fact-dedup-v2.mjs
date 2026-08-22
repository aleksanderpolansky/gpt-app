import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [];
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));
const has = (text, ...needles) => needles.every((needle) => text.includes(needle));
const lacks = (text, ...needles) => needles.every((needle) => !text.includes(needle));
const check = (name, passed, detail = "") => checks.push({ name, passed: Boolean(passed), detail });

const sqlPath = "supabase/manual-applied/20260821_runtime_template_bridge_fact_dedup_v2.sql";
const postPath = "supabase/diagnostics/20260821_runtime_template_bridge_fact_dedup_v2_postcheck_READONLY.sql";
const rollbackPath = "supabase/rollbacks/20260821_runtime_template_bridge_fact_dedup_v2_ROLLBACK.sql";
const matcherPath = "src/lib/activity/typical-activity-template-matcher.server.ts";
const validatorPath = "scripts/validate-runtime-template-bridge-fact-dedup-v2.mjs";
const recoveryPath = "docs/recovery/ARCTOR_RUNTIME_TEMPLATE_BRIDGE_FACT_DEDUP_V2_RU.md";
const evidencePath = "docs/recovery/evidence/HELP_FILES/ARCTOR_RUNTIME_TEMPLATE_BRIDGE_FACT_DEDUP_V2_EVIDENCE.json";
const quickPath = "src/app/api/activity/quick-capture/route.ts";
const semanticPath = "src/lib/ai/activitySemanticReviewA31.server.ts";
const analyticsPath = "src/app/api/value-objects/[id]/analytics-profile/route.ts";
const packagePatchToolPath = "../tools/apply-runtime-template-bridge-fact-dedup-v2.mjs";

for (const rel of [sqlPath, postPath, rollbackPath, matcherPath, validatorPath, recoveryPath, evidencePath]) {
  check(`FILE_EXISTS:${rel}`, exists(rel));
}

const sql = exists(sqlPath) ? read(sqlPath) : "";
const post = exists(postPath) ? read(postPath) : "";
const rollback = exists(rollbackPath) ? read(rollbackPath) : "";
const matcher = exists(matcherPath) ? read(matcherPath) : "";
const recovery = exists(recoveryPath) ? read(recoveryPath) : "";
const evidence = exists(evidencePath) ? read(evidencePath) : "";
const quick = exists(quickPath) ? read(quickPath) : "";
const semantic = exists(semanticPath) ? read(semanticPath) : "";
const analytics = exists(analyticsPath) ? read(analyticsPath) : "";
const packagePatchTool = exists(packagePatchToolPath) ? read(packagePatchToolPath) : "";

function hasNoTrailingWhitespace(text) {
  return text.replace(/\r\n/g, "\n").split("\n").every((line) => !/[ \t]+$/.test(line));
}

function hasExactlyOneFinalNewline(text) {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return normalized.endsWith("\n") && !normalized.endsWith("\n\n");
}

const newTextPayloads = [
  [sqlPath, sql],
  [postPath, post],
  [rollbackPath, rollback],
  [matcherPath, matcher],
  [validatorPath, exists(validatorPath) ? read(validatorPath) : ""],
  [recoveryPath, recovery],
  [evidencePath, evidence],
];

for (const [rel, fileText] of newTextPayloads) {
  check(`TEXT_NO_TRAILING_WHITESPACE:${rel}`, hasNoTrailingWhitespace(fileText));
  check(`TEXT_SINGLE_FINAL_NEWLINE:${rel}`, hasExactlyOneFinalNewline(fileText));
}

check("SQL_MATCH_RPC_V2", has(sql, "apply_activity_template_match_v2", "p_residual_review_required boolean"));
check("SQL_NO_FACT_INSERT", lacks(sql.toLowerCase(), "insert into public.activity_object_facts"));
check("SQL_NO_HISTORY_BACKFILL", lacks(sql.toLowerCase(), "update public.activity_events set impact_profile_id", "insert into public.activity_events"));
check("SQL_PROFILE_SNAPSHOT", has(sql, "trg_activity_events_impact_profile_v1", "impact_profile_id"));
check("SQL_RESIDUAL_REVIEW_STATUS", has(sql, "template_matched_residual_pending", "template_virtual_plus_residual_review"));
check("SQL_RECEIPT_REVIEW_GATE", has(sql, "'requiresHumanReview',p_residual_review_required", "'reviewHref',case when p_residual_review_required"));
check("SQL_TEMPLATE_TITLE_SNAPSHOT", has(sql, "'templateTitle',v_template_title"));
check("SQL_SERVER_COVERED_PARAMETERS", has(sql, "serverCoveredParameterCodes", "process_count", "repetition_count", "distance_m", "duration_seconds"));
check("SQL_DEDUP_VIEW", has(sql, "activity_object_analytics_inputs_v1", "physical_confirmed", "template_virtual", "not exists"));
check("SQL_DEDUP_KEY_EVENT", has(sql, "f.activity_event_id=v.event_id", "f.value_object_id=v.target_value_object_id"));
check("SQL_SERVICE_ROLE_RPC", has(sql, "grant execute on function public.apply_activity_template_match_v2", "to service_role"));
check("SQL_BROWSER_RPC_BLOCKED", has(sql, "from public,anon,authenticated"));
check("SQL_VIEW_BROWSER_BLOCKED", has(sql, "revoke all on table public.activity_object_analytics_inputs_v1 from public,anon,authenticated"));
check("POSTCHECK_READ_ONLY", lacks(post.toLowerCase(), "\ninsert ", "\nupdate ", "\ndelete ", "\ndrop ", "\nalter ", "\ncreate "));
check("POSTCHECK_20", has(post, "20_rpc_server_covered_parameters", "bool_and(passed)") && post.includes("allPass"));
check("POSTCHECK_FIX2_REVISION", has(post, "postcheckRevision', 'FIX2", "15_view_physical_first_dedup"));
check("POSTCHECK_DEDUP_ALIAS_AGNOSTIC", has(post, "activity_event_id=v.event_id", "value_object_id=v.target_value_object_id", "acting_as_actor_id=v.acting_as_actor_id", "fact_status=''confirmed''") && !post.includes("f.activity_event_id=v.event_id"));
check("ROLLBACK_LAYER_ONLY", has(rollback, "drop view if exists public.activity_object_analytics_inputs_v1", "drop function if exists public.apply_activity_template_match_v2"));
check("ROLLBACK_NO_DATA_DELETE", lacks(rollback.toLowerCase(), "delete from", "truncate", "update public.activity_events"));

check("MATCHER_NANO_ONLY", has(matcher, 'const MODEL_TIER = "nano"', 'modelTierPolicy: "nano_only_for_template_identity"'));
check("MATCHER_NO_STANDARD_FALLBACK", lacks(matcher, 'MODEL_TIER = "standard"', "gpt-5.4-mini"));
check("MATCHER_MAX_24_SHORTLIST", has(matcher, "const MAX_CANDIDATES = 24", "scored.slice(0, MAX_CANDIDATES)"));
check("MATCHER_PROVIDER_NO_OBJECT_CATALOG", has(matcher, "observationObjectsSentToProvider: false", "candidateTemplateOnly: true"));
check("MATCHER_PROVIDER_INDEX_NOT_UUID", has(matcher, "candidateIndex MUST refer", "Never output a UUID"));
check("MATCHER_CONFIDENCE_THRESHOLD", has(matcher, "MATCH_CONFIDENCE_THRESHOLD = 0.82", "confidence >= MATCH_CONFIDENCE_THRESHOLD"));
check("MATCHER_RESIDUAL_GATE_SCHEMA", has(matcher, 'required: ["decision", "candidateIndex", "confidence", "residualReviewRequired"]', "residualGateOnly: true"));
check("MATCHER_RESIDUAL_GATE_NOT_MAPPING", has(matcher, "Do NOT interpret, classify or map that additional content", "Do not invent any additional fact"));
check("MATCHER_CLEAN_TEMPLATE_EXAMPLE_POLICY", has(matcher, "repetitions/distance/duration/time/context words", "residualReviewRequired MUST be false"));
check("MATCHER_IMAGE_FORCES_RESIDUAL", has(matcher, "imageEvidencePresent", "providerResidualReviewRequired || imageEvidencePresent"));
check("MATCHER_REPETITIONS_SERVER", has(matcher, "extractRepetitionCount", "p_repetition_count"));
check("MATCHER_DISTANCE_SERVER", has(matcher, "extractDistanceMeters", "p_distance_m"));
check("MATCHER_DURATION_SERVER", has(matcher, "activity.duration_minutes * 60", "p_duration_seconds"));
check("MATCHER_APPLY_RPC_V2", has(matcher, 'supabase.rpc("apply_activity_template_match_v2"', "p_residual_review_required"));
check("MATCHER_NO_OBJECT_FACT_WRITES", lacks(matcher, '.from("activity_object_facts")', "insert into public.activity_object_facts"));
check("MATCHER_BUDGET_PREFLIGHT", has(matcher, "preflight_ai_pilot_call_budget_v1", "ai_usage_events"));
check("MATCHER_CONTEXT_MANIFEST", has(matcher, "createAiAnalysisExecution", "createAiContextManifest", "markAiContextManifestValidated"));
check("MATCHER_NO_PROVIDER_STORE", has(matcher, "store: false", "storeProviderState: false"));
check("MATCHER_NO_RETRIES", has(matcher, "maxRetries: 0"));

if (quick) {
  check("QUICK_MATCHER_IMPORT", has(quick, "typical-activity-template-matcher.server", "matchActivityToTypicalTemplateV1"));
  check("QUICK_TEMPLATE_MATCH_SYNCHRONOUS", has(quick, "const reviewPlan = await resolveTypicalTemplateReviewPlan", "shouldScheduleSemanticReview"));
  check("QUICK_STANDARD_REVIEW_CONDITIONAL", has(quick, "if (reviewPlan.shouldScheduleSemanticReview)", "scheduleBackgroundSemanticReview"));
  check("QUICK_NO_PARALLEL_ALWAYS", lacks(quick, "scheduleBackgroundActivityResolution"));
  check("QUICK_RECEIPT_REFRESH", has(quick, "const refreshedReceipt = await readReviewFirstReceipt", "responseResult"));
}

if (semantic) {
  check("SEMANTIC_RESIDUAL_MODE", has(semantic, "ARCTOR_RUNTIME_TEMPLATE_MATCH_V2", "template_residual_facts", "residualTemplateReview"));
  check("SEMANTIC_RESIDUAL_MIN_ONE", has(semantic, "input.residualMode ? 1 : MIN_PROPOSALS", "residualMode ? 1 : MIN_PROPOSALS"));
  check("SEMANTIC_NO_TEMPLATE_REANALYSIS", has(semantic, "Do NOT propose the recognized typical activity itself", "Do NOT infer symptoms"));
  check("SEMANTIC_NO_ACTIVITY_DURATION_ON_RESIDUAL", has(semantic, "includeActivityDuration: !residualMode", "input.includeActivityDuration &&"));
  check("SEMANTIC_HASH_SEPARATES_MODES", has(semantic, "review-mode:template-residual", "template-id:"));
  check("SEMANTIC_SERVER_COVERAGE_CONTEXT", has(semantic, "serverCoveredParameterCodes", "recognizedTypicalActivity"));
}

if (analytics) {
  check("ANALYTICS_UNIFIED_SOURCE", has(analytics, '.from("activity_object_analytics_inputs_v1")'));
  check("ANALYTICS_OLD_SOURCE_REMOVED", lacks(analytics, `.from("activity_object_facts")\n    .select(\n      "value_object_id,value_numeric,measure_type,period_start,period_end,metadata,created_at"`));
}

if (packagePatchTool) {
  check("PATCHER_ANALYTICS_SCOPED_FUNCTION", has(packagePatchTool, "function replaceAnalyticsFactSource", 'text.indexOf("async function loadFacts(")', 'text.indexOf("\\nfunction countMissedRefreshPeriods(", functionStart)'));
  check("PATCHER_ANALYTICS_TOKEN_ONLY", has(packagePatchTool, 'const oldToken = \'.from("activity_object_facts")\';', 'const newToken = \'.from("activity_object_analytics_inputs_v1")\';'));
  check("PATCHER_ANALYTICS_FAIL_CLOSED", has(packagePatchTool, "ANALYTICS_FACT_SOURCE_COUNT_MISMATCH:old=${oldHits}:new=${newHits}"));
  check("PATCHER_SELF_TEST", has(packagePatchTool, "function runSelfTest()", "SELF_TEST_ANALYTICS_SCOPED_REPLACEMENT=PASS", "SELF_TEST_ANALYTICS_PRODUCTION_BASELINE_SHAPE=PASS", 'repo === "--self-test"'));
}

check("RECOVERY_THREE_MODES", has(recovery.toLowerCase(), "три runtime-режима", "типовая активность + остаточные факты", "типовая активность не найдена"));
check("RECOVERY_NO_MAGIC_67", lacks(recovery, "67 ЦО/ОН", "ровно 67"));
check("RECOVERY_DEDUP", has(recovery, "activity_object_analytics_inputs_v1", "физический подтверждённый факт имеет приоритет"));
check("RECOVERY_NO_BACKFILL", has(recovery, "Исторический backfill отсутствует"));
check("EVIDENCE_NO_PROD_ANALYSIS", has(evidence, '"production_supabase_used_for_analysis": false'));
check("EVIDENCE_TWO_AI_STAGES", has(evidence, '"template_match_ai": "nano"', '"residual_fact_ai": "standard_existing_a31"'));
check("RECOVERY_V3_PATCHER_FAILURE_RECORDED", has(recovery, "ANALYTICS_FACT_SOURCE_COUNT_MISMATCH:0", "ROLLBACK=PASS", "PATCH_TOOL_SELF_TEST"));
check("EVIDENCE_V3_PATCHER_HOTFIX", has(evidence, '"source_release_attempt_v2"', '"rollback": "PASS"'));
check("RECOVERY_V4_WHITESPACE_FAILURE_RECORDED", has(recovery.toLowerCase(), "git diff --cached --check", "trailing whitespace", "rollback=pass"));
check("EVIDENCE_V4_WHITESPACE_HOTFIX", has(evidence, '"source_package_revision": "V4_RECOVERY_WHITESPACE_FIX"', '"source_release_attempt_v3"', '"next_build_passed": true'));
check("PACKAGE_NO_MAGIC_67", ![sql, matcher, recovery, evidence].some((text) => text.includes("67 ЦО/ОН") || text.includes("ровно 67")));

const failed = checks.filter((item) => !item.passed);
for (const item of checks) {
  console.log(`${item.passed ? "PASS" : "FAIL"} ${item.name}${item.detail ? ` :: ${item.detail}` : ""}`);
}
console.log(`SUMMARY total=${checks.length} passed=${checks.length - failed.length} failed=${failed.length}`);
if (failed.length > 0) process.exit(1);
