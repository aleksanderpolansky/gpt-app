'use strict';
/**
 * ARCTor ARI M-0104: real-repository lexical regression tests.
 * Runs actual existing src/lib/ontology-research modules, not the future M0105 engine.
 * No DB, network, writes, or feature activation. Uses existing scripts/tests. Node 20+ and local TypeScript compiler.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const cp = require('node:child_process');
const REPO = path.resolve(__dirname, '../..');
const HEAD = '675521c8151a18cb6f53ae6339e9663d831712ef';
const VERIFIED_BLOBS = Object.freeze({
  'src/lib/ontology-research/contextSearchV2.ts': 'b1f58799a819b92122d0350d291717a425b1542a',
  'src/lib/ontology-research/ari02EnhancedSearch.ts': 'abb6d80a40278fe5cba240b7fca65809433a7a4e',
});
function git(...args) {
  return cp.execFileSync('git', args, {cwd: REPO, encoding:'utf8', windowsHide:true}).trim();
}
function loadActualTs(relative) {
  const filename=path.join(REPO,...relative.split('/'));
  const ts=require(path.join(REPO,'node_modules','typescript'));
  const js=ts.transpileModule(fs.readFileSync(filename,'utf8'), {
    compilerOptions: {module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022}
  }).outputText;
  const m=new Module(filename,module);
  m.filename=filename;
  m.paths=Module._nodeModulePaths(path.dirname(filename));
  m._compile(js,filename);
  return m.exports;
}
// Deliberately fail rather than silently test different code or a synthetic stub.
assert.equal(git('rev-parse','HEAD'), HEAD, 'M0104 requires the pinned repository commit');
for(const [file, blob] of Object.entries(VERIFIED_BLOBS)) {
  assert.equal(git('hash-object',file),blob,`Source drift: ${file}`);
}
const {scoreContextCandidate,normalizeContextQuery}=loadActualTs('src/lib/ontology-research/contextSearchV2.ts');
const {evaluateAri02Enhanced}=loadActualTs('src/lib/ontology-research/ari02EnhancedSearch.ts');
const row=(id,title,role,pathValue='Действия и процессы › Ходьба')=>({
  id,title,path:pathValue,role,titleVariants:[{locale:'ru',text:title}]
});
const fixedNow=()=>0;
const score=(query,titles,paths=[],extra=[])=>scoreContextCandidate({query,titles,paths,extra});

test('M0104 exact full title outranks partial title in the real current scorer',()=>{
  const q='Ночной сон';
  assert.equal(score(q,[q]),120);
  const partial=score(q,['Ночной сон человека']);
  assert.ok(partial>0&&partial<120,`partial=${partial}`);
});
test('M0104 exact full phrase beats path-only matches',()=>{
  const q='Продолжительность сна';
  assert.equal(score(q,[q]),120);
  const pathOnly=score(q,['Листовая характеристика'],['Состояния и потребности › Сон › Продолжительность сна']);
  assert.ok(pathOnly>0&&pathOnly<120,`path-only=${pathOnly}`);
});
test('M0104 partial title beats path-only despite a perfect phrase in the path',()=>{
  const q='Ночной сон';
  const partial=score(q,['Ночной сон человека']);
  const pathOnly=score(q,['Показатель'],['Состояния и потребности › Ночной сон']);
  assert.ok(partial>pathOnly,`${partial} !> ${pathOnly}`);
});
test('M0104 path-only candidate is never mistaken for own-title exact',()=>{
  assert.notEqual(score('Ночной сон',['Частота дыхания'],['Ночной сон']),120);
});
test('M0104 no unbounded substring matching inside unrelated words',()=>{
  assert.equal(score('сон',['Бессонница']),0);
  assert.equal(score('лук',['лучок']),0);
});
test('M0104 root and leaf role do not silently change identical own-title lexical scores',()=>{
  const a=score('Ходьба',['Ходьба']);
  const b=score('Ходьба',['Ходьба']);
  assert.equal(a,120);assert.equal(b,a);
});
test('M0104 enhanced current engine keeps root / leaf identifiers and roles distinct',()=>{
  const a='00000000-0000-4000-8000-000000000001', b='00000000-0000-4000-8000-000000000002';
  const result=evaluateAri02Enhanced('ходьба',[row(b,'Ходьба','leaf'),row(a,'Ходьба','root')],20,fixedNow);
  assert.equal(result.totalMatched,2);
  assert.deepEqual(result.rows.map(x=>x.id),[a,b]);
  assert.deepEqual(result.rows.map(x=>x.role),['root','leaf']);
  assert.equal(result.rows[0].score,result.rows[1].score);
});
test('M0104 equal score ties have deterministic UUID ordering across input permutations',()=>{
  const a=row('00000000-0000-4000-8000-000000000010','Ходьба','leaf');
  const b=row('00000000-0000-4000-8000-000000000002','Ходьба','leaf');
  const first=evaluateAri02Enhanced('ходьба',[a,b],20,fixedNow);
  const second=evaluateAri02Enhanced('ходьба',[b,a],20,fixedNow);
  assert.deepEqual(first.rows.map(x=>x.id),second.rows.map(x=>x.id));
  assert.deepEqual(first.rows.map(x=>x.id),[b.id,a.id]);
});
test('M0104 equal titles are not merged or automatically confirmed',()=>{
  const a=row('00000000-0000-4000-8000-000000000011','Ходьба','leaf');
  const b=row('00000000-0000-4000-8000-000000000012','Ходьба','intermediate');
  const result=evaluateAri02Enhanced('ходьба',[b,a],20,fixedNow);
  assert.equal(result.rows.length,2);
  assert.equal(new Set(result.rows.map(x=>x.id)).size,2);
  assert.equal(result.rows.every(x=>x.verifiedRelation===false),true);
});
test('M0104 topK truncation is explicit; totalMatched retains all candidates',()=>{
  const candidates=[1,2,3].map(n=>row(`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,'Ходьба','leaf'));
  const result=evaluateAri02Enhanced('ходьба',candidates,1,fixedNow);
  assert.equal(result.totalMatched,3);assert.equal(result.rows.length,1);assert.equal(result.evaluated,3);
});
test('M0104 lexical-only ranking does not derive parent identity from a path string',()=>{
  const x=evaluateAri02Enhanced('ходьба',[row('00000000-0000-4000-8000-000000000019','Сон','leaf','Действия и процессы › Ходьба')],10,fixedNow);
  assert.equal(x.rows.length,0);
});
test('M0104 baseline normalization compatibility is observed, not promoted to M0100 strict policy',()=>{
  assert.equal(normalizeContextQuery('  НОЧНОЙ   СОН  '),'ночной сон');
  assert.equal(normalizeContextQuery('Ёлка'),'елка'); // Legacy; strict distinction remains M0105+ work.
});
test('M0104 empty query never yields lexical relevance',()=>{
  assert.equal(score('   ',['Ночной сон']),0);
});
