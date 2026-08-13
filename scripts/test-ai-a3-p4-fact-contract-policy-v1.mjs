#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const requireFromRepo = createRequire(path.join(process.cwd(), "package.json"));
const ts = requireFromRepo("typescript");
const sourcePath = path.join(process.cwd(), "lib", "reality", "factContractPolicy.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
    strict: true,
  },
  reportDiagnostics: true,
  fileName: sourcePath,
});

const diagnostics = transpiled.diagnostics ?? [];
if (diagnostics.length > 0) {
  for (const diagnostic of diagnostics) {
    console.error(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
  }
  process.exit(1);
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "arctor-a3p4-policy-"));
const modulePath = path.join(tempDir, "factContractPolicy.mjs");
fs.writeFileSync(modulePath, transpiled.outputText, "utf8");
const { normalizeAiFactAgainstParameterContract: normalize } = await import(
  `${pathToFileURL(modulePath).href}?v=${Date.now()}`
);

const numeric = {
  parameterCode: "duration_minutes",
  valueTypeCode: "numeric",
  allowedUnitCodes: ["minute"],
};
const text = {
  parameterCode: "meal_label",
  valueTypeCode: "text",
  allowedUnitCodes: ["text"],
};
const boolean = {
  parameterCode: "completed",
  valueTypeCode: "boolean",
  allowedUnitCodes: ["boolean"],
};

const cases = [
  ["numeric_exact", normalize({ rawFact: { parameterCode: "duration_minutes", unit: "minute", valueType: "numeric", valueNumeric: 40, valueText: null, valueBoolean: null, rawFragment: "40 минут" }, sourceFragment: "прогулка на 40 минут", contract: numeric }), true, false],
  ["numeric_extra_text_normalized", normalize({ rawFact: { parameterCode: "duration_minutes", unit: "minute", valueType: "numeric", valueNumeric: 40, valueText: "40 минут", valueBoolean: null, rawFragment: "40 минут" }, sourceFragment: "прогулка на 40 минут", contract: numeric }), true, true],
  ["numeric_wrong_declared_type_but_numeric_present", normalize({ rawFact: { parameterCode: "duration_minutes", unit: "minute", valueType: "text", valueNumeric: 40, valueText: "40 минут", valueBoolean: null, rawFragment: "40 минут" }, sourceFragment: "прогулка на 40 минут", contract: numeric }), true, true],
  ["numeric_missing_numeric_rejected", normalize({ rawFact: { parameterCode: "duration_minutes", unit: "minute", valueType: "text", valueNumeric: null, valueText: "40", valueBoolean: null, rawFragment: "40" }, sourceFragment: "прогулка 40", contract: numeric }), false, null],
  ["text_extra_numeric_normalized", normalize({ rawFact: { parameterCode: "meal_label", unit: "text", valueType: "text", valueNumeric: 1, valueText: "ужин", valueBoolean: null, rawFragment: "ужин" }, sourceFragment: "был ужин", contract: text }), true, true],
  ["boolean_exact", normalize({ rawFact: { parameterCode: "completed", unit: "boolean", valueType: "boolean", valueNumeric: null, valueText: null, valueBoolean: true, rawFragment: "сделал" }, sourceFragment: "сделал задачу", contract: boolean }), true, false],
  ["unit_rejected", normalize({ rawFact: { parameterCode: "duration_minutes", unit: "hour", valueType: "numeric", valueNumeric: 40, valueText: null, valueBoolean: null, rawFragment: "40 минут" }, sourceFragment: "40 минут", contract: numeric }), false, null],
  ["evidence_rejected", normalize({ rawFact: { parameterCode: "duration_minutes", unit: "minute", valueType: "numeric", valueNumeric: 40, valueText: null, valueBoolean: null, rawFragment: "50 минут" }, sourceFragment: "40 минут", contract: numeric }), false, null],
  ["parameter_rejected", normalize({ rawFact: { parameterCode: "other", unit: "minute", valueType: "numeric", valueNumeric: 40, valueText: null, valueBoolean: null, rawFragment: "40 минут" }, sourceFragment: "40 минут", contract: numeric }), false, null],
  ["null_contract_rejected", normalize({ rawFact: { parameterCode: "duration_minutes", unit: "minute", valueType: "numeric", valueNumeric: 40, valueText: null, valueBoolean: null, rawFragment: "40 минут" }, sourceFragment: "40 минут", contract: null }), false, null],
  ["non_object_rejected", normalize({ rawFact: "bad", sourceFragment: "40 минут", contract: numeric }), false, null],
];

let passed = 0;
for (const [name, result, accepted, normalized] of cases) {
  const ok = result.accepted === accepted &&
    (normalized === null || (result.accepted && result.normalizationApplied === normalized));
  console.log(`${name}=${ok ? "PASS" : "FAIL"} result=${JSON.stringify(result)}`);
  if (ok) passed += 1;
}
console.log(`SUMMARY=${passed}/${cases.length}`);
if (passed !== cases.length) process.exit(1);
