import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planAttemptCandidateV1,ATTEMPT_STATES,ADM5C3_CONTRACT} from '../src/lib/admin-execution/attemptRegistryDesignV1.ts';
const id='e6036022-146e-4eca-bacf-3af379858f92',snap='061e1e09-72b7-4d57-bc11-27f0cc6c5d4e';
const digest='a'.repeat(64);
function prep(){return {contract:'ARCTOR_ADM5C1_PREFLIGHT_DESIGN_READ_ONLY_V1',caseCode:'ADM-000001',assignmentId:id,taskCode:'commercial_fact_preflight',roleCode:'engineering',gates:[
 {code:'APPROVED_INSTRUCTIONS',state:'blocked',evidence:'missing',nextAction:'Approve policy'},
 {code:'BUDGET_AND_MODEL',state:'unknown',evidence:'not selected',nextAction:'Approve model'}],passed:0,blocked:1,unknown:1,
 finalDisposition:'EXECUTION_FORBIDDEN',agentExecutionPermitted:false,outboundAuthorized:false,modelCallsPerformed:false,dbWritesPerformed:false};}
function qual(){return {contract:'ARCTOR_ADM5B4_CONTEXT_QUALITY_READ_ONLY_V1',caseCode:'ADM-000001',assignmentId:id,taskCode:'commercial_fact_preflight',roleCode:'engineering',manifestDigest:digest,
 snapshot:{id:snap,version:1,integrity:'valid',changed:'none',currentManifestMatches:true,frozenDigestMatches:true,embeddedDigestMatches:true,sectionHashesMatch:true},
 agentExecutionPermitted:false,outboundAuthorized:false,modelCallsPerformed:false,dbWritesPerformed:false};}
let checks=0;
function test(n,fn){fn();checks++;}
const a=prep(),b=qual();const result=planAttemptCandidateV1(a,b);
for(const [k,v] of Object.entries({contract:ADM5C3_CONTRACT,caseCode:a.caseCode,assignmentId:id,roleCode:'engineering',taskCode:a.taskCode,snapshotId:snap,snapshotVersion:1,currentManifestDigest:digest,targetState:'awaiting_preflight',persistedAttemptId:null,selectedModelId:null,approvedBudgetEur:null,pricingSnapshotId:null,payerId:null,budgetReservationId:null,outboundPolicyId:null,numberOfPersistedAttempts:null,agentExecutionPermitted:false,outboundAuthorized:false,budgetReserved:false,dbWritesPerformed:false,modelCallsPerformed:false,finalDisposition:'EXECUTION_FORBIDDEN'}))
 test('key '+k,()=>assert.deepEqual(result[k],v));
test('candidate fingerprint sha',()=>assert.match(result.candidateFingerprint,/^[a-f0-9]{64}$/));
test('stable fingerprint',()=>assert.equal(planAttemptCandidateV1(prep(),qual()).candidateFingerprint,result.candidateFingerprint));
test('no mutation',()=>assert.equal(b.snapshot.version,1));
test('unresolved gates',()=>assert.equal(result.issues.length,4));
test('deduplicate actions',()=>assert.equal(result.nextRequiredActions.length,4));

// Regression for TS2322: a passing preflight gate is never an AttemptIssue.
{
 const p=prep(), q=qual();
 p.gates.unshift({code:'ADM4_ASSIGNMENT_VERIFIED',state:'pass',evidence:'verified',nextAction:'none'});
 p.passed=1;
 const assessed=planAttemptCandidateV1(p,q);
 test('passing gate is excluded from issues',()=>assert.ok(!assessed.issues.some(x=>x.code==='ADM4_ASSIGNMENT_VERIFIED')));
 test('blocked gate retains its status',()=>assert.equal(assessed.issues.find(x=>x.code==='APPROVED_INSTRUCTIONS')?.status,'blocked'));
 test('unknown gate retains its status',()=>assert.equal(assessed.issues.find(x=>x.code==='BUDGET_AND_MODEL')?.status,'unknown'));
}

test('states enumeration',()=>assert.equal(new Set(ATTEMPT_STATES).size,ATTEMPT_STATES.length));
function bad(name,p,q){test(name,()=>assert.throws(()=>planAttemptCandidateV1(p,q),/UPSTREAM_INVARIANT/));}
let p=prep(),q=qual();p.caseCode='BAD';bad('invalid case',p,q);
p=prep();q=qual();q.assignmentId='other';bad('assignment mismatch',p,q);
p=prep();q=qual();p.agentExecutionPermitted=true;bad('execution flag',p,q);
p=prep();q=qual();q.outboundAuthorized=true;bad('outbound flag',p,q);
p=prep();q=qual();p.gates=[];bad('gate counter',p,q);
p=prep();q=qual();p.taskCode='a';bad('bad task',p,q);
p=prep();q=qual();q.contract='BAD';bad('wrong upstream contract',p,q);
for(const [name,change] of [
 ['snapshotVersion',x=>x.snapshot.version=2],['snapshotId',x=>x.snapshot.id='d2b1ca42-b420-4ec7-8617-28cbaa072fb2'],
 ['manifestDigest',x=>x.manifestDigest='b'.repeat(64)],['caseCode',x=>x.caseCode='ADM-000002']]){
 const x=qual(), pp=prep();if(name==='caseCode')pp.caseCode='ADM-000002';change(x);
 test('changed candidate '+name,()=>assert.notEqual(planAttemptCandidateV1(pp,x).candidateFingerprint,result.candidateFingerprint));
}
for(const [name,change] of [
 ['stale',x=>x.snapshot.changed='included_text'],['invalid',x=>x.snapshot.integrity='invalid'],
 ['mismatch',x=>x.snapshot.currentManifestMatches=false],['no snapshot',x=>x.snapshot=null],
 ['broken hash',x=>x.manifestDigest='bad']]){
 const x=qual();change(x);const r=planAttemptCandidateV1(prep(),x);
 test('fail closed '+name,()=>assert.equal(r.finalDisposition,'EXECUTION_FORBIDDEN'));
 test('issue exists '+name,()=>assert.ok(r.issues.length>result.issues.length));
}
const screen=readFileSync('src/app/admin/agent-attempts/page.tsx','utf8');
test('admin guard',()=>assert.ok(screen.includes('requirePlatformAdmin({allowedRoles:["owner","admin"]})')));
test('read only notice',()=>assert.ok(screen.includes('не создаёт')||screen.includes('не создавая')));
test('links to ADM5C2',()=>assert.ok(screen.includes('/admin/agent-budget')));
test('no POST form',()=>assert.ok(!screen.includes('method="post"')));
console.log(`ARCTOR_ADM5C3A_PURE_QA_PASS_${checks}`);
