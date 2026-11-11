'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const ts=require(require.resolve('typescript',{paths:[process.cwd(),'/opt/nvm/versions/node/v22.16.0/lib/node_modules']}));
const loc=process.env.ARCTOR_M0125_TEST_MODULE_PATH||path.join(process.cwd(),'src/lib/ontology-research/hybridRankerV1.ts');
function load(p){const t=ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});assert.equal(t.diagnostics?.length||0,0);const m=new Module(p,module);m.filename=p;m.paths=Module._nodeModulePaths(path.dirname(p));m._compile(t.outputText,p);return m.exports;}
const H=load(loc),idA='11111111-2222-4333-8444-555555555555',idB='22222222-3333-4444-8555-666666666666',idC='33333333-4444-4555-8666-777777777777',idD='44444444-5555-4666-8777-888888888888',idE='55555555-6666-4777-8888-999999999999',owner='66666666-7777-4888-8999-aaaaaaaaaaaa',owner2='77777777-8888-4999-8aaa-bbbbbbbbbbbb';
const global={kind:'global_system'},private1={kind:'owner_private',ownerActorId:owner};
const c=(onId,rank,opts={})=>({onId,rank,locale:'ru',scope:global,...opts});
const merge=(lexical=[],vector=[])=>H.mergeHybridCandidatesByUuidV1({lexical,vector});
const ok=(l,v)=>{const r=merge(l,v);assert.equal(r.ok,true,JSON.stringify(r));return r};
const bad=(l,v,reason)=>{const r=merge(l,v);assert.equal(r.ok,false,JSON.stringify(r));assert.equal(r.reason,reason);assert.deepEqual(r.candidates,[])};
// Fixed boundary tests.
test('contract exported',()=>assert.equal(H.HYBRID_MERGE_CONTRACT_V1,'ARCTOR_ARI03_M0125_UUID_CANDIDATE_MERGE_V1'));
test('empty-empty succeeds',()=>{const r=ok();assert.equal(r.candidates.length,0);assert.equal(r.deduplicatedCount,0)});
test('one lexical',()=>{const r=ok([c(idA,1)]);assert.equal(r.candidates[0].onId,idA);assert.equal(r.candidates[0].vectorRank,null)});
test('one vector',()=>{const r=ok([],[c(idA,1)]);assert.equal(r.candidates[0].lexicalRank,null);assert.equal(r.candidates[0].vectorRank,1)});
test('cross-source duplicate exactly once',()=>{const r=ok([c(idA,1)],[c(idA,1)]);assert.equal(r.candidates.length,1);assert.equal(r.deduplicatedCount,1);assert.equal(r.candidates[0].inLexical,true);assert.equal(r.candidates[0].inVector,true)});
test('lexical duplicates pick min rank',()=>{const r=ok([c(idA,4),c(idA,2),c(idA,9)]);assert.equal(r.candidates[0].lexicalRank,2);assert.equal(r.candidates[0].occurrencesInLexical,3)});
test('vector duplicates pick min rank',()=>{const r=ok([],[c(idA,4),c(idA,2),c(idA,9)]);assert.equal(r.candidates[0].vectorRank,2);assert.equal(r.candidates[0].occurrencesInVector,3)});
test('uppercase UUID normalizes',()=>{const r=ok([c(idA.toUpperCase(),1)],[c(idA,2)]);assert.equal(r.candidates.length,1);assert.equal(r.candidates[0].onId,idA)});
test('lexical-only then vector-only order',()=>{const r=ok([c(idB,2),c(idA,1)],[c(idD,2),c(idC,1)]);assert.deepEqual(r.candidates.map(x=>x.onId),[idA,idB,idC,idD])});
test('source rank carried independently',()=>{const r=ok([c(idA,8)],[c(idA,1)]);assert.equal(r.candidates[0].lexicalRank,8);assert.equal(r.candidates[0].vectorRank,1)});
test('raw scores not mixed or returned',()=>{const r=ok([c(idA,1,{rawScore:999})],[c(idA,1,{rawScore:-1000})]);assert.equal('rawScore' in r.candidates[0],false)});
test('raw scores do not reorder',()=>{const a=ok([c(idA,2,{rawScore:1}),c(idB,1,{rawScore:9})]);const b=ok([c(idA,2,{rawScore:9999}),c(idB,1,{rawScore:-9999})]);assert.deepEqual(a,b)});
test('scopes retained',()=>{const r=ok([c(idA,1,{scope:private1})],[c(idA,2,{scope:private1})]);assert.deepEqual(r.candidates[0].scope,{kind:'owner_private',ownerActorId:owner})});
test('private owner canonicalized',()=>{const r=ok([c(idA,1,{scope:{kind:'owner_private',ownerActorId:owner.toUpperCase()}})],[c(idA,2,{scope:private1})]);assert.equal(r.candidates.length,1)});
test('global-private collision blocks all',()=>bad([c(idA,1)],[c(idA,1,{scope:private1})],'SCOPE_CONFLICT'));
test('private different owners collision blocks',()=>bad([c(idA,1,{scope:private1})],[c(idA,2,{scope:{kind:'owner_private',ownerActorId:owner2}})],'SCOPE_CONFLICT'));
test('same uuid two locales one candidate',()=>{const r=ok([c(idA,1,{locale:'pl'})],[c(idA,2,{locale:'es'})]);assert.deepEqual(r.candidates[0].locales,['es','pl'])});
test('multiple onId objects persist',()=>{const r=ok([c(idA,1),c(idB,2)],[c(idC,1)]);assert.equal(r.candidates.length,3)});
test('no RRF and no exact boost at this step',()=>{const r=ok([c(idA,1)],[c(idA,1)]);assert.equal(r.rrfApplied,false);assert.equal(r.exactBoostApplied,false)});
test('caller must enforce authorization',()=>assert.equal(ok().authorizationEnforced,false));
test('immutable input',()=>{const x=[c(idA,1)];Object.freeze(x[0]);Object.freeze(x);ok(x);assert.equal(x[0].rank,1)});
test('no network or DB in module',()=>{const s=fs.readFileSync(loc,'utf8');assert.doesNotMatch(s,/\bfetch\s*\(|https?\.request|createClient\s*\(|process\.env|OPENAI_API_KEY|\bINSERT\b/i)});
// Validation families: keep each test independently identifiable.
for(const [name,input,reason] of [
 ['null',null,'INVALID_INPUT'],['undefined',undefined,'INVALID_INPUT'],['array',[],'INVALID_INPUT'],
 ['no lexical',{vector:[]},'INVALID_INPUT'],['no vector',{lexical:[]},'INVALID_INPUT'],
 ['lexical not array',{lexical:{},vector:[]},'INVALID_INPUT'],['vector not array',{lexical:[],vector:{}},'INVALID_INPUT']]){
 test('invalid top-level '+name,()=>{const r=H.mergeHybridCandidatesByUuidV1(input);assert.equal(r.ok,false);assert.equal(r.reason,reason)});
}
for(const [name,val,reason] of [
 ['null',null,'INVALID_CANDIDATE'],['array',[],'INVALID_CANDIDATE'],['emptyObject',{},'INVALID_UUID'],
 ['no uuid',{rank:1,scope:global,locale:'ru'},'INVALID_UUID'],
 ['blank UUID',c('',1),'INVALID_UUID'],['short UUID',c('hi',1),'INVALID_UUID'],
 ['UUID surrounded by spaces',c(' '+idA+' ',1),'INVALID_UUID'],
 ['UUID injections',c(idA+';DROP',1),'INVALID_UUID'],
 ['rank zero',c(idA,0),'INVALID_RANK'],['rank negative',c(idA,-1),'INVALID_RANK'],
 ['rank fractional',c(idA,1.5),'INVALID_RANK'],['rank NaN',c(idA,NaN),'INVALID_RANK'],
 ['rank Infinity',c(idA,Infinity),'INVALID_RANK'],['rank huge',c(idA,1000001),'INVALID_RANK'],
 ['rank string',c(idA,'1'),'INVALID_RANK'],
 ['locale missing',c(idA,1,{locale:undefined}),'INVALID_LOCALE'],
 ['locale invalid',c(idA,1,{locale:'fr'}),'INVALID_LOCALE'],
 ['locale uppercase',c(idA,1,{locale:'RU'}),'INVALID_LOCALE'],
 ['scope missing',c(idA,1,{scope:undefined}),'INVALID_SCOPE'],
 ['scope null',c(idA,1,{scope:null}),'INVALID_SCOPE'],
 ['scope invalid kind',c(idA,1,{scope:{kind:'team'}}),'INVALID_SCOPE'],
 ['scope empty private owner',c(idA,1,{scope:{kind:'owner_private',ownerActorId:''}}),'INVALID_SCOPE'],
 ['scope bad owner UUID',c(idA,1,{scope:{kind:'owner_private',ownerActorId:'abc'}}),'INVALID_SCOPE'],
 ])test('invalid candidate '+name,()=>bad([val],[],reason));
for(const [name,val,reason] of [
 ['null',null,'INVALID_CANDIDATE'],['array',[],'INVALID_CANDIDATE'],
 ['invalid UUID',c('bad',1),'INVALID_UUID'],['rank zero',c(idA,0),'INVALID_RANK'],
 ['bad locale',c(idA,1,{locale:'JA'}),'INVALID_LOCALE'],['bad scope',c(idA,1,{scope:{kind:'anonymous'}}),'INVALID_SCOPE']
 ])test('invalid vector '+name,()=>bad([], [val],reason));
for(const locale of ['en','pl','es','de','cs','uk','ru'])test('accept locale '+locale,()=>assert.deepEqual(ok([c(idA,1,{locale})]).candidates[0].locales,[locale]));
for(const n of [2,3,4,10,25,100,1000])test('stable dedup for '+n+' duplicate candidates',()=>{
 const x=Array.from({length:n},(_,i)=>c(idA,n-i));const r=ok(x,x);
 assert.equal(r.candidates.length,1);assert.equal(r.candidates[0].lexicalRank,1);assert.equal(r.candidates[0].vectorRank,1);
 assert.equal(r.deduplicatedCount,2*n-1);
});
for(const seed of [1,2,3,4,5,6,7,8,9,10])test('deterministic permutation '+seed,()=>{
 const ids=[idA,idB,idC,idD,idE];const lex=ids.map((id,i)=>c(id,i+1));
 const vec=ids.map((id,i)=>c(id,ids.length-i));
 const shuffle=(a)=>a.map((item,i)=>({item,sort:(i*seed*13+17)%11})).sort((a,b)=>a.sort-b.sort).map(x=>x.item);
 assert.deepEqual(ok(lex,vec),ok(shuffle(lex),shuffle(vec)));
});
test('over 5000 lexical rejected',()=>bad(Array.from({length:5001},()=>c(idA,1)),[],'TOO_MANY_CANDIDATES'));
test('over 5000 vector rejected',()=>bad([],Array.from({length:5001},()=>c(idA,1)),'TOO_MANY_CANDIDATES'));
test('max 5000 accepted',()=>{const r=ok(Array.from({length:5000},()=>c(idA,1)));assert.equal(r.candidates.length,1)});
test('last item invalid triggers complete fail, no partial leak',()=>bad([c(idA,1),c('INVALID',2)],[],'INVALID_UUID'));
test('late scope collision triggers complete fail',()=>bad([c(idA,1),c(idB,2)],[c(idA,3,{scope:private1})],'SCOPE_CONFLICT'));
test('rank tie stable by UUID',()=>assert.deepEqual(ok([c(idB,1),c(idA,1)]).candidates.map(x=>x.onId),[idA,idB]));
test('duplicates across same locale unique locale',()=>assert.deepEqual(ok([c(idA,1),c(idA,2)]).candidates[0].locales,['ru']));
test('source counts reflect full duplicates',()=>{const r=ok([c(idA,1),c(idA,2)],[c(idA,3),c(idA,4),c(idA,5)]);assert.equal(r.candidates[0].occurrencesInLexical,2);assert.equal(r.candidates[0].occurrencesInVector,3)});
test('vector rank does not rearrange lexical candidates',()=>assert.deepEqual(ok([c(idA,1),c(idB,2)],[c(idB,1),c(idA,2)]).candidates.map(x=>x.onId),[idA,idB]));
test('vector-only ranked by vector source',()=>assert.deepEqual(ok([],[c(idA,2),c(idB,1)]).candidates.map(x=>x.onId),[idB,idA]));
test('explicit status of no auth RLS prevents false assumption',()=>assert.equal(ok([c(idA,1)]).authorizationEnforced,false));
