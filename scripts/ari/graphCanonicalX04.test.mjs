import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
 canonicalizeGraphReadQueryX04,
 canonicalizeGraphCandidateX04,
 isCanonicalStoredGraphTypeX04,
 selectGraphNeighborTypeCodesV1,
 buildGraphNeighborViewV1,
} from '../../src/lib/ontology/graphQueryV1.ts';
const A='00000000-0000-4000-8000-000000000001';
const B='00000000-0000-4000-8000-000000000002';
const registry=[
 {relation_type_code:'depends_on',directionality_code:'directed',status:'active',canonical_relation_type_code:'depends_on',canonical_orientation_code:'same',canonical_write_policy_code:'enabled'},
 {relation_type_code:'prerequisite_for',directionality_code:'directed',status:'active',canonical_relation_type_code:'depends_on',canonical_orientation_code:'reverse',canonical_write_policy_code:'reverse_alias'},
 {relation_type_code:'influences',directionality_code:'directed',status:'active',canonical_relation_type_code:'influences',canonical_orientation_code:'same',canonical_write_policy_code:'enabled'},
 {relation_type_code:'influenced_by',directionality_code:'directed',status:'active',canonical_relation_type_code:'influences',canonical_orientation_code:'reverse',canonical_write_policy_code:'reverse_alias'},
 {relation_type_code:'related_to',directionality_code:'symmetric',status:'active',canonical_relation_type_code:'related_to',canonical_orientation_code:'symmetric',canonical_write_policy_code:'enabled'},
 // Historical canonical edge may be readable even when no longer writable.
 {relation_type_code:'classified_as',directionality_code:'directed',status:'active',canonical_relation_type_code:'classified_as',canonical_orientation_code:'same',canonical_write_policy_code:'disabled'},
];
const query=(direction='all',type=null,limit=50)=>({direction,relationTypeCode:type,limit});
const nodes=[{id:A,title:'A'},{id:B,title:'B'}];
const edge=(id,type,source=A,target=B,extra={})=>({id,source_value_object_id:source,target_value_object_id:target,relation_type_code:type,status:'active',updated_at:'2026-11-14T10:00:00Z',...extra});
const view=(rows,q=query())=>buildGraphNeighborViewV1({anchorValueObjectId:A,query:q,types:registry,rows,visibleNeighbors:nodes});
test('X04-025 reverse alias maps to canonical type and flips requested direction',()=>{
 const q=canonicalizeGraphReadQueryX04(registry,query('outgoing','prerequisite_for'));
 assert.deepEqual(q,query('incoming','depends_on'));
 assert.deepEqual(selectGraphNeighborTypeCodesV1(registry,q),['depends_on']);
 assert.deepEqual(canonicalizeGraphReadQueryX04(registry,query('incoming','influenced_by')),query('outgoing','influences'));
});
test('X04-025 DB candidate reverse alias swaps endpoints (no SQL write)',()=>{
 assert.deepEqual(canonicalizeGraphCandidateX04(registry,'prerequisite_for',A,B),{relationTypeCode:'depends_on',sourceId:B,targetId:A});
 assert.equal(isCanonicalStoredGraphTypeX04(registry[1]),false);
});
test('X04-025 symmetric pair canonicalizes regardless input order',()=>{
 const c1=canonicalizeGraphCandidateX04(registry,'related_to',B,A);
 const c2=canonicalizeGraphCandidateX04(registry,'related_to',A,B);
 assert.deepEqual(c1,c2);
 assert.equal(c1?.relationTypeCode,'related_to');
});
test('X04-025 symmetric reverse duplicates are one edge',()=>{
 const rows=[edge('rel1','related_to',A,B),edge('rel2','related_to',B,A)];
 const v=view(rows);
 assert.equal(v.items.length,1);
 assert.equal(v.items[0].perspective,'symmetric');
});
test('X04-025 directed reversed edges stay distinct',()=>{
 const v=view([edge('rel1','depends_on',A,B),edge('rel2','depends_on',B,A)]);
 assert.equal(v.items.length,2);
 assert.deepEqual(new Set(v.items.map(x=>x.perspective)),new Set(['outgoing','incoming']));
});
test('X04-025 distinct time windows are not merged when supplied',()=>{
 const r1=edge('rel1','related_to',A,B,{valid_from:'2026-01-01T00:00:00Z',valid_to:'2026-02-01T00:00:00Z'});
 const r2=edge('rel2','related_to',B,A,{valid_from:'2026-02-01T00:00:00Z',valid_to:'2026-03-01T00:00:00Z'});
 const v=view([r1,r2]);
 assert.equal(v.items.length,2);
 assert.deepEqual(v.items.map(x=>x.validFrom).sort(),['2026-01-01T00:00:00Z','2026-02-01T00:00:00Z']);
});
test('X04-025 invalid temporal interval fails closed',()=>{
 assert.equal(view([edge('r','related_to',A,B,{valid_from:'2026-03-01T00:00:00Z',valid_to:'2026-02-01T00:00:00Z'})]).items.length,0);
});
test('X04-025 absence of evidence never negates an otherwise valid active edge',()=>{
 assert.equal(view([edge('rel1','depends_on',A,B)]).items.length,1);
 assert.equal(view([edge('rel2','depends_on',A,B,{status:'inactive'})]).items.length,0);
});
test('X04-025 canonical historical classified_as remains readable',()=>{
 assert.equal(view([edge('rel1','classified_as',A,B)]).items.length,1);
 assert.deepEqual(selectGraphNeighborTypeCodesV1(registry,query('all','classified_as')),['classified_as']);
});
test('X04-025 reverse alias row cannot be treated as stored canonical edge',()=>{
 assert.equal(view([edge('rel1','prerequisite_for',A,B)]).items.length,0);
 assert.equal(canonicalizeGraphReadQueryX04(registry,query('outgoing','unknown')),null);
});
test('X04-025 API adapter keeps server scope and version fence',()=>{
 const route=readFileSync(new URL('../../src/app/api/value-objects/[id]/graph-neighbors/route.ts',import.meta.url),'utf8');
 assert.match(route,/resolveActiveActorContext\(/);
 assert.match(route,/runGraphVersionFenceX04\(/);
 assert.match(route,/eq\('owner_user_id',\s*actor\.appUserId\)/);
 assert.match(route,/eq\('owner_actor_id',\s*actor\.actorId\)/);
 assert.match(route,/canonicalizeGraphReadQueryX04\(types, query\)/);
 assert.match(route,/canonical_relation_type_code,canonical_orientation_code,canonical_write_policy_code/);
 assert.match(route,/private, no-store, max-age=0/);
});
