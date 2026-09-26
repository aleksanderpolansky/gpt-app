import fs from "node:fs";

const files = {
  card: fs.readFileSync("src/components/activity/activity-basic-intake-analysis-card.tsx", "utf8"),
  materializer: fs.readFileSync("src/lib/activity/activity-intake-source-fact-materializer.server.ts", "utf8"),
  supplement: fs.readFileSync("src/lib/activity/activity-intake-source-fact-supplement.server.ts", "utf8"),
};

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

const has = (file, needle) => files[file].includes(needle);
const compact = (value) => value.replace(/\s+/g, " ").trim();
const compactFiles = Object.fromEntries(
  Object.entries(files).map(([key, value]) => [key, compact(value)]),
);
const compactHas = (file, needle) =>
  compactFiles[file].includes(compact(needle));

check("missing value exposes requirement kind", has("materializer", 'requirementKind?: "required" | "optional_explicit"'));
check("materializer exposes planned bundle value", has("materializer", "export type E03PlannedBundleValue"));
check("preflight returns planned values", has("materializer", "plannedValues: E03PlannedBundleValue[]"));
check("missing value factory stores requirement kind", has("materializer", "requirementKind,"));
check("explicit-only direct targets classified optional", has("materializer", 'return "optional_explicit";'));
check("cached missing route uses requirement classifier", has("materializer", "missingRequirementKind(pair)"));
check("direct missing route uses requirement classifier", has("materializer", '"EXPLICIT_VALUE_MISSING",\n              missingRequirementKind(pair),'));
check("planned routing reads target id from provenance", has("materializer", "targetValueObjectId"));
check("planned routing exposes target title", has("materializer", "targetTitle: target.title"));
check("planned routing preserves numeric value", has("materializer", "valueNumeric:"));
check("planned routing preserves text value", has("materializer", "valueText:"));
check("preflight complete ignores optional-only gaps", compactHas("materializer", 'value.requirementKind !== "optional_explicit"'));
check("materialized analysis persists planned values", has("materializer", "plannedValues,"));
check("supplement preserves requirement kind", has("supplement", "requirementKind:"));
check("supplement completeness ignores optional-only remainder", compactHas("supplement", 'row.requirementKind !== "optional_explicit"'));
check("ui understands planned values", has("card", "type PlannedBundleValue"));
check("ui preflight accepts planned values", has("card", "plannedValues?: PlannedBundleValue[]"));
check("ui shows will be written copy", has("card", 'plannedTitle: "Будет записано"'));
check("ui shows observation object label", has("card", 'objectLabel: "Объект наблюдения"'));
check("ui shows parameter label", has("card", 'parameterLabel: "Параметр"'));
check("ui distinguishes optional missing data", has("card", 'optionalTitle: "Дополнительные данные не указаны"'));
check("ui explains optional values", has("card", 'optionalBadge: "Необязательно"'));
check("ui russian copy decoded correctly", has("card", 'plannedTitle: "Будет записано"') && has("card", 'objectLabel: "Объект наблюдения"') && has("card", 'parameterLabel: "Параметр"') && has("card", 'optionalBadge: "Необязательно"'));
check("ui source has no replacement characters", !files.card.includes("�"));
check("ui renders target title", has("card", "value.targetTitle"));
check("ui renders planned target title", has("card", "planned.targetTitle"));
check("ui permits pre-confirm draft entry", has("card", "beforeConfirmHelper"));
check("ui supplements filled drafts after primary materialization", has("card", "supplementDraftEntries"));
check("ui calls supplement endpoint after primary write", has("card", '"/api/activity/intake-analysis/supplement-source-fact"'));
check("ui preserves post-commit single supplement action", has("card", "handleSupplementMissingValue"));
check("ui displays routed value", has("card", "formatPlannedValue"));
check("ui keeps materialize confirmation control", has("card", "handleMaterializeFacts"));

if (!process.exitCode) {
  console.log(`VALIDATOR=PASS_${passed}_${total}`);
}
