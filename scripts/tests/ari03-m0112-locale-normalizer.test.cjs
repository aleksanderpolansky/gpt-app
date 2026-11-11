'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = process.cwd();
const p = path.resolve(root,'src/lib/ontology-research/localeAliasIndexV1.ts');
const source = fs.readFileSync(p, 'utf8');
const js = ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,strict:true},reportDiagnostics:true});
assert.deepEqual(js.diagnostics?.filter(x=>x.category===ts.DiagnosticCategory.Error),[]);
const m = new Module(p,module);m.filename=p;m.paths=Module._nodeModulePaths(path.dirname(p));m._compile(js.outputText,p);
const {normalizeAliasKeyV1:normalize,buildLocaleAliasIndexV1:build,ARCTOR_ALIAS_LOCALES_V1:locales}=m.exports;
const id1='11111111-1111-4111-8111-111111111111';
const id2='22222222-2222-4222-8222-222222222222';
const sourceRecord={type:'curator_record',reference:'M0112_SYNTHETIC',version:'v1',evidenceSha256:'a'.repeat(64)};
const row=(locale,alias,objectId=id1,review='verified')=>({locale,alias,objectId,review,reviewedBy: review==='verified'?'test_curator':null,source:{...sourceRecord}});
const lookup=(rows,loc,term)=>build(rows).lookup(loc,term);
const fixtures={
 en:['HELLO World','hello world','résumé','resume'],
 pl:['ŻÓŁĆ  ĄĘŁŃŚŹŻ','żółć ąęłńśźż','łódź','lodz'],
 es:['NIÑO ÁRBOL','niño árbol','mañana','manana'],
 de:['STRASSE ÄPFEL','strasse äpfel','größe','grosse'],
 cs:['ČESKÝ  DŮM','český dům','čaj','caj'],
 uk:['ЇЖАК ҐАНОК','їжак ґанок','п’ять','пять'],
 ru:['ЁЖИК ЙОГА','ёжик йога','всё','все'],
};
for (const loc of locales) {
 const [upper,lower,accent,unaccent]=fixtures[loc];
 test('M0112 '+loc+' lowercases without removing accent marks',()=>{
  assert.equal(normalize(upper,loc),normalize(lower,loc));
  assert.notEqual(normalize(accent,loc),normalize(unaccent,loc));
 });
 test('M0112 '+loc+' supports mixed-case verified alias lookup',()=>{
  const r=lookup([row(loc,upper)],loc,lower);
  assert.deepEqual(r.candidates.map(c=>c.objectId),[id1]);
  assert.equal(r.autoSelectedId,null);assert.equal(r.absenceProven,false);
 });
 test('M0112 '+loc+' does not silently equate different words',()=>{
  const r=lookup([row(loc,accent)],loc,unaccent);
  assert.equal(r.status,'no_verified_match');
  assert.equal(r.candidates.length,0);assert.equal(r.absenceProven,false);
 });
 test('M0112 '+loc+' keeps distinct UUID collisions ambiguous',()=>{
  const r=lookup([row(loc,upper,id1),row(loc,lower,id2)],loc,lower);
  assert.equal(r.status,'ambiguous');
  assert.deepEqual(r.candidates.map(c=>c.objectId),[id1,id2]);assert.equal(r.autoSelectedId,null);
 });
}
const canonPairs=[
 ['pl','ŁÓDŹ','łódź'],['pl','ŻURAW','żuraw'],['cs','ČAJ','čaj'],['cs','DŮM','dům'],
 ['es','NIÑA','niña'],['de','GRÖßE','größe'],['uk','ҐУДЗИК','ґудзик'],['ru','ЁЛКА','ёлка'],['en','CAFÉ','café'],
];
for (const [loc,a,b] of canonPairs) test('M0112 '+loc+' casing specific: '+a,()=>{
 assert.equal(normalize(a,loc),normalize(b,loc));
});
test('M0112 locales are exactly seven and in approved order',()=>{
 assert.deepEqual(locales,['en','pl','es','de','cs','uk','ru']);
});
test('M0112 NFC/NFD equivalent accents remain one spelling',()=>{
 assert.equal(normalize('Zażółć','pl'),normalize('Zażółć','pl'));
 assert.equal(normalize('dítě','cs'),normalize('dítě','cs'));
});
test('M0112 does not discard meaningful Polish consonant diacritics',()=>{
 for(const [a,b] of [['ą','a'],['ć','c'],['ę','e'],['ł','l'],['ń','n'],['ó','o'],['ś','s'],['ź','z'],['ż','z']])
  assert.notEqual(normalize(a,'pl'),normalize(b,'pl'));
});
test('M0112 does not discard Czech diacritics',()=>{
 for(const [a,b] of [['č','c'],['ď','d'],['ě','e'],['ň','n'],['ř','r'],['š','s'],['ť','t'],['ů','u'],['ž','z']])
  assert.notEqual(normalize(a,'cs'),normalize(b,'cs'));
});
test('M0112 preserves Spanish ñ and accented vowels',()=>{
 assert.notEqual(normalize('niño','es'),normalize('nino','es'));
 assert.notEqual(normalize('sí','es'),normalize('si','es'));
});
test('M0112 preserves German umlaut and ß distinct from transliteration',()=>{
 assert.notEqual(normalize('ä','de'),normalize('a','de'));
 assert.notEqual(normalize('straße','de'),normalize('strasse','de'));
});
test('M0112 preserves Ukrainian ї, і, є, ґ differences',()=>{
 for(const [a,b] of [['ї','і'],['є','е'],['ґ','г']])assert.notEqual(normalize(a,'uk'),normalize(b,'uk'));
});
test('M0112 Ukrainian typographic apostrophes equivalent',()=>{
 const entries=[row('uk',"п'ять")];
 for(const q of ["П’ЯТЬ",'пʼять',"п'ять"])assert.equal(lookup(entries,'uk',q).candidates.length,1);
});
test('M0112 Ukrainian apostrophe punctuation not erased',()=>{
 assert.notEqual(normalize("п'ять",'uk'),normalize('пять','uk'));
});
test('M0112 Ukrainian punctuation normalization stays locale scoped',()=>{
 assert.notEqual(normalize('a’b','en'),normalize("a'b",'en'));
 assert.equal(normalize('a’b','uk'),normalize("a'b",'uk'));
});
test('M0112 Russian ё and е remain distinct until verified',()=>{
 assert.notEqual(normalize('всё','ru'),normalize('все','ru'));
 assert.equal(lookup([row('ru','всё')],'ru','все').candidates.length,0);
});
test('M0112 trims Unicode spaces and normalizes internal whitespace',()=>{
 assert.equal(normalize('  Káva\u00a0  mléko  ','cs'),'káva mléko');
});
test('M0112 whitespace normalization preserves order, no bag-of-words',()=>{
 assert.notEqual(normalize('A B','en'),normalize('B A','en'));
});
test('M0112 NFKC compatibility form normalizes fullwidth letters',()=>{
 assert.equal(normalize('ＡＢＣ','en'),normalize('abc','en'));
});
test('M0112 no transliteration between scripts',()=>{
 assert.notEqual(normalize('roma','en'),normalize('рома','ru'));
});
test('M0112 invalid locale fails closed',()=>{
 assert.throws(()=>normalize('child','fr'),/ALIAS_INVALID_LOCALE/);
});
test('M0112 empty normalized query never proves absence',()=>{
 const r=lookup([row('pl','łódź')],'pl','    ');assert.equal(r.absenceProven,false);assert.equal(r.candidates.length,0);
});
test('M0112 unreviewed forms excluded even after case normalization',()=>{
 const r=lookup([row('pl','ŁÓDŹ',id1,'candidate')],'pl','łódź');
 assert.equal(r.candidates.length,0);
});
test('M0112 same UUID across locales preserved without cloning',()=>{
 const ix=build(locales.map(loc=>row(loc,fixtures[loc][2])));
 for(const loc of locales)assert.equal(ix.lookup(loc,fixtures[loc][2]).candidates[0].objectId,id1);
 assert.equal(ix.verifiedBindings,7);
});
test('M0112 readonly lookup result cannot mutate future lookup',()=>{
 const ix=build([row('pl','ŻÓŁĆ')]);
 const r=ix.lookup('pl','żółć');r.candidates[0].provenance[0].reference='spoofed';
 assert.equal(ix.lookup('pl','żółć').candidates[0].provenance[0].reference,sourceRecord.reference);
});
test('M0112 M0111 one-argument function remains backward-compatible',()=>{
 assert.equal(normalize('  CHILD   '),'child');
});
test('M0112 no DB, auto UUID or API integration in normalizer',()=>{
 assert.ok(!/supabase|\.rpc\(|\.insert\(|\.update\(|fetch\(/.test(source));
 assert.ok(!/process\.env|ARCTOR_ON_INDEXED_LOOKUP/.test(source));
});
