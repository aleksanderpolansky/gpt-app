'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const ts=require(require.resolve('typescript',{paths:[process.cwd(),'/opt/nvm/versions/node/v22.16.0/lib/node_modules']}));
const loc=process.env.ARCTOR_M0127_TEST_MODULE_PATH||path.join(process.cwd(),'src/lib/ontology-research/hybridRankerV1.ts');
function load(p){const t=ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});assert.equal(t.diagnostics?.length||0,0);const m=new Module(p,module);m.filename=p;m.paths=Module._nodeModulePaths(path.dirname(p));m._compile(t.outputText,p);return m.exports;}
const H=load(loc);
const IDs=['11111111-2222-4333-8444-555555555555','22222222-3333-4444-8555-666666666666','33333333-4444-4555-8666-777777777777','44444444-5555-4666-8777-888888888888'];
const [A,B,C,D]=IDs,owner='66666666-7777-4888-8999-aaaaaaaaaaaa',other='77777777-8888-4999-8aaa-bbbbbbbbbbbb';
const glob={kind:'global_system'},priv={kind:'owner_private',ownerActorId:owner};
const cand=(onId,rank,more={})=>({onId,rank,locale:'ru',scope:glob,...more});
const title=(onId,text,more={})=>({onId,text,scope:glob,locale:'ru',kind:'canonical_title',...more});
const alias=(onId,text,status='verified_active',more={})=>({onId,text,scope:glob,locale:'ru',kind:'alias',aliasStatus:status,...more});
const inp=(lexical=[],vector=[],evidence=[],opts={})=>({lexical,vector,query:{text:'ночной сон',locale:'ru'},evidence,...opts});
const run=i=>H.rankHybridCandidatesWithExactPriorityV1(i);
const ok=i=>{const r=run(i);assert.equal(r.ok,true,JSON.stringify(r));return r;};
const reject=(i,reason)=>{const r=run(i);assert.equal(r.ok,false);assert.equal(r.reason,reason);assert.deepEqual(r.candidates,[]);assert.equal(r.exactBoostApplied,false)};
const ids=r=>r.candidates.map(x=>x.onId);
const lex=[cand(A,1),cand(B,2),cand(C,3),cand(D,4)],vec=[cand(A,1),cand(B,2),cand(C,3),cand(D,4)];

test('new M0127 contract',()=>assert.equal(H.HYBRID_EXACT_PRIORITY_CONTRACT_V1,'ARCTOR_ARI03_M0127_EXACT_VERIFIED_ALIAS_PRIORITY_V1'));
test('old M0126 contract intact',()=>assert.equal(H.HYBRID_RRF_CONTRACT_V1,'ARCTOR_ARI03_M0126_RRF_K60_V1'));
test('old M0125 contract intact',()=>assert.equal(H.HYBRID_MERGE_CONTRACT_V1,'ARCTOR_ARI03_M0125_UUID_CANDIDATE_MERGE_V1'));
test('empty inputs',()=>{const r=ok(inp());assert.deepEqual(r.candidates,[]);assert.equal(r.exactBoostApplied,false)});
test('default exact feature enabled',()=>assert.equal(ok(inp([cand(A,1)])).exactPriorityEnabled,true));
test('canonical title beats RRF first',()=>assert.equal(ids(ok(inp(lex,vec,[title(D,'ночной сон')])))[0],D));
test('verified alias beats RRF first',()=>assert.equal(ids(ok(inp(lex,vec,[alias(D,'ночной сон')])))[0],D));
test('canonical title beats verified alias even if worse RRF',()=>assert.deepEqual(ids(ok(inp(lex,vec,[alias(A,'ночной сон'),title(D,'ночной сон')]))),[D,A,B,C]));
test('reversed evidence does not change order',()=>{const ev=[alias(A,'ночной сон'),title(D,'ночной сон')];assert.deepEqual(ok(inp(lex,vec,ev)),ok(inp(lex,vec,[...ev].reverse())))});
test('canonical priority is 2',()=>assert.equal(ok(inp(lex,vec,[title(D,'ночной сон')])).candidates[0].matchPriority,2));
test('verified alias priority is 1',()=>assert.equal(ok(inp(lex,vec,[alias(D,'ночной сон')])).candidates[0].matchPriority,1));
test('unmatched candidate priority 0',()=>assert.equal(ok(inp(lex,vec,[])).candidates[0].matchPriority,0));
test('canonical match kind',()=>assert.equal(ok(inp(lex,vec,[title(D,'ночной сон')])).candidates[0].matchKind,'canonical_title'));
test('verified alias match kind',()=>assert.equal(ok(inp(lex,vec,[alias(D,'ночной сон')])).candidates[0].matchKind,'verified_alias'));
test('none match kind null',()=>assert.equal(ok(inp(lex,vec,[])).candidates[0].matchKind,null));
test('match preserved once across lexical/vector',()=>{const r=ok(inp([cand(A,1),cand(A,2)],[cand(A,1)],[title(A,'ночной сон')]));assert.equal(r.candidates.length,1);assert.equal(r.deduplicatedCount,2)});
test('ranking after boost 1-based',()=>assert.deepEqual(ok(inp(lex,vec,[title(D,'ночной сон')])).candidates.map(x=>x.finalRank),[1,2,3,4]));
test('rrf scores untouched by boost',()=>{const a=H.rankHybridCandidatesRrfV1({lexical:lex,vector:vec});const b=ok(inp(lex,vec,[title(D,'ночной сон')]));for(const v of b.candidates)assert.equal(v.rrfScore,a.candidates.find(x=>x.onId===v.onId).rrfScore)});
test('rrf ranks untouched by boost',()=>{const a=H.rankHybridCandidatesRrfV1({lexical:lex,vector:vec});const b=ok(inp(lex,vec,[title(D,'ночной сон')]));for(const v of b.candidates)assert.equal(v.rrfRank,a.candidates.find(x=>x.onId===v.onId).rrfRank)});
test('rawScore not reflected',()=>{const r=ok(inp([cand(A,1,{rawScore:1e30})],[],[title(A,'ночной сон')]));assert.equal('rawScore' in r.candidates[0],false)});
test('default matching preserves RRF when no match',()=>{const r=ok(inp(lex,vec,[title(D,'другое')]));assert.deepEqual(ids(r),ids(H.rankHybridCandidatesRrfV1({lexical:lex,vector:vec})));assert.equal(r.exactBoostApplied,false)});
test('title tie follows old RRF order',()=>assert.deepEqual(ids(ok(inp(lex,vec,[title(A,'ночной сон'),title(D,'ночной сон')]))),[A,D,B,C]));
test('alias tie follows old RRF order',()=>assert.deepEqual(ids(ok(inp(lex,vec,[alias(A,'ночной сон'),alias(D,'ночной сон')]))),[A,D,B,C]));
test('upgrading same UUID alias to title',()=>{const r=ok(inp(lex,vec,[alias(D,'ночной сон'),title(D,'ночной сон')]));assert.equal(r.candidates[0].matchPriority,2)});
test('evidence duplicates do not inflate',()=>{const r=ok(inp(lex,vec,Array.from({length:100},()=>alias(D,'ночной сон'))));assert.equal(r.candidates[0].matchPriority,1);assert.equal(r.candidates.length,4)});
test('pending alias ignored',()=>{const r=ok(inp(lex,vec,[alias(D,'ночной сон','pending')]));assert.equal(r.exactBoostApplied,false);assert.deepEqual(ids(r),[A,B,C,D])});
test('revoked alias ignored',()=>{const r=ok(inp(lex,vec,[alias(D,'ночной сон','revoked')]));assert.equal(r.exactBoostApplied,false);assert.deepEqual(ids(r),[A,B,C,D])});
test('alias with verified status needs identical whole query',()=>assert.equal(ok(inp(lex,vec,[alias(D,'ночной сон сегодня')])).exactBoostApplied,false));
test('substring not enough',()=>assert.equal(ok(inp(lex,vec,[title(D,'сон')])).exactBoostApplied,false));
test('punctuation preserved',()=>assert.equal(ok(inp(lex,vec,[title(D,'ночной сон!')])).exactBoostApplied,false));
test('accents preserved',()=>{const r=ok(inp(lex,vec,[title(D,'nóchnoy сон')]));assert.equal(r.exactBoostApplied,false)});
test('NFKC maps full width forms',()=>{const i=inp(lex,vec,[title(D,'ＡＢＣ')],{query:{text:'ABC',locale:'ru'}});assert.equal(ok(i).candidates[0].onId,D)});
test('trim and casefold entire query',()=>{const r=ok(inp(lex,vec,[title(D,'  НОЧНОЙ   СОН  ')]));assert.equal(r.candidates[0].onId,D)});
test('whitespace collapsed',()=>assert.equal(ok(inp(lex,vec,[title(D,'ночной\n\tсон')])).candidates[0].onId,D));
test('locale mismatch never grants boost',()=>assert.equal(ok(inp(lex,vec,[title(D,'ночной сон',{locale:'pl'})])).exactBoostApplied,false));
test('disabled flag returns exact M0126 order',()=>{const i=inp(lex,vec,[title(D,'ночной сон')],{enableExactPriority:false});const r=ok(i),p=H.rankHybridCandidatesRrfV1({lexical:lex,vector:vec});assert.deepEqual(ids(r),ids(p));assert.equal(r.exactBoostApplied,false);assert.equal(r.rankPolicy,'RRF_K60_ROLLBACK')});
test('disabled flag ignores broken metadata',()=>{const r=ok(inp(lex,vec,null,{enableExactPriority:false}));assert.equal(r.exactPriorityEnabled,false)});
test('disabled flag retains rrf scores and rank',()=>{const r=ok(inp(lex,vec,null,{enableExactPriority:false}));r.candidates.forEach(x=>assert.equal(x.finalRank,x.rrfRank))});
test('enabled flag explicit true',()=>assert.equal(ok(inp(lex,vec,[title(D,'ночной сон')],{enableExactPriority:true})).candidates[0].onId,D));
test('fails closed invalid UUID',()=>reject(inp([cand('invalid',1)]), 'INVALID_UUID'));
test('fails closed scope collision',()=>reject(inp([cand(A,1)], [cand(A,1,{scope:priv})]), 'SCOPE_CONFLICT'));
test('evidence unknown ID rejected',()=>reject(inp([cand(A,1)],[],[title(D,'ночной сон')]),'EVIDENCE_UNKNOWN_UUID'));
test('evidence private vs global mismatch rejected',()=>reject(inp([cand(A,1)],[],[title(A,'ночной сон',{scope:priv})]),'EVIDENCE_SCOPE_CONFLICT'));
test('evidence global vs private mismatch rejected',()=>reject(inp([cand(A,1,{scope:priv})],[],[title(A,'ночной сон')]),'EVIDENCE_SCOPE_CONFLICT'));
test('owner private matches same owner',()=>assert.equal(ok(inp([cand(A,1,{scope:priv})],[],[title(A,'ночной сон',{scope:priv})])).candidates[0].matchPriority,2));
test('owner mismatch fails closed',()=>reject(inp([cand(A,1,{scope:priv})],[],[title(A,'ночной сон',{scope:{kind:'owner_private',ownerActorId:other}})]),'EVIDENCE_SCOPE_CONFLICT'));
test('input object not modified',()=>{const e=Object.freeze(title(A,'ночной сон')),c=Object.freeze(cand(A,1)),q=Object.freeze({text:'ночной сон',locale:'ru'});ok({lexical:Object.freeze([c]),vector:Object.freeze([]),query:q,evidence:Object.freeze([e])});assert.equal(q.text,'ночной сон')});
test('no fetch/sql/openai calls in ranker source',()=>assert.doesNotMatch(fs.readFileSync(loc,'utf8'),/\bfetch\s*\(|https?\.request|createClient\s*\(|process\.env|OPENAI_API_KEY|Math\.random/i));
test('legacy merge remains unranked',()=>{const r=H.mergeHybridCandidatesByUuidV1({lexical:lex,vector:vec});assert.equal(r.rrfApplied,false);assert.equal(r.exactBoostApplied,false)});
test('legacy RRF remains no exact boost',()=>{const r=H.rankHybridCandidatesRrfV1({lexical:lex,vector:vec});assert.equal(r.exactBoostApplied,false)});

for(const [name,x] of [
 ['null',null],['undefined',undefined],['missing',{}],['query null',{query:null}],['query array',{query:[]}],
 ['empty text',{query:{text:'',locale:'ru'}}],['whitespace',{query:{text:'  ',locale:'ru'}}],
 ['wrong type text',{query:{text:55,locale:'ru'}}],['missing locale',{query:{text:'abc'}}],
 ['invalid locale',{query:{text:'abc',locale:'fr'}}],['oversized text',{query:{text:'x'.repeat(2001),locale:'ru'}}],
 ['invalid flag',{enableExactPriority:'false'}]
])test('reject invalid query '+name,()=>{const i=inp([cand(A,1)]);Object.assign(i,x||{});if(x===null||x===undefined){if(name==='null')i.query=null;else i.query=undefined;}if(name==='missing')delete i.query;reject(i,'INVALID_QUERY')});
for(const [name,e] of [
 ['null',null],['array',[]],['bad id',title('invalid','ночной сон')],
 ['bad locale',title(A,'ночной сон',{locale:'xx'})],
 ['empty text',title(A,'')],['long text',title(A,'x'.repeat(2001))],
 ['unknown kind',title(A,'ночной сон',{kind:'synonym'})],
 ['canonical with alias status',title(A,'ночной сон',{aliasStatus:'verified_active'})],
 ['alias with no status',{...alias(A,'ночной сон'),aliasStatus:undefined}],
 ['alias with invalid status',alias(A,'ночной сон','guessed')],
 ['invalid scope',title(A,'ночной сон',{scope:{kind:'no'}})]
])test('reject malformed evidence '+name,()=>reject(inp([cand(A,1)],[],[e]),'INVALID_EVIDENCE'));
test('evidence array mandatory when enabled',()=>reject(inp([cand(A,1)],[],null),'INVALID_EVIDENCE'));
test('max evidence 5000 valid',()=>assert.equal(ok(inp([cand(A,1)],[],Array.from({length:5000},()=>title(A,'ночной сон')))).candidates[0].matchPriority,2));
test('max evidence 5001 rejected',()=>reject(inp([cand(A,1)],[],Array.from({length:5001},()=>title(A,'ночной сон'))),'TOO_MANY_EVIDENCE'));
for(const [locale,text] of [['en','Night sleep'],['pl','Sen nocny'],['es','Sueño nocturno'],['de','Nachtschlaf'],['cs','Noční spánek'],['uk','Нічний сон'],['ru','Ночной сон']]){
 test('canonical exact 7 locale '+locale,()=>{const r=ok(inp(lex,vec,[title(D,text,{locale})],{query:{text,locale}}));assert.equal(r.candidates[0].onId,D)});
 test('verified alias 7 locale '+locale,()=>{const r=ok(inp(lex,vec,[alias(D,text,'verified_active',{locale})],{query:{text,locale}}));assert.equal(r.candidates[0].onId,D)});
 test('pending alias 7 locale '+locale,()=>{const r=ok(inp(lex,vec,[alias(D,text,'pending',{locale})],{query:{text,locale}}));assert.equal(r.exactBoostApplied,false)});
}
for(const n of [2,3,4,10,50,100,500,1000])test('stable duplicate evidence count '+n,()=>{
 const r=ok(inp(lex,vec,Array.from({length:n},()=>alias(D,'ночной сон'))));assert.equal(r.candidates[0].onId,D);assert.equal(r.candidates.length,4);
});
for(const seed of [1,2,3,4,5,6,7,8,9,10])test('deterministic evidence reordering '+seed,()=>{
 const ev=[title(A,'ночной сон'),alias(B,'ночной сон'),title(C,'не совпадает'),alias(D,'ночной сон','revoked')];
 const shuffled=ev.map((item,i)=>({item,key:(i*seed*13+17)%11})).sort((a,b)=>a.key-b.key).map(x=>x.item);
 assert.deepEqual(ok(inp(lex,vec,ev)),ok(inp(lex,vec,shuffled)));
});
