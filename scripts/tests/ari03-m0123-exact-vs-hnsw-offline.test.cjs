'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const h=require('../benchmarks/ari03-m0123-hnsw-offline.cjs');
const sample=()=>Array.from({length:18},(_,i)=>({id:'on-'+String(i).padStart(2,'0'),vector:[Math.cos(i*.37),Math.sin(i*.37),i/20,Math.sin(i*.13)]}));
const cases=()=>sample().map((x,i)=>({id:'q-'+i,locale:['ru','en','pl','de','es','cs','uk'][i%7],expectedOnId:x.id,vector:x.vector}));
const cfg=(x={})=>({M:4,efConstruction:16,efSearch:8,seed:41,...x});
const throws=(f,token)=>assert.throws(f,new RegExp('M0123_STOP_'+token));
// A: vector validation and metric invariants
for(const [name,v,code] of [
 ['empty',[],'VECTOR'],['scalar',[1],'VECTOR'],['NaN',[1,NaN],'VECTOR'],['infinity',[1,Infinity],'VECTOR'],['numeric string',[1,'2'],'VECTOR'],['not array',null,'VECTOR'],['zero vector',[0,0],'ZERO_VECTOR']])test('reject vector '+name,()=>throws(()=>h.normalize(v),code));
for(const [name,v] of [['x',[3,4]],['negative',[-3,-4]],['long',[1,2,3,4,5]]])test('normalize '+name,()=>{let x=h.normalize(v);assert.ok(Math.abs(x.reduce((a,b)=>a+b*b,0)-1)<1e-12)});
test('cosine distance same vector zero',()=>assert.ok(h.distance(h.normalize([3,4]),h.normalize([3,4]))<1e-12));
test('cosine distance opposite two',()=>assert.ok(Math.abs(h.distance(h.normalize([3,4]),h.normalize([-3,-4]))-2)<1e-12));
test('orthogonal distance one',()=>assert.ok(Math.abs(h.distance(h.normalize([1,0]),h.normalize([0,1]))-1)<1e-12));
test('mismatched dimensions blocked',()=>throws(()=>h.distance(h.normalize([1,0]),h.normalize([1,0,0])),'DIMENSION'));
// B: index config fail-closed
for(const [name,x,code] of [
 ['M below lower bound',{M:1},'CONFIG_M'],['M float',{M:4.2},'CONFIG_M'],['M excessive',{M:100},'CONFIG_M'],
 ['efConstruction below M',{efConstruction:2},'CONFIG_EFC'],['efConstruction excessive',{efConstruction:1000},'CONFIG_EFC'],
 ['efSearch zero',{efSearch:0},'CONFIG_EFS'],['efSearch excessive',{efSearch:1000},'CONFIG_EFS'],
 ['seed zero',{seed:0},'CONFIG_SEED'],['seed float',{seed:1.2},'CONFIG_SEED']])test('config '+name,()=>throws(()=>h.validateConfig(cfg(x)),code));
// C: index identity and deterministic connectivity
for(const [name,arr,code] of [
 ['empty dataset',[],'INDEX_SIZE'],['one item',sample().slice(0,1),'INDEX_SIZE'],
 ['duplicate ids',[sample()[0],sample()[0]],'INDEX_IDS'],
 ['blank id',sample().map((x,i)=>({...x,id:i?'ok'+i:''})),'INDEX_IDS'],
 ['nonfinite vector',sample().map((x,i)=>({...x,vector:i?[1,0]:[1,NaN]})),'VECTOR']])test('index '+name,()=>throws(()=>h.newIndex(arr,cfg()),code));
test('deterministic seeded graph',()=>{const a=h.newIndex(sample(),cfg()),b=h.newIndex(sample(),cfg());assert.deepEqual(a.inspect(),b.inspect());assert.equal(a.meta().edgeCount,b.meta().edgeCount)});
test('different seeds affect graph',()=>{const a=h.newIndex(sample(),cfg()).inspect(),b=h.newIndex(sample(),cfg({seed:7})).inspect();assert.notDeepEqual(a,b)});
test('index has all candidates',()=>assert.equal(h.newIndex(sample(),cfg()).meta().size,18));
test('index dimensions preserved',()=>assert.equal(h.newIndex(sample(),cfg()).meta().dimensions,4));
test('index does not exceed configured maxlevel',()=>assert.ok(h.newIndex(sample(),cfg()).meta().maxLevel<=8));
test('index has navigable links',()=>assert.ok(h.newIndex(sample(),cfg()).meta().edgeCount>0));
test('index captures build calculation counts',()=>assert.ok(h.newIndex(sample(),cfg()).meta().buildDistanceCalls>0));
test('exact top-1 self query returns same id',()=>{const a=sample();for(const x of a)assert.equal(h.exact(a,x.vector,1).hits[0].id,x.id)});
test('exact does not fabricate candidate',()=>{const a=sample();assert.equal(h.exact(a,[0,1,0,0],5).hits.length,5)});
test('exact calculates all candidate distances',()=>{const a=sample();assert.equal(h.exact(a,[0,1,0,0],5).distanceCalls,18)});
test('HNSW returns only known ids',()=>{const index=h.newIndex(sample(),cfg()),ids=new Set(sample().map(x=>x.id));assert.ok(index.search([0,1,0,0],5).hits.every(x=>ids.has(x.id)))});
test('HNSW returns sorted by distance',()=>{const a=h.newIndex(sample(),cfg()).search([0,1,0,0],5).hits;assert.deepEqual(a,[...a].sort((x,y)=>x.distance-y.distance||x.id.localeCompare(y.id)))});
test('HNSW search count measured',()=>assert.ok(h.newIndex(sample(),cfg()).search([0,1,0,0],5).distanceCalls>0));
test('invalid requested k rejected',()=>throws(()=>h.newIndex(sample(),cfg()).search([0,1,0,0],0),'K'));
test('k beyond dataset rejected',()=>throws(()=>h.newIndex(sample(),cfg()).search([0,1,0,0],19),'K'));
test('efSearch negative rejected',()=>throws(()=>h.newIndex(sample(),cfg()).search([0,1,0,0],5,-1),'EF_SEARCH'));
test('efSearch beyond safety limit rejected',()=>throws(()=>h.newIndex(sample(),cfg()).search([0,1,0,0],5,1000),'EF_SEARCH'));
// D: benchmark and data provenance
for(const ef of [4,8,16,32])test('HNSW exact-top1 agreement under ef '+ef,()=>{const r=h.compareOne(sample(),cases(),cfg({efSearch:ef}));assert.ok(r.annExactTop1Agreement>=0&&r.annExactTop1Agreement<=1);assert.equal(r.queries,18)});
test('benchmark exact Gold self recall at1 is 1',()=>assert.equal(h.compareOne(sample(),cases(),cfg()).exactGoldRecallAt1,1));
test('benchmark exact Gold self recall at5 is 1',()=>assert.equal(h.compareOne(sample(),cases(),cfg()).exactGoldRecallAt5,1));
test('benchmark ANN recall@5 bounded',()=>{const r=h.compareOne(sample(),cases(),cfg());assert.ok(r.annGoldRecallAt5>=0&&r.annGoldRecallAt5<=1)});
test('benchmark reports per-query identities',()=>{const r=h.compareOne(sample(),cases(),cfg());assert.equal(new Set(r.perQuery.map(q=>q.queryId)).size,18)});
test('benchmark rejects unknown Gold UUID',()=>throws(()=>h.compareOne(sample(),[{id:'q',expectedOnId:'ghost',vector:[1,0,0,0]}],cfg()),'QUERY'));
test('benchmark rejects duplicate query ids',()=>throws(()=>h.compareOne(sample(),[cases()[0],cases()[0]],cfg()),'QUERY'));
test('benchmark rejects no queries',()=>throws(()=>h.compareOne(sample(),[],cfg()),'QUERY_COUNT'));
test('benchmark does not return raw vectors',()=>{const s=JSON.stringify(h.compareOne(sample(),cases(),cfg()));assert.ok(!s.includes('"vector"'))});
test('model comparison requires two models',()=>throws(()=>h.evaluate({m1:{items:sample(),queries:cases()}},cases(),[cfg(),cfg({M:8,efConstruction:16})]),'TWO_MODELS'));
test('model comparison rejects one config',()=>throws(()=>h.evaluate({m1:{items:sample(),queries:cases()},m2:{items:sample(),queries:cases()}},cases(),[cfg()]),'CONFIGS'));
test('model comparison requires consistent query ordering',()=>throws(()=>h.evaluate({m1:{items:sample(),queries:cases()},m2:{items:sample(),queries:[...cases()].reverse()}},cases(),[cfg(),cfg({M:8,efConstruction:16})]),'QUERY_ORDER'));
test('two-model comparison never asserts PostgreSQL test',()=>{const r=h.evaluate({m1:{items:sample(),queries:cases()},m2:{items:sample(),queries:cases()}},cases(),[cfg(),cfg({M:8,efConstruction:16})]);assert.equal(r.assumptions.pgvectorHnswTested,false);assert.equal(r.assumptions.productionLatencyCertified,false)});
test('two-model comparison returns both configs',()=>{const r=h.evaluate({m1:{items:sample(),queries:cases()},m2:{items:sample(),queries:cases()}},cases(),[cfg(),cfg({M:8,efConstruction:16})]);assert.equal(r.models.m1.length,2);assert.equal(r.models.m2.length,2)});
