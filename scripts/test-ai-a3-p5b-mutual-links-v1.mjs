import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";

const root = process.cwd();
const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadTs(rel) {
  const source = fs.readFileSync(path.join(root, ...rel.split("/")), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
    },
    fileName: rel,
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, {
    module,
    exports: module.exports,
    require,
    URLSearchParams,
  });
  return module.exports;
}

const mutual = loadTs("src/lib/activity/mutualLinks.ts");
const direct = loadTs("src/lib/activity/aiLabDirectSave.ts");

let checks = 0;
function equal(name, actual, expected) {
  checks += 1;
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`${name}: expected=${e} actual=${a}`);
  }
}
function truthy(name, value) {
  checks += 1;
  if (!value) throw new Error(`${name}: expected truthy, got ${String(value)}`);
}

const grouped = mutual.groupMutualFactProjections([
  {
    factId: "fact-walk",
    measureId: "measure-31",
    activityEventId: "activity-1",
    valueObjectId: "vo-walking",
    measureType: "duration",
    metricValue: 31,
    unit: "minute",
    factStatus: "confirmed",
    isUserConfirmed: true,
    sourceType: "ai_extraction",
    confidence: 0.86,
    createdAt: "2026-08-13T13:47:00Z",
  },
  {
    factId: "fact-family",
    measureId: "measure-31",
    activityEventId: "activity-1",
    valueObjectId: "vo-family",
    measureType: "duration",
    metricValue: 31,
    unit: "minute",
    factStatus: "proposed",
    isUserConfirmed: false,
    sourceType: "ai_extraction",
    confidence: 0.72,
    createdAt: "2026-08-13T13:47:01Z",
  },
]);

equal("one neutral measure after fan-out", grouped.length, 1);
equal("neutral measure id preserved", grouped[0].measureId, "measure-31");
equal("both object projections preserved", grouped[0].valueObjectIds.sort(), ["vo-family", "vo-walking"]);
equal("both projection fact ids preserved", grouped[0].projectionFactIds.sort(), ["fact-family", "fact-walk"]);
equal("confirmed wins for grouped status", grouped[0].factStatus, "confirmed");
equal("user confirmation propagates to grouped neutral fact", grouped[0].isUserConfirmed, true);
equal("highest confidence preserved", grouped[0].confidence, 0.86);
equal("neutral value preserved", grouped[0].metricValue, 31);
equal("neutral unit preserved", grouped[0].unit, "minute");

const separate = mutual.groupMutualFactProjections([
  { factId: "a", measureId: "m1", activityEventId: "x", valueObjectId: "v1", measureType: "duration", metricValue: 10, unit: "minute", factStatus: "confirmed", isUserConfirmed: true, sourceType: "user_text", confidence: 1, createdAt: null },
  { factId: "b", measureId: "m2", activityEventId: "x", valueObjectId: "v1", measureType: "distance", metricValue: 2, unit: "km", factStatus: "confirmed", isUserConfirmed: true, sourceType: "user_text", confidence: 1, createdAt: null },
]);
equal("different measures stay separate", separate.length, 2);

const legacyNoMeasure = mutual.groupMutualFactProjections([
  { factId: "legacy-a", measureId: null, activityEventId: "x", valueObjectId: "v1", measureType: "duration", metricValue: 30, unit: "minute", factStatus: "confirmed", isUserConfirmed: true, sourceType: "legacy", confidence: 1, createdAt: null },
  { factId: "legacy-b", measureId: null, activityEventId: "x", valueObjectId: "v2", measureType: "duration", metricValue: 30, unit: "minute", factStatus: "confirmed", isUserConfirmed: true, sourceType: "legacy", confidence: 1, createdAt: null },
]);
equal("legacy rows without measure id are not guessed into one measure", legacyNoMeasure.length, 2);

equal("metric formatter number", mutual.formatMutualMetricValue(31), "31");
equal("metric formatter boolean", mutual.formatMutualMetricValue(true), "true");
equal("metric formatter null", mutual.formatMutualMetricValue(null), "—");

equal(
  "activity title remains user wording despite semantic selection",
  direct.deriveAiLabActivityTitle("сегодня гулял 31 минуту", [
    { sourceFragment: "гулял", selected: { title: "Ходьба", canonicalKey: "process.movement.walking" } },
  ]),
  "сегодня гулял 31 минуту",
);
truthy(
  "activity title no semantic prefix",
  !direct.deriveAiLabActivityTitle("гулял 31 минуту", [
    { sourceFragment: "гулял", selected: { title: "Ходьба", canonicalKey: "process.movement.walking" } },
  ]).startsWith("Ходьба:"),
);

console.log(JSON.stringify({ test: "AI_A3_P5B_MUTUAL_LINKS", passed: true, checks: `${checks}/16 PASS` }, null, 2));
