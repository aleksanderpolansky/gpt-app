#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import os from 'node:os';

const ANCHOR_VALUE_OBJECT_ID = '13d59cef-e45f-49c2-8557-7732b74e2de3';
const MAX_DELETE_COUNT = 50;
const MODES = new Set(['--preflight', '--apply', '--postcheck', '--self-test']);

function fail(message) {
  throw new Error(message);
}

function parseEnvFile(filePath) {
  const result = {};
  if (!fs.existsSync(filePath)) return result;
  const text = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    let value = match[2].trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    result[match[1]] = value;
  }
  return result;
}

function loadRuntimeEnv(repoRoot, runtimeEnv = process.env) {
  const envFileNames = [
    '.env.local',
    '.env.development.local',
    '.env.production.local',
    '.env',
    '.env.development',
    '.env.production',
  ];
  const fileSources = envFileNames
    .map((name) => ({ name, values: parseEnvFile(path.join(repoRoot, name)) }))
    .filter((source) => Object.keys(source.values).length > 0);

  function pick(names) {
    for (const name of names) {
      const value = runtimeEnv[name];
      if (typeof value === 'string' && value.trim()) {
        return { value: value.trim(), source: `process.env:${name}` };
      }
    }
    for (const source of fileSources) {
      for (const name of names) {
        const value = source.values[name];
        if (typeof value === 'string' && value.trim()) {
          return { value: value.trim(), source: `${source.name}:${name}` };
        }
      }
    }
    return { value: '', source: 'missing' };
  }

  const url = pick([
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_PROJECT_URL',
    'PUBLIC_SUPABASE_URL',
  ]);
  const serviceKey = pick([
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_SECRET_KEY',
    'SUPABASE_SERVICE_KEY',
    'SUPABASE_ADMIN_KEY',
  ]);

  return {
    url: url.value,
    serviceKey: serviceKey.value,
    urlSource: url.source,
    serviceKeySource: serviceKey.source,
    envFilesPresent: fileSources.map((source) => source.name),
  };
}

function isCandidateRow(row, ownerUserId, ownerActorId) {
  if (!row || row.owner_user_id !== ownerUserId || row.owner_actor_id !== ownerActorId) {
    return false;
  }
  if (row.organization_id !== null || row.usage_scope !== 'private') return false;
  if (row.scope_code === 'global' || row.origin_type_code === 'system_model') return false;
  if (row.source !== 'manual') return false;
  return (
    row.canonical_key === null ||
    row.facet_code === null ||
    row.object_kind_code === null ||
    row.ontology_node_role_code === null ||
    row.definition_version === null ||
    row.root_value_object_id === null
  );
}

async function createDb(url, serviceKey) {
  if (!url || !serviceKey) fail('VO_CLEANUP_SUPABASE_ENV_MISSING');
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { 'X-ARCTor-Operation': 'VO_AUTHORING_LEGACY_PRIVATE_TEST_CLEANUP_V1' } },
  });
}

async function expectRows(queryPromise, label) {
  const { data, error } = await queryPromise;
  if (error) fail(`VO_CLEANUP_REFERENCE_READ_FAILED:${label}:${error.code || 'NO_CODE'}:${error.message}`);
  return data || [];
}

async function findCandidates(db) {
  const { data: anchor, error: anchorError } = await db
    .from('value_objects')
    .select('id,owner_user_id,owner_actor_id,organization_id,usage_scope,scope_code,origin_type_code,source')
    .eq('id', ANCHOR_VALUE_OBJECT_ID)
    .maybeSingle();

  if (anchorError) fail(`VO_CLEANUP_ANCHOR_READ_FAILED:${anchorError.code || 'NO_CODE'}:${anchorError.message}`);
  if (!anchor) fail('VO_CLEANUP_ANCHOR_NOT_FOUND');
  if (!anchor.owner_user_id || !anchor.owner_actor_id) fail('VO_CLEANUP_ANCHOR_OWNER_MISSING');
  if (anchor.organization_id !== null || anchor.usage_scope !== 'private') {
    fail('VO_CLEANUP_ANCHOR_NOT_PRIVATE_PERSONAL');
  }
  if (anchor.scope_code === 'global' || anchor.origin_type_code === 'system_model') {
    fail('VO_CLEANUP_ANCHOR_GLOBAL_FORBIDDEN');
  }

  const { data, error } = await db
    .from('value_objects')
    .select([
      'id','owner_user_id','owner_actor_id','organization_id','usage_scope','scope_code',
      'origin_type_code','source','canonical_key','facet_code','object_kind_code',
      'ontology_node_role_code','definition_version','root_value_object_id'
    ].join(','))
    .eq('owner_user_id', anchor.owner_user_id)
    .eq('owner_actor_id', anchor.owner_actor_id)
    .is('organization_id', null)
    .eq('usage_scope', 'private')
    .order('created_at', { ascending: true });

  if (error) fail(`VO_CLEANUP_CANDIDATE_READ_FAILED:${error.code || 'NO_CODE'}:${error.message}`);
  const candidates = (data || []).filter((row) =>
    isCandidateRow(row, anchor.owner_user_id, anchor.owner_actor_id),
  );
  if (!candidates.some((row) => row.id === ANCHOR_VALUE_OBJECT_ID)) {
    fail('VO_CLEANUP_ANCHOR_NOT_IN_LEGACY_CANDIDATE_SET');
  }
  if (candidates.length < 1 || candidates.length > MAX_DELETE_COUNT) {
    fail(`VO_CLEANUP_CANDIDATE_COUNT_OUT_OF_BOUNDS:${candidates.length}`);
  }
  return { anchor, candidates };
}

async function assertNoExternalReferences(db, candidateIds) {
  const idSet = new Set(candidateIds);

  const hierarchyRows = await expectRows(
    db.from('value_objects')
      .select('id,parent_value_object_id,root_value_object_id,instance_of_value_object_id')
      .or([
        `parent_value_object_id.in.(${candidateIds.join(',')})`,
        `root_value_object_id.in.(${candidateIds.join(',')})`,
        `instance_of_value_object_id.in.(${candidateIds.join(',')})`,
      ].join(',')),
    'value_objects_hierarchy',
  );
  const externalHierarchy = hierarchyRows.filter((row) => !idSet.has(row.id));
  if (externalHierarchy.length > 0) {
    fail(`VO_CLEANUP_EXTERNAL_HIERARCHY_REFERENCES:${externalHierarchy.length}`);
  }

  const checks = [
    ['activity_value_object_links', 'value_object_id'],
    ['activity_object_facts', 'value_object_id'],
    ['value_object_parameter_assignments', 'value_object_id'],
    ['fact_capture_precision_preferences', 'value_object_id'],
    ['value_object_target_standards', 'value_object_id'],
    ['value_object_relations', 'source_value_object_id'],
    ['value_object_relations', 'target_value_object_id'],
  ];

  for (const [table, column] of checks) {
    const rows = await expectRows(
      db.from(table).select('id').in(column, candidateIds).limit(1),
      `${table}.${column}`,
    );
    if (rows.length > 0) fail(`VO_CLEANUP_EXTERNAL_REFERENCE_FOUND:${table}.${column}`);
  }
}

async function assertMetadataIsDisposable(db, candidateIds) {
  // Definition rows and aliases are intrinsic metadata of the test object, not external reality links.
  // They may be removed explicitly before the object itself.
  const definitions = await expectRows(
    db.from('value_object_definition_versions').select('id,value_object_id').in('value_object_id', candidateIds),
    'value_object_definition_versions.value_object_id',
  );
  const aliases = await expectRows(
    db.from('concept_aliases')
      .select('id,concept_id')
      .eq('concept_type', 'value_object')
      .in('concept_id', candidateIds),
    'concept_aliases.concept_id',
  );
  if (definitions.length > 0 || aliases.length > 0) {
    fail(`VO_CLEANUP_INTRINSIC_METADATA_PRESENT:definitions=${definitions.length}:aliases=${aliases.length}`);
  }
  return { definitionCount: 0, aliasCount: 0 };
}

async function preflight(db) {
  const { anchor, candidates } = await findCandidates(db);
  const ids = candidates.map((row) => row.id);
  await assertNoExternalReferences(db, ids);
  const metadata = await assertMetadataIsDisposable(db, ids);
  return { anchor, candidates, ids, metadata };
}

async function applyCleanup(db) {
  const state = await preflight(db); // always re-check immediately before delete
  const { data, error } = await db
    .from('value_objects')
    .delete()
    .eq('owner_user_id', state.anchor.owner_user_id)
    .eq('owner_actor_id', state.anchor.owner_actor_id)
    .is('organization_id', null)
    .eq('usage_scope', 'private')
    .in('id', state.ids)
    .select('id');

  if (error) fail(`VO_CLEANUP_VALUE_OBJECT_DELETE_FAILED:${error.code || 'NO_CODE'}:${error.message}`);
  const deleted = data || [];
  if (deleted.length !== state.ids.length) {
    fail(`VO_CLEANUP_DELETE_COUNT_MISMATCH:expected=${state.ids.length}:actual=${deleted.length}`);
  }

  return { ...state, valueObjectsDeleted: deleted.length };
}

async function postcheck(db) {
  const { data, error } = await db.from('value_objects')
    .select('id')
    .eq('id', ANCHOR_VALUE_OBJECT_ID)
    .maybeSingle();
  if (error) fail(`VO_CLEANUP_POSTCHECK_READ_FAILED:${error.code || 'NO_CODE'}:${error.message}`);
  if (data) fail('VO_CLEANUP_POSTCHECK_ANCHOR_STILL_EXISTS');
  return true;
}

function selfTest() {
  const ownerUser = 'u';
  const ownerActor = 'a';
  const base = {
    id: 'x', owner_user_id: ownerUser, owner_actor_id: ownerActor,
    organization_id: null, usage_scope: 'private', scope_code: null,
    origin_type_code: null, source: 'manual', canonical_key: null,
    facet_code: null, object_kind_code: null, ontology_node_role_code: null,
    definition_version: null, root_value_object_id: null,
  };
  if (!isCandidateRow(base, ownerUser, ownerActor)) fail('SELFTEST_LEGACY_CANDIDATE_FALSE');
  if (isCandidateRow({ ...base, scope_code: 'global' }, ownerUser, ownerActor)) fail('SELFTEST_GLOBAL_INCLUDED');
  if (isCandidateRow({ ...base, organization_id: 'org' }, ownerUser, ownerActor)) fail('SELFTEST_ORG_INCLUDED');
  if (isCandidateRow({ ...base, usage_scope: 'commercial' }, ownerUser, ownerActor)) fail('SELFTEST_COMMERCIAL_INCLUDED');
  if (isCandidateRow({ ...base, source: 'import' }, ownerUser, ownerActor)) fail('SELFTEST_IMPORT_INCLUDED');
  if (isCandidateRow({ ...base, owner_actor_id: 'other' }, ownerUser, ownerActor)) fail('SELFTEST_OTHER_ACTOR_INCLUDED');

  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'arctor-vo-cleanup-env-selftest-'));
  try {
    fs.writeFileSync(
      path.join(temp, '.env.local'),
      'SUPABASE_URL=https://example.invalid\nSUPABASE_SECRET_KEY=dummy-secret-for-selftest\n',
      'utf8',
    );
    const resolved = loadRuntimeEnv(temp, {});
    if (resolved.url !== 'https://example.invalid') fail('SELFTEST_ENV_URL_ALIAS');
    if (resolved.serviceKey !== 'dummy-secret-for-selftest') fail('SELFTEST_ENV_SECRET_ALIAS');
    if (resolved.urlSource !== '.env.local:SUPABASE_URL') fail('SELFTEST_ENV_URL_SOURCE');
    if (resolved.serviceKeySource !== '.env.local:SUPABASE_SECRET_KEY') fail('SELFTEST_ENV_SECRET_SOURCE');
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }

  console.log('SELFTEST=PASS');
}

async function main() {
  const mode = process.argv[2] || '';
  if (!MODES.has(mode)) fail('USAGE: --preflight | --apply | --postcheck | --self-test');
  if (mode === '--self-test') return selfTest();

  const repoRoot = process.cwd();
  const env = loadRuntimeEnv(repoRoot);
  if (!env.url || !env.serviceKey) {
    console.error(
      `VO_CLEANUP_ENV_DISCOVERY urlSource=${env.urlSource} serviceKeySource=${env.serviceKeySource} envFiles=${env.envFilesPresent.join(',') || 'none'}`,
    );
  } else {
    console.log(
      `VO_CLEANUP_ENV_DISCOVERY=PASS urlSource=${env.urlSource} serviceKeySource=${env.serviceKeySource}`,
    );
  }
  const db = await createDb(env.url, env.serviceKey);

  if (mode === '--preflight') {
    const state = await preflight(db);
    console.log(`VO_CLEANUP_PREFLIGHT=PASS candidates=${state.ids.length} intrinsic_definitions=${state.metadata.definitionCount} intrinsic_aliases=${state.metadata.aliasCount}`);
    return;
  }
  if (mode === '--apply') {
    const result = await applyCleanup(db);
    console.log(`VO_CLEANUP_APPLY=PASS value_objects_deleted=${result.valueObjectsDeleted}`);
    return;
  }
  await postcheck(db);
  console.log('VO_CLEANUP_POSTCHECK=PASS');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
