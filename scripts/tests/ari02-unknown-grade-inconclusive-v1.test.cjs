'use strict';
// M-0084: offline comparator-harness tests. No web/DB/AI side effects.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),cp=require('node:child_process');
const {createRequire}=require('node:module');
const ts=createRequire(path.join(process.cwd(),'package.json'))('typescript');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const uuid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const copy=v=>JSON.parse(JSON.stringify(v));
const getArg=k=>{const i=process.argv.indexOf(k);return i<0?'':process.argv[i+1]};
const goldFile=getArg('--gold'),out=getArg('--output');
if(!goldFile||!out)throw Error('USAGE: --gold pinned.json --output empty_folder');
fs.mkdirSync(out,{recursive:true});
if(fs.readdirSync(out).length)throw Error('OUTPUT_MUST_BE_EMPTY');
const sourcePath=path.join(process.cwd(),'src/lib/ontology-research/ari02RegressionV1.ts');
const source=fs.readFileSync(sourcePath,'utf8');
const compiled=ts.transpileModule(source,{fileName:sourcePath,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}});
assert.equal(compiled.diagnostics?.length??0,0);
const exp={};new Function('exports','require',compiled.outputText)(exp,()=>{throw Error('UNEXPECTED_IMPORT')});
const compare=exp.compareAri02GoldSnapshots;
const locales=['ru','en','pl','de','es','uk','cs'];
const mkCase=i=>{
 const rows=Array.from({length:10},(_,j)=>({id:uuid(i*100+j+1),title:`Item ${i}:${j}`,path:'',role:'leaf',rank:j+1,score:100-j}));
 const judgments=Object.fromEntries(rows.map((r,j)=>[r.id,{grade:j===0?0:j===1?3:2,errorKind:'none',note:'SYNTHETIC_ONLY'}]));
 return {id:`m0084-synthetic-${i}`,locale:locales[i%7],query:`Synthetic unknown-grade scenario ${i}`,perspective:'mixed',purpose:'',notes:'SYNTHETIC_NOT_HUMAN_GOLD',catalogCheck:'not_checked',knownRelevantIds:[],knownRelevantEvidence:'',unresolvedConcepts:[],runs:{baseline:copy(rows),experimental:copy(rows)},judgments};
};
const create=()=>({contract:'ARCTOR_ARI_02_3_GOLD_ANNOTATION_V1',annotationMethod:'synthetic_test_only',exportedAt:'',cases:Array.from({length:10},(_,i)=>mkCase(i))});
const caseKey='ru::synthetic unknown-grade scenario 0';
const id=uuid(1); // grade=0 (KNOWN nonrelevant); absent/null/invalid become UNKNOWN.
const test=[];
for(const engine of ['baseline','experimental']){
  const full=create();const pass=compare(full,copy(full),engine,10);
  assert.equal(pass.gate,'PASS');assert.equal(pass.comparablePrecisionCases,10);assert.equal(pass.blockingIssues.length,0);
  test.push({engine,variant:'ten_fully_graded_control',gate:pass.gate,comparable:pass.comparablePrecisionCases,blocking:pass.blockingIssues.length});
  for(const variant of ['missing','null','grade_4','grade_minus_one']){
    const before=create(),after=create();
    for(const corpus of [before,after]){
     if(variant==='missing')delete corpus.cases[0].judgments[id];
     else corpus.cases[0].judgments[id].grade=variant==='null'?null:variant==='grade_4'?4:-1;
    }
    const r=compare(before,after,engine,10);
    const row=r.cases.find(x=>x.key===caseKey);
    assert(row,'case not found');
    assert.equal(r.gate,'INCONCLUSIVE');assert.equal(r.comparablePrecisionCases,9);
    assert.equal(r.blockingIssues.length,0);assert.equal(r.warnings.length,0);
    assert.equal(row.precision10.before,null);assert.equal(row.precision10.after,null);assert.equal(row.precision10.delta,null);
    assert.equal(row.precision10.comparable,false);
    assert.equal(row.labeledBefore,9);assert.equal(row.labeledAfter,9);
    assert(row.notices.some(x=>x.includes('P@10 N/A')));
    test.push({engine,variant,gate:r.gate,comparable:r.comparablePrecisionCases,unknownCaseP10:null,blocking:r.blockingIssues.length,labels:row.labeledBefore});
  }
  // Dropping a KNOWN judgment on only the after side must FAIL integrity; not be mistaken for a harmless unknown.
  const before=create(),after=copy(before);delete after.cases[0].judgments[id];
  const integrity=compare(before,after,engine,10);
  assert.equal(integrity.gate,'FAIL');assert(integrity.blockingIssues.some(s=>s.includes('GRADE_CHANGED_OR_REMOVED')&&s.includes(id)));
  test.push({engine,variant:'one_sided_known_grade_removed',gate:'FAIL',integrityIssue:'GRADE_CHANGED_OR_REMOVED',blocking:integrity.blockingIssues.length});
}
// Real, unchanged Gold: quality remains INCONCLUSIVE, not PASS nor FAIL, and no real Recall claim.
const gold=JSON.parse(fs.readFileSync(goldFile,'utf8'));assert.equal(gold.cases.length,156);assert.equal(gold.contract,'ARCTOR_ARI_02_3_GOLD_ANNOTATION_V1');
const real=[];
for(const engine of ['baseline','experimental']){
 const r=compare(gold,copy(gold),engine,10);
 assert.equal(r.gate,'INCONCLUSIVE');assert.equal(r.blockingIssues.length,0);assert.equal(r.comparableRecallCases,0);
 assert.equal(r.comparablePrecisionCases,engine==='baseline'?3:0);
 real.push({engine,gate:r.gate,comparableP10:r.comparablePrecisionCases,comparableR20:r.comparableRecallCases,blocking:r.blockingIssues.length});
}
const audit={contract:'ARCTOR_ARI_M0084_UNKNOWN_GRADE_GUARD_V1',step:'M-0084',roadmapId:'ARI-02.08.03',sourceGoldSha256:sha(fs.readFileSync(goldFile)),goldCases:156,syntheticCases:10,requiredComparableCases:10,unknownGradeForms:['missing','null','grade_4','grade_minus_one'],comparisonRuns:test,realGoldIdentical:real,interpretation:'PASS for synthetic fully graded comparator control, INCONCLUSIVE for partial unknown labels, FAIL for one-sided loss of a previously known grade. Neither result certifies live search quality.',qualityGate:'INCONCLUSIVE_GOLD_COVERAGE',independentHumanGold:false,realRecall20:'N/A',mutatedSourceGold:false,dbWrites:0,aiApiCalls:0,indexedSearchTested:false};
fs.writeFileSync(path.join(out,'M0084_UNKNOWN_GRADE_AUDIT_V1.json'),JSON.stringify(audit,null,2)+'\n');
console.log('M0084_UNKNOWN_GRADE_GUARD_PASS 2 engines x (4 unknown + 1 full control + 1 one-sided integrity), real Gold 156 cases INCONCLUSIVE');
