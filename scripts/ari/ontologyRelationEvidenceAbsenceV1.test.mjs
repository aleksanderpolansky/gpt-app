/** M-0191 deterministic offline test: 72 fixtures + 40 independent guards. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const repo=process.env.ARCTOR_REPO||process.cwd();
const source=process.env.ARCTOR_EVIDENCE_ABSENCE_TS||path.join(repo,'src/lib/ontology/relationEvidenceAbsenceGuardV1.ts');
const predecessor=process.env.ARCTOR_CONTRADICTION_TS||path.join(repo,'src/lib/ontology/contradictionDetectorV1.ts');
const ts=require(path.join(repo,'node_modules/typescript'));
const raw=fs.readFileSync(source,'utf8');
for(const fragment of ['supabase.from','supabase.rpc','fetch(','process.env','writeFileSync','unlinkSync','insert into','delete from'])
 assert.equal(raw.includes(fragment),false,'Forbidden side effect: '+fragment);
const opts={target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,strict:true,noEmit:true,
 skipLibCheck:true,lib:['lib.es2020.d.ts']};
const host=ts.createCompilerHost(opts);
host.resolveModuleNames=(names,containing)=>names.map(name=>name==='./contradictionDetectorV1'
 ? {resolvedFileName:predecessor,extension:ts.Extension.Ts}
 : ts.resolveModuleName(name,containing,opts,host).resolvedModule);
const program=ts.createProgram([source,predecessor],opts,host);
const errors=ts.getPreEmitDiagnostics(program).filter(d=>d.category===ts.DiagnosticCategory.Error);
assert.equal(errors.length,0,ts.formatDiagnostics(errors,{getCanonicalFileName:s=>s,getCurrentDirectory:()=>repo,getNewLine:()=> '\n'}));
const js=ts.transpileModule(raw,{fileName:source,compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
const exports={};
vm.runInNewContext(js,{exports,require:()=>{throw Error('No runtime imports permitted')},Set,Number,Array,Object}, {timeout:12000});
const guard=exports.assessRelationEvidenceAbsenceV1;
assert.equal(typeof guard,'function');
const input=(override={})=>({
 candidate:{id:'C',sourceValueObjectId:'A',targetValueObjectId:'B',relationTypeCode:'supports',status:'proposed',assertionPolarity:'affirm'},
 search:{scopeKey:'zone-A',completed:true,returnedRelationCount:0},
 evidence:{supportingRefs:[],counterRefs:[],citationRefs:[],sourceReviewStatus:'not_checked'},
 review:{decision:'unreviewed'},...override
});
const evidence=(v={})=>({...input().evidence,...v});
const review=(v={})=>({...input().review,...v});
const candidate=(v={})=>({...input().candidate,...v});
const search=(v={})=>({...input().search,...v});
const scan=(v={})=>guard(input(v));
const has=(r,code)=>r.findings.some(f=>f.code===code);
const safe=r=>{assert.equal(r.complete,true);assert.equal(r.claimTruth,'UNDETERMINED');
 assert.equal(r.canAssertFalse,false);assert.equal(r.negativeInferenceAllowed,false);
 assert.equal(r.approvesRelation,false);assert.equal(r.verifiesSource,false);assert.equal(r.writesPerformed,0)};
let n=0;const test=(name,fn)=>{try{fn()}catch(e){throw Error(name+': '+e.message)}n++};
// Six groups of twelve cases each. Every case asserts absence is NOT falsity.
for(let i=0;i<12;i++)test('empty bounded search '+i,()=>{
 const r=scan({search:search({scopeKey:'zone-'+i})});safe(r);
 assert.ok(has(r,'EMPTY_SEARCH_NOT_NEGATION'));
 assert.equal(r.disposition,'EVIDENCE_MISSING');
});
for(let i=0;i<12;i++)test('incomplete search '+i,()=>{
 const r=scan({search:search({completed:false,returnedRelationCount:i})});safe(r);
 assert.ok(has(r,'INCOMPLETE_SEARCH_NOT_ABSENCE'));assert.equal(r.disposition,'REVIEW_REQUIRED');
});
for(let i=0;i<12;i++)test('citation not proof '+i,()=>{
 const r=scan({search:search({returnedRelationCount:i+1}),
 evidence:evidence({supportingRefs:['ev-'+i],citationRefs:['cite-'+i]})});safe(r);
 assert.ok(has(r,'CITATION_NOT_SOURCE_VERIFICATION'));
 assert.equal(r.disposition,'REVIEW_REQUIRED');
});
for(let i=0;i<12;i++)test('rejection is not false '+i,()=>{
 const reasons=['insufficient_evidence','duplicate','out_of_scope','conflicting_assertions','other'];
 const r=scan({candidate:candidate({status:'rejected'}),
 review:review({decision:'rejected',rejectionReason:reasons[i%reasons.length]})});safe(r);
 assert.ok(has(r,'REJECTED_PROPOSAL_NOT_FALSE'));assert.equal(r.disposition,'EVIDENCE_MISSING');
});
for(let i=0;i<12;i++)test('stale check and negative assertion '+i,()=>{
 const r=scan({candidate:candidate({assertionPolarity:i%2?'deny':'affirm'}),
 review:review({decision:'recheck_due'}),search:search({returnedRelationCount:i})});safe(r);
 assert.ok(has(r,'RECHECK_DUE_NOT_FALSE'));assert.equal(r.disposition,'REVIEW_REQUIRED');
 if(i%2)assert.ok(has(r,'EXPLICIT_DENIAL_IS_CLAIM_NOT_PROOF'));
});
for(let i=0;i<12;i++)test('counter and source dispute '+i,()=>{
 const flags=['failed','disputed','recorded_verified'];
 const s=flags[i%3];const r=scan({
 evidence:evidence({supportingRefs:['ev-a'],counterRefs:['ev-b'],sourceReviewStatus:s})});safe(r);
 assert.ok(has(r,'COUNTEREVIDENCE_REQUIRES_ADJUDICATION'));
 if(s==='failed')assert.ok(has(r,'SOURCE_REVIEW_FAILED_NOT_RELATION_FALSE'));
 if(s==='recorded_verified')assert.ok(has(r,'REPORTED_SOURCE_VERIFIED_NOT_TRUTH_PROOF'));
 assert.equal(r.disposition,'REVIEW_REQUIRED');
});
assert.equal(n,72);
console.log('M-0191 SYNTHETIC OPEN-WORLD EVIDENCE FIXTURES PASS: 72/72');
let m=0;const inv=(name,fn)=>{try{fn()}catch(e){throw Error(name+': '+e.message)}m++};
inv('version',()=>assert.equal(scan().version,'ARCTOR_ARI_04_06_05_EVIDENCE_ABSENCE_GUARD_V1'));
inv('pure',()=>assert.equal(scan().writesPerformed,0));
inv('truth undetermined',()=>assert.equal(scan().claimTruth,'UNDETERMINED'));
inv('no negative inference',()=>assert.equal(scan().negativeInferenceAllowed,false));
inv('never false',()=>assert.equal(scan().canAssertFalse,false));
inv('never approval',()=>assert.equal(scan().approvesRelation,false));
inv('never source verification',()=>assert.equal(scan().verifiesSource,false));
inv('complete valid',()=>assert.equal(scan().complete,true));
inv('empty no false',()=>assert.ok(has(scan(),'EMPTY_SEARCH_NOT_NEGATION')));
inv('no evidence no false',()=>assert.ok(has(scan(),'NO_SUPPORTING_EVIDENCE_NOT_FALSE')));
inv('no evidence disposition',()=>assert.equal(scan().disposition,'EVIDENCE_MISSING'));
inv('candidate immutable',()=>{const x=candidate();const before=JSON.stringify(x);scan({candidate:x});assert.equal(JSON.stringify(x),before)});
inv('evidence immutable',()=>{const x=evidence({supportingRefs:['a','a']});const before=JSON.stringify(x);scan({evidence:x});assert.equal(JSON.stringify(x),before)});
inv('review immutable',()=>{const x=review();const before=JSON.stringify(x);scan({review:x});assert.equal(JSON.stringify(x),before)});
inv('search immutable',()=>{const x=search();const before=JSON.stringify(x);scan({search:x});assert.equal(JSON.stringify(x),before)});
inv('sort evidence',()=>assert.equal(JSON.stringify(scan({evidence:evidence({supportingRefs:['z','a','z']})}).findings.find(f=>f.code==='UNVERIFIED_SUPPORTING_RECORD').evidenceRefs),JSON.stringify(['a','z'])));
inv('scoped count nonempty not truth',()=>{const r=scan({search:search({returnedRelationCount:2})});safe(r);assert.ok(!has(r,'EMPTY_SEARCH_NOT_NEGATION'))});
inv('recorded source verified not truth',()=>{const r=scan({evidence:evidence({sourceReviewStatus:'recorded_verified',supportingRefs:['ev']})});safe(r);assert.ok(has(r,'REPORTED_SOURCE_VERIFIED_NOT_TRUTH_PROOF'))});
inv('active not truth',()=>{const r=scan({candidate:candidate({status:'active'})});safe(r);assert.ok(has(r,'REVIEW_STATUS_NOT_TRUTH'))});
inv('verified not truth',()=>{const r=scan({candidate:candidate({status:'verified'}),review:review({decision:'verified'})});safe(r);assert.ok(has(r,'REVIEW_STATUS_NOT_TRUTH'))});
inv('explicit denial not truth',()=>{const r=scan({candidate:candidate({assertionPolarity:'deny'})});safe(r);assert.ok(has(r,'EXPLICIT_DENIAL_IS_CLAIM_NOT_PROOF'))});
inv('rejected other reason',()=>{const r=scan({review:review({decision:'rejected',rejectionReason:'other'})});safe(r);assert.ok(has(r,'REJECTED_PROPOSAL_NOT_FALSE'))});
inv('recheck requires review',()=>assert.equal(scan({review:review({decision:'recheck_due'})}).disposition,'REVIEW_REQUIRED'));
inv('counter requires review',()=>assert.equal(scan({evidence:evidence({counterRefs:['x']})}).disposition,'REVIEW_REQUIRED'));
inv('source failed review',()=>assert.equal(scan({evidence:evidence({sourceReviewStatus:'failed'})}).disposition,'REVIEW_REQUIRED'));
inv('source disputed review',()=>assert.equal(scan({evidence:evidence({sourceReviewStatus:'disputed'})}).disposition,'REVIEW_REQUIRED'));
inv('no candidate invalid',()=>assert.equal(scan({candidate:null}).complete,false));
inv('bad status invalid',()=>assert.equal(scan({candidate:candidate({status:'fabricated'})}).disposition,'BLOCKED_INVALID_INPUT'));
inv('bad polarity invalid',()=>assert.equal(scan({candidate:candidate({assertionPolarity:'implied_no'})}).complete,false));
inv('bad source enum invalid',()=>assert.equal(scan({evidence:evidence({sourceReviewStatus:'supported'})}).complete,false));
inv('bad ref invalid',()=>assert.equal(scan({evidence:evidence({supportingRefs:[null]})}).complete,false));
inv('empty ref invalid',()=>assert.equal(scan({evidence:evidence({supportingRefs:['']})}).complete,false));
inv('control ref invalid',()=>assert.equal(scan({evidence:evidence({supportingRefs:['x\ny']})}).complete,false));
inv('bad scope invalid',()=>assert.equal(scan({search:search({scopeKey:''})}).complete,false));
inv('bad count invalid',()=>assert.equal(scan({search:search({returnedRelationCount:-1})}).complete,false));
inv('fraction count invalid',()=>assert.equal(scan({search:search({returnedRelationCount:0.5})}).complete,false));
inv('bad completed invalid',()=>assert.equal(scan({search:search({completed:'false'})}).complete,false));
inv('rejection reason without rejection invalid',()=>assert.equal(scan({review:review({rejectionReason:'other'})}).complete,false));
inv('rejection without reason invalid',()=>assert.equal(scan({review:review({decision:'rejected'})}).complete,false));
inv('contradictory workflow statuses invalid',()=>assert.equal(scan({candidate:candidate({status:'verified'}),review:review({decision:'rejected',rejectionReason:'other'})}).complete,false));
assert.equal(m,40);
console.log('M-0191 INDEPENDENT EPISTEMIC INVARIANTS PASS: 40/40');
console.log('M-0191 CODE READONLY: no DB, API, network, ledger or graph mutation.');
