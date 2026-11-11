'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}
const input=process.env.ARCTOR_M0134_TEST_MODULE_PATH||path.join(__dirname,'indexLifecycleV1.ts');
const compiled=ts.transpileModule(fs.readFileSync(input,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
const m=new Module(input,module);m.filename=input;m.paths=Module._nodeModulePaths(path.dirname(input));m._compile(compiled.outputText,input);
const H=m.exports;
const uid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const actorA=uid(101),actorB=uid(102),actorC=uid(103);const hash='A'.repeat(64),otherhash='B'.repeat(64);
const scopeGlobal={kind:'global_system',ownerActorId:null};
const scopePrivate=(a)=>({kind:'owner_private',ownerActorId:a});
function idx(id,scope,build=true){const source={scope,modelId:'text-embedding-3-small',modelVersion:'1',preprocessingVersion:'v1',units:[]};let r=H.createIndexLifecycleV1(id,source);assert.equal(r.ok,true);if(build){r=H.transitionIndexLifecycleV1(r.record,{kind:'BUILD_STARTED'});assert.equal(r.ok,true);r=H.transitionIndexLifecycleV1(r.record,{kind:'BUILD_SUCCEEDED',generation:r.record.index_generation,source_hash:r.record.source_hash});assert.equal(r.ok,true);}return r.record;}
const global=idx('global_index',scopeGlobal),pA=idx('private_a',scopePrivate(actorA)),pB=idx('private_b',scopePrivate(actorB)),pC=idx('private_c',scopePrivate(actorC));
const indexes=[pB,global,pA,pC];
const plan=(actor,all=indexes)=>H.prepareScopedIndexReadV1(actor,all);
function ids(actor,all=indexes){const x=plan(actor,all);assert.equal(x.ok,true,JSON.stringify(x));assert.equal(x.plan.databaseAclVerified,false);return x.plan.allowed_indexes.map(x=>x.index_id);}
function hit(i,channel='suggestion',locale='ru',over={}){const row={index_id:i.index_id,index_generation:i.published_generation,source_hash:i.published_source_hash,on_id:uid(1),locale,channel};if(channel==='suggestion')row.label='Тест';else row.score=0.5;return {...row,...over};}
const validate=(actor,h,all=indexes)=>H.validateScopedSearchHitsV1(actor,all,h);
const ok=(actor,h,all=indexes)=>{const x=validate(actor,h,all);assert.equal(x.ok,true,JSON.stringify(x));assert.equal(x.result.rawVectorsReturned,false);assert.equal(x.result.databaseAclVerified,false);return x.result;};
const no=(actor,h,reason,all=indexes)=>{const x=validate(actor,h,all);assert.equal(x.ok,false);assert.equal(x.reason,reason);assert.equal(JSON.stringify(x).includes('private_b'),false);return x;};

test('contract exported',()=>assert.equal(H.INDEX_SEARCH_ACL_CONTRACT_V1,'ARCTOR_ARI03_SEARCH_ACL_V1'));
test('pre-search API exported',()=>assert.equal(typeof H.prepareScopedIndexReadV1,'function'));
test('post-search API exported',()=>assert.equal(typeof H.validateScopedSearchHitsV1,'function'));
test('anonymous sees only global index',()=>assert.deepEqual(ids(null),['global_index']));
test('owner A sees global and self',()=>assert.deepEqual(ids(actorA),['global_index','private_a']));
test('owner B sees global and self',()=>assert.deepEqual(ids(actorB),['global_index','private_b']));
test('owner C sees global and self',()=>assert.deepEqual(ids(actorC),['global_index','private_c']));
test('unknown authenticated actor only global',()=>assert.deepEqual(ids(uid(991)),['global_index']));
test('invalid actor rejected',()=>assert.equal(plan('fake').reason,'INVALID_ACTOR'));
test('missing actor rejected (not anonymous)',()=>assert.equal(plan(undefined).reason,'INVALID_ACTOR'));
test('nil string actor is not authenticated',()=>assert.equal(plan('').reason,'INVALID_ACTOR'));
test('invalid indexes rejected',()=>assert.equal(plan(actorA,null).reason,'INVALID_INDEX_CATALOG'));
test('duplicate index id rejected',()=>assert.equal(plan(actorA,[pA,pA]).reason,'INVALID_INDEX_CATALOG'));
test('invalid index metadata rejected',()=>assert.equal(plan(actorA,[{...pA,scope:{kind:'owner_private',ownerActorId:null}}]).reason,'INVALID_INDEX_CATALOG'));
test('index id conflict fails closed',()=>assert.equal(plan(actorA,[pA,{...pB,index_id:pA.index_id}]).ok,false));
test('fresh global index with private-looking usage_scope is ignored',()=>assert.deepEqual(ids(null,[{...global,usage_scope:'private'}]),['global_index']));
test('unknown extra fields of index not promoted',()=>assert.deepEqual(ids(null,[{...global,title:'ignored'}]),['global_index']));
test('stale index absent from search plan',()=>assert.deepEqual(ids(actorA,[idx('stale',scopePrivate(actorA),false)]),[]));
test('building index absent from search plan',()=>{const x=idx('building',scopeGlobal,false);const b=H.transitionIndexLifecycleV1(x,{kind:'BUILD_STARTED'});assert.equal(b.ok,true);assert.deepEqual(ids(null,[b.record]),[])});
test('empty catalogue produces no reads',()=>assert.deepEqual(ids(actorA,[]),[]));
test('pre-search plan is deterministic for reordered inputs',()=>assert.deepEqual(plan(actorA,[...indexes].reverse()),plan(actorA)));
test('pre-search plan omits private index IDs of other tenants',()=>assert.equal(JSON.stringify(plan(actorA)).includes('private_b'),false));
test('pre-search no writes or paid calls',()=>{const p=plan(actorA).plan;assert.equal(p.writesPerformed,false);assert.equal(p.paidCallsPerformed,false)});
test('post-search global suggestion for anonymous',()=>assert.equal(ok(null,[hit(global)]).suggestions.length,1));
test('post-search global embedding for anonymous',()=>assert.equal(ok(null,[hit(global,'embedding')]).embeddings.length,1));
test('post-search own private suggestion',()=>assert.equal(ok(actorA,[hit(pA)]).suggestions.length,1));
test('post-search own private embedding',()=>assert.equal(ok(actorA,[hit(pA,'embedding')]).embeddings.length,1));
test('foreign private suggestion cannot leak',()=>no(actorA,[hit(pB)],'UNAUTHORIZED_RESULT'));
test('foreign private embedding cannot leak',()=>no(actorA,[hit(pB,'embedding')],'UNAUTHORIZED_RESULT'));
test('anonymous cannot read private suggestion',()=>no(null,[hit(pA)],'UNAUTHORIZED_RESULT'));
test('anonymous cannot read private embedding',()=>no(null,[hit(pA,'embedding')],'UNAUTHORIZED_RESULT'));
test('unknown index cannot supply hits',()=>no(actorA,[hit(pA,'suggestion','ru',{index_id:'unknown_index'})],'UNAUTHORIZED_RESULT'));
test('other-generation result rejected',()=>no(actorA,[hit(pA,'suggestion','ru',{index_generation:pA.index_generation+1})],'UNAUTHORIZED_RESULT'));
test('other-source-hash result rejected',()=>no(actorA,[hit(pA,'suggestion','ru',{source_hash:otherhash})],'UNAUTHORIZED_RESULT'));
test('unexpected row fields rejected including raw vectors',()=>no(actorA,[hit(pA,'embedding','ru',{vector:[0.1,0.2]})],'INVALID_HITS'));
test('unexpected row owner metadata rejected',()=>no(actorA,[hit(pA,'suggestion','ru',{ownerActorId:actorB})],'INVALID_HITS'));
test('embeddings never return raw vector',()=>{const x=ok(actorA,[hit(pA,'embedding')]);assert.equal(JSON.stringify(x).includes('vector'),false)});
test('suggestions never return raw score',()=>{const x=ok(actorA,[hit(pA)]);assert.equal(JSON.stringify(x).includes('score'),false)});
test('invalid rawHits rejected',()=>assert.equal(validate(actorA,null).reason,'INVALID_HITS'));
test('missing rawHits rejected',()=>assert.equal(validate(actorA,undefined).reason,'INVALID_HITS'));
test('non-row rejected',()=>no(actorA,[null],'INVALID_HITS'));
test('duplicate candidate same channel forbidden',()=>no(actorA,[hit(global),hit(global)],'INVALID_HITS'));
test('suggestion and embedding for same ON allowed',()=>{const x=ok(actorA,[hit(pA),hit(pA,'embedding')]);assert.equal(x.suggestions.length,1);assert.equal(x.embeddings.length,1)});
test('no mutation',()=>{const x=JSON.stringify(indexes);const h=[hit(global),hit(pA)];const y=JSON.stringify(h);ok(actorA,h);assert.equal(JSON.stringify(indexes),x);assert.equal(JSON.stringify(h),y)});
test('malformed source scope does not leak',()=>assert.equal(plan(actorA,[{...pB,scope:{kind:'global_system',ownerActorId:actorB}}]).ok,false));
test('private on_id is never listed by plan',()=>{const s=JSON.stringify(plan(actorA));assert.equal(s.includes(uid(1)),false)});
test('index with wrong published source hash is rejected',()=>assert.equal(plan(actorA,[{...pA,published_source_hash:otherhash}]).ok,false));
test('stale hit denied even if index ownership matches',()=>no(actorA,[hit(pA,'suggestion','ru',{index_id:'stale'})],'UNAUTHORIZED_RESULT',[idx('stale',scopePrivate(actorA),false)]));
test('empty allowed postsearch works',()=>{const x=ok(null,[]);assert.deepEqual(x.suggestions,[]);assert.deepEqual(x.embeddings,[])});
test('bad score out of range',()=>no(actorA,[hit(pA,'embedding','ru',{score:2})],'INVALID_HITS'));
test('bad score NaN',()=>no(actorA,[hit(pA,'embedding','ru',{score:NaN})],'INVALID_HITS'));
test('suggestion with score forbidden',()=>no(actorA,[hit(pA,'suggestion','ru',{score:0.2})],'INVALID_HITS'));
test('embedding with label forbidden',()=>no(actorA,[hit(pA,'embedding','ru',{label:'secret'})],'INVALID_HITS'));
test('empty suggestion forbidden',()=>no(actorA,[hit(pA,'suggestion','ru',{label:' '})],'INVALID_HITS'));
test('overlong suggestion forbidden',()=>no(actorA,[hit(pA,'suggestion','ru',{label:'x'.repeat(513)})],'INVALID_HITS'));
test('malformed uuid rejected',()=>no(actorA,[hit(pA,'suggestion','ru',{on_id:'bad'})],'INVALID_HITS'));
test('wrong locale rejected',()=>no(actorA,[hit(pA,'suggestion','fr')],'INVALID_HITS'));
test('unknown channel rejected',()=>no(actorA,[hit(pA,'bad')],'INVALID_HITS'));
test('forbidden result among valid results rejects whole response',()=>no(actorA,[hit(global),hit(pB,'embedding')],'UNAUTHORIZED_RESULT'));
for(const lang of ['en','pl','es','de','cs','uk','ru']){
 test(`${lang}: self suggestion returned`,()=>{const x=ok(actorA,[hit(pA,'suggestion',lang)]);assert.equal(x.suggestions[0].locale,lang)});
 test(`${lang}: self embedding returned`,()=>{const x=ok(actorA,[hit(pA,'embedding',lang)]);assert.equal(x.embeddings[0].locale,lang)});
 test(`${lang}: foreign suggestion denied`,()=>no(actorA,[hit(pB,'suggestion',lang)],'UNAUTHORIZED_RESULT'));
 test(`${lang}: foreign embedding denied`,()=>no(actorA,[hit(pB,'embedding',lang)],'UNAUTHORIZED_RESULT'));
 test(`${lang}: anonymous foreign suggestion denied`,()=>no(null,[hit(pA,'suggestion',lang)],'UNAUTHORIZED_RESULT'));
 test(`${lang}: anonymous global embedding returned`,()=>assert.equal(ok(null,[hit(global,'embedding',lang)]).embeddings.length,1));
}
for(const n of [0,1,2,3,5,8,13,21]){
 test(`catalogue permutation ${n}: access consistent`,()=>{const items=[global,pA,pB,pC].slice(0,n%5);const a=plan(actorA,items);const b=plan(actorA,[...items].reverse());assert.deepEqual(a,b)});
 test(`tenant B no tenant A leakage ${n}`,()=>{const a=ids(actorB,[...indexes].reverse());assert.equal(a.includes('private_a'),false)});
}
