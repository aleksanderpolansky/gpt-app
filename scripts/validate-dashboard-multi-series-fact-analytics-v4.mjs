import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [];

function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    throw new Error(`FILE_MISSING:${rel}`);
  }
  return fs.readFileSync(full, "utf8");
}

function check(label, condition) {
  if (!condition) {
    throw new Error(`FAIL ${label}`);
  }
  checks.push(label);
  process.stdout.write(`PASS ${label}\n`);
}

function contains(text, needle) {
  return text.includes(needle);
}

const contract = read("src/lib/dashboard/analytics-contract.ts");
const blocks = read("src/app/api/dashboard/analytics-blocks/route.ts");
const data = read("src/app/api/dashboard/analytics-data/route.ts");
const builder = read("src/components/figma-dashboard/dashboard-analytics-builder.tsx");
const v3Validator = read("scripts/validate-dashboard-observation-fact-analytics-v3.mjs");
const v3Doc = read("docs/architecture/dashboard-observation-fact-analytics-v3.md");
const rollup = read("src/lib/reality-core/measurement-rollup-contract-v1.ts");
const rollupMetadata = read("src/lib/reality-core/measurement-rollup-target-metadata-v1.ts");
const v4Doc = read("docs/architecture/dashboard-multi-series-fact-analytics-v4.md");

check("V4 support function exists", contains(contract, "isDashboardAnalyticsV4Supported"));
check("V4 enables multi_series metric", contains(contract, 'input.metricKey === "multi_series"'));
check("V4 is line-only for multi-series", contains(contract, 'input.visualizationType === "line"'));
check("V4 keeps day grouping", contains(contract, 'input.groupByKey === "day"'));
check("V4 delegates old combinations to V3", contains(contract, "return isDashboardAnalyticsV3Supported(input)"));

check("blocks route uses V4 guard", contains(blocks, "isDashboardAnalyticsV4Supported"));
check("blocks route parses multi-series config", contains(blocks, "parseObservationFactMultiSeriesConfig"));
check("blocks route requires at least two series", contains(blocks, "rawSeries.length < 2"));
check("blocks route caps series at six", contains(blocks, "rawSeries.length > 6"));
check("blocks route supports numeric series", contains(blocks, 'kind: "numeric"'));
check("blocks route supports presence series", contains(blocks, 'kind: "presence"'));
check("blocks route validates each numeric series", contains(blocks, "validateObservationFactConfig"));
check("blocks route validates presence leaf access", contains(blocks, "validateObservationPresenceConfig"));
check("blocks route stores V4 contract", contains(blocks, '"dashboard-analytics-v4"'));
check("blocks route stores scaleMode", contains(blocks, 'scaleMode: "independent"'));

check("data route uses V4 guard", contains(data, "isDashboardAnalyticsV4Supported"));
check("data route reads multi-series config", contains(data, "readObservationFactMultiSeriesConfig"));
check("data route has multi-series resolver", contains(data, "buildObservationFactMultiSeriesResponse"));
check("data route reuses numeric resolver", contains(data, "buildObservationFactSeriesResponse"));
check("data route has presence resolver", contains(data, "buildObservationPresenceSeriesResponse"));
check("presence reads confirmed physical facts", contains(data, '.eq("fact_status", "confirmed")'));
check("presence expands effective links", contains(data, 'from("activity_fact_value_object_links_effective_v1")'));
check("presence missing days stay null", contains(data, "valueNumber: null"));
check("presence sets one only for confirmed match", contains(data, "bucket.valueNumber = 1"));
check("data emits multi-series kind", contains(data, 'kind: "observation-fact-multi-series"'));
check("data emits factSeries array", contains(data, "factSeries,"));
check("data keeps independent scale mode", contains(data, "scaleMode: input.config.scaleMode"));

check("builder stores multi-series drafts", contains(builder, "factSeriesDrafts"));
check("builder creates stable UUID series ids", contains(builder, "crypto.randomUUID()"));
check("builder can add numeric series", contains(builder, "addNumericFactSeries"));
check("builder can add presence series", contains(builder, "addPresenceFactSeries"));
check("builder prevents more than six", contains(builder, "factSeriesDrafts.length >= 6"));
check("builder requires two drafts for combined chart", contains(builder, "factSeriesDrafts.length >= 2"));
check("builder sends multi_series metric", contains(builder, '"multi_series"'));
check("builder persists series array", contains(builder, "series: factSeriesDrafts.map"));
check("builder persists independent scale", contains(builder, 'scaleMode: "independent"'));
check("builder keeps legacy single numeric config", contains(builder, "valueObjectId: selectedObservation.id"));
check("builder renders legend", contains(builder, "<Legend"));
check("builder renders multiple lines", contains(builder, "(data?.factSeries ?? []).map"));
check("builder uses independent hidden Y axes", contains(builder, 'yAxisId={`series-${index}`}') && contains(builder, "hide"));
check("builder renders presence as points", contains(builder, 'series.kind === "presence" ? 0 : 2.5'));
check("builder has six series colors", contains(builder, "MULTI_SERIES_COLORS"));
check("builder localizes V4 copy", contains(builder, "MULTI_SERIES_COPY"));

check("V3 validator accepts additive V4 guard", contains(v3Validator, "additive V4 support guard"));
check("V3 architecture remains present", contains(v3Doc, "Dashboard Observation Fact Analytics V3"));
check("measurement rollup resolver remains present", contains(rollup, "resolveMeasurementRollupV1"));
check("measurement rollup metadata remains present", contains(rollupMetadata, "measurementRollupV1"));

check("V4 doc states config_json evolution", contains(v4Doc, "config_json"));
check("V4 doc states no migration", contains(v4Doc.toLowerCase(), "миграция бд не требуется"));
check("V4 doc documents presence unknown semantics", contains(v4Doc, "не превращается") && contains(v4Doc, "в 0"));
check("V4 doc documents mixed-unit independent scales", contains(v4Doc, "независим"));

process.stdout.write(`VALIDATOR=PASS_${checks.length}_${checks.length}\n`);
