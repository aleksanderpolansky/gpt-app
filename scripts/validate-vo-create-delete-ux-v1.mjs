import fs from "node:fs";

const checks = [];
function check(name, passed, detail = null) {
  checks.push({ name, passed: Boolean(passed), detail });
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${detail ? `: ${detail}` : ""}`);
}
function read(path) {
  if (!fs.existsSync(path)) {
    check(`FILE_EXISTS:${path}`, false);
    return "";
  }
  check(`FILE_EXISTS:${path}`, true);
  return fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}
function has(text, needle) {
  return text.includes(needle);
}

const root = read("src/app/value-objects/new/root/page.tsx");
const intermediate = read(
  "src/app/value-objects/[id]/new-intermediate/intermediate-create-form.tsx",
);
const leaf = read("src/app/value-objects/[id]/new-leaf/leaf-create-form.tsx");
const api = read("src/app/api/value-objects/[id]/route.ts");
const detail = read("src/app/value-objects/[id]/page.tsx");
const createSuccess = read(
  "src/components/workspace/value-objects/value-object-create-success-card.tsx",
);
const deleteAction = read(
  "src/components/workspace/value-objects/value-object-delete-action.tsx",
);
const sql = read("supabase/manual-applied/20260822_vo_create_delete_ux_v1.sql");
const postcheck = read(
  "supabase/diagnostics/20260822_vo_create_delete_ux_v1_postcheck_READONLY.sql",
);
const rollback = read(
  "supabase/rollbacks/20260822_vo_create_delete_ux_v1_ROLLBACK.sql",
);
const recovery = read("docs/recovery/ARCTOR_VO_CREATE_DELETE_UX_V1_RU.md");
const evidence = read(
  "docs/recovery/evidence/HELP_FILES/ARCTOR_VO_CREATE_DELETE_UX_V1_EVIDENCE.json",
);

check("ROOT_SUCCESS_STATE", has(root, "setCreatedUrl(data.redirectUrl)"));
check("ROOT_DOUBLE_SUBMIT_GUARD", has(root, "if (pending || createdUrl)"));
check(
  "INTERMEDIATE_SUCCESS_STATE",
  has(intermediate, "setCreatedUrl(data.redirectUrl)"),
);
check(
  "INTERMEDIATE_DOUBLE_SUBMIT_GUARD",
  has(intermediate, "if (pending || createdUrl)"),
);
check("LEAF_SUCCESS_STATE", has(leaf, "setCreatedUrl(payload.redirectUrl)"));
check("LEAF_DOUBLE_SUBMIT_GUARD", has(leaf, "if (busy || createdUrl)"));
check(
  "CREATE_SUCCESS_CARD_LINK",
  has(createSuccess, "Open object") && has(createSuccess, "objectHref"),
);
check(
  "CREATE_SUCCESS_SEVEN_LOCALES",
  ["en:", "pl:", "ru:", "uk:", "de:", "es:", "cs:"].every((x) =>
    has(createSuccess, x),
  ),
);
check("DELETE_UI_CONFIRMATION", has(deleteAction, 'role="dialog"'));
check("DELETE_UI_CALLS_DELETE", has(deleteAction, 'method: "DELETE"'));
check(
  "DELETE_UI_SEVEN_LOCALES",
  ["en:", "pl:", "ru:", "uk:", "de:", "es:", "cs:"].every((x) =>
    has(deleteAction, x),
  ),
);
check("DETAIL_DELETE_MANUAL_ONLY", has(detail, 'valueObject.source === "manual"'));
check(
  "DETAIL_DELETE_USER_DECLARED_ONLY",
  has(detail, 'valueObject.origin_type_code === "user_declared"'),
);
check(
  "DETAIL_DELETE_INITIAL_VERSION_ONLY",
  has(detail, "valueObject.definition_version === 1"),
);
check("DETAIL_DELETE_COMPONENT", has(detail, "ValueObjectDeleteAction"));
check("API_DELETE_EXPORT", has(api, "export async function DELETE("));
check("API_DELETE_RPC", has(api, 'supabase.rpc(\n    "delete_value_object_safe_v1"'));
check("API_NO_BLANK_EOF", api.length > 0 && api.endsWith("\n") && !api.endsWith("\n\n"));
check("API_DELETE_409_BLOCK", has(api, "VALUE_OBJECT_DELETE_BLOCKED_DEPENDENCY"));
check("SQL_SECURITY_DEFINER", has(sql, "security definer"));
check("SQL_SEARCH_PATH", has(sql, "set search_path = public, pg_temp"));
check(
  "SQL_COMMERCIAL_GUARD",
  has(sql, "VO_SAFE_DELETE_ONLY_PRIVATE_MANUAL_ONTOLOGY") &&
    has(sql, "product_type") &&
    has(sql, "service_type"),
);
check(
  "SQL_INITIAL_VERSION_GUARD",
  has(sql, "VO_SAFE_DELETE_ONLY_UNUSED_INITIAL_VERSION") &&
    has(sql, "definition_version"),
);
check(
  "SQL_CHILD_GUARD",
  has(sql, "VALUE_OBJECT_DELETE_HAS_CHILDREN") &&
    has(sql, "parent_value_object_id"),
);
check(
  "SQL_DYNAMIC_FK_GUARD",
  has(sql, "pg_constraint") &&
    has(sql, "VALUE_OBJECT_DELETE_BLOCKED_DEPENDENCY"),
);
check(
  "SQL_NON_FK_REFERENCE_GUARD",
  has(sql, "VALUE_OBJECT_DELETE_BLOCKED_REFERENCE_COLUMN") &&
    has(sql, "attribute_row.attname like '%value_object_id'") &&
    has(sql, "VALUE_OBJECT_DELETE_BLOCKED_ALIAS"),
);
check(
  "SQL_INTRINSIC_LEDGER_ONLY",
  has(sql, "delete from public.value_object_ontology_write_requests") &&
    has(sql, "delete from public.value_object_definition_versions") &&
    has(sql, "delete from public.value_object_hierarchy_events"),
);
check(
  "SQL_SERVICE_ROLE_ONLY",
  has(sql, "from public, anon, authenticated, service_role") &&
    has(sql, "to service_role"),
);
check("POSTCHECK_READ_ONLY", !/\b(insert|update|delete|create|drop|alter|truncate)\b/i.test(
  postcheck.replace(/^--.*$/gm, ""),
));
check("POSTCHECK_12_CHECKS", has(postcheck, "12_no_function_execution"));
check(
  "ROLLBACK_LAYER_ONLY",
  has(rollback, "drop function if exists public.delete_value_object_safe_v1") &&
    !/delete\s+from/i.test(rollback),
);
check(
  "RECOVERY_PURGE_BASELINE",
  has(recovery, "174 → 15") && has(recovery, "4") && has(recovery, "11"),
);
check("RECOVERY_MIND_MAP_NEXT", has(recovery, "Mind Map"));
check("EVIDENCE_NO_PROD_READ", has(evidence, '"productionSupabaseRead": false'));
check("EVIDENCE_DB_MANUAL", has(evidence, '"databaseApplyMode": "manual_supabase_sql_editor"'));

const failed = checks.filter((item) => !item.passed);
console.log(
  `SUMMARY total=${checks.length} passed=${checks.length - failed.length} failed=${failed.length}`,
);
if (failed.length > 0) process.exit(1);
