/** ARI-04.02.07 / M-0161: 100% offline, no Supabase, no API, no paid embedding calls. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const repo=process.env.ARCTOR_REPO??process.cwd();
const modulePath=process.env.ARCTOR_GRAPH_TS??path.join(repo,'src/lib/reality-core/graphIntegrityV1.ts');
const ts=createRequire(path.join(repo,'package.json'))('typescript');
const program=ts.createProgram([modulePath],{strict:true,target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,skipLibCheck:true,noEmit:true});
const errors=ts.getPreEmitDiagnostics(program).filter(d=>d.category===ts.DiagnosticCategory.Error);
assert.equal(errors.length,0,ts.formatDiagnostics(errors,{getCanonicalFileName:x=>x,getCurrentDirectory:()=>repo,getNewLine:()=> '\n'}));
const source=fs.readFileSync(modulePath,'utf8');
const js=ts.transpileModule(source,{fileName:modulePath,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}});
const exports={};vm.runInNewContext(js.outputText,{exports},{timeout:10000});
const preview=exports.previewOnTreeMoveImpactV1;
assert.equal(typeof preview,'function');
const root=(id='r')=>({id,parent_value_object_id:null,root_value_object_id:id,hierarchy_relation_code:null,scope_code:'global',ontology_node_role_code:'root',owner_user_id:null,owner_actor_id:null,facet_code:'DOMAIN',origin_type_code:'system_model',status:'active'});
const inter=(id,parent,rootId='r')=>({...root(rootId),id,parent_value_object_id:parent,root_value_object_id:rootId,hierarchy_relation_code:'is_a',ontology_node_role_code:'intermediate',facet_code:'ENTITY'});
const leaf=(id,parent,rootId='r')=>({...inter(id,parent,rootId),ontology_node_role_code:'leaf',hierarchy_relation_code:'part_of'});
const nodes=[root(),inter('a','r'),inter('b','r'),inter('c','a'),leaf('l1','c'),leaf('l2','a'),leaf('l3','b')];
const row=(domain,table,recordId,onIds)=>({domain,table,recordId,onIds});
const rows=[
 row('FACTS','activity_object_facts','f1',['l1']),
 row('FACTS','activity_fact_value_object_links','f2',['l2']),
 row('FACTS','activity_object_facts','f3',['l3']),
 row('SEARCH_INDEX','ari03_on_embeddings_v1','ec',['c']),
 row('SEARCH_INDEX','ari03_on_embeddings_v1','el1',['l1']),
 row('SEARCH_INDEX','ari03_on_embeddings_v1','el3',['l3']),
 row('RELATIONS','value_object_relations','rel1',['l1','l3']),
 row('RELATIONS','project_composition_relations','rel2',['l2','l3']),
 row('STANDARDS','value_object_target_standards','s1',['c']),
 row('STANDARDS','value_object_parameter_assignments','s2',['l1']),
 row('OTHER','project_contexts','p1',['l1']),
 row('OTHER','value_object_instances','vi1',['l3']),
];
const dep=(override={})=>({completeForScope:true,sourceVersion:'sql1-sql6-20261106-caller-attested',rows,...override});
const check=(override={})=>preview({nodes,moveNodeId:'c',proposedParentId:'b',dependencySnapshot:dep(),...override});
const group=(r,domain)=>r.dependencies.find(x=>x.domain===domain);
const asJSON=x=>JSON.stringify(x);
let count=0;
function test(name,fn){fn();count++;console.log(`PASS M0161 ${name}`);}
const baseline=check();
test('contract and readonly guarantees',()=>{assert.equal(baseline.contract,'ARCTOR_ARI04_M0161_ON_MOVE_IMPACT_V1');assert.equal(baseline.databaseWrites,0);assert.equal(baseline.approvalGranted,false);assert.equal(baseline.executionAuthorized,false);assert.equal(baseline.productionApiIntegrated,false);});
test('controlled review not authorization',()=>{assert.equal(baseline.decision,'REVIEW_REQUIRED');assert.equal(baseline.controlledTreeOperationRequired,true);assert.equal(baseline.baselineMoveDecision,'REQUIRES_CONTROLLED_TREE_OPERATION');});
test('before snapshot is original structural tree',()=>{assert.deepEqual(Array.from(baseline.originalSnapshot.find(x=>x.id==='c').structuralPathIds),['r','a','c']);assert.equal(baseline.originalSnapshot.find(x=>x.id==='c').parentValueObjectId,'a');});
test('after snapshot is hypothetical only',()=>{assert.deepEqual(Array.from(baseline.hypotheticalSnapshot.find(x=>x.id==='c').structuralPathIds),['r','b','c']);assert.equal(baseline.hypotheticalSnapshot.find(x=>x.id==='c').parentValueObjectId,'b');});
test('descendant after path follows destination',()=>{assert.deepEqual(Array.from(baseline.hypotheticalSnapshot.find(x=>x.id==='l1').structuralPathIds),['r','b','c','l1']);});
test('affected descendants count exact and sorted',()=>{assert.deepEqual(Array.from(baseline.affectedOnIds),['c','l1']);assert.equal(baseline.affectedOnCount,2);});
test('hypothetical snapshot preserves UUID identity',()=>{assert.deepEqual(Array.from(baseline.originalSnapshot,x=>x.id),Array.from(baseline.hypotheticalSnapshot,x=>x.id));});
test('only moved node direct parent pointer changes',()=>{assert.equal(baseline.parentPointersWouldChange,1);assert.equal(baseline.rootPointersWouldChange,0);});
test('both descendant paths change',()=>{assert.equal(baseline.structuralPathsChanged,2);assert.equal(baseline.search.pathDependentSearchReviewRequired,true);});
test('existing and hypothetical graphs valid',()=>{assert.equal(baseline.existingGraphIntegrityOk,true);assert.equal(baseline.hypotheticalGraphIntegrityOk,true);});
test('facts count only referenced moved subtree',()=>{assert.equal(group(baseline,'FACTS').affectedRecordCount,1);assert.deepEqual(Array.from(group(baseline,'FACTS').recordReferences,x=>x.recordId),['f1']);});
test('cross subtree relation counted once',()=>{assert.equal(group(baseline,'RELATIONS').affectedRecordCount,1);assert.equal(group(baseline,'RELATIONS').recordReferences[0].recordId,'rel1');});
test('standards count both direct and descendant',()=>{assert.equal(group(baseline,'STANDARDS').affectedRecordCount,2);});
test('search index count from supplied rows, not from 740 constant',()=>{assert.equal(group(baseline,'SEARCH_INDEX').affectedRecordCount,2);assert.equal(baseline.search.affectedIndexedRowsFromSuppliedSnapshot,2);});
test('other dependencies remain visible rather than silently omitted',()=>{assert.equal(group(baseline,'OTHER').affectedRecordCount,1);assert.equal(group(baseline,'OTHER').requiredAction,'MANUAL_DEPENDENCY_CLASSIFICATION_REQUIRED_NO_AUTOMATIC_EDIT');});
test('records unrelated to moved subtree excluded',()=>{assert.equal(group(baseline,'RELATIONS').recordReferences.some(x=>x.recordId==='rel2'),false);});
test('stable tables list and four required domains',()=>{assert.deepEqual(Array.from(baseline.dependencies,x=>x.domain),['FACTS','SEARCH_INDEX','RELATIONS','STANDARDS','OTHER']);});
test('all impacts explicitly require review action',()=>{assert.ok(baseline.dependencies.every(x=>typeof x.requiredAction==='string'&&x.requiredAction.length>8));});
test('snapshot data are caller-attested not independent DB proof',()=>{assert.equal(baseline.dependenciesVerifiedAgainstLiveDatabase,false);assert.equal(baseline.dependencySnapshotSourceVersion,'sql1-sql6-20261106-caller-attested');});
test('reparenting alone cannot mark embedding text stale',()=>{assert.equal(baseline.search.sourceTextChangedByThisMove,false);assert.equal(baseline.search.embeddingRebuildRequiredByReparentingAlone,false);assert.equal(baseline.search.vectorSourceContract,'ARI03_CONTENT_V1');assert.deepEqual(Array.from(baseline.search.embeddedFields),['title','description','canonical_key']);});
test('no nodes or dependency rows mutated',()=>{const ns=JSON.stringify(nodes),ds=JSON.stringify(rows);check();assert.equal(JSON.stringify(nodes),ns);assert.equal(JSON.stringify(rows),ds);});
test('output deterministic for same input',()=>{assert.equal(asJSON(check()),asJSON(check()));});
test('unchanged parent is NO_CHANGE',()=>{const q=check({proposedParentId:'a'});assert.equal(q.decision,'NO_CHANGE');assert.equal(q.affectedOnCount,0);assert.equal(q.databaseWrites,0);});
test('missing target fails closed',()=>{const q=check({moveNodeId:'not-present'});assert.equal(q.decision,'BLOCKED');assert.ok(q.blockingReasons.includes('TARGET_NOT_IN_ARI_SNAPSHOT'));});
test('missing destination fails closed',()=>{const q=check({proposedParentId:'not-present'});assert.equal(q.decision,'BLOCKED');});
test('root movement blocked',()=>{const q=check({moveNodeId:'r'});assert.equal(q.decision,'BLOCKED');assert.ok(q.blockingReasons.includes('ROOT_MOVE_NOT_PERMITTED'));});
test('root destination cannot be null for nonroot',()=>{const q=check({proposedParentId:null});assert.equal(q.decision,'BLOCKED');});
test('move under leaf blocked',()=>{const q=check({proposedParentId:'l3'});assert.equal(q.decision,'BLOCKED');assert.ok(q.blockingReasons.some(x=>x.includes('BLOCKED_INVALID_PARENT_ROLE')));});
test('move under own descendant blocked',()=>{const q=check({proposedParentId:'l1'});assert.equal(q.decision,'BLOCKED');});
test('cycle by moving intermediate under descendant blocked',()=>{const q=check({moveNodeId:'a',proposedParentId:'c'});assert.equal(q.decision,'BLOCKED');assert.ok(q.blockingReasons.some(x=>x.includes('BLOCKED_CYCLE')));});
test('cross root move blocked by frozen M0157 policy',()=>{const ns=[...nodes,root('r2'),inter('z','r2','r2')];const q=check({nodes:ns,proposedParentId:'z'});assert.equal(q.decision,'BLOCKED');assert.ok(q.blockingReasons.some(x=>x.includes('BLOCKED_ROOT_POINTER_CHANGE')));assert.equal(q.approvalGranted,false);});
test('draft destination blocked before hypothetical move',()=>{const ns=nodes.map(n=>n.id==='b'?{...n,status:'draft'}:n).map(n=>n.id==='l3'?{...n,status:'draft'}:n);const q=check({nodes:ns});assert.equal(q.decision,'BLOCKED');assert.ok(q.blockingReasons.includes('TARGET_OR_PROPOSED_PARENT_NOT_ACTIVE'));});
test('draft target blocked',()=>{const ns=nodes.map(n=>n.id==='c'||n.id==='l1'?{...n,status:'draft'}:n);const q=check({nodes:ns});assert.equal(q.decision,'BLOCKED');});
test('malformed cycle in existing graph blocked without repair',()=>{const ns=nodes.map(n=>n.id==='a'?{...n,parent_value_object_id:'c'}:n);const q=check({nodes:ns});assert.equal(q.decision,'BLOCKED');assert.equal(q.repairProposalRequired,true);assert.equal(q.hypotheticalSnapshot.length,0);});
test('orphan in existing tree blocked',()=>{const ns=nodes.map(n=>n.id==='l2'?{...n,parent_value_object_id:'missing'}:n);const q=check({nodes:ns});assert.equal(q.decision,'BLOCKED');assert.equal(q.existingGraphIntegrityOk,false);});
test('duplicate structural node ID blocked',()=>{const q=check({nodes:[...nodes,leaf('l1','c')]});assert.equal(q.decision,'BLOCKED');assert.equal(q.affectedOnCount,0);});
test('legacy scope-null commercial node untouched and excluded',()=>{const legacy={...leaf('legacy','a'),scope_code:null,ontology_node_role_code:null};const q=check({nodes:[...nodes,legacy]});assert.equal(q.decision,'REVIEW_REQUIRED');assert.equal(q.affectedOnIds.includes('legacy'),false);});
test('actor owned leaf under PP2 global intermediate can be previewed',()=>{const actor={...leaf('owned','a'),scope_code:'actor',owner_user_id:'user',owner_actor_id:'actor',root_value_object_id:'r',status:'active'};const q=check({nodes:[...nodes,actor],moveNodeId:'owned',proposedParentId:'b'});assert.equal(q.decision,'REVIEW_REQUIRED',JSON.stringify(q.blockingReasons));assert.deepEqual(Array.from(q.affectedOnIds),['owned']);});
test('invalid owner mismatch blocks without altering guard',()=>{const actor={...leaf('owned','a'),scope_code:'actor',owner_user_id:'user',owner_actor_id:'actor',root_value_object_id:'r',status:'active'};const otherRoot={...root('ar'),scope_code:'actor',owner_user_id:'other',owner_actor_id:'other'};const otherInter={...inter('ai','ar','ar'),scope_code:'actor',owner_user_id:'other',owner_actor_id:'other'};const q=check({nodes:[...nodes,actor,otherRoot,otherInter],moveNodeId:'owned',proposedParentId:'ai'});assert.equal(q.decision,'BLOCKED');assert.ok(q.blockingReasons.some(x=>x.includes('BLOCKED_OWNER_SCOPE')));});
test('complete dependency snapshot required',()=>{const q=check({dependencySnapshot:dep({completeForScope:false})});assert.equal(q.decision,'BLOCKED');assert.ok(q.blockingReasons.includes('INCOMPLETE_OR_INVALID_DEPENDENCY_SNAPSHOT'));});
test('version string required',()=>{const q=check({dependencySnapshot:dep({sourceVersion:'bad version spaces'})});assert.equal(q.decision,'BLOCKED');});
test('unknown dependency table fails closed',()=>{const q=check({dependencySnapshot:dep({rows:[row('FACTS','unknown_table','x',['c'])]})});assert.equal(q.decision,'BLOCKED');assert.ok(q.blockingReasons.includes('UNKNOWN_OR_WRONG_DOMAIN_DEPENDENCY_TABLE'));});
test('incorrect domain classification fails closed',()=>{const q=check({dependencySnapshot:dep({rows:[row('STANDARDS','activity_object_facts','x',['c'])]})});assert.equal(q.decision,'BLOCKED');});
test('duplicate dependency source row fails closed',()=>{const q=check({dependencySnapshot:dep({rows:[rows[0],rows[0]]})});assert.equal(q.decision,'BLOCKED');assert.ok(q.blockingReasons.includes('DUPLICATE_DEPENDENCY_ROW'));});
test('malformed dependency IDs fail closed',()=>{const q=check({dependencySnapshot:dep({rows:[row('FACTS','activity_object_facts','  ',['c'])]})});assert.equal(q.decision,'BLOCKED');});
test('dependency row with empty ON list fails closed',()=>{const q=check({dependencySnapshot:dep({rows:[row('FACTS','activity_object_facts','x',[])]})});assert.equal(q.decision,'BLOCKED');});
test('empty complete dependency rows produces honest zero counts',()=>{const q=check({dependencySnapshot:dep({rows:[]})});assert.equal(q.decision,'REVIEW_REQUIRED');assert.equal(q.dependencies.reduce((a,b)=>a+b.affectedRecordCount,0),0);assert.equal(q.dependenciesVerifiedAgainstLiveDatabase,false);});
test('empty tree blocks',()=>{const q=check({nodes:[]});assert.equal(q.decision,'BLOCKED');});
test('oversized node snapshot blocked before graph traversal',()=>{const ns=Array.from({length:20001},(_,i)=>({...root(),id:'id'+i}));const q=check({nodes:ns});assert.equal(q.decision,'BLOCKED');assert.ok(q.blockingReasons.includes('ARI_SNAPSHOT_SIZE_LIMIT'));});
test('empty moveNodeId blocks',()=>{const q=check({moveNodeId:''});assert.equal(q.decision,'BLOCKED');});
test('semantic classified_as is not a structural parent',()=>{const q=check({dependencySnapshot:dep({rows:[row('RELATIONS','value_object_relations','classified-as-1',['l1','l2'])]})});assert.equal(q.decision,'REVIEW_REQUIRED');assert.equal(q.parentPointersWouldChange,1);assert.equal(group(q,'RELATIONS').affectedRecordCount,1);});
test('different record same table can count separately',()=>{const q=check({dependencySnapshot:dep({rows:[row('FACTS','activity_object_facts','one',['c']),row('FACTS','activity_object_facts','two',['c'])]})});assert.equal(group(q,'FACTS').affectedRecordCount,2);});
test('out-of-subtree dependency does not inflate counts',()=>{const q=check({dependencySnapshot:dep({rows:[row('FACTS','activity_object_facts','only-l3',['l3'])]})});assert.equal(group(q,'FACTS').affectedRecordCount,0);});
test('baseline protection prevents hypothetical post snapshot for cross-root',()=>{const ns=[...nodes,root('r2'),inter('z','r2','r2')];const q=check({nodes:ns,proposedParentId:'z'});assert.equal(q.hypotheticalSnapshot.length,0);assert.equal(q.databaseWrites,0);});
test('no actual paid API or DB adapter imported by diagnostics',()=>{assert.equal(/createArctorAri03Embedding|\.from\(['"]value_objects|fetch\(/.test(source.slice(source.indexOf('ARCTor ARI-04.02.07'))),false);});
console.log(`M-0161 ON MOVE IMPACT PREVIEW FIXTURE PASS: ${count} tests.`);
