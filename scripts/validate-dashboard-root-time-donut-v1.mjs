#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const repo = path.resolve(process.argv[2] ?? process.cwd());
const checks = [];

function add(name, passed, detail = null) {
  checks.push({ name, passed: Boolean(passed), detail });
}
function read(rel) {
  const file = path.join(repo, ...rel.split("/"));
  const exists = fs.existsSync(file) && fs.statSync(file).isFile();
  add(`FILE_EXISTS:${rel}`, exists);
  if (!exists) return "";
  return fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}
function has(text, needle, name) {
  add(name, text.includes(needle), text.includes(needle) ? null : needle);
}
function lacks(text, needle, name) {
  add(name, !text.includes(needle), text.includes(needle) ? needle : null);
}
function regex(text, pattern, name) {
  add(name, pattern.test(text), pattern.toString());
}
function noBadText(rel, text) {
  add(`NO_NUL:${rel}`, !text.includes("\u0000"));
  add(`NO_BOM:${rel}`, !text.startsWith("\uFEFF"));
  add(`NO_TRAILING_WHITESPACE:${rel}`, !/[ \t]+$/m.test(text));
}
function sha256(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

const contractRel = "src/lib/dashboard/analytics-contract.ts";
const dataRel = "src/app/api/dashboard/analytics-data/route.ts";
const uiRel = "src/components/figma-dashboard/dashboard-analytics-builder.tsx";
const aggregationRel = "src/lib/dashboard/root-time-aggregation.ts";
const migrationV1Rel = "supabase/migrations/20260807140500_dashboard_analytics_v1.sql";
const migrationV2Rel = "supabase/migrations/20260807151000_dashboard_analytics_certificate_map_v2.sql";

const contract = read(contractRel);
const data = read(dataRel);
const ui = read(uiRel);
const aggregation = read(aggregationRel);
const migrationV1 = read(migrationV1Rel);
const migrationV2 = read(migrationV2Rel);

// Contract: exact executable combination.
has(contract, 'input.visualizationType === "donut"', "CONTRACT_DONUT_ENABLED");
has(contract, 'input.sourceType === "facts"', "CONTRACT_FACT_SOURCE");
has(contract, 'input.metricKey === "duration_minutes"', "CONTRACT_DURATION_METRIC");
has(contract, 'input.aggregationKey === "sum"', "CONTRACT_SUM_AGGREGATION");
has(contract, 'input.groupByKey === "observation_object"', "CONTRACT_OBSERVATION_OBJECT_GROUPING");
has(contract, "DASHBOARD_ANALYTICS_V1_SUPPORTED_PERIODS.has(input.periodDays)", "CONTRACT_PERIOD_GUARD");

// Existing DB schema already supports the vocabulary: no schema mutation is needed.
has(migrationV1, "'donut'", "SCHEMA_ALREADY_ALLOWS_DONUT");
has(migrationV1, "'facts'", "SCHEMA_ALREADY_ALLOWS_FACTS");
has(migrationV1, "'observation_object'", "SCHEMA_ALREADY_ALLOWS_OBSERVATION_OBJECT");
has(migrationV1, "'sum'", "SCHEMA_ALREADY_ALLOWS_SUM");
has(migrationV2, "'donut'", "SCHEMA_V2_RETAINS_DONUT");
has(migrationV2, "'observation_object'", "SCHEMA_V2_RETAINS_OBSERVATION_OBJECT");

// Analytics data endpoint: read-only fact -> leaf -> root -> duration roll-up.
has(data, 'from("activity_object_facts")', "DATA_READS_FACTS");
has(data, '.eq("fact_status", "confirmed")', "DATA_CONFIRMED_FACTS_ONLY");
has(data, '.eq("measure_type", "duration")', "DATA_DURATION_FACTS_ONLY");
has(data, "const factPageSize = 1000", "DATA_FACT_PAGINATION_PAGE_SIZE");
has(data, "const factHardLimit = 50000", "DATA_FACT_PAGINATION_HARD_LIMIT");
has(data, ".range(offset, offset + factPageSize - 1)", "DATA_FACT_PAGINATION_RANGE");
has(data, "DASHBOARD_ROOT_TIME_FACT_HARD_LIMIT_REACHED", "DATA_FACT_LIMIT_FAILS_CLOSED");
has(data, '.eq("user_id", input.appUserId)', "DATA_USER_BOUND");
has(data, '.eq("acting_as_actor_id", input.actorId)', "DATA_ACTOR_BOUND");
has(data, '.select("id,root_value_object_id")', "DATA_LEAF_TO_ROOT_LOOKUP");
has(data, "leafToRoot.set(leafId, rootId)", "DATA_LEAF_TO_ROOT_MAP");
has(data, '.from("activity_events")', "DATA_READS_CANONICAL_ACTIVITY_DURATION");
has(data, "durationMinutesForRow(row)", "DATA_CANONICAL_DURATION_HELPER");
has(data, "aggregateRootTime({", "DATA_USES_PURE_AGGREGATOR");
has(data, 'kind: "fact-duration-by-root"', "DATA_RESPONSE_KIND");
has(data, 'sourceType: "facts"', "DATA_RESPONSE_SOURCE");
has(data, 'groupByKey: "observation_object"', "DATA_RESPONSE_GROUPING");
has(data, "rootBreakdown", "DATA_ROOT_BREAKDOWN");
has(data, "totalSemanticMinutes", "DATA_SEMANTIC_TOTAL");
has(data, "uniqueActivityMinutes", "DATA_UNIQUE_ACTIVITY_TOTAL");
has(data, "overlapDetected", "DATA_OVERLAP_FLAG");
has(data, "factProjectionCount", "DATA_PROJECTION_COUNT");
has(data, "localizeGlobalSystemValueObject", "DATA_GLOBAL_ROOT_LOCALIZATION");
has(data, "resolveLocalizedContentField", "DATA_ACTOR_ROOT_LOCALIZATION");
has(data, "normalizeGlobalSystemValueObjectLocale", "DATA_LOCALE_NORMALIZATION");
regex(data, /new URLSearchParams|url\.searchParams\.get\("locale"\)/, "DATA_LOCALE_READ");
lacks(data, "runAiJson", "DATA_NO_AI_RUNNER");
lacks(data, "runAiJsonWithUsageMetadata", "DATA_NO_AI_USAGE_RUNNER");
lacks(data, "openai", "DATA_NO_OPENAI_REFERENCE");
lacks(data, ".insert(", "DATA_NO_INSERT");
lacks(data, ".update(", "DATA_NO_UPDATE");
lacks(data, ".delete(", "DATA_NO_DELETE");
lacks(data, ".rpc(", "DATA_NO_RPC_WRITE_OR_SIDE_EFFECT");

// Pure aggregation rules.
has(aggregation, "export function aggregateRootTime", "AGGREGATOR_EXPORTED");
has(aggregation, 'const activityRootKey = `${fact.activityEventId}:${rootValueObjectId}`;', "AGGREGATOR_EVENT_ROOT_KEY");
has(aggregation, "activityRoot.get(activityRootKey)", "AGGREGATOR_DEDUPES_SAME_ACTIVITY_ROOT");
has(aggregation, "input.eventDurationMinutes.get(", "AGGREGATOR_PREFERS_EVENT_DURATION");
has(aggregation, "canonicalDurationMinutes(\n      fact.valueNumeric,\n      fact.unit,", "AGGREGATOR_FACT_DURATION_FALLBACK");
has(aggregation, 'normalizedUnit === "minute"', "AGGREGATOR_MINUTE_SUPPORTED");
has(aggregation, 'normalizedUnit === "hour"', "AGGREGATOR_HOUR_SUPPORTED");
has(aggregation, "uniqueActivityMinutes", "AGGREGATOR_UNIQUE_EVENT_TOTAL");
has(aggregation, "overlapDetected: totalSemanticMinutes > uniqueMinutes + 0.01", "AGGREGATOR_OVERLAP_DETECTION");
has(aggregation, "factProjectionCount", "AGGREGATOR_PROJECTION_COUNT");
lacks(aggregation, "Math.random", "AGGREGATOR_DETERMINISTIC_NO_RANDOM");
lacks(aggregation, "Date.now", "AGGREGATOR_DETERMINISTIC_NO_CLOCK");

// UI and wizard.
has(ui, '{ type: "donut", enabled: true }', "UI_DONUT_AVAILABLE_NOW");
has(ui, "PieChart as PieChartIcon", "UI_DONUT_ICON");
has(ui, "Pie,", "UI_RECHARTS_PIE_IMPORT");
has(ui, "PieChart,", "UI_RECHARTS_PIECHART_IMPORT");
has(ui, "Cell,", "UI_RECHARTS_CELL_IMPORT");
has(ui, 'dataKey="valueMinutes"', "UI_DONUT_VALUE_KEY");
has(ui, 'nameKey="rootTitle"', "UI_DONUT_ROOT_LABEL");
has(ui, "row.rootTitle", "UI_LEGEND_ROOT_TITLE");
has(ui, "formatDuration(row.valueMinutes, ui)", "UI_LEGEND_DURATION");
has(ui, "row.percentage.toFixed(1)", "UI_LEGEND_PERCENTAGE");
has(ui, "rootTimeCopy.overlapNote", "UI_OVERLAP_DISCLOSURE");
has(ui, 'isRootTimeDonut\n                ? "facts"', "UI_CREATE_FACT_SOURCE");
has(ui, 'isRootTimeDonut\n                ? "duration_minutes"', "UI_CREATE_DURATION_METRIC");
has(ui, 'isRootTimeDonut\n                ? "observation_object"', "UI_CREATE_ROOT_GROUPING");
has(ui, "ROOT_TIME_COPY[locale].byRoot", "UI_WIZARD_ROOT_GROUPING_LABEL");
has(ui, "ROOT_TIME_COPY[locale].factsDescription", "UI_WIZARD_FACT_SOURCE_DESCRIPTION");
has(ui, "ROOT_TIME_COPY[locale].durationDescription", "UI_WIZARD_DURATION_DESCRIPTION");
has(ui, "locale,\n      });", "UI_SENDS_LOCALE_TO_DATA_ENDPOINT");
has(ui, '`/activity-facts?locale=${locale}`', "UI_DONUT_LINKS_FACT_JOURNAL");
lacks(ui, `  useEffect(() => {
    void loadData();
  }, [loadData]);`, "UI_NO_SYNC_LOAD_DATA_EFFECT");
lacks(ui, `  useEffect(() => {
    void loadBlocks();
  }, [loadBlocks]);`, "UI_NO_SYNC_LOAD_BLOCKS_EFFECT");
add("UI_EFFECT_ASYNC_BOUNDARY_COUNT", (ui.split("const timerId = window.setTimeout(() => {").length - 1) === 2);

for (const [rel, text] of [
  [contractRel, contract],
  [dataRel, data],
  [uiRel, ui],
  [aggregationRel, aggregation],
]) {
  noBadText(rel, text);
  lacks(text, "eval(", `NO_EVAL:${rel}`);
}

add("VALIDATOR_INPUT_HASH", true, {
  contract: sha256(contract),
  data: sha256(data),
  ui: sha256(ui),
  aggregation: sha256(aggregation),
});

const failed = checks.filter((row) => !row.passed);
console.log(JSON.stringify({
  check: "ARCTOR_DASHBOARD_ROOT_TIME_DONUT_V1",
  passed: failed.length === 0,
  total: checks.length,
  failed,
  checks,
}, null, 2));
if (failed.length) process.exitCode = 1;
