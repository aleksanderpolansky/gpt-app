/** M-0187 deterministic offline tests; no network, DB or repo modifications. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = process.env.ARCTOR_REPO || process.cwd();
const source = process.env.ARCTOR_CONTRADICTION_TS || path.join(repo,'src/lib/ontology/contradictionDetectorV1.ts');
const ts = createRequire(path.join(repo,'package.json'))('typescript');
const program = ts.createProgram([source], {strict:true,target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,
  skipLibCheck:true,noEmit:true,lib:['lib.es2020.d.ts']});
const diagnostics = ts.getPreEmitDiagnostics(program).filter(d => d.category===ts.DiagnosticCategory.Error);
assert.equal(diagnostics.length,0,ts.formatDiagnostics(diagnostics,{getCanonicalFileName:s=>s,getCurrentDirectory:()=>repo,getNewLine:()=> '\n'}));
const raw = fs.readFileSync(source,'utf8');
for(const forbidden of ['supabase.from','supabase.rpc','fetch(','process.env','writeFileSync','delete from','insert into']){
  assert.equal(raw.includes(forbidden),false,`pure module must not contain ${forbidden}`);
}
const output=ts.transpileModule(raw,{fileName:source,compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
const exports={};vm.runInNewContext(output,{exports,Set,Map},{timeout:10000});
const detect=exports.detectContradictionsV1;
assert.equal(typeof detect,'function');
assert.equal(exports.CONTRADICTION_DETECTOR_VERSION_V1,'ARCTOR_ARI_04_06_01_CONTRADICTION_DETECTOR_V1');
const nodes=[
 {id:'A',facetCode:'PROCESS',scopeCode:'global'},
 {id:'B',facetCode:'STATE',scopeCode:'global'},
 {id:'C',facetCode:'PROCESS',scopeCode:'global'},
 {id:'D',facetCode:'ENTITY',scopeCode:'global'},
];
const type=(code, opts={})=>({relationTypeCode:code,status:'active',directionalityCode:
 ['related_to','same_subject_as','conflicts_with'].includes(code)?'symmetric':'directed',allowSelfLink:false,
 fromScopeCode:'ordinary',toScopeCode:'ordinary',allowedSourceFacetCodes:['ENTITY','PROCESS','STATE'],
 allowedTargetFacetCodes:['ENTITY','PROCESS','STATE'],...opts});
const codes=['related_to','same_subject_as','supports','depends_on','conflicts_with','influences','classified_as'];
const registry=codes.map(c=>type(c));
const candidate=(o={})=>({id:'cand',sourceValueObjectId:'A',targetValueObjectId:'B',relationTypeCode:'supports',
 status:'proposed',claimKey:'claim',contextKey:'same',assertionPolarity:'affirm',evidenceRefs:['E-C'],...o});
const other=(o={})=>({id:'old',sourceValueObjectId:'A',targetValueObjectId:'B',relationTypeCode:'supports',
 status:'verified',claimKey:'claim',contextKey:'same',assertionPolarity:'affirm',evidenceRefs:['E-O'],...o});
const scan=(c=candidate(),existing=[],override={})=>detect({candidate:c,existing,nodes,relationTypes:registry,
 usageScope:'ordinary',...override});
const issue=(r,code)=>r.findings.find(f=>f.code===code);
const run=(name,fn)=>{fn(); count++;};
let count=0;
// Exactly 72 independently asserted fixture cases in 6 groups.
for(let i=0;i<12;i++)run(`self-link ${i}`,()=>{
 const rel=candidate({relationTypeCode:codes[i%codes.length],sourceValueObjectId:i%2?'B':'A',targetValueObjectId:i%2?'B':'A'});
 const x=scan(rel);assert.equal(x.disposition,'BLOCKED');assert.ok(issue(x,'FORBIDDEN_SELF_LINK'));
});
for(let i=0;i<12;i++)run(`facet ${i}`,()=>{
 const mod=registry.map(r=>r.relationTypeCode==='supports'?type('supports',{
  allowedSourceFacetCodes:i%2?['STATE']:['PROCESS'],
  allowedTargetFacetCodes:i%2?['STATE']:['PROCESS']}):r);
 const x=scan(candidate(),[],{relationTypes:mod});
 assert.equal(x.disposition,'BLOCKED');assert.ok(issue(x,'FORBIDDEN_FACET'));
});
for(let i=0;i<12;i++)run(`explicit dual verified ${i}`,()=>{
 const code=codes[i%codes.length];const symmetric=['same_subject_as','conflicts_with','related_to'].includes(code);
 const old=other({relationTypeCode:code,assertionPolarity:'deny',status:'verified',
  ...(symmetric&&i%2?{sourceValueObjectId:'B',targetValueObjectId:'A'}:{})});
 const x=scan(candidate({relationTypeCode:code,status:'verified'}),[old]);
 assert.equal(x.disposition,'BLOCKED');assert.equal(issue(x,'EXPLICIT_CLAIM_NEGATION')?.severity,'BLOCK');
});
for(let i=0;i<12;i++)run(`not falsely verified ${i}`,()=>{
 const c=candidate({status:i%2?'proposed':'verified',contextKey:i%3===0?undefined:'same'});
 const o=other({assertionPolarity:'deny',status:i%2===0?'proposed':'verified',contextKey:i%3===1?undefined:'same'});
 const x=scan(c,[o]);
 assert.notEqual(issue(x,'EXPLICIT_CLAIM_NEGATION')?.severity,'BLOCK');
 if(i%3===2){assert.equal(issue(x,'EXPLICIT_CLAIM_NEGATION')?.severity,'REVIEW');}
});
for(let i=0;i<12;i++)run(`tension or effect ${i}`,()=>{
 if(i%2===0){
  const x=scan(candidate({relationTypeCode:'supports',status:i%3===0?'verified':'proposed'}),
   [other({relationTypeCode:'conflicts_with',status:'verified'})]);
  assert.equal(issue(x,'SUPPORT_CONFLICT_TENSION')?.severity,'REVIEW');
  assert.equal(x.disposition,'REVIEW_REQUIRED');
 }else{
  const x=scan(candidate({relationTypeCode:'influences',effectPolarity:'positive',status:'verified'}),
   [other({relationTypeCode:'influences',effectPolarity:'negative',status:'verified'})]);
  assert.equal(issue(x,'INCOMPATIBLE_EFFECT_POLARITY')?.severity,'REVIEW');
 }
});
for(let i=0;i<12;i++)run(`cycle ${i}`,()=>{
 const code=i%2?'classified_as':'depends_on';
 const x=scan(candidate({relationTypeCode:code,sourceValueObjectId:'A',targetValueObjectId:'B'}),
  [other({relationTypeCode:code,sourceValueObjectId:'B',targetValueObjectId:'A',status:'verified'})],
  {strictAcyclicTypes:i%3===0?[code]:[]});
 const z=issue(x,i%2?'CLASSIFICATION_CYCLE':'DEPENDENCY_CYCLE');
 assert.ok(z);assert.equal(z.severity,i%3===0?'BLOCK':'REVIEW');
 assert.equal(z.witnessPath.length,3);
});
console.log(`M-0187 SYNTHETIC CONTRADICTION FIXTURES PASS: ${count}/${count}`);
assert.equal(count,72);
let invariant=0;
function inv(name,fn){fn();invariant++;}
inv('pure no-writing invariant',()=>assert.equal(scan().writesPerformed,0));
inv('no automatic approval',()=>assert.equal(scan().approvesRelation,false));
inv('no source verification',()=>assert.equal(scan().verifiesSource,false));
inv('no evidence => no negation',()=>assert.equal(scan(candidate({evidenceRefs:[]}),[]).disposition,'NO_CONTRADICTION_DETECTED'));
inv('rejected is not a denial',()=>assert.equal(scan(candidate(),[other({status:'rejected',assertionPolarity:'deny'})]).disposition,'NO_CONTRADICTION_DETECTED'));
inv('inactive ignored',()=>assert.equal(scan(candidate(),[other({status:'inactive',assertionPolarity:'deny'})]).disposition,'NO_CONTRADICTION_DETECTED'));
inv('separated context no contradiction',()=>assert.equal(scan(candidate({status:'verified',contextKey:'c1'}),[other({assertionPolarity:'deny',contextKey:'c2'})]).disposition,'NO_CONTRADICTION_DETECTED'));
inv('different claim id is not strict',()=>assert.equal(issue(scan(candidate({status:'verified',claimKey:'1'}),[other({assertionPolarity:'deny',claimKey:'2'})]),'EXPLICIT_CLAIM_NEGATION')?.severity,'REVIEW'));
inv('effect polarity no implicit strictness',()=>assert.equal(issue(scan(candidate({relationTypeCode:'influences',status:'verified',effectPolarity:'positive'}),[other({relationTypeCode:'influences',status:'verified',effectPolarity:'negative'})]),'INCOMPATIBLE_EFFECT_POLARITY')?.severity,'REVIEW'));
inv('effect strict only if explicitly authorized',()=>assert.equal(issue(scan(candidate({relationTypeCode:'influences',status:'verified',effectPolarity:'positive'}),[other({relationTypeCode:'influences',status:'verified',effectPolarity:'negative'})],{strictSingleValuedEffectTypes:['influences']}),'INCOMPATIBLE_EFFECT_POLARITY')?.severity,'BLOCK'));
inv('unknown registry blocks',()=>assert.ok(issue(scan(candidate({relationTypeCode:'not_registered'})),'UNKNOWN_OR_INACTIVE_TYPE')));
inv('inactive type blocks',()=>assert.equal(scan(candidate(),[],{relationTypes:registry.map(t=>t.relationTypeCode==='supports'?type('supports',{status:'inactive'}):t)}).disposition,'BLOCKED'));
inv('invalid source blocks',()=>assert.ok(issue(scan(candidate({sourceValueObjectId:'UNKNOWN'})),'INCOMPLETE_SCOPE')));
inv('invalid target blocks',()=>assert.ok(issue(scan(candidate({targetValueObjectId:'UNKNOWN'})),'INCOMPLETE_SCOPE')));
inv('duplicate nodes block',()=>assert.ok(issue(scan(candidate(),[],{nodes:[...nodes,nodes[0]]}),'INVALID_INPUT')));
inv('duplicate types block',()=>assert.ok(issue(scan(candidate(),[],{relationTypes:[...registry,registry[0]]}),'INVALID_INPUT')));
inv('duplicate assertion ids block',()=>assert.ok(issue(scan(candidate(),[other({id:'cand'})]),'INVALID_INPUT')));
inv('forbidden usage blocks',()=>assert.ok(issue(scan(candidate(),[],{usageScope:'analysis'}),'FORBIDDEN_SCOPE')));
inv('empty facets block',()=>assert.ok(issue(scan(candidate(),[],{nodes:nodes.map(x=>x.id==='A'?{...x,facetCode:null}:x)}),'FORBIDDEN_FACET')));
inv('custom registry allows self-link',()=>assert.equal(issue(scan(candidate({sourceValueObjectId:'A',targetValueObjectId:'A'}),[],{relationTypes:registry.map(t=>t.relationTypeCode==='supports'?type('supports',{allowSelfLink:true}):t)}),'FORBIDDEN_SELF_LINK'),undefined));
inv('explicit assertions no graph write',()=>assert.equal(scan(candidate({status:'verified'}),[other({assertionPolarity:'deny'})]).writesPerformed,0));
inv('no implicit transitivity',()=>assert.equal(scan(candidate({sourceValueObjectId:'A',targetValueObjectId:'C'}),[other({sourceValueObjectId:'A',targetValueObjectId:'B'})]).disposition,'NO_CONTRADICTION_DETECTED'));
inv('different type not strict negation',()=>assert.equal(issue(scan(candidate({status:'verified'}),[other({relationTypeCode:'depends_on',status:'verified',assertionPolarity:'deny'})]),'EXPLICIT_CLAIM_NEGATION'),undefined));
inv('determinism shuffled inputs',()=>{
 const a=[other({id:'x',relationTypeCode:'conflicts_with'}),other({id:'y',relationTypeCode:'conflicts_with'})];
 const one=scan(candidate(),a),two=scan(candidate(),[...a].reverse());
 assert.equal(JSON.stringify(one),JSON.stringify(two));
});
inv('input immutability',()=>{const c=candidate(),e=[other()],b=JSON.stringify([c,e,nodes,registry]);scan(c,e);assert.equal(JSON.stringify([c,e,nodes,registry]),b)});
inv('one-sided influence reverse not equivalent',()=>assert.equal(issue(scan(candidate({relationTypeCode:'influences',status:'verified'}),[other({relationTypeCode:'influences',status:'verified',sourceValueObjectId:'B',targetValueObjectId:'A',assertionPolarity:'deny'})]),'EXPLICIT_CLAIM_NEGATION'),undefined));
inv('symmetric reverse is equivalent',()=>assert.ok(issue(scan(candidate({relationTypeCode:'related_to',status:'verified'}),[other({relationTypeCode:'related_to',status:'verified',sourceValueObjectId:'B',targetValueObjectId:'A',assertionPolarity:'deny'})]),'EXPLICIT_CLAIM_NEGATION')));
inv('no implicit dependency cycle strict',()=>assert.equal(issue(scan(candidate({relationTypeCode:'depends_on'}),[other({relationTypeCode:'depends_on',sourceValueObjectId:'B',targetValueObjectId:'A'})]),'DEPENDENCY_CYCLE')?.severity,'REVIEW'));
inv('cycle strict if configured',()=>assert.equal(issue(scan(candidate({relationTypeCode:'depends_on'}),[other({relationTypeCode:'depends_on',sourceValueObjectId:'B',targetValueObjectId:'A'})],{strictAcyclicTypes:['depends_on']}),'DEPENDENCY_CYCLE')?.severity,'BLOCK'));
inv('candidate invalid polarity blocks',()=>assert.equal(scan(candidate({assertionPolarity:'unsupported'})).disposition,'BLOCKED'));
inv('oversized input blocks',()=>assert.equal(scan(candidate(),Array.from({length:5001},(_,i)=>other({id:'z'+i}))).disposition,'BLOCKED'));
inv('mixed effects do not force contradiction',()=>assert.equal(issue(scan(candidate({relationTypeCode:'influences',effectPolarity:'mixed'}),[other({relationTypeCode:'influences',effectPolarity:'negative'})]),'INCOMPATIBLE_EFFECT_POLARITY'),undefined));
inv('reverse symmetric tension is review',()=>assert.equal(issue(scan(candidate({relationTypeCode:'supports'}),[other({relationTypeCode:'conflicts_with',sourceValueObjectId:'B',targetValueObjectId:'A'})]),'SUPPORT_CONFLICT_TENSION')?.severity,'REVIEW'));
inv('proposed-only dependency cycle is not strict block',()=>assert.equal(issue(scan(candidate({relationTypeCode:'depends_on'}),[other({relationTypeCode:'depends_on',sourceValueObjectId:'B',targetValueObjectId:'A',status:'proposed'})],{strictAcyclicTypes:['depends_on']}),'DEPENDENCY_CYCLE')?.severity,'REVIEW'));
console.log(`M-0187 INDEPENDENT INVARIANTS PASS: ${invariant}/${invariant}`);
assert.equal(invariant,34);
console.log('M-0187 CODE READONLY: no DB, API, network, ledger or graph mutation.');
