import test from 'node:test';
import assert from 'node:assert/strict';
import { parseIndexedLookupInput, encodeLookupCursor, decodeLookupCursor } from '../../src/lib/ontology-research/indexedLookupContractV1.ts';
const ACTOR='11111111-1111-4111-8111-111111111111';
const RECORD='a1000000-0000-4000-8000-000000000001';
test('accepts exact shop keyword and normalizes unicode',()=>{
 const v=parseIndexedLookupInput({query:'  Mercadona  ',locale:'es',limit:20,branch:'systems_structures'});
 assert.equal(v.ok,true); if(v.ok) assert.equal(v.value.term,'Mercadona');
});
test('rejects wildcard/oversized/malformed inputs',()=>{
 for(const query of ['','Li','%','_','\u0000Mercadona','x'.repeat(81)]){
  assert.equal(parseIndexedLookupInput({query}).ok,false);
 }
 assert.equal(parseIndexedLookupInput({query:'Mercadona',limit:500}).ok,false);
 assert.equal(parseIndexedLookupInput({query:'Mercadona',branch:'foo);drop table value_objects'}).ok,false);
});
test('pagination is bound to query, branch and actor',()=>{
 const parsed=parseIndexedLookupInput({query:'Mercadona',locale:'es'});
 assert.equal(parsed.ok,true);if(!parsed.ok)return;
 const cursor=encodeLookupCursor(RECORD,parsed.value,ACTOR);
 assert.equal(decodeLookupCursor({...parsed.value,cursor},ACTOR),RECORD);
 assert.throws(()=>decodeLookupCursor({...parsed.value,cursor},'22222222-2222-4222-8222-222222222222'));
 assert.throws(()=>decodeLookupCursor({...parsed.value,term:'Lidl',cursor},ACTOR));
});
