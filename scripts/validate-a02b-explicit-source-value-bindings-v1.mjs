import fs from "node:fs";
import path from "node:path";

const repo = process.cwd();

const SYSTEM = "src/lib/reality-curator/system-typical-activity-materialization.server.ts";
const DIRECT = "src/lib/reality-curator/direct-system-typical-activity-authoring.server.ts";
const RUNTIME = "src/lib/activity/activity-intake-source-fact-materializer.server.ts";

function read(rel) {
  return fs.readFileSync(path.join(repo, ...rel.split("/")), "utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

const system = read(SYSTEM);
const direct = read(DIRECT);
const runtime = read(RUNTIME);

const checks = [
  ["system helper exists", system.includes("async function ensureExplicitSourceValueBindingsV1(")],
  ["system reads sourceValueBindingsV1", system.includes("metadata.sourceValueBindingsV1")],
  ["system writes sourceValueBindingsV1", system.includes("sourceValueBindingsV1,")],
  ["system rejects conflicting bindings", system.includes("CURATOR_SYSTEM_TEMPLATE_SOURCE_BINDINGS_CONFLICT")],
  ["system rejects duplicate persisted pairs", system.includes("CURATOR_SYSTEM_TEMPLATE_SOURCE_BINDINGS_DUPLICATE")],
  ["system verifies active profile invariant", system.includes("CURATOR_SYSTEM_TEMPLATE_SOURCE_BINDINGS_PROFILE_INVARIANT_FAILED")],
  ["system verifies persisted bindings after write", system.includes("CURATOR_SYSTEM_TEMPLATE_SOURCE_BINDINGS_VERIFY_FAILED")],
  ["system invokes explicit binding persistence", system.includes("await ensureExplicitSourceValueBindingsV1({")],
  ["system fingerprint still includes mappings", system.includes("mappings:\n      normalizedMappings(input.mappings)")],
  ["system routes preserve parameter id", system.includes("sourceParameterDefinitionId:\n                  mapping.parameterDefinitionId")],
  ["system routes preserve assignment id", system.includes("targetParameterAssignmentId:\n                  assignment.id")],
  ["direct authoring retains rich explicit bindings", direct.includes("sourceValueBindingsV1: input.mappings")],
  ["direct authoring retains optional sourceResolution", direct.includes("sourceResolution?: SourceResolution;")],
  ["runtime reads explicit profile bindings", runtime.includes("const bindingValue = asRecord(profile.metadata_json).sourceValueBindingsV1;")],
  ["runtime validates binding against exact assignment pair", runtime.includes("item.parameter_definition_id === binding.parameterDefinitionId") && runtime.includes("item.value_object_id === binding.valueObjectId") && runtime.includes('throw new Error("SOURCE_BINDING_PROFILE_MISMATCH")')],
  ["runtime prefers explicit declared pairs", runtime.includes("const declaredPairs = bindings")],
  ["runtime legacy fallback rejects missing route", runtime.includes("E03_PROFILE_ROUTE_MISSING")],
  ["runtime legacy fallback rejects ambiguous route", runtime.includes("E03_PROFILE_ROUTE_AMBIGUOUS_FOR_CURRENT_WRITER")],
  ["runtime rejects duplicate explicit pairs", runtime.includes("SOURCE_BINDING_PROFILE_INVALID")],
];

let passed = 0;
for (const [label, ok] of checks) {
  if (ok) {
    console.log(`PASS ${label}`);
    passed += 1;
  } else {
    console.error(`FAIL ${label}`);
  }
}

if (passed !== checks.length) {
  console.error(`VALIDATOR=FAIL_${passed}_${checks.length}`);
  process.exit(1);
}

const callIndex = system.indexOf("await ensureExplicitSourceValueBindingsV1({");
const invariantIndex = system.indexOf("CURATOR_SYSTEM_TEMPLATE_MATERIALIZATION_INVARIANT_FAILED");
const returnIndex = system.indexOf("  return {", callIndex);
if (!(invariantIndex >= 0 && callIndex > invariantIndex && returnIndex > callIndex)) {
  console.error("FAIL explicit binding persistence ordering");
  process.exit(1);
}
console.log("PASS explicit binding persistence ordering");

console.log(`VALIDATOR=PASS_${checks.length + 1}_${checks.length + 1}`);
