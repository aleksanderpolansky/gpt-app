import { test } from 'node:test';
import assert from 'node:assert/strict';
import { graphClockVectorX04, runGraphVersionFenceX04 } from '../../src/lib/ontology/graphVersionFenceX04.ts';

const actor = { appUserId: 'u', actorId: 'a' };
const system = [
  { version_key: 'system:catalog', revision: 2 },
  { version_key: 'system:relation_review', revision: 6 },
];
const owned = [
  { owner_user_id: 'u', owner_actor_id: 'a', domain_code: 'catalog', revision: 3 },
  { owner_user_id: 'u', owner_actor_id: 'a', domain_code: 'relation_review', revision: 4 },
];

test('valid clock vector requires catalog and relations only', () => {
  const v = graphClockVectorX04(system, owned, actor);
  assert.deepEqual(JSON.parse(v), { system: ['2','6'], actor: ['3','4'] });
});
test('missing, duplicate, malformed system rows fail closed', () => {
  assert.equal(graphClockVectorX04(system.slice(1), owned, actor), null);
  assert.equal(graphClockVectorX04([...system, system[0]], owned, actor), null);
  assert.equal(graphClockVectorX04([{...system[0],revision:1.5},...system.slice(1)], owned, actor), null);
});
test('actor row from another tenant or duplicate actor domain fails closed', () => {
  assert.equal(graphClockVectorX04(system, [{...owned[0], owner_actor_id: 'other'}], actor), null);
  assert.equal(graphClockVectorX04(system, [...owned, owned[0]], actor), null);
});
test('actor insertion and revision increments change the clock vector', () => {
  const baseline = graphClockVectorX04(system, [], actor);
  const inserted = graphClockVectorX04(system, owned, actor);
  assert.notEqual(baseline, inserted);
  assert.notEqual(inserted, graphClockVectorX04(system, [{...owned[0],revision:4},owned[1]], actor));
});
test('stable read succeeds in one attempt', async () => {
  const o = await runGraphVersionFenceX04({readVersion:async()=> 'v1',readValue:async()=>({items:[1]})});
  assert.deepEqual(o,{state:'stable',value:{items:[1]},attempts:1});
});
test('reader/writer overlap: first mixed read discarded and retried', async () => {
  const versions=['v1','v2','v2','v2']; let reads=0;
  const o=await runGraphVersionFenceX04({readVersion:async()=>versions.shift(),readValue:async()=>({epoch:++reads})});
  assert.deepEqual(o,{state:'stable',value:{epoch:2},attempts:2});
});
test('two changing epochs: fail closed, no stale result', async () => {
  const versions=['v1','v2','v2','v3'];
  const o=await runGraphVersionFenceX04({readVersion:async()=>versions.shift(),readValue:async()=>({stale:true})});
  assert.deepEqual(o,{state:'changed',attempts:2});
});
test('no clock or clock query failure: fail closed before serving data', async () => {
  let reads=0;
  let o=await runGraphVersionFenceX04({readVersion:async()=>null,readValue:async()=>{reads++;return 'bad';}});
  assert.deepEqual(o,{state:'unavailable',attempts:1});assert.equal(reads,0);
  o=await runGraphVersionFenceX04({readVersion:async()=>{throw new Error('network');},readValue:async()=> 'bad'});
  assert.deepEqual(o,{state:'unavailable',attempts:1});
});
test('clock disappears after data read: fail closed, no response', async () => {
  let calls=0;
  const o=await runGraphVersionFenceX04({readVersion:async()=> ++calls === 1 ? 'v1' : null,readValue:async()=> 42});
  assert.deepEqual(o,{state:'unavailable',attempts:1});
});


test('unrelated rule approval increments do not invalidate direct neighbor query', () => {
  const value = graphClockVectorX04(system, owned, actor);
  assert.equal(value, graphClockVectorX04(system, [...owned], actor));
  assert.equal(JSON.parse(value).system.length, 2);
});

test('2 domain clock vector rejects foreign actor in same user', () => {
  assert.equal(graphClockVectorX04(system, [{ ...owned[0], owner_actor_id: 'b' }], actor), null);
});

test('second version query failure never leaks stable value', async () => {
  let versions = 0;
  const out = await runGraphVersionFenceX04({
    readVersion: async () => ++versions === 1 ? 'v1' : null,
    readValue: async () => ({ privateData: 'never-deliver' }),
  });
  assert.deepEqual(out, { state: 'unavailable', attempts: 1 });
});
