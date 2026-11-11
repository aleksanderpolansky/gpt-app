'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const ts=require(require.resolve('typescript',{paths:[process.cwd(),'/opt/nvm/versions/node/v22.16.0/lib/node_modules']}));
const file=process.env.ARCTOR_M0132_TEST_MODULE_PATH||path.join(process.cwd(),'src/lib/ontology-research/indexLifecycleV1.ts');
const out=ts.transpileModule(fs.readFileSync(file,'utf8'),{reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});
assert.equal(out.diagnostics?.length||0,0);const mod=new Module(file,module);mod.filename=file;mod.paths=Module._nodeModulePaths(path.dirname(file));mod._compile(out.outputText,file);
const H=mod.exports;
const ID='00000001-0000-4000-8000-000000000001',ACTOR='00000002-0000-4000-8000-000000000002';
const A='A'.repeat(64),B='B'.repeat(64),C='C'.repeat(64),LOCALES=['en','pl','es','de','cs','uk','ru'];
function source(scope={kind:'global_system',ownerActorId:null},units=[{onId:ID,locale:'ru',contentSha256:A}]){
 return {scope,modelId:'text-embedding-3-small',modelVersion:'1',preprocessingVersion:'v1',units};}
function start(s=source()){const r=H.createIndexLifecycleV1('ON_search_1',s);assert.equal(r.ok,true,JSON.stringify(r));return r.record;}
function ok(r,e){const x=H.transitionIndexLifecycleV1(r,e);assert.equal(x.ok,true,JSON.stringify(x));assert.equal(x.writesPerformed,false);assert.equal(x.paidCallsPerformed,false);assert.equal(H.validateIndexLifecycleV1(x.record),true);return x.record;}
function bad(r,e,reason){const x=H.transitionIndexLifecycleV1(r,e);assert.equal(x.ok,false,JSON.stringify(x));assert.equal(x.reason,reason);assert.equal(x.writesPerformed,false);return x;}
function build(s=start()){return ok(s,{kind:'BUILD_STARTED'});}
function fresh(s=start()){const b=build(s);return ok(b,{kind:'BUILD_SUCCEEDED',generation:b.index_generation,source_hash:b.source_hash});}
const failed=(s=start())=>{const b=build(s);return ok(b,{kind:'BUILD_FAILED',generation:b.index_generation,source_hash:b.source_hash,failure_code:'TEST_FAILURE'});};
test('contract',()=>assert.equal(H.INDEX_LIFECYCLE_CONTRACT_V1,'ARCTOR_ARI03_INDEX_LIFECYCLE_V1'));
test('all exported functions exist',()=>{for(const k of ['calculateIndexSourceHashV1','createIndexLifecycleV1','validateIndexLifecycleV1','transitionIndexLifecycleV1','describeIndexLifecycleV1'])assert.equal(typeof H[k],'function')});
test('initial index stale generation zero',()=>{const r=start();assert.equal(r.status,'stale');assert.equal(r.index_generation,0);assert.equal(r.published_generation,0);assert.equal(r.published_source_hash,null)});
test('fingerprint deterministic',()=>assert.equal(H.calculateIndexSourceHashV1(source()).source_hash,H.calculateIndexSourceHashV1(source()).source_hash));
test('hash from fixed content change',()=>{const s=source(),t=source();t.units[0].contentSha256=B;assert.notEqual(H.calculateIndexSourceHashV1(s).source_hash,H.calculateIndexSourceHashV1(t).source_hash)});
test('hash stable on input order',()=>{const a={onId:ID,locale:'ru',contentSha256:A},b={onId:ID,locale:'en',contentSha256:B};assert.equal(H.calculateIndexSourceHashV1(source(undefined,[a,b])).source_hash,H.calculateIndexSourceHashV1(source(undefined,[b,a])).source_hash)});
test('owner changes source hash',()=>assert.notEqual(H.calculateIndexSourceHashV1(source()).source_hash,H.calculateIndexSourceHashV1(source({kind:'owner_private',ownerActorId:ACTOR})).source_hash));
test('model identity changes hash',()=>{const a=source(),b=source();b.modelId='text-embedding-3-large';assert.notEqual(H.calculateIndexSourceHashV1(a).source_hash,H.calculateIndexSourceHashV1(b).source_hash)});
test('empty catalog permitted',()=>{const r=H.calculateIndexSourceHashV1(source(undefined,[]));assert.equal(r.ok,true);assert.equal(r.unit_count,0)});
test('duplicate locale and ON rejected',()=>{const v=source().units[0];assert.equal(H.calculateIndexSourceHashV1(source(undefined,[v,{...v}])).ok,false)});
test('same ON different locale permitted',()=>{const v=source().units[0];assert.equal(H.calculateIndexSourceHashV1(source(undefined,[v,{...v,locale:'pl'}])).ok,true)});
test('hash uppercase',()=>assert.match(start().source_hash,/^[0-9A-F]{64}$/));
test('invalid index id rejected',()=>assert.deepEqual(H.createIndexLifecycleV1('../evil',source()),{ok:false,reason:'INVALID_INDEX_ID'}));
test('null source rejected',()=>assert.deepEqual(H.calculateIndexSourceHashV1(null),{ok:false,reason:'INVALID_SOURCE'}));
test('build increments generation',()=>{const r=build();assert.equal(r.index_generation,1);assert.equal(r.building_generation,1);assert.equal(r.status,'building')});
test('successful build marks fresh and publishes exact hash',()=>{const r=fresh();assert.equal(r.status,'fresh');assert.equal(r.published_source_hash,r.source_hash);assert.equal(r.published_generation,1)});
test('failed build retains no published hash',()=>{const r=failed();assert.equal(r.status,'failed');assert.equal(r.published_generation,0);assert.equal(r.published_source_hash,null)});
test('failed rebuild retains prior published hash',()=>{const old=fresh(),changed=ok(old,{kind:'SOURCE_CHANGED',source_hash:B}),r=failed(changed);assert.equal(r.published_source_hash,old.source_hash);assert.equal(r.published_generation,1)});
test('changed source is stale',()=>{const r=ok(fresh(),{kind:'SOURCE_CHANGED',source_hash:B});assert.equal(r.status,'stale');assert.equal(r.source_hash,B)});
test('unchanged source is a non-mutating noop',()=>{const old=fresh(),x=H.transitionIndexLifecycleV1(old,{kind:'SOURCE_CHANGED',source_hash:old.source_hash});assert.equal(x.changed,false);assert.deepEqual(x.record,old);assert.notEqual(x.record,old)});
test('cannot start while fresh',()=>bad(fresh(),{kind:'BUILD_STARTED'},'INVALID_TRANSITION'));
test('cannot start while building',()=>bad(build(),{kind:'BUILD_STARTED'},'INVALID_TRANSITION'));
test('failed build retry increments generation',()=>assert.equal(build(failed()).index_generation,2));
test('stale completion ignored after source change',()=>{const r=build(),s=ok(r,{kind:'SOURCE_CHANGED',source_hash:B});bad(s,{kind:'BUILD_SUCCEEDED',generation:1,source_hash:r.source_hash},'STALE_COMPLETION')});
test('wrong generation ignored',()=>{const r=build();bad(r,{kind:'BUILD_SUCCEEDED',generation:2,source_hash:r.source_hash},'STALE_COMPLETION')});
test('wrong source hash ignored',()=>{const r=build();bad(r,{kind:'BUILD_SUCCEEDED',generation:1,source_hash:B},'STALE_COMPLETION')});
test('bad failure code ignored',()=>{const r=build();bad(r,{kind:'BUILD_FAILED',generation:1,source_hash:r.source_hash,failure_code:'space code'},'INVALID_EVENT')});
test('generation exhaustion prevents future build',()=>{const r=start();r.index_generation=Number.MAX_SAFE_INTEGER;bad(r,{kind:'BUILD_STARTED'},'GENERATION_EXHAUSTED')});
test('valid fresh diag says eligible not authorized',()=>{const d=H.describeIndexLifecycleV1(fresh()).diagnostic;assert.equal(d.vector_path_eligible,true);assert.equal(d.databaseVerified,false);assert.equal(d.aclVerified,false)});
test('stale diag demands lexical-only',()=>{const d=H.describeIndexLifecycleV1(start()).diagnostic;assert.equal(d.fallback,'lexical_only');assert.equal(d.needs_rebuild,true)});
test('failed diag demands lexical-only',()=>assert.equal(H.describeIndexLifecycleV1(failed()).diagnostic.fallback,'lexical_only'));
test('building diag has pending generation',()=>assert.equal(H.describeIndexLifecycleV1(build()).diagnostic.pending_generation,1));
test('missing diag record is rejected',()=>assert.deepEqual(H.describeIndexLifecycleV1(null),{ok:false,reason:'INVALID_RECORD'}));
test('record cannot be mutated by transition',()=>{const r=start();const snap=JSON.stringify(r);ok(r,{kind:'BUILD_STARTED'});assert.equal(JSON.stringify(r),snap)});
test('late failed notification ignored',()=>{const r=fresh();bad(r,{kind:'BUILD_FAILED',generation:1,source_hash:r.source_hash,failure_code:'LATE'},'STALE_COMPLETION')});
test('unrecognized event ignored',()=>bad(start(),{kind:'PUBLISH_TO_SUPABASE'},'INVALID_EVENT'));
test('bad hash ignored',()=>bad(start(),{kind:'SOURCE_CHANGED',source_hash:'bad'},'INVALID_EVENT'));
for(const locale of LOCALES){
 test(`locale ${locale} produces valid source hash`,()=>{const s=source(undefined,[{onId:ID,locale,contentSha256:A}]);assert.equal(H.calculateIndexSourceHashV1(s).ok,true)});
 test(`locale ${locale} can reach fresh state`,()=>{const s=source(undefined,[{onId:ID,locale,contentSha256:A}]);assert.equal(fresh(start(s)).status,'fresh')});
 test(`locale ${locale} changes unit hash predictably`,()=>{const s=source(undefined,[{onId:ID,locale,contentSha256:A}]);const t=source(undefined,[{onId:ID,locale,contentSha256:B}]);assert.notEqual(H.calculateIndexSourceHashV1(s).source_hash,H.calculateIndexSourceHashV1(t).source_hash)});
 test(`locale ${locale} can't publish stale build`,()=>{const s=source(undefined,[{onId:ID,locale,contentSha256:A}]);const b=build(start(s)),stale=ok(b,{kind:'SOURCE_CHANGED',source_hash:B});bad(stale,{kind:'BUILD_SUCCEEDED',generation:1,source_hash:b.source_hash},'STALE_COMPLETION')});
}
for(const [name,mutate] of [
 ['invalid contract',r=>r.contract='other'],['invalid index id',r=>r.index_id='../../secret'],
 ['invalid scope',r=>r.scope={kind:'owner_private',ownerActorId:null}],
 ['invalid model',r=>r.model_id=' '],['negative generation',r=>r.index_generation=-1],
 ['invalid source hash',r=>r.source_hash='x'],['invalid status',r=>r.status='ready'],
 ['published greater than generation',r=>r.published_generation=2],
 ['published hash with zero generation',r=>r.published_source_hash=A],
 ['published generation without hash',r=>{r.published_generation=1;r.index_generation=1}],
 ['building generation with stale status',r=>r.building_generation=1],
 ['building hash without generation',r=>r.building_source_hash=A],
 ['failed status missing failure code',r=>r.status='failed'],
 ['fresh status without published generation',r=>r.status='fresh'],
 ['building status without building generation',r=>r.status='building'],
 ['failure code on stale',r=>r.last_failure_code='ERR']
]){test(`reject malformed record ${name}`,()=>{const r=start();mutate(r);assert.equal(H.validateIndexLifecycleV1(r),false);bad(r,{kind:'BUILD_STARTED'},'INVALID_RECORD')})}
for(const [name,mutate] of [
 ['bad model name',s=>s.modelId='bad model'],['missing model version',s=>s.modelVersion=''],
 ['missing preprocessing',s=>s.preprocessingVersion=''],['invalid scope',s=>s.scope={kind:'owner_private',ownerActorId:null}],
 ['bad UUID',s=>s.units[0].onId='other'],['unknown locale',s=>s.units[0].locale='xx'],
 ['lowercase sha',s=>s.units[0].contentSha256='a'.repeat(64)],
 ['no units array',s=>s.units={}]
]){test(`reject malformed source ${name}`,()=>{const s=source();mutate(s);assert.equal(H.calculateIndexSourceHashV1(s).ok,false)})}
