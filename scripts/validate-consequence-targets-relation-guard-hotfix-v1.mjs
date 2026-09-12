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

const relationApi = read("src/app/api/admin/relation-constructor/route.ts");
const consequenceApi = read("src/app/api/admin/consequence-constructor/route.ts");
const consequencePage = read("src/app/admin/consequence-constructor/page.tsx");

check("RELATION_NODE_ROLE_HARD_GUARD_REMOVED", !relationApi.includes("RELATION_CONSTRUCTOR_NODE_ROLE_GUARD_REJECTED"));
check("RELATION_FACET_HARD_GUARD_REMOVED", !relationApi.includes("RELATION_CONSTRUCTOR_FACET_GUARD_REJECTED"));
check("RELATION_COMPATIBILITY_AUDITED", relationApi.includes("registryCompatibility") && relationApi.includes("curator_manual_advisory_only"));
check("RELATION_WRITE_POLICY_STILL_CLOSED", relationApi.includes('canonical_write_policy_code", "enabled"'));
check("RELATION_SELF_LINK_STILL_BLOCKED", relationApi.includes("RELATION_CONSTRUCTOR_SELF_LINK_FORBIDDEN"));

check("TARGET_SELECTION_ENABLED", consequenceApi.includes("targetSelectionEnabled: true"));
check("TARGETS_FROM_CANONICAL_RELATIONS", consequenceApi.includes('.from("system_value_object_relations")'));
check("TARGETS_LEAF_ONLY", consequenceApi.includes('.eq("node_role_code", "leaf")'));
check("TARGETS_ACTIVE_ONLY", consequenceApi.includes('.eq("status", "active")'));
check("TARGETS_EITHER_DIRECTION", consequenceApi.includes("either_direction_for_candidate_discovery"));
check("TARGET_REQUIRES_TYPICAL_ACTIVITY", consequenceApi.includes("CONSEQUENCE_TEMPLATE_REQUIRED_BEFORE_TARGET"));
check("TARGET_SELECTION_EVENT", consequenceApi.includes("consequence_constructor_target_selected"));
check("TARGET_SELECTION_CONTEXTUAL", consequenceApi.includes('contextualPairPolicy: "activity_specific_only"'));
check("TARGET_SELECTION_RECORDS_RELATION_EVIDENCE", consequenceApi.includes("relationIds: candidate.relationIds") && consequenceApi.includes("relationTypeCodes: candidate.relationTypeCodes"));
check("TARGET_SELECTION_FORMULA_FALSE", consequenceApi.includes("formulaConfigured: false"));

check("TARGET_SEARCH_COMBOBOX", consequencePage.includes("<ObservationObjectCombobox"));
check("TARGET_SEARCH_RELATED_CANDIDATES", consequencePage.includes("task.targetCandidates"));
check("TARGET_MULTIPLE_SELECTIONS_SUPPORTED", consequencePage.includes("addAnother") && consequencePage.includes("selectedTargets"));
check("OLD_TARGET_LOCK_REMOVED", !consequencePage.includes("targetLocked") && !consequencePage.includes("locked_pending_relations"));
check("NO_DISABLED_STATIC_TARGET_SELECT", !consequencePage.includes("Станет доступно после настройки связей ОН"));
check("TARGET_SEARCH_NEEDS_TEMPLATE", consequencePage.includes("targetCopy.needTemplate"));
check("NO_FORMULA_UI", !consequencePage.includes("formula"));
check("NO_SQL_SCHEMA_CHANGE", !fs.existsSync("supabase/migrations/20260912140000_consequence_targets_relation_guard_hotfix_v1.sql"));

console.log(`PASS ${checks.length}/23`);
