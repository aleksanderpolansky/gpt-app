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

const consequenceApi = read("src/app/api/admin/consequence-constructor/route.ts");
const consequencePage = read("src/app/admin/consequence-constructor/page.tsx");
const relationApi = read("src/app/api/admin/relation-constructor/route.ts");
const relationPage = read("src/app/admin/relation-constructor/page.tsx");
const relationsApi = read("src/app/api/admin/relations/route.ts");
const relationsPage = read("src/app/admin/relations/page.tsx");
const migration = read(
  "supabase/migrations/20260912170000_system_value_object_relation_guard_ontology_leaf_v1.sql",
);

check(
  "CONSEQUENCE_TARGET_CANONICAL_LEAF_ROLE",
  consequenceApi.includes('.eq("ontology_node_role_code", "leaf")') &&
    !consequenceApi.includes('.eq("node_role_code", "leaf")'),
);
check(
  "CONSEQUENCE_TARGET_SEARCH_BEFORE_TEMPLATE_ALLOWED",
  consequenceApi.includes("targetSelectionBeforeTemplateAllowed: true"),
);
check(
  "CONSEQUENCE_TEMPLATE_HARD_LOCK_REMOVED_API",
  !consequenceApi.includes("CONSEQUENCE_TEMPLATE_REQUIRED_BEFORE_TARGET"),
);
check(
  "CONSEQUENCE_TEMPLATE_HARD_LOCK_REMOVED_UI",
  !consequencePage.includes("!task.activityTemplateId ||"),
);
check(
  "CONSEQUENCE_TARGET_SELECTION_TASK_FIRST_POLICY",
  consequenceApi.includes('contextualPairPolicy: "task_first_then_typical_activity"'),
);
check(
  "CONSEQUENCE_RAW_PENDING_TEMPLATE_STATE_RECORDED",
  consequenceApi.includes('"raw_pending_template"'),
);
check(
  "CONSEQUENCE_TARGET_SELECTION_SURVIVES_TEMPLATE_BIND",
  !consequenceApi.includes("templateByTask.get(taskId) !== activityTemplateId"),
);
check(
  "CONSEQUENCE_DELETED_RELATION_INVALIDATES_CURRENT_TARGET",
  consequenceApi.includes("allowedTargetIds.has(target.targetValueObjectId)"),
);
check(
  "CONSEQUENCE_RELATED_RELATIONS_ACTIVE_ONLY",
  consequenceApi.includes('.from("system_value_object_relations")') &&
    consequenceApi.includes('.eq("status", "active")'),
);
check(
  "CONSEQUENCE_TARGET_MULTIPLE_SUPPORTED",
  consequencePage.includes("addAnother") &&
    consequencePage.includes("selectedTargets"),
);

check(
  "RELATION_EDIT_GET_PREFILL",
  relationApi.includes("editingRelation") &&
    relationPage.includes("payload.editingRelation"),
);
check(
  "RELATION_EDIT_PUT_API",
  relationApi.includes("export async function PUT"),
);
check(
  "RELATION_EDIT_PAGE_PUT",
  relationPage.includes('method: editingRelationId ? "PUT" : "POST"'),
);
check(
  "RELATION_EDIT_AUDIT_EVENT",
  relationApi.includes("system_value_object_relation_updated"),
);
check(
  "RELATION_DELETE_API",
  relationApi.includes("export async function DELETE"),
);
check(
  "RELATION_DELETE_SOFT_INACTIVE",
  relationApi.includes('status: "inactive"') &&
    relationApi.includes('deleteMode: "soft_inactive"'),
);
check(
  "RELATION_DELETE_AUDIT_EVENT",
  relationApi.includes("system_value_object_relation_deleted"),
);
check(
  "RELATIONS_LIST_ACTIVE_ONLY",
  relationsApi.includes('.eq("status", "active")'),
);
check(
  "RELATIONS_LIST_EDIT_ACTION",
  relationsPage.includes("copy.edit") &&
    relationsPage.includes("/admin/relation-constructor?relationId="),
);
check(
  "RELATIONS_LIST_DELETE_ACTION",
  relationsPage.includes("deleteRelation(item)") &&
    relationsPage.includes('method: "DELETE"'),
);
check(
  "RELATION_ENDPOINTS_STILL_LEAF_ONLY",
  relationApi.includes('row.ontology_node_role_code !== "leaf"'),
);
check(
  "RELATION_CONSTRUCTOR_CATALOG_STILL_LEAF_ONLY",
  relationApi.includes('.eq("ontology_node_role_code", "leaf")'),
);
check(
  "RELATION_SELF_LINK_GUARD_REMAINS",
  relationApi.includes("RELATION_CONSTRUCTOR_SELF_LINK_FORBIDDEN"),
);
check(
  "RELATION_TYPE_CLOSED_WRITE_POLICY_REMAINS",
  relationApi.includes('canonical_write_policy_code", "enabled"'),
);

check(
  "DB_GUARD_MIGRATION_PRESENT",
  migration.includes("create or replace function public.guard_system_value_object_relation_v1()"),
);
check(
  "DB_GUARD_USES_CANONICAL_ROLE",
  migration.includes("v_source.ontology_node_role_code <> 'leaf'") &&
    migration.includes("v_target.ontology_node_role_code <> 'leaf'"),
);
check(
  "DB_GUARD_LEGACY_ROLE_NOT_USED_FOR_ROLE_DECISION",
  !migration.includes("v_source.node_role_code =") &&
    !migration.includes("v_target.node_role_code ="),
);
check(
  "DB_GUARD_FACET_GUARD_REMAINS",
  migration.includes("SYSTEM_RELATION_FACET_GUARD_REJECTED"),
);
check(
  "DB_GUARD_NODE_ROLE_GUARD_REMAINS",
  migration.includes("SYSTEM_RELATION_NODE_ROLE_GUARD_REJECTED"),
);
check(
  "NO_FORMULA_WRITE_ADDED",
  !consequenceApi.includes("formulaConfigured: true") &&
    !relationApi.includes("formulaConfigured: true"),
);

console.log(`PASS ${checks.length}/30`);
