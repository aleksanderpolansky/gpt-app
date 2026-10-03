import fs from "node:fs";

const files = {
  projectClient: "src/app/projects/ProjectMapStartClient.tsx",
  leafPage: "src/app/value-objects/new/personal-leaf/page.tsx",
  leafForm: "src/app/value-objects/new/personal-leaf/personal-leaf-create-form.tsx",
  valueObjectApi: "src/app/api/value-objects/route.ts",
  migration: "supabase/migrations/20261003113000_project_personal_leaf_system_parent_v1.sql",
};

function read(path) {
  if (!fs.existsSync(path)) throw new Error(`MISSING_FILE:${path}`);
  return fs.readFileSync(path, "utf8");
}

const source = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, read(path)]),
);

const checks = [];

function check(name, ok) {
  if (!ok) throw new Error(`FAIL ${name}`);
  console.log(`PASS ${name}`);
  checks.push(name);
}

check(
  "PROJECT_SELECTOR_USES_LOCALIZED_CATALOG",
  source.projectClient.includes('/api/value-objects?locale=') &&
    source.projectClient.includes("isPersonalLeaf"),
);

check(
  "PROJECT_SELECTOR_PERSONAL_LEAF_ONLY",
  source.projectClient.includes('textValue(row.scope_code) === "actor"') &&
    source.projectClient.includes('textValue(row.ontology_node_role_code) === "leaf"') &&
    source.projectClient.includes('textValue(row.status) === "active"'),
);

check(
  "PROJECT_SELECTOR_ADD_NEW_FIRST_ROW",
  source.projectClient.includes("addObservationObject") &&
    source.projectClient.indexOf("data.copy.addObservationObject") <
      source.projectClient.indexOf("data.filteredRoots.map"),
);

check(
  "PROJECT_SELECTOR_NEW_LEAF_ROUTE",
  source.projectClient.includes('/value-objects/new/personal-leaf'),
);

check(
  "PERSONAL_LEAF_FORM_EXISTS",
  source.leafPage.includes("PersonalLeafCreateForm") &&
    source.leafForm.includes("leaf_system_parent_active_v1"),
);

check(
  "PARENT_SELECTOR_SYSTEM_INTERMEDIATE_ONLY",
  source.leafForm.includes('textValue(row.scope_code) === "global"') &&
    source.leafForm.includes('textValue(row.origin_type_code) === "system_model"') &&
    source.leafForm.includes('textValue(row.ontology_node_role_code) === "intermediate"') &&
    source.leafForm.includes('textValue(row.status) === "active"'),
);

check(
  "PARENT_SELECTOR_LOCALIZED_CATALOG",
  source.leafForm.includes('/api/value-objects?locale='),
);

check(
  "API_MODE_RECOGNIZED",
  source.valueObjectApi.includes("normalizeLeafSystemParentActiveCreationMode") &&
    source.valueObjectApi.includes("leaf_system_parent_active_v1"),
);

check(
  "API_SYSTEM_PARENT_ENFORCED",
  source.valueObjectApi.includes("VO_AUTHORING_LEAF_SYSTEM_INTERMEDIATE_REQUIRED") &&
    source.valueObjectApi.includes('parent.scopeCode === "global"') &&
    source.valueObjectApi.includes('parent.originTypeCode === "system_model"'),
);

check(
  "API_GLOBAL_PARENT_FLAG",
  source.valueObjectApi.includes("allowGlobalSystemParent: systemParentOnlyRequested"),
);

check(
  "DB_GUARD_PATCH_PRESENT",
  source.migration.includes("PP2_ACTOR_LEAF_UNDER_SYSTEM_INTERMEDIATE_V1"),
);

check(
  "DB_CREATE_RPC_PATCH_PRESENT",
  source.migration.includes("PP2_ALLOW_GLOBAL_SYSTEM_PARENT_V1"),
);

check(
  "NO_NEW_TABLE",
  !/\bcreate\s+table\b/i.test(source.migration),
);

console.log(`VALIDATOR=PASS_${checks.length}/${checks.length}`);
