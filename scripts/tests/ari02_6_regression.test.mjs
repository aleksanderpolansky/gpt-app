import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const file='src/lib/ontology-research/ari02RegressionV1.ts';
const compiled=ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,reportDiagnostics:true,
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}});
assert.equal(compiled.diagnostics?.length??0,0);
const mod={};
new Function('exports','require',compiled.outputText)(mod,()=>{throw Error('NO_RUNTIME_IMPORT_ALLOWED');});
const uuid=(n)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const row=n=>({id:uuid(n),title:n===1?'Ходьба':`Object ${n}`,path:'',role:'leaf',rank:n,score:100-n});
const mk=(query,locale,index)=>({id:`pilot-${index}`,query,locale,perspective:'mixed',purpose:'',notes:'',
  catalogCheck:'not_checked',knownRelevantIds:[],knownRelevantEvidence:'',unresolvedConcepts:[],
  runs:{baseline:[],experimental:Array.from({length:10},(_,i)=>row(i+1))},
  judgments:Object.fromEntries(Array.from({length:10},(_,i)=>[uuid(i+1),{grade:i===0?3:2,errorKind:'none',note:'human checked'}]))});
const locales=['ru','en','pl','de','es','uk','cs'];
const cases=Array.from({length:12},(_,i)=>mk(i===0?'ходьба':`Test ${i}`,locales[i%7],i));
const corpus=items=>({contract:'ARCTOR_ARI_02_3_GOLD_ANNOTATION_V1',exportedAt:'',annotationMethod:'human_review_not_db_proof',cases:items});
const copy=x=>JSON.parse(JSON.stringify(x));
const before=corpus(cases),after=copy(before);
let r=mod.compareAri02GoldSnapshots(before,after,'experimental',10);
assert.equal(r.gate,'PASS');assert.equal(r.comparablePrecisionCases,12);assert.equal(r.locales.length,7);
// Regression: replace a known relevant candidate with a separately labeled nonrelevant object.
const degrade=copy(after);
degrade.cases[1].runs.experimental[4]=row(30);
degrade.cases[1].judgments[uuid(30)]={grade:0,errorKind:'false_positive',note:'reviewed'};
r=mod.compareAri02GoldSnapshots(before,degrade,'experimental',10);
assert.equal(r.gate,'FAIL');assert.ok(r.blockingIssues.some(x=>x.includes('PRECISION10_REGRESSION')));
const exact=copy(after);exact.cases[0].runs.experimental[0]=row(31);
r=mod.compareAri02GoldSnapshots(before,exact,'experimental',10);
assert.equal(r.gate,'FAIL');assert.ok(r.blockingIssues.some(x=>x.includes('HUMAN_CONFIRMED_EXACT_DROPPED')));
const changed=copy(after);changed.cases[0].judgments[uuid(1)].grade=1;
r=mod.compareAri02GoldSnapshots(before,changed,'experimental',10);
assert.equal(r.gate,'FAIL');assert.ok(r.blockingIssues.some(x=>x.includes('GRADE_CHANGED_OR_REMOVED')));
const short=copy(before);short.cases.forEach(c=>c.runs.experimental=c.runs.experimental.slice(0,1));
r=mod.compareAri02GoldSnapshots(short,copy(short),'experimental',10);
assert.equal(r.gate,'INCONCLUSIVE');assert.equal(r.comparablePrecisionCases,0);
const limited=corpus([mk('прогулка с ребёнком','ru',1)]);
limited.cases[0].runs.experimental=[row(1)];limited.cases[0].judgments={[uuid(1)]:{grade:1,errorKind:'other',note:''}};
r=mod.compareAri02GoldSnapshots(limited,copy(limited),'experimental',10);
assert.equal(r.gate,'INCONCLUSIVE');
const duplicate=copy(before);duplicate.cases.push({...copy(duplicate.cases[0]),query:'ХОДЬБА'});
assert.throws(()=>mod.compareAri02GoldSnapshots(duplicate,after),/DUPLICATE_CASE/);
const omitted=copy(after);omitted.cases.pop();
assert.equal(mod.compareAri02GoldSnapshots(before,omitted).gate,'FAIL');
console.log('ARI-02.6 regression fixtures PASS (7 locales/pass/degrade/exact/labels/N-A/duplicate/missing)');
