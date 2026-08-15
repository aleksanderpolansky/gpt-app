#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const MARKER = 'VALUE_OBJECT_AUTHORING_ONTOLOGY_BRIDGE_HOTFIX_V1';
let failed = false;
function pass(label) { console.log(`PASS ${label}`); }
function fail(label) { failed = true; console.error(`FAIL ${label}`); }
function check(condition, label) {
  if (condition) {
    pass(label);
  } else {
    fail(label);
  }
}
function section(text, start, end) {
  const a = text.indexOf(start);
  const b = text.indexOf(end, a + start.length);
  if (a < 0 || b < 0 || b <= a) throw new Error(`SECTION_NOT_FOUND:${start}->${end}`);
  return text.slice(a, b);
}
function count(text, needle) { return needle ? text.split(needle).length - 1 : 0; }

function selfTest() {
  const sample = 'aa START body END zz';
  check(section(sample, 'START', 'END').includes('body'), 'SELFTEST_SECTION');
  check(count('abab', 'ab') === 2, 'SELFTEST_COUNT');
  if (failed) process.exit(1);
  console.log('SELFTEST=PASS');
}

if (process.argv.includes('--self-test')) {
  selfTest();
  process.exit(0);
}

const repo = process.cwd();
const routePath = path.join(repo, 'src/app/api/value-objects/route.ts');
const rootPagePath = path.join(repo, 'src/app/value-objects/new/root/page.tsx');
const cleanupPath = path.join(repo, 'scripts/vo-authoring-legacy-private-test-cleanup-v1.mjs');
for (const file of [routePath, rootPagePath, cleanupPath]) {
  check(fs.existsSync(file), `FILE_EXISTS:${path.relative(repo, file)}`);
}
if (failed) process.exit(1);

const route = fs.readFileSync(routePath, 'utf8');
const rootPage = fs.readFileSync(rootPagePath, 'utf8');
const cleanup = fs.readFileSync(cleanupPath, 'utf8');
const authoring = section(route, 'async function createRootDraftValueObject(', 'async function createDraftValueObject(');
const rootSection = section(route, 'async function createRootDraftValueObject(', 'async function getOwnedStructuralParent(');
const parentSection = section(route, 'async function getOwnedStructuralParent(', 'async function createIntermediateDraftValueObject(');
const intermediateSection = section(route, 'async function createIntermediateDraftValueObject(', 'async function createLeafDraftValueObject(');
const leafSection = section(route, 'async function createLeafDraftValueObject(', 'async function createDraftValueObject(');

check(route.includes('from "node:crypto"'), 'ROUTE_NODE_CRYPTO_IMPORT');
check(route.includes('idempotencyKey?: unknown;'), 'REQUEST_CONTRACT_IDEMPOTENCY_KEY');
check(route.includes('supabase.rpc("create_value_object_ontology_v1"'), 'P1C_CREATE_RPC_USED');
check(!authoring.includes('.from("value_objects")\n    .insert('), 'NO_DIRECT_VO_INSERT_ROOT_INTERMEDIATE_LEAF');
check(rootSection.includes('facetCode: "DOMAIN"'), 'ROOT_DOMAIN');
check(rootSection.includes('objectKindCode: "domain_root"'), 'ROOT_DOMAIN_ROOT_KIND');
check(rootSection.includes('nodeRoleCode: "root"'), 'ROOT_ROLE_ROOT');
check(rootSection.includes('visibilityCode: "private"') && rootSection.includes('privacyClassCode: "standard"'), 'ROOT_PRIVATE_STANDARD_DEFAULTS');
check(parentSection.includes('parentData.scope_code === "actor"'), 'PARENT_ACTOR_SCOPE_ONLY');
check(parentSection.includes('parentData.canonical_key') && parentSection.includes('parentData.ontology_node_role_code'), 'PARENT_ONTOLOGY_READY_REQUIRED');
check(intermediateSection.includes('nodeRoleCode: "intermediate"') && intermediateSection.includes('hierarchyRelationCode: "is_a"'), 'INTERMEDIATE_ONTOLOGY_PAYLOAD');
check(leafSection.includes('nodeRoleCode: "leaf"') && leafSection.includes('hierarchyRelationCode: "is_a"'), 'LEAF_ONTOLOGY_PAYLOAD');
check(leafSection.includes('VO_AUTHORING_LEAF_PARENT_FACET_MISMATCH'), 'LEAF_FACET_GUARD');
check(route.includes('return { facetCode: "PROCESS", objectKindCode: "activity_pattern" };'), 'ACTIVITY_PATTERN_PROCESS_MAPPING');
check(!route.includes('DELETE FROM public.value_objects'), 'NO_RAW_SQL_DELETE_IN_ROUTE');

check(!rootPage.includes('VALUE_OBJECT_STRUCTURAL_KINDS_V2'), 'ROOT_UI_NO_LEGACY_KIND_PICKER');
check(!rootPage.includes('/api/value-objects/branch-policies'), 'ROOT_UI_NO_LEGACY_BRANCH_POLICY');
check(rootPage.includes('[copy.fixedRole, "root"]'), 'ROOT_UI_ROLE_ROOT');
check(rootPage.includes('[copy.fixedFacet, "DOMAIN"]'), 'ROOT_UI_FACET_DOMAIN');
check(rootPage.includes('[copy.fixedKind, "domain_root"]'), 'ROOT_UI_KIND_DOMAIN_ROOT');
check(rootPage.includes('descriptionRequired'), 'ROOT_UI_REQUIRES_DESCRIPTION');
check(rootPage.includes('idempotencyKey: newIdempotencyKey()'), 'ROOT_UI_IDEMPOTENCY');
check(!rootPage.includes('cleanupLegacyPrivateTestObjects'), 'ROOT_UI_NO_DELETE_SIDE_EFFECT');

check(cleanup.includes("const ANCHOR_VALUE_OBJECT_ID = '13d59cef-e45f-49c2-8557-7732b74e2de3'"), 'CLEANUP_ANCHORED_TO_USER_TEST_OBJECT');
check(cleanup.includes('const MAX_DELETE_COUNT = 50'), 'CLEANUP_BOUNDED');
check(cleanup.includes("row.organization_id !== null || row.usage_scope !== 'private'"), 'CLEANUP_PRIVATE_PERSONAL_ONLY');
check(cleanup.includes("row.scope_code === 'global' || row.origin_type_code === 'system_model'"), 'CLEANUP_GLOBAL_SYSTEM_EXCLUDED');
check(cleanup.includes("row.source !== 'manual'"), 'CLEANUP_MANUAL_ONLY');
check(cleanup.includes("--preflight") && cleanup.includes("--apply") && cleanup.includes("--postcheck"), 'CLEANUP_EXPLICIT_MODES');
check(cleanup.includes('await preflight(db); // always re-check immediately before delete'), 'CLEANUP_RECHECKS_BEFORE_DELETE');
check(cleanup.includes("['activity_value_object_links', 'value_object_id']") && cleanup.includes("['activity_object_facts', 'value_object_id']"), 'CLEANUP_ACTIVITY_REFERENCE_GUARDS');
check(cleanup.includes("['value_object_relations', 'source_value_object_id']") && cleanup.includes("['value_object_relations', 'target_value_object_id']"), 'CLEANUP_RELATION_REFERENCE_GUARDS');
check(cleanup.includes("['value_object_parameter_assignments', 'value_object_id']"), 'CLEANUP_PARAMETER_REFERENCE_GUARD');
check(cleanup.includes('VO_CLEANUP_EXTERNAL_HIERARCHY_REFERENCES'), 'CLEANUP_HIERARCHY_REFERENCE_GUARD');
check(cleanup.includes("'SUPABASE_SECRET_KEY'") && cleanup.includes("'SUPABASE_SERVICE_ROLE_KEY'"), 'CLEANUP_MODERN_SECRET_ENV_ALIASES');
check(cleanup.includes("'.env.local'") && cleanup.includes("'.env'"), 'CLEANUP_MULTI_ENV_FILE_DISCOVERY');
check(cleanup.includes('VO_CLEANUP_ENV_DISCOVERY'), 'CLEANUP_ENV_DIAGNOSTIC_NO_VALUE');
check(!cleanup.includes('SUPABASE_SERVICE_ROLE_KEY=') && !cleanup.includes('eyJ') && !cleanup.includes('sb_secret_'), 'CLEANUP_NO_EMBEDDED_SECRET');

if (failed) {
  console.error(`${MARKER}=FAIL`);
  process.exit(1);
}
console.log(`${MARKER}=PASS`);
