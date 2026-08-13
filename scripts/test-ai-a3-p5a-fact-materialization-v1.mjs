import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
const require = createRequire(path.join(process.cwd(), "package.json"));
const ts = require("typescript");

const helperPath = process.argv[2] ?? path.resolve("src/lib/activity/aiLabFactMaterialization.ts");
const source = fs.readFileSync(helperPath, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
    strict: true,
  },
  reportDiagnostics: true,
  fileName: helperPath,
});
assert.equal(transpiled.diagnostics?.length ?? 0, 0, "helper must transpile without diagnostics");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "arctor-p5a-test-"));
const modulePath = path.join(dir, "helper.mjs");
fs.writeFileSync(modulePath, transpiled.outputText, "utf8");
const helper = await import(`${pathToFileURL(modulePath).href}?t=${Date.now()}`);

const UUID1 = "11111111-1111-4111-8111-111111111111";
const UUID2 = "22222222-2222-4222-8222-222222222222";

const walkRows = [{
  segmentId: "s1",
  confidence: 0.78,
  selected: {
    valueObjectId: UUID1,
    canonicalKey: "process.movement.walking",
    semanticMatchMethodCode: "ai_candidate",
  },
  facts: [{
    parameterCode: "duration",
    unit: "minute",
    valueType: "numeric",
    valueNumeric: 40,
    rawFragment: "на 40 минут",
  }],
}];

const candidates = helper.buildAiLabFactMaterializationCandidates(walkRows, "GLOBAL_V1");
assert.equal(candidates.length, 1);
assert.equal(candidates[0].targetKey, "segment:s1:fact:duration:1");
assert.equal(candidates[0].canonicalKey, "process.movement.walking");
assert.equal(candidates[0].valueNumeric, 40);
assert.equal(candidates[0].valueText, null);
assert.equal(candidates[0].confidence, 0.78);
console.log("01_walk_numeric_candidate=true");

assert.equal(helper.containsEvidenceFragment("завтра пойти на прогулку на 40 минут", "на 40 минут"), true);
assert.equal(helper.containsEvidenceFragment("завтра пойти на прогулку", "40 минут"), false);
console.log("02_evidence_fragment_guard=true");

const confirmed = helper.buildAiLabFactWriterRows({
  candidates,
  verdictsByTargetKey: new Map([[candidates[0].targetKey, "confirmed"]]),
  analysisOperationId: "op-1",
});
assert.equal(confirmed.length, 1);
assert.equal(confirmed[0].factStatus, "confirmed");
assert.equal(confirmed[0].isUserConfirmed, true);
assert.equal(confirmed[0].semanticMatchMethodCode, "ai_candidate");
assert.equal(confirmed[0].valueNumeric, 40);
console.log("03_confirmed_feedback_materializes_confirmed=true");

const rejected = helper.buildAiLabFactWriterRows({
  candidates,
  verdictsByTargetKey: new Map([[candidates[0].targetKey, "rejected"]]),
  analysisOperationId: "op-1",
});
assert.equal(rejected.length, 0);
console.log("04_rejected_feedback_skips_fact=true");

const proposed = helper.buildAiLabFactWriterRows({
  candidates,
  verdictsByTargetKey: new Map(),
  analysisOperationId: "op-1",
});
assert.equal(proposed.length, 1);
assert.equal(proposed[0].factStatus, "proposed");
assert.equal(proposed[0].isUserConfirmed, false);
console.log("05_unreviewed_fact_stays_proposed=true");

const mixed = helper.buildAiLabFactMaterializationCandidates([
  ...walkRows,
  {
    segmentId: "s2",
    confidence: 0.93,
    selected: {
      valueObjectId: UUID2,
      canonicalKey: "process.finance.purchase",
      semanticMatchMethodCode: "ai_candidate",
    },
    facts: [{
      parameterCode: "monetary_amount_pln",
      unit: "pln",
      valueNumeric: 12,
      rawFragment: "12 злотых",
    }],
  },
], "GLOBAL_V1");
assert.equal(mixed.length, 2);
assert.equal(mixed[1].canonicalKey, "process.finance.purchase");
console.log("06_multiple_leaf_facts_supported=true");

const malformed = helper.buildAiLabFactMaterializationCandidates([{ ...walkRows[0], facts: [{
  parameterCode: "duration",
  unit: "minute",
  valueNumeric: 40,
  valueText: "forty",
  rawFragment: "40 минут",
}] }], "GLOBAL_V1");
assert.equal(malformed.length, 0);
console.log("07_multiple_typed_values_rejected=true");

const noSelected = helper.buildAiLabFactMaterializationCandidates([{ segmentId: "x", facts: walkRows[0].facts }], "GLOBAL_V1");
assert.equal(noSelected.length, 0);
console.log("08_fact_without_selected_leaf_not_materialized=true");

const normalized = helper.normalizeAiLabFactMaterializationCandidates(candidates);
assert.deepEqual(normalized, candidates);
console.log("09_request_normalization_roundtrip=true");

const badUuid = helper.normalizeAiLabFactMaterializationCandidates([{ ...candidates[0], targetValueObjectId: "bad" }]);
assert.equal(badUuid.length, 0);
console.log("10_invalid_leaf_uuid_rejected=true");

const booleanCandidate = helper.buildAiLabFactMaterializationCandidates([{
  segmentId: "b",
  selected: { valueObjectId: UUID1, canonicalKey: "state.test", semanticMatchMethodCode: "rule_based" },
  facts: [{ parameterCode: "flag", unit: "boolean", valueBoolean: false, rawFragment: "нет" }],
}], "GLOBAL_V1");
assert.equal(booleanCandidate.length, 1);
assert.equal(booleanCandidate[0].valueBoolean, false);
console.log("11_boolean_false_preserved=true");

const commented = helper.buildAiLabFactWriterRows({
  candidates,
  verdictsByTargetKey: new Map([[candidates[0].targetKey, "commented"]]),
  analysisOperationId: "op-1",
});
assert.equal(commented[0].factStatus, "proposed");
console.log("12_comment_does_not_silently_confirm=true");

console.log("PASS=12/12");
