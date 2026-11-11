'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const ts=require(require.resolve('typescript',{paths:[process.cwd(),'/opt/nvm/versions/node/v22.16.0/lib/node_modules']}));
const loc=process.env.ARCTOR_M0128_TEST_MODULE_PATH||path.join(process.cwd(),'src/lib/ontology-research/hybridRankerV1.ts');
function load(p){const t=ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});assert.equal(t.diagnostics?.length||0,0);const m=new Module(p,module);m.filename=p;m.paths=Module._nodeModulePaths(path.dirname(p));m._compile(t.outputText,p);return m.exports;}
const H=load(loc);
const A='11111111-2222-4333-8444-555555555555';
const B='22222222-3333-4444-8555-666666666666';
const C='33333333-4444-4555-8666-777777777777';
const D='44444444-5555-4666-8777-888888888888';
const X='55555555-6666-4777-8888-999999999999';
const OWNER='66666666-7777-4888-8999-aaaaaaaaaaaa';
const OTHER='77777777-8888-4999-8aaa-bbbbbbbbbbbb';
const global={kind:'global_system'};const priv={kind:'owner_private',ownerActorId:OWNER};
const cand=(onId,rank,more={})=>({onId,rank,locale:'ru',scope:global,...more});
const title=(onId,text='ночной сон',more={})=>({onId,scope:global,locale:'ru',kind:'canonical_title',text,...more});
const alias=(onId,text='ночной сон',more={})=>({onId,scope:global,locale:'ru',kind:'alias',aliasStatus:'verified_active',text,...more});
const provenance=(onId,lex=true,vec=true,more={})=>({onId,scope:global,catalogVersion:'rev:20261103',
 ...(lex?{lexical:{indexVersion:'lex-v1',matchedFields:['canonical_title','definition']}}:{}),
 ...(vec?{vector:{indexVersion:'vec-v1',embeddingVersion:'emb-v1',modelId:'text-embedding-3-small',embeddedFields:['canonical_title','definition']}}:{}),...more});
const exact=(kind='canonical_title',more={})=>({kind,locale:'ru',matchedText:'ночной сон',fieldVersion:'field-v3',...(kind==='verified_alias'?{aliasId:X}:{}),...more});
const base=()=>({lexical:[cand(A,1),cand(B,2)],vector:[cand(B,1),cand(C,2)],
 query:{text:'ночной сон',locale:'ru'},evidence:[title(C)],
 provenance:[provenance(A,true,false),provenance(B,true,true),
 provenance(C,false,true,{exact:exact()})]});
const invoke=i=>H.explainHybridCandidatesV1(i);
const ok=i=>{const r=invoke(i);assert.equal(r.ok,true,JSON.stringify(r));return r;};
const reject=(i,reason)=>{const r=invoke(i);assert.equal(r.ok,false,JSON.stringify(r));assert.equal(r.reason,reason);assert.deepEqual(r.candidates,[]);return r};
const ids=r=>r.candidates.map(x=>x.onId);
const copy=x=>structuredClone(x);
const mutate=(fn)=>{const i=base();fn(i);return i};
test('M0128 explanation contract',()=>assert.equal(H.HYBRID_EXPLANATION_CONTRACT_V1,'ARCTOR_ARI03_M0128_VERSIONED_FIELD_EXPLANATION_V1'));
test('M0127 preserved contract',()=>assert.equal(H.HYBRID_EXACT_PRIORITY_CONTRACT_V1,'ARCTOR_ARI03_M0127_EXACT_VERIFIED_ALIAS_PRIORITY_V1'));
test('M0126 preserved contract',()=>assert.equal(H.HYBRID_RRF_CONTRACT_V1,'ARCTOR_ARI03_M0126_RRF_K60_V1'));
test('M0125 preserved contract',()=>assert.equal(H.HYBRID_MERGE_CONTRACT_V1,'ARCTOR_ARI03_M0125_UUID_CANDIDATE_MERGE_V1'));
test('no inputs no explanations',()=>{const i={lexical:[],vector:[],query:{text:'test',locale:'en'},evidence:[],provenance:[]};assert.deepEqual(ok(i).candidates,[])});
test('canonical match outranks both source rankings',()=>assert.equal(ids(ok(base()))[0],C));
test('no modification of ranks vs M0127',()=>{const i=base(),a=ok(i),b=H.rankHybridCandidatesWithExactPriorityV1(i);assert.deepEqual(ids(a),ids(b));assert.deepEqual(a.candidates.map(x=>x.rrfRank),b.candidates.map(x=>x.rrfRank));assert.deepEqual(a.candidates.map(x=>x.rrfScore),b.candidates.map(x=>x.rrfScore));});
test('one explanation per UUID',()=>assert.deepEqual(ids(ok(base())).sort(),[A,B,C].sort()));
test('explanation own output not RLS enforcement',()=>{const r=ok(base());assert.equal(r.authorizationEnforced,false);assert.equal(r.provenanceVerifiedByCaller,false)});
test('lexical-only candidate has lexical trace',()=>{const e=ok(base()).candidates.find(x=>x.onId===A).explanation;assert.ok(e.lexical);assert.equal(e.vector,null);assert.deepEqual(e.reasons,['lexical_rank'])});
test('vector-only candidate has vector trace',()=>{const e=ok(base()).candidates.find(x=>x.onId===C).explanation;assert.equal(e.lexical,null);assert.ok(e.vector);assert.deepEqual(e.reasons,['vector_rank','canonical_title_exact'])});
test('lexical + vector candidate has both traces',()=>{const e=ok(base()).candidates.find(x=>x.onId===B).explanation;assert.ok(e.lexical);assert.ok(e.vector);assert.deepEqual(e.reasons,['lexical_rank','vector_rank'])});
test('exact reason and field version',()=>{const e=ok(base()).candidates[0].explanation;assert.deepEqual(e.exact,{kind:'canonical_title',locale:'ru',fieldVersion:'field-v3',aliasId:null})});
test('source versions retained',()=>{const e=ok(base()).candidates.find(x=>x.onId===B).explanation;assert.equal(e.catalogVersion,'rev:20261103');assert.equal(e.lexical.indexVersion,'lex-v1');assert.equal(e.vector.indexVersion,'vec-v1');assert.equal(e.vector.embeddingVersion,'emb-v1');assert.equal(e.vector.modelId,'text-embedding-3-small')});
test('RRF contributions reflect prior engine',()=>{const r=ok(base());for(const x of r.candidates){const e=x.explanation;assert.equal((e.lexical?.rrfContribution||0)+(e.vector?.rrfContribution||0),x.rrfScore);assert.equal(e.rrfScore,x.rrfScore);assert.equal(e.rrfK,60)}});
test('field paths not guessed from rank',()=>{const i=base();i.provenance[0].lexical.matchedFields=['unspecified'];assert.deepEqual(ok(i).candidates.find(x=>x.onId===A).explanation.lexical.matchedFields,['unspecified'])});
test('field list sorted and unique',()=>{const i=base();i.provenance[0].lexical.matchedFields=['definition','canonical_title','definition'];assert.deepEqual(ok(i).candidates.find(x=>x.onId===A).explanation.lexical.matchedFields,['canonical_title','definition'])});
test('raw source score not included',()=>{const i=base();i.lexical[0].rawScore=99999;i.vector[0].rawScore=5555;const r=ok(i);assert.equal(JSON.stringify(r).includes('rawScore'),false)});
test('plain explanation does not echo query',()=>{const r=ok(base());assert.equal(JSON.stringify(r.candidates[0].explanation).includes('ночной сон'),false)});
test('provenance order does not change output',()=>{const i=base();const orig=ok(i);i.provenance.reverse();assert.deepEqual(ok(i),orig)});
test('case-insensitive UUID in provenance normalized',()=>{const i=base();i.provenance[0].onId=A.toUpperCase();assert.equal(ok(i).candidates.length,3)});
test('rollback flag retains RRF',()=>{const i=base();i.enableExactPriority=false;delete i.provenance[2].exact;const r=ok(i);assert.equal(r.exactBoostApplied,false);assert.equal(r.rankPolicy,'RRF_K60_ROLLBACK');assert.deepEqual(ids(r),ids(H.rankHybridCandidatesRrfV1(i)));});
test('rollback flag disables exact requirement',()=>{const i=base();i.enableExactPriority=false;delete i.provenance[2].exact;const r=ok(i);assert.equal(r.candidates.find(x=>x.onId===C).explanation.exact,null)});
test('verified alias trace matched to authoritative evidence',()=>{const i=base();i.evidence=[alias(C)];i.provenance[2].exact=exact('verified_alias');const e=ok(i).candidates[0].explanation;assert.deepEqual(e.reasons,['vector_rank','verified_alias_exact']);assert.equal(e.exact.aliasId,X)});
test('pending alias not promoted or explained',()=>{const i=base();i.evidence=[alias(C,'ночной сон',{aliasStatus:'pending'})];delete i.provenance[2].exact;const r=ok(i);assert.equal(r.exactBoostApplied,false);assert.equal(r.candidates.find(x=>x.onId===C).explanation.exact,null)});
test('revoked alias not promoted or explained',()=>{const i=base();i.evidence=[alias(C,'ночной сон',{aliasStatus:'revoked'})];delete i.provenance[2].exact;const r=ok(i);assert.equal(r.exactBoostApplied,false)});
test('private candidate with proper provenance scope',()=>{const i=base();i.lexical[0].scope=priv;i.provenance[0].scope=priv;assert.equal(ok(i).candidates.find(x=>x.onId===A).scope.kind,'owner_private')});
test('mixed candidate duplicate rows never inflates RRF',()=>{const i=base();i.lexical.push(cand(B,6));i.vector.push(cand(B,7));const r=ok(i);assert.equal(r.candidates.length,3);assert.equal(r.deduplicatedCount,3)});
test('source field order cannot change ranking',()=>{const i=base(),a=ok(i);i.provenance[0].lexical.matchedFields.reverse();assert.deepEqual(ids(ok(i)),ids(a))});
test('input and nested arrays not mutated',()=>{const i=base(),b=copy(i);ok(i);assert.deepEqual(i,b)});
test('frozen input supported',()=>{const i=base();for(const p of i.provenance){if(p.lexical)Object.freeze(p.lexical.matchedFields);if(p.vector)Object.freeze(p.vector.embeddedFields);if(p.lexical)Object.freeze(p.lexical);if(p.vector)Object.freeze(p.vector);if(p.exact)Object.freeze(p.exact);Object.freeze(p)}Object.freeze(i.provenance);Object.freeze(i);assert.equal(ok(i).candidates.length,3)});
test('no DB/provider/network inside engine',()=>assert.doesNotMatch(fs.readFileSync(loc,'utf8'),/\bfetch\s*\(|https?\.request|createClient\s*\(|process\.env|OPENAI_API_KEY|Math\.random/i));
for(const [n,fn,why] of [
 ['provenance missing',i=>delete i.provenance,'INVALID_PROVENANCE'],
 ['provenance null',i=>i.provenance=null,'INVALID_PROVENANCE'],
 ['provenance string',i=>i.provenance='a','INVALID_PROVENANCE'],
 ['missing candidate provenance',i=>i.provenance.pop(),'PROVENANCE_MISSING_UUID'],
 ['duplicate provenance',i=>i.provenance.push(copy(i.provenance[0])),'PROVENANCE_DUPLICATE_UUID'],
 ['unknown UUID provenance',i=>i.provenance[0].onId=D,'PROVENANCE_UNKNOWN_UUID'],
 ['malformed UUID provenance',i=>i.provenance[0].onId='NO','INVALID_PROVENANCE'],
 ['null provenance item',i=>i.provenance[0]=null,'INVALID_PROVENANCE'],
 ['array provenance item',i=>i.provenance[0]=[],'INVALID_PROVENANCE'],
 ['scope private vs global',i=>i.provenance[0].scope=priv,'PROVENANCE_SCOPE_CONFLICT'],
 ['scope bad',i=>i.provenance[0].scope={kind:'unknown'},'INVALID_PROVENANCE'],
 ['source wrongly lexical missing',i=>delete i.provenance[0].lexical,'PROVENANCE_SOURCE_MISMATCH'],
 ['source wrongly lexical added',i=>i.provenance[2].lexical={indexVersion:'v',matchedFields:['definition']},'PROVENANCE_SOURCE_MISMATCH'],
 ['source wrongly vector missing',i=>delete i.provenance[2].vector,'PROVENANCE_SOURCE_MISMATCH'],
 ['source wrongly vector added',i=>i.provenance[0].vector={indexVersion:'v',embeddingVersion:'v',modelId:'v',embeddedFields:['definition']},'PROVENANCE_SOURCE_MISMATCH'],
 ['catalog version missing',i=>delete i.provenance[0].catalogVersion,'INVALID_PROVENANCE_VERSION'],
 ['catalog version empty',i=>i.provenance[0].catalogVersion='','INVALID_PROVENANCE_VERSION'],
 ['catalog version spacing',i=>i.provenance[0].catalogVersion='v 1','INVALID_PROVENANCE_VERSION'],
 ['catalog version long',i=>i.provenance[0].catalogVersion='x'.repeat(129),'INVALID_PROVENANCE_VERSION'],
 ['lexical version missing',i=>delete i.provenance[0].lexical.indexVersion,'INVALID_PROVENANCE'],
 ['lexical fields empty',i=>i.provenance[0].lexical.matchedFields=[],'INVALID_PROVENANCE'],
 ['lexical fields unknown',i=>i.provenance[0].lexical.matchedFields=['made_up'],'INVALID_PROVENANCE'],
 ['lexical fields too many',i=>i.provenance[0].lexical.matchedFields=Array(9).fill('definition'),'INVALID_PROVENANCE'],
 ['vector model missing',i=>delete i.provenance[2].vector.modelId,'INVALID_PROVENANCE'],
 ['vector model bad',i=>i.provenance[2].vector.modelId='model name','INVALID_PROVENANCE'],
 ['vector index missing',i=>delete i.provenance[2].vector.indexVersion,'INVALID_PROVENANCE'],
 ['vector embedding version missing',i=>delete i.provenance[2].vector.embeddingVersion,'INVALID_PROVENANCE'],
 ['vector fields empty',i=>i.provenance[2].vector.embeddedFields=[],'INVALID_PROVENANCE'],
 ['vector fields wrong',i=>i.provenance[2].vector.embeddedFields=['something'],'INVALID_PROVENANCE'],
 ['canonical match provenance missing',i=>delete i.provenance[2].exact,'EXACT_FIELD_PROVENANCE_MISMATCH'],
 ['canonical match provenance wrong kind',i=>i.provenance[2].exact.kind='verified_alias','EXACT_FIELD_PROVENANCE_MISMATCH'],
 ['canonical match provenance missing version',i=>delete i.provenance[2].exact.fieldVersion,'EXACT_FIELD_PROVENANCE_MISMATCH'],
 ['canonical match provenance wrong locale',i=>i.provenance[2].exact.locale='en','EXACT_FIELD_PROVENANCE_MISMATCH'],
 ['canonical match provenance wrong text',i=>i.provenance[2].exact.matchedText='другой сон','EXACT_FIELD_PROVENANCE_MISMATCH'],
 ['canonical match provenance alias id',i=>i.provenance[2].exact.aliasId=X,'EXACT_FIELD_PROVENANCE_MISMATCH'],
 ['unmatched candidate exact invented',i=>i.provenance[0].exact=exact(),'EXACT_FIELD_PROVENANCE_MISMATCH'],
 ['invalid query propagated',i=>i.query.text='','INVALID_QUERY'],
 ['invalid source rank propagated',i=>i.vector[0].rank=0,'INVALID_RANK'],
 ['evidence unknown UUID propagated',i=>i.evidence[0].onId=D,'EVIDENCE_UNKNOWN_UUID'],
 ])test('fail closed '+n,()=>reject(mutate(fn),why));
for(const [lang,word] of [['ru','Ночной сон'],['en','Night sleep'],['pl','Sen nocny'],['es','Sueño nocturno'],['de','Nachtschlaf'],['cs','Noční spánek'],['uk','Нічний сон']]){
 test('seven locales exact '+lang,()=>{const i=base();i.query={text:word,locale:lang};i.evidence=[title(C,word,{locale:lang})];i.provenance[2].exact=exact('canonical_title',{locale:lang,matchedText:word});assert.equal(ok(i).candidates[0].matchKind,'canonical_title')});
 test('seven locales alias '+lang,()=>{const i=base();i.query={text:word,locale:lang};i.evidence=[alias(C,word,{locale:lang})];i.provenance[2].exact=exact('verified_alias',{locale:lang,matchedText:word});assert.equal(ok(i).candidates[0].matchKind,'verified_alias')});
}
for(let n=1;n<=15;n++)test('deterministic shuffled provenance '+n,()=>{const i=base(),orig=ok(i);i.provenance.sort((a,b)=>((a.onId.charCodeAt(0)*n*7)%11)-((b.onId.charCodeAt(0)*n*7)%11));assert.deepEqual(ok(i),orig)});
for(const [kind,text,expect] of [
 ['verified_alias','ночной сон',true],['canonical_title','ночной сон',true],
 ['verified_alias','ночной сон сегодня',false],['canonical_title','сон',false],
 ['verified_alias','ночной сон!',false]
])test('match proof '+kind+' '+text,()=>{const i=base();i.evidence=[kind==='canonical_title'?title(C,text):alias(C,text)];if(!expect)delete i.provenance[2].exact;else i.provenance[2].exact=exact(kind);const r=ok(i);assert.equal(r.candidates.find(x=>x.onId===C).matchPriority>0,expect)});
