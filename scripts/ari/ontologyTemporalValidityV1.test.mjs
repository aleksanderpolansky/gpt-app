/** M-0189 offline temporal contradiction regression: no DB, network or graph writes. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const repo=process.env.ARCTOR_REPO || process.cwd();
const source=process.env.ARCTOR_TEMPORAL_TS || path.join(repo,'src/lib/ontology/contradictionDetectorV1.ts');
const ts=createRequire(path.join(repo,'package.json'))('typescript');
const program=ts.createProgram([source],{strict:true,target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,
  skipLibCheck:true,noEmit:true,lib:['lib.es2020.d.ts']});
const diagnostics=ts.getPreEmitDiagnostics(program).filter(d=>d.category===ts.DiagnosticCategory.Error);
assert.equal(diagnostics.length,0,ts.formatDiagnostics(diagnostics,{getCanonicalFileName:s=>s,getCurrentDirectory:()=>repo,getNewLine:()=> '\n'}));
const raw=fs.readFileSync(source,'utf8');
for(const prohibited of ['supabase.from','supabase.rpc','fetch(','process.env','writeFileSync','delete from','insert into'])
  assert.equal(raw.includes(prohibited),false,`Source must remain pure: ${prohibited}`);
const output=ts.transpileModule(raw,{fileName:source,compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
const exports={};vm.runInNewContext(output,{exports,Set,Map,Date,BigInt},{timeout:12000});
const detect=exports.detectContradictionsV1;
assert.equal(typeof detect,'function');
const nodes=['A','B','C'].map(id=>({id,facetCode:'PROCESS',scopeCode:'global'}));
const rtype=code=>({relationTypeCode:code,status:'active',directionalityCode:'directed',allowSelfLink:false,
  fromScopeCode:'ordinary',toScopeCode:'ordinary',allowedSourceFacetCodes:['PROCESS'],allowedTargetFacetCodes:['PROCESS']});
const relationTypes=['supports','influences','depends_on'].map(rtype);
const base=(extra={})=>({id:'candidate',sourceValueObjectId:'A',targetValueObjectId:'B',relationTypeCode:'supports',
 status:'verified',assertionPolarity:'affirm',claimKey:'same-claim',contextKey:'same-context',evidenceRefs:['ev-1'],...extra});
const old=(extra={})=>({...base({id:'existing',assertionPolarity:'deny',evidenceRefs:['ev-2']}),...extra});
const scan=(c=base(),history=[],opts={})=>detect({candidate:c,existing:history,nodes,relationTypes,usageScope:'ordinary',...opts});
const code=(out,c)=>out.findings.find(f=>f.code===c);
const day=i=>`2026-11-${String(i).padStart(2,'0')}T00:00:00Z`;
let n=0;function check(name,fn){try{fn();n++}catch(e){throw new Error(name+': '+e.message)}}
// 12: inverted time intervals, inclusive zero-duration valid.
for(let i=0;i<12;i++)check('inverted '+i,()=>{
  const x=scan(base({valid_from:day(12+i),valid_to:day(11+i)}));
  assert.equal(x.disposition,'BLOCKED');assert.equal(x.complete,false);
  assert.ok(code(x,'INVALID_TEMPORAL_RANGE'));
});
// 12: invalid datetime/offset/format/calendar input must fail closed.
const bad=['2026-02-29T10:00:00Z','2026-13-01T10:00:00Z','2026-01-32T10:00:00Z',
 '2026-11-01T25:00:00Z','2026-11-01T00:60:00Z','2026-11-01T00:00:60Z',
 '2026-11-01T00:00:00','2026-11-01','2026-11-01T00:00:00+15:00',
 '2026-11-01T00:00:00+14:01','2026-11-01T00:00:00.1234567Z',
 '2026-11-01T00:00:00+01:60'];
for(let i=0;i<12;i++)check('invalid datetime '+i,()=>{
 const x=scan(base({valid_from:bad[i]}));assert.equal(x.complete,false);assert.ok(code(x,'INVALID_TEMPORAL_RANGE'));
});
// 12: disjoint verified opposite claims are not simultaneous contradictions.
for(let i=0;i<12;i++)check('disjoint '+i,()=>{
 const c=base({valid_from:day(1),valid_to:day(2)});
 const o=old({valid_from:day(3+i),valid_to:day(16+i)});
 const x=scan(c,[o]);assert.equal(x.disposition,'NO_CONTRADICTION_DETECTED');
 assert.equal(code(x,'EXPLICIT_CLAIM_NEGATION'),undefined);
});
// 12: verified opposing same bounded claim with intersecting periods blocks.
for(let i=0;i<12;i++)check('intersect '+i,()=>{
 const c=base({valid_from:day(10),valid_to:day(20)});
 const o=old({valid_from:day(12+i%6),valid_to:day(22+i%6)});
 const x=scan(c,[o]);assert.equal(code(x,'EXPLICIT_CLAIM_NEGATION')?.severity,'BLOCK');
});
// 12: exact shared endpoints and equivalent timezone representations.
for(let i=0;i<12;i++)check('timezone / endpoint '+i,()=>{
 const instant='2026-11-10T12:00:00.123456Z';
 const alt=i%2?'2026-11-10T13:00:00.123456+01:00':'2026-11-10T07:00:00.123456-05:00';
 const c=base({valid_from:instant,valid_to:instant});
 const o=old({valid_from:alt,valid_to:alt});
 const x=scan(c,[o]);assert.equal(code(x,'EXPLICIT_CLAIM_NEGATION')?.severity,'BLOCK');
});
// 12: absent/partial source temporal metadata never creates strict temporal proof.
for(let i=0;i<12;i++)check('partial temporal '+i,()=>{
 const c=base({valid_from:day(10),valid_to:i%2?null:day(20)});
 const o=old(i%3===0?{valid_to:null}:{valid_from:null});
 const x=scan(c,[o]);assert.equal(code(x,'EXPLICIT_CLAIM_NEGATION')?.severity,'REVIEW');
});
assert.equal(n,72);console.log('M-0189 SYNTHETIC TEMPORAL VALIDITY FIXTURES PASS: 72/72');
let count=0;function inv(name,fn){try{fn();count++}catch(e){throw new Error('INVARIANT '+name+': '+e.message)}}
inv('no writes',()=>assert.equal(scan().writesPerformed,0));
inv('no approval',()=>assert.equal(scan().approvesRelation,false));
inv('no verification',()=>assert.equal(scan().verifiesSource,false));
inv('preserves legacy strict',()=>assert.equal(code(scan(base(),[old()]),'EXPLICIT_CLAIM_NEGATION')?.severity,'BLOCK'));
inv('null ranges allowed',()=>assert.equal(scan(base({valid_from:null,valid_to:null})).disposition,'NO_CONTRADICTION_DETECTED'));
inv('equal boundaries accepted',()=>assert.equal(scan(base({valid_from:day(10),valid_to:day(10)})).disposition,'NO_CONTRADICTION_DETECTED'));
inv('one bound allowed',()=>assert.equal(scan(base({valid_from:day(10)})).disposition,'NO_CONTRADICTION_DETECTED'));
inv('one end allowed',()=>assert.equal(scan(base({valid_to:day(10)})).disposition,'NO_CONTRADICTION_DETECTED'));
inv('valid leap year',()=>assert.equal(scan(base({valid_from:'2024-02-29T00:00:00Z'})).complete,true));
inv('year 0001 valid',()=>assert.equal(scan(base({valid_from:'0001-01-01T00:00:00Z'})).complete,true));
inv('invalid old blocks',()=>assert.ok(code(scan(base(),[old({valid_from:'invalid'})]),'INVALID_TEMPORAL_RANGE')));
inv('empty is not null',()=>assert.ok(code(scan(base({valid_from:''})),'INVALID_TEMPORAL_RANGE')));
inv('date only invalid',()=>assert.ok(code(scan(base({valid_from:'2026-11-10'})),'INVALID_TEMPORAL_RANGE')));
inv('offset mandatory',()=>assert.ok(code(scan(base({valid_from:'2026-11-10T00:00:00'})),'INVALID_TEMPORAL_RANGE')));
inv('reject ambiguous local time',()=>assert.ok(code(scan(base({valid_from:'2026-11-10T02:30:00+1:00'})),'INVALID_TEMPORAL_RANGE')));
inv('invalid type rejects',()=>assert.ok(code(scan(base({valid_to:42})),'INVALID_TEMPORAL_RANGE')));
inv('no mutate input',()=>{const c=base({valid_from:day(10)});const p=JSON.stringify(c);scan(c);assert.equal(JSON.stringify(c),p)});
inv('no mutate history',()=>{const h=[old({valid_from:day(10)})],p=JSON.stringify(h);scan(base(),h);assert.equal(JSON.stringify(h),p)});
inv('bounded independent context',()=>assert.equal(scan(base({contextKey:'a'}),[old({contextKey:'b'})]).disposition,'NO_CONTRADICTION_DETECTED'));
inv('rejected history not negation',()=>assert.equal(scan(base(),[old({status:'rejected'})]).disposition,'NO_CONTRADICTION_DETECTED'));
inv('invalid rejected historic still detected',()=>assert.ok(code(scan(base(),[old({status:'rejected',valid_from:'x'})]),'INVALID_TEMPORAL_RANGE')));
inv('effect mismatch time disjoint ignored',()=>{
 const x=scan(base({relationTypeCode:'influences',effectPolarity:'positive',valid_to:day(10)}),
 [old({relationTypeCode:'influences',effectPolarity:'negative',assertionPolarity:'affirm',valid_from:day(11)})],
 {strictSingleValuedEffectTypes:['influences']});assert.equal(code(x,'INCOMPATIBLE_EFFECT_POLARITY'),undefined)});
inv('effect overlap strict',()=>{
 const x=scan(base({relationTypeCode:'influences',effectPolarity:'positive',valid_from:day(10),valid_to:day(20)}),
 [old({relationTypeCode:'influences',effectPolarity:'negative',assertionPolarity:'affirm',valid_from:day(11),valid_to:day(19)})],
 {strictSingleValuedEffectTypes:['influences']});assert.equal(code(x,'INCOMPATIBLE_EFFECT_POLARITY')?.severity,'BLOCK')});
inv('effect unknown period downgraded',()=>{
 const x=scan(base({relationTypeCode:'influences',effectPolarity:'positive',valid_to:day(20)}),
 [old({relationTypeCode:'influences',effectPolarity:'negative',assertionPolarity:'affirm'})],
 {strictSingleValuedEffectTypes:['influences']});assert.equal(code(x,'INCOMPATIBLE_EFFECT_POLARITY')?.severity,'REVIEW')});
inv('cycles disjoint no alert',()=>{
 const x=scan(base({relationTypeCode:'depends_on',valid_to:day(10)}),
 [old({relationTypeCode:'depends_on',sourceValueObjectId:'B',targetValueObjectId:'A',assertionPolarity:'affirm',valid_from:day(11)})],
 {strictAcyclicTypes:['depends_on']});assert.equal(code(x,'DEPENDENCY_CYCLE'),undefined)});
inv('dated cycle not blocked',()=>{
 const x=scan(base({relationTypeCode:'depends_on',valid_from:day(10),valid_to:day(20)}),
 [old({relationTypeCode:'depends_on',sourceValueObjectId:'B',targetValueObjectId:'A',assertionPolarity:'affirm',valid_from:day(11)})],
 {strictAcyclicTypes:['depends_on']});assert.equal(code(x,'DEPENDENCY_CYCLE')?.severity,'REVIEW')});
inv('no automatic inference from current date',()=>assert.equal(scan(base({valid_from:'2099-01-01T00:00:00Z'})).disposition,'NO_CONTRADICTION_DETECTED'));
inv('fraction precision distinctions',()=>{
 const c=base({valid_from:'2026-11-10T00:00:00.000001Z',valid_to:'2026-11-10T00:00:00.000001Z'});
 const o=old({valid_from:'2026-11-10T00:00:00Z',valid_to:'2026-11-10T00:00:00Z'});
 assert.equal(scan(c,[o]).disposition,'NO_CONTRADICTION_DETECTED')});
inv('determinism',()=>{const c=base({valid_from:day(10),valid_to:day(20)});const x=[old({id:'a',valid_from:day(11)}),old({id:'b',valid_from:day(12)})];assert.equal(JSON.stringify(scan(c,x)),JSON.stringify(scan(c,[...x].reverse())))});
inv('ISO date clock not mutated',()=>{const a=base({valid_from:day(10)});scan(a);assert.equal(a.valid_from,day(10))});
inv('leap seconds not silently normalized',()=>assert.ok(code(scan(base({valid_to:'2026-11-10T23:59:60Z'})),'INVALID_TEMPORAL_RANGE')));
inv('invalid midnight 24 blocked',()=>assert.ok(code(scan(base({valid_to:'2026-11-10T24:00:00Z'})),'INVALID_TEMPORAL_RANGE')));
inv('timezone positive 14 valid',()=>assert.equal(scan(base({valid_from:'2026-11-10T12:00:00+14:00'})).complete,true));
inv('timezone negative 14 valid',()=>assert.equal(scan(base({valid_from:'2026-11-10T12:00:00-14:00'})).complete,true));
inv('timezone 14:01 invalid',()=>assert.ok(code(scan(base({valid_from:'2026-11-10T12:00:00+14:01'})),'INVALID_TEMPORAL_RANGE')));
inv('timezone offset minute invalid',()=>assert.ok(code(scan(base({valid_from:'2026-11-10T12:00:00+01:99'})),'INVALID_TEMPORAL_RANGE')));
inv('multiple errors deterministic order',()=>{const c=base({valid_from:'bad'});assert.equal(JSON.stringify(scan(c)),JSON.stringify(scan(c)))});
inv('invalid timeframe no writes',()=>assert.equal(scan(base({valid_from:'bad'})).writesPerformed,0));
inv('invalid timeframe no approvals',()=>assert.equal(scan(base({valid_from:'bad'})).approvesRelation,false));
inv('incompatible range no source verification',()=>assert.equal(scan(base({valid_from:day(11),valid_to:day(10)})).verifiesSource,false));
inv('explicit denial not created from no date',()=>assert.equal(code(scan(base({valid_from:day(10)})),'EXPLICIT_CLAIM_NEGATION'),undefined));
inv('future dates no assumed freshness',()=>assert.equal(scan(base({valid_from:'2099-01-01T00:00:00Z'})).verifiesSource,false));
inv('contradiction not automatically approves',()=>assert.equal(scan(base({valid_from:day(10)}),[old({valid_from:day(10)})]).approvesRelation,false));
inv('opposite claims different periods stable',()=>assert.equal(scan(base({valid_to:day(10)}),[old({valid_from:day(11)})]).complete,true));
assert.equal(count,44);
console.log(`M-0189 INDEPENDENT TEMPORAL INVARIANTS PASS: ${count}/${count}`);
console.log('M-0189 CODE READONLY: no DB, API, network, ledger or graph mutations.');
