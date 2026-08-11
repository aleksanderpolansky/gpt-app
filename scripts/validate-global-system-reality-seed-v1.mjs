import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const seedPath = path.join(
  process.cwd(),
  "src",
  "data",
  "reality-core",
  "global-system-reality-seed-v1.json",
);

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));

assert(seed.contractVersion === "arctor-global-system-reality-seed-v1", "contractVersion mismatch");
assert(seed.layer === "global_system", "layer must be global_system");
assert(seed.scopeCode === "global", "scopeCode must be global");
assert(seed.roots.length === 12, `expected 12 roots, got ${seed.roots.length}`);
assert(seed.goldFixtures.length === 24, `expected 24 gold fixtures, got ${seed.goldFixtures.length}`);

const all = [...seed.roots, ...seed.nodes];
const byKey = new Map();

for (const node of all) {
  assert(/^[a-z][a-z0-9_.:-]{2,239}$/.test(node.canonicalKey), `invalid canonical key ${node.canonicalKey}`);
  assert(!byKey.has(node.canonicalKey), `duplicate canonical key ${node.canonicalKey}`);
  byKey.set(node.canonicalKey, node);
  assert(node.scopeCode === "global", `${node.canonicalKey}: scope must be global`);
  assert(node.visibilityCode === "public", `${node.canonicalKey}: visibility must be public`);
  assert(node.privacyClassCode === "public_ontology", `${node.canonicalKey}: privacy class must be public_ontology`);
  assert(node.originTypeCode === "system_model", `${node.canonicalKey}: origin must be system_model`);
}

for (const root of seed.roots) {
  assert(root.facetCode === "DOMAIN", `${root.canonicalKey}: root facet must be DOMAIN`);
  assert(root.objectKindCode === "domain_root", `${root.canonicalKey}: root kind`);
  assert(root.nodeRoleCode === "root", `${root.canonicalKey}: root role`);
  assert(root.parentCanonicalKey === null, `${root.canonicalKey}: root parent must be null`);
  assert(root.rootCanonicalKey === root.canonicalKey, `${root.canonicalKey}: root pointer must self-reference`);
}

const children = new Map();

for (const node of seed.nodes) {
  assert(node.nodeRoleCode === "intermediate" || node.nodeRoleCode === "leaf", `${node.canonicalKey}: non-root role invalid`);
  assert(node.parentCanonicalKey, `${node.canonicalKey}: parent required`);
  assert(byKey.has(node.parentCanonicalKey), `${node.canonicalKey}: parent not found`);
  assert(byKey.has(node.rootCanonicalKey), `${node.canonicalKey}: root not found`);

  const parent = byKey.get(node.parentCanonicalKey);
  const root = byKey.get(node.rootCanonicalKey);

  assert(root.nodeRoleCode === "root", `${node.canonicalKey}: root pointer is not root`);
  assert(root.facetCode === "DOMAIN", `${node.canonicalKey}: root must be DOMAIN`);
  assert(parent.nodeRoleCode !== "leaf", `${node.canonicalKey}: leaf parent is forbidden`);

  if (parent.nodeRoleCode === "root") {
    assert(node.facetCode !== "DOMAIN", `${node.canonicalKey}: child of DOMAIN root cannot remain DOMAIN`);
  } else {
    assert(node.facetCode === parent.facetCode, `${node.canonicalKey}: non-root facet must match parent`);
  }

  if (!children.has(node.parentCanonicalKey)) {
    children.set(node.parentCanonicalKey, []);
  }
  children.get(node.parentCanonicalKey).push(node.canonicalKey);
}

for (const node of seed.nodes) {
  if (node.nodeRoleCode === "leaf") {
    assert(!children.has(node.canonicalKey), `${node.canonicalKey}: semantic leaf cannot have children`);
  }
}

const parameterCodes = new Set(seed.parameterRegistry.map((item) => item.parameterCode));
assert(Object.keys(seed.storageParameterMapping).length === parameterCodes.size, "every semantic parameter must have a storage mapping decision");

for (const code of parameterCodes) {
  assert(Object.prototype.hasOwnProperty.call(seed.storageParameterMapping, code), `missing storage mapping for ${code}`);
}

for (const contract of seed.leafParameterContracts) {
  const leaf = byKey.get(contract.leafCanonicalKey);
  assert(leaf, `parameter contract leaf missing: ${contract.leafCanonicalKey}`);
  assert(leaf?.nodeRoleCode === "leaf", `parameter contract target is not leaf: ${contract.leafCanonicalKey}`);
  for (const code of contract.allowedParameterCodes) {
    assert(parameterCodes.has(code), `${contract.leafCanonicalKey}: unknown parameter ${code}`);
  }
}

const strategies = new Set(seed.observationTargetStrategies.map((item) => item.mode));
for (const required of ["OBSERVE", "TARGET", "MAINTAIN", "RANGE", "AVOID"]) {
  assert(strategies.has(required), `missing strategy ${required}`);
}

const decisionIds = new Set(seed.lockedDecisions.map((item) => item.id));
for (const required of ["Q1", "Q2", "Q3", "Q4", "Q5"]) {
  assert(decisionIds.has(required), `missing locked decision ${required}`);
}

assert(byKey.has("process.movement.walking"), "single walking leaf must exist");
assert(!byKey.has("process.movement.stroll"), "separate stroll leaf is forbidden in v0.2");
assert(byKey.has("process.nutrition.meal"), "single meal leaf must exist");
assert(
  !byKey.has("process.nutrition.breakfast") &&
  !byKey.has("process.nutrition.lunch") &&
  !byKey.has("process.nutrition.dinner"),
  "breakfast/lunch/dinner must not be separate leaves in v0.2",
);
assert(byKey.has("context.resources.available_time"), "available-time context leaf must exist");
assert(!seed.roots.some((root) => /time|location/i.test(root.canonicalKey)), "Time/Location DOMAIN roots are forbidden in v0.2");
assert(!all.some((node) => /body_temperature/i.test(node.canonicalKey)), "body temperature leaf must not be present in v0.2");

const extensionGaps = Object.entries(seed.storageParameterMapping)
  .filter(([, mapping]) => ["extend", "extend_unit", "leaf_specific"].includes(mapping.status))
  .map(([code, mapping]) => ({ code, ...mapping }));

if (process.exitCode) {
  console.error("Validation failed.");
  process.exit(process.exitCode);
}

console.log("PASS: Global System Reality Seed v1 machine contract is structurally valid.");
console.log(`Roots: ${seed.roots.length}`);
console.log(`Non-root nodes: ${seed.nodes.length}`);
console.log(`Total ontology objects: ${all.length}`);
console.log(`Custom kind extensions: ${seed.kindRegistryExtensions.length}`);
console.log(`Semantic parameters: ${seed.parameterRegistry.length}`);
console.log(`Leaf parameter contracts: ${seed.leafParameterContracts.length}`);
console.log(`Gold fixtures: ${seed.goldFixtures.length}`);
console.log(`Storage registry extensions still required before DB fact routing: ${extensionGaps.length}`);
for (const gap of extensionGaps) {
  console.log(`  - ${gap.code}: ${gap.status}${gap.storageCode ? ` -> ${gap.storageCode}` : ""}`);
}
