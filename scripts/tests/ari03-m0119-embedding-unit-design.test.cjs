'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const ts=require(require.resolve('typescript',{paths:[process.cwd(),'/opt/nvm/versions/node/v22.16.0/lib/node_modules']}));
const source=process.env.ARCTOR_M0119_TEST_MODULE_PATH||path.join(process.cwd(),'src/lib/ontology-research/vectorRetrievalV1.ts');
const js=ts.transpileModule(fs.readFileSync(source,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const m=new Module(source,module);m.filename=source;m.paths=Module._nodeModulePaths(path.dirname(source));m._compile(js,source);
const {prepareEmbeddingUnitV1:f,VECTOR_LOCALES_V1, VECTOR_UNIT_CONTRACT_V1}=m.exports;
const id='11111111-2222-4333-8444-555555555555', other='66666666-7777-4888-8999-aaaaaaaaaaaa';
const scope={kind:'global_system'};
const approved=(value='Сон',locale='ru',extra={})=>({onId:id,locale,dictionaryVersion:'dict-1',value,sourceId:'src:alias-1',reviewStatus:'approved',...extra});
const base=(extra={})=>({onId:id,locale:'ru',ontologyVersion:'ont-1',dictionaryVersion:'dict-1',scope,
 title:{text:'Ночной сон',sourceId:'src:title',approved:true},
 definition:{text:'Период физиологического сна',sourceId:'src:def',approved:true},
 aliases:[approved()],...extra});
const good=d=>{const x=f(d);assert.equal(x.ok,true,JSON.stringify(x));return x.unit};
const bad=(d,code)=>assert.deepEqual(f(d),{ok:false,reason:code});
test('contract',()=>assert.equal(good(base()).contract,VECTOR_UNIT_CONTRACT_V1));
test('seven locales exactly',()=>assert.deepEqual(VECTOR_LOCALES_V1,['en','pl','es','de','cs','uk','ru']));
test('approved alias included',()=>assert.deepEqual(good(base()).approvedAliases,['Сон']));
test('embedding payload has exact approved content keys',()=>assert.deepEqual(JSON.parse(good(base()).textForEmbedding),{title:'Ночной сон',definition:'Период физиологического сна',approvedAliases:['Сон']}));
test('no embedding generated',()=>assert.equal(good(base()).generatedEmbeddings,false));
test('caller requires authorization',()=>assert.equal(good(base()).requiresOwnerAuthorizationAtCaller,true));
test('source ids recorded',()=>assert.deepEqual(good(base()).sourceIds,['src:alias-1','src:def','src:title']));
test('stable input gives stable identity and text',()=>assert.deepEqual(good(base()),good(base())));
test('stable alias order',()=>assert.deepEqual(good(base({aliases:[approved('Я'),approved('А')]})),good(base({aliases:[approved('А'),approved('Я')]}))));
test('exact duplicates collapsed',()=>assert.deepEqual(good(base({aliases:[approved(),approved()]})).approvedAliases,['Сон']));
test('title whitespace normalized',()=>assert.equal(good(base({title:{text:' Ночной   сон\n',sourceId:'src:title',approved:true}})).title,'Ночной сон'));
test('definition whitespace normalized',()=>assert.equal(good(base({definition:{text:' A   B\tC ',sourceId:'src:def',approved:true}})).definition,'A B C'));
test('alias NFC normalized',()=>assert.deepEqual(good(base({aliases:[approved('е\u0308лка')]})).approvedAliases,['ёлка']));
test('nonapproved pending excluded',()=>assert.deepEqual(good(base({aliases:[approved('X','ru',{reviewStatus:'pending'})]})).approvedAliases,[]));
test('nonapproved rejected excluded',()=>assert.deepEqual(good(base({aliases:[approved('X','ru',{reviewStatus:'rejected'})]})).approvedAliases,[]));
test('revoked excluded',()=>assert.deepEqual(good(base({aliases:[approved('X','ru',{reviewStatus:'revoked'})]})).approvedAliases,[]));
test('other locale excluded',()=>assert.deepEqual(good(base({aliases:[approved('Sleep','en')]})).approvedAliases,[]));
test('no aliases is valid draft',()=>assert.deepEqual(good(base({aliases:[]})).approvedAliases,[]));
test('source for excluded alias not leaked',()=>assert.deepEqual(good(base({aliases:[approved('X','ru',{reviewStatus:'pending',sourceId:'src:secret'})]})).sourceIds,['src:def','src:title']));
test('different uuid blocked',()=>bad(base({aliases:[approved('X','ru',{onId:other})]}),'ALIAS_SCOPE_CONFLICT'));
test('different uuid blocked even if different locale',()=>bad(base({aliases:[approved('X','en',{onId:other})]}),'ALIAS_SCOPE_CONFLICT'));
test('approved cross-version alias blocked',()=>bad(base({aliases:[approved('X','ru',{dictionaryVersion:'dict-2'})]}),'ALIAS_VERSION_CONFLICT'));
test('unapproved cross-version alias not used',()=>assert.deepEqual(good(base({aliases:[approved('X','ru',{dictionaryVersion:'dict-2',reviewStatus:'pending'})]})).approvedAliases,[]));
test('missing title blocked',()=>bad(base({title:{text:'',sourceId:'src:title',approved:true}}),'MISSING_TITLE'));
test('missing definition blocked',()=>bad(base({definition:{text:' ',sourceId:'src:def',approved:true}}),'MISSING_DEFINITION'));
test('missing title record blocked',()=>bad(base({title:null}),'MISSING_TITLE'));
test('missing definition record blocked',()=>bad(base({definition:null}),'MISSING_DEFINITION'));
test('unapproved title blocked',()=>bad(base({title:{text:'X',sourceId:'src:title',approved:false}}),'TITLE_NOT_APPROVED'));
test('unapproved definition blocked',()=>bad(base({definition:{text:'X',sourceId:'src:def',approved:false}}),'DEFINITION_NOT_APPROVED'));
test('missing title source blocked',()=>bad(base({title:{text:'X',sourceId:'',approved:true}}),'INVALID_SOURCE'));
test('missing definition source blocked',()=>bad(base({definition:{text:'X',sourceId:'',approved:true}}),'INVALID_SOURCE'));
test('invalid uuid blocked',()=>bad(base({onId:'not-a-uuid'}),'INVALID_UUID'));
test('invalid locale blocked',()=>bad(base({locale:'fr'}),'INVALID_LOCALE'));
test('invalid ontology version blocked',()=>bad(base({ontologyVersion:'invalid version'}),'INVALID_VERSION'));
test('invalid dictionary version blocked',()=>bad(base({dictionaryVersion:''}),'INVALID_VERSION'));
test('invalid scope blocked',()=>bad(base({scope:{kind:'shared_unknown'}}),'INVALID_SCOPE'));
test('private scope without owner blocked',()=>bad(base({scope:{kind:'owner_private'}}),'INVALID_SCOPE'));
test('private scope with valid owner',()=>assert.equal(good(base({scope:{kind:'owner_private',ownerActorId:other}})).scope.ownerActorId,other));
test('private scope has different identity',()=>assert.notEqual(good(base()).identity,good(base({scope:{kind:'owner_private',ownerActorId:other}})).identity));
test('different ontology versions separate identity',()=>assert.notEqual(good(base()).identity,good(base({ontologyVersion:'ont-2'})).identity));
test('different dictionary versions separate identity',()=>assert.notEqual(good(base()).identity,good(base({dictionaryVersion:'dict-2',aliases:[]})).identity));
test('different UUID separate identity',()=>assert.notEqual(good(base()).identity,good(base({onId:other,aliases:[]})).identity));
test('control characters blocked in title',()=>bad(base({title:{text:'X\u0001Y',sourceId:'src:title',approved:true}}),'INVALID_CONTROL_CHARACTER'));
test('control characters blocked in definition',()=>bad(base({definition:{text:'X\u0002Y',sourceId:'src:def',approved:true}}),'INVALID_CONTROL_CHARACTER'));
test('control characters blocked in approved alias',()=>bad(base({aliases:[approved('X\u0003Y')]}),'INVALID_CONTROL_CHARACTER'));
test('line delimiter text safely JSON-encoded',()=>assert.equal(JSON.parse(good(base({aliases:[approved('Alias\nDefinition: injected')]})).textForEmbedding).approvedAliases[0],'Alias Definition: injected'));
test('invalid alias source blocked',()=>bad(base({aliases:[approved('X','ru',{sourceId:'unsafe source'})]}),'ALIAS_RECORD_INVALID'));
test('blank approved alias blocked',()=>bad(base({aliases:[approved('   ')]}),'ALIAS_RECORD_INVALID'));
test('invalid alias status blocked',()=>bad(base({aliases:[approved('X','ru',{reviewStatus:'unknown'})]}),'ALIAS_RECORD_INVALID'));
test('null alias blocked',()=>bad(base({aliases:[null]}),'ALIAS_RECORD_INVALID'));
test('too many incoming aliases blocked',()=>bad(base({aliases:Array.from({length:251},()=>approved())}),'TOO_MANY_ALIASES'));
test('too many unique aliases blocked',()=>bad(base({aliases:Array.from({length:101},(_,i)=>approved('X'+i))}),'TOO_MANY_ALIASES'));
test('definition too long blocked',()=>bad(base({definition:{text:'x'.repeat(8001),sourceId:'src:def',approved:true}}),'TEXT_TOO_LONG'));
test('title too long blocked',()=>bad(base({title:{text:'x'.repeat(513),sourceId:'src:title',approved:true}}),'TEXT_TOO_LONG'));
test('non-array aliases blocked',()=>bad(base({aliases:null}),'INVALID_INPUT'));
test('locale changes identity',()=>assert.notEqual(good(base({aliases:[]})).identity,good(base({locale:'uk',aliases:[]})).identity));
const examples={en:'Sleep',pl:'Zażółć',es:'Niñez',de:'Straße',cs:'Český',uk:'П’ять',ru:'Ёж'};
for(const [locale,label] of Object.entries(examples)) {
 test('locale '+locale+' retains accents and verified alias',()=>{
  const r=good(base({locale,aliases:[approved(label,locale)]}));assert.deepEqual(r.approvedAliases,[label]);assert.equal(r.locale,locale);
 });
}
test('different owners separate embedding identities',()=>assert.notEqual(
 good(base({scope:{kind:'owner_private',ownerActorId:other}})).identity,
 good(base({scope:{kind:'owner_private',ownerActorId:id}})).identity));
test('case sensitive aliases not silently merged',()=>assert.deepEqual(good(base({aliases:[approved('Bank'),approved('bank')]})).approvedAliases,['Bank','bank']));
test('no semantically broader relation exists in payload',()=>assert.equal(good(base()).textForEmbedding.includes('broader'),false));
test('UUID does not appear in embedding text',()=>assert.equal(good(base()).textForEmbedding.includes(id),false));
