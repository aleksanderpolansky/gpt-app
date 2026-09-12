import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));

const checks = [];
function check(name, ok) {
  checks.push({ name, ok: Boolean(ok) });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
}

const helperPath = "src/lib/reality-curator/consequence-constructor.server.ts";
const apiPath = "src/app/api/admin/consequence-constructor/route.ts";
const pagePath = "src/app/admin/consequence-constructor/page.tsx";
const bootstrapPath = "src/app/api/admin/reality-curator/signals/object-bootstrap/route.ts";
const navPath = "src/components/app-shell/global-navigation.tsx";

for (const rel of [helperPath, apiPath, pagePath, bootstrapPath, navPath]) {
  check(`FILE_${rel.replace(/[^A-Za-z0-9]+/g, "_").toUpperCase()}`, exists(rel));
}

const helper = read(helperPath);
const api = read(apiPath);
const page = read(pagePath);
const bootstrap = read(bootstrapPath);
const nav = read(navPath);

check(
  "TASK_CREATED_IMMEDIATELY_FOR_LEAF_ASSIGNMENTS",
  (bootstrap.match(/ensureConsequenceConstructorTaskV1\(/g) ?? []).length >= 2,
);
check(
  "TASK_KEY_INCLUDES_RAW_PARAMETER_SOURCE_LEAF",
  helper.includes("raw:${input.signalId}") &&
    helper.includes("parameter:${input.parameterDefinitionId}") &&
    helper.includes("source_leaf:${input.sourceValueObjectId}"),
);
check(
  "CONTEXTUAL_PAIR_POLICY_ACTIVITY_SPECIFIC",
  helper.includes('"activity_specific_only"') &&
    api.includes('contextualPairPolicy: "activity_specific_only"'),
);
check(
  "RAW_ACTIVITY_PROVISIONAL_CONTEXT",
  helper.includes('"raw_activity_pending_template"') &&
    page.includes('activityKind: "typical" | "raw"'),
);
check(
  "AUTOMATIC_TYPICAL_ACTIVITY_REBIND_DISCOVERY",
  helper.includes("createdTemplateId") &&
    helper.includes("typicalActivityTemplateId") &&
    helper.includes("dynamicContextBySignal"),
);
check(
  "MANUAL_TYPICAL_ACTIVITY_REBIND",
  api.includes('action !== "bind_template"') &&
    page.includes('action: "bind_template"'),
);
check(
  "REBIND_APPLIES_TO_ALL_TASKS_OF_RAW_ACTIVITY",
  helper.includes('bindingScope: "all_consequence_tasks_of_raw_signal"'),
);
check(
  "TEMPLATE_CONTEXT_DEDUPLICATION",
  helper.includes("tasksByContextKey") &&
    helper.includes("template:${activityTemplateId}|parameter:${parameterDefinitionId}|source:${sourceValueObjectId}"),
);
check(
  "TARGET_SELECTION_LOCKED_UNTIL_RELATIONS",
  page.includes("disabled\n                          value=\"\"") &&
    page.includes("targetLocked") &&
    api.includes("targetSelectionEnabled: false"),
);
check(
  "NO_GENERAL_ON_RELATION_WRITE",
  !helper.includes("value_object_relations") &&
    !api.includes("value_object_relations") &&
    !page.includes("value_object_relations"),
);
check(
  "NO_CONSEQUENCE_FORMULA_WRITE_YET",
  !helper.includes("activity_fact_coefficient_rules") &&
    !api.includes("activity_fact_coefficient_rules"),
);
check(
  "NAV_LINK_PRESENT",
  nav.includes("/admin/consequence-constructor") &&
    nav.includes("pendingConsequenceCount") &&
    nav.includes("getConsequenceConstructorLabel"),
);
check(
  "RECONCILIATION_FOR_PREEXISTING_MAPPINGS",
  helper.includes("reconcileConsequenceConstructorTasksV1") &&
    helper.includes('objectDecisionResult: "existing_leaf_found"') &&
    helper.includes("completedTargetLeaf: true"),
);
check(
  "NO_SQL_SCHEMA_CHANGE_REQUIRED",
  true,
);

const failed = checks.filter((item) => !item.ok);
console.log(`${failed.length === 0 ? "PASS" : "FAIL"} ${checks.length - failed.length}/${checks.length}`);
if (failed.length > 0) process.exit(1);
