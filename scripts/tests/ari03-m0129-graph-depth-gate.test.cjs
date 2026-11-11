'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const ts=require(require.resolve('typescript',{paths:[process.cwd(),'/opt/nvm/versions/node/v22.16.0/lib/node_modules']}));
const loc=process.env.ARCTOR_M0129_TEST_MODULE_PATH||path.join(process.cwd(),'src/lib/ontology-research/hybridRankerV1.ts');
function load(p){const t=ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});assert.equal(t.diagnostics?.length||0,0);const m=new Module(p,module);m.filename=p;m.paths=Module._nodeModulePaths(path.dirname(p));m._compile(t.outputText,p);return m.exports;}
const H=load(loc);
const A='11111111-2222-4333-8444-555555555555',B='22222222-3333-4444-8555-666666666666';
const C='33333333-4444-4555-8666-777777777777',D='44444444-5555-4666-8777-888888888888';
const OWNER='66666666-7777-4888-8999-aaaaaaaaaaaa',OTHER='77777777-8888-4999-8aaa-bbbbbbbbbbbb';
const global={kind:'global_system'},priv={kind:'owner_private',ownerActorId:OWNER};
const cand=(onId,rank,more={})=>({onId,rank,locale:'ru',scope:global,...more});
const title=(onId,text='ночной сон',more={})=>({onId,scope:global,locale:'ru',kind:'canonical_title',text,...more});
const alias=(onId,text='ночной сон',more={})=>({onId,scope:global,locale:'ru',kind:'alias',aliasStatus:'verified_active',text,...more});
const base=()=>({lexical:[cand(A,1),cand(B,2)],vector:[cand(B,1),cand(C,2)],query:{text:'ночной сон',locale:'ru'},evidence:[title(C)],graphExpansion:{requestedDepth:0}});
const clone=x=>structuredClone(x),invoke=i=>H.rankHybridCandidatesGraphGatedV1(i);
const ok=i=>{const r=invoke(i);assert.equal(r.ok,true,JSON.stringify(r));return r};
const deny=(i,why)=>{const r=invoke(i);assert.equal(r.ok,false,JSON.stringify(r));assert.equal(r.reason,why);assert.deepEqual(r.candidates,[]);assert.equal(r.graphExpansionApplied,false);assert.equal(r.graphCandidatesAdded,0);assert.equal(r.relationsAsserted,false);return r};
const ids=r=>r.candidates.map(x=>x.onId);
const assertSameRanking=i=>{const r=ok(i),old=H.rankHybridCandidatesWithExactPriorityV1(i);assert.equal(old.ok,true);assert.deepEqual(r.candidates,old.candidates);assert.equal(r.rankPolicy,old.rankPolicy);return r};
test('M0129 graph gate contract',()=>assert.equal(H.HYBRID_GRAPH_GATE_CONTRACT_V1,'ARCTOR_ARI03_M0129_GRAPH_DEPTH_ZERO_V1'));
test('fixed maximum depth zero',()=>assert.equal(H.HYBRID_MAX_GRAPH_DEPTH_V1,0));
test('deferred until ARI-04',()=>assert.equal(H.HYBRID_GRAPH_EXPANSION_DEFERRED_UNTIL_V1,'ARI-04'));
test('previous M0125 contract preserved',()=>assert.equal(H.HYBRID_MERGE_CONTRACT_V1,'ARCTOR_ARI03_M0125_UUID_CANDIDATE_MERGE_V1'));
test('previous M0126 contract preserved',()=>assert.equal(H.HYBRID_RRF_CONTRACT_V1,'ARCTOR_ARI03_M0126_RRF_K60_V1'));
test('previous M0127 contract preserved',()=>assert.equal(H.HYBRID_EXACT_PRIORITY_CONTRACT_V1,'ARCTOR_ARI03_M0127_EXACT_VERIFIED_ALIAS_PRIORITY_V1'));
test('previous M0128 contract preserved',()=>assert.equal(H.HYBRID_EXPLANATION_CONTRACT_V1,'ARCTOR_ARI03_M0128_VERSIONED_FIELD_EXPLANATION_V1'));
test('graph request omitted also defaults to zero',()=>{const i=base();delete i.graphExpansion;assert.equal(ok(i).maxGraphDepth,0)});
test('explicit depth zero accepted',()=>assertSameRanking(base()));
test('zero candidates accepted',()=>{const i=base();i.lexical=[];i.vector=[];i.evidence=[];assert.deepEqual(ok(i).candidates,[])});
test('graph never expanded or asserted',()=>{const r=ok(base());assert.equal(r.graphExpansionApplied,false);assert.equal(r.graphCandidatesAdded,0);assert.equal(r.relationsAsserted,false);assert.equal(r.deferredUntil,'ARI-04')});
test('caller must enforce authorizations',()=>assert.equal(ok(base()).authorizationEnforced,false));
test('M0127 exact title outranks higher RRF scores',()=>{const r=assertSameRanking(base());assert.equal(ids(r)[0],C);assert.equal(r.candidates[0].matchKind,'canonical_title')});
test('M0127 RRF K60 retained',()=>{const r=ok(base());assert.equal(H.HYBRID_RRF_K_V1,60);assert.ok(r.candidates.every(x=>x.rrfScore>0))});
test('UUIDs unique in ranked result',()=>{const r=ok(base());assert.equal(new Set(ids(r)).size,r.candidates.length)});
test('exact rollback retains RRF order',()=>{const i=base();i.enableExactPriority=false;assert.deepEqual(ids(ok(i)),ids(H.rankHybridCandidatesRrfV1(i)));});
test('no title evidence never invented',()=>{const i=base();i.evidence=[];assert.equal(ok(i).candidates.every(x=>x.matchKind===null),true)});
test('alias-only boost',()=>{const i=base();i.evidence=[alias(C)];assert.equal(ok(i).candidates[0].matchKind,'verified_alias')});
test('pending alias does not boost',()=>{const i=base();i.evidence=[alias(C,'ночной сон',{aliasStatus:'pending'})];assert.equal(ok(i).candidates.some(x=>x.matchKind!==null),false)});
test('revoked alias does not boost',()=>{const i=base();i.evidence=[alias(C,'ночной сон',{aliasStatus:'revoked'})];assert.equal(ok(i).candidates.some(x=>x.matchKind!==null),false)});
test('mixed title and alias title wins',()=>{const i=base();i.evidence=[alias(A),title(C)];assert.equal(ok(i).candidates[0].onId,C)});
test('lexical-only output maintained',()=>{const i=base();i.vector=[];i.evidence=[];assert.deepEqual(ids(ok(i)),ids(H.rankHybridCandidatesWithExactPriorityV1(i)))});
test('vector-only output maintained',()=>{const i=base();i.lexical=[];i.evidence=[];assert.deepEqual(ids(ok(i)),ids(H.rankHybridCandidatesWithExactPriorityV1(i)))});
test('duplicate entries do not add candidate',()=>{const i=base();i.lexical.push(cand(B,8));i.vector.push(cand(B,12));assert.equal(ok(i).candidates.length,3)});
test('scope preserved for private candidate',()=>{const i=base();i.lexical[0].scope=priv;assert.equal(ok(i).candidates.find(x=>x.onId===A).scope.kind,'owner_private')});
test('private/global UUID collision fails closed',()=>{const i=base();i.lexical[1].scope=priv;deny(i,'SCOPE_CONFLICT')});
test('invalid UUID fails closed',()=>{const i=base();i.lexical[0].onId='bad';deny(i,'INVALID_UUID')});
test('invalid query fails closed',()=>{const i=base();i.query.text='';deny(i,'INVALID_QUERY')});
test('unknown alias UUID fails closed',()=>{const i=base();i.evidence=[title(D)];deny(i,'EVIDENCE_UNKNOWN_UUID')});
test('input object not mutated',()=>{const i=base(),old=clone(i);ok(i);assert.deepEqual(i,old)});
test('frozen request supported',()=>{const i=base();Object.freeze(i.graphExpansion);Object.freeze(i);assertSameRanking(i)});
test('untrusted rawScore never read',()=>{const i=base();i.vector[0].rawScore=1e100;i.lexical[0].rawScore=-1e100;assertSameRanking(i)});
test('no new graph IDs in output',()=>assert.equal(ids(ok(base())).includes(D),false));
test('the gate cannot be released by caller setting phase',()=>{const i=base();i.graphExpansion={requestedDepth:1,phase:'ARI-04'};deny(i,'GRAPH_PAYLOAD_NOT_ALLOWED')});
test('the gate does not fetch relations or providers',()=>assert.doesNotMatch(fs.readFileSync(loc,'utf8'),/\bfetch\s*\(|https?\.request|createClient\s*\(|process\.env|OPENAI_API_KEY|Math\.random/i));
for(const [label,payload,why] of [
 ['depth 1',{requestedDepth:1},'GRAPH_EXPANSION_DEFERRED_UNTIL_ARI04'],
 ['depth 2',{requestedDepth:2},'GRAPH_EXPANSION_DEFERRED_UNTIL_ARI04'],
 ['depth 9',{requestedDepth:9},'GRAPH_EXPANSION_DEFERRED_UNTIL_ARI04'],
 ['depth 100',{requestedDepth:100},'GRAPH_EXPANSION_DEFERRED_UNTIL_ARI04'],
 ['depth max safe',{requestedDepth:Number.MAX_SAFE_INTEGER},'GRAPH_EXPANSION_DEFERRED_UNTIL_ARI04'],
 ['negative depth',{requestedDepth:-1},'INVALID_GRAPH_REQUEST'],
 ['fractional depth',{requestedDepth:.5},'INVALID_GRAPH_REQUEST'],
 ['infinite depth',{requestedDepth:Infinity},'INVALID_GRAPH_REQUEST'],
 ['nan depth',{requestedDepth:NaN},'INVALID_GRAPH_REQUEST'],
 ['unsafe integer depth',{requestedDepth:Number.MAX_SAFE_INTEGER+1},'INVALID_GRAPH_REQUEST'],
 ['string zero',{requestedDepth:'0'},'INVALID_GRAPH_REQUEST'],
 ['string one',{requestedDepth:'1'},'INVALID_GRAPH_REQUEST'],
 ['boolean depth',{requestedDepth:false},'INVALID_GRAPH_REQUEST'],
 ['null depth',{requestedDepth:null},'INVALID_GRAPH_REQUEST'],
 ['undefined depth',{requestedDepth:undefined},'INVALID_GRAPH_REQUEST'],
 ['empty object',{},'INVALID_GRAPH_REQUEST'],
 ['null request',null,'INVALID_GRAPH_REQUEST'],
 ['array request',[],'INVALID_GRAPH_REQUEST'],
 ['string request','0','INVALID_GRAPH_REQUEST'],
 ['integer request',0,'INVALID_GRAPH_REQUEST'],
 ['true request',true,'INVALID_GRAPH_REQUEST'],
 ['false request',false,'INVALID_GRAPH_REQUEST'],
 ['relations injected',{requestedDepth:0,relations:[{from:A,to:D}]},'GRAPH_PAYLOAD_NOT_ALLOWED'],
 ['edges injected',{requestedDepth:0,edges:[{from:A,to:D}]},'GRAPH_PAYLOAD_NOT_ALLOWED'],
 ['neighbors injected',{requestedDepth:0,neighbors:[D]},'GRAPH_PAYLOAD_NOT_ALLOWED'],
 ['graphCandidates injected',{requestedDepth:0,graphCandidates:[cand(D,1)]},'GRAPH_PAYLOAD_NOT_ALLOWED'],
 ['neighborCandidates injected',{requestedDepth:0,neighborCandidates:[cand(D,1)]},'GRAPH_PAYLOAD_NOT_ALLOWED'],
 ['relationAssertions injected',{requestedDepth:0,relationAssertions:[{from:A,to:D}]},'GRAPH_PAYLOAD_NOT_ALLOWED'],
 ['claimed verified graph edge',{requestedDepth:0,verifiedEdges:[{from:A,to:D,verified:true}]},'GRAPH_PAYLOAD_NOT_ALLOWED'],
 ['phase flag injected',{requestedDepth:0,releasePhase:'ARI-04'},'GRAPH_PAYLOAD_NOT_ALLOWED'],
 ['enable graph injected',{requestedDepth:0,enableGraphExpansion:true},'GRAPH_PAYLOAD_NOT_ALLOWED'],
 ['maxDepth injected',{requestedDepth:0,maxDepth:5},'GRAPH_PAYLOAD_NOT_ALLOWED'],
 ['graph roles injected',{requestedDepth:0,allowedScopes:['global_system']},'GRAPH_PAYLOAD_NOT_ALLOWED'],
 ['even empty relation injected',{requestedDepth:0,edges:[]},'GRAPH_PAYLOAD_NOT_ALLOWED'],
 ['even undefined relation injected',{requestedDepth:0,edges:undefined},'GRAPH_PAYLOAD_NOT_ALLOWED'],
 ['graph auth override',{requestedDepth:0,authorizationEnforced:true},'GRAPH_PAYLOAD_NOT_ALLOWED'],
 ])test('graph rejects '+label,()=>{const i=base();i.graphExpansion=payload;deny(i,why)});
for(const [locale,text] of [
 ['ru','Ночной сон'],['en','Night sleep'],['pl','Sen nocny'],['es','Sueño nocturno'],
 ['de','Nachtschlaf'],['cs','Noční spánek'],['uk','Нічний сон']
]){
 test('seven locales exact gated '+locale,()=>{const i=base();i.query={text,locale};i.evidence=[title(C,text,{locale})];const r=assertSameRanking(i);assert.equal(r.candidates[0].onId,C)});
 test('seven locales alias gated '+locale,()=>{const i=base();i.query={text,locale};i.evidence=[alias(C,text,{locale})];const r=assertSameRanking(i);assert.equal(r.candidates[0].matchKind,'verified_alias')});
}
for(let n=1;n<=20;n++)test('deterministic reranking depth-zero permutation '+n,()=>{
 const i=base();i.lexical=[...i.lexical].reverse();i.vector=[...i.vector].reverse();
 i.lexical[0].rank=n%2+1;i.lexical[1].rank=3-n%2;
 i.vector[0].rank=n%3+1;i.vector[1].rank=5-n%3;
 assertSameRanking(i);
});
for(let n=1;n<=12;n++)test('duplicate source cannot modify depth-zero matching '+n,()=>{
 const i=base(),before=assertSameRanking(i);
 i.lexical.push(cand(B,1000+n));i.vector.push(cand(C,2000+n));
 const after=assertSameRanking(i);
 assert.deepEqual(ids(after),ids(before));assert.equal(after.graphCandidatesAdded,0);
});
