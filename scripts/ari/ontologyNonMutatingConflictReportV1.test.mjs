/** M-0193 — deterministic non-mutating report fixtures; no network, DB or writes. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';

const req=createRequire(import.meta.url);
const repo=process.env.ARCTOR_REPO||process.cwd();
const detectorFile=process.env.ARCTOR_CONTRADICTION_TS||path.join(repo,'src/lib/ontology/contradictionDetectorV1.ts');
const reportFile=process.env.ARCTOR_M0193_REPORT_TS||path.join(repo,'src/lib/ontology/nonMutatingConflictReportV1.ts');
const ts=(()=>{try{return req(path.join(repo,'node_modules/typescript'))}catch{return req('typescript')}})();
const opts={target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,strict:true,noEmit:true,
 skipLibCheck:true,lib:['lib.es2020.d.ts']};
const program=ts.createProgram([detectorFile,reportFile],opts);
const errors=ts.getPreEmitDiagnostics(program).filter(d=>d.category===ts.DiagnosticCategory.Error);
assert.equal(errors.length,0,ts.formatDiagnostics(errors,{getCanonicalFileName:s=>s,getCurrentDirectory:()=>repo,getNewLine:()=> '\n'}));
const forbidden=['supabase.from','supabase.rpc','fetch(','writeFileSync','unlinkSync','insert into','delete from','localStorage','globalThis'];
function load(file,deps={}){
 const raw=fs.readFileSync(file,'utf8');
 for(const word of forbidden)assert.equal(raw.toLowerCase().includes(word.toLowerCase()),false,`Forbidden operation ${word}`);
 const js=ts.transpileModule(raw,{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
 const exports={};
 vm.runInNewContext(js,{exports,Map,Set,Date,BigInt,require:(name)=>{
  assert.ok(Object.hasOwn(deps,name),`Unexpected dependency ${name}`);
  return deps[name];
 }},{timeout:12000,filename:file});
 return exports;
}
const detector=load(detectorFile);
const report=load(reportFile,{'./contradictionDetectorV1':detector});
const evaluate=report.createNonMutatingConflictReportV1;
assert.equal(typeof evaluate,'function');
const nodes=['A','B','C','D'].map(id=>({id,facetCode:'PROCESS',scopeCode:'global'}));
const registry=['supports','conflicts_with','depends_on','classified_as','related_to','influences'].map(code=>({
 relationTypeCode:code,status:'active',directionalityCode:['conflicts_with','related_to'].includes(code)?'symmetric':'directed',
 allowSelfLink:false,fromScopeCode:'ordinary',toScopeCode:'ordinary',
 allowedSourceFacetCodes:['PROCESS'],allowedTargetFacetCodes:['PROCESS']}));
function candidate(change={}){return {id:'CAND',sourceValueObjectId:'A',targetValueObjectId:'B',
 relationTypeCode:'supports',status:'proposed',claimKey:'claim',contextKey:'context',
 assertionPolarity:'affirm',evidenceRefs:['E-CAND'],...change}}
function existing(change={}){return {id:'OLD',sourceValueObjectId:'A',targetValueObjectId:'B',
 relationTypeCode:'supports',status:'verified',claimKey:'claim',contextKey:'context',
 assertionPolarity:'deny',evidenceRefs:['E-OLD'],...change}}
const evidence={refId:'E-CAND',sourceUri:'https://example.org/publication',sourceVersion:'v1',
 author:'Author',sourceDate:'2026-01-01',claim:'Provided claim',locator:'paragraph:5'};
function check(c=candidate(), old=[], metadata=[], options={}){
 return evaluate({scan:{candidate:c,existing:old,nodes,relationTypes:registry,usageScope:'ordinary',...options},
  evidenceMetadata:metadata,snapshotId:'SNAP-001'});
}
const find=(r,code)=>r.findings.find(f=>f.code===code);
let cases=0;
const run=(label,fn)=>{try{fn()}catch(error){throw Error(label+': '+error.message)}cases++};
// 12 verified opposite-assertion situations: neither the report nor metadata verifies a source.
for(let i=0;i<12;i++)run('explicit-denial-'+i,()=>{
 const r=check(candidate({status:'verified',claimKey:'claim-'+i,evidenceRefs:['E-CAND']}),
  [existing({status:'verified',claimKey:'claim-'+i,evidenceRefs:['E-OLD']})],i%2?[evidence]:[evidence,{refId:'E-OLD',claim:'Caller supplied'}]);
 assert.equal(r.disposition,'BLOCKED');assert.equal(find(r,'EXPLICIT_CLAIM_NEGATION').severity,'BLOCK');
 assert.equal(r.findings[0].evidenceCoverage,i%2?'SOME_UNRESOLVED':'ALL_METADATA_PROVIDED');
 assert.equal(r.verifiesSource,false);assert.equal(r.writesPerformed,0);
});
// 12 blocked self-links with optional valid source fields.
for(let i=0;i<12;i++)run('self-link-'+i,()=>{
 const r=check(candidate({relationTypeCode:i%2?'supports':'related_to',targetValueObjectId:'A',evidenceRefs:i%3?['E-CAND']:[]}),[],i%3?[evidence]:[]);
 assert.ok(find(r,'FORBIDDEN_SELF_LINK'));assert.equal(r.disposition,'BLOCKED');
 assert.equal(find(r,'FORBIDDEN_SELF_LINK').evidenceCoverage,i%3?'ALL_METADATA_PROVIDED':'NONE_DECLARED');
});
// 12 support/conflict tensions should remain REVIEW, never become formal refutation.
for(let i=0;i<12;i++)run('tension-'+i,()=>{
 const r=check(candidate({status:i%2?'proposed':'verified'}),
  [existing({relationTypeCode:'conflicts_with',assertionPolarity:'affirm',status:'verified'})]);
 assert.equal(find(r,'SUPPORT_CONFLICT_TENSION')?.severity,'REVIEW');
 assert.equal(r.disposition,'REVIEW_REQUIRED');assert.equal(r.approvesRelation,false);
});
// 12 cycle witness reports must carry nodes but not infer proof from a proposed edge.
for(let i=0;i<12;i++)run('cycle-'+i,()=>{
 const type=i%2?'classified_as':'depends_on';
 const r=check(candidate({relationTypeCode:type,status:'proposed'}),
  [existing({relationTypeCode:type,sourceValueObjectId:'B',targetValueObjectId:'A',assertionPolarity:'affirm',status:i%3?'proposed':'verified'})],
  [],{strictAcyclicTypes:i%2?[type]:[]});
 const f=find(r,i%2?'CLASSIFICATION_CYCLE':'DEPENDENCY_CYCLE');
 assert.ok(f);assert.equal(f.severity,(i%2 && i%3===0)?'BLOCK':'REVIEW');assert.equal(f.witnessPath.length,3);
});
// 12 no-conflict cases: distinct contexts or disjoint windows cannot imply global absence.
for(let i=0;i<12;i++)run('bounded-clear-'+i,()=>{
 const c=candidate({status:'verified',contextKey:i%2?'ctx-a':'ctx-b',valid_from:'2026-01-01T00:00:00Z',valid_to:'2026-01-05T00:00:00Z'});
 const o=existing({contextKey:i%2?'ctx-b':'ctx-a',valid_from:'2026-02-01T00:00:00Z',valid_to:'2026-02-05T00:00:00Z'});
 const r=check(c,[o]);assert.equal(r.disposition,'NO_CONTRADICTION_DETECTED');
 assert.equal(r.findings.length,0);assert.equal(r.globalAbsenceEstablished,false);
});
// 12 invalid metadata cases must fail closed; never silently discard contradictory metadata.
for(let i=0;i<12;i++)run('invalid-metadata-'+i,()=>{
 const data=i%3===0?[evidence,evidence]:i%3===1?[{refId:''}]:[{refId:'E-CAND',claim:45}];
 const r=check(candidate(),[],data);assert.equal(r.complete,false);
 assert.equal(r.disposition,'BLOCKED');assert.ok(find(r,'INVALID_INPUT'));
});
assert.equal(cases,72);
console.log(`M-0193 SYNTHETIC CONFLICT REPORT FIXTURES PASS: ${cases}/72`);
let invariants=0;
function inv(name,fn){try{fn()}catch(error){throw Error(name+': '+error.message)}invariants++}
const clean=()=>check();
inv('source not verified',()=>assert.equal(clean().verifiesSource,false));
inv('relation not approved',()=>assert.equal(clean().approvesRelation,false));
inv('writes are zero',()=>assert.equal(clean().writesPerformed,0));
inv('not runtime integrated',()=>assert.equal(clean().runtimeIntegrated,false));
inv('global absence always false',()=>assert.equal(clean().globalAbsenceEstablished,false));
inv('scope ordinary',()=>assert.equal(clean().scope,'ordinary'));
inv('snapshot from caller',()=>assert.equal(clean().snapshotId,'SNAP-001'));
inv('none declared for empty findings',()=>assert.equal(clean().summary.unresolvedEvidenceRefs,0));
inv('result version stable',()=>assert.equal(clean().version,'ARCTOR_ARI_04_06_07_NON_MUTATING_CONFLICT_REPORT_V1'));
inv('bounded count',()=>assert.equal(clean().boundedInput.nodes,4));
inv('bounded relation types',()=>assert.equal(clean().boundedInput.relationTypes,6));
inv('bounded existing',()=>assert.equal(check(candidate(),[existing()]).boundedInput.existingAssertions,1));
inv('report preserves strict block',()=>assert.equal(check(candidate({status:'verified'}),[existing()]).summary.blockFindings,1));
inv('report preserves review',()=>assert.equal(check(candidate(),[existing()]).summary.reviewFindings,1));
inv('refs inherited',()=>assert.equal(find(check(candidate({status:'verified'}),[existing()]),'EXPLICIT_CLAIM_NEGATION').evidenceRefs.join(','),'E-CAND,E-OLD'));
inv('metadata source URI used',()=>assert.equal(find(check(candidate({status:'verified'}),[existing()],[evidence]),'EXPLICIT_CLAIM_NEGATION').linkedEvidence[0].sourceUri,'https://example.org/publication'));
inv('metadata not proof',()=>assert.equal(find(check(candidate({status:'verified'}),[existing()],[evidence]),'EXPLICIT_CLAIM_NEGATION').linkedEvidence[0].sourceVerified,false));
inv('absent detail unresolved',()=>assert.equal(find(check(candidate({status:'verified'}),[existing()],[evidence]),'EXPLICIT_CLAIM_NEGATION').linkedEvidence[1].metadataStatus,'UNRESOLVED_REF'));
inv('source not invented',()=>assert.equal(find(check(candidate({status:'verified'}),[existing()]),'EXPLICIT_CLAIM_NEGATION').linkedEvidence[0].sourceUri,null));
inv('source version not invented',()=>assert.equal(find(check(candidate({status:'verified'}),[existing()]),'EXPLICIT_CLAIM_NEGATION').linkedEvidence[0].sourceVersion,null));
inv('author not invented',()=>assert.equal(find(check(candidate({status:'verified'}),[existing()]),'EXPLICIT_CLAIM_NEGATION').linkedEvidence[0].author,null));
inv('date not invented',()=>assert.equal(find(check(candidate({status:'verified'}),[existing()]),'EXPLICIT_CLAIM_NEGATION').linkedEvidence[0].sourceDate,null));
inv('claim not invented',()=>assert.equal(find(check(candidate({status:'verified'}),[existing()]),'EXPLICIT_CLAIM_NEGATION').linkedEvidence[0].claim,null));
inv('locator not invented',()=>assert.equal(find(check(candidate({status:'verified'}),[existing()]),'EXPLICIT_CLAIM_NEGATION').linkedEvidence[0].locator,null));
inv('duplicate references dedup',()=>assert.equal(find(check(candidate({status:'verified',evidenceRefs:['E-CAND','E-CAND']}),[existing()]),'EXPLICIT_CLAIM_NEGATION').linkedEvidence.length,2));
inv('read metadata does not mutate',()=>{const m=JSON.stringify(evidence);check(candidate({status:'verified'}),[existing()],[evidence]);assert.equal(JSON.stringify(evidence),m)});
inv('read input does not mutate',()=>{const c=candidate();const m=JSON.stringify(c);check(c);assert.equal(JSON.stringify(c),m)});
inv('deterministic serialization',()=>{const a=check(candidate({status:'verified'}),[existing()],[evidence]);const b=check(candidate({status:'verified'}),[existing()],[evidence]);assert.equal(JSON.stringify(a),JSON.stringify(b))});
inv('metadata ordering irrelevant',()=>{const a=check(candidate({status:'verified'}),[existing()],[evidence,{refId:'E-OLD'}]);const b=check(candidate({status:'verified'}),[existing()],[{refId:'E-OLD'},evidence]);assert.equal(JSON.stringify(a),JSON.stringify(b))});
inv('unknown metadata not injected into findings',()=>assert.equal(find(check(candidate({status:'verified'}),[existing()],[{refId:'NOT_USED',sourceUri:'https://no.example'}]),'EXPLICIT_CLAIM_NEGATION').linkedEvidence.length,2));
inv('fail closed duplicate metadata',()=>assert.equal(check(candidate(),[],[evidence,evidence]).disposition,'BLOCKED'));
inv('fail closed malformed id',()=>assert.equal(check(candidate(),[],[{refId:' x '}]).complete,false));
inv('fail closed malformed fields',()=>assert.equal(check(candidate(),[],[{refId:'E-CAND',claim:100}]).complete,false));
inv('fail closed unknown metadata key',()=>assert.equal(check(candidate(),[],[{refId:'E-CAND',untrusted:'x'}]).complete,false));
inv('fail closed oversize field',()=>assert.equal(check(candidate(),[],[{refId:'E-CAND',claim:'a'.repeat(8200)}]).complete,false));
inv('metadata field null accepted',()=>assert.equal(check(candidate({status:'verified'}),[existing()],[{refId:'E-CAND',claim:null}]).complete,true));
inv('empty metadata accepted',()=>assert.equal(check().complete,true));
inv('explanation preserved',()=>assert.ok(find(check(candidate({status:'verified'}),[existing()]),'EXPLICIT_CLAIM_NEGATION').explanation.length>10));
inv('witness empty where not cycle',()=>assert.equal(find(check(candidate({status:'verified'}),[existing()]),'EXPLICIT_CLAIM_NEGATION').witnessPath.length,0));
inv('zero source no global truth',()=>assert.equal(check(candidate({evidenceRefs:[]}),[]).globalAbsenceEstablished,false));
assert.equal(invariants,40);
console.log(`M-0193 INDEPENDENT REPORT INVARIANTS PASS: ${invariants}/40`);
console.log('M-0193 CODE READONLY: no DB, API, network, ledger, graph or source verification.');
