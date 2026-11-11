'use strict';
/** M-0115: FROZEN, SYNTHETIC seven-locale lexical-form fixtures, not DB vocabulary or morphology truth. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const modulePath=path.resolve(process.cwd(),'src/lib/ontology-research/localeAliasIndexV1.ts');
const source=fs.readFileSync(modulePath,'utf8');
const transpiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,strict:true},reportDiagnostics:true});
assert.deepEqual(transpiled.diagnostics?.filter(x=>x.category===ts.DiagnosticCategory.Error),[]);
const mod=new Module(modulePath,module);mod.filename=modulePath;mod.paths=Module._nodeModulePaths(path.dirname(modulePath));mod._compile(transpiled.outputText,modulePath);
const {ARCTOR_ALIAS_LOCALES_V1:locales,normalizeAliasKeyV1:normalize,
 buildLocaleAliasIndexV1:buildAlias,buildLocaleSenseIndexV1:buildSense,
 buildBroaderNarrowerIndexV1:buildRelation}=mod.exports;
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
const C='33333333-3333-4333-8333-333333333333';
const sourceRef=(ref)=>({type:'curator_record',reference:'M0115_SYNTHETIC_'+ref,version:'frozen-v1',evidenceSha256:'a'.repeat(64)});
const entry=(locale,alias,id=A,review='verified')=>({objectId:id,locale,alias,review,
 reviewedBy:review==='verified'?'fixture-moderator':null,source:sourceRef(locale+'_'+alias)});
const makeSense=(locale,alias,id,senseKey)=>({...entry(locale,alias,id),senseKey,positiveCues:['verified cue'],negativeCues:[]});
const corpus=Object.freeze({
 en:{forms:['night sleep',"night's sleep",'sleep at night'],nonform:'overnight sleep',distinct:'Night-Sleep',mark:'café',plain:'cafe',collision:'bank'},
 pl:{forms:['sen nocny','snu nocnego','snem nocnym'],nonform:'snu nocnemu',distinct:'sen-nocny',mark:'łódź',plain:'lodz',collision:'zamek'},
 es:{forms:['sueño nocturno','del sueño nocturno','sueño de noche'],nonform:'del sueño de noche',distinct:'sueño-nocturno',mark:'niño',plain:'nino',collision:'banco'},
 de:{forms:['Nachtschlaf','des Nachtschlafs','nächtlicher Schlaf'],nonform:'nachtschlafes',distinct:'Nacht-Schlaf',mark:'Straße',plain:'Strasse',collision:'Bank'},
 cs:{forms:['noční spánek','nočního spánku','nočním spánkem'],nonform:'nočního spánek',distinct:'noční-spánek',mark:'čaj',plain:'caj',collision:'zámek'},
 uk:{forms:['нічний сон','нічного сну','нічним сном'],nonform:'нічному сну',distinct:'нічний-сон',mark:'ґанок',plain:'ганок',collision:'ключ'},
 ru:{forms:['ночной сон','ночного сна','ночным сном'],nonform:'ночному сну',distinct:'ночной-сон',mark:'ёж',plain:'еж',collision:'лук'},
});
const order=['en','pl','es','de','cs','uk','ru'];
test('M0115 frozen locale list exactly matches seven platform locales',()=>assert.deepEqual([...locales],order));
test('M0115 frozen fixture has one entry for every locale',()=>assert.deepEqual(Object.keys(corpus),order));
for(const locale of locales){
 const f=corpus[locale], verified=f.forms.map(x=>entry(locale,x));
 test(`M0115 ${locale} each of three explicitly verified lexical forms retains one UUID`,()=>{
  const ix=buildAlias(verified);
  for(const form of f.forms){
   const r=ix.lookup(locale,form);
   assert.equal(r.status,'candidates');assert.deepEqual(r.candidates.map(x=>x.objectId),[A]);
   assert.equal(r.autoSelectedId,null);assert.equal(r.absenceProven,false);assert.equal(r.scopedInputOnly,true);
  }
 });
 test(`M0115 ${locale} missing inflection is NOT manufactured from forms`,()=>{
  const r=buildAlias(verified).lookup(locale,f.nonform);
  assert.equal(r.status,'no_verified_match');assert.deepEqual(r.candidates,[]);assert.equal(r.absenceProven,false);
 });
 test(`M0115 ${locale} missing form can be independently reviewed and added`,()=>{
  const ix=buildAlias([...verified,entry(locale,f.nonform)]);
  assert.deepEqual(ix.lookup(locale,f.nonform).candidates.map(x=>x.objectId),[A]);
 });
 test(`M0115 ${locale} rejected and candidate variants remain excluded`,()=>{
  const ix=buildAlias([entry(locale,f.nonform,A,'candidate'),entry(locale,f.nonform,B,'rejected')]);
  assert.equal(ix.skippedUnreviewed,2);assert.equal(ix.lookup(locale,f.nonform).status,'no_verified_match');
 });
 test(`M0115 ${locale} Unicode NFKC and case do not alter authorized UUID identity`,()=>{
  const txt=f.forms[0];const ix=buildAlias(verified);
  const r=ix.lookup(locale,`  ${txt.toUpperCase()}  `);
  assert.deepEqual(r.candidates.map(x=>x.objectId),[A]);assert.equal(normalize(`  ${txt.toUpperCase()}  `,locale),normalize(txt,locale));
 });
 test(`M0115 ${locale} hyphenated and spaced name are not assumed equivalent`,()=>{
  const r=buildAlias(verified).lookup(locale,f.distinct);
  assert.equal(r.status,'no_verified_match');
 });
 test(`M0115 ${locale} diacritic distinctions must not be silently folded`,()=>{
  assert.notEqual(normalize(f.mark,locale),normalize(f.plain,locale));
  const ix=buildAlias([entry(locale,f.mark)]);
  assert.equal(ix.lookup(locale,f.plain).status,'no_verified_match');
 });
 test(`M0115 ${locale} homonym collision returns all UUIDs`,()=>{
  const ix=buildAlias([entry(locale,f.collision,A),entry(locale,f.collision,B)]);
  assert.equal(ix.lookup(locale,f.collision).status,'ambiguous');
  assert.deepEqual(ix.lookup(locale,f.collision).candidates.map(x=>x.objectId),[A,B]);
 });
 test(`M0115 ${locale} context may not disambiguate collision automatically`,()=>{
  const ix=buildSense([makeSense(locale,f.collision,A,'sense_one'),makeSense(locale,f.collision,B,'sense_two')]);
  const r=ix.lookup(locale,f.collision,'verified cue');
  assert.equal(r.status,'unresolved');assert.equal(r.autoSelectedId,null);assert.equal(r.candidates.length,2);
  assert.equal(r.objectCreationAuthorized,false);
 });
 test(`M0115 ${locale} cannot transform broader/narrower relation into an alias`,()=>{
  const relations=buildRelation([{broaderObjectId:C,narrowerObjectId:A,review:'verified',reviewedBy:'fixture-moderator',source:sourceRef('relation')}]);
  assert.equal(relations.between(C,A).status,'relations');
  assert.equal(buildAlias(verified).lookup(locale,f.collision).status,'no_verified_match');
 });
 test(`M0115 ${locale} cross-language identical text does not leak alias`,()=>{
  const other=order[(order.indexOf(locale)+1)%order.length];
  const ix=buildAlias([entry(locale,f.forms[0])]);
  assert.equal(ix.lookup(other,f.forms[0]).status,'no_verified_match');
 });
}
test('M0115 approved distinct locale forms of one entity can share one UUID across seven locales',()=>{
 const index=buildAlias(order.map(loc=>entry(loc,corpus[loc].forms[0],A)));
 for(const loc of order)assert.deepEqual(index.lookup(loc,corpus[loc].forms[0]).candidates.map(x=>x.objectId),[A]);
 assert.equal(index.verifiedBindings,7);
});
test('M0115 same spelling may map to distinct UUIDs even if form is otherwise verified',()=>{
 const ix=buildAlias([entry('ru','сон',A),entry('ru','сон',B)]);
 assert.equal(ix.lookup('ru','сон').status,'ambiguous');
});
test('M0115 Ukrainian apostrophe typographic variants are normalized, but apostrophe removal is not',()=>{
 const ix=buildAlias([entry('uk',"п'ять",A)]);
 for(const word of ["п'ять",'п’ять','пʼять'])assert.equal(ix.lookup('uk',word).candidates.length,1);
 assert.equal(ix.lookup('uk','пять').status,'no_verified_match');
});
test('M0115 Ukrainian ї / і, є / е remain distinct',()=>{
 for(const pair of [['ї','і'],['є','е']])assert.notEqual(normalize(pair[0],'uk'),normalize(pair[1],'uk'));
});
test('M0115 Cyrillic vs lookalike Latin input never auto-transliterates',()=>{
 const ix=buildAlias([entry('ru','сон',A),entry('uk','сон',B)]);
 assert.equal(ix.lookup('ru','coн').status,'no_verified_match'); // c/o Latin, н Cyrillic
 assert.equal(ix.lookup('uk','coн').status,'no_verified_match');
});
test('M0115 Russian ё, й and Ukrainian ґ stay distinct letters',()=>{
 for(const [loc,a,b] of [['ru','ё','е'],['ru','й','и'],['uk','ґ','г']])assert.notEqual(normalize(a,loc),normalize(b,loc));
});
test('M0115 Polish ł, ą and Czech č, ř stay distinct',()=>{
 for(const [loc,a,b] of [['pl','ł','l'],['pl','ą','a'],['cs','č','c'],['cs','ř','r']])assert.notEqual(normalize(a,loc),normalize(b,loc));
});
test('M0115 German ß vs ss and Spanish ñ vs n stay distinct',()=>{
 assert.notEqual(normalize('Straße','de'),normalize('Strasse','de'));
 assert.notEqual(normalize('niño','es'),normalize('nino','es'));
});
test('M0115 single verified form still requires human confirmation when treated as sense evidence',()=>{
 const ix=buildSense([makeSense('en','bank',A,'finance')]);
 const r=ix.lookup('en','bank','verified cue');assert.equal(r.status,'review_required');assert.equal(r.autoSelectedId,null);
});
test('M0115 no verified input never proves no such ON exists globally',()=>{
 for(const locale of order){const r=buildAlias([]).lookup(locale,corpus[locale].forms[0]);assert.equal(r.absenceProven,false);}
});
test('M0115 source contains no network calls, DB write, environment feature flip',()=>{
 assert.doesNotMatch(source,/supabase|\.rpc\(|\.insert\(|\.update\(|fetch\(|ARCTOR_ON_INDEXED_LOOKUP|process\.env/);
});
test('M0115 no changes to code/relations or model through query',()=>{
 const entries=[entry('pl','zamek',A),entry('pl','zamek',B)];const before=structuredClone(entries);
 const index=buildAlias(entries);index.lookup('pl','zamek');assert.deepEqual(entries,before);
});
