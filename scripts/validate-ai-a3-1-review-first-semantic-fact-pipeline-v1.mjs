#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [];

function add(name, passed, detail = null) {
  checks.push({ name, passed: Boolean(passed), detail });
}

function read(rel) {
  const file = path.join(root, ...rel.split("/"));
  add(`FILE_EXISTS:${rel}`, fs.existsSync(file));
  return fs.existsSync(file)
    ? fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n")
    : "";
}

function has(text, needle, name) {
  add(name, text.includes(needle), text.includes(needle) ? null : needle);
}

function lacks(text, needle, name) {
  add(name, !text.includes(needle), text.includes(needle) ? needle : null);
}

const quick = read("src/app/api/activity/quick-capture/route.ts");
const reviewQueue = read("src/app/api/activity/review-queue/route.ts");
const page = read("src/app/activity-ai-lab/page.tsx");
const service = read("src/lib/ai/activitySemanticReviewA31.server.ts");
const analysisRoute = read("src/app/api/activity/review-analysis/route.ts");
const commitRoute = read("src/app/api/activity/review-commit/route.ts");
const reviewUi = read("src/components/activity/activity-semantic-review-a31.tsx");
const selectorRoute = read("src/app/api/value-objects/selector/route.ts");
const ruleRoute = read("src/app/api/activity-fact-coefficient-rules/route.ts");
const ruleUi = read(
  "src/components/workspace/value-objects/activity-fact-coefficient-rule-manager.tsx",
);
const parameterManager = read(
  "src/components/workspace/value-objects/value-object-parameter-assignment-manager.tsx",
);
const sql = read(
  "supabase/manual-applied/20260817_ai_a3_1_review_first_semantic_fact_pipeline_v2.sql",
);

has(
  quick,
  "ARCTOR_AI_A3_1_REVIEW_FIRST_CAPTURE_V1",
  "CAPTURE_CONTRACT",
);
has(
  quick,
  "factsWrittenAtCapture: 0",
  "CAPTURE_ZERO_FACTS",
);
has(
  quick,
  "aiCallsAtCapture: 0",
  "CAPTURE_ZERO_AI_CALLS",
);
has(
  quick,
  'quickCaptureReviewStatus: "pending"',
  "CAPTURE_REVIEW_PENDING",
);
has(
  quick,
  'factMaterializationPolicy: "after_semantic_review_only"',
  "CAPTURE_FACT_POLICY",
);
lacks(
  quick,
  "processDurableQuickCaptureSignal",
  "CAPTURE_NO_BACKGROUND_OLD_ANALYSIS",
);
lacks(
  quick,
  "runGlobalObservationPreview",
  "CAPTURE_NO_GLOBAL_PREVIEW",
);
lacks(
  quick,
  "/api/ai/reality/fact-materialize",
  "CAPTURE_NO_FACT_MATERIALIZE",
);

lacks(
  reviewQueue,
  "P5C_DURABLE_REVIEW_WATCHDOG",
  "REVIEW_QUEUE_NO_OLD_WATCHDOG",
);
lacks(
  reviewQueue,
  "processDurableQuickCaptureSignal",
  "REVIEW_QUEUE_NO_OLD_DURABLE_PROCESSOR",
);

has(
  page,
  "ActivitySemanticReviewA31",
  "PAGE_REVIEW_FIRST_COMPONENT",
);
has(
  page,
  "reviewFirstReviewMode",
  "PAGE_REVIEW_FIRST_MODE_SWITCH",
);
has(
  page,
  "payload.activity?.reviewFirst === true",
  "PAGE_REVIEW_FIRST_DETAIL_GUARD",
);
has(
  page,
  "setReviewFirstReviewMode(false)",
  "PAGE_LEGACY_REVIEW_FALLBACK_RETAINED",
);
has(
  page,
  "ARCTOR_AI_A3_1_REVIEW_FIRST_CAPTURE_V1",
  "PAGE_CAPTURE_CONTRACT_BRANCH",
);
has(
  page,
  "Факты ещё не создавались",
  "PAGE_USER_ZERO_FACT_MESSAGE",
);

has(
  service,
  "ARCTOR_AI_A3_1_FREE_SEMANTIC_PROPOSALS_V2",
  "SEMANTIC_REVIEW_CONTRACT",
);
has(
  service,
  "ARCTOR_AI_A3_1_REVIEW_FIRST_CAPTURE_V1",
  "SEMANTIC_SERVICE_REVIEW_FIRST_ONLY",
);
has(
  service,
  "const MIN_PROPOSALS = 8",
  "SEMANTIC_AT_LEAST_SEVEN_ADDITIONAL",
);
has(
  service,
  '"future_use_possibility"',
  "SEMANTIC_FUTURE_USE_LENS",
);
has(
  service,
  '"opportunity_cost"',
  "SEMANTIC_OPPORTUNITY_COST_LENS",
);
has(
  service,
  '"new_obligation"',
  "SEMANTIC_OBLIGATION_LENS",
);
has(
  service,
  '"reputational_result"',
  "SEMANTIC_REPUTATION_LENS",
);
has(
  service,
  "Do not merely paraphrase the action",
  "SEMANTIC_ABSTRACT_REASONING_PROMPT",
);
has(
  service,
  "Never claim that an unstated event actually happened",
  "SEMANTIC_NO_FALSE_EVENT_ASSERTION",
);
lacks(
  service,
  "parameter compatible with leaf",
  "SEMANTIC_NO_PARAMETER_COMPATIBILITY",
);
lacks(
  service,
  "accessibleLeafCatalog",
  "SEMANTIC_PROVIDER_CATALOG_NOT_SENT",
);
lacks(
  service,
  "loadAccessibleLeafCatalog",
  "SEMANTIC_NO_CATALOG_LOAD_FOR_PROVIDER",
);
lacks(
  service,
  "loadActorRecognitionExamples",
  "SEMANTIC_NO_ACTOR_EXAMPLES_SENT_TO_PROVIDER",
);
has(
  service,
  'proposalKind: "semantic_proposal"',
  "SEMANTIC_FREE_PROPOSAL_KIND",
);
has(
  service,
  'valueObjectId: null',
  "SEMANTIC_PROPOSALS_HAVE_NO_DB_ID",
);
has(
  service,
  'searchTerms',
  "SEMANTIC_SEARCH_TERMS_PRESENT",
);
has(
  service,
  'facetHint',
  "SEMANTIC_FACET_HINT_PRESENT",
);
has(
  service,
  "serverLeafResolutionAfterProvider: true",
  "SEMANTIC_SERVER_RESOLUTION_AFTER_PROVIDER",
);
has(
  service,
  "stable, primitive, reusable English",
  "SEMANTIC_PRIMITIVE_PARAMETER_CODES",
);
has(
  service,
  "Normalize units to stable English",
  "SEMANTIC_CANONICAL_UNIT_SLUGS",
);
add(
  "SEMANTIC_ONE_PROVIDER_CALL_IN_CODE",
  (service.match(/await runAiJsonWithUsageMetadata</g) ?? []).length === 1,
);
has(
  service,
  'tierCode: "standard"',
  "SEMANTIC_STANDARD_REQUIRED",
);
has(
  service,
  "standard_required_no_nano_fallback",
  "SEMANTIC_NO_NANO_FALLBACK",
);
lacks(
  service,
  'tierCode: "nano"',
  "SEMANTIC_NANO_NOT_USED",
);
has(
  service,
  "process_count",
  "SEMANTIC_PROCESS_COUNT_SERVER_ADDED",
);
has(
  service,
  "server activity duration",
  "SEMANTIC_SERVER_DURATION_AUTHORITATIVE",
);
has(
  service,
  'runtimeCode: "activity_semantic_preview"',
  "SEMANTIC_RUNTIME_CODE_TYPE_COMPATIBLE",
);
lacks(
  service,
  'runtimeCode: "global_observation_preview"',
  "SEMANTIC_RUNTIME_CODE_NO_UNKNOWN_LITERAL",
);

has(
  analysisRoute,
  "analyzeActivityForSemanticReviewA31",
  "ANALYSIS_ROUTE_SERVICE",
);
has(
  analysisRoute,
  'from "../../../../../lib/activity/activityUserContext"',
  "ANALYSIS_ROUTE_ACTIVITY_CONTEXT_IMPORT_DEPTH",
);
lacks(
  analysisRoute,
  'from "../../../../../../lib/activity/activityUserContext"',
  "ANALYSIS_ROUTE_NO_OVERDEEP_ACTIVITY_CONTEXT_IMPORT",
);
has(
  commitRoute,
  "commit_activity_semantic_review_a31_v1",
  "COMMIT_ROUTE_RPC",
);
has(
  commitRoute,
  "selectedLeafIds",
  "COMMIT_ROUTE_HUMAN_SELECTION",
);
has(
  commitRoute,
  "primaryLeafId",
  "COMMIT_ROUTE_PRIMARY_LEAF_SELECTION",
);
has(
  commitRoute,
  'primaryProposal.proposalKind === "semantic_proposal"',
  "COMMIT_ROUTE_FREE_PROPOSAL_MODE",
);
has(
  commitRoute,
  'proposals_json: nextProposals',
  "COMMIT_ROUTE_PRIMARY_BRIDGE_TO_EXISTING_RPC",
);
has(
  commitRoute,
  'freeSemanticMode ? {} : primaryCorrection',
  "COMMIT_ROUTE_LEGACY_CORRECTION_COMPATIBILITY",
);
has(
  commitRoute,
  'from "../../../../../lib/activity/activityUserContext"',
  "COMMIT_ROUTE_ACTIVITY_CONTEXT_IMPORT_DEPTH",
);
has(
  commitRoute,
  'from "../../../../../lib/supabase"',
  "COMMIT_ROUTE_SUPABASE_IMPORT_DEPTH",
);
lacks(
  commitRoute,
  'from "../../../../../../lib/',
  "COMMIT_ROUTE_NO_OVERDEEP_ROOT_LIB_IMPORT",
);

has(
  reviewUi,
  "Для каждого оставленного листа будет создан отдельный факт",
  "REVIEW_UI_FACT_FANOUT_EXPLAINED",
);
has(
  reviewUi,
  "process_count=1",
  "REVIEW_UI_PROCESS_COUNT_EXPLAINED",
);
has(
  reviewUi,
  "futureWarning",
  "REVIEW_UI_FUTURE_USE_WARNING",
);
has(
  reviewUi,
  "selectedLeafIds",
  "REVIEW_UI_SELECTED_LEAF_SET",
);
has(
  reviewUi,
  "acceptedPrimary",
  "REVIEW_UI_PRIMARY_REQUIRED_BEFORE_COMMIT",
);
has(
  reviewUi,
  "+ Добавить листовой объект",
  "REVIEW_UI_MANUAL_ADD",
);
has(
  reviewUi,
  'proposal.linkedValueObjectId ? "✎" : "+"',
  "REVIEW_UI_PROPOSAL_PLUS_BUTTON",
);
has(
  reviewUi,
  "initialQuery={",
  "REVIEW_UI_SERVER_SEARCH_INITIAL_QUERY",
);
has(
  reviewUi,
  "catalogServerSearch",
  "REVIEW_UI_CATALOG_NOT_SENT_EXPLAINED",
);
has(
  reviewUi,
  "primaryLeafId",
  "REVIEW_UI_PRIMARY_LEAF_SENT_TO_COMMIT",
);

has(
  reviewUi,
  "const [resultsQuery, setResultsQuery] = useState(\"\");",
  "REVIEW_UI_QUERY_RESULT_VERSIONING",
);
lacks(
  reviewUi,
  "if (query.trim().length < 2) {\n      setResults([]);",
  "REVIEW_UI_NO_SYNC_SETSTATE_IN_SEARCH_EFFECT",
);

has(
  selectorRoute,
  'level === "all" ? true : item.level === level',
  "SELECTOR_LEVEL_FILTER",
);
has(
  selectorRoute,
  "matchesSearch(item, query)",
  "SELECTOR_SERVER_SEARCH",
);
has(
  selectorRoute,
  'includeGlobal',
  "SELECTOR_GLOBAL_AND_ACTOR_SCOPE",
);
lacks(
  selectorRoute,
  "runAiJson",
  "SELECTOR_NO_AI_CALL",
);

has(
  ruleRoute,
  "ARCTOR_FACT_MUTATING_COEFFICIENTS_RETIRED",
  "COEFFICIENT_ROUTE_AUTHORING_RETIRED",
);
has(
  ruleRoute,
  'from "../../../../lib/activity/activityUserContext"',
  "COEFFICIENT_ROUTE_ACTIVITY_CONTEXT_IMPORT_DEPTH",
);
has(
  ruleRoute,
  'from "../../../../lib/supabase"',
  "COEFFICIENT_ROUTE_SUPABASE_IMPORT_DEPTH",
);
lacks(
  ruleRoute,
  'from "../../../../../lib/',
  "COEFFICIENT_ROUTE_NO_OVERDEEP_ROOT_LIB_IMPORT",
);
has(
  ruleUi,
  "Нет правила → ×1",
  "COEFFICIENT_UI_NO_RULE_X1",
);
has(
  ruleUi,
  "Контекст не найден → ×1",
  "COEFFICIENT_UI_MISSING_CONTEXT_X1",
);
has(
  ruleUi,
  "коэффициенты перемножаются",
  "COEFFICIENT_UI_MULTIPLY",
);
has(
  ruleUi,
  "const [sourceObjectsQuery, setSourceObjectsQuery] = useState(\"\");",
  "COEFFICIENT_UI_QUERY_RESULT_VERSIONING",
);
lacks(
  ruleUi,
  "useEffect(() => {\n    if (!open) return;",
  "COEFFICIENT_UI_NO_SYNC_RULE_LOAD_EFFECT",
);
has(
  ruleUi,
  "setOpen(true);\n          void loadRules()",
  "COEFFICIENT_UI_EVENT_DRIVEN_RULE_LOAD",
);
lacks(
  ruleUi,
  "if (!open || query.trim().length < 2) {\n      setSourceObjects([]);",
  "COEFFICIENT_UI_NO_SYNC_SETSTATE_IN_SEARCH_EFFECT",
);
lacks(
  parameterManager,
  "ActivityFactCoefficientRuleManager",
  "LEAF_CARD_FACT_MUTATING_COEFFICIENT_MANAGER_REMOVED",
);
has(
  parameterManager,
  "Actual observed",
  "LEAF_CARD_ACTUAL_FACTS_NOT_STORED_HERE",
);

lacks(
  parameterManager,
  "useEffect(() => {\n    if (isOpen)",
  "LEAF_CARD_NO_SYNC_LOAD_EFFECT",
);
has(
  parameterManager,
  "setIsOpen(true);\n            void loadCatalog();",
  "LEAF_CARD_EVENT_DRIVEN_CATALOG_LOAD",
);

has(
  sql,
  "activity_semantic_review_drafts_a31",
  "SCHEMA_REVIEW_DRAFT",
);
has(
  sql,
  "activity_leaf_fact_coefficient_rules_a31",
  "SCHEMA_COEFFICIENT_RULES",
);
has(
  sql,
  "actor_value_object_recognition_examples_a31",
  "SCHEMA_ACTOR_TYPICAL_FORMULATIONS",
);
has(
  sql,
  "'parameterCompatibilityCheckRequired',false",
  "SCHEMA_NO_PARAMETER_COMPATIBILITY",
);
has(
  sql,
  "'processCountAlways',true",
  "SCHEMA_PROCESS_COUNT_ALWAYS",
);
has(
  sql,
  "'missingContextMultiplier',1",
  "SCHEMA_MISSING_CONTEXT_X1",
);
has(
  sql,
  "'coefficientCombinationMode','multiply'",
  "SCHEMA_MULTIPLY_RULES",
);
has(
  sql,
  "'parameterCode','process_count'",
  "WRITER_PROCESS_COUNT",
);
has(
  sql,
  "v_parameter_code<>'process_count'",
  "WRITER_PROCESS_COUNT_NOT_SCALED",
);
has(
  sql,
  "'parameterCode','duration'",
  "WRITER_SERVER_DURATION",
);
has(
  sql,
  "AI_A3_1_REVIEW_COMMIT_PRIMARY_NOT_SELECTED",
  "WRITER_PRIMARY_REQUIRED_SERVER_SIDE",
);
has(
  sql,
  "foreach v_leaf_id in array v_selected_ids",
  "WRITER_EACH_SELECTED_LEAF",
);
has(
  sql,
  "for v_measurement in",
  "WRITER_EACH_MEASUREMENT",
);
has(
  sql,
  "v_coefficient_product:=v_coefficient_product*v_rule.multiplier",
  "WRITER_MATCHING_RULES_MULTIPLY",
);
has(
  sql,
  ")<=coalesce(\n              v_activity.started_at",
  "WRITER_CONTEXT_NOT_AFTER_ACTIVITY",
);
has(
  sql,
  "'reason','CONTEXT_MISSING'",
  "WRITER_MISSING_CONTEXT_RECORDED_X1",
);
has(
  sql,
  "'reason','CONDITION_NOT_MATCHED'",
  "WRITER_NOT_MATCHED_RECORDED_X1",
);
has(
  sql,
  "AI_A3_1_REVIEW_FACT_MUST_NOT_USE_LEAF_PARAMETER_ASSIGNMENT",
  "FACT_GUARD_NO_PARAMETER_ASSIGNMENT",
);
has(
  sql,
  "'globalProfileMutated',false",
  "ACTOR_EXAMPLE_NO_GLOBAL_MUTATION",
);
has(
  sql,
  "'trainingConsentInferred',false",
  "ACTOR_EXAMPLE_NO_TRAINING_CONSENT",
);
lacks(
  sql,
  "GSR1D_GLOBAL_FACT_PARAMETER_NOT_ALLOWED_FOR_LEAF",
  "NEW_WRITER_NO_OLD_COMPATIBILITY_ERROR",
);
lacks(
  ruleRoute,
  "eval(",
  "NO_EVAL_RULE_ROUTE",
);
lacks(
  ruleUi,
  "eval(",
  "NO_EVAL_RULE_UI",
);
lacks(
  service,
  "eval(",
  "NO_EVAL_AI_SERVICE",
);

const executableSql = sql.replace(/^--.*$/gm, "");
add(
  "SQL_NO_DYNAMIC_EXECUTE",
  !/^\s*execute\b/im.test(executableSql),
);
add(
  "SQL_NO_ARBITRARY_FORMULA_EXPRESSION",
  !/\b(formula_text|expression_text|javascript_code|sql_expression)\b/i.test(
    executableSql,
  ),
);

const failed = checks.filter((row) => !row.passed);

console.log(
  JSON.stringify(
    {
      check:
        "ARCTOR_AI_A3_1_REVIEW_FIRST_SEMANTIC_FACT_PIPELINE_VALIDATOR_V2_FREE_PROPOSALS",
      passed: failed.length === 0,
      total: checks.length,
      failed,
      checks,
    },
    null,
    2,
  ),
);

if (failed.length) {
  process.exitCode = 1;
}
