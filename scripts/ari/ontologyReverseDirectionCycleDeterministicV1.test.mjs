/** ARCTor M-0192 deterministic regression. Pure read-only tests of accepted modules. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const repo=process.env.ARCTOR_REPO||process.cwd();
const paths={
 contradiction:process.env.ARCTOR_CONTRADICTION_TS||path.join(repo,'src/lib/ontology/contradictionDetectorV1.ts'),
 canonical:process.env.ARCTOR_DUPLICATE_TS||path.join(repo,'src/lib/ontology/canonicalRelationDuplicatesV1.ts'),
 symmetric:process.env.ARCTOR_SYMMETRIC_TS||path.join(repo,'src/lib/ontology/symmetricReverseDuplicateGuardV1.ts'),
 evidence:process.env.ARCTOR_EVIDENCE_ABSENCE_TS||path.join(repo,'src/lib/ontology/relationEvidenceAbsenceGuardV1.ts'),
};
const fixtureFile=process.env.ARCTOR_M0192_GOLD||path.join(repo,'scripts/ari/fixtures/ontologyReverseDirectionCycleGoldV1.json');
const corpus=JSON.parse(fs.readFileSync(fixtureFile,'utf8'));
assert.equal(corpus.contract,'ARCTOR_ARI_04_06_06_REVERSE_CYCLE_GOLD_V1');
assert.equal(corpus.size,72);assert.equal(corpus.cases.length,72);
assert.equal(new Set(corpus.cases.map(c=>c.id)).size,72);
const ts=require(path.join(repo,'node_modules/typescript'));
const opts={target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,strict:true,noEmit:true,
 skipLibCheck:true,lib:['lib.es2020.d.ts']};
const program=ts.createProgram(Object.values(paths),opts);
const errors=ts.getPreEmitDiagnostics(program).filter(d=>d.category===ts.DiagnosticCategory.Error);
assert.equal(errors.length,0,ts.formatDiagnostics(errors,{getCanonicalFileName:s=>s,getCurrentDirectory:()=>repo,getNewLine:()=> '\n'}));
const forbid=['supabase.from','supabase.rpc','fetch(','writeFileSync','unlinkSync','insert into','delete from'];
function load(key,imports={}){
 const source=paths[key],raw=fs.readFileSync(source,'utf8');
 for(const word of forbid)assert.ok(!raw.toLowerCase().includes(word.toLowerCase()),`${key}: forbidden ${word}`);
 const js=ts.transpileModule(raw,{fileName:source,compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
 const exports={};
 vm.runInNewContext(js,{exports,Date,BigInt,Set,Map,require:(name)=>{
  assert.ok(Object.hasOwn(imports,name),`${key}: unexpected imported dependency ${name}`);
  return imports[name];
 }},{timeout:15000,filename:source});
 return exports;
}
const canon=load('canonical');
const sym=load('symmetric',{'./canonicalRelationDuplicatesV1':canon});
const contradiction=load('contradiction');
const evidence=load('evidence');
assert.equal(typeof canon.detectCanonicalRelationDuplicatesV1,'function');
assert.equal(typeof sym.detectSymmetricReverseDuplicatesV1,'function');
assert.equal(typeof contradiction.detectContradictionsV1,'function');
assert.ok(typeof evidence==='object');
const types=['related_to','conflicts_with','same_subject_as','depends_on','prerequisite_for','supports','influences','classified_as'].map(code=>{
 const symmetric=['related_to','conflicts_with','same_subject_as'].includes(code);
 const alias=code==='prerequisite_for';
 return {relationTypeCode:code,status:'active',directionalityCode:symmetric?'symmetric':'directed',
 canonicalRelationTypeCode:alias?'depends_on':code,
 canonicalOrientationCode:alias?'reverse':symmetric?'symmetric':'same',
 canonicalWritePolicyCode:alias?'reverse_alias':'enabled'};
});
const registry=['related_to','conflicts_with','same_subject_as','depends_on','supports','influences','classified_as'].map(code=>({
 relationTypeCode:code,status:'active',directionalityCode:['related_to','conflicts_with','same_subject_as'].includes(code)?'symmetric':'directed',
 allowSelfLink:false,fromScopeCode:'ordinary',toScopeCode:'ordinary',
 allowedSourceFacetCodes:['PROCESS','STATE','ENTITY'],allowedTargetFacetCodes:['PROCESS','STATE','ENTITY']}));
const nodes=['A','B','C','D'].map(id=>({id,facetCode:id==='B'?'STATE':'PROCESS',scopeCode:'global'}));
const idBase={status:'proposed',claimKey:'bounded-claim',contextKey:'baseline',assertionPolarity:'affirm',evidenceRefs:['E-C']};
const oldBase={status:'verified',claimKey:'bounded-claim',contextKey:'baseline',assertionPolarity:'affirm',evidenceRefs:['E-O']};
function inspect(c,old=[],p={}){
 return contradiction.detectContradictionsV1({candidate:c,existing:old,nodes,relationTypes:registry,
 usageScope:'ordinary',...p});
}
function issue(result,code){return result.findings.find(x=>x.code===code)}
let pass=0;
for(const f of corpus.cases){
 try{
  if(f.kind==='canonical'||f.kind==='symmetric'){
   const c={id:'cand',status:'proposed',relationTypeCode:f.candidate_type,
    sourceValueObjectId:f.candidate_from,targetValueObjectId:f.candidate_to,contextKey:'work',evidenceRefs:['E-C']};
   const old={id:'old',status:'verified',relationTypeCode:f.existing_type,
    sourceValueObjectId:f.existing_from,targetValueObjectId:f.existing_to,contextKey:'work',evidenceRefs:['E-O']};
   const result=f.kind==='canonical'?canon.detectCanonicalRelationDuplicatesV1({candidate:c,existing:[old],relationTypes:types}):
    sym.detectSymmetricReverseDuplicatesV1({candidate:c,existing:[old],relationTypes:types});
   assert.equal(result.complete,true);
   assert.equal(result.disposition,f.expected_disposition);
   if(f.expected_code)assert.ok(result.findings.some(x=>x.code===f.expected_code));
   else assert.equal(result.findings.length,0);
   assert.equal(result.writesPerformed,0);assert.equal(result.approvesRelation,false);assert.equal(result.verifiesSource,false);
  }else{
   const candidate={...idBase,id:'cand',relationTypeCode:f.type,sourceValueObjectId:'A',targetValueObjectId:'B'};
   const existing=f.edges.map(([a,b],idx)=>({...oldBase,id:'old-'+idx,relationTypeCode:f.type,
    sourceValueObjectId:a,targetValueObjectId:b,status:f.edge_status||'verified',
    contextKey:f.other_context||'baseline',assertionPolarity:f.other_polarity||'affirm'}));
   const strict=f.kind==='cycle'?f.strict:(f.variant!=='missing_acyclic_policy');
   if(f.kind==='guard'){
    if(f.variant==='disjoint_time'||f.variant==='disjoint_time_3'){
     candidate.valid_from='2026-01-01T00:00:00Z';candidate.valid_to='2026-01-02T00:00:00Z';
     existing.forEach(e=>{e.valid_from='2026-02-01T00:00:00Z';e.valid_to='2026-02-02T00:00:00Z'});
    }
    if(f.variant==='partial_time'){
     candidate.valid_from='2026-01-01T00:00:00Z';
     existing.forEach(e=>{e.valid_from='2026-01-01T00:00:00Z'});
    }
    if(f.variant==='pairwise_not_common'){
     candidate.valid_from='2026-01-01T00:00:00Z';candidate.valid_to='2026-01-10T00:00:00Z';
     existing[0].valid_from='2026-01-01T00:00:00Z';existing[0].valid_to='2026-01-04T00:00:00Z';
     existing[1].valid_from='2026-01-06T00:00:00Z';existing[1].valid_to='2026-01-09T00:00:00Z';
    }
   }
   const result=inspect(candidate,existing,{strictAcyclicTypes:strict?[f.type]:[]});
   const code=f.type==='depends_on'?'DEPENDENCY_CYCLE':'CLASSIFICATION_CYCLE';
   const finding=issue(result,code);
   if(f.kind==='cycle'){
    assert.ok(finding,'cycle must appear');
    assert.equal(finding.severity,f.expected_severity);
    assert.deepEqual(Array.from(finding.witnessPath??[]),f.expected_path);
   }else if(f.expected==='NONE')assert.equal(finding,undefined);
   else{assert.ok(finding);assert.equal(finding.severity,'REVIEW');}
   if(f.kind==='guard')assert.notEqual(result.disposition,'BLOCKED');
   assert.equal(result.writesPerformed,0);assert.equal(result.approvesRelation,false);assert.equal(result.verifiesSource,false);
  }
 }catch(err){throw new Error(`${f.id} (${f.group}): ${err.message}`,{cause:err});}
 pass++;
}
assert.equal(pass,72);
console.log(`M-0192 DETERMINISTIC REVERSE/CYCLE FIXTURES PASS: ${pass}/72`);
// Independent invariants: eight variants across five analytically independent properties.
let inv=0;
for(let i=0;i<8;i++){
 const code=i%2?'classified_as':'depends_on';
 const c={...idBase,id:'cand',relationTypeCode:code,sourceValueObjectId:'A',targetValueObjectId:'B'};
 const e1={...oldBase,id:'e1',relationTypeCode:code,sourceValueObjectId:'B',targetValueObjectId:'C'};
 const e2={...oldBase,id:'e2',relationTypeCode:code,sourceValueObjectId:'C',targetValueObjectId:'A'};
 const first=inspect(c,[e1,e2],{strictAcyclicTypes:[code]});
 const shuffled=inspect(c,[e2,e1],{strictAcyclicTypes:[code]});
 assert.equal(JSON.stringify(first),JSON.stringify(shuffled));inv++;
 assert.equal(first.disposition,'BLOCKED');assert.ok(first.findings.some(x=>x.witnessPath?.length===4));inv++;
 const proposed=inspect(c,[{...e1,status:'proposed'},e2],{strictAcyclicTypes:[code]});
 assert.equal(issue(proposed,code==='depends_on'?'DEPENDENCY_CYCLE':'CLASSIFICATION_CYCLE')?.severity,'REVIEW');inv++;
 const cReverse={...c,relationTypeCode:'supports'};
 const noCycle=inspect(cReverse,[{...e1,relationTypeCode:'supports',sourceValueObjectId:'B',targetValueObjectId:'A'}]);
 assert.equal(issue(noCycle,'DEPENDENCY_CYCLE'),undefined);assert.equal(issue(noCycle,'CLASSIFICATION_CYCLE'),undefined);inv++;
 assert.equal(first.writesPerformed,0);assert.equal(first.approvesRelation,false);assert.equal(first.verifiesSource,false);inv++;
}
assert.equal(inv,40);
console.log(`M-0192 INDEPENDENT REVERSE/CYCLE INVARIANTS PASS: ${inv}/40`);
console.log('M-0192 CODE READONLY: offline deterministic tests only; no DB/API/network/ledger/graph writes.');
