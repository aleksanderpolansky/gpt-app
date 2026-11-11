'use strict';
/** M-0107 ARI-03.03.04: full own title dominates definition and ontology paths. */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),Module=require('node:module');
const REPO=path.resolve(__dirname,'../..');
const HEAD='675521c8151a18cb6f53ae6339e9663d831712ef';
const ts=require(path.join(REPO,'node_modules','typescript'));
const file=path.join(REPO,'src/lib/ontology-research/lexicalRetrievalV1.ts');
assert.equal(cp.execFileSync('git',['rev-parse','HEAD'],{cwd:REPO,encoding:'utf8'}).trim(),HEAD);
const source=fs.readFileSync(file,'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const m=new Module(file,module);m.filename=file;m.paths=Module._nodeModulePaths(path.dirname(file));m._compile(js,file);
const {retrieveWeightedLexicalV1:run,LEXICAL_FIELD_WEIGHTS_V1:W}=m.exports;
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const v=(text,locale='ru')=>({locale,text});
const candidate=(n,title,extra={})=>({id:id(n),role:'leaf',titles:[v(title)],...extra});
const search=(text,rows,locale='ru',limit=20)=>run({query:text,locale,limit,authorizedCandidates:rows});
const ordered=x=>x.results.map(y=>y.id);
const verifiedAlias=(text,n)=>({locale:'ru',text,targetId:id(n),registry:'concept_aliases',registryStatus:'published',targetResolved:true,curatorVerified:true});

test('M0107 explicit title > verified alias > prefix > partial > description > definition > path',()=>{
 assert.ok(W.exact_title>W.verified_exact_alias&&W.verified_exact_alias>W.phrase_prefix_title&&W.phrase_prefix_title>W.partial_title&&W.partial_title>W.description_match&&W.description_match>W.definition_match&&W.definition_match>W.path_only);
});
test('M0107 exact own title always beats exact definition in another ON',()=>{
 const x=search('Ночной сон',[candidate(1,'Бодрствование',{definitions:[v('Ночной сон')]}),candidate(2,'Ночной сон')]);
 assert.deepEqual(ordered(x),[id(2),id(1)]);assert.equal(x.results[0].score,1000);assert.equal(x.results[1].matchClass,'definition_match');
});
test('M0107 exact title beats title repeated in ontology parent path',()=>{
 const x=search('Ночной сон',[candidate(1,'Световой режим',{paths:[v('Состояния › Ночной сон')]}),candidate(2,'Ночной сон')]);
 assert.deepEqual(ordered(x),[id(2),id(1)]);assert.equal(x.results[1].matchClass,'path_only');
});
test('M0107 exact title beats arbitrary number of weak path/definition candidates',()=>{
 const weak=Array.from({length:100},(_,i)=>candidate(i+10,'Другой ОН',{definitions:[v('Ночной сон')],paths:[v('Ночной сон')]}));
 const x=search('Ночной сон',[...weak,candidate(1,'Ночной сон')], 'ru', 20);
 assert.equal(x.results[0].id,id(1));assert.equal(x.totalMatched,101);assert.equal(x.truncated,true);
});
test('M0107 original title wins within same ON even when definition/path matches',()=>{
 const x=search('Ночной сон',[candidate(1,'Ночной сон',{definitions:[v('Ночной сон')],paths:[v('Ночной сон')]})]);
 assert.equal(x.results[0].matchClass,'exact_title');assert.equal(x.results[0].evidence.field,'title');
});
test('M0107 partial title outranks exact definition across ONs',()=>{
 const x=search('Ночной сон',[candidate(1,'Тест',{definitions:[v('Ночной сон')]}),candidate(2,'Ночной сон человека')]);
 assert.deepEqual(ordered(x),[id(2),id(1)]);
});
test('M0107 published verified alias outranks definition',()=>{
 const x=search('Ночной сон',[candidate(1,'Покой',{aliases:[verifiedAlias('Ночной сон',1)]}),candidate(2,'Бодрствование',{definitions:[v('Ночной сон')]})]);
 assert.deepEqual(ordered(x),[id(1),id(2)]);
});
test('M0107 definition is weaker than description',()=>{
 const x=search('Ночной сон',[candidate(1,'X',{definitions:[v('Ночной сон')]}),candidate(2,'Y',{descriptions:[v('Ночной сон')]})]);
 assert.deepEqual(ordered(x),[id(2),id(1)]);
});
test('M0107 definition stronger than path, but neither proves identity',()=>{
 const x=search('Ночной сон',[candidate(1,'X',{paths:[v('Ночной сон')]}),candidate(2,'Y',{definitions:[v('Ночной сон')]})]);
 assert.deepEqual(ordered(x),[id(2),id(1)]);assert.equal(x.results[0].confirmed,false);assert.equal(x.autoSelected,false);
});
test('M0107 definition cannot be mistaken for exact_title',()=>{
 const x=search('Ночной сон',[candidate(1,'X',{definitions:[v('Ночной сон')]})]);
 assert.equal(x.results[0].matchClass,'definition_match');assert.equal(x.results[0].score,60);assert.equal(x.results[0].evidence.field,'definition');
});
test('M0107 path-only cannot be mistaken for exact_title',()=>{
 const x=search('Ночной сон',[candidate(1,'X',{paths:[v('Ночной сон')]})]);
 assert.equal(x.results[0].matchClass,'path_only');assert.equal(x.results[0].score,20);
});
test('M0107 path matching not inferred as structural relation',()=>{
 const x=search('Ночной сон',[candidate(1,'X',{paths:[v('Сон › Ночной сон')]})]);
 assert.equal(x.results[0].evidence.field,'path');assert.equal(x.results[0].confirmed,false);
});
test('M0107 no definition returns no match for unrelated object',()=>assert.equal(search('Ночной сон',[candidate(1,'Ночной Бред')]).totalMatched,0));
test('M0107 empty definition does not match',()=>assert.equal(search('сон',[candidate(1,'X',{definitions:[v('')]})]).totalMatched,0));
test('M0107 wrong-locale definition cannot match',()=>assert.equal(search('сон',[candidate(1,'X',{definitions:[v('сон','en')]})]).totalMatched,0));
test('M0107 unknown locale on definition is rejected',()=>assert.throws(()=>search('сон',[candidate(1,'X',{definitions:[v('сон','fr')]})]),/M0105_INVALID_TEXT/));
test('M0107 too-long definition rejected',()=>assert.throws(()=>search('сон',[candidate(1,'X',{definitions:[v('а'.repeat(4001))]})]),/M0105_INVALID_TEXT/));
test('M0107 too many definition variants rejected',()=>assert.throws(()=>search('сон',[candidate(1,'X',{definitions:Array.from({length:33},()=>v('сон'))})]),/M0105_INVALID_VARIANTS/));
test('M0107 invalid definition collection rejected',()=>assert.throws(()=>search('сон',[candidate(1,'X',{definitions:'сон'})]),/M0105_INVALID_VARIANTS/));
test('M0107 strict ё/е not merged even inside definitions',()=>assert.equal(search('елка',[candidate(1,'X',{definitions:[v('ёлка')]})]).totalMatched,0));
test('M0107 German diacritics preserved inside definitions',()=>assert.equal(search('schon',[candidate(1,'X',{definitions:[v('schön','de')]})],'de').totalMatched,0));
test('M0107 punctuation C++/C remains distinct',()=>assert.equal(search('C++',[candidate(1,'X',{paths:[v('C','en')]})],'en').totalMatched,0));
test('M0107 exact title ties keep both UUIDs, no auto select',()=>{
 const rows=[candidate(2,'Ночной сон'),candidate(1,'Ночной сон')],x=search('Ночной сон',rows);
 assert.deepEqual(ordered(x),[id(1),id(2)]);assert.equal(x.autoSelected,false);assert.ok(x.results.every(y=>y.confirmed===false));
});
test('M0107 exact title can survive top1 despite many path matches',()=>{
 const rows=[...Array.from({length:30},(_,i)=>candidate(i+2,'X',{paths:[v('Ночной сон')]})),candidate(1,'Ночной сон')],x=search('Ночной сон',rows,'ru',1);
 assert.equal(x.results.length,1);assert.equal(x.results[0].id,id(1));assert.equal(x.truncated,true);
});
test('M0107 no silent translation and no fallback from other locale',()=>{
 const x=search('Ночной сон',[{id:id(1),role:'leaf',titles:[v('Night sleep','en')],definitions:[v('Ночной сон','ru')]}],'en');
 assert.equal(x.totalMatched,0);
});
test('M0107 contract remains compatible with M0105/M0106',()=>{
 const x=search('Ночной сон',[candidate(1,'Ночной сон')]);
 assert.equal(x.contract,'ARCTOR_ARI_M0105_WEIGHTED_LEXICAL_V1');assert.equal(x.aliasRegistryVerifiedByScorer,false);assert.equal(x.authorizationVerifiedByScorer,false);
});
