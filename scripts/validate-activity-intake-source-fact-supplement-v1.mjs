import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const FILES = {
  component: "src/components/activity/activity-basic-intake-analysis-card.tsx",
  materializer: "src/lib/activity/activity-intake-source-fact-materializer.server.ts",
  supplement: "src/lib/activity/activity-intake-source-fact-supplement.server.ts",
  route: "src/app/api/activity/intake-analysis/supplement-source-fact/route.ts",
};

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function requireText(source, needle, label) {
  if (!source.includes(needle)) {
    throw new Error(`VALIDATOR_MISSING:${label}`);
  }
}

function forbidText(source, needle, label) {
  if (source.includes(needle)) {
    throw new Error(`VALIDATOR_FORBIDDEN:${label}`);
  }
}

const component = read(FILES.component);
const materializer = read(FILES.materializer);
const supplement = read(FILES.supplement);
const route = read(FILES.route);

const checks = [];

function check(label, fn) {
  fn();
  checks.push(label);
  console.log(`PASS ${checks.length}: ${label}`);
}

check("materializer missing diagnostics carry value type/unit metadata", () => {
  requireText(materializer, "valueTypeCode?: string;", "missing value type field");
  requireText(materializer, "canonicalUnitCode?: string | null;", "missing canonical unit field");
  requireText(materializer, "makeMissingBundleValue", "missing value builder");
});

check("component exposes manual supplement endpoint", () => {
  requireText(
    component,
    '"/api/activity/intake-analysis/supplement-source-fact"',
    "supplement endpoint",
  );
  requireText(component, "handleSupplementMissingValue", "supplement handler");
});

check("component only renders supplement controls after facts exist", () => {
  requireText(component, "{factsCommitted ? (", "facts committed gate");
  requireText(
    component,
    "Значение будет добавлено к этой активности как отдельный исходный факт.",
    "ru supplement helper",
  );
});

check("component contains seven localized supplement copies", () => {
  for (const locale of ["ru", "en", "pl", "uk", "de", "es", "cs"]) {
    requireText(component, `${locale}: {`, `locale ${locale}`);
  }
  requireText(component, 'add: "Добавить значение"', "ru add copy");
  requireText(component, 'add: "Add value"', "en add copy");
  requireText(component, 'add: "Dodaj wartość"', "pl add copy");
});

check("component preserves corporate visual tokens", () => {
  requireText(component, "#3b6ef8", "brand blue");
  requireText(component, "#eef3ff", "brand pale blue");
  requireText(component, "rounded-lg", "rounded corporate cards");
});

check("supplement server validates current missing pair", () => {
  requireText(
    supplement,
    "E03_SUPPLEMENT_PAIR_NOT_CURRENTLY_MISSING",
    "current missing pair gate",
  );
  requireText(
    supplement,
    "E03_SUPPLEMENT_MISSING_PAIR_NOT_IN_PROFILE",
    "profile membership gate",
  );
});

check("supplement server preserves explicit profile routing", () => {
  requireText(supplement, "sourceValueBindingsV1", "source bindings read");
  requireText(
    supplement,
    "E03_SUPPLEMENT_FALLBACK_ROUTE_NOT_UNIQUE",
    "fallback route uniqueness",
  );
  requireText(
    supplement,
    "E03_SUPPLEMENT_SYSTEM_ASSIGNMENT_NOT_UNIQUE",
    "assignment uniqueness",
  );
});

check("supplement server writes one fact through canonical writer", () => {
  requireText(
    supplement,
    '"attach_global_observation_facts_gsr1_v1"',
    "canonical fact writer",
  );
  requireText(supplement, "p_facts: [writerRow]", "single writer row");
});

check("supplement idempotency is pair scoped", () => {
  requireText(
    supplement,
    "ARCTOR_E03_SOURCE_FACT_SUPPLEMENT_V1",
    "supplement contract",
  );
  requireText(
    supplement,
    "${input.activityEventId}:${option.parameterDefinitionId}:${option.valueObjectId}",
    "pair idempotency tuple",
  );
});

check("manual provenance is explicit without inventing zero", () => {
  requireText(
    supplement,
    'captureMethod: "manual_missing_bundle_value"',
    "manual capture provenance",
  );
  requireText(
    supplement,
    'valueOriginCode: "user_explicit"',
    "user explicit origin",
  );
  forbidText(supplement, "valueNumeric: 0", "zero substitution");
});

check("server uses canonical unit for supplemented values", () => {
  requireText(
    supplement,
    "const unit = text(option.canonicalUnitCode) || option.valueTypeCode;",
    "canonical unit selection",
  );
  requireText(
    supplement,
    "E03_SUPPLEMENT_NEGATIVE_VALUE_NOT_ALLOWED",
    "negative-value guard",
  );
});

check("supplement updates missing list and completeness", () => {
  requireText(supplement, "missingValues: remainingOptions", "remaining missing values");
  requireText(
    supplement,
    'remainingOptions.length === 0 ? "complete" : "partial"',
    "completeness transition",
  );
});

check("supplement preserves previous facts instead of rewriting bundle", () => {
  requireText(supplement, "previousFactIds", "previous fact ids");
  requireText(supplement, "previousWriterRows", "previous writer rows");
  requireText(supplement, "sourceWriterRows.push(writerRow)", "append writer row");
});

check("route requires authenticated activity user context", () => {
  requireText(route, "getActivityUserContext", "user context");
  requireText(route, "appUserId: appUser.id", "user-scoped supplement call");
});

check("route rejects malformed UUIDs and empty value", () => {
  requireText(route, "UUID_RE.test(activityEventId)", "activity UUID");
  requireText(route, "UUID_RE.test(parameterDefinitionId)", "parameter UUID");
  requireText(route, "UUID_RE.test(valueObjectId)", "object UUID");
  requireText(route, "!rawValue", "empty value");
});

check("route separates input/conflict/infrastructure statuses", () => {
  requireText(route, "isInputFailure", "input failure classifier");
  requireText(route, "isInfrastructureFailure", "infrastructure classifier");
  requireText(route, "? 400", "HTTP 400");
  requireText(route, "? 500", "HTTP 500");
  requireText(route, ": 409", "HTTP 409");
});

console.log(`VALIDATOR=PASS_${checks.length}_${checks.length}`);
