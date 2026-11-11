'use strict';
/** M0099 reference-only dispatch: no database access, no security proof. */
const Q=require('./M0097_REFERENCE_VALIDATOR.cjs');
const R=require('./M0098_REFERENCE_VALIDATOR.cjs');
const SCHEMA=require('./M0099_SEARCH_DISPATCH_SCHEMA_V1.json');
const UUID=/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
const LOCALES=new Set(['en','pl','es','de','cs','uk','ru','und']);
const SCOPES=new Set(['global_only','global_and_own']);
const ID='123e4567-e89b-42d3-a456-426614174000';
const fail=(s)=>{throw Error('M0099_INVALID: '+s)};
const ok=(x,s)=>{if(!x)fail(s)};
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
function keys(o,fields,at){ok(plain(o),at+' object');ok(Object.keys(o).length===fields.length&&fields.every(x=>Object.hasOwn(o,x)),at+' exact fields');}
function request(x,{authenticated=false}={}) {
 ok(plain(x),'request object');
 if(x.mode==='exact_uuid_lookup') {
  keys(x,['mode','objectId','locale','actorScope'],'exact request');
  ok(typeof x.objectId==='string'&&UUID.test(x.objectId),'canonical UUID string');
  ok(LOCALES.has(x.locale)&&SCOPES.has(x.actorScope),'locale/scope');
  ok(x.actorScope==='global_only'||authenticated===true,'private scope needs verified server identity');
  return Object.freeze({mode:x.mode,objectId:x.objectId.toLowerCase(),locale:x.locale,actorScope:x.actorScope});
 }
 if(x.mode==='suggest_by_text') {
  keys(x,['mode','query'],'suggest request');
  const q=Q.validateAndFreezeQueryRequest(x.query,{authenticated});
  return Object.freeze({mode:x.mode,query:q});
 }
 fail('explicit mode required; no automatic UUID or textual fallback');
}
function response(x,{requestMode}={}) {
 ok(plain(x),'response object');
 ok(x.mode===requestMode,'mode response mismatch');
 if(x.mode==='exact_uuid_lookup') {
  keys(x,['mode','outcome','objectId','selectedObjectId','serverAuthorizationVerified','identityJoinVerified'],'exact response');
  ok(['found','not_available'].includes(x.outcome),'exact status');
  ok(x.selectedObjectId===null&&x.serverAuthorizationVerified===true&&x.identityJoinVerified===true,'server gates');
  if(x.outcome==='found')ok(typeof x.objectId==='string'&&UUID.test(x.objectId),'found UUID');
  else ok(x.objectId===null,'no existence leakage');
  return Object.freeze({...x});
 }
 if(x.mode==='suggest_by_text') {
  keys(x,['mode','searchResult'],'suggest response');
  const s=R.validateResult(x.searchResult);
  return Object.freeze({mode:x.mode,searchResult:s});
 }
 fail('unknown response mode');
}
function simulateDispatch(req,{authenticated=false}={}) { const r=request(req,{authenticated});return r.mode; }
function selftest() {
 Q.selftest();R.selftest();
 const qt={text:'Прогулка с ребёнком',locale:'ru',actorScope:'global_only',intent:'suggest',limit:5,filters:{}};
 const exact={mode:'exact_uuid_lookup',objectId:ID,locale:'ru',actorScope:'global_only'};
 const suggest={mode:'suggest_by_text',query:qt};
 ok(simulateDispatch(exact)==='exact_uuid_lookup'&&simulateDispatch(suggest)==='suggest_by_text','explicit mode routing');
 ok(simulateDispatch({mode:'suggest_by_text',query:{...qt,text:ID}})==='suggest_by_text','uuid text stays text');
 ok(request({...exact,actorScope:'global_and_own'},{authenticated:true}).actorScope==='global_and_own','private scope server gated');
 ok(request({...suggest,query:{...qt,actorScope:'global_and_own'}},{authenticated:true}).query.actorScope==='global_and_own','text private scope server gated');
 const goodExact={mode:'exact_uuid_lookup',outcome:'found',objectId:ID,selectedObjectId:null,serverAuthorizationVerified:true,identityJoinVerified:true};
 const unavailable={...goodExact,outcome:'not_available',objectId:null};
 const result={mode:'suggest_by_text',searchResult:R.makeSingle()};
 response(goodExact,{requestMode:'exact_uuid_lookup'});response(unavailable,{requestMode:'exact_uuid_lookup'});response(result,{requestMode:'suggest_by_text'});
 for(const s of ['ambiguous','no_match','blocked']){ const x=structuredClone(result);x.searchResult.outcome=s;
   if(s==='ambiguous'){x.searchResult.candidates.push(R.makeCandidate('22222222-2222-4222-8222-222222222222',2));x.searchResult.clarificationQuestion='Какой из объектов имеется в виду?';}
   else x.searchResult.candidates=[];
   response(x,{requestMode:'suggest_by_text'});
 }
 const badReq=[
  {...exact,mode:'wrong'},{...exact,objectId:'not-a-uuid'},{...exact,objectId:''},
  {...exact,query:qt},{...exact,ownerId:ID},{...exact,actorScope:'all_users'},
  {...exact,actorScope:'global_and_own'},{...exact,locale:'fr'},
  {...exact,objectId:ID+' '},{...exact,objectId:42},
  {...suggest,objectId:ID},{...suggest,ownerActorId:ID},{...suggest,query:{...qt,limit:21}},
  {...suggest,query:{...qt,locale:'auto'}},{...suggest,query:{...qt,actorScope:'global_and_own'}},
  {...suggest,query:{...qt,filters:{ownerId:ID}}},{...suggest,query:{...qt,text:''}},
  {...suggest,query:{...qt,extra:'x'}},{mode:'suggest_by_text',text:'hi'},
  {objectId:ID,locale:'ru',actorScope:'global_only'},
 ];
 const badResponses=[
  {...goodExact,outcome:'not_available'},{...unavailable,objectId:ID},
  {...goodExact,selectedObjectId:ID},{...goodExact,serverAuthorizationVerified:false},
  {...goodExact,identityJoinVerified:false},{...goodExact,ownerId:ID},
  {...goodExact,mode:'suggest_by_text'},{...goodExact,outcome:'ambiguous'},
  {...goodExact,objectId:'junk'},{...result,objectId:ID},
  {...result,searchResult:{...result.searchResult,selectedObjectId:ID}},
  {...result,searchResult:{...result.searchResult,outcome:'ambiguous'}},
 ];
 for(let i=0;i<badReq.length;i++){let failed=false;try{request(badReq[i])}catch{failed=true}ok(failed,'request negative '+i);}
 for(let i=0;i<badResponses.length;i++){let failed=false;try{response(badResponses[i],{requestMode:i===6?'exact_uuid_lookup':i>=9?'suggest_by_text':'exact_uuid_lookup'})}catch{failed=true}ok(failed,'response negative '+i);}
 ok(SCHEMA.$schema==='https://json-schema.org/draft/2020-12/schema'&&SCHEMA.oneOf.length===2,'schema strict union');
 ok(SCHEMA.$defs.exactRequest.additionalProperties===false&&SCHEMA.$defs.suggestRequest.additionalProperties===false,'schema fail closed');
 ok(SCHEMA.$defs.queryRequest.properties.limit.maximum===20,'M0097 retained');
 ok(SCHEMA.$defs.searchResult.properties.selectedObjectId.type==='null','M0098 retained');
 const count=badReq.length+badResponses.length;
 console.log('M0099_REFERENCE_SELFTEST_PASS: 2 explicit dispatch modes, '+count+' negatives, found/not_available + 4 suggest outcomes; no automatic UUID fallback');
 return {negativeTestCount:count,positiveScenarioCount:9,modeCount:2};
}
if(require.main===module){try{selftest()}catch(e){console.error(e.stack);process.exitCode=1}}
module.exports={request,response,simulateDispatch,selftest};
