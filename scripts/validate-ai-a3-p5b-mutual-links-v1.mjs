import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = process.cwd();
const require = createRequire(import.meta.url);
const ts = require("typescript");

const files = {
  helper: "src/lib/activity/mutualLinks.ts",
  api: "src/app/api/activity/mutual-links/route.ts",
  panel: "src/components/activity/p5b/activity-mutual-links-panel.tsx",
  factsApi: "src/app/api/activity/facts/route.ts",
  factsPage: "src/app/activity-facts/page.tsx",
  journal: "src/app/activity-today/page.tsx",
  valueObject: "src/app/value-objects/[id]/page.tsx",
  calendar: "src/app/calendar-rebuild/CalendarRebuildClient.tsx",
  directSave: "src/lib/activity/aiLabDirectSave.ts",
  writer: "supabase/manual-applied/20260811_gsr1d_global_runtime_bridge_ai_budget_v1.sql",
  hotfix: "supabase/manual-applied/20260813_ai_a3_p5a_global_fact_writer_rowtype_hotfix_v3.sql",
};

function fail(message) {
  console.error(JSON.stringify({ validator: "AI_A3_P5B_MUTUAL_LINKS", passed: false, error: message }, null, 2));
  process.exit(1);
}

function read(rel) {
  const file = path.join(root, ...rel.split("/"));
  if (!fs.existsSync(file)) fail(`missing file: ${rel}`);
  const source = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (source.startsWith("\ufeff")) fail(`unexpected BOM: ${rel}`);
  if (source.includes("\u0000")) fail(`NUL byte: ${rel}`);
  return source;
}

function syntax(source, rel) {
  if (!/\.(?:ts|tsx)$/.test(rel)) return;
  const options = { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS };
  if (rel.endsWith(".tsx")) options.jsx = ts.JsxEmit.ReactJSX;
  const result = ts.transpileModule(source, { compilerOptions: options, reportDiagnostics: true, fileName: rel });
  const errors = (result.diagnostics ?? []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
  if (errors.length > 0) {
    fail(`${rel} syntax: ${errors.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")).join(" | ")}`);
  }
}

function requireToken(source, token, label = token) {
  if (!source.includes(token)) fail(`missing marker: ${label}`);
}
function forbidToken(source, token, label = token) {
  if (source.includes(token)) fail(`forbidden marker: ${label}`);
}

const loaded = Object.fromEntries(Object.entries(files).map(([key, rel]) => [key, read(rel)]));
for (const [key, rel] of Object.entries(files)) syntax(loaded[key], rel);

for (const token of [
  "groupMutualFactProjections",
  "measureKey",
  "projectionFactIds",
  "valueObjectIds",
]) requireToken(loaded.helper, token);

for (const token of [
  'const ENDPOINT = "/api/activity/mutual-links"',
  '.from("activity_object_facts")',
  '.from("activity_value_object_links")',
  '.from("activity_events")',
  '.from("value_objects")',
  '.eq("user_id", context.appUserId)',
  '.eq("acting_as_actor_id", context.actorId)',
  '.eq("app_user_id", context.appUserId)',
  '.eq("actor_id", context.actorId)',
  '["semantic_exposure", "planned_target"]',
  "groupMutualFactProjections",
  "let factProjections = projections;",
  "projection.valueObjectId === valueObjectId",
]) requireToken(loaded.api, token);
for (const token of ['.insert(', '.update(', '.delete(', '.upsert(', '.rpc(']) forbidToken(loaded.api, token, `read-only mutual API forbids ${token}`);

for (const token of [
  "measure-centric grouping with linked leaf projections",
  "groupMutualFactProjections",
  "activityTitle",
  "valueObjects",
  "primaryMeasureIds",
  "ACTIVITY_FACTS_READ_PROJECTION_EXPANSION_FAILED",
]) requireToken(loaded.factsApi, token);

for (const token of [
  "fact.activityTitle",
  "fact.valueObjects",
  "Связанные ЦО",
  "activityEventId",
]) requireToken(loaded.factsPage, token);

for (const token of [
  "/api/activity/mutual-links?",
  "ActivityMutualPreview",
  "mutualLinksByActivityId",
  "Связанные ЦО",
  "/activity-facts?locale=",
]) requireToken(loaded.journal, token);

for (const token of [
  "ActivityMutualLinksPanel",
  "valueObjectId={valueObject.id}",
]) requireToken(loaded.valueObject, token);

for (const token of [
  "mergeP5bCalendarValueObjects",
  "/api/activity/mutual-links?",
  "mutualLinksByActivityId",
  "formatMutualMetricValue",
]) requireToken(loaded.calendar, token);

for (const token of [
  "export function deriveAiLabActivityTitle",
  "return compactText(rawText, MAX_ACTIVITY_TITLE_CHARS);",
]) requireToken(loaded.directSave, token);
forbidToken(loaded.directSave, 'const prefix = semanticTitle ? `${semanticTitle}: ` : "";', "semantic classifier must not prefix activity title");

requireToken(loaded.writer, "select assignment.*", "canonical writer source must match live V3 hotfix");
forbidToken(loaded.writer, "select assignment\n    into v_assignment", "buggy composite assignment writer source");
requireToken(loaded.hotfix, "AI_A3_P5A_WRITER_HOTFIX_V3", "exact applied V3 hotfix checkpoint");

console.log(JSON.stringify({
  validator: "AI_A3_P5B_MUTUAL_LINKS",
  passed: true,
  checks: {
    typescriptSyntax: "PASS",
    neutralMeasureGrouping: "PASS",
    mutualReadApiOwnership: "PASS",
    mutualReadApiNoWrites: "PASS",
    factsPageMutualLinks: "PASS",
    journalMutualLinks: "PASS",
    valueObjectHistoryPanel: "PASS",
    calendarMutualLinks: "PASS",
    userWordingActivityTitle: "PASS",
    liveWriterSourceCheckpointed: "PASS",
  },
}, null, 2));
