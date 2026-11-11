'use strict';
const test=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const modulePath=path.resolve(process.cwd(),'src/lib/ontology-research/localeAliasIndexV1.ts');
const source=fs.readFileSync(modulePath,'utf8');
const transpiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,strict:true},reportDiagnostics:true});
assert.deepEqual(transpiled.diagnostics?.filter(x=>x.category===ts.DiagnosticCategory.Error),[]);
const moduleInstance=new Module(modulePath,module);moduleInstance.filename=modulePath;
moduleInstance.paths=Module._nodeModulePaths(path.dirname(modulePath));moduleInstance._compile(transpiled.outputText,modulePath);
const {ARCTOR_ALIAS_LOCALES_V1:locales,buildLocaleSenseIndexV1:senses,
 buildLocaleAliasIndexV1:aliases,buildBroaderNarrowerIndexV1:relations}=moduleInstance.exports;
const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
const C='33333333-3333-4333-8333-333333333333';
const src=(ref='M0114_FIXTURE')=>({type:'curator_record',reference:ref,version:'v1',evidenceSha256:'e'.repeat(64)});
const make=(locale,alias,objectId,senseKey,positiveCues=[],negativeCues=[],review='verified',ref='M0114_FIXTURE')=>
 ({objectId,locale,alias,senseKey,positiveCues,negativeCues,review,
   reviewedBy:review==='verified'?'test-curator':null,source:src(ref)});
const lexemes={
 en:{term:'bank',other:'BANK',a:'finance',b:'river',ca:'account balance',cb:'river water'},
 pl:{term:'zamek',other:'ZAMEK',a:'castle',b:'lock',ca:'średniowieczny zamek',cb:'klucz do drzwi'},
 es:{term:'banco',other:'BANCO',a:'finance',b:'seat',ca:'cuenta bancaria',cb:'asiento en parque'},
 de:{term:'Bank',other:'BANK',a:'finance',b:'bench',ca:'konto geld',cb:'sitzen park'},
 cs:{term:'zámek',other:'ZÁMEK',a:'castle',b:'lock',ca:'hrad věž',cb:'dveře klíč'},
 uk:{term:'ключ',other:'КЛЮЧ',a:'key',b:'spring',ca:'дверний замок',cb:'джерело води'},
 ru:{term:'лук',other:'ЛУК',a:'onion',b:'bow',ca:'зелёный лук',cb:'стрельба стрелы'}
};
for(const loc of locales){
 const l=lexemes[loc], pair=()=>[
  make(loc,l.term,A,l.a,[l.ca],[l.cb]),make(loc,l.term,B,l.b,[l.cb],[l.ca])];
 test(`M0114 ${loc} same spelling two UUIDs stays unresolved`,()=>{
  const r=senses(pair()).lookup(loc,l.term);
  assert.equal(r.status,'unresolved');assert.equal(r.reason,'multiple_verified_senses');
  assert.deepEqual(r.candidates.map(x=>x.objectId),[A,B]);assert.equal(r.autoSelectedId,null);
 });
 test(`M0114 ${loc} strong context cannot select an ON UUID`,()=>{
  const r=senses(pair()).lookup(loc,l.term,`В контексте: ${l.ca}.`);
  assert.equal(r.status,'unresolved');assert.equal(r.autoSelectedId,null);
  assert.equal(r.candidates.filter(x=>x.positiveCuesMatched.length).length,1);
  assert.equal(r.candidates.filter(x=>x.negativeCuesMatched.length).length,1);
 });
 test(`M0114 ${loc} localized uppercase alias produces same candidate set`,()=>{
  const ix=senses(pair());assert.deepEqual(ix.lookup(loc,l.term).candidates.map(x=>x.objectId),
    ix.lookup(loc,l.other).candidates.map(x=>x.objectId));
 });
 test(`M0114 ${loc} unreviewed candidate not promoted`,()=>{
  const ix=senses([make(loc,l.term,A,l.a,[l.ca],[],'candidate')]);
  const r=ix.lookup(loc,l.term);assert.equal(ix.skippedUnreviewed,1);
  assert.equal(r.status,'no_verified_sense');assert.equal(r.absenceProven,false);
 });
 test(`M0114 ${loc} one verified sense still requires human confirmation`,()=>{
  const r=senses([pair()[0]]).lookup(loc,l.term,l.ca);
  assert.equal(r.status,'review_required');assert.equal(r.reason,'manual_confirmation_required');
  assert.equal(r.autoSelectedId,null);assert.equal(r.candidates[0].reviewNeeded,true);
 });
 test(`M0114 ${loc} no matching word is not absence evidence`,()=>{
  const r=senses(pair()).lookup(loc,'not-in-this-index');
  assert.equal(r.status,'no_verified_sense');assert.equal(r.absenceProven,false);
  assert.equal(r.objectCreationAuthorized,false);assert.equal(r.scopedInputOnly,true);
 });
 test(`M0114 ${loc} prior alias index cannot merge homonymous UUIDs`,()=>{
  const rows=pair().map(({objectId,locale,alias,review,reviewedBy,source})=>({objectId,locale,alias,review,reviewedBy,source}));
  const r=aliases(rows).lookup(loc,l.term);
  assert.equal(r.status,'ambiguous');assert.deepEqual(r.candidates.map(x=>x.objectId),[A,B]);
 });
 test(`M0114 ${loc} no semantic graph relation inferred from shared word`,()=>{
  const ix=senses(pair());const g=relations([]);assert.equal(ix.lookup(loc,l.term).status,'unresolved');
  assert.equal(g.between(A,B).relations.length,0);assert.equal(g.between(B,A).relations.length,0);
 });
}
test('M0114 seven locales are precisely supported',()=>assert.deepEqual(locales,['en','pl','es','de','cs','uk','ru']));
test('M0114 rejects invalid sense key',()=>assert.throws(()=>senses([make('en','bank',A,'Bad Key')]),/SENSE_INVALID_KEY/));
test('M0114 rejects invalid locale',()=>assert.throws(()=>senses([make('fr','banque',A,'bank')]),/ALIAS_INVALID_LOCALE/));
test('M0114 rejects an absent entry',()=>assert.throws(()=>senses([null]),/SENSE_INVALID_ENTRY/));
test('M0114 rejects excessive input',()=>assert.throws(()=>senses(Array(50001).fill(null)),/SENSE_INPUT_LIMIT/));
test('M0114 rejects excessive cue list',()=>assert.throws(()=>senses([make('en','bank',A,'bank',Array(13).fill('finance'))]),/SENSE_CUE_LIMIT/));
test('M0114 rejects empty cue',()=>assert.throws(()=>senses([make('en','bank',A,'bank',[' '])]),/SENSE_INVALID_CUE/));
test('M0114 rejects contradictory positive and negative hints',()=>assert.throws(()=>senses([make('en','bank',A,'bank',['cash'],['cash'])]),/SENSE_CONTRADICTORY_CUES/));
test('M0114 rejects inconsistent verified cues for same UUID and same sense key',()=>assert.throws(()=>senses([
 make('en','bank',A,'finance',['money']),make('en','bank',A,'finance',['water'])]),/SENSE_CONFLICTING_DISCRIMINATORS/));
test('M0114 exact duplicate provenance collapses per UUID/sense',()=>{
 const entry=make('en','bank',A,'finance',['money']);const ix=senses([entry,entry]);
 assert.equal(ix.verifiedBindings,2);assert.equal(ix.lookup('en','bank').candidates.length,1);
 assert.equal(ix.lookup('en','bank').candidates[0].provenance.length,1);
});
test('M0114 independent evidence is preserved',()=>{
 const ix=senses([make('en','bank',A,'finance',['money'],[],'verified','REF1'),make('en','bank',A,'finance',['money'],[],'verified','REF2')]);
 assert.deepEqual(ix.lookup('en','bank').candidates[0].provenance.map(x=>x.reference),['REF1','REF2']);
});
test('M0114 cannot mutate stored evidence from lookup',()=>{
 const ix=senses([make('en','bank',A,'finance',['money'])]);const r=ix.lookup('en','bank');
 r.candidates[0].provenance[0].reference='tampered';r.candidates[0].positiveCuesMatched.push('tampered');
 assert.equal(ix.lookup('en','bank').candidates[0].provenance[0].reference,'M0114_FIXTURE');
 assert.deepEqual(ix.lookup('en','bank').candidates[0].positiveCuesMatched,[]);
});
test('M0114 unmatched short context tokens do not create false matches inside words',()=>{
 const ix=senses([make('en','bank',A,'finance',['bank'])]);
 assert.deepEqual(ix.lookup('en','bank','banking').candidates[0].positiveCuesMatched,[]);
});
test('M0114 review state rejected never becomes a match',()=>{
 const ix=senses([make('ru','лук',A,'onion',[],[],'rejected')]);
 assert.equal(ix.lookup('ru','лук').status,'no_verified_sense');
});
test('M0114 malformed evidence hash cannot be accepted',()=>{
 const entry=make('ru','лук',A,'onion');entry.source.evidenceSha256='bad';
 assert.throws(()=>senses([entry]),/ALIAS_SOURCE_EVIDENCE_REQUIRED/);
});
test('M0114 no inferred link, cross-locale matching or automatic ID',()=>{
 const ix=senses([make('en','bank',A,'finance'),make('pl','bank',B,'other')]);
 assert.deepEqual(ix.lookup('en','bank').candidates.map(x=>x.objectId),[A]);
 assert.deepEqual(ix.lookup('pl','bank').candidates.map(x=>x.objectId),[B]);
 assert.equal(ix.lookup('en','bank').aliasEquivalenceEstablished,false);
});
test('M0114 different senses for same UUID remain separately reviewable; no invented UUID',()=>{
 const ix=senses([make('en','bank',A,'finance'),make('en','bank',A,'slang')]);
 const r=ix.lookup('en','bank');assert.equal(r.status,'unresolved');assert.deepEqual(r.candidates.map(x=>x.objectId),[A,A]);
 assert.equal(r.autoSelectedId,null);
});
test('M0114 whitespace/case normalization follows M0112 locale policy',()=>{
 const ix=senses([make('pl','  ZAMEK ',A,'castle')]);assert.equal(ix.lookup('pl','zamek').candidates.length,1);
});
test('M0114 Polish and Czech diacritic is not erased',()=>{
 const ix=senses([make('cs','zámek',A,'castle'),make('pl','łódź',B,'city')]);
 assert.equal(ix.lookup('cs','zamek').candidates.length,0);
 assert.equal(ix.lookup('pl','lodz').candidates.length,0);
});
test('M0114 Ukrainian apostrophe typographic variants preserve equivalence',()=>{
 const ix=senses([make('uk',"п'ять",A,'number')]);
 assert.equal(ix.lookup('uk','п’ять').candidates.length,1);
});
test('M0114 invalid query and context rejected',()=>{
 const ix=senses([]);assert.throws(()=>ix.lookup('en','bank','x'.repeat(601)),/SENSE_INVALID_QUERY/);
 assert.throws(()=>ix.lookup('en',42),/SENSE_INVALID_QUERY/);
 assert.throws(()=>ix.lookup('fr','bank'),/SENSE_INVALID_LOCALE/);
});
test('M0114 input evidence and cue arrays do not get modified',()=>{
 const e=make('en','bank',A,'finance',['account']);const expected=structuredClone(e);
 const ix=senses([e]);ix.lookup('en','bank','account');assert.deepEqual(e,expected);
});
test('M0114 cannot call network, database or enable a feature flag',()=>{
 assert.doesNotMatch(source,/supabase|\.rpc\(|\.insert\(|\.update\(|fetch\(|ARCTOR_ON_INDEXED_LOOKUP|process\.env/);
});
test('M0114 never exposes a resolved ID or proof of catalog absence',()=>{
 const r=senses([make('ru','лук',A,'onion')]).lookup('ru','лук');
 assert.equal(r.autoSelectedId,null);assert.equal(r.absenceProven,false);
 assert.equal(r.objectCreationAuthorized,false);
});
