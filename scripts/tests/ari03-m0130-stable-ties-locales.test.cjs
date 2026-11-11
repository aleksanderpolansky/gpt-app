'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const ts=require(require.resolve('typescript',{paths:[process.cwd(),'/opt/nvm/versions/node/v22.16.0/lib/node_modules']}));
const file=process.env.ARCTOR_M0130_TEST_MODULE_PATH||path.join(process.cwd(),'src/lib/ontology-research/hybridRankerV1.ts');
const out=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});
assert.equal(out.diagnostics?.length||0,0);
const mod=new Module(file,module);mod.filename=file;mod.paths=Module._nodeModulePaths(path.dirname(file));mod._compile(out.outputText,file);
const H=mod.exports;
const IDs=Array.from({length:12},(_,i)=>`${String(i+1).padStart(8,'0')}-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
const GLOBAL={kind:'global_system'},PRIV={kind:'owner_private',ownerActorId:'99999999-9999-4999-8999-999999999999'};
const LOCS=[['en','Night sleep'],['pl','Sen nocny'],['es','Sueño nocturno'],['de','Nachtschlaf'],['cs','Noční spánek'],['uk','Нічний сон'],['ru','Ночной сон']];
function row(onId,rank,locale='ru',extra={}){return {onId,rank,locale,scope:GLOBAL,...extra}}
function exact(onId,kind,text,locale='ru',extra={}){return {onId,scope:GLOBAL,locale,kind,text,...extra}}
function tieInput(locale='ru',text='Ночной сон'){
 return {lexical:IDs.slice(0,8).map(id=>row(id,1,locale)),
   vector:IDs.slice(0,8).map(id=>row(id,1,locale)),
   query:{text,locale},evidence:[],graphExpansion:{requestedDepth:0}};
}
const invoke=i=>H.rankHybridCandidatesStableTiesV1(i);
const ok=i=>{const result=invoke(i);assert.equal(result.ok,true,JSON.stringify(result));return result};
const reject=(i,reason)=>{const r=invoke(i);assert.equal(r.ok,false,JSON.stringify(r));assert.equal(r.reason,reason);assert.deepEqual(r.candidates,[]);assert.equal(r.orderVerified,false);return r};
const ids=r=>r.candidates.map(c=>c.onId);
const old=i=>H.rankHybridCandidatesGraphGatedV1(i);
const same=i=>{const r=ok(i),prior=old(i);assert.equal(prior.ok,true);assert.deepEqual(r.candidates,prior.candidates);return r};
const rotate=(arr,n)=>[...arr.slice(n%arr.length),...arr.slice(0,n%arr.length)];
const permute=(a,n)=>n%3===0?[...a].reverse():n%3===1?rotate(a,n):[...a].sort((x,y)=>(x.onId<y.onId?1:-1));

test('M0130 contract and immutable policy',()=>{
 assert.equal(H.HYBRID_STABLE_TIES_CONTRACT_V1,'ARCTOR_ARI03_M0130_STABLE_TIES_V1');
 assert.equal(H.HYBRID_STABLE_TIES_POLICY_V1,'EXACT_TIER_RRF_LEXICAL_VECTOR_ASCII_UUID');
});
test('M0129 graph boundary preserved',()=>assert.equal(H.HYBRID_MAX_GRAPH_DEPTH_V1,0));
test('M0128 provenance contract preserved',()=>assert.equal(H.HYBRID_EXPLANATION_CONTRACT_V1,'ARCTOR_ARI03_M0128_VERSIONED_FIELD_EXPLANATION_V1'));
test('M0127 exact contract preserved',()=>assert.equal(H.HYBRID_EXACT_PRIORITY_CONTRACT_V1,'ARCTOR_ARI03_M0127_EXACT_VERIFIED_ALIAS_PRIORITY_V1'));
test('M0126 RRF k60 contract preserved',()=>assert.equal(H.HYBRID_RRF_K_V1,60));
test('M0125 UUID merge contract preserved',()=>assert.equal(H.HYBRID_MERGE_CONTRACT_V1,'ARCTOR_ARI03_M0125_UUID_CANDIDATE_MERGE_V1'));
test('all-eight RRF ties sorted only by ASCII UUID',()=>{
 const r=same(tieInput());assert.deepEqual(ids(r),IDs.slice(0,8));assert.equal(r.tiesDetected,7);assert.equal(r.tieGroups,1);
 assert.equal(r.localeCollationUsed,false);assert.equal(r.orderVerified,true);
});
test('no candidates gives zero ties',()=>{const i=tieInput();i.lexical=[];i.vector=[];const r=same(i);assert.equal(r.tiesDetected,0);assert.equal(r.tieGroups,0)});
test('single candidate gives zero ties',()=>{const i=tieInput();i.lexical=i.lexical.slice(0,1);i.vector=[];const r=same(i);assert.equal(r.tiesDetected,0)});
test('duplicate source cannot boost score',()=>{const i=tieInput();i.lexical.push({...i.lexical[0],rank:100});const r=same(i);assert.equal(r.candidates.length,8)});
test('RRF symmetrical component tie favors lexical source rank',()=>{
 const i=tieInput();i.lexical=[row(IDs[0],1),row(IDs[1],3)];i.vector=[row(IDs[0],3),row(IDs[1],1)];
 const r=same(i);assert.deepEqual(ids(r),[IDs[0],IDs[1]]);assert.equal(r.tiesDetected,1);
});
test('missing source rank sorts behind present source on tied RRF',()=>{
 const i=tieInput();i.lexical=[row(IDs[1],1)];i.vector=[row(IDs[0],1)];
 const r=same(i);assert.deepEqual(ids(r),[IDs[1],IDs[0]]);assert.equal(r.tiesDetected,1);
});
test('exact title wins over RRF ties independently of UUID',()=>{
 const i=tieInput();i.evidence=[exact(IDs[7],'canonical_title',i.query.text)];const r=same(i);
 assert.equal(r.candidates[0].onId,IDs[7]);assert.equal(r.candidates[0].matchPriority,2);assert.equal(r.tiesDetected,6);
});
test('verified alias wins ordinary RRF ties',()=>{
 const i=tieInput();i.evidence=[exact(IDs[7],'alias',i.query.text,'ru',{aliasStatus:'verified_active'})];
 assert.equal(same(i).candidates[0].onId,IDs[7]);
});
test('pending alias does not boost',()=>{
 const i=tieInput();i.evidence=[exact(IDs[7],'alias',i.query.text,'ru',{aliasStatus:'pending'})];
 assert.deepEqual(ids(same(i)),IDs.slice(0,8));
});
test('revoked alias does not boost',()=>{
 const i=tieInput();i.evidence=[exact(IDs[7],'alias',i.query.text,'ru',{aliasStatus:'revoked'})];
 assert.deepEqual(ids(same(i)),IDs.slice(0,8));
});
test('exact title always above verified alias even if UUID greater',()=>{
 const i=tieInput();i.evidence=[exact(IDs[7],'canonical_title',i.query.text),exact(IDs[0],'alias',i.query.text,'ru',{aliasStatus:'verified_active'})];
 const r=same(i);assert.deepEqual(ids(r).slice(0,2),[IDs[7],IDs[0]]);
});
test('RRF-only rollback retains exact previous ranking',()=>{
 const i=tieInput();i.evidence=[exact(IDs[7],'canonical_title',i.query.text)];i.enableExactPriority=false;
 const r=same(i);assert.deepEqual(ids(r),IDs.slice(0,8));
});
test('graph depth 1 rejected even with ties',()=>{const i=tieInput();i.graphExpansion={requestedDepth:1};reject(i,'GRAPH_EXPANSION_DEFERRED_UNTIL_ARI04')});
test('injected graph candidates rejected even if depth zero',()=>{const i=tieInput();i.graphExpansion={requestedDepth:0,graphCandidates:[]};reject(i,'GRAPH_PAYLOAD_NOT_ALLOWED')});
test('invalid source candidate rejected',()=>{const i=tieInput();i.lexical[0].rank=0;reject(i,'INVALID_RANK')});
test('unauthorized owner scope conflict still rejected',()=>{const i=tieInput();i.vector[0].scope=PRIV;reject(i,'SCOPE_CONFLICT')});
test('no provider and no localeCompare in M0130 extension',()=>{
 const src=fs.readFileSync(file,'utf8');const ext=src.split('/**\n * ARI-03.06.06 / M-0130')[1];assert.ok(ext);
 assert.doesNotMatch(ext,/localeCompare|Intl\.Collator|\bfetch\s*\(|OPENAI_API_KEY|Math\.random|process\.env/);
});
test('no inputs mutated',()=>{const i=tieInput(),before=structuredClone(i);same(i);assert.deepEqual(i,before)});
test('frozen objects accepted',()=>{const i=tieInput();Object.freeze(i.lexical[0]);Object.freeze(i.vector[0]);Object.freeze(i);same(i)});
test('rawScore never changes ties',()=>{
 const i=tieInput();i.lexical[0].rawScore=-1000000;i.lexical[4].rawScore=Infinity;i.vector[1].rawScore=999;
 assert.deepEqual(ids(same(i)),IDs.slice(0,8));
});
test('no separate graph candidates or ontology assertions',()=>{const r=ok(tieInput());assert.equal(r.graphCandidatesAdded,0);assert.equal(r.relationsAsserted,false)});
test('graph gate failures carry no ranked output',()=>{const i=tieInput();i.graphExpansion={requestedDepth:-1};const r=reject(i,'INVALID_GRAPH_REQUEST');assert.equal(r.graphCandidatesAdded,0)});

for(const [locale,text] of LOCS){
 test(`${locale}: basic equal-score ties stable`,()=>{const r=same(tieInput(locale,text));assert.deepEqual(ids(r),IDs.slice(0,8))});
 test(`${locale}: exact title wins score ties`,()=>{
  const i=tieInput(locale,text);i.evidence=[exact(IDs[7],'canonical_title',text,locale)];assert.equal(same(i).candidates[0].onId,IDs[7]);
 });
 test(`${locale}: verified alias wins score ties`,()=>{
  const i=tieInput(locale,text);i.evidence=[exact(IDs[6],'alias',text,locale,{aliasStatus:'verified_active'})];
  assert.equal(same(i).candidates[0].onId,IDs[6]);
 });
 test(`${locale}: unverified alias not promoted`,()=>{
  const i=tieInput(locale,text);i.evidence=[exact(IDs[7],'alias',text,locale,{aliasStatus:'pending'})];
  assert.deepEqual(ids(same(i)),IDs.slice(0,8));
 });
 test(`${locale}: exact title NFKC/case stable`,()=>{
  const i=tieInput(locale,text);i.query.text=text.toLocaleUpperCase(locale);
  i.evidence=[exact(IDs[5],'canonical_title',text,locale)];assert.equal(same(i).candidates[0].onId,IDs[5]);
 });
 test(`${locale}: lexical and vector tie cross-source`,()=>{
  const i=tieInput(locale,text);i.lexical=[row(IDs[1],1,locale)];i.vector=[row(IDs[0],1,locale)];
  assert.deepEqual(ids(same(i)),[IDs[1],IDs[0]]);
 });
 test(`${locale}: exact rollback stable`,()=>{
  const i=tieInput(locale,text);i.evidence=[exact(IDs[7],'canonical_title',text,locale)];i.enableExactPriority=false;
  assert.deepEqual(ids(same(i)),IDs.slice(0,8));
 });
 test(`${locale}: locale variants do not affect UUID ASCII order`,()=>{
  const i=tieInput(locale,text);i.lexical.forEach((c,n)=>{c.locale=LOCS[n%LOCS.length][0]});
  assert.deepEqual(ids(same(i)),IDs.slice(0,8));
 });
}
for(let k=1;k<=45;k++)test(`stable UUID ties under independent source permutations #${k}`,()=>{
 const [locale,text]=LOCS[k%LOCS.length],i=tieInput(locale,text);
 i.lexical=permute(i.lexical,k);i.vector=permute(i.vector,k+1);
 const r=same(i);assert.deepEqual(ids(r),IDs.slice(0,8));assert.equal(r.tiesDetected,7);
});
for(let k=1;k<=21;k++)test(`stable priority-tier ties under input permutations #${k}`,()=>{
 const [locale,text]=LOCS[k%LOCS.length],i=tieInput(locale,text);
 i.lexical=permute(i.lexical,k);i.vector=permute(i.vector,k+2);
 i.evidence=[exact(IDs[7],'canonical_title',text,locale),exact(IDs[6],'alias',text,locale,{aliasStatus:'verified_active'})];
 const r=same(i);assert.deepEqual(ids(r),[IDs[7],IDs[6],...IDs.slice(0,6)]);
});
