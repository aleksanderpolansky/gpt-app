/* Offline behavioral tests. No credentials, network or database writes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = process.cwd();
const ids = { user:'11111111-1111-4111-8111-111111111111', actor:'22222222-2222-4222-8222-222222222222',
  event:'33333333-3333-4333-8333-333333333333', template:'44444444-4444-4444-8444-444444444444',
  parameter:'55555555-5555-4555-8555-555555555555', target:'66666666-6666-4666-8666-666666666666',
  state:'77777777-7777-4777-8777-777777777777', profile:'88888888-8888-4888-8888-888888888888' };
let tables, rpcCalls, operations, snapshotReads, failUpdate;
function contains(a,b){return Object.entries(b).every(([k,v])=>v && typeof v==='object' ? contains(a?.[k]||{},v) : a?.[k]===v)}
class Query {
  constructor(table) { this.table=table; this.filters=[]; this.orders=[]; this.limitN=Infinity; }
  select() { return this; }
  contains(k,v) { this.filters.push(r=>contains(r[k]||{},v));return this; }
  insert(v) { (tables[this.table] ||= []).push(v);return this; }
  eq(k,v) { this.filters.push(r=>r[k]===v); return this; }
  is(k,v) { return this.eq(k,v); }
  in(k,v) { this.filters.push(r=>v.includes(r[k])); return this; }
  lte(k,v) { this.filters.push(r=>r[k]!=null && r[k]<=v); return this; }
  order(k,o) { this.orders.push([k,o.ascending]); return this; }
  limit(n) { this.limitN=n; return this; }
  update(v) { this.patch=v; return this; }
  then(a,b) { return Promise.resolve(this.run(false)).then(a,b); }
  maybeSingle() { return Promise.resolve(this.run(true)); }
  run(single) {
    if (this.table==='activity_object_facts') snapshotReads++;
    let rows=(tables[this.table]||[]).filter(r=>this.filters.every(f=>f(r)));
    if (this.patch && failUpdate===this.table) return {data:null,error:{message:'forced update failure'}};
    if (this.patch) { rows.forEach(r=>Object.assign(r,this.patch)); return {data:null,error:null}; }
    rows.sort((a,b)=>{for(const [k,asc] of this.orders){ if(a[k]===b[k])continue; return (a[k]<b[k]?-1:1)*(asc?1:-1);}return 0;});
    rows=rows.slice(0,this.limitN);
    if(single && rows.length>1) return {data:null,error:{message:'multiple rows'}};
    return {data: single ? rows[0]||null : rows,error:null};
  }
}
const db={from(t){return new Query(t)},async rpc(name,p){
  assert.equal(name,'attach_global_observation_facts_gsr1_v1');
  rpcCalls.push(p);
  const prior=operations.get(p.p_idempotency_key);
  if(prior){assert.equal(prior.hash,p.p_request_hash);return {data:{...prior.data,writeStatus:'idempotent_replay'},error:null}}
  const data={writeStatus:'written',rows:p.p_facts.map((r,i)=>({factId:`fact-${i}`,measureId:`measure-${i}`}))};
  operations.set(p.p_idempotency_key,{hash:p.p_request_hash,data});return {data,error:null};
}};
const cache=new Map();
function load(file){
  file=path.resolve(file); if(cache.has(file)) return cache.get(file).exports;
  const source=fs.readFileSync(file,'utf8');
  const out=ts.transpileModule(source,{fileName:file,reportDiagnostics:true,compilerOptions:{esModuleInterop:true,target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}});
  const errors=(out.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
  assert.equal(errors.length,0,errors.map(d=>ts.flattenDiagnosticMessageText(d.messageText,'\n')).join('\n'));
  const mod={exports:{}};cache.set(file,mod);
  const localRequire=(specifier)=>{
    if(specifier.endsWith('lib/supabase'))return {supabase:db};
    if(specifier.endsWith('/system-typical-activity-materialization.server'))return {async materializeCuratorSystemTypicalActivityV1(){
      tables.activity_templates=[{id:ids.template,default_metadata_json:{curatorSystemMaterializationV1:{fingerprint:'curator-fingerprint'}}}];
      return {templateId:ids.template,profileId:ids.profile,versionNo:1,routingContractCode:'parameter_registry_v2',fingerprint:'curator-fingerprint',replayed:false,profileVersionCreated:true};
    }};
    if(specifier.startsWith('.'))return load(path.resolve(path.dirname(file),specifier)+'.ts');
    if(specifier.startsWith('@/'))return load(path.join(root,'src',specifier.slice(2))+'.ts');
    return require(specifier);
  };
  vm.runInThisContext(`(function(require,module,exports){${out.outputText}\n})`,{filename:file})(localRequire,mod,mod.exports);
  return mod.exports;
}
function setup(mode='direct_or_snapshot',explicit=null){
  rpcCalls=[];operations=new Map();snapshotReads=0;failUpdate=null;
  const measurements=explicit===null?[]:[{parameterCode:'mass',unit:'gram',valueNumeric:explicit,valueText:null,rawFragment:'protein',confidence:1,approximate:false}];
  const binding={parameterDefinitionId:ids.parameter,valueObjectId:ids.target};
  if(mode && mode!=='direct')binding.sourceResolution={mode,snapshotValueObjectId:ids.state,multiplier:1};
  tables={
    raw_activity_signals:[{id:'signal',user_id:ids.user,source_type:'manual_chat',output_event_id:ids.event,normalized_preview_json:{basicIntakeAnalysisV1:{contract:'ARCTOR_BASIC_ACTIVITY_INTAKE_ANALYSIS_V1',status:'completed',activityEventId:ids.event,typicalActivitySearchStatus:'completed',templateCandidates:[{templateId:ids.template,confidence:1}],measurements}}}],
    activity_events:[{id:ids.event,user_id:ids.user,acting_as_actor_id:ids.actor,input_text:'protein',started_at:'2026-09-22T10:00:00Z',activity_role_code:'completed'}],
    activity_template_impact_profiles_v1:[{id:ids.profile,template_id:ids.template,version_no:1,status:'active',routing_contract_code:'parameter_registry_v2',metadata_json:mode?{sourceValueBindingsV1:[binding]}:{}}],
    activity_template_profile_parameters_v2:[{profile_id:ids.profile,parameter_definition_id:ids.parameter}],
    activity_template_profile_object_links_v1:[{profile_id:ids.profile,target_value_object_id:ids.target}],
    value_object_parameter_definitions:[{id:ids.parameter,parameter_code:'mass',value_type_code:'numeric',scope_code:'system',status:'active',canonical_unit_code:'kilogram'}],
    value_object_parameter_assignments:[ids.target,ids.state].map((id,i)=>({id:`assignment-${i}`,value_object_id:id,parameter_definition_id:ids.parameter,scope_code:'system',assignment_scope_code:'system',status:'active',owner_user_id:null,owner_actor_id:null,created_by_actor_id:null})),
    value_objects:[ids.target,ids.state].map(id=>({id,canonical_key:id===ids.target?'protein_intake':'protein_serving',scope_code:'global',origin_type_code:'system_model',ontology_node_role_code:'leaf',status:'active',root_value_object_id:id===ids.state?'6ba4ecf1-8a05-5eaa-b280-4eb7aff2a42a':'other'})),
    activity_object_facts:[{id:'snapshot-1',user_id:ids.user,acting_as_actor_id:ids.actor,fact_role_code:'snapshot',fact_status:'confirmed',value_object_id:ids.state,parameter_definition_id:ids.parameter,value_numeric:35,unit:'gram',effective_at:'2026-09-21T10:00:00Z',created_at:'2026-09-21T10:00:00Z',valid_from:null,valid_to:null,confidence:0.9}]
  };
}
const {materializeBasicIntakeSourceFactsE03V1:run}=load(path.join(root,'src/lib/activity/activity-intake-source-fact-materializer.server.ts'));
const {evaluate}=load(path.join(root,'src/lib/reality-curator/formula-expression-evaluator.ts'));
const {parseSourceResolution}=load(path.join(root,'src/lib/activity/source-snapshot-resolution.ts'));
const args={appUserId:ids.user,activityEventId:ids.event};
let passed=0;
async function test(name,fn){await fn();passed++;console.log(`PASS ${name}`)}
(async()=>{
 await test('client always renders confirmation action for completed analysis',async()=>{const source=fs.readFileSync(path.join(root,'src/components/activity/activity-basic-intake-analysis-card.tsx'),'utf8');assert.match(source,/disabled=\{materializingFacts \|\| !canMaterializeFacts\}/);assert.match(source,/preflightInactiveReason/);assert.doesNotMatch(source,/searchCompleted && candidates\.length === 1 && measurements\.length > 0 \? \(/)});
 await test('client readiness comes from server preflight instead of measurement count',async()=>{const source=fs.readFileSync(path.join(root,'src/components/activity/activity-basic-intake-analysis-card.tsx'),'utf8');assert.match(source,/materialize-source-facts\?\$\{params\.toString\(\)\}/);assert.match(source,/preflight\?\.eligible === true/);assert.doesNotMatch(source,/const canMaterializeFacts =\s*searchCompleted[\s\S]{0,180}measurements\.length > 0/)});
 await test('route exposes read-only GET preflight and POST commit',async()=>{const source=fs.readFileSync(path.join(root,'src/app/api/activity/intake-analysis/materialize-source-facts/route.ts'),'utf8');assert.match(source,/export async function GET\(request: Request\)/);assert.match(source,/preflightOnly: true/);assert.match(source,/export async function POST\(request: Request\)/);assert.match(source,/reasonCode: reasonCode\(message\)/)});
 await test('preflight allows snapshot fallback without writes',async()=>{setup();const result=await run({...args,preflightOnly:true});assert.equal(result.status,'eligible');assert.equal(result.eligible,true);assert.equal(result.factsPlanned,1);assert.equal(rpcCalls.length,0);assert.equal(snapshotReads,1)});
 await test('preflight explicit value wins without snapshot read or writes',async()=>{setup('direct_or_snapshot',20);const result=await run({...args,preflightOnly:true});assert.equal(result.eligible,true);assert.equal(result.factsPlanned,1);assert.equal(rpcCalls.length,0);assert.equal(snapshotReads,0)});
 await test('preflight blocks when required snapshot is missing',async()=>{setup();tables.activity_object_facts=[];await assert.rejects(()=>run({...args,preflightOnly:true}),/SOURCE_SNAPSHOT_NOT_FOUND/);assert.equal(rpcCalls.length,0)});
 await test('preflight blocks direct binding with missing explicit value',async()=>{setup('direct');await assert.rejects(()=>run({...args,preflightOnly:true}),/E03_NO_PROFILE_MAPPED_MEASUREMENTS/);assert.equal(rpcCalls.length,0)});
 await test('snapshot fallback: missing explicit value, gram retained, provenance',async()=>{setup();await run(args);const r=rpcCalls[0].p_facts[0];assert.equal(r.valueNumeric,35);assert.equal(r.unit,'gram');assert.equal(r.sourceType,'derived_calculation');assert.equal(r.valueOriginCode,'deterministic_calculation');assert.equal(r.sourceReliabilityCode,'deterministic');assert.equal(r.sourceSnapshotJson.sourceFromSnapshotV1.snapshotFactId,'snapshot-1')});
 await test('explicit value wins over snapshot',async()=>{setup('direct_or_snapshot',20);await run(args);assert.equal(rpcCalls[0].p_facts[0].valueNumeric,20);assert.equal(snapshotReads,0)});
 await test('snapshot-only ignores explicit and applies coefficient',async()=>{setup('snapshot_only',20);tables.activity_template_impact_profiles_v1[0].metadata_json.sourceValueBindingsV1[0].sourceResolution.multiplier=2;await run(args);assert.equal(rpcCalls[0].p_facts[0].valueNumeric,70)});
 await test('zero is an explicit value',async()=>{setup('direct_or_snapshot',0);await run(args);assert.equal(rpcCalls[0].p_facts[0].valueNumeric,0);assert.equal(snapshotReads,0)});
 await test('missing snapshot blocks all writes',async()=>{setup();tables.activity_object_facts=[];await assert.rejects(()=>run(args),/SOURCE_SNAPSHOT_NOT_FOUND/);assert.equal(rpcCalls.length,0)});
 await test('other user, actor, future and unconfirmed states excluded',async()=>{setup();const base=tables.activity_object_facts[0];tables.activity_object_facts.push({...base,id:'other-user',user_id:'other',value_numeric:999,effective_at:'2026-09-22T09:00:00Z'},{...base,id:'other-actor',acting_as_actor_id:'other',value_numeric:999,effective_at:'2026-09-22T09:00:00Z'},{...base,id:'future',value_numeric:999,effective_at:'2026-09-23T09:00:00Z'},{...base,id:'unconfirmed',fact_status:'proposed',value_numeric:999,effective_at:'2026-09-22T09:00:00Z'});await run(args);assert.equal(rpcCalls[0].p_facts[0].valueNumeric,35)});
 await test('expired state blocks writes',async()=>{setup();tables.activity_object_facts[0].valid_to='2026-09-22T09:00:00Z';await assert.rejects(()=>run(args),/EXPIRED/);assert.equal(rpcCalls.length,0)});
 await test('replay pins original snapshot after a new state',async()=>{setup();await run(args);const initialReads=snapshotReads;tables.activity_object_facts.push({...tables.activity_object_facts[0],id:'snapshot-2',value_numeric:40,effective_at:'2026-09-22T09:00:00Z'});const result=await run(args);assert.equal(result.status,'idempotent_replay');assert.equal(operations.size,1);assert.equal(snapshotReads,initialReads);assert.equal(rpcCalls[1].p_facts[0].valueNumeric,35)});
 await test('legacy direct profile remains supported',async()=>{setup(null,18);await run(args);assert.equal(rpcCalls[0].p_facts[0].sourceType,'ai_extraction');assert.equal(rpcCalls[0].p_facts[0].valueNumeric,18)});
 await test('direct without value never invents a zero',async()=>{setup('direct');await assert.rejects(()=>run(args),/NO_PROFILE_MAPPED/);assert.equal(rpcCalls.length,0)});
 await test('future activity produces proposed fact',async()=>{setup();tables.activity_events[0].activity_role_code='planned';await run(args);assert.equal(rpcCalls[0].p_facts[0].factStatus,'proposed')});
 await test('invalid coefficient and numeric overflow fail closed',async()=>{assert.throws(()=>parseSourceResolution({mode:'snapshot_only',snapshotValueObjectId:ids.state,multiplier:Infinity}),/MULTIPLIER/);setup();tables.activity_template_impact_profiles_v1[0].metadata_json.sourceValueBindingsV1[0].sourceResolution.multiplier=Number.MAX_VALUE;await assert.rejects(()=>run(args),/RESULT_NOT_FINITE/);assert.equal(rpcCalls.length,0)});
 await test('shared evaluator preserves arithmetic and conditional behavior',async()=>{const lit=value=>({op:'literal',value});assert.equal(evaluate({op:'divide',args:[{op:'multiply',args:[lit(35),lit(2)]},lit(10)]},{}),7);assert.equal(evaluate({op:'if',args:[lit(true),lit(4),lit(9)]},{}),4);assert.throws(()=>evaluate({op:'divide',args:[lit(1),lit(0)]},{}),/ZERO/)});
 await test('invalid binding cannot route to unselected object',async()=>{setup();tables.activity_template_impact_profiles_v1[0].metadata_json.sourceValueBindingsV1[0].valueObjectId='unknown';await assert.rejects(()=>run(args),/PROFILE_MISMATCH/);assert.equal(rpcCalls.length,0)});
 const {authorDirectSystemTypicalActivityV1:author}=load(path.join(root,'src/lib/reality-curator/direct-system-typical-activity-authoring.server.ts'));
 const authorInput={requestId:'99999999-9999-4999-8999-999999999999',curator:{curatorAppUserId:ids.user,curatorActorId:ids.actor,curatorAdminId:ids.user,curatorRole:'admin'},locale:'ru',title:'Протеин',titleEn:'Protein',description:'',descriptionEn:'',parameterDefinitionIds:[ids.parameter],mappings:[{parameterDefinitionId:ids.parameter,valueObjectId:ids.target,sourceResolution:{mode:'direct_or_snapshot',snapshotValueObjectId:ids.state,multiplier:2}}]};
 await test('authoring persists settings and retries idempotently',async()=>{setup();await author(authorInput);assert.deepEqual(tables.activity_template_impact_profiles_v1[0].metadata_json.sourceValueBindingsV1,authorInput.mappings);const again=await author(authorInput);assert.equal(again.replayed,true);await assert.rejects(()=>author({...authorInput,mappings:[{...authorInput.mappings[0],sourceResolution:{...authorInput.mappings[0].sourceResolution,multiplier:3}}]}),/FINGERPRINT_CONFLICT/)});
 await test('failed settings write cannot mark authoring complete',async()=>{setup();failUpdate='activity_template_impact_profiles_v1';await assert.rejects(()=>author(authorInput),/PROFILE_METADATA_WRITE_FAILED/);assert.equal(tables.activity_templates[0].default_metadata_json.directSystemAuthoringV1,undefined)});
 console.log(`VALIDATOR=PASS_${passed}_${passed}`);
})().catch(error=>{console.error(error);process.exitCode=1});
