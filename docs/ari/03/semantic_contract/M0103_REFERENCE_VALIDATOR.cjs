'use strict';
/** ARCTor M0103 synthetic design validator; no actual API/SQL/authorization. */
const fs=require('fs'),path=require('path'),assert=require('assert');
const SPEC=require('./M0103_DIAGNOSTIC_RESPONSE_SCHEMA_V1.json');
const R=new Set(['NO_VERIFIED_DIRECT_MATCH','NO_VERIFIED_ALIAS','NOT_EVALUATED_LIMIT','UNSUPPORTED_TOKENIZATION','NO_VERIFIED_LOCALE_TEXT']);
const MAP={exact:'VERIFIED_STRICT_TITLE',alias:'VERIFIED_FULL_ALIAS',partial:'VERIFIED_PARTIAL_TITLE',lexical:'VERIFIED_LEXICAL_TITLE',ancestor_expansion:'VERIFIED_STRUCTURAL_ANCESTOR'};
const allowed=new Set(['mode','query','outcome','diagnosticsStatus','unresolvedTokens','candidateRationales','selectionState','catalogSnapshotHash','translationVersion']);
const u='9c5f36ad-7ac2-42bb-a028-81ca92498130';
const hash='sha256:v1:e68d4c397e6d7286cc883c219470869d586933c98a66362be92886f88f16299f';
const trans='derived-sha256-v1:b2b7110d065d5e215aeef7069cff8312a8553ba9d6f4b50febd3ae35bdb111c2';
const safeExpl=new Set(['verified full title','verified full alias','verified partial title','verified lexical title','verified structural ancestor']);
const check=(x,m)=>{if(!x)throw new Error('M0103_REJECT '+m)};
function validate(x){
 check(x&&typeof x==='object'&&!Array.isArray(x),'root object');check(Object.keys(x).sort().join('|')===[...allowed].sort().join('|'),'extra/missing root fields');
 check(x.mode==='suggest_by_text','only text mode');
 check(x.query&&Object.keys(x.query).sort().join('|')==='locale|text','query fields');
 check(typeof x.query.text==='string'&&x.query.text.trim()&&x.query.text.length<=512,'query text');
 check(['en','pl','es','de','cs','uk','ru','und'].includes(x.query.locale),'locale');
 check(['candidate','ambiguous','no_match','blocked'].includes(x.outcome),'outcome');
 check(['complete','partial','unavailable'].includes(x.diagnosticsStatus),'diagnosticsStatus');
 check(x.selectionState==='UNCONFIRMED','selection');
 check(x.catalogSnapshotHash===hash&&x.translationVersion===trans,'pinned snapshot');
 check(Array.isArray(x.unresolvedTokens)&&x.unresolvedTokens.length<=32,'unresolved limit');
 check(Array.isArray(x.candidateRationales)&&x.candidateRationales.length<=20,'rationale limit');
 const original=x.query.text,seen=[];
 for(const t of x.unresolvedTokens){
  check(t&&Object.keys(t).sort().join('|')==='endUtf16|reason|startUtf16|text','token fields');
  check(typeof t.text==='string'&&t.text.length>0&&t.text.length<=128,'token text');
  check(Number.isInteger(t.startUtf16)&&Number.isInteger(t.endUtf16)&&t.startUtf16>=0&&t.endUtf16>t.startUtf16&&t.endUtf16<=original.length,'utf16 bounds');
  check(original.slice(t.startUtf16,t.endUtf16)===t.text,'utf16 integrity');
  check(R.has(t.reason),'unresolved reason');
  check(!seen.some(([a,b])=>t.startUtf16<b&&t.endUtf16>a),'overlapping token');seen.push([t.startUtf16,t.endUtf16]);
  if(t.reason==='NOT_EVALUATED_LIMIT'||t.reason==='UNSUPPORTED_TOKENIZATION')check(x.diagnosticsStatus!=='complete','incomplete cannot claim complete');
 }
 const ids=new Set();
 for(const c of x.candidateRationales){
  check(c&&typeof c==='object'&&!Array.isArray(c),'candidate object');
  const keys=Object.keys(c).sort().join('|');
  check(keys==='authorizationVerified|matchClass|reasonCode|safeExplanation|selectionState|sourceVerified|valueObjectId'||keys==='ancestorDepth|authorizationVerified|matchClass|reasonCode|safeExplanation|selectionState|sourceVerified|valueObjectId','candidate fields');
  check(/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(c.valueObjectId),'uuid');
  check(!ids.has(c.valueObjectId),'duplicate uuid');ids.add(c.valueObjectId);
  check(c.authorizationVerified===true&&c.sourceVerified===true,'verified gates');
  check(typeof MAP[c.matchClass]==='string'&&MAP[c.matchClass]===c.reasonCode,'mapping');
  check(safeExpl.has(c.safeExplanation),'bounded safe reason enum');
  check(c.safeExplanation===({exact:'verified full title',alias:'verified full alias',partial:'verified partial title',lexical:'verified lexical title',ancestor_expansion:'verified structural ancestor'})[c.matchClass],'reason text mismatch');
  check(c.selectionState==='UNCONFIRMED','candidate not selected');
  if(c.matchClass==='ancestor_expansion')check(Number.isInteger(c.ancestorDepth)&&c.ancestorDepth>=1&&c.ancestorDepth<=3,'ancestor depth');
  else check(!Object.prototype.hasOwnProperty.call(c,'ancestorDepth'),'nonancestor depth');
 }
 if(x.outcome==='blocked')check(x.diagnosticsStatus==='unavailable'&&x.unresolvedTokens.length===0&&x.candidateRationales.length===0,'blocked leak');
 if(x.outcome==='no_match')check(x.candidateRationales.length===0,'no match candidates');
 if(x.outcome==='ambiguous')check(x.candidateRationales.length>=2,'ambiguous candidates');
 if(x.outcome==='candidate')check(x.candidateRationales.length>=1,'candidate absent');
 if(x.diagnosticsStatus==='unavailable')check(x.unresolvedTokens.length===0,'unavailable leaked tokens');
 return true;
}
function fixture(){return {mode:'suggest_by_text',query:{text:'ночной сон xyz',locale:'ru'},outcome:'candidate',diagnosticsStatus:'complete',unresolvedTokens:[{text:'xyz',startUtf16:11,endUtf16:14,reason:'NO_VERIFIED_DIRECT_MATCH'}],candidateRationales:[{valueObjectId:u,sourceVerified:true,authorizationVerified:true,matchClass:'exact',reasonCode:'VERIFIED_STRICT_TITLE',safeExplanation:'verified full title',selectionState:'UNCONFIRMED'}],selectionState:'UNCONFIRMED',catalogSnapshotHash:hash,translationVersion:trans}}
const clone=x=>JSON.parse(JSON.stringify(x));
function selftest(){
 check(SPEC['x-contract']==='ARCTOR_ARI_M0103_DIAGNOSTIC_RATIONALE_DESIGN_V1'&&SPEC.additionalProperties===false,'schema contract');
 check(SPEC.properties.unresolvedTokens.maxItems===32&&SPEC.properties.candidateRationales.maxItems===20,'limits');
 for(const [k,v] of Object.entries(SPEC['x-invariants']))check(v===true,'invariant '+k);
 let cases=0,negative=0;
 function pass(x){validate(x);cases++}function reject(x){let threw=false;try{validate(x)}catch{threw=true}assert(threw,'accepted invalid fixture');negative++}
 const base=fixture();pass(base);
 const blocked=clone(base);blocked.outcome='blocked';blocked.diagnosticsStatus='unavailable';blocked.unresolvedTokens=[];blocked.candidateRationales=[];pass(blocked);
 const no=clone(base);no.outcome='no_match';no.candidateRationales=[];pass(no);
 const amb=clone(base);amb.outcome='ambiguous';amb.candidateRationales.push({...amb.candidateRationales[0],valueObjectId:'4b709750-e257-4411-b6b4-acd4bb3478d4'});pass(amb);
 const part=clone(base);part.diagnosticsStatus='partial';part.unresolvedTokens[0].reason='NOT_EVALUATED_LIMIT';pass(part);
 const ancestor=clone(base);ancestor.candidateRationales[0]={...base.candidateRationales[0],matchClass:'ancestor_expansion',reasonCode:'VERIFIED_STRUCTURAL_ANCESTOR',safeExplanation:'verified structural ancestor',ancestorDepth:2};pass(ancestor);
 const unicode=clone(base);unicode.query.text='🧠 ёлка';unicode.unresolvedTokens=[{text:'ёлка',startUtf16:3,endUtf16:7,reason:'NO_VERIFIED_ALIAS'}];pass(unicode);
 const mutations=[
 x=>x.mode='exact_uuid_lookup',x=>x.query.locale='fr',x=>x.query.text='',x=>x.query.text='x'.repeat(513),x=>x.query.extra=1,
 x=>x.extra='yes',x=>delete x.unresolvedTokens,x=>x.selectionState='CONFIRMED',x=>x.outcome='selected',x=>x.diagnosticsStatus='verified',
 x=>x.catalogSnapshotHash='sha256:v1:'+'0'.repeat(64),x=>x.translationVersion='official-v1',x=>x.unresolvedTokens[0].text='sensitive',
 x=>x.unresolvedTokens[0].startUtf16=-1,x=>x.unresolvedTokens[0].endUtf16=100,x=>x.unresolvedTokens[0].reason='MISSING_IN_DB',
 x=>x.unresolvedTokens[0].other='a',x=>x.unresolvedTokens.push({...x.unresolvedTokens[0]}),x=>x.unresolvedTokens=[...Array(33)].map(()=>x.unresolvedTokens[0]),
 x=>x.candidateRationales[0].authorizationVerified=false,x=>x.candidateRationales[0].sourceVerified=false,x=>x.candidateRationales[0].matchClass='vector',
 x=>x.candidateRationales[0].reasonCode='VERIFIED_FULL_ALIAS',x=>x.candidateRationales[0].safeExplanation='Private owner 123',
 x=>x.candidateRationales[0].selectionState='CONFIRMED',x=>x.candidateRationales[0].valueObjectId='secret',
 x=>x.candidateRationales[0].score=0.99,x=>x.candidateRationales.push({...x.candidateRationales[0]}),
 x=>x.candidateRationales=[...Array(21)].map((_,i)=>({...x.candidateRationales[0],valueObjectId:`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`})),
 x=>x.candidateRationales[0].ancestorDepth=2,
 x=>{x.diagnosticsStatus='complete';x.unresolvedTokens[0].reason='NOT_EVALUATED_LIMIT'},
 x=>{x.outcome='blocked'},x=>{x.outcome='no_match'},x=>{x.outcome='ambiguous'},x=>{x.diagnosticsStatus='unavailable'},
 x=>{x.candidateRationales[0].matchClass='ancestor_expansion';x.candidateRationales[0].reasonCode='VERIFIED_STRUCTURAL_ANCESTOR';x.candidateRationales[0].safeExplanation='verified structural ancestor'},
 x=>{x.candidateRationales[0].matchClass='alias';x.candidateRationales[0].reasonCode='VERIFIED_FULL_ALIAS'},
 x=>{x.unresolvedTokens[0].startUtf16=10},
 ];
 for(const mutate of mutations){const x=clone(base);mutate(x);reject(x)}
 const prev=require('./M0102_REFERENCE_VALIDATOR.cjs').selftest();
 const p101=require('./M0101_REFERENCE_VALIDATOR.cjs').selftest();
 const p100=require('./M0100_REFERENCE_VALIDATOR.cjs').selftest();
 const p99=require('./M0099_REFERENCE_VALIDATOR.cjs').selftest();
 const p98=require('./M0098_REFERENCE_VALIDATOR.cjs').selftest();
 const p97=require('./M0097_REFERENCE_VALIDATOR.cjs').selftest();
 return {negativeTestCount:negative,positiveInvariantCount:cases,previousNegativeTestCount:prev.negativeTestCount,priorSelftests:['M0097','M0098','M0099','M0100','M0101','M0102'],schemaContract:SPEC['x-contract']};
}
if(require.main===module){try{console.log('M0103_REFERENCE_SELFTEST_PASS',JSON.stringify(selftest()))}catch(e){console.error(e.stack);process.exitCode=1}}
module.exports={validate,selftest,fixture};
