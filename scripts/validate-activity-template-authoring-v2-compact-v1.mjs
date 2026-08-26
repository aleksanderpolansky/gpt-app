import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function check(name, passed, detail = "") {
  checks.push({ name, passed: Boolean(passed), detail });
}

const contract = "src/lib/activity-template-impact-profile-contract.ts";
const helper = "src/lib/activity/activity-template-authoring-v2.server.ts";
const listRoute = "src/app/api/activity-template-impact-profiles/route.ts";
const itemRoute = "src/app/api/activity-template-impact-profiles/[id]/route.ts";
const catalogRoute =
  "src/app/api/activity-template-impact-profiles/catalog/route.ts";
const editor =
  "src/app/activity-templates/activity-template-impact-profile-editor.tsx";
const recovery =
  "docs/recovery/ARCTOR_ACTIVITY_TEMPLATE_AUTHORING_V2_COMPACT_V1_RU.md";

for (const file of [
  contract,
  helper,
  listRoute,
  itemRoute,
  catalogRoute,
  editor,
  recovery,
]) {
  check(`FILE_EXISTS:${file}`, exists(file));
}

const contractText = read(contract);
const helperText = read(helper);
const listRouteText = read(listRoute);
const itemRouteText = read(itemRoute);
const catalogText = read(catalogRoute);
const editorText = read(editor);

check(
  "CONTRACT_UUID_ARRAYS",
  contractText.includes("parameterDefinitionIds") &&
    contractText.includes("targetValueObjectIds"),
);
check(
  "CONTRACT_NO_V1_FIXED_ROSTER",
  !contractText.includes("ACTIVITY_PROFILE_PARAMETER_CODES") &&
    !contractText.includes('"process_count"'),
);
check(
  "SERVER_V2_RPC",
  helperText.includes('"save_activity_template_impact_profile_v2"'),
);
check(
  "SERVER_GENERAL_INTERNAL_ONLY",
  helperText.includes('p_template_group: "general"'),
);
check(
  "SERVER_EXISTING_ASSIGNMENTS_ONLY",
  helperText.includes('"value_object_parameter_assignments"') &&
    helperText.includes('.eq("status", "active")') &&
    !helperText.includes(".insert(") &&
    !helperText.includes("create_custom"),
);
check(
  "SERVER_EVENT_LINK_FALLBACK",
  helperText.includes("routes") &&
    helperText.includes("return []"),
);
check(
  "API_POST_V2",
  listRouteText.includes("saveActivityTemplateAuthoringV2") &&
    !listRouteText.includes("save_activity_template_impact_profile_v1"),
);
check(
  "API_PUT_V2",
  itemRouteText.includes("saveActivityTemplateAuthoringV2") &&
    !itemRouteText.includes("save_activity_template_impact_profile_v1"),
);
check(
  "API_READ_ROUTING_CONTRACT",
  listRouteText.includes("routing_contract_code") &&
    itemRouteText.includes("routing_contract_code"),
);
check(
  "API_LEGACY_READ_COMPATIBLE",
  itemRouteText.includes("activity_template_profile_parameters_v1") &&
    itemRouteText.includes("legacyParameterCodes"),
);
check(
  "CATALOG_SHARED_REGISTRY",
  catalogText.includes("value_object_parameter_definitions") &&
    catalogText.includes('neq("parameter_code", "process_count")'),
);
check(
  "CATALOG_SELECT_LITERAL_TYPE",
  catalogText.includes(
    '"id,scope_code,parameter_code,title,description,dimension_code,value_type_code,canonical_unit_code,allowed_unit_codes,aggregation_method_code,default_window_code" as const',
  ) &&
    !catalogText.includes('].join(",")'),
);
check(
  "CATALOG_SUPABASE_TYPED_RESULT_BRIDGE",
  catalogText.includes(
    "(systemResult.data ?? []) as unknown as DefinitionRow[]",
  ) &&
    catalogText.includes(
      "(actorResult.data ?? []) as unknown as DefinitionRow[]",
    ) &&
    !catalogText.includes(
      "(systemResult.data ?? []) as DefinitionRow[]",
    ) &&
    !catalogText.includes(
      "(actorResult.data ?? []) as DefinitionRow[]",
    ),
);
check(
  "EDITOR_COMPACT_PARAMETER_PICKER",
  editorText.includes("parameterOpen") &&
    editorText.includes("filteredParameterGroups") &&
    editorText.includes("parameterDefinitionIds"),
);
check(
  "EDITOR_OBJECT_SEARCH",
  editorText.includes("/api/value-objects/selector") &&
    editorText.includes('level: "leaf"') &&
    editorText.includes('includeGlobal: "1"'),
);
check(
  "EDITOR_OBJECT_INFO_MODAL",
  editorText.includes("objectInfo") &&
    editorText.includes("pathSegments") &&
    editorText.includes("fullCard"),
);
check(
  "EDITOR_NO_CATEGORY_OR_GROUP_INPUT",
  !editorText.includes("templateGroup") &&
    !editorText.includes("setTemplateGroup"),
);
check(
  "EDITOR_NO_PROCESS_COUNT",
  !editorText.includes("process_count") &&
    !editorText.includes("Process count") &&
    !editorText.includes("Количество процессов"),
);
check(
  "EDITOR_NO_CONFIDENCE_OR_DYNAMICS",
  !editorText.includes("setConfidence") &&
    !editorText.includes("analytics-profile") &&
    !editorText.includes("inactivityDelta"),
);
check(
  "EDITOR_ADVANCED_ONLY_DESCRIPTION_NOTES",
  editorText.includes("advancedOpen") &&
    editorText.includes("description") &&
    editorText.includes("notes"),
);

for (const file of [
  contract,
  helper,
  listRoute,
  itemRoute,
  catalogRoute,
  editor,
  recovery,
]) {
  if (!exists(file)) continue;
  const content = read(file);
  const normalized = content.replace(/\r\n/g, "\n");
  check(
    `NO_TRAILING_WHITESPACE:${file}`,
    !normalized.split("\n").some((line) => /[ \t]+$/.test(line)),
  );
  check(
    `SINGLE_FINAL_NEWLINE:${file}`,
    normalized.endsWith("\n") && !normalized.endsWith("\n\n"),
  );
}

const failed = checks.filter((item) => !item.passed);

console.log(
  JSON.stringify(
    {
      release: "ARCTOR_ACTIVITY_TEMPLATE_AUTHORING_V2_COMPACT_V1",
      total: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
      allPass: failed.length === 0,
      checks,
    },
    null,
    2,
  ),
);

if (failed.length > 0) {
  process.exitCode = 1;
}
