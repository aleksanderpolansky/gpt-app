import fs from "node:fs";

const checks = [];

function read(path) {
  if (!fs.existsSync(path)) throw new Error(`MISSING_FILE:${path}`);
  return fs.readFileSync(path, "utf8");
}

function check(name, ok) {
  if (!ok) throw new Error(`FAIL ${name}`);
  console.log(`PASS ${name}`);
  checks.push(name);
}

const api = read("src/app/api/admin/consequence-constructor/route.ts");

check(
  "RELATED_ENDPOINT_UNION_USED",
  api.includes("const relatedObjectIds = ["),
);

check(
  "GLOBAL_SOURCE_ID_EXCLUSION_REMOVED",
  !api.includes(".filter((id) => !sourceIds.includes(id))"),
);

check(
  "OBJECT_LOOKUP_USES_ALL_RELATED_ENDPOINTS",
  api.includes('.in("id", relatedObjectIds)'),
);

check(
  "PER_SOURCE_OUTGOING_TARGET_DISCOVERY_REMAINS",
  /if\s*\(\s*relation\.source_value_object_id\s*===\s*sourceId\s*\)\s*\{\s*targetId\s*=\s*relation\.target_value_object_id;/m.test(
    api,
  ),
);

check(
  "PER_SOURCE_INCOMING_TARGET_DISCOVERY_REMAINS",
  /\}\s*else\s+if\s*\(\s*relation\.target_value_object_id\s*===\s*sourceId\s*\)\s*\{\s*targetId\s*=\s*relation\.source_value_object_id;/m.test(
    api,
  ),
);

check(
  "RELATIONS_ACTIVE_ONLY",
  api.includes('.eq("status", "active")'),
);

check(
  "TARGETS_CANONICAL_LEAF_ONLY",
  api.includes('.eq("ontology_node_role_code", "leaf")'),
);

check(
  "TARGET_SEARCH_BEFORE_TEMPLATE_REMAINS",
  api.includes("targetSelectionBeforeTemplateAllowed: true") &&
    !api.includes("CONSEQUENCE_TEMPLATE_REQUIRED_BEFORE_TARGET"),
);

check(
  "FORMULA_WRITE_REMAINS_DISABLED",
  api.includes("formulaWriteEnabled: false") &&
    !api.includes("formulaConfigured: true"),
);

console.log(`PASS ${checks.length}/9`);
