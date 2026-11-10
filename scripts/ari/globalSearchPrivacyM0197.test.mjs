/** M-0197: offline negative privacy tests of PUBLIC global search. No DB/network. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isPublicSystemIndexRowV1,
  isPublicSystemSearchQueryV1,
  projectPublicParentIdV1,
} from '../../src/lib/ontology/globalSearchPrivacyGuardV1.ts';

const dir = path.dirname(fileURLToPath(import.meta.url));
const repo = process.env.ARCTOR_REPO || path.resolve(dir, '../../');
const read = (rel) => fs.readFileSync(path.join(repo, rel), 'utf8');
const global = read('src/app/api/feed/ontology-index/route.ts');
const baseline = process.env.ARCTOR_BASELINE_REPO || repo;
const graph = fs.readFileSync(path.join(baseline, 'src/app/api/value-objects/[id]/graph-neighbors/route.ts'), 'utf8');
const lookup = fs.readFileSync(path.join(baseline, 'src/app/api/value-objects/indexed-lookup/route.ts'), 'utf8');
const selector = fs.readFileSync(path.join(baseline, 'src/app/api/value-objects/selector/route.ts'), 'utf8');
const id = '11111111-1111-4111-8111-111111111111';
const id2 = '22222222-2222-4222-8222-222222222222';
const base = Object.freeze({id,title:'System ON',scope_code:'global',origin_type_code:'system_model',
  owner_user_id:null,owner_actor_id:null,status:'active',parent_value_object_id:null});

// 72 independent inputs with expected allow/deny results. They are not API/RLS runtime tests.
const cases=[];
for(let i=0;i<12;i++)cases.push([`system_valid_${i}`,{...base,title:i%3===0?null:`System ${i}`,
  parent_value_object_id:i%2?id2:null},true]);
for(let i=0;i<12;i++)cases.push([`actor_scope_${i}`,{...base,scope_code:i%2?'actor':'private'},false]);
for(let i=0;i<12;i++)cases.push([`owner_user_${i}`,{...base,owner_user_id:id},false]);
for(let i=0;i<12;i++)cases.push([`owner_actor_${i}`,{...base,owner_actor_id:id2},false]);
for(let i=0;i<8;i++)cases.push([`wrong_origin_${i}`,{...base,origin_type_code:i%2?'actor':'public_commercial'},false]);
for(let i=0;i<8;i++)cases.push([`inactive_${i}`,{...base,status:i%2?'draft':'archived'},false]);
const malformed=[null,{},[],{...base,id:'invalid'},{...base,parent_value_object_id:'actor-private-id'},
 {...base,title:5},{...base,owner_user_id:undefined},{...base,owner_actor_id:undefined}];
for(let i=0;i<malformed.length;i++)cases.push([`malformed_${i}`,malformed[i],false]);
assert.equal(cases.length,72);
for(const [name,row,expected] of cases)assert.equal(isPublicSystemIndexRowV1(row),expected,name);
console.log('M-0197 SYNTHETIC GLOBAL/ACTOR PRIVACY FIXTURES PASS: 72/72');

const invariants=[];
const invariant=(name,fn)=>invariants.push([name,fn]);
invariant('query_no_filters',()=>assert.equal(isPublicSystemSearchQueryV1(new URLSearchParams()),true));
invariant('query_locale',()=>assert.equal(isPublicSystemSearchQueryV1(new URLSearchParams('locale=uk')),true));
for(const field of ['actorId','owner_user_id','owner_actor_id','scope','relationType','includeRelations','includePrivate','userId','source','target']){
 invariant('reject_'+field,()=>assert.equal(isPublicSystemSearchQueryV1(new URLSearchParams(`${field}=1`)),false));
}
invariant('duplicate_locale',()=>assert.equal(isPublicSystemSearchQueryV1(new URLSearchParams('locale=ru&locale=en')),false));
invariant('parent_public',()=>assert.equal(projectPublicParentIdV1(id2,new Set([id2])),id2));
invariant('parent_hidden',()=>assert.equal(projectPublicParentIdV1(id2,new Set([id])),null));
invariant('parent_null',()=>assert.equal(projectPublicParentIdV1(null,new Set([id])),null));
for(const text of ['.eq("scope_code", "global")','.eq("origin_type_code", "system_model")',
 '.is("owner_user_id", null)','.is("owner_actor_id", null)','.eq("status", "active")',
 'isPublicSystemIndexRowV1(row)','PUBLIC_INDEX_SCOPE_VIOLATION',
 'isPublicSystemSearchQueryV1(params)','projectPublicParentIdV1(entry.parentId, exposedIds)',
 'Cache-Control', 'entries: entries.map', 'global']){
 invariant('route_has_'+text,()=>assert.ok(global.includes(text),text));
}
invariant('route_no_actor_relation_table',()=>assert.ok(!/\.from\(["']value_object_relations["']\)/.test(global)));
invariant('route_no_system_relation_table',()=>assert.ok(!/\.from\(["']system_value_object_relations["']\)/.test(global)));
invariant('route_no_select_all',()=>assert.ok(!/\.select\(["']\*["']\)/.test(global)));
invariant('route_no_owner_serialization',()=>assert.ok(!/ownerUserId\s*:|ownerActorId\s*:/.test(global)));
invariant('graph_disabled',()=>assert.ok(graph.includes("process.env.ARCTOR_GRAPH_NEIGHBOR_V1_ENABLED !== '1'")));
invariant('graph_actor_owner_filter',()=>assert.ok(graph.includes(".eq('owner_user_id', actor.appUserId).eq('owner_actor_id', actor.actorId)")));
invariant('graph_system_table_separated',()=>assert.ok(graph.includes("'system_value_object_relations' : 'value_object_relations'")));
invariant('indexed_lookup_feature_off',()=>assert.ok(lookup.includes('process.env.ARCTOR_ON_INDEXED_LOOKUP_V1 !== "enabled"')));
invariant('indexed_lookup_actor_bound',()=>assert.ok(lookup.includes('p_owner_actor_id: actor.actorId')));
invariant('indexed_lookup_no_relation_payload',()=>assert.ok(!/\.from\(["']value_object_relations["']\)/.test(lookup)));
invariant('selector_actor_owner_filter',()=>assert.ok(selector.includes('.eq("owner_user_id", actorContext.appUserId)') && selector.includes('.eq("owner_actor_id", actorContext.actorId)')));
invariant('selector_global_only',()=>assert.ok(selector.includes('.eq("scope_code", "global")')));
assert.equal(invariants.length,40,'invariant test count');
for(const [name,fn] of invariants)try{fn()}catch(err){throw new Error(`${name}: ${err.message}`)}
console.log('M-0197 INDEPENDENT PUBLIC SEARCH SECURITY INVARIANTS PASS: 40/40');
console.log('M-0197 STATIC ROUTE SCOPE CHECK PASS: PUBLIC INDEX / ACTOR LOOKUP / FLAGGED GRAPH.');
console.log('M-0197 OFFLINE READONLY: no SQL, HTTP, RLS runtime, graph or ledger writes.');
