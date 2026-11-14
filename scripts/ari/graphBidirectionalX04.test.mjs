import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  canonicalizeGraphReadQueryX04,
  buildGraphNeighborViewV1,
} from '../../src/lib/ontology/graphQueryV1.ts';
import {
  resolveSemanticRelationTitleKey,
  resolveSemanticRelationDescriptionKey,
} from '../../src/data/value-object-semantic-relation-localization.ts';
const A='74c7e44e-f083-5cb4-8a0a-a91e91d595a0';
const B='a876134c-367b-5b3f-8f04-4752031b63d4';
const title=(code)=>`valueObject.relation.${code}.title`;
const desc=(code)=>`valueObject.relation.${code}.description`;
const canonical=(code,forward,reverse,dir='directed')=>({
  relation_type_code:code,directionality_code:dir,status:'active',
  canonical_relation_type_code:code,canonical_orientation_code:dir==='symmetric'?'symmetric':'same',
  canonical_write_policy_code:'enabled',title_key:title(forward),
  description_key:desc(forward),reverse_title_key:title(reverse),
  reverse_description_key:desc(reverse),
});
const aliases=[
  {relation_type_code:'prerequisite_for',directionality_code:'directed',status:'inactive',
   canonical_relation_type_code:'depends_on',canonical_orientation_code:'reverse',
   canonical_write_policy_code:'reverse_alias',title_key:title('prerequisiteFor')},
  {relation_type_code:'influenced_by',directionality_code:'directed',status:'inactive',
   canonical_relation_type_code:'influences',canonical_orientation_code:'reverse',
   canonical_write_policy_code:'reverse_alias',title_key:title('influencedBy')},
];
const registry=[
  canonical('depends_on','dependsOn','prerequisiteFor'),
  canonical('supports','supports','supportedBy'),
  canonical('influences','influences','influencedBy'),
  canonical('related_to','relatedTo','relatedTo','symmetric'),
  ...aliases,
  {relation_type_code:'disabled_random',directionality_code:'directed',status:'inactive',
   canonical_relation_type_code:'disabled_random',canonical_orientation_code:'same',canonical_write_policy_code:'disabled'},
];
const row=(code='depends_on',source=A,target=B,id='6d508fba-cdab-4e12-a011-ff034a645110')=>({
  id,source_value_object_id:source,target_value_object_id:target,relation_type_code:code,
  status:'active',updated_at:'2026-11-14T10:00:00Z',provenance_code:'curator_manual',
});
const q=(direction='all',type=null)=>({direction,relationTypeCode:type,limit:25});
const view=(anchor,rows,query=q())=>buildGraphNeighborViewV1({
  anchorValueObjectId:anchor,query,types:registry,rows,
  visibleNeighbors:[{id:A,title:'A'},{id:B,title:'B'}],
});

test('X04-025 one physical depends_on edge appears from A and B with the SAME relation UUID',()=>{
  const physical=row();
  const forward=view(A,[physical]).items[0],inverse=view(B,[physical]).items[0];
  assert.equal(forward.relationId,inverse.relationId);
  assert.equal(forward.sourceValueObjectId,inverse.sourceValueObjectId);
  assert.equal(forward.targetValueObjectId,inverse.targetValueObjectId);
  assert.equal(forward.relationTypeCode,'depends_on');
  assert.equal(inverse.relationTypeCode,'depends_on');
  assert.equal(forward.perspective,'outgoing');
  assert.equal(inverse.perspective,'incoming');
  assert.equal(forward.semanticRelationTypeCode,'depends_on');
  assert.equal(inverse.semanticRelationTypeCode,'prerequisite_for');
  assert.equal(inverse.semanticTitleKey,title('prerequisiteFor'));
  assert.equal(inverse.provenanceCode,'curator_manual');
});

test('X04-025 reverse title renders in Russian/Polish using existing translations',()=>{
  const inverse=view(B,[row()]).items[0];
  assert.equal(resolveSemanticRelationTitleKey(inverse.semanticTitleKey,'ru'),'Необходим для');
  assert.equal(resolveSemanticRelationTitleKey(inverse.semanticTitleKey,'pl'),'Wymagany dla');
  assert.equal(resolveSemanticRelationDescriptionKey(inverse.semanticDescriptionKey,'ru'),'Текущий объект необходим для связанного объекта.');
});

test('X04-025 supports incoming uses approved reverse key without inventing a supported_by registry code',()=>{
  const inverse=view(B,[row('supports')]).items[0];
  assert.equal(inverse.semanticTitleKey,title('supportedBy'));
  assert.equal(inverse.semanticRelationTypeCode,null);
  assert.equal(resolveSemanticRelationTitleKey(inverse.semanticTitleKey,'ru'),'Поддерживается');
});

test('X04-025 influences incoming uses the same registry-driven mechanism',()=>{
  const inverse=view(B,[row('influences')]).items[0];
  assert.equal(inverse.semanticRelationTypeCode,'influenced_by');
  assert.equal(inverse.semanticTitleKey,title('influencedBy'));
  assert.equal(resolveSemanticRelationTitleKey(inverse.semanticTitleKey,'ru'),'Испытывает влияние');
});

test('X04-025 explicit inactive reverse_alias works for read-only filter; directions are reversed',()=>{
  const requested=canonicalizeGraphReadQueryX04(registry,q('outgoing','prerequisite_for'));
  assert.deepEqual(requested,q('incoming','depends_on'));
  const inverse=view(B,[row()],requested);
  assert.equal(inverse.items.length,1);
  assert.equal(inverse.items[0].semanticRelationTypeCode,'prerequisite_for');
  const fromA=canonicalizeGraphReadQueryX04(registry,q('incoming','prerequisite_for'));
  assert.deepEqual(fromA,q('outgoing','depends_on'));
  assert.equal(view(A,[row()],fromA).items.length,1);
});

test('X04-025 inactive unrelated type does not become a readable alias',()=>{
  assert.equal(canonicalizeGraphReadQueryX04(registry,q('all','disabled_random')),null);
  assert.equal(canonicalizeGraphReadQueryX04(registry,q('all','unknown_relation')),null);
});

test('X04-025 symmetric inverse has no invented semantic direction or physical duplicate',()=>{
  const two=[row('related_to',A,B,'id1'),row('related_to',B,A,'id2')];
  const fromA=view(A,two), fromB=view(B,two);
  assert.equal(fromA.items.length,1);
  assert.equal(fromB.items.length,1);
  assert.equal(fromA.items[0].semanticRelationTypeCode,'related_to');
  assert.equal(fromB.items[0].perspective,'symmetric');
});

test('X04-025 previously approved time-window identity remains distinct in projection',()=>{
  const first={...row('related_to'),valid_from:'2026-01-01T00:00:00Z',valid_to:'2026-02-01T00:00:00Z'};
  const second={...row('related_to',B,A,'uuid-other'),valid_from:'2026-02-01T00:00:00Z',valid_to:'2026-03-01T00:00:00Z'};
  assert.equal(view(A,[first,second]).items.length,2);
});

test('X04-025 API retains fence, server-owned actor and read-only physical relations',()=>{
  const api=readFileSync(new URL('../../src/app/api/value-objects/[id]/graph-neighbors/route.ts',import.meta.url),'utf8');
  assert.match(api,/runGraphVersionFenceX04\(/);
  assert.match(api,/resolveActiveActorContext\(/);
  assert.match(api,/\.eq\('owner_user_id', actor\.appUserId\)/);
  assert.match(api,/\.eq\('owner_actor_id', actor\.actorId\)/);
  assert.match(api,/\.select\('relation_type_code,directionality_code,status,canonical_relation_type_code,canonical_orientation_code,canonical_write_policy_code,title_key,description_key,reverse_title_key,reverse_description_key'\)/);
  assert.match(api,/\.select\(fields\)/);
  assert.doesNotMatch(api,/\.insert\(|\.upsert\(|\.delete\(|\.update\(/);
});

test('X04-025 Graph V1 panel now displays approved reverse translation, not only raw depends_on',()=>{
  const ui=readFileSync(new URL('../../src/components/workspace/value-objects/value-object-graph-neighbors-panel.tsx',import.meta.url),'utf8');
  assert.match(ui,/resolveSemanticRelationTitleKey\(item\.semanticTitleKey \?\? null, locale\)/);
  assert.match(ui,/resolveSemanticRelationDescriptionKey\(item\.semanticDescriptionKey \?\? null, locale\)/);
  assert.match(ui,/item\.semanticRelationTypeCode \?\? item\.relationTypeCode/);
  assert.match(ui,/\/graph-neighbors\?direction=all&limit=50/);
});
