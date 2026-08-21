import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function check(name, ok, detail = '') {
  checks.push({ name, ok: Boolean(ok), detail });
}

function has(rel, ...needles) {
  const text = read(rel);
  return needles.every((needle) => text.includes(needle));
}

function lacks(rel, ...needles) {
  const text = read(rel);
  return needles.every((needle) => !text.includes(needle));
}

const route = 'src/app/api/value-objects/route.ts';
const rootPage = 'src/app/value-objects/new/root/page.tsx';
const intermediateForm = 'src/app/value-objects/[id]/new-intermediate/intermediate-create-form.tsx';
const leafForm = 'src/app/value-objects/[id]/new-leaf/leaf-create-form.tsx';
const leafPage = 'src/app/value-objects/[id]/new-leaf/page.tsx';
const detail = 'src/app/value-objects/[id]/page.tsx';
const list = 'src/components/workspace/value-objects/actual-value-objects-list.tsx';
const sql = 'supabase/manual-applied/20260821_vo_branch_driven_leaf_authoring_v1.sql';
const postcheck = 'supabase/diagnostics/20260821_vo_branch_driven_leaf_authoring_v1_postcheck_READONLY.sql';
const rollback = 'supabase/rollbacks/20260821_vo_branch_driven_leaf_authoring_v1_ROLLBACK.sql';
const currentState = 'docs/recovery/ARCTOR_CURRENT_STATE_RU.md';
const decisions = 'docs/recovery/ARCTOR_DECISIONS_AND_FAILURES_RU.md';
const evidence = 'docs/recovery/evidence/HELP_FILES/ARCTOR_VO_BRANCH_DRIVEN_LEAF_AUTHORING_V1_EVIDENCE.json';

check('01_leaf_ui_branch_mode', has(leafForm, 'creationMode: "leaf_branch_active_v4"'));
check('02_leaf_ui_no_kind_picker', lacks(leafForm, 'ManualLeafKind', 'FACET_BY_KIND', 'symptomHelp', 'activityHelp', 'setKind('));
check('03_leaf_ui_no_technical_facet', lacks(leafForm, 'facetCode', 'PROCESS / activity_pattern', 'STATE / symptom_state'));
check('04_leaf_ui_branch_copy', has(leafForm, 'Its meaning comes from the branch where it is placed', 'Его смысл определяется веткой'));
check('05_leaf_page_intermediate_only', has(leafPage, 'role === "intermediate"', 'ontologyNodeRoleCode: "intermediate"'));
check('06_leaf_page_no_root_allow', lacks(leafPage, 'role === "root" || role === "intermediate"'));
check('07_root_new_active_mode', has(rootPage, 'creationMode: "root_branch_active_v4"', '[copy.fixedStatus, "active"]'));
check('08_intermediate_new_active_mode', has(intermediateForm, 'creationMode: "intermediate_branch_active_v4"', 'copy.activeNotice'));
check('09_intermediate_ui_no_kind_selector', lacks(intermediateForm, '<select', 'VALUE_OBJECT_STRUCTURAL_KINDS_V2', 'setObjectKind'));
check('10_route_active_modes', has(route, 'root_branch_active_v4', 'intermediate_branch_active_v4', 'leaf_branch_active_v4'));
check('11_route_activation_rpc', has(route, 'set_value_object_ontology_lifecycle_v1', 'p_new_status: "active"', 'activateImmediately'));
check('12_route_part_of_new_intermediate', has(route, 'hierarchyRelationCode: branchActiveRequested ? "part_of" : "is_a"'));
check('13_route_leaf_requires_intermediate', has(route, 'VO_AUTHORING_LEAF_REQUIRES_INTERMEDIATE_BRANCH'));
check('14_route_leaf_generic_from_parent', has(route, 'genericOntologyKindForFacet(parent.facetCode)', 'VO_AUTHORING_LEAF_PARENT_FACET_UNSUPPORTED'));
check('15_route_legacy_leaf_preserved', has(route, 'leaf_draft_v3', 'mapLeafKindToOntology', 'symptom_state'));
check('16_route_commercial_preserved', has(route, 'usageScope === "commercial"', 'createLegacyCommercialValueObject'));
check('17_detail_leaf_link_intermediate_gate', has(detail, '{isIntermediate ? (', '/new-leaf'));
check('18_detail_no_entity_location_side_effect', lacks(detail, 'valueObject.facet_code === "ENTITY"'));
check('19_private_detail_role_label', has(detail, 'isGlobalSystemObject || isProductOrService', 'copy.intermediateEyebrow', 'copy.leafEyebrow'));
check('20_private_list_hides_technical_codes', has(list, 'const showTechnicalCodes =', 'valueObject.scope_code === "global"', 'valueObject.usage_scope === "commercial"'));
check('21_list_search_no_facet_kind_en', has(list, 'Search by name, description or path'));
check('22_sql_narrow_private_scope', has(sql, "vo.scope_code = 'actor'", "vo.usage_scope = 'private'", "vo.origin_type_code = 'user_declared'", "vo.branch_type_code = 'ontology_v1'"));
check('23_sql_activates_and_part_of', has(sql, "status = 'active'", "else 'part_of'"));
check('24_sql_marks_rollback_metadata', has(sql, 'branch_driven_authoring_v1', 'previousStatus', 'previousHierarchyRelationCode'));
check('25_sql_no_commercial_update', lacks(sql, "usage_scope = 'commercial'", "scope_code = 'global'"));
check('26_postcheck_readonly', has(postcheck, "'allPass'", "remainingPrivateOntologyDrafts", "normalizedNonRootNotPartOf") && lacks(postcheck, ' update ', ' delete ', ' insert '));
check('27_rollback_marker_scoped', has(rollback, 'ARCTOR_VO_BRANCH_DRIVEN_LEAF_AUTHORING_V1', "- 'branch_driven_authoring_v1'"));
check('28_recovery_current_updated', has(currentState, 'ARCTOR_VO_BRANCH_DRIVEN_LEAF_AUTHORING_V1', '«Симптом» не является отдельным видом объекта наблюдения'));
check('29_recovery_decision_overrides_symptom_kind', has(decisions, 'branch-driven observation leaf semantics', 'Отменено решение V1D'));
check('30_evidence_locked', has(evidence, 'ARCTOR_VO_BRANCH_DRIVEN_LEAF_AUTHORING_V1', 'production_supabase_used_for_analysis', 'symptom is an ordinary observation object'));
check('31_no_eval_new_files', [route, rootPage, intermediateForm, leafForm, leafPage, detail, list].every((rel) => lacks(rel, 'eval(', 'new Function(')));
check('32_list_native_img_lint_guard', has(list, 'eslint-disable-next-line @next/next/no-img-element', 'native img avoids coupling authoring to the Next image host allowlist'));

for (const row of checks) {
  console.log(`${row.ok ? 'PASS' : 'FAIL'} ${row.name}${row.detail ? ` :: ${row.detail}` : ''}`);
}

const failed = checks.filter((row) => !row.ok);
console.log(`SUMMARY total=${checks.length} passed=${checks.length - failed.length} failed=${failed.length}`);
process.exit(failed.length ? 1 : 0);
