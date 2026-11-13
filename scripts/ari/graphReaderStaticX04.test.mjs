import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const route = readFileSync(new URL('../../src/app/api/value-objects/[id]/graph-neighbors/route.ts', import.meta.url), 'utf8');

test('production feature flag is preserved; no default-enable', () => {
  assert.match(route, /process\.env\.ARCTOR_GRAPH_NEIGHBOR_V1_ENABLED\s*!==\s*'1'/);
});
test('auth and actor scope still server side', () => {
  assert.match(route, /auth0\.getSession\(/);
  assert.match(route, /resolveActiveActorContext\(/);
  assert.match(route, /eq\('owner_user_id',\s*actor\.appUserId\)/);
  assert.match(route, /eq\('owner_actor_id',\s*actor\.actorId\)/);
});
test('clock errors fail closed and no shared HTTP cache', () => {
  assert.match(route, /readGraphClockVectorX04\(actor\)/);
  assert.match(route, /GRAPH_VERSION_UNAVAILABLE/);
  assert.match(route, /GRAPH_VERSION_CHANGED_RETRY_EXHAUSTED/);
  assert.match(route, /,\s*503\)/);
  assert.match(route, /private, no-store, max-age=0/);
});
test('rule approval is not required by direct neighbors reader', () => {
  assert.doesNotMatch(route, /system:rule_approval/);
  assert.doesNotMatch(route, /'rule_approval'/);
});
