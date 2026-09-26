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

const contractPath = "src/lib/dashboard/analytics-contract.ts";
const blocksPath = "src/app/api/dashboard/analytics-blocks/route.ts";
const dataPath = "src/app/api/dashboard/analytics-data/route.ts";
const optionsPath = "src/app/api/dashboard/analytics-observation-options/route.ts";
const builderPath = "src/components/figma-dashboard/dashboard-analytics-builder.tsx";
const rollupPath = "src/lib/reality-core/measurement-rollup-contract-v1.ts";
const metadataPath = "src/lib/reality-core/measurement-rollup-target-metadata-v1.ts";
const docPath = "docs/architecture/dashboard-observation-fact-analytics-v3.md";

const contract = read(contractPath);
const blocks = read(blocksPath);
const data = read(dataPath);
const options = read(optionsPath);
const builder = read(builderPath);
const rollup = read(rollupPath);
const metadata = read(metadataPath);
const doc = read(docPath);

check("V3 contract function exists", contains(contract, "isDashboardAnalyticsV3Supported"));
check("V3 facts source enabled", contains(contract, 'input.sourceType === "facts"'));
check("V3 numeric_value metric enabled", contains(contract, 'input.metricKey === "numeric_value"'));
check("V3 day grouping enabled", contains(contract, 'input.groupByKey === "day"'));
check("V3 remains additive over V2", contains(contract, "return isDashboardAnalyticsV2Supported(input)"));

check("create input carries config", contains(contract, "readonly config?: Record<string, unknown>"));
check("blocks route uses V3 support guard", contains(blocks, "isDashboardAnalyticsV3Supported"));
check("blocks route validates observation config", contains(blocks, "validateObservationFactConfig"));
check("blocks route verifies assigned parameter", contains(blocks, 'from("value_object_parameter_assignments")'));
check("blocks route stores dashboard-analytics-v3", contains(blocks, '"dashboard-analytics-v3"'));
check("blocks route stores valueObjectId", contains(blocks, "valueObjectId"));
check("blocks route stores parameterDefinitionId", contains(blocks, "parameterDefinitionId"));

check("options endpoint exists", fs.existsSync(path.join(root, optionsPath)));
check("options endpoint reads numeric definitions", contains(options, '.eq("value_type_code", "numeric")'));
check("options endpoint separates system assignments", contains(options, 'scope === "system"'));
check("options endpoint separates actor assignments", contains(options, 'scope === "actor"'));
check("options endpoint reports no writes", contains(options, "dbWriteExecuted: false"));
check("options endpoint has no mutation call", !/\.(insert|update|upsert|delete|rpc)\s*\(/.test(options));

check("analytics data uses V3 support guard", contains(data, "isDashboardAnalyticsV3Supported"));
check("analytics data has observation series resolver", contains(data, "buildObservationFactSeriesResponse"));
const observationStart = data.indexOf("async function buildObservationFactSeriesResponse");
const observationEnd = data.indexOf("async function buildCertificateMapResponse");
const observationData =
  observationStart >= 0 && observationEnd > observationStart
    ? data.slice(observationStart, observationEnd)
    : "";

check("analytics data reads physical confirmed numeric fact values", contains(observationData, "value_object_id,value_numeric,unit,measure_type"));
check("analytics data expands final effective fact links", contains(observationData, 'from("activity_fact_value_object_links_effective_v1")'));
check("observation series does not depend on legacy projection schema", !contains(observationData, 'from("activity_fact_analytics_inputs_v1")'));
check("analytics data filters confirmed owned facts", contains(observationData, '.eq("fact_status", "confirmed")'));
check("analytics data binds parameter definition", contains(observationData, '.eq("parameter_definition_id", input.config.parameterDefinitionId)'));
check("analytics data reads stored rollup metadata", contains(data, "readMeasurementRollupTargetMetadataV1"));
check("analytics data uses deterministic rollup resolver", contains(data, "resolveMeasurementRollupV1"));
check("analytics data keeps UNKNOWN as null", contains(data, "valueNumber: null"));
check("analytics data emits observation-fact-series", contains(data, 'kind: "observation-fact-series"'));

check("builder exposes facts source", contains(builder, "Факты по объектам наблюдения"));
check("builder reuses observation selector", contains(builder, "/api/value-objects/selector?"));
check("builder loads assigned parameter options", contains(builder, "/api/dashboard/analytics-observation-options?"));
check("builder persists target UUID", contains(builder, "valueObjectId: selectedObservation.id"));
check("builder persists parameter UUID", contains(builder, "parameterDefinitionId: selectedParameter.id"));
check("builder blocks Next until fact selection complete", contains(builder, "disabled={!canAdvance}"));
check("builder renders generic numeric value series", contains(builder, '"valueNumber"'));

check("existing rollup contract still present", contains(rollup, "resolveMeasurementRollupV1"));
check("stored metadata contract still present", contains(metadata, "measurementRollupV1"));
check("architecture note documents UNKNOWN", contains(doc, "UNKNOWN/no point"));
check("architecture note documents 496 minute acceptance", contains(doc, "496 min"));
check("architecture note states no migration", contains(doc, "creates no migration"));

process.stdout.write(`VALIDATOR=PASS_${checks.length}_${checks.length}\n`);
