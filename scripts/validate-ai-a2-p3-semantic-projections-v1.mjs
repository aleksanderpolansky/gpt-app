import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";

const root = process.cwd();
const pilotRel = "lib/reality/globalObservationPilot.ts";
const projectionPolicyRel = "lib/reality/semanticProjectionPolicy.ts";
const recognitionPolicyRel = "lib/reality/recognitionCandidatePolicy.ts";
const pageRel = "src/app/activity-ai-lab/page.tsx";
const p2EvidenceRel =
  "docs/recovery/evidence/GSR1L/ARCTOR_AI_A2_P2_PRODUCTION_RUNTIME_ACCEPTANCE_20260813.txt";
const contractRel =
  "docs/reality-core/ARCTOR_AI_A2_P3_SEMANTIC_PROJECTION_CONTRACT_V1_RU.md";

function fail(message) {
  console.error(
    JSON.stringify(
      { validator: "AI_A2_P3", passed: false, error: message },
      null,
      2,
    ),
  );
  process.exit(1);
}

function read(rel) {
  const full = path.join(root, ...rel.split("/"));
  if (!fs.existsSync(full)) fail(`missing file: ${rel}`);
  return fs.readFileSync(full);
}

function normalizedText(buffer) {
  return buffer
    .toString("utf8")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function requireToken(text, token, label = token) {
  if (!text.includes(token)) fail(`missing marker: ${label}`);
}

function forbidToken(text, token, label = token) {
  if (text.includes(token)) fail(`forbidden marker: ${label}`);
}

function countToken(text, token) {
  return text.split(token).length - 1;
}

const pilot = normalizedText(read(pilotRel));
const projectionPolicy = normalizedText(read(projectionPolicyRel));
const recognitionPolicy = normalizedText(read(recognitionPolicyRel));
const page = normalizedText(read(pageRel));
const contract = normalizedText(read(contractRel));

for (const [rel, source, kind] of [
  [pilotRel, pilot, "ts"],
  [projectionPolicyRel, projectionPolicy, "ts"],
  [recognitionPolicyRel, recognitionPolicy, "ts"],
  [pageRel, page, "tsx"],
]) {
  if (source.includes("\u0000")) fail(`NUL byte in ${rel}`);
  if (source.startsWith("\ufeff")) fail(`unexpected BOM in ${rel}`);
  if (!source.trim()) fail(`empty source: ${rel}`);
  if (!kind) fail(`internal kind missing for ${rel}`);
}

let ts;
try {
  const require = createRequire(import.meta.url);
  ts = require("typescript");
} catch (error) {
  fail(
    `typescript package unavailable: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
}

function syntaxCheck(source, rel, jsx = false) {
  const compilerOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
  };
  if (jsx) compilerOptions.jsx = ts.JsxEmit.ReactJSX;

  const transpiled = ts.transpileModule(source, {
    compilerOptions,
    reportDiagnostics: true,
    fileName: rel,
  });

  const errors = (transpiled.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );

  if (errors.length > 0) {
    fail(
      `${rel} TypeScript diagnostics: ${errors
        .map((d) => ts.flattenDiagnosticMessageText(d.messageText, " "))
        .join(" | ")}`,
    );
  }

  return transpiled.outputText;
}

syntaxCheck(pilot, pilotRel);
const projectionPolicyJs = syntaxCheck(
  projectionPolicy,
  projectionPolicyRel,
);
syntaxCheck(recognitionPolicy, recognitionPolicyRel);
syntaxCheck(page, pageRel, true);

requireToken(
  projectionPolicy,
  '"AI_A2_P3_SEMANTIC_PROJECTION_PREVIEW_V1"',
);
requireToken(projectionPolicy, 'selectedCanonicalKey !== "process.finance.purchase"');
requireToken(projectionPolicy, 'projectionCode: "purchase_contains_food_goods"');
requireToken(projectionPolicy, 'projectionCode: "relevant_to_nutrition"');
requireToken(projectionPolicy, 'projectionCode: "possible_household_provisioning"');
requireToken(projectionPolicy, 'projectionCode: "possible_family_benefit"');
requireToken(projectionPolicy, 'epistemicStatus: "DERIVED"');
requireToken(projectionPolicy, 'epistemicStatus: "INFERRED"');
requireToken(projectionPolicy, "writeAllowed: false");
requireToken(projectionPolicy, "primaryClassificationChanged: false");
requireToken(projectionPolicy, "contextText?: string");

requireToken(pilot, 'from "./semanticProjectionPolicy"');
requireToken(pilot, "contextText: inputText");
requireToken(pilot, "loadSemanticProjectionTargets(");
requireToken(pilot, "SEMANTIC_PROJECTION_TARGET_NODE_ROLE_BY_KEY");
requireToken(pilot, '"SEMANTIC_PROJECTION_TARGET_NOT_ALLOWLISTED"');
requireToken(pilot, '"SEMANTIC_PROJECTION_TARGET_ROLE_CONTRACT_FAILED"');
requireToken(pilot, '.from("value_objects")');
requireToken(pilot, '"SEMANTIC_PROJECTION_TARGET_CONTRACT_FAILED"');
requireToken(pilot, "targetValueObjectId: target.id");
requireToken(pilot, "targetTitle: target.title");
requireToken(pilot, "semanticProjectionPolicy:");
requireToken(pilot, "deterministic: true");
requireToken(pilot, "previewOnly: true");
requireToken(pilot, "realityGraphWriteExecuted: false");
requireToken(pilot, "const MAX_PROVIDER_CALLS = 2;");
requireToken(pilot, "maxRetries: 0");
requireToken(pilot, "store: false");
requireToken(pilot, "dbFactWriteExecuted: false");
requireToken(pilot, 'p_query_text: segment.sourceFragment');
requireToken(pilot, "p_limit: RECOGNITION_CANDIDATE_LIMIT");
requireToken(pilot, "AI_SELECTION_UNRESOLVED_GROUP_BYPASS_BLOCKED");
forbidToken(pilot, "get_global_value_object_leaf_candidates_v1");
forbidToken(pilot, "recognize_global_value_object_text_v1");

if (countToken(pilot, "await runBudgetedJsonCall<") !== 2) {
  fail(
    `expected exactly 2 provider-stage invocations, found ${countToken(
      pilot,
      "await runBudgetedJsonCall<",
    )}`,
  );
}

requireToken(page, 'kind: "meaning"');
requireToken(page, 'meaning: "СМЫСЛ"');
requireToken(page, "Покупка содержит пищевые товары");
requireToken(page, "Связь с питанием и физиологическими потребностями");
requireToken(page, "Возможный бытовой контекст обеспечения");
requireToken(page, "Возможная связь с обеспечением семьи");
requireToken(page, "Это только preview-связь и она не записывается в Reality Graph.");
requireToken(page, "targetTitle ?? projection.targetCanonicalKey");

requireToken(contract, "AI_A2_P3_SEMANTIC_PROJECTION_PREVIEW_V1");
requireToken(contract, "writeAllowed=false");
requireToken(contract, "primaryClassificationChanged=false");
requireToken(contract, "Продукты сами по себе не доказывают интерес семьи");
requireToken(contract, "максимум 2 provider calls");
requireToken(contract, "купил ноутбук в магазине");

const moduleObject = { exports: {} };
const context = {
  module: moduleObject,
  exports: moduleObject.exports,
  require: createRequire(import.meta.url),
  console,
  Set,
  String,
  Array,
};
vm.runInNewContext(projectionPolicyJs, context, {
  filename: "semanticProjectionPolicy.compiled.cjs",
});
const runtimePolicy = moduleObject.exports;

if (typeof runtimePolicy.buildSemanticProjections !== "function") {
  fail("buildSemanticProjections export unavailable");
}

const stokrotkaFull =
  "сходил в магазин стокротка возле меня, купил две консервы тунца и макароны, заплатил 20 злотых";
const stokrotka = runtimePolicy.buildSemanticProjections({
  selectedCanonicalKey: "process.finance.purchase",
  sourceFragment: "купил две консервы тунца и макароны",
  contextText: stokrotkaFull,
  locale: "ru",
});
const stokrotkaCodes = stokrotka.map((item) => item.projectionCode);

for (const expected of [
  "purchase_contains_food_goods",
  "relevant_to_nutrition",
  "possible_household_provisioning",
]) {
  if (!stokrotkaCodes.includes(expected)) {
    fail(`Stokrotka projection missing: ${expected}`);
  }
}
if (stokrotkaCodes.includes("possible_family_benefit")) {
  fail("Stokrotka must not infer family benefit without family evidence");
}
if (stokrotka.length !== 3) {
  fail(`Stokrotka expected exactly 3 projections, got ${stokrotka.length}`);
}

const sleep = runtimePolicy.buildSemanticProjections({
  selectedCanonicalKey: null,
  sourceFragment: "спал примерно 6 часов",
  contextText: "спал примерно 6 часов",
  locale: "ru",
});
if (sleep.length !== 0) fail("unresolved sleep must have zero semantic projections");

const nonFoodPurchase = runtimePolicy.buildSemanticProjections({
  selectedCanonicalKey: "process.finance.purchase",
  sourceFragment: "купил ноутбук",
  contextText: "купил ноутбук в магазине",
  locale: "ru",
});
if (nonFoodPurchase.length !== 0) {
  fail("non-food purchase must not receive food/household projection in P3 v1");
}

const familyPurchase = runtimePolicy.buildSemanticProjections({
  selectedCanonicalKey: "process.finance.purchase",
  sourceFragment: "купил продукты жене и детям",
  contextText: "купил в магазине продукты жене и детям",
  locale: "ru",
});
const familyCodes = familyPurchase.map((item) => item.projectionCode);
if (!familyCodes.includes("possible_family_benefit")) {
  fail("explicit family food purchase must expose possible_family_benefit");
}

const englishFood = runtimePolicy.buildSemanticProjections({
  selectedCanonicalKey: "process.finance.purchase",
  sourceFragment: "bought groceries and tuna",
  contextText: "bought groceries at the store",
  locale: "en",
});
if (!englishFood.some((item) => item.projectionCode === "relevant_to_nutrition")) {
  fail("English food purchase coverage failed");
}

for (const [name, projections] of [
  ["stokrotka", stokrotka],
  ["family", familyPurchase],
  ["english", englishFood],
]) {
  for (const item of projections) {
    if (item.writeAllowed !== false) fail(`${name}: writeAllowed must be false`);
    if (item.primaryClassificationChanged !== false) {
      fail(`${name}: primaryClassificationChanged must be false`);
    }
    if (!Array.isArray(item.evidenceFragments) || item.evidenceFragments.length === 0) {
      fail(`${name}: every projection must carry evidence fragments`);
    }
    if (!["DERIVED", "INFERRED"].includes(item.epistemicStatus)) {
      fail(`${name}: unexpected epistemic status ${item.epistemicStatus}`);
    }
  }
}

const p2Evidence = normalizedText(read(p2EvidenceRel));
requireToken(p2Evidence, "RESULT=PASS");
requireToken(p2Evidence, "STOKROTKA=PASS");
requireToken(p2Evidence, "GENERIC_SLEEP_UNRESOLVED=PASS");

const current = normalizedText(read("docs/recovery/ARCTOR_CURRENT_STATE_RU.md"));
const decisions = normalizedText(
  read("docs/recovery/ARCTOR_DECISIONS_AND_FAILURES_RU.md"),
);
const restore = normalizedText(read("docs/recovery/ARCTOR_RESTORE_FROM_ZERO_RU.md"));
const manifest = JSON.parse(
  normalizedText(read("docs/recovery/CHECKPOINT_MANIFEST.json")),
);

requireToken(current, "AI_A2_P3_SEMANTIC_PROJECTION_PREVIEW_V1");
requireToken(decisions, "DECISION_AI_A2_P3_SEMANTIC_PROJECTIONS_V1");
requireToken(restore, "AI-A2 P3 restore point - 2026-08-13");

if (manifest.documentedState !== "AI_A2_P3_SEMANTIC_PROJECTION_PREVIEW_V1") {
  fail(`manifest documentedState mismatch: ${manifest.documentedState}`);
}
if (manifest.gsr1lImplementation?.productionRuntimeAcceptance !== "PASS") {
  fail("P2 productionRuntimeAcceptance must be PASS");
}
if (manifest.gsr1lImplementation?.semanticProjectionPreviewIntegrated !== true) {
  fail("semanticProjectionPreviewIntegrated must be true");
}
if (manifest.gsr1lImplementation?.semanticProjectionRealityGraphWrite !== false) {
  fail("semanticProjectionRealityGraphWrite must be false");
}
if (manifest.gsr1lImplementation?.semanticProjectionProviderCallsAdded !== 0) {
  fail("semanticProjectionProviderCallsAdded must be 0");
}

console.log(
  JSON.stringify(
    {
      validator: "AI_A2_P3",
      passed: true,
      policySha256: sha256(Buffer.from(projectionPolicy, "utf8")),
      pilotSha256: sha256(Buffer.from(pilot, "utf8")),
      pageSha256: sha256(Buffer.from(page, "utf8")),
      stokrotkaProjectionCodes: stokrotkaCodes,
      familyProjectionCodes: familyCodes,
      unresolvedSleepProjectionCount: sleep.length,
      providerCallsMax: 2,
      providerCallsAddedByProjectionLayer: 0,
      realityGraphWrite: false,
      primaryClassificationChanged: false,
    },
    null,
    2,
  ),
);
