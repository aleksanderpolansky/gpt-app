/** M-0195 offline deterministic test suite. No network or database calls. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const root = process.env.ARCTOR_REPO || process.cwd();
const source = path.join(root, 'src/lib/ontology/graphQueryV1.ts');
const route = path.join(root,'src/app/api/value-objects/[id]/graph-neighbors/route.ts');
const module = await import(pathToFileURL(source).href);
const { parseGraphNeighborQueryV1: parse, selectGraphNeighborTypeCodesV1: codes, buildGraphNeighborViewV1: project } = module;
const types = [
  {relation_type_code:'supports',directionality_code:'directed',status:'active'},
  {relation_type_code:'depends_on',directionality_code:'directed',status:'active'},
  {relation_type_code:'related_to',directionality_code:'symmetric',status:'active'},
  {relation_type_code:'retired',directionality_code:'symmetric',status:'inactive'},
];
const R=(id, source, target, type='supports', status='active',updated='2026-11-07T12:00:00Z')=>({
 id,source_value_object_id:source,target_value_object_id:target,relation_type_code:type,status,updated_at:updated,
});
const core=[
 R('e1','A','B'), R('e2','C','A'), R('e3','A','D','related_to'),
 R('e4','D','A','related_to'), R('e5','A','E','depends_on'),
 R('e6','F','A','supports','inactive'), R('e7','A','X'),
 R('e8','A','G','retired'),
];
const visible=['B','C','D','E','F','G'].map(id=>({id,title:'Node '+id}));
let fixtures=0,invariants=0;
const directions=['all','outgoing','incoming','symmetric'];
const typeSpecs=[null,'supports','related_to'];
const scenarios=[
 {rows:core,limit:50},
 {rows:[...core].reverse(),limit:50},
 {rows:core,limit:1},
 {rows:[...core,R('e9','A','Z')],limit:50},
 {rows:core.filter(r=>r.id==='e2'||r.id==='e3'),limit:50},
 {rows:[],limit:50},
];
for(const direction of directions) for(const type of typeSpecs) for(const scenario of scenarios){
 const q={direction,relationTypeCode:type,limit:scenario.limit};
 const wanted=codes(types,q);
 const view=project({anchorValueObjectId:'A',query:q,types,rows:scenario.rows,visibleNeighbors:visible});
 assert.ok(view.items.length<=q.limit);
 assert.equal(new Set(view.items.map(x=>x.relationId)).size,view.items.length);
 assert.equal(new Set(view.items.map(x=>[x.relationTypeCode,x.sourceValueObjectId,x.targetValueObjectId].join('|'))).size,view.items.length);
 for(const item of view.items){
  assert.ok(visible.some(n=>n.id===item.neighborValueObjectId));
  assert.ok(wanted.includes(item.relationTypeCode));
  assert.ok(direction==='all'||item.perspective===direction);
 }
 if(direction==='incoming')assert.ok(view.items.every(x=>x.targetValueObjectId==='A'));
 if(direction==='outgoing')assert.ok(view.items.every(x=>x.sourceValueObjectId==='A'));
 fixtures++;
}
assert.equal(fixtures,72);
const invalid=[
 'direction=reverse','direction=OUTGOING','type=ABC','type=','limit=0',
 'limit=51','limit=-1','limit=1.5','limit=1e2','limit=NaN','limit=01',
 'direction=all&direction=all','type=supports&type=supports','limit=1&limit=2',
 'scope=actor','actorId=any','owner_user_id=anything','foo=bar','type=supports%3Bdelete',
 'type=x%27%29','limit=Infinity','limit=99999999999999999999',
];
for(const v of invalid){assert.throws(()=>parse(new URLSearchParams(v)));invariants++;}
const valid=['','direction=all','direction=incoming','direction=outgoing','direction=symmetric',
 'type=supports','limit=1','limit=50','direction=symmetric&type=related_to','limit=25&type=depends_on'];
for(const v of valid){assert.doesNotThrow(()=>parse(new URLSearchParams(v)));invariants++;}
for(const mode of directions){
 const q={direction:mode,relationTypeCode:null,limit:50};
 const view=project({anchorValueObjectId:'A',query:q,types,rows:core,visibleNeighbors:visible});
 const input=JSON.stringify({core,types,visible});
 const second=project({anchorValueObjectId:'A',query:q,types,rows:[...core],visibleNeighbors:[...visible]});
 assert.deepEqual(view,second);assert.equal(JSON.stringify({core,types,visible}),input);
 invariants++;
}
for(const limit of [1,2,3,4]){
 const q={direction:'all',relationTypeCode:null,limit};
 const view=project({anchorValueObjectId:'A',query:q,types,rows:core,visibleNeighbors:visible});
 assert.ok(view.items.length<=limit);
 invariants++;
}
assert.equal(invariants,40);
const routeContent=fs.readFileSync(route,'utf8');
for(const essential of [
 'ARCTOR_GRAPH_NEIGHBOR_V1_ENABLED', 'auth0.getSession()',
 'resolveActiveActorContext',".eq('owner_user_id', actor.appUserId)",
 ".eq('owner_actor_id', actor.actorId)",".eq('scope_code', 'global')",
 ".eq('origin_type_code', 'system_model')",'Cache-Control', 'no-store',
 "export async function GET",'GRAPH_NEIGHBOR_API_DISABLED',
])assert.ok(routeContent.includes(essential),'Missing security boundary: '+essential);
assert.ok(!/export\s+async\s+function\s+(POST|PUT|DELETE|PATCH)/.test(routeContent));
assert.ok(!/\.(insert|upsert|update|delete)\(/.test(routeContent));
console.log('M-0195 SYNTHETIC NEIGHBOR FIXTURES PASS: 72/72');
console.log('M-0195 INDEPENDENT GRAPH QUERY INVARIANTS PASS: 40/40');
console.log('M-0195 API ROUTE STATIC SECURITY BOUNDARY PASS: 13/13');
console.log('M-0195 CODE READONLY: no writes, API deployment, network or DB runtime test.');
