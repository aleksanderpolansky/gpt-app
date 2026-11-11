/** M-0190 offline regression: synthetic, deterministic, no DB, no network, no writes. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const repo=process.env.ARCTOR_REPO||process.cwd();
const source=process.env.ARCTOR_SYMMETRIC_TS||path.join(repo,'src/lib/ontology/symmetricReverseDuplicateGuardV1.ts');
const accepted=process.env.ARCTOR_DUPLICATE_TS||path.join(repo,'src/lib/ontology/canonicalRelationDuplicatesV1.ts');
const ts=require(path.join(repo,'node_modules/typescript'));
const forbidden=['supabase.from','supabase.rpc','fetch(','process.env','writeFileSync','unlinkSync','delete from','insert into'];
const raw=fs.readFileSync(source,'utf8'),rawPrev=fs.readFileSync(accepted,'utf8');
for(const fragment of forbidden) assert.equal(raw.includes(fragment),false,'Pure guard forbidden: '+fragment);
const opts={target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,strict:true,noEmit:true,
 skipLibCheck:true,lib:['lib.es2020.d.ts']};
const host=ts.createCompilerHost(opts);
host.resolveModuleNames=(names,containing)=>names.map(name=>name==='./canonicalRelationDuplicatesV1'
 ? {resolvedFileName:accepted,extension:ts.Extension.Ts}
 : ts.resolveModuleName(name,containing,opts,host).resolvedModule);
const program=ts.createProgram([source,accepted],opts,host);
const errors=ts.getPreEmitDiagnostics(program).filter(d=>d.category===ts.DiagnosticCategory.Error);
assert.equal(errors.length,0,ts.formatDiagnostics(errors,{getCanonicalFileName:s=>s,getCurrentDirectory:()=>repo,getNewLine:()=> '\n'}));
function compile(filename,code,imports={}){
 const compiled=ts.transpileModule(code,{fileName:filename,compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
 const exports={};
 vm.runInNewContext(compiled,{exports,require:(name)=>{if(!(name in imports))throw Error('unexpected import '+name);return imports[name]},Date,BigInt,Map,Set}, {timeout:12000});
 return exports;
}
const prev=compile(accepted,rawPrev);
const module=compile(source,raw,{'./canonicalRelationDuplicatesV1':prev});
const guard=module.detectSymmetricReverseDuplicatesV1;
assert.equal(typeof guard,'function');
assert.equal(module.SYMMETRIC_REVERSE_GUARD_VERSION_V1,'ARCTOR_ARI_04_06_04_SYMMETRIC_REVERSE_GUARD_V1');
const type=(relationTypeCode,overrides={})=>({relationTypeCode,status:'active',directionalityCode:'directed',canonicalRelationTypeCode:relationTypeCode,
 canonicalOrientationCode:'same',canonicalWritePolicyCode:'enabled',...overrides});
const types=[type('related_to',{directionalityCode:'symmetric',canonicalOrientationCode:'symmetric'}),
 type('conflicts_with',{directionalityCode:'symmetric',canonicalOrientationCode:'symmetric'}),
 type('depends_on'),type('influences')];
const candidate=(extra={})=>({id:'C',sourceValueObjectId:'A',targetValueObjectId:'B',relationTypeCode:'related_to',status:'proposed',contextKey:'work',evidenceRefs:['ev-c'],...extra});
const existing=(extra={})=>({id:'E',sourceValueObjectId:'B',targetValueObjectId:'A',relationTypeCode:'related_to',status:'verified',contextKey:'work',evidenceRefs:['ev-e'],...extra});
const scan=(c=candidate(),records=[existing()],opts={})=>guard({candidate:c,existing:records,relationTypes:types,...opts});
const has=(r,code)=>r.findings.some(x=>x.code===code);
let n=0;const test=(name,fn)=>{try{fn()}catch(err){throw Error(name+': '+err.message)}n++};
// Six groups x twelve scenarios = 72 synthetic fixtures.
for(let i=0;i<12;i++)test('reversed same-scope '+i,()=>{
 const code=i%2?'conflicts_with':'related_to';
 const x=scan(candidate({relationTypeCode:code,status:i%3===0?'active':i%3===1?'verified':'proposed'}),
 [existing({relationTypeCode:code,status:i%4===0?'active':i%4===1?'proposed':'verified'})]);
 assert.equal(x.disposition,'BLOCKED');assert.ok(has(x,'SYMMETRIC_REVERSE_DUPLICATE'));
});
for(let i=0;i<12;i++)test('directed reversed NOT applicable '+i,()=>{
 const code=i%2?'depends_on':'influences';
 const x=scan(candidate({relationTypeCode:code}),[existing({relationTypeCode:code})]);
 assert.equal(x.disposition,'NOT_APPLICABLE');
});
for(let i=0;i<12;i++)test('different/missing context review '+i,()=>{
 const x=scan(candidate({contextKey:i%2?'home':'work'}),[existing({contextKey:i%2?'work':null})]);
 assert.equal(x.disposition,'REVIEW_REQUIRED');assert.ok(has(x,'SYMMETRIC_REVERSE_REVIEW'));
});
for(let i=0;i<12;i++)test('historical not duplicate '+i,()=>{
 const x=scan(candidate(),[existing({status:i%2?'rejected':'inactive'})]);
 assert.equal(x.disposition,'REVIEW_REQUIRED');assert.ok(has(x,'HISTORICAL_SYMMETRIC_REVIEW'));
});
for(let i=0;i<12;i++)test('non-overlapping temporal '+i,()=>{
 const left=i%2?'2026-11-01T10:00:00+01:00':'2026-11-01T09:00:00Z';
 const x=scan(candidate({valid_from:'2026-12-01T09:00:00Z',valid_to:'2026-12-02T09:00:00Z'}),
 [existing({valid_from:left,valid_to:'2026-11-02T09:00:00Z'})]);
 assert.equal(x.disposition,'NO_REVERSE_DUPLICATE_DETECTED');
});
for(let i=0;i<12;i++)test('temporal/polarity uncertainty '+i,()=>{
 let c=candidate(),o=existing();
 switch(i%4){
 case 0:c=candidate({valid_from:'2026-11-01T00:00:00Z'});break;
 case 1:c=candidate({valid_from:'2026-11-01T00:00:00Z',valid_to:'2026-11-10T00:00:00Z'});
        o=existing({valid_from:'2026-11-02T00:00:00Z',valid_to:'2026-11-11T00:00:00Z'});break;
 case 2:c=candidate({assertionPolarity:'deny'});break;
 case 3:c=candidate({effectPolarity:'negative'});o=existing({effectPolarity:'positive'});break;
 }
 const x=scan(c,[o]);assert.equal(x.disposition,'REVIEW_REQUIRED');assert.ok(has(x,'SYMMETRIC_REVERSE_REVIEW'));
});
assert.equal(n,72);
console.log('M-0190 SYNTHETIC SYMMETRIC REVERSE FIXTURES PASS: 72/72');
let inv=0;const check=(label,fn)=>{try{fn()}catch(e){throw Error(label+': '+e.message)}inv++};
check('version',()=>assert.equal(scan().version,'ARCTOR_ARI_04_06_04_SYMMETRIC_REVERSE_GUARD_V1'));
check('read-only',()=>assert.equal(scan().writesPerformed,0));
check('no approval',()=>assert.equal(scan().approvesRelation,false));
check('no source verification',()=>assert.equal(scan().verifiesSource,false));
check('complete normal',()=>assert.equal(scan().complete,true));
check('reverse A B detected',()=>assert.ok(has(scan(),'SYMMETRIC_REVERSE_DUPLICATE')));
check('same orientation left to M0188',()=>assert.equal(scan(candidate(),[existing({sourceValueObjectId:'A',targetValueObjectId:'B'})]).disposition,'NO_REVERSE_DUPLICATE_DETECTED'));
check('other target no duplicate',()=>assert.equal(scan(candidate(),[existing({sourceValueObjectId:'C'})]).disposition,'NO_REVERSE_DUPLICATE_DETECTED'));
check('different relation type no duplicate',()=>assert.equal(scan(candidate(),[existing({relationTypeCode:'conflicts_with'})]).disposition,'NO_REVERSE_DUPLICATE_DETECTED'));
check('type cannot infer from label',()=>assert.equal(scan(candidate({relationTypeCode:'depends_on'}),[existing({relationTypeCode:'depends_on'})]).disposition,'NOT_APPLICABLE'));
check('reversed candidate symmetric same key',()=>assert.equal(scan(candidate({sourceValueObjectId:'B',targetValueObjectId:'A'}),[existing({sourceValueObjectId:'A',targetValueObjectId:'B'})]).disposition,'BLOCKED'));
check('no mutation candidate',()=>{const x=candidate();const before=JSON.stringify(x);scan(x);assert.equal(JSON.stringify(x),before)});
check('no mutation existing',()=>{const x=[existing()];const before=JSON.stringify(x);scan(candidate(),x);assert.equal(JSON.stringify(x),before)});
check('no mutation registry',()=>{const before=JSON.stringify(types);scan();assert.equal(JSON.stringify(types),before)});
check('findings cite known IDs',()=>assert.equal(scan().findings[0].relatedRelationId,'E'));
check('evidence preserved',()=>assert.equal(JSON.stringify(scan().findings[0].evidenceRefs),JSON.stringify(['ev-c','ev-e'])));
check('evidence dedup',()=>assert.equal(JSON.stringify(scan(candidate({evidenceRefs:['ev-x','ev-x']}),[existing({evidenceRefs:['ev-x']})]).findings[0].evidenceRefs),JSON.stringify(['ev-x'])));
check('status proposed blocks',()=>assert.equal(scan(candidate(),[existing({status:'proposed'})]).disposition,'BLOCKED'));
check('status active blocks',()=>assert.equal(scan(candidate(),[existing({status:'active'})]).disposition,'BLOCKED'));
check('status rejected reviews',()=>assert.equal(scan(candidate(),[existing({status:'rejected'})]).disposition,'REVIEW_REQUIRED'));
check('status inactive reviews',()=>assert.equal(scan(candidate(),[existing({status:'inactive'})]).disposition,'REVIEW_REQUIRED'));
check('id collision invalid',()=>assert.equal(scan(candidate(),[existing({id:'C'})]).complete,false));
check('bad canonical policy invalid',()=>assert.equal(scan(candidate(),[existing()],{relationTypes:types.map(t=>t.relationTypeCode==='related_to'?{...t,canonicalOrientationCode:'same'}:t)}).complete,false));
check('disabled symmetric not applicable',()=>assert.equal(scan(candidate(),[existing()],{relationTypes:types.map(t=>t.relationTypeCode==='related_to'?{...t,status:'inactive'}:t)}).disposition,'BLOCKED'));
check('bad type invalid',()=>assert.equal(scan(candidate({relationTypeCode:'missing'})).complete,false));
check('wrong context review',()=>assert.equal(scan(candidate({contextKey:'work'}),[existing({contextKey:'home'})]).disposition,'REVIEW_REQUIRED'));
check('single context missing review',()=>assert.equal(scan(candidate({contextKey:null}),[existing({contextKey:'work'})]).disposition,'REVIEW_REQUIRED'));
check('both no context block',()=>assert.equal(scan(candidate({contextKey:null}),[existing({contextKey:null})]).disposition,'BLOCKED'));
check('explicit affirmative v missing affirmative duplicate',()=>assert.equal(scan(candidate({assertionPolarity:'affirm'})).disposition,'BLOCKED'));
check('explicit deny v affirm review',()=>assert.equal(scan(candidate({assertionPolarity:'deny'})).disposition,'REVIEW_REQUIRED'));
check('explicit effect mismatch review',()=>assert.equal(scan(candidate({effectPolarity:'negative'}),[existing({effectPolarity:'positive'})]).disposition,'REVIEW_REQUIRED'));
check('invalid date day blocked',()=>assert.equal(scan(candidate({valid_from:'2026-02-30T00:00:00Z'})).complete,false));
check('invalid date offset blocked',()=>assert.equal(scan(candidate({valid_from:'2026-11-01T00:00:00+15:00'})).complete,false));
check('invalid interval blocked',()=>assert.equal(scan(candidate({valid_from:'2026-12-02T00:00:00Z',valid_to:'2026-12-01T00:00:00Z'})).complete,false));
check('invalid datetime no TZ blocked',()=>assert.equal(scan(candidate({valid_from:'2026-12-01T00:00:00'})).complete,false));
check('matching bounded interval duplicates',()=>assert.equal(scan(candidate({valid_from:'2026-11-01T00:00:00Z',valid_to:'2026-11-02T00:00:00Z'}),[existing({valid_from:'2026-11-01T01:00:00+01:00',valid_to:'2026-11-02T01:00:00+01:00'})]).disposition,'BLOCKED'));
check('equal endpoint overlap review',()=>assert.equal(scan(candidate({valid_from:'2026-11-02T00:00:00Z',valid_to:'2026-11-03T00:00:00Z'}),[existing({valid_from:'2026-11-01T00:00:00Z',valid_to:'2026-11-02T00:00:00Z'})]).disposition,'REVIEW_REQUIRED'));
check('unbounded interval review',()=>assert.equal(scan(candidate({valid_from:'2026-11-01T00:00:00Z'})).disposition,'REVIEW_REQUIRED'));
check('disjoint time no duplicate',()=>assert.equal(scan(candidate({valid_from:'2026-12-01T00:00:00Z'}),[existing({valid_to:'2026-11-01T00:00:00Z'})]).disposition,'NO_REVERSE_DUPLICATE_DETECTED'));
check('sorted deterministic',()=>{const x=[existing({id:'E1'}),existing({id:'E2'})];assert.equal(JSON.stringify(scan(candidate(),x)),JSON.stringify(scan(candidate(),[...x].reverse())))});
assert.equal(inv,40);
console.log('M-0190 INDEPENDENT SYMMETRIC INVARIANTS PASS: 40/40');
console.log('M-0190 CODE READONLY: no DB, API, network, ledger or graph mutation.');
