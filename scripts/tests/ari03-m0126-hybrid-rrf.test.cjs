'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const ts=require(require.resolve('typescript',{paths:[process.cwd(),'/opt/nvm/versions/node/v22.16.0/lib/node_modules']}));
const loc=process.env.ARCTOR_M0126_TEST_MODULE_PATH||path.join(process.cwd(),'src/lib/ontology-research/hybridRankerV1.ts');
function load(p){const t=ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});assert.equal(t.diagnostics?.length||0,0);const m=new Module(p,module);m.filename=p;m.paths=Module._nodeModulePaths(path.dirname(p));m._compile(t.outputText,p);return m.exports;}
const H=load(loc), idA='11111111-2222-4333-8444-555555555555',idB='22222222-3333-4444-8555-666666666666',idC='33333333-4444-4555-8666-777777777777',idD='44444444-5555-4666-8777-888888888888',idE='55555555-6666-4777-8888-999999999999',owner='66666666-7777-4888-8999-aaaaaaaaaaaa',owner2='77777777-8888-4999-8aaa-bbbbbbbbbbbb';
const global={kind:'global_system'},ownerScope={kind:'owner_private',ownerActorId:owner};
const c=(onId,rank,opts={})=>({onId,rank,locale:'ru',scope:global,...opts});
const rank=(lexical=[],vector=[])=>H.rankHybridCandidatesRrfV1({lexical,vector});
const ok=(l=[],v=[])=>{const r=rank(l,v);assert.equal(r.ok,true,JSON.stringify(r));return r;};
const bad=(l,v,reason)=>{const r=rank(l,v);assert.equal(r.ok,false);assert.equal(r.reason,reason);assert.deepEqual(r.candidates,[]);assert.equal(r.rrfApplied,false);};
const near=(a,b)=>assert.ok(Math.abs(a-b)<=1e-15,`${a} vs ${b}`);
// Fixed contract and functional cases.
test('exports M0126 RRF contract',()=>assert.equal(H.HYBRID_RRF_CONTRACT_V1,'ARCTOR_ARI03_M0126_RRF_K60_V1'));
test('RRF K 60',()=>assert.equal(H.HYBRID_RRF_K_V1,60));
test('M0125 merge contract unchanged',()=>assert.equal(H.HYBRID_MERGE_CONTRACT_V1,'ARCTOR_ARI03_M0125_UUID_CANDIDATE_MERGE_V1'));
test('empty sources yield empty ranked list',()=>{const r=ok();assert.deepEqual(r.candidates,[]);assert.equal(r.deduplicatedCount,0);});
test('success metadata says rrf but no exact boost',()=>{const r=ok([c(idA,1)]);assert.equal(r.rrfApplied,true);assert.equal(r.exactBoostApplied,false);assert.equal(r.authorizationEnforced,false);assert.equal(r.rrfK,60);assert.equal(r.scoreKind,'RECIPROCAL_RANK_FUSION');});
test('one lexical score',()=>{const x=ok([c(idA,1)]).candidates[0];near(x.rrfScore,1/61);near(x.lexicalRrfContribution,1/61);assert.equal(x.vectorRrfContribution,0);});
test('one vector score',()=>{const x=ok([],[c(idA,1)]).candidates[0];near(x.rrfScore,1/61);assert.equal(x.lexicalRrfContribution,0);near(x.vectorRrfContribution,1/61);});
test('two-source score sums reciprocal ranks',()=>{const x=ok([c(idA,2)],[c(idA,5)]).candidates[0];near(x.rrfScore,1/62+1/65);});
test('two-source support beats one-source rank1',()=>{const r=ok([c(idA,1),c(idB,2)],[c(idB,2)]);assert.equal(r.candidates[0].onId,idB);});
test('per-source ranks not raw score decide',()=>{const a=ok([c(idA,2,{rawScore:-1e10}),c(idB,1,{rawScore:1e10})],[c(idA,1,{rawScore:-42})]);const b=ok([c(idA,2,{rawScore:1e100}),c(idB,1,{rawScore:-1e100})],[c(idA,1,{rawScore:1e100})]);assert.deepEqual(a,b);});
test('one UUID one row even across sources',()=>{const r=ok([c(idA,1),c(idA,4)],[c(idA,2)]);assert.equal(r.candidates.length,1);assert.equal(r.deduplicatedCount,2);});
test('duplicate lexical rank takes min once',()=>{const x=ok([c(idA,1),c(idA,2),c(idA,10)]).candidates[0];near(x.rrfScore,1/61);assert.equal(x.occurrencesInLexical,3);});
test('duplicate vector rank takes min once',()=>{const x=ok([],[c(idA,1),c(idA,2),c(idA,10)]).candidates[0];near(x.rrfScore,1/61);assert.equal(x.occurrencesInVector,3);});
test('mixed source collision fails rather than merging',()=>bad([c(idA,1)], [c(idA,1,{scope:ownerScope})], 'SCOPE_CONFLICT'));
test('private owner collision fails',()=>bad([c(idA,1,{scope:ownerScope})],[c(idA,1,{scope:{kind:'owner_private',ownerActorId:owner2}})],'SCOPE_CONFLICT'));
test('all rank numbers one based after ordering',()=>{const r=ok([c(idA,5),c(idB,3),c(idC,1)],[c(idD,1),c(idE,2)]);assert.deepEqual(r.candidates.map(x=>x.rrfRank),[1,2,3,4,5]);});
test('lexical preference when RRF ties',()=>{const r=ok([c(idB,1)],[c(idA,1)]);assert.equal(r.candidates[0].onId,idB);});
test('vector rank breaks lexical tie',()=>{const r=ok([c(idA,1),c(idB,1)],[c(idB,2),c(idA,3)]);assert.equal(r.candidates[0].onId,idB);});
test('UUID tie break for identical scores and ranks',()=>{const r=ok([c(idB,1),c(idA,1)],[c(idA,1),c(idB,1)]);assert.deepEqual(r.candidates.map(x=>x.onId),[idA,idB]);});
test('UUID uppercase canonicalizes',()=>assert.equal(ok([c(idA.toUpperCase(),1)],[c(idA,1)]).candidates[0].onId,idA));
test('locale union sorted',()=>assert.deepEqual(ok([c(idA,1,{locale:'pl'})],[c(idA,1,{locale:'es'})]).candidates[0].locales,['es','pl']));
test('owner private preserved',()=>assert.equal(ok([c(idA,1,{scope:ownerScope})]).candidates[0].scope.ownerActorId,owner));
test('output omits raw scores',()=>{const x=ok([c(idA,1,{rawScore:1e100})]).candidates[0];assert.equal('rawScore' in x,false)});
test('no user query or title drives identity',()=>{const r=ok([c(idA,1,{title:'A',query:'A'})],[c(idA,1,{title:'B',query:'B'})]);assert.equal(r.candidates.length,1);assert.equal('title' in r.candidates[0],false)});
test('RRF contributions unambiguous',()=>{const x=ok([c(idA,5)],[c(idA,3)]).candidates[0];near(x.rrfScore,x.lexicalRrfContribution+x.vectorRrfContribution);});
test('RRF score monotonically decreases by rank',()=>{const a=ok([c(idA,1),c(idB,2),c(idC,3)]).candidates;assert.ok(a[0].rrfScore>a[1].rrfScore&&a[1].rrfScore>a[2].rrfScore);});
test('no random, network, db or provider side effects',()=>{const s=fs.readFileSync(loc,'utf8');assert.doesNotMatch(s,/\bfetch\s*\(|https?\.request|createClient\s*\(|process\.env|OPENAI_API_KEY|\bINSERT\b|Math\.random/i)});
test('does not mutate frozen input',()=>{const x=Object.freeze(c(idA,1));const l=Object.freeze([x]);ok(l,[x]);assert.equal(x.rank,1)});
test('repeated execution deterministic',()=>{const x=[c(idA,2),c(idB,1)],y=[c(idA,1),c(idC,3)];assert.deepEqual(ok(x,y),ok(x,y))});
test('M0125 legacy function remains unranked',()=>{const m=H.mergeHybridCandidatesByUuidV1({lexical:[c(idA,1)],vector:[c(idA,1)]});assert.equal(m.rrfApplied,false);assert.equal(m.exactBoostApplied,false)});
test('legacy module source is exact prefix',()=>{const file=fs.readFileSync(loc,'utf8');const prior=path.join(__dirname,'../m0126_build/previous/hybridRankerV1.ts');if(fs.existsSync(prior))assert.equal(file.startsWith(fs.readFileSync(prior,'utf8')),true);});
// Fail-closed invalid input cases: identical validation rules as M0125.
for(const [name,x,reason] of [
 ['null',null,'INVALID_INPUT'],['undefined',undefined,'INVALID_INPUT'],['array',[],'INVALID_INPUT'],
 ['missing lexical',{vector:[]},'INVALID_INPUT'],['missing vector',{lexical:[]},'INVALID_INPUT'],
 ['lexical nonarray',{lexical:{},vector:[]},'INVALID_INPUT'],['vector nonarray',{lexical:[],vector:{}},'INVALID_INPUT']]){
 test('reject top-level '+name,()=>{const r=H.rankHybridCandidatesRrfV1(x);assert.equal(r.ok,false);assert.equal(r.reason,reason);});
}
for(const [name,val,reason] of [
 ['null',null,'INVALID_CANDIDATE'],['array',[],'INVALID_CANDIDATE'],
 ['missing uuid',{rank:1,locale:'ru',scope:global},'INVALID_UUID'],
 ['bad uuid',c('bad',1),'INVALID_UUID'],['rank 0',c(idA,0),'INVALID_RANK'],
 ['rank negative',c(idA,-1),'INVALID_RANK'],['rank fractional',c(idA,1.5),'INVALID_RANK'],
 ['rank string',c(idA,'1'),'INVALID_RANK'],['rank NaN',c(idA,NaN),'INVALID_RANK'],
 ['rank infinity',c(idA,Infinity),'INVALID_RANK'],['rank exceeds one million',c(idA,1000001),'INVALID_RANK'],
 ['missing locale',c(idA,1,{locale:undefined}),'INVALID_LOCALE'],
 ['invalid locale',c(idA,1,{locale:'fr'}),'INVALID_LOCALE'],
 ['missing scope',c(idA,1,{scope:undefined}),'INVALID_SCOPE'],
 ['invalid scope',c(idA,1,{scope:{kind:'internal'}}),'INVALID_SCOPE'],
 ['private owner malformed',c(idA,1,{scope:{kind:'owner_private',ownerActorId:'bad'}}),'INVALID_SCOPE']]){
 test('reject lexical '+name,()=>bad([val],[],reason));
 test('reject vector '+name,()=>bad([],[val],reason));
}
for(const locale of ['en','pl','es','de','cs','uk','ru'])test('accept locale '+locale,()=>assert.deepEqual(ok([c(idA,1,{locale})]).candidates[0].locales,[locale]));
for(const n of [2,3,4,10,25,100,500,1000])test('duplicate count '+n+' without RRF inflation',()=>{
 const l=Array.from({length:n},(_,i)=>c(idA,n-i));const x=ok(l,l).candidates[0];near(x.rrfScore,2/61);assert.equal(x.occurrencesInLexical,n);
});
for(const seed of [1,2,3,4,5,6,7,8,9,10])test('stable input permutation '+seed,()=>{
 const ids=[idA,idB,idC,idD,idE];const x=ids.map((id,i)=>c(id,i+1));const y=ids.map((id,i)=>c(id,5-i));
 const flip=a=>a.map((item,i)=>({item,key:(i*seed*13+17)%11})).sort((a,b)=>a.key-b.key).map(x=>x.item);
 assert.deepEqual(ok(x,y),ok(flip(x),flip(y)));
});
for(const n of [5,10,50,100,500,5000])test('one large repeated UUID set '+n+' rows',()=>{const rows=Array.from({length:n},(_,i)=>c(idA,i+1));const r=ok(rows);assert.equal(r.candidates.length,1);near(r.candidates[0].rrfScore,1/61)});
test('over 5000 lexical fails',()=>bad(Array.from({length:5001},()=>c(idA,1)),[],'TOO_MANY_CANDIDATES'));
test('over 5000 vector fails',()=>bad([],Array.from({length:5001},()=>c(idA,1)),'TOO_MANY_CANDIDATES'));
test('invalid late row means no partial response',()=>bad([c(idA,1),c('BAD',2)],[],'INVALID_UUID'));
test('later owner mismatch means no partial response',()=>bad([c(idA,1),c(idB,2)],[c(idB,1,{scope:ownerScope})],'SCOPE_CONFLICT'));
