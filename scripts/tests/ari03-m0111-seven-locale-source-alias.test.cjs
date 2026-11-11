'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');const Module=require('node:module');
const ts=require('typescript');
const repo=process.cwd();
const modulePath=path.resolve(repo,'src/lib/ontology-research/localeAliasIndexV1.ts');
const source=fs.readFileSync(modulePath,'utf8');
const compile=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,strict:true},reportDiagnostics:true});
assert.deepEqual(compile.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error),[]);
const mod=new Module(modulePath,module);mod.filename=modulePath;mod.paths=Module._nodeModulePaths(path.dirname(modulePath));mod._compile(compile.outputText,modulePath);
const api=mod.exports;
const inventory=JSON.parse(fs.readFileSync(path.join(repo,'docs/ari/03/lexical_retrieval/M0111_SOURCE_INVENTORY.json'),'utf8'));
const repoDictionary=fs.readFileSync(path.join(repo,'src/lib/ontology-research/ari02EnhancedSearch.ts'),'utf8');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const id1='11111111-1111-4111-8111-111111111111',id2='22222222-2222-4222-8222-222222222222';
const src={type:'curator_record',reference:'M0111_SYNTHETIC_FIXTURE_NOT_DB',version:'1',evidenceSha256:hash('curator-test-evidence')};
const row=(locale,alias,objectId=id1,review='verified',reviewedBy='fixture_owner')=>({locale,alias,objectId,review,reviewedBy,source:{...src}});
const check=(entries,loc,alias)=>api.buildLocaleAliasIndexV1(entries).lookup(loc,alias);
const locales=['en','pl','es','de','cs','uk','ru'];
const child={en:'child',pl:'dziecko',es:'niño',de:'kind',cs:'dítě',uk:'дитина',ru:'ребёнок'};
const walking={en:'walking',pl:'chodzenie',es:'caminar',de:'gehen',cs:'chůze',uk:'ходіння',ru:'ходьба'};

test('inventory is evidence-only and declares exactly seven locales',()=>{
 assert.equal(inventory.contract,'ARCTOR_ARI_M0111_SOURCE_INVENTORY_V1');
 assert.deepEqual(inventory.locales,locales);
 assert.deepEqual(api.ARCTOR_ALIAS_LOCALES_V1,locales);
 assert.equal(inventory.entries.length,14);
});
for(const loc of locales){
 test('source verified child word in repository dictionary: '+loc,()=>{
  const x=inventory.entries.find(x=>x.locale===loc&&x.concept==='child');
  assert.equal(x.alias,child[loc]);assert.equal(x.ontologyBinding,'NOT_VERIFIED');
  assert.equal(x.curatorApproval,'NOT_VERIFIED');
  const sec=repoDictionary.match(/\bchild:\s*\[([^\]]*)\]/);
  assert.ok(sec&&sec[1].includes(JSON.stringify(x.alias)),'word absent from source dictionary');
 });
 test('source verified walking word in repository dictionary: '+loc,()=>{
  const x=inventory.entries.find(x=>x.locale===loc&&x.concept==='walking');
  assert.equal(x.alias,walking[loc]);assert.equal(x.ontologyBinding,'NOT_VERIFIED');
  const sec=repoDictionary.match(/\bwalking:\s*\[([^\]]*)\]/);
  assert.ok(sec&&sec[1].includes(JSON.stringify(x.alias)),'word absent from source dictionary');
 });
 test('curator-approved synthetic fixture returns one UUID: '+loc,()=>{
  const r=check([row(loc,child[loc])],loc,child[loc]);
  assert.equal(r.status,'candidates');assert.deepEqual(r.candidates.map(x=>x.objectId),[id1]);
  assert.equal(r.autoSelectedId,null);assert.equal(r.absenceProven,false);
 });
}
test('seven locale aliases can share one object identity without cloning',()=>{
 const rows=locales.map(loc=>row(loc,child[loc]));const ix=api.buildLocaleAliasIndexV1(rows);
 assert.equal(ix.verifiedBindings,7);assert.deepEqual(ix.coveredLocales,locales);
 for(const loc of locales)assert.equal(ix.lookup(loc,child[loc]).candidates[0].objectId,id1);
});
test('two distinct UUIDs with same alias become ambiguous; no merge',()=>{
 const r=check([row('en','child',id1),row('en','child',id2)],'en','child');
 assert.equal(r.status,'ambiguous');assert.deepEqual(r.candidates.map(x=>x.objectId),[id1,id2]);
 assert.equal(r.autoSelectedId,null);
});
test('duplicate same UUID aliases do not become ambiguity',()=>{
 const r=check([row('ru','ребёнок'),row('ru','ребёнок')],'ru','ребёнок');
 assert.equal(r.status,'candidates');assert.equal(r.candidates.length,1);assert.equal(r.candidates[0].provenance.length,1);
});
test('different source on same UUID retains both provenance records',()=>{
 const q=row('en','child');const r=check([q,{...q,source:{...src,reference:'SECOND_REVIEW_RECORD'}}],'en','child');
 assert.equal(r.status,'candidates');assert.equal(r.candidates[0].provenance.length,2);
});
test('unreviewed source-only aliases are not trusted as ontology matches',()=>{
 const r=check([row('en','child',id1,'candidate',null)],'en','child');
 assert.equal(r.status,'no_verified_match');assert.equal(r.absenceProven,false);
});
test('rejected candidate excluded even with a UUID',()=>{
 const r=check([row('en','child',id1,'rejected',null)],'en','child');assert.equal(r.candidates.length,0);
});
test('unapproved alias remains excluded alongside verified alias',()=>{
 const ix=api.buildLocaleAliasIndexV1([row('en','child'),row('en','child',id2,'candidate',null)]);
 assert.equal(ix.skippedUnreviewed,1);assert.deepEqual(ix.lookup('en','child').candidates.map(x=>x.objectId),[id1]);
});
test('locale is part of index key',()=>{
 const ix=api.buildLocaleAliasIndexV1([row('en','kind')]);
 assert.equal(ix.lookup('de','kind').candidates.length,0);assert.equal(ix.lookup('en','kind').candidates.length,1);
});
test('case and surrounding spaces normalized without accent stripping',()=>{
 assert.equal(check([row('de','Kind')],'de','  KIND ').candidates.length,1);
 assert.equal(check([row('cs','dítě')],'cs','dite').candidates.length,0);
 assert.equal(check([row('pl','dziecko')],'pl','Dziecko').candidates.length,1);
});
test('ñ and n, Polish/Czech accents remain distinct',()=>{
 assert.notEqual(api.normalizeAliasKeyV1('niño'),api.normalizeAliasKeyV1('nino'));
 assert.notEqual(api.normalizeAliasKeyV1('chůze'),api.normalizeAliasKeyV1('chuze'));
});
test('no result never claims ontology absence',()=>{
 const r=check([], 'en','missing');assert.equal(r.status,'no_verified_match');assert.equal(r.absenceProven,false);
});
test('verified alias requires reviewer identity',()=>{
 assert.throws(()=>api.buildLocaleAliasIndexV1([row('en','child',id1,'verified',null)]),/ALIAS_VERIFICATION_REQUIRED/);
});
test('verified alias requires concrete source evidence hash',()=>{
 const q=row('en','child');assert.throws(()=>api.buildLocaleAliasIndexV1([{...q,source:{...src,evidenceSha256:'fake'}}]),/ALIAS_SOURCE_EVIDENCE_REQUIRED/);
});
test('verified alias requires stable UUID',()=>{
 assert.throws(()=>api.buildLocaleAliasIndexV1([row('en','child','not-a-uuid')]),/ALIAS_INVALID_UUID/);
});
test('invalid locale rejected',()=>{
 assert.throws(()=>api.buildLocaleAliasIndexV1([row('fr','enfant')]),/ALIAS_INVALID_LOCALE/);
});
test('excessively long text rejected',()=>{
 assert.throws(()=>api.buildLocaleAliasIndexV1([row('en','a'.repeat(181))]),/ALIAS_INVALID_TEXT/);
});
test('input count guard rejects unusually large scan',()=>{
 assert.throws(()=>api.buildLocaleAliasIndexV1(new Array(50001).fill(row('en','child'))),/ALIAS_INPUT_LIMIT/);
});
test('lookup response cannot be mutated to alter next answer',()=>{
 const ix=api.buildLocaleAliasIndexV1([row('en','child')]);const first=ix.lookup('en','child');
 first.candidates[0].provenance[0].reference='bad';first.candidates[0].objectId='bad';
 const second=ix.lookup('en','child');assert.equal(second.candidates[0].objectId,id1);
 assert.equal(second.candidates[0].provenance[0].reference,src.reference);
});
test('no magic UUID resolution or database write path',()=>{
 assert.ok(!/supabase|\.rpc\(|\.insert\(|\.update\(|fetch\(/.test(source));
 assert.equal(check([row('en','child')],'en','child').autoSelectedId,null);
});
test('locale alias index and source inventory are independent of feature enablement',()=>{
 assert.ok(!/ARCTOR_ON_INDEXED_LOOKUP_V1|process\.env/.test(source));
 assert.equal(api.buildLocaleAliasIndexV1([]).version,'ARCTOR_LOCALE_ALIAS_INDEX_V1');
});
