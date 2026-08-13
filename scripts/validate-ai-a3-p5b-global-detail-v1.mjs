#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';

const repo = process.cwd();
const page = path.join(repo, 'src/app/value-objects/[id]/page.tsx');
const source = fs.readFileSync(page, 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(`AI_A3_P5B_GLOBAL_DETAIL_VALIDATOR_FAILED: ${message}`);
}

const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  },
  reportDiagnostics: true,
  fileName: page,
});
const syntaxErrors = (transpiled.diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error);
assert(syntaxErrors.length === 0, syntaxErrors.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join(' | '));

const required = [
  'owner_user_id: string | null;',
  'owner_actor_id: string | null;',
  'scope_code: string | null;',
  'origin_type_code: string | null;',
  'const isGlobalSystemObject =',
  'const isOwnedByActiveActor =',
  'treeQueryBase.eq("scope_code", "global")',
  'valueObject.ontology_node_role_code === "leaf"',
  '!isGlobalSystemObject &&',
  '<ActivityMutualLinksPanel',
];
for (const marker of required) assert(source.includes(marker), `missing marker: ${marker}`);
assert(!/\.eq\("id", id\)\s*\.eq\("owner_user_id"/.test(source), 'owner-only primary query returned');
assert(!/const canEdit = isSemanticOntologyObject/.test(source), 'global edit guard missing');

const regression = spawnSync(process.execPath, ['scripts/validate-ai-a3-p5b-mutual-links-v1.mjs'], {
  cwd: repo,
  encoding: 'utf8',
  env: process.env,
});
if (regression.stdout) process.stdout.write(regression.stdout);
if (regression.stderr) process.stderr.write(regression.stderr);
assert(regression.status === 0, `prior P5B validator failed with exit ${regression.status}`);

console.log('AI_A3_P5B_GLOBAL_DETAIL_VALIDATOR_PASS');
