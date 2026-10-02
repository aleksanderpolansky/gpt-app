import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const targetPath = "lib/reality/globalObservationPilot.ts";
const routePath =
  "src/app/api/ai/reality/global-observation-preview/route.ts";

const source = fs.readFileSync(path.join(root, targetPath), "utf8");
const route = fs.readFileSync(path.join(root, routePath), "utf8");

const checks = [];
const check = (name, pass) => checks.push({ name, pass: Boolean(pass) });

check(
  "CURRENT_TRIAD_ROOT_COUNT_CONSTANT",
  source.includes("const EXPECTED_GLOBAL_DOMAIN_ROOT_COUNT = 3;"),
);

check(
  "CURRENT_TRIAD_ROOT_COUNT_GUARD",
  source.includes(
    "rootRows.length !== EXPECTED_GLOBAL_DOMAIN_ROOT_COUNT",
  ),
);

check(
  "OBSOLETE_12_ROOT_GUARD_REMOVED",
  !source.includes("rootRows.length !== 12") &&
    !source.includes("Expected 12 global DOMAIN roots"),
);

check(
  "LIVE_GLOBAL_ROOT_QUERY_PRESERVED",
  source.includes('.eq("scope_code", "global")') &&
    source.includes('.eq("ontology_node_role_code", "root")') &&
    source.includes('.eq("facet_code", "DOMAIN")') &&
    source.includes('.eq("status", "active")'),
);

check(
  "FACETS_STILL_DERIVED_FROM_ACTIVE_LEAVES",
  source.includes('.eq("ontology_node_role_code", "leaf")') &&
    source.includes('.in("root_value_object_id", rootIds)') &&
    source.includes("facetsByRoot"),
);

check(
  "BILLING_GATEWAY_PRESERVED",
  source.includes("runBillableAiJson") &&
    source.includes("billingUserId: input.appUserId") &&
    source.includes('operationKind: "semantic_intake"'),
);

check(
  "TWO_STAGE_LIMIT_PRESERVED",
  source.includes("const MAX_PROVIDER_CALLS = 2;") &&
    source.includes('stage: "domain_facet_routing"') &&
    source.includes('stage: "leaf_parameter_selection"'),
);

check(
  "USD_HARD_CAP_PRESERVED",
  source.includes("const HARD_CAP_USD = 0.1;") &&
    source.includes("AI_BUDGET_BLOCKED_HARD_COST_CAP_EXCEEDED"),
);

check(
  "LEGACY_USAGE_ACCOUNTING_STILL_ABSENT",
  !source.includes("runAiJsonWithUsageMetadata") &&
    !source.includes("preflight_ai_pilot_call_budget_v1") &&
    !source.includes('.from("ai_usage_events")') &&
    !source.includes("walletDebited: false"),
);

check(
  "ROUTE_CALLER_PRESERVED",
  route.includes("runGlobalObservationPreview") &&
    route.includes('from "../../../../../../lib/reality/globalObservationPilot"'),
);

check(
  "NO_FACT_WRITE_PRESERVED",
  source.includes("previewOnly: true") &&
    source.includes("dbFactWriteExecuted: false"),
);

check(
  "SOURCE_SINGLE_FINAL_NEWLINE",
  source.endsWith("\n") && !source.endsWith("\n\n"),
);

const failed = checks.filter((item) => !item.pass);

for (const item of checks) {
  console.log(`${item.pass ? "PASS" : "FAIL"} ${item.name}`);
}

console.log(
  `SUMMARY total=${checks.length} passed=${checks.length - failed.length} failed=${failed.length}`,
);

if (failed.length > 0) {
  console.error("B3_4B4D_R1_TRIAD_ROOT_CONTRACT_VALIDATOR=FAIL");
  process.exit(1);
}

console.log("OLD_ROOT_CONTRACT=12_DOMAIN_NAVIGATION_ROOTS");
console.log("NEW_ROOT_CONTRACT=3_TOP_LEVEL_TRIAD_ROOTS");
console.log("EXPECTED_GLOBAL_DOMAIN_ROOT_COUNT=3");
console.log("BILLING_RUNTIME_CHANGED=FALSE");
console.log("DB_MIGRATION_REQUIRED=FALSE");
console.log("B3_4B4D_R1_TRIAD_ROOT_CONTRACT_VALIDATOR=PASS");
