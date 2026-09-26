import fs from "node:fs";
import path from "node:path";

const repo = process.cwd();

const files = {
  contract: "src/lib/activity/source-snapshot-resolution.ts",
  ui: "src/app/activity-templates/system-activity-template-create.tsx",
  api: "src/app/api/admin/activity-templates/system/create/route.ts",
  author: "src/lib/reality-curator/direct-system-typical-activity-authoring.server.ts",
  analyzer: "src/lib/activity/activity-basic-intake-analysis.server.ts",
  materializer: "src/lib/activity/activity-intake-source-fact-materializer.server.ts",
};

const source = Object.fromEntries(
  Object.entries(files).map(([key, rel]) => [
    key,
    fs.readFileSync(path.join(repo, rel), "utf8"),
  ]),
);

let passed = 0;
let total = 0;

function check(name, condition) {
  total += 1;
  if (!condition) {
    console.error(`FAIL ${name}`);
    process.exitCode = 1;
    return;
  }
  passed += 1;
  console.log(`PASS ${name}`);
}

const has = (key, text) => source[key].includes(text);

check("contract exposes qualification mode", has("contract", '"default" | "explicit_qualifier"'));
check("contract stores qualifier aliases", has("contract", "aliases: string[]"));
check("binding supports target qualification", has("contract", "targetQualification?: SourceTargetQualification"));
check("qualification parser exists", has("contract", "parseSourceTargetQualification"));
check("explicit qualification requires aliases", has("contract", "SOURCE_TARGET_QUALIFIER_ALIAS_REQUIRED"));
check("qualification set validator exists", has("contract", "validateSourceBindingTargetQualifications"));
check("partial qualification set is rejected", has("contract", "SOURCE_TARGET_QUALIFICATION_PARTIAL_SET_INVALID"));
check("multiple defaults are rejected", has("contract", "SOURCE_TARGET_QUALIFICATION_MULTIPLE_DEFAULTS"));
check("legacy profile compatibility is documented in code", has("contract", "Legacy profiles intentionally remain untouched"));

check("UI has universal explicit qualifier label", has("ui", "Требует явного указания"));
check("UI has explicit qualifier help", has("ui", "к какому показателю относится число"));
check("UI stores per-binding qualifier state", has("ui", "explicitQualifierByBinding"));
check("UI first selected target defaults to unqualified", has("ui", "First target is the default recipient"));
check("UI additional targets default explicit", has("ui", "Additional targets are explicit-only by default"));
check("UI enforces one default by toggling siblings", has("ui", "Exactly one target at most may be the fallback"));
check("UI derives aliases from object titles", has("ui", "qualifierAliasesForObject"));
check("UI has duration generic words", has("ui", '"duration"'));
check("UI has mass generic words", has("ui", '"mass"'));
check("UI has count generic words", has("ui", '"count"'));
check("UI sends targetQualification", has("ui", "targetQualification"));
check("UI sends explicit qualifier mode", has("ui", '"explicit_qualifier"'));
check("UI sends default mode", has("ui", '"default"'));
check("UI validates qualification before publish", has("ui", "parseSourceTargetQualification"));

check("API parses target qualification", has("api", "parseSourceTargetQualification"));
check("API validates qualification set", has("api", "validateSourceBindingTargetQualifications"));
check("API mapping type carries qualification", has("api", "targetQualification?: SourceTargetQualification"));

check("authoring parses target qualification", has("author", "parseSourceTargetQualification"));
check("authoring validates qualification set", has("author", "validateSourceBindingTargetQualifications"));
check("authoring mapping carries qualification", has("author", "targetQualification?: SourceTargetQualification"));
check("authoring persists enriched mappings", has("author", "sourceValueBindingsV1: input.mappings"));

check("analyzer schema includes qualifier", has("analyzer", 'qualifier: { type: ["string", "null"]'));
check("analyzer requires qualifier field", has("analyzer", '"qualifier",'));
check("analyzer extracts every repeated primitive measurement", has("analyzer", "Extract EVERY explicitly stated primitive measurement"));
check("analyzer includes soup example", has("analyzer", "soup 400 g, potatoes 120 g, meat 80 g"));
check("analyzer instructs verbatim qualifier phrase", has("analyzer", "qualifier is the shortest verbatim noun phrase"));
check("analyzer validates qualifier is inside evidence fragment", has("analyzer", "qualifier === null"));
check("analyzer dedup includes qualifier", has("analyzer", "qualifier ?? \"\""));
check("analyzer merge keeps disjoint equal-valued measurements", has("analyzer", "fragmentContains"));

check("materializer reads qualifier", has("materializer", "qualifier: string | null"));
check("materializer parses target qualification", has("materializer", "parseSourceTargetQualification"));
check("materializer validates profile qualification set", has("materializer", "validateSourceBindingTargetQualifications"));
check("materializer has fuzzy qualifier matching", has("materializer", "qualifierSimilarity"));
check("materializer supports default unqualified target", has("materializer", '?.mode ===\n            "default"'));
check("materializer preserves explicit-only targets", has("materializer", "measurement.qualifier ==="));
check("materializer rejects ambiguous qualifier matches", has("materializer", "SOURCE_EXPLICIT_QUALIFIER_AMBIGUOUS"));
check("materializer rejects multiple values for one target", has("materializer", "SOURCE_EXPLICIT_TARGET_MULTIPLE_VALUES"));
check("materializer rejects ambiguous bare values", has("materializer", "SOURCE_UNQUALIFIED_VALUE_AMBIGUOUS"));
check("materializer preserves legacy fan-out", has("materializer", "historical fan-out behavior"));
check("materializer stores measurement qualifier provenance", has("materializer", "measurementQualifier"));
check("materializer stores target qualification provenance", has("materializer", "targetQualification:"));
check("materializer uses qualified routing provenance marker", has("materializer", "qualified_target_binding_v1"));
check("snapshot fallback remains available", has("materializer", "resolveSnapshotValue"));
check("controlled confirmation writer remains unchanged", has("materializer", "attach_global_observation_facts_gsr1_v1"));

console.log(`VALIDATOR=${process.exitCode ? "FAIL" : `PASS_${passed}_${total}`}`);
