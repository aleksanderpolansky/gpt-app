/** Local offline fixture tests for graphIntegrityV1.ts. No Supabase access. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=process.env.ARCTOR_REPO ?? process.cwd();
const modulePath=process.env.ARCTOR_GRAPH_TS ?? path.join(repo,'src/lib/reality-core/graphIntegrityV1.ts');
const requireFromRepo=createRequire(path.join(repo,'package.json'));
let ts;
try { ts=requireFromRepo('typescript'); }
catch { throw Error('typescript dependency missing from local repo; install existing project dependencies before verification (no network attempted)'); }
const source=fs.readFileSync(modulePath,'utf8');
const program=ts.createProgram([modulePath], {strict:true,target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,skipLibCheck:true,noEmit:true});
const typeErrors=ts.getPreEmitDiagnostics(program).filter(d=>d.category===ts.DiagnosticCategory.Error);
assert.equal(typeErrors.length,0,ts.formatDiagnosticsWithColorAndContext(typeErrors,{getCanonicalFileName:x=>x,getCurrentDirectory:()=>repo,getNewLine:()=>"\n"}));
const js=ts.transpileModule(source,{fileName:modulePath,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}});
const errs=(js.diagnostics??[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
assert.equal(errs.length,0,JSON.stringify(errs));
const exports={};
vm.runInNewContext(js.outputText,{exports},{filename:'graphIntegrityV1.transpiled.cjs',timeout:3000});
const {analyzeGraphIntegrityV1:analyze}=exports;
assert.equal(typeof analyze,'function');
const G='G',I='I',L='L',U='user-1',A='actor-1';
const node=(id,overrides={})=>({id,parent_value_object_id:null,root_value_object_id:id,hierarchy_relation_code:null,scope_code:'global',ontology_node_role_code:'root',owner_user_id:null,owner_actor_id:null,facet_code:'DOMAIN',origin_type_code:'system_model',status:'active',...overrides});
const root=node(G);
const parent=node(I,{parent_value_object_id:G,root_value_object_id:G,hierarchy_relation_code:'is_a',ontology_node_role_code:'intermediate',facet_code:'STATE'});
const leaf=node(L,{parent_value_object_id:I,root_value_object_id:G,hierarchy_relation_code:'aspect_of',ontology_node_role_code:'leaf',facet_code:'STATE'});
const codes=(report)=>report.issues.map(x=>x.code);
const assertHas=(report,code)=>assert.ok(codes(report).includes(code),`Expected ${code}, got ${JSON.stringify(report.issues)}`);
let tested=0;
const test=(name,fn)=>{fn();tested++;console.log('PASS '+name);};
test('valid global ARI structural tree',()=>{const r=analyze([root,parent,leaf]);assert.equal(r.ok,true,JSON.stringify(r.issues));assert.equal(r.structuralEdgeCount,2);});
test('classified_as is independent cross-root semantic link',()=>{
 const other=node('other-root');const otherLeaf=node('other-leaf',{parent_value_object_id:'other-root',root_value_object_id:'other-root',hierarchy_relation_code:'is_a',ontology_node_role_code:'leaf',facet_code:'STATE'});
 const sem=[{id:'sem1',source_value_object_id:L,target_value_object_id:'other-leaf',relation_type_code:'classified_as',status:'active'}];
 const snapshot=[root,parent,leaf,other,otherLeaf];const before=JSON.stringify(snapshot);const r=analyze(snapshot,sem);
 assert.equal(r.ok,true,JSON.stringify(r.issues)); assert.equal(r.semanticEdgeCount,1);assert.equal(r.structuralEdgeCount,3);assert.equal(JSON.stringify(snapshot),before);
});
test('legacy commercial objects excluded without repair',()=>{const legacy=node('legacy',{scope_code:null,owner_user_id:U,owner_actor_id:A,ontology_node_role_code:null}); const r=analyze([root,parent,leaf,legacy]);assert.equal(r.excludedLegacyCount,1);assert.equal(r.ariNodeCount,3);assert.equal(r.ok,true);});
test('PP2 actor leaf under active global intermediate is valid',()=>{const actor=node('actor-leaf',{scope_code:'actor',ontology_node_role_code:'leaf',parent_value_object_id:I,root_value_object_id:G,hierarchy_relation_code:'part_of',facet_code:'STATE',owner_user_id:U,owner_actor_id:A,origin_type_code:'actor'});const r=analyze([root,parent,leaf,actor]);assert.equal(r.ok,true,JSON.stringify(r.issues));});
test('invalid PP2 global root parent rejected',()=>{const actor=node('actor-leaf',{scope_code:'actor',ontology_node_role_code:'leaf',parent_value_object_id:G,root_value_object_id:G,hierarchy_relation_code:'part_of',facet_code:'STATE',owner_user_id:U,owner_actor_id:A,origin_type_code:'actor'});assertHas(analyze([root,parent,actor]),'PP2_PARENT_INVALID');});
test('cycle detected independently from root pointers',()=>{const a=node('a',{parent_value_object_id:'b',root_value_object_id:G,hierarchy_relation_code:'part_of',ontology_node_role_code:'intermediate',facet_code:'STATE'});const b=node('b',{parent_value_object_id:'a',root_value_object_id:G,hierarchy_relation_code:'part_of',ontology_node_role_code:'intermediate',facet_code:'STATE'});const r=analyze([root,a,b]);assertHas(r,'STRUCTURAL_CYCLE');});
test('orphan parent detected on complete ARI snapshot',()=>{const orphan=node('orphan',{parent_value_object_id:'not-here',root_value_object_id:G,hierarchy_relation_code:'part_of',ontology_node_role_code:'leaf',facet_code:'STATE'});assertHas(analyze([root,orphan]),'ORPHAN_PARENT');});
test('leaf cannot be parent',()=>{const child=node('child',{parent_value_object_id:L,root_value_object_id:G,hierarchy_relation_code:'part_of',ontology_node_role_code:'leaf',facet_code:'STATE'});assertHas(analyze([root,parent,leaf,child]),'LEAF_HAS_CHILDREN');});
test('root pointer mismatch caught',()=>{const bad=node('bad',{parent_value_object_id:I,root_value_object_id:'wrong',hierarchy_relation_code:'is_a',ontology_node_role_code:'leaf',facet_code:'STATE'});assertHas(analyze([root,parent,bad]),'ROOT_POINTER_MISMATCH');});
test('semantics cannot masquerade as structural hierarchy code',()=>{const bad={...leaf,hierarchy_relation_code:'classified_as'};assertHas(analyze([root,parent,bad]),'SEMANTIC_TYPE_IN_STRUCTURAL_FIELD');});
test('duplicate node IDs fail closed',()=>{assertHas(analyze([root,parent,leaf,{...leaf}]),'DUPLICATE_NODE_ID');});
test('cross actor ownership rejected',()=>{const aroot=node('actor-root',{scope_code:'actor',owner_user_id:U,owner_actor_id:A});const child=node('actor-child',{scope_code:'actor',owner_user_id:'other-user',owner_actor_id:'other-actor',parent_value_object_id:'actor-root',root_value_object_id:'actor-root',ontology_node_role_code:'leaf',hierarchy_relation_code:'part_of',facet_code:'STATE'});assertHas(analyze([aroot,child]),'PARENT_SCOPE_OWNER_MISMATCH');});
test('unknown semantic endpoint reported without creating parent',()=>{const rel=[{id:'sem-bad',source_value_object_id:L,target_value_object_id:'ghost',relation_type_code:'classified_as',status:'active'}];assertHas(analyze([root,parent,leaf],rel),'SEMANTIC_ENDPOINT_MISSING');});
console.log(`GRAPH INTEGRITY V1 FIXTURE PASS: ${tested} tests. No DB/API writes.`);
