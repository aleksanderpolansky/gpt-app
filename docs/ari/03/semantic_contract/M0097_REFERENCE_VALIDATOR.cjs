'use strict';
/* Reference-only validation/freeze for M0097; NOT connected to any production API. */
const fs = require('fs');
const path = require('path');
const schema = JSON.parse(fs.readFileSync(path.join(__dirname,'M0097_QUERY_REQUEST_SCHEMA_V1.json'),'utf8'));
function assert(x,why){if(!x)throw Error('QUERY_REQUEST_INVALID: '+why)}
function obj(v){return v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype}
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const uuid=/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
const code=/^[a-z][a-z0-9_:-]{0,63}$/;
function validateAndFreezeQueryRequest(v,{authenticated=false}={}) {
 assert(obj(v),'object required');
 const fields=['text','locale','actorScope','intent','limit','filters'];
 assert(Object.keys(v).length===fields.length&&fields.every(k=>own(v,k)),'exact six fields required; extra/omitted fields rejected');
 assert(typeof v.text==='string'&&v.text.trim()!==''&&[...v.text].length<=512&&!/[\u0000-\u001F\u007F]/.test(v.text),'text nonempty <=512 without controls');
 assert(typeof v.locale==='string'&&schema.properties.locale.enum.includes(v.locale),'unsupported locale');
 assert(typeof v.actorScope==='string'&&schema.properties.actorScope.enum.includes(v.actorScope),'unsupported scope');
 assert(v.actorScope==='global_only'||authenticated===true,'global_and_own requires a verified server actor');
 assert(typeof v.intent==='string'&&schema.properties.intent.enum.includes(v.intent),'unsupported intent');
 assert(Number.isInteger(v.limit)&&v.limit>=1&&v.limit<=20,'limit must be integer 1..20');
 assert(obj(v.filters),'filters must be object');
 const valid=Object.keys(schema.properties.filters.properties);
 assert(Object.keys(v.filters).every(k=>valid.includes(k)),'filters contain unknown or unauthorized key');
 const f={};
 for(const k of valid) if(own(v.filters,k)){
  const x=v.filters[k];
  if(k.endsWith('ObjectId')){assert(typeof x==='string'&&uuid.test(x),'invalid '+k);f[k]=x;}
  else{
   const max=k==='objectKindCodes'?12:8;
   assert(Array.isArray(x)&&x.length>=1&&x.length<=max&&x.every(y=>typeof y==='string'&&code.test(y))&&new Set(x).size===x.length,'invalid '+k);
   f[k]=Object.freeze([...x]);
  }
 }
 // This is defensive immutability for the validated VALUE; it is NOT an authorization decision.
 return Object.freeze({text:v.text,locale:v.locale,actorScope:v.actorScope,intent:v.intent,limit:v.limit,filters:Object.freeze(f)});
}
function selftest(){
 const basic={text:'Играть на гитаре',locale:'ru',actorScope:'global_only',intent:'suggest',limit:10,filters:{}};
 const a=validateAndFreezeQueryRequest(basic);
 assert(Object.isFrozen(a)&&Object.isFrozen(a.filters)&&a.text===basic.text,'frozen copy');
 const uuidv='123e4567-e89b-42d3-a456-426614174000';
 const own=validateAndFreezeQueryRequest({...basic,actorScope:'global_and_own',filters:{rootObjectId:uuidv,nodeRoleCodes:['leaf']}},{authenticated:true});
 assert(Object.isFrozen(own.filters.nodeRoleCodes)&&own.filters.rootObjectId===uuidv,'nested arrays frozen');
 const unknown=validateAndFreezeQueryRequest({...basic,locale:'und'});assert(unknown.locale==='und','unknown not English');
 const textUuid=validateAndFreezeQueryRequest({...basic,text:uuidv});assert(textUuid.intent==='suggest','UUID text does not auto-switch to UUID lookup');
 const invalid=[
  {...basic,text:'  '},{...basic,text:'a'.repeat(513)}, {...basic,text:'x\n'},
  {...basic,locale:'fr'}, {...basic,locale:'auto'}, {...basic,limit:0},{...basic,limit:21},{...basic,limit:'10'},
  {...basic,limit:1.5}, {...basic,actorScope:'global_and_own'},{...basic,actorScope:'all_users'},
  {...basic,intent:'vector'}, {...basic,ownerActorId:uuidv},{...basic,score:900},
  {...basic,filters:{ownerActorId:uuidv}}, {...basic,filters:{privacy_override:'public'}},
  {...basic,filters:{rootObjectId:'not-uuid'}},{...basic,filters:{objectKindCodes:[]}},
  {...basic,filters:{objectKindCodes:['x','x']}},{...basic,filters:{nodeRoleCodes:['leaf',null]}},
  {...basic,filters:null}, {...basic,filters:{nodeRoleCodes:['leaf'],extra:1}}
 ];
 for(const [i,v] of invalid.entries()){let rejected=false;try{validateAndFreezeQueryRequest(v)}catch{rejected=true}assert(rejected,'failed negative test '+i);}
 assert(JSON.stringify(schema.required)===JSON.stringify(['text','locale','actorScope','intent','limit','filters']),'schema shape parity');
 assert(schema.additionalProperties===false&&schema.properties.filters.additionalProperties===false,'schema fail closed');
 assert(schema.properties.limit.maximum===20&&schema.properties.text.maxLength===512,'schema bounds parity');
 console.log('M0097_VALIDATOR_SELFTEST_PASS: six fields, immutable copy, 7+unknown locales, tenant boundary, 22 negative tests');
}
module.exports={validateAndFreezeQueryRequest,selftest};
if(require.main===module)selftest();
