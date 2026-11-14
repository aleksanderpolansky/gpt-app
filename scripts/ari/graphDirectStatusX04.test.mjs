import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../../src/lib/ontology/graphQueryV1.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022,
}}).outputText;
const { buildGraphNeighborViewV1: view } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

const anchor = '00000000-0000-4000-8000-000000000001';
const n = '00000000-0000-4000-8000-000000000002';
const type = { relation_type_code: 'depends_on', directionality_code: 'directed', status: 'active' };
const symType = { relation_type_code: 'related_to', directionality_code: 'symmetric', status: 'active' };
const row = { id: 'r1', source_value_object_id: anchor, target_value_object_id: n,
  relation_type_code: 'depends_on', status: 'active', updated_at: '2026-11-13T10:00:00Z' };
const node = { id: n, title: 'Nervous system' };
const input = (overrides = {}) => ({ anchorValueObjectId: anchor,
  query: { direction: 'all', relationTypeCode: null, limit: 10 },
  types: [type, symType], rows: [row], visibleNeighbors: [node], ...overrides });

test('direct neighbor includes the actual relation status', () => {
  const result = view(input());
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].status, 'active');
  assert.equal(result.items[0].sourceValueObjectId, anchor);
  assert.equal(result.items[0].targetValueObjectId, n);
  assert.equal(result.items[0].relationTypeCode, 'depends_on');
  assert.equal(result.items[0].perspective, 'outgoing');
});
test('inactive relation is omitted, not presented as active', () => {
  assert.equal(view(input({ rows: [{ ...row, status: 'inactive' }] })).items.length, 0);
});
test('neighbor invisible in authorized scope stays absent', () => {
  assert.equal(view(input({ visibleNeighbors: [] })).items.length, 0);
});
test('incoming direction remains distinct after additive field', () => {
  const reversed = {...row, source_value_object_id: n, target_value_object_id: anchor };
  assert.equal(view(input({ rows: [reversed], query: { direction: 'incoming', relationTypeCode: null, limit: 10 } })).items[0].perspective, 'incoming');
});
test('symmetric reverse duplicate is deduplicated with status', () => {
  const a = { ...row, relation_type_code: 'related_to' };
  const b = { ...a, id: 'r2', source_value_object_id: n, target_value_object_id: anchor };
  const result = view(input({ rows: [a,b] }));
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].status, 'active');
  assert.equal(result.items[0].perspective, 'symmetric');
});
