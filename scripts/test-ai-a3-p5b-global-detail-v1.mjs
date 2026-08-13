#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repo = process.cwd();
const page = path.join(repo, 'src/app/value-objects/[id]/page.tsx');
const source = fs.readFileSync(page, 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(`AI_A3_P5B_GLOBAL_DETAIL_TEST_FAILED: ${message}`);
}

const checks = [];
function check(name, condition) {
  assert(condition, name);
  checks.push(name);
}

check('global scope columns selected', source.includes('scope_code') && source.includes('origin_type_code'));
check('global system gate present', source.includes('valueObject.scope_code === "global"') && source.includes('valueObject.origin_type_code === "system_model"'));
check('non-global ownership gate preserved', source.includes('!isGlobalSystemObject && !isOwnedByActiveActor'));
check('primary query no longer hard-filters current owner before global check', !/\.eq\("id", id\)\s*\.eq\("owner_user_id"/.test(source));
check('global tree is scoped to global catalog', source.includes('treeQueryBase.eq("scope_code", "global")'));
check('global leaf uses ontology role', source.includes('valueObject.ontology_node_role_code === "leaf"'));
check('global root uses ontology role', source.includes('valueObject.ontology_node_role_code === "root"'));
check('global intermediate uses ontology role', source.includes('valueObject.ontology_node_role_code === "intermediate"'));
check('global objects cannot edit', /const canEdit\s*=\s*!isGlobalSystemObject/.test(source));
check('global restructure hidden', source.includes('{!isGlobalSystemObject ? (') && source.includes('/restructure'));
check('P5B mutual history remains leaf-only', /\{isLeaf \? \(\s*<ActivityMutualLinksPanel/.test(source));
check('global owner presentation avoids actor lookup requirement', source.includes('displayName: "ARCTor Global System"'));

const regression = spawnSync(process.execPath, ['scripts/test-ai-a3-p5b-mutual-links-v1.mjs'], {
  cwd: repo,
  encoding: 'utf8',
  env: process.env,
});
if (regression.stdout) process.stdout.write(regression.stdout);
if (regression.stderr) process.stderr.write(regression.stderr);
assert(regression.status === 0, `prior P5B regression failed with exit ${regression.status}`);
checks.push('prior P5B regression');

console.log(`AI_A3_P5B_GLOBAL_DETAIL_TEST_PASS ${checks.length}/${checks.length}`);
