/** ARCTor M-0188: deterministic offline test corpus, no network or writes. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const repo=process.env.ARCTOR_REPO??process.cwd();
const source=process.env.ARCTOR_DUPLICATE_TS??path.join(repo,'src/lib/ontology/canonicalRelationDuplicatesV1.ts');
const ts=createRequire(path.join(repo,'package.json'))('typescript');
const program=ts.createProgram([source],{strict:true,target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,skipLibCheck:true,noEmit:true,lib:['lib.es2020.d.ts']});
const diagnostics=ts.getPreEmitDiagnostics(program).filter(d=>d.category===ts.DiagnosticCategory.Error);
assert.equal(diagnostics.length,0,ts.formatDiagnostics(diagnostics,{getCanonicalFileName:s=>s,getCurrentDirectory:()=>repo,getNewLine:()=> '\n'}));
const raw=fs.readFileSync(source,'utf8');
for(const forbidden of ['supabase.from','supabase.rpc','fetch(','process.env','writeFileSync','delete from','insert into'])
 assert.equal(raw.includes(forbidden),false,'Pure module contains '+forbidden);
const transpiled=ts.transpileModule(raw,{fileName:source,compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
const exports={}; vm.runInNewContext(transpiled,{exports,Map,Set},{timeout:12000});
const scan=exports.detectCanonicalRelationDuplicatesV1;
assert.equal(typeof scan,'function');
assert.equal(exports.CANONICAL_DUPLICATES_VERSION_V1,'ARCTOR_ARI_04_06_02_CANONICAL_DUPLICATES_V1');
const def=(code,overrides={})=>({relationTypeCode:code,status:'active',
 directionalityCode:'directed',canonicalRelationTypeCode:code,canonicalOrientationCode:'same',
 canonicalWritePolicyCode:'enabled',...overrides});
const types=[def('depends_on'),def('prerequisite_for',{canonicalRelationTypeCode:'depends_on',canonicalOrientationCode:'reverse',canonicalWritePolicyCode:'reverse_alias'}),
 def('influences'),def('influenced_by',{canonicalRelationTypeCode:'influences',canonicalOrientationCode:'reverse',canonicalWritePolicyCode:'reverse_alias'}),
 def('supports'),def('conflicts_with',{directionalityCode:'symmetric',canonicalOrientationCode:'symmetric'}),
 def('related_to',{directionalityCode:'symmetric',canonicalOrientationCode:'symmetric'})];
const cand=(extra={})=>({id:'cand',sourceValueObjectId:'A',targetValueObjectId:'B',relationTypeCode:'depends_on',status:'proposed',contextKey:'home',evidenceRefs:['e-c'],...extra});
const old=(extra={})=>({id:'old',sourceValueObjectId:'A',targetValueObjectId:'B',relationTypeCode:'depends_on',status:'verified',contextKey:'home',evidenceRefs:['e-o'],...extra});
const invoke=(c=cand(),existing=[],overrides={})=>scan({candidate:c,existing,relationTypes:types,...overrides});
const finding=(out,code)=>out.findings.find(f=>f.code===code);
let n=0;const test=(name,fn)=>{try{fn()}catch(e){throw new Error(name+': '+e.message)}n++};
for(let i=0;i<12;i++)test('symmetric reversed '+i,()=>{
 const ty=i%2?'related_to':'conflicts_with';
 const x=invoke(cand({relationTypeCode:ty,sourceValueObjectId:i%3?'A':'B',targetValueObjectId:i%3?'B':'A'}),
  [old({relationTypeCode:ty,sourceValueObjectId:i%3?'B':'A',targetValueObjectId:i%3?'A':'B'})]);
 assert.equal(x.disposition,'BLOCKED'); assert.ok(finding(x,'DUPLICATE_CANONICAL_EDGE'));
});
for(let i=0;i<12;i++)test('reverse alias '+i,()=>{
 const ty=i%2?'prerequisite_for':'influenced_by'; const canonical=i%2?'depends_on':'influences';
 const x=invoke(cand({relationTypeCode:ty}),[old({relationTypeCode:canonical,sourceValueObjectId:'B',targetValueObjectId:'A'})]);
 assert.equal(x.disposition,'BLOCKED'); assert.ok(finding(x,'DUPLICATE_REVERSE_ALIAS'));
});
for(let i=0;i<12;i++)test('direct reverse distinct '+i,()=>{
 const ty=i%2?'depends_on':'influences';
 const x=invoke(cand({relationTypeCode:ty}),[old({relationTypeCode:ty,sourceValueObjectId:'B',targetValueObjectId:'A'})]);
 assert.equal(x.disposition,'NO_DUPLICATE_DETECTED');assert.equal(x.findings.length,0);
});
for(let i=0;i<12;i++)test('context safety '+i,()=>{
 const x=invoke(cand({contextKey:i%2?'work':'home'}),[old({contextKey:i%2?'home':null})]);
 assert.equal(x.disposition,'REVIEW_REQUIRED');assert.ok(finding(x,'CONTEXT_COLLISION_REVIEW'));
});
for(let i=0;i<12;i++)test('historical noncurrent '+i,()=>{
 const x=invoke(cand(),[old({status:i%2?'inactive':'rejected'})]);
 assert.equal(x.disposition,'REVIEW_REQUIRED');assert.ok(finding(x,'HISTORICAL_EDGE_REVIEW'));
});
for(let i=0;i<12;i++)test('invalid registry fail closed '+i,()=>{
 const modified=types.map(x=>x.relationTypeCode==='prerequisite_for'?{...x,
  ...(i%3===0?{canonicalRelationTypeCode:'missing'}:i%3===1?{canonicalOrientationCode:'same'}:{canonicalWritePolicyCode:'enabled'})}:x);
 const x=invoke(cand(),[],{relationTypes:modified});
 assert.equal(x.disposition,'BLOCKED');assert.equal(x.complete,false);
 assert.ok(finding(x,'INVALID_REGISTRY'));
});
assert.equal(n,72);
console.log('M-0188 SYNTHETIC CANONICAL DUPLICATE FIXTURES PASS: 72/72');
let inv=0;const check=(name,fn)=>{try{fn()}catch(e){throw new Error('invariant '+name+': '+e.message)}inv++};
check('no writes',()=>assert.equal(invoke().writesPerformed,0));
check('no approval',()=>assert.equal(invoke().approvesRelation,false));
check('no verification',()=>assert.equal(invoke().verifiesSource,false));
check('canonical type normalized',()=>assert.equal(invoke().candidateCanonical.relationTypeCode,'depends_on'));
check('canonical source stable',()=>assert.equal(invoke().candidateCanonical.sourceValueObjectId,'A'));
check('canonical target stable',()=>assert.equal(invoke().candidateCanonical.targetValueObjectId,'B'));
check('reverse swaps source',()=>assert.equal(invoke(cand({relationTypeCode:'prerequisite_for'})).candidateCanonical.sourceValueObjectId,'B'));
check('reverse swaps target',()=>assert.equal(invoke(cand({relationTypeCode:'prerequisite_for'})).candidateCanonical.targetValueObjectId,'A'));
check('symmetric sorted',()=>assert.equal(invoke(cand({relationTypeCode:'related_to',sourceValueObjectId:'B',targetValueObjectId:'A'})).candidateCanonical.sourceValueObjectId,'A'));
check('distinct canonical codes',()=>assert.equal(invoke(cand(),[old({relationTypeCode:'supports'})]).disposition,'NO_DUPLICATE_DETECTED'));
check('different endpoint',()=>assert.equal(invoke(cand(),[old({targetValueObjectId:'C'})]).disposition,'NO_DUPLICATE_DETECTED'));
check('same identity blocks',()=>assert.equal(invoke(cand(),[old()]).disposition,'BLOCKED'));
check('proposed existing blocks duplicate',()=>assert.equal(invoke(cand(),[old({status:'proposed'})]).disposition,'BLOCKED'));
check('active existing blocks duplicate',()=>assert.equal(invoke(cand(),[old({status:'active'})]).disposition,'BLOCKED'));
check('rejected existing is review',()=>assert.equal(invoke(cand(),[old({status:'rejected'})]).disposition,'REVIEW_REQUIRED'));
check('inactive existing is review',()=>assert.equal(invoke(cand(),[old({status:'inactive'})]).disposition,'REVIEW_REQUIRED'));
check('different explicit contexts review',()=>assert.equal(invoke(cand({contextKey:'x'}),[old({contextKey:'y'})]).disposition,'REVIEW_REQUIRED'));
check('single missing context review',()=>assert.equal(invoke(cand({contextKey:null}),[old()]).disposition,'REVIEW_REQUIRED'));
check('both null contexts block',()=>assert.equal(invoke(cand({contextKey:null}),[old({contextKey:null})]).disposition,'BLOCKED'));
check('candidate id collision fail closed',()=>assert.equal(invoke(cand(),[old({id:'cand'})]).complete,false));
check('empty candidate id fails',()=>assert.equal(invoke(cand({id:''})).disposition,'BLOCKED'));
check('empty relation type fails',()=>assert.equal(invoke(cand({relationTypeCode:''})).disposition,'BLOCKED'));
check('empty source fails',()=>assert.equal(invoke(cand({sourceValueObjectId:''})).disposition,'BLOCKED'));
check('empty target fails',()=>assert.equal(invoke(cand({targetValueObjectId:''})).disposition,'BLOCKED'));
check('rejected candidate is invalid',()=>assert.equal(invoke(cand({status:'rejected'})).disposition,'BLOCKED'));
check('inactive candidate is invalid',()=>assert.equal(invoke(cand({status:'inactive'})).disposition,'BLOCKED'));
check('unknown candidate type blocked',()=>assert.equal(invoke(cand({relationTypeCode:'missing'})).disposition,'BLOCKED'));
check('unknown existing type blocked',()=>assert.equal(invoke(cand(),[old({relationTypeCode:'missing'})]).disposition,'BLOCKED'));
check('inactive alias registry blocks',()=>assert.equal(invoke(cand(),[],{relationTypes:types.map(t=>t.relationTypeCode==='prerequisite_for'?{...t,status:'inactive'}:t)}).complete,true));
check('inactive canonical candidate blocked',()=>assert.equal(invoke(cand(),[],{relationTypes:types.map(t=>t.relationTypeCode==='depends_on'?{...t,status:'inactive'}:t)}).disposition,'BLOCKED'));
check('duplicate registry entry blocked',()=>assert.equal(invoke(cand(),[],{relationTypes:[...types,types[0]]}).disposition,'BLOCKED'));
check('invalid orientation blocked',()=>assert.equal(invoke(cand(),[],{relationTypes:types.map(t=>t.relationTypeCode==='depends_on'?{...t,canonicalOrientationCode:'reverse'}:t)}).disposition,'BLOCKED'));
check('incompatible symmetric metadata blocked',()=>assert.equal(invoke(cand(),[],{relationTypes:types.map(t=>t.relationTypeCode==='related_to'?{...t,canonicalOrientationCode:'same'}:t)}).disposition,'BLOCKED'));
check('candidate unchanged',()=>{const c=cand();const s=JSON.stringify(c);invoke(c);assert.equal(JSON.stringify(c),s)});
check('registry unchanged',()=>{const s=JSON.stringify(types);invoke();assert.equal(JSON.stringify(types),s)});
check('existing unchanged',()=>{const x=[old()];const s=JSON.stringify(x);invoke(cand(),x);assert.equal(JSON.stringify(x),s)});
check('deterministic shuffled',()=>{
 const x=[old({id:'1'}),old({id:'2',status:'rejected'}),old({id:'3',contextKey:'work'})];
 assert.equal(JSON.stringify(invoke(cand(),x)),JSON.stringify(invoke(cand(),[...x].reverse())));
});
check('evidence deduplicated',()=>{
 const z=invoke(cand({evidenceRefs:['e-c','e-c']}),[old({evidenceRefs:['e-c','e-o','e-o']})]);
 assert.equal(JSON.stringify(z.findings[0].evidenceRefs),JSON.stringify(['e-c','e-o']));
});
check('no synthetic edge creation',()=>assert.equal(invoke(cand(),[]).findings.length,0));
check('no implied negation',()=>assert.equal(invoke(cand(),[old({status:'rejected'})]).verifiesSource,false));
assert.equal(inv,40);
console.log('M-0188 INDEPENDENT INVARIANTS PASS: 40/40');
console.log('M-0188 CODE READONLY: no DB, API, network, ledger or graph mutation.');
