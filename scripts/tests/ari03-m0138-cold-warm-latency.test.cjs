'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const ts=require(require.resolve('typescript',{paths:[process.cwd(),__dirname]}));
const source=process.env.ARCTOR_M0138_TEST_MODULE_PATH||path.join(__dirname,'indexLifecycleV1.ts');
const code=fs.readFileSync(source,'utf8');
const compiled=ts.transpileModule(code,{fileName:source,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});
const mod=new Module(source,module);mod.filename=source;mod.paths=Module._nodeModulePaths(path.dirname(source));mod._compile(compiled.outputText,source);
const S=mod.exports;
const {summarizeCatalogLatencySamplesV1:summary,summarizeColdWarmCatalogLatencyV1:report}=S;
const CORE='ARCTOR_ARI03_M0138_LOCAL_COLD_WARM_LATENCY_V1';
test('published latency contract',()=>assert.equal(S.LOCAL_CATALOG_LATENCY_CONTRACT_V1,CORE));
test('available public pure summary functions',()=>{assert.equal(typeof summary,'function');assert.equal(typeof report,'function')});
test('single observed value',()=>assert.deepEqual(summary([2]),{count:1,p50Ms:2,p95Ms:2,minMs:2,maxMs:2,meanMs:2,method:'nearest_rank'}));
test('nearest-rank 4 values',()=>{const x=summary([4,1,3,2]);assert.equal(x.p50Ms,2);assert.equal(x.p95Ms,4)});
test('nearest-rank 20 values',()=>{const x=summary(Array.from({length:20},(_,i)=>i+1));assert.equal(x.p50Ms,10);assert.equal(x.p95Ms,19)});
test('nearest-rank 100 values',()=>{const x=summary(Array.from({length:100},(_,i)=>i+1));assert.equal(x.p50Ms,50);assert.equal(x.p95Ms,95)});
test('zero is valid observed duration',()=>assert.equal(summary([0,0,0]).p50Ms,0));
test('reject empty observations',()=>assert.throws(()=>summary([]),/LATENCY_SAMPLE_COUNT/));
test('reject non-array observations',()=>assert.throws(()=>summary('1'),/LATENCY_SAMPLE_COUNT/));
test('reject huge sample count',()=>assert.throws(()=>summary(new Array(100001).fill(1)),/LATENCY_SAMPLE_COUNT/));
for(const [label,bad] of [['NaN',NaN],['infinity',Infinity],['negative infinity',-Infinity],['negative',-1],['too long',3600000.1],['string','2'],['null',null],['undefined',undefined],['object',{}],['boolean',true]]){
 test('reject invalid sample '+label,()=>assert.throws(()=>summary([1,bad]),/LATENCY_SAMPLE_INVALID/));
}
for(let n=2;n<=25;n++){
 test('monotone measured percentiles n='+n,()=>{
  const samples=Array.from({length:n},(_,i)=>(n-i)*0.42);const frozen=[...samples],s=summary(samples);
  assert.equal(s.count,n);assert(s.minMs<=s.p50Ms&&s.p50Ms<=s.p95Ms&&s.p95Ms<=s.maxMs);
  assert(Math.abs(s.meanMs-samples.reduce((a,b)=>a+b,0)/n)<1e-10);assert.deepEqual(samples,frozen);
 });
}
const baseline=()=>({model:'text-embedding-3-small',catalogEntries:18,queryCount:3,coldMs:[1,3,2],warmMs:[0.5,0.1,0.2,0.3,0.4,0.6]});
test('report correct count and real observed values',()=>{
 const r=report(baseline());assert.equal(r.contract,CORE);assert.equal(r.cold.count,3);
 assert.equal(r.warm.count,6);assert.equal(r.cold.p50Ms,2);assert.equal(r.cold.p95Ms,3);
 assert.equal(r.warm.p50Ms,0.3);assert.equal(r.warm.p95Ms,0.6);
});
test('report non-billable and non-live',()=>{
 const x=report(baseline());assert.equal(x.measurement,'local_offline_real_sources_no_network');
 assert.equal(x.sqlExecuted,false);assert.equal(x.paidApiCalls,0);assert.equal(x.liveHttpEndToEndMeasured,false);
 assert.equal(x.trueOsColdCacheMeasured,false);
});
test('report preserves model and catalog count',()=>{const x=report(baseline());assert.equal(x.model,'text-embedding-3-small');assert.equal(x.catalogEntries,18)});
test('report deterministic with same samples',()=>assert.deepEqual(report(baseline()),report(baseline())));
test('report does not mutate sample arrays',()=>{const b=baseline(),c=structuredClone(b);report(b);assert.deepEqual(b,c)});
for(const [label,override] of [
 ['unknown model',{model:'oops!'}],['empty model',{model:''}],['invalid catalog',{catalogEntries:0}],
 ['fraction catalog',{catalogEntries:1.1}],['negative catalog',{catalogEntries:-2}],
 ['invalid query count',{queryCount:0}],['fraction query count',{queryCount:2.7}],
 ['wrong cold sample count',{coldMs:[1]}],['too few warm samples',{warmMs:[1]}],
 ['non array cold',{coldMs:null}],['non array warm',{warmMs:null}],
 ['huge query count',{queryCount:1000001}],['huge catalog',{catalogEntries:10000001}]
]){test('reject report input '+label,()=>assert.throws(()=>report({...baseline(),...override}),/LATENCY_REPORT_INPUT/))}
test('do not accept synthetic overall cold/warm statement',()=>{const r=report(baseline());assert.equal(r.coldDefinition.includes('os_file_cache_not_cleared'),true);assert.equal(r.warmDefinition.includes('previously_loaded'),true)});
test('report supports cold higher than warm',()=>{const r=report(baseline());assert(r.cold.p95Ms>r.warm.p95Ms)});
test('report supports warm higher than cold without faking improvement',()=>{const b=baseline();b.coldMs=[0,0,0];b.warmMs=[2,3,4];const r=report(b);assert.equal(r.warm.p95Ms,4);assert.equal(r.cold.p95Ms,0)});
test('benchmark script does not export raw vector fields',()=>{
 const p=path.join(__dirname,'M0138_LATENCY_BENCH.cjs');
 if(fs.existsSync(p)){const s=fs.readFileSync(p,'utf8');assert(s.includes('rawVectorsIncluded:false'));assert(s.includes('real'));}
});
