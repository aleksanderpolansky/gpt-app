'use strict';
const test=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const modulePath=path.resolve(process.cwd(),'src/lib/ontology-research/localeAliasIndexV1.ts');
const source=fs.readFileSync(modulePath,'utf8');
const transpiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,strict:true},reportDiagnostics:true});
assert.deepEqual(transpiled.diagnostics?.filter(x=>x.category===ts.DiagnosticCategory.Error),[]);
const m=new Module(modulePath,module);m.filename=modulePath;m.paths=Module._nodeModulePaths(path.dirname(modulePath));m._compile(transpiled.outputText,modulePath);
const {ARCTOR_ALIAS_LOCALES_V1: locales,buildLocaleAliasIndexV1: aliases,buildBroaderNarrowerIndexV1: relations}=m.exports;
const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
const C='33333333-3333-4333-8333-333333333333';
const D='44444444-4444-4444-8444-444444444444';
const evi=(ref='M0113_SYNTHETIC')=>({type:'curator_record',reference:ref,version:'v1',evidenceSha256:'b'.repeat(64)});
const alias=(locale,text,objectId=A,review='verified')=>({objectId,locale,alias:text,review,reviewedBy:review==='verified'?'curator-test':null,source:evi()});
const edge=(broaderObjectId=A,narrowerObjectId=B,review='verified',ref='M0113_SYNTHETIC')=>({broaderObjectId,narrowerObjectId,review,reviewedBy:review==='verified'?'curator-test':null,source:evi(ref)});
const samples={en:['animal','dog'],pl:['zwierzę','pies'],es:['animal','perro'],de:['Tier','Hund'],cs:['zvíře','pes'],uk:['тварина','собака'],ru:['животное','собака']};
const localAliases=()=>locales.flatMap(loc=>[alias(loc,samples[loc][0],A),alias(loc,samples[loc][1],B)]);
for(const locale of locales){
 const [parentName,childName]=samples[locale];
 test('M0113 '+locale+' reviewed same-object title variants keep one UUID',()=>{
  const index=aliases([alias(locale,parentName,A),alias(locale,parentName.toUpperCase(),A)]);
  const result=index.lookup(locale,parentName);assert.equal(result.candidates.length,1);assert.equal(result.candidates[0].objectId,A);assert.equal(result.autoSelectedId,null);
 });
 test('M0113 '+locale+' broader/narrower link does not turn child word into parent alias',()=>{
  const ix=aliases([alias(locale,parentName,A),alias(locale,childName,B)]);
  const graph=relations([edge(A,B)]);
  assert.deepEqual(ix.lookup(locale,childName).candidates.map(x=>x.objectId),[B]);
  assert.deepEqual(ix.lookup(locale,parentName).candidates.map(x=>x.objectId),[A]);
  assert.deepEqual(graph.broaderOf(B).relations.map(x=>x.broaderObjectId),[A]);
  assert.equal(graph.broaderOf(B).aliasEquivalenceEstablished,false);
 });
 test('M0113 '+locale+' no implicit inverse, transitive or sibling synonym',()=>{
  const graph=relations([edge(A,B),edge(B,C)]);
  assert.equal(graph.between(B,A).relations.length,0);
  assert.equal(graph.between(A,C).relations.length,0);
  assert.equal(graph.between(A,B).relations.length,1);
  assert.equal(graph.between(A,B).autoSelectedId,null);
 });
 test('M0113 '+locale+' translation collision across distinct UUIDs remains ambiguous',()=>{
  const ix=aliases([alias(locale,parentName,A),alias(locale,parentName,B)]);
  const r=ix.lookup(locale,parentName);
  assert.equal(r.status,'ambiguous');assert.deepEqual(r.candidates.map(x=>x.objectId),[A,B]);
  assert.equal(r.autoSelectedId,null);assert.equal(r.absenceProven,false);
 });
 test('M0113 '+locale+' unreviewed edge cannot cause synonym promotion',()=>{
  const ix=aliases([alias(locale,parentName,A)]);
  const graph=relations([edge(A,B,'candidate')]);
  assert.equal(graph.verifiedEdges,0);assert.equal(graph.skippedUnreviewed,1);
  assert.equal(graph.broaderOf(B).relations.length,0);
  assert.equal(ix.lookup(locale,childName).candidates.length,0);
  assert.equal(ix.lookup(locale,childName).absenceProven,false);
 });
}
test('M0113 exactly seven supported locales retained',()=>assert.deepEqual(locales,['en','pl','es','de','cs','uk','ru']));
test('M0113 same single UUID can have verified alias bindings in all seven locales',()=>{
 const ix=aliases(locales.map(loc=>alias(loc,samples[loc][0],A)));
 for(const loc of locales) assert.deepEqual(ix.lookup(loc,samples[loc][0]).candidates.map(x=>x.objectId),[A]);
 assert.equal(ix.verifiedBindings,7);
});
test('M0113 one reviewed broader/narrower edge is independent of 14 locale aliases',()=>{
 const i=aliases(localAliases()),r=relations([edge(A,B)]);
 assert.equal(i.verifiedBindings,14);assert.equal(r.verifiedEdges,1);
});
test('M0113 rejects same-UUID narrower/broader edge',()=>assert.throws(()=>relations([edge(A,A)]),/RELATION_REFLEXIVE_DISALLOWED/));
test('M0113 rejects malformed broader UUID',()=>assert.throws(()=>relations([edge('not-id',B)]),/RELATION_INVALID_UUID/));
test('M0113 rejects malformed narrower UUID',()=>assert.throws(()=>relations([edge(A,'no-id')]),/RELATION_INVALID_UUID/));
test('M0113 rejects invalid UUID at lookup',()=>assert.throws(()=>relations([]).broaderOf('bad'),/RELATION_INVALID_UUID/));
test('M0113 rejects unreviewed evidence marked as verified without reviewer',()=>{
 const r=edge(A,B);r.reviewedBy=null;assert.throws(()=>relations([r]),/RELATION_VERIFICATION_REQUIRED/);
});
test('M0113 excludes rejected semantic links',()=>{
 const r=relations([edge(A,B,'rejected')]);assert.equal(r.skippedUnreviewed,1);assert.equal(r.narrowerOf(A).relations.length,0);
});
test('M0113 demands source provenance SHA',()=>{
 const r=edge(A,B);r.source.evidenceSha256='bad';assert.throws(()=>relations([r]),/RELATION_SOURCE_EVIDENCE_REQUIRED/);
});
test('M0113 invalid source type is rejected',()=>{
 const r=edge(A,B);r.source.type='guess';assert.throws(()=>relations([r]),/RELATION_INVALID_SOURCE_TYPE/);
});
test('M0113 bad review state fails closed',()=>{
 const r=edge(A,B);r.review='maybe';assert.throws(()=>relations([r]),/RELATION_INVALID_REVIEW/);
});
test('M0113 duplicate evidence is deduplicated for same relation',()=>{
 const r=relations([edge(A,B),edge(A,B)]);assert.equal(r.verifiedEdges,2);
 assert.equal(r.broaderOf(B).relations.length,1);assert.equal(r.broaderOf(B).relations[0].provenance.length,1);
});
test('M0113 distinct sources remain traceable',()=>{
 const r=relations([edge(A,B,'verified','S1'),edge(A,B,'verified','S2')]);
 assert.deepEqual(r.broaderOf(B).relations[0].provenance.map(x=>x.reference),['S1','S2']);
});
test('M0113 relation lookups cannot mutate internal provenance',()=>{
 const r=relations([edge(A,B)]);const got=r.broaderOf(B);got.relations[0].provenance[0].reference='spoof';
 assert.equal(r.broaderOf(B).relations[0].provenance[0].reference,'M0113_SYNTHETIC');
});
test('M0113 broader/narrower endpoints normalize UUID case',()=>{
 const r=relations([edge(A.toUpperCase(),B.toUpperCase())]);
 assert.equal(r.between(A.toUpperCase(),B).relations.length,1);
});
test('M0113 distinct narrow objects allowed for one broader object',()=>{
 const r=relations([edge(A,B),edge(A,C)]);assert.equal(r.narrowerOf(A).relations.length,2);
});
test('M0113 distinct broader objects allowed for one narrow object',()=>{
 const r=relations([edge(A,C),edge(B,C)]);assert.equal(r.broaderOf(C).relations.length,2);
});
test('M0113 no link is never proof of global absence',()=>{
 const r=relations([]).between(A,B);assert.equal(r.status,'no_verified_relation');
 assert.equal(r.absenceProven,false);assert.equal(r.scopedInputOnly,true);
});
test('M0113 no implicit reflexivity even during lookup',()=>{
 const r=relations([edge(A,B)]).between(A,A);assert.equal(r.relations.length,0);
});
test('M0113 relation is directional and never an alias-equivalence',()=>{
 const r=relations([edge(A,B)]).between(A,B);assert.equal(r.aliasEquivalenceEstablished,false);
 assert.equal(r.relations[0].relationType,'broader_narrower');
});
test('M0113 never creates relation from a verified alias alone',()=>{
 const ix=aliases([alias('en','dog',A)]),graph=relations([]);
 assert.equal(ix.lookup('en','dog').candidates.length,1);assert.equal(graph.broaderOf(A).relations.length,0);
});
test('M0113 Ukrainian apostrophe and Polish diacritics preserved',()=>{
 const ix=aliases([alias('uk',"п'ять",A),alias('pl','łódź',B)]);
 assert.equal(ix.lookup('uk','п’ять').candidates.length,1);
 assert.equal(ix.lookup('pl','lodz').candidates.length,0);
});
test('M0113 external relation records are not mutated during indexing',()=>{
 const e=edge(A,B);const index=relations([e]);assert.equal(index.between(A,B).relations.length,1);
 assert.deepEqual(e,edge(A,B));
});
test('M0113 rejects non-array relation input',()=>assert.throws(()=>relations(null),/RELATION_INPUT_LIMIT/));
test('M0113 rejects missing relation entry',()=>assert.throws(()=>relations([null]),/RELATION_INVALID_ENTRY/));
test('M0113 source code contains no DB or API integration',()=>{
 assert.ok(!/supabase|\.rpc\(|\.insert\(|\.update\(|fetch\(/.test(source));
 assert.ok(!/ARCTOR_ON_INDEXED_LOOKUP|process\.env/.test(source));
});
test('M0113 does not introduce automatic UUID assignment',()=>{
 const result=relations([edge(A,B)]).narrowerOf(A);
 assert.equal(result.autoSelectedId,null);assert.equal(result.aliasEquivalenceEstablished,false);
});
