import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const migrationRel = "supabase/manual-applied/20260813_ai_a2_p1_recognition_foundation_v1.sql";
const migration = path.join(root, ...migrationRel.split('/'));
const expectedHash = "ab9c851d3be1f7a1763c535afe585d41ddcc721e5a23eabaefb2aa8d8a732a2d";
const required = [
  'create table public.value_object_recognition_profiles',
  'create function public.get_global_value_object_recognition_profile_v1(',
  'create function public.get_global_value_object_recognition_candidates_v1(',
  'AI_A2_P1_ACCEPT_STOKROTKA_REGRESSION_FAILED',
  "'process.finance.purchase'",
  "'process.home.household_task'",
  'commit;'
];

function fail(msg) {
  console.error(JSON.stringify({validator:'AI_A2_P1',passed:false,error:msg}, null, 2));
  process.exit(1);
}

function normalizeText(value) {
  return String(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

if (!fs.existsSync(migration)) fail('migration missing');

const sql = normalizeText(fs.readFileSync(migration, 'utf8'));
const hash = crypto.createHash('sha256').update(Buffer.from(sql, 'utf8')).digest('hex');

if (hash !== expectedHash) fail('migration normalized sha256 mismatch: ' + hash);
for (const token of required) if (!sql.includes(token)) fail('migration token missing: ' + token);

const current = fs.readFileSync(path.join(root,'docs/recovery/ARCTOR_CURRENT_STATE_RU.md'),'utf8');
const decisions = fs.readFileSync(path.join(root,'docs/recovery/ARCTOR_DECISIONS_AND_FAILURES_RU.md'),'utf8');
const restore = fs.readFileSync(path.join(root,'docs/recovery/ARCTOR_RESTORE_FROM_ZERO_RU.md'),'utf8');

if (!current.includes('AI_A2_P1_RECOGNITION_FOUNDATION_V1')) fail('current-state marker missing');
if (!decisions.includes('DECISION_AI_A2_RECOGNITION_PROFILES_V1')) fail('decision marker missing');
if (!decisions.includes('AI_A1_RELEASE_FAILURE_CHAIN_20260813')) fail('AI-A1 failure-chain marker missing');
if (!restore.includes('AI-A2 P1 restore point - 2026-08-13')) fail('restore marker missing');

const manifest = JSON.parse(fs.readFileSync(path.join(root,'docs/recovery/CHECKPOINT_MANIFEST.json'),'utf8'));

if (
  manifest.documentedState !== 'AI_A2_P1_RECOGNITION_FOUNDATION_V1' &&
  manifest.documentedState !== 'AI_A2_P2_RUNTIME_INTEGRATION_V1' &&
  manifest.documentedState !== 'AI_A2_P3_SEMANTIC_PROJECTION_PREVIEW_V1'
) fail('manifest documentedState mismatch');

if (!manifest.gsr1lImplementation || manifest.gsr1lImplementation.liveAcceptance !== '14/14 PASS') {
  fail('manifest AI-A2 acceptance missing');
}

if (!Array.isArray(manifest.manualAppliedSql) || !manifest.manualAppliedSql.includes(migrationRel)) {
  fail('manualAppliedSql missing AI-A2 migration');
}

const a1 = fs.readFileSync(path.join(root, ..."docs/recovery/evidence/AI_A1/ARCTOR_AI_A1_RUNTIME_POSTCHECK_20260813.txt".split('/')),'utf8');
const a2 = fs.readFileSync(path.join(root, ..."docs/recovery/evidence/GSR1L/ARCTOR_GSR1L_AI_A2_P1_RECOGNITION_LIVE_ACCEPTANCE_20260813.txt".split('/')),'utf8');

if (!a1.includes('RESULT=6/6 PASS')) fail('AI-A1 runtime evidence missing PASS');
if (!a2.includes('RESULT=14/14 PASS')) fail('AI-A2 live evidence missing PASS');

console.log(JSON.stringify({
  validator:'AI_A2_P1',
  passed:true,
  migrationNormalizedSha256:hash,
  lineEndingInvariant:true,
  documentedState:manifest.documentedState,
  runtimeIntegrated:manifest.gsr1lImplementation.runtimeIntegrated === true
}, null, 2));
