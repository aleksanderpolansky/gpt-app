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
  "CATALOG_LEAF_ONLY",
  api.includes('.eq("node_role_code", "leaf")'),
);
check(
  "SOURCE_TARGET_SERVER_LEAF_GUARD",
  api.includes('row.node_role_code !== "leaf"'),
);
check(
  "EXPLICIT_NOT_LEAF_ERROR",
  api.includes("RELATION_CONSTRUCTOR_${label}_NOT_LEAF"),
);
check(
  "NOT_LEAF_IS_409",
  api.includes('message.includes("NOT_LEAF")'),
);
check(
  "DB_NODE_ROLE_GUARD_NOT_REMOVED_BY_SQL",
  !fs.existsSync("supabase/migrations/20260912143000_remove_system_relation_node_role_guard.sql"),
);
check(
  "RELATION_TYPE_WRITE_POLICY_STILL_CLOSED",
  api.includes('canonical_write_policy_code", "enabled"'),
);
check(
  "SELF_LINK_STILL_BLOCKED",
  api.includes("RELATION_CONSTRUCTOR_SELF_LINK_FORBIDDEN"),
);
check(
  "NO_FORMULA_CHANGE",
  !api.includes("formulaConfigured: true"),
);

console.log(`PASS ${checks.length}/8`);
