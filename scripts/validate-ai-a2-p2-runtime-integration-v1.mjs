import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";

const root = process.cwd();
const pilotRel = "lib/reality/globalObservationPilot.ts";
const policyRel = "lib/reality/recognitionCandidatePolicy.ts";
const pilotExpectedSha = "51c7af7b85e9086c4c623eddeee61ffbb5c94fa72647e6336e4b367310f98f44";
const policyExpectedSha = "7d438f901326596a14496ef1548664e34cbf134fac72c2d360930fe07afdc124";

function fail(message) {
  console.error(
    JSON.stringify(
      { validator: "AI_A2_P2", passed: false, error: message },
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

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}
function normalizedTextSha256(buffer) {
  const normalized = buffer
    .toString("utf8")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  return sha256(Buffer.from(normalized, "utf8"));
}

function requireToken(text, token, label = token) {
  if (!text.includes(token)) fail(`missing marker: ${label}`);
}

function forbidToken(text, token, label = token) {
  if (text.includes(token)) fail(`forbidden legacy marker remains: ${label}`);
}

const pilotBuffer = read(pilotRel);
const policyBuffer = read(policyRel);
const pilotHash = normalizedTextSha256(pilotBuffer);
const policyHash = normalizedTextSha256(policyBuffer);

if (pilotHash !== pilotExpectedSha) {
  fail(`pilot sha256 mismatch: ${pilotHash}`);
}
if (policyHash !== policyExpectedSha) {
  fail(`policy sha256 mismatch: ${policyHash}`);
}

const pilot = pilotBuffer.toString("utf8");
const policySource = policyBuffer.toString("utf8");

requireToken(pilot, '"get_global_value_object_recognition_candidates_v1"');
requireToken(pilot, "p_query_text: segment.sourceFragment");
requireToken(pilot, "p_semantic_tags: []");
requireToken(pilot, "p_limit: RECOGNITION_CANDIDATE_LIMIT");
requireToken(pilot, 'resolutionMode: "recognition_candidates"');
requireToken(pilot, ".filter((candidate) => candidate.selectionAllowed)");
requireToken(pilot, "AI_SELECTION_UNRESOLVED_GROUP_BYPASS_BLOCKED");
requireToken(
  pilot,
  "Supporting-only recognition evidence is never sufficient for semantic selection in this stage.",
);
requireToken(pilot, 'stage: "domain_facet_routing"');
requireToken(pilot, 'stage: "leaf_parameter_selection"');
requireToken(pilot, "const MAX_PROVIDER_CALLS = 2;");
requireToken(pilot, "maxRetries: 0");
requireToken(pilot, "store: false");
requireToken(pilot, "dbFactWriteExecuted: false");
requireToken(pilot, "recognitionStatus: group.recognitionStatus");
requireToken(pilot, "recognitionEvidenceClass:");

forbidToken(pilot, "get_global_value_object_leaf_candidates_v1");
forbidToken(pilot, "recognize_global_value_object_text_v1");
forbidToken(pilot, "GLOBAL_CANDIDATE_BOUND_VIOLATED");
forbidToken(pilot, "DOMAIN/FACET candidate bound exceeded 10.");

requireToken(policySource, "AI_A2_GSR1L_BOUNDED_CANDIDATES_V1");
requireToken(policySource, 'evidenceClass === "exact" || evidenceClass === "strong"');
requireToken(policySource, 'case "UNRESOLVED_TOO_BROAD"');
requireToken(policySource, 'case "UNRESOLVED"');

let ts;
try {
  const require = createRequire(import.meta.url);
  ts = require("typescript");
} catch (error) {
  fail(`typescript package unavailable for policy execution test: ${error instanceof Error ? error.message : String(error)}`);
}

const transpiled = ts.transpileModule(policySource, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
  },
  reportDiagnostics: true,
  fileName: policyRel,
});

const syntaxErrors = (transpiled.diagnostics ?? []).filter(
  (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
);
if (syntaxErrors.length > 0) {
  fail(
    `policy TypeScript diagnostics: ${syntaxErrors
      .map((d) => ts.flattenDiagnosticMessageText(d.messageText, " "))
      .join(" | ")}`,
  );
}

const moduleObject = { exports: {} };
const context = {
  module: moduleObject,
  exports: moduleObject.exports,
  require: createRequire(import.meta.url),
  console,
  Set,
  Number,
};
vm.runInNewContext(transpiled.outputText, context, {
  filename: "recognitionCandidatePolicy.compiled.cjs",
});
const runtimePolicy = moduleObject.exports;

const policyCases = [
  [
    "no_match_shape",
    runtimePolicy.isRecognitionStatusShapeValid({
      status: "NO_MATCH",
      candidateCount: 0,
      returnedCandidateCount: 0,
      limit: 5,
    }),
    true,
  ],
  [
    "too_broad_shape",
    runtimePolicy.isRecognitionStatusShapeValid({
      status: "UNRESOLVED_TOO_BROAD",
      candidateCount: 6,
      returnedCandidateCount: 0,
      limit: 5,
    }),
    true,
  ],
  [
    "generic_sleep_unresolved_shape",
    runtimePolicy.isRecognitionStatusShapeValid({
      status: "UNRESOLVED",
      candidateCount: 2,
      returnedCandidateCount: 2,
      limit: 5,
    }),
    true,
  ],
  [
    "single_shape",
    runtimePolicy.isRecognitionStatusShapeValid({
      status: "SINGLE_CANDIDATE",
      candidateCount: 1,
      returnedCandidateCount: 1,
      limit: 5,
    }),
    true,
  ],
  [
    "ready_shape",
    runtimePolicy.isRecognitionStatusShapeValid({
      status: "CANDIDATES_READY",
      candidateCount: 2,
      returnedCandidateCount: 2,
      limit: 5,
    }),
    true,
  ],
  [
    "too_broad_must_return_zero_rows",
    runtimePolicy.isRecognitionStatusShapeValid({
      status: "UNRESOLVED_TOO_BROAD",
      candidateCount: 6,
      returnedCandidateCount: 1,
      limit: 5,
    }),
    false,
  ],
  [
    "support_only_single_blocked",
    runtimePolicy.isRecognitionCandidateSelectable(
      "SINGLE_CANDIDATE",
      "supporting",
    ),
    false,
  ],
  [
    "strong_single_allowed",
    runtimePolicy.isRecognitionCandidateSelectable(
      "SINGLE_CANDIDATE",
      "strong",
    ),
    true,
  ],
  [
    "exact_single_allowed",
    runtimePolicy.isRecognitionCandidateSelectable(
      "SINGLE_CANDIDATE",
      "exact",
    ),
    true,
  ],
  [
    "unresolved_strong_still_blocked",
    runtimePolicy.isRecognitionCandidateSelectable("UNRESOLVED", "strong"),
    false,
  ],
  [
    "ready_supporting_sibling_blocked",
    runtimePolicy.isRecognitionCandidateSelectable(
      "CANDIDATES_READY",
      "supporting",
    ),
    false,
  ],
  [
    "ready_strong_allowed",
    runtimePolicy.isRecognitionCandidateSelectable(
      "CANDIDATES_READY",
      "strong",
    ),
    true,
  ],
];

for (const [name, actual, expected] of policyCases) {
  if (actual !== expected) fail(`policy case failed: ${name}; actual=${actual}`);
}

const current = read("docs/recovery/ARCTOR_CURRENT_STATE_RU.md").toString("utf8");
const decisions = read(
  "docs/recovery/ARCTOR_DECISIONS_AND_FAILURES_RU.md",
).toString("utf8");
const restore = read("docs/recovery/ARCTOR_RESTORE_FROM_ZERO_RU.md").toString(
  "utf8",
);
const manifest = JSON.parse(
  read("docs/recovery/CHECKPOINT_MANIFEST.json").toString("utf8"),
);

requireToken(current, "AI_A2_P2_RUNTIME_INTEGRATION_V1");
requireToken(decisions, "DECISION_AI_A2_P2_RECOGNITION_RUNTIME_V1");
requireToken(restore, "AI-A2 P2 restore point - 2026-08-13");

if (manifest.documentedState !== "AI_A2_P2_RUNTIME_INTEGRATION_V1") {
  fail(`checkpoint documentedState mismatch: ${manifest.documentedState}`);
}
if (!manifest.gsr1lImplementation) fail("gsr1lImplementation missing");
if (manifest.gsr1lImplementation.runtimeIntegrated !== true) {
  fail("runtimeIntegrated must be true after P2 code integration");
}
if (manifest.gsr1lImplementation.productionRuntimeAcceptance !== "PENDING") {
  fail("productionRuntimeAcceptance must remain PENDING before live preview");
}

const p1Migration = read(
  "supabase/manual-applied/20260813_ai_a2_p1_recognition_foundation_v1.sql",
);
if (
  normalizedTextSha256(p1Migration) !==
  "ab9c851d3be1f7a1763c535afe585d41ddcc721e5a23eabaefb2aa8d8a732a2d"
) {
  fail("AI-A2-P1 migration hash changed");
}

console.log(
  JSON.stringify(
    {
      validator: "AI_A2_P2",
      passed: true,
      pilotSha256: pilotHash,
      policySha256: policyHash,
      policyCases: policyCases.length,
      oldCoarseRuntimePathRemoved: true,
      supportingOnlySelectionBlocked: true,
      previewOnly: true,
      providerCallsMax: 2,
      retries: 0,
      store: false,
    },
    null,
    2,
  ),
);
