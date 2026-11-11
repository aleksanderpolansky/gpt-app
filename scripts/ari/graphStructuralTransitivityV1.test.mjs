/** M-0159: conservative transitive ancestry on offline fixtures (no DB/API writes). */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const repo = process.env.ARCTOR_REPO ?? process.cwd();
const modulePath = process.env.ARCTOR_GRAPH_TS ?? path.join(repo, 'src/lib/reality-core/graphIntegrityV1.ts');
const ts = createRequire(path.join(repo, 'package.json'))('typescript');
const program = ts.createProgram([modulePath], {
  strict: true, target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext,
  skipLibCheck: true, noEmit: true,
});
const errors = ts.getPreEmitDiagnostics(program).filter(d => d.category === ts.DiagnosticCategory.Error);
assert.equal(errors.length, 0, ts.formatDiagnostics(errors, {
  getCanonicalFileName: x => x, getCurrentDirectory: () => repo, getNewLine: () => '\n',
}));
const src = fs.readFileSync(modulePath, 'utf8');
const js = ts.transpileModule(src, {fileName: modulePath, compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
}});
const exports = {};
vm.runInNewContext(js.outputText, {exports}, {timeout: 7000});
const check = exports.analyzeStructuralTransitivityV1;
const policy = exports.STRUCTURAL_TRANSITIVITY_POLICY_V1;
assert.equal(typeof check, 'function');
const make = (id, opts = {}) => ({
  id, parent_value_object_id: null, root_value_object_id: id,
  hierarchy_relation_code: null, scope_code: 'global', ontology_node_role_code: 'root',
  owner_user_id: null, owner_actor_id: null, facet_code: 'DOMAIN',
  origin_type_code: 'system_model', status: 'active', ...opts,
});
const r = make('r');
const a = make('a', {parent_value_object_id:'r',root_value_object_id:'r',
  hierarchy_relation_code:'is_a',ontology_node_role_code:'intermediate',facet_code:'STATE'});
const b = make('b', {...a,id:'b',parent_value_object_id:'a'});
const c = make('c', {...a,id:'c',parent_value_object_id:'b',ontology_node_role_code:'leaf'});
const base = [r,a,b,c];
const codes = x => x.blockingReasons;
const derived = x => x.entailedPaths.map(y => `${y.descendantId}->${y.ancestorId}`);
let total=0;
function test(name,fn){fn();total++;console.log('PASS M0159 '+name);}
test('policy is explicit, minimal, conservative',()=>{
  assert.equal(policy.is_a,'ENTAILED'); assert.equal(policy.part_of,'REVIEW_ONLY');
  assert.equal(policy.subprocess_of,'REVIEW_ONLY'); assert.equal(policy.aspect_of,'NON_TRANSITIVE');
  assert.equal(Object.keys(policy).length,4);
});
test('pure is_a chain entails exactly three distant ancestors',()=>{
  const q=check(base);assert.equal(q.ok,true,JSON.stringify(q.blockingReasons));
  assert.deepEqual(Array.from(derived(q)),['b->r','c->a','c->r']);
  assert.equal(q.entailedPaths.length,3);assert.equal(q.databaseWrites,0);
});
test('each claim carries a continuous witness path',()=>{
  const q=check(base); const claim=q.entailedPaths.find(x=>x.descendantId==='c'&&x.ancestorId==='r');
  assert.deepEqual(Array.from(claim.witnessNodeIds),['c','b','a','r']);
  assert.equal(claim.hops,3);assert.equal(claim.hierarchyCode,'is_a');
  assert.equal(claim.disposition,'DERIVED_READONLY');
});
test('one direct is_a edge is not a transitive inference',()=>{
  assert.equal(check([r,a]).entailedPaths.length,0);
});
test('semantic classified_as is never a structural ancestor',()=>{
  const semantic=[{id:'s1',source_value_object_id:'c',target_value_object_id:'a',relation_type_code:'classified_as',status:'active'}];
  const q=check(base,semantic);
  assert.equal(q.ok,true);assert.equal(q.semanticRelationsIgnored,1);
  assert.deepEqual(Array.from(derived(q)),['b->r','c->a','c->r']);
});
test('semantic influences does not transmit through hierarchy',()=>{
  const semantic=[{id:'s2',source_value_object_id:'b',target_value_object_id:'c',relation_type_code:'influences',status:'active'}];
  const q=check([r,a],semantic.slice(0,0));assert.equal(q.entailedPaths.length,0);
  const same=check(base,semantic); assert.equal(same.entailedPaths.length,3);
});
test('part_of is review-only even for pure three-edge chain',()=>{
  const tree=base.map((n,i)=>i?{...n,hierarchy_relation_code:'part_of'}:n);
  const q=check(tree);assert.equal(q.ok,true);assert.equal(q.entailedPaths.length,0);
  assert.equal(q.reviewOnlyPaths.length,3);
  assert.equal(q.reviewOnlyPaths.every(x=>x.disposition==='NEEDS_SEMANTIC_REVIEW'),true);
});
test('subprocess_of is review-only until contract approved',()=>{
  const tree=base.map((n,i)=>i?{...n,hierarchy_relation_code:'subprocess_of'}:n);
  const q=check(tree);assert.equal(q.ok,true);assert.equal(q.reviewOnlyPaths.length,3);
  assert.equal(q.entailedPaths.length,0);
});
test('aspect_of cannot generate transitive or review candidates',()=>{
  const tree=base.map((n,i)=>i?{...n,hierarchy_relation_code:'aspect_of'}:n);
  const q=check(tree);assert.equal(q.ok,true);assert.equal(q.entailedPaths.length,0);
  assert.equal(q.reviewOnlyPaths.length,0);assert.equal(q.withheldPathsCount,3);
});
test('mixed part_of and is_a cannot entail taxonomy',()=>{
  const q=check([r,{...a,hierarchy_relation_code:'part_of'},b,c]);
  assert.equal(q.ok,true);assert.equal(q.entailedPaths.some(x=>x.ancestorId==='r'),false);
  assert.equal(q.entailedPaths.some(x=>x.descendantId==='c'&&x.ancestorId==='a'),true);
});
test('mixed is_a and part_of never entail across boundary',()=>{
  const q=check([r,a,{...b,hierarchy_relation_code:'part_of'},c]);
  assert.equal(q.ok,true);assert.equal(q.entailedPaths.length,0);
});
test('mixed part_of and subprocess_of are not compositional',()=>{
  const q=check([r,{...a,hierarchy_relation_code:'part_of'},
    {...b,hierarchy_relation_code:'subprocess_of'},
    {...c,hierarchy_relation_code:'subprocess_of'}]);
  assert.equal(q.entailedPaths.length,0);assert.equal(q.reviewOnlyPaths.length,1);
});
test('inactive leaf never creates derived ancestry',()=>{
  const q=check([r,a,b,{...c,status:'retired'}]);
  assert.equal(q.ok,true);assert.equal(q.entailedPaths.some(x=>x.descendantId==='c'),false);
});
test('draft leaf never creates derived ancestry',()=>{
  const q=check([r,a,b,{...c,status:'draft'}]);
  assert.equal(q.ok,true);assert.equal(q.entailedPaths.some(x=>x.descendantId==='c'),false);
});
test('PP2 actor leaf under global is valid but does not infer cross-owner',()=>{
  const actor=make('actorLeaf',{...c,id:'actorLeaf',scope_code:'actor',owner_user_id:'U',owner_actor_id:'A',parent_value_object_id:'b'});
  const q=check([...base,actor]); assert.equal(q.ok,true,JSON.stringify(q.blockingReasons));
  assert.equal(q.entailedPaths.some(x=>x.descendantId==='actorLeaf'),false);
});
test('legacy commercial nodes excluded without mutation',()=>{
  const legacy=make('commercial',{scope_code:null,ontology_node_role_code:null,status:'draft',parent_value_object_id:'invalid'});
  const tree=[...base,legacy];const before=JSON.stringify(tree);
  const q=check(tree);assert.equal(q.ok,true);assert.equal(q.excludedLegacyCount,1);
  assert.equal(JSON.stringify(tree),before);
});
test('unknown structural type fails closed',()=>{
  const q=check([r,{...a,hierarchy_relation_code:'invented'}]);
  assert.equal(q.ok,false); assert.equal(codes(q).includes('UNKNOWN_STRUCTURAL_RELATION_CODE'),true);
  assert.equal(q.entailedPaths.length,0);
});
test('semantic type in structural field fails closed',()=>{
  const q=check([r,{...a,hierarchy_relation_code:'classified_as'}]);
  assert.equal(q.ok,false);assert.equal(q.entailedPaths.length,0);
});
test('orphan parent fails closed',()=>{
  const q=check([r,{...a,parent_value_object_id:'unknown'}]);
  assert.equal(q.ok,false);assert.equal(q.entailedPaths.length,0);
});
test('cycle fails closed despite plausible root pointers',()=>{
  const q=check([r,{...a,parent_value_object_id:'b'},b]);
  assert.equal(q.ok,false);assert.equal(q.entailedPaths.length,0);
});
test('duplicate IDs are not hidden',()=>{
  const q=check([...base,{...c,hierarchy_relation_code:'part_of'}]);
  assert.equal(q.ok,false);assert.equal(q.entailedPaths.length,0);
});
test('missing semantic endpoint fails safely',()=>{
  const q=check(base,[{id:'missing',source_value_object_id:'c',target_value_object_id:'unlisted',relation_type_code:'classified_as',status:'active'}]);
  assert.equal(q.ok,false);assert.equal(q.entailedPaths.length,0);
});
test('path limit fails closed without emitting partial results',()=>{
  const q=check(base,[],1);assert.equal(q.ok,false);assert.equal(q.complete,false);
  assert.equal(codes(q).includes('INDIRECT_PATH_LIMIT_REACHED'),true);
  assert.equal(q.entailedPaths.length,0);assert.equal(q.reviewOnlyPaths.length,0);
});
test('invalid path limit fails closed',()=>{
  for(const value of [0,-1,1.5,100001,NaN]){
    const q=check(base,[],value);assert.equal(q.ok,false);assert.equal(q.complete,false);
  }
});
test('unordered input produces deterministic sorted paths',()=>{
  assert.deepEqual(Array.from(derived(check([c,r,b,a]))),Array.from(derived(check(base))));
});
test('longer acyclic is_a chain is handled iteratively',()=>{
  const deep=[r]; for(let k=1;k<=32;k++){
    deep.push(make(`m${k}`,{parent_value_object_id:k===1?'r':`m${k-1}`,root_value_object_id:'r',
      hierarchy_relation_code:'is_a',ontology_node_role_code:k===32?'leaf':'intermediate',facet_code:'STATE'}));
  }
  const q=check(deep);assert.equal(q.ok,true,JSON.stringify(q.blockingReasons));
  assert.equal(q.entailedPaths.length,32*31/2);
});
console.log(`M-0159 TRANSITIVITY FIXTURE PASS: ${total} tests. No DB/API writes.`);
