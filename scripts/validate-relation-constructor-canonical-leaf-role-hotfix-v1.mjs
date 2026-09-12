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

const api = read("src/app/api/admin/relation-constructor/route.ts");

check(
  "CANONICAL_ONTOLOGY_ROLE_SELECTED",
  api.includes("ontology_node_role_code"),
);
check(
  "CATALOG_FILTERS_CANONICAL_LEAF",
  api.includes('.eq("ontology_node_role_code", "leaf")'),
);
check(
  "LEGACY_NODE_ROLE_NOT_USED_AS_LEAF_FILTER",
  !api.includes('.eq("node_role_code", "leaf")'),
);
check(
  "ENDPOINT_GUARD_USES_CANONICAL_ROLE",
  api.includes('row.ontology_node_role_code !== "leaf"'),
);
check(
  "UI_ROLE_METADATA_USES_CANONICAL_ROLE",
  api.includes("nodeRoleCode: row.ontology_node_role_code"),
);
check(
  "RELATION_COMPATIBILITY_USES_CANONICAL_ROLE",
  api.includes("input.source.ontology_node_role_code") &&
    api.includes("input.target.ontology_node_role_code"),
);
check(
  "DB_NODE_ROLE_GUARD_UNCHANGED",
  !fs.existsSync(
    "supabase/migrations/20260912150000_relation_constructor_role_guard_change.sql",
  ),
);
check(
  "NON_LEAF_SERVER_REJECTION_REMAINS",
  api.includes("RELATION_CONSTRUCTOR_${label}_NOT_LEAF"),
);
check(
  "SELF_LINK_REJECTION_REMAINS",
  api.includes("RELATION_CONSTRUCTOR_SELF_LINK_FORBIDDEN"),
);
check(
  "NO_FORMULA_CHANGE",
  !api.includes("formulaConfigured: true"),
);

console.log(`PASS ${checks.length}/10`);
