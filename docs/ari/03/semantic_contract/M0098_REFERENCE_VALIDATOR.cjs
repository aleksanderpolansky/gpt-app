'use strict';
/** M-0098 DESIGN-ONLY structural reference validator. Never authenticates a result. */
const assert=require('assert');
const SCHEMA=require('./M0098_SEARCH_RESULT_SCHEMA_V1.json');
const SNAP={catalog_snapshot_hash:'sha256:v1:e68d4c397e6d7286cc883c219470869d586933c98a66362be92886f88f16299f',translation_version:'derived-sha256-v1:b2b7110d065d5e215aeef7069cff8312a8553ba9d6f4b50febd3ae35bdb111c2'};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA=/^[a-f0-9]{64}$/;
const LOCALES=new Set(['en','pl','es','de','cs','uk','ru','und']);
const TYPES=new Set(['exact','alias','partial','lexical','vector','graph']);
const PSEUDO=new Set(['value_objects','concept_aliases','value_object_definition_versions','platform_localized_content_v1','derived_vector','derived_graph']);
const FIELDS=new Set(['title','description','definition','canonical_key','alias','path','negative_context']);
const SEM={exact:'exact_binary',alias:'alias_binary',partial:'partial_coverage',lexical:'lexical_bm25_raw',vector:'vector_cosine',graph:'graph_evidence_raw'};
function check(v,msg){if(!v)throw Error('M0098_RESULT_INVALID: '+msg)}
function obj(v,ks,where){check(v!==null&&typeof v==='object'&&!Array.isArray(v),where+' object');const keys=Object.keys(v);check(keys.length===ks.length&&keys.every(k=>ks.includes(k)),where+' extra/missing fields')}
function isString(s,min,max){return typeof s==='string'&&s.trim().length>=min&&s.length<=max&&s===s.trim()}
function validateResult(r){
 obj(r,['contract','queryLocale','outcome','candidates','clarificationQuestion','selectedObjectId','snapshot'],'result');
 check(r.contract==='ARCTOR_SEMANTIC_SEARCH_RESULT_V1','contract');
 check(LOCALES.has(r.queryLocale),'queryLocale');
 check(['single_candidate','ambiguous','no_match','blocked'].includes(r.outcome),'outcome');
 check(r.selectedObjectId===null,'no autonomous ON selection');
 check(Array.isArray(r.candidates)&&r.candidates.length<=20,'candidate count');
 obj(r.snapshot,['catalog_snapshot_hash','translation_version'],'snapshot');
 check(r.snapshot.catalog_snapshot_hash===SNAP.catalog_snapshot_hash&&r.snapshot.translation_version===SNAP.translation_version,'pinned snapshot');
 if(r.outcome==='single_candidate')check(r.candidates.length===1&&r.clarificationQuestion===null,'single outcome');
 if(r.outcome==='ambiguous')check(r.candidates.length>=2&&isString(r.clarificationQuestion,3,500),'ambiguity requires question and two candidates');
 if(['no_match','blocked'].includes(r.outcome))check(r.candidates.length===0&&r.clarificationQuestion===null,'empty/blocked must not leak');
 const ids=new Set(),ranks=new Set();
 for(const c of r.candidates){
  obj(c,['objectId','rank','match_class','displayTitle','displayLocale','displayEvidenceStatus','path','score','provenance','version'],'candidate');
  check(typeof c.objectId==='string'&&UUID.test(c.objectId),'UUID');
  check(Number.isInteger(c.rank)&&c.rank>=1&&c.rank<=20&&!ranks.has(c.rank),'rank');ranks.add(c.rank);
  check(!ids.has(c.objectId.toLowerCase()),'duplicate objectId');ids.add(c.objectId.toLowerCase());
  check(TYPES.has(c.match_class),'match_class');
  check(isString(c.displayTitle,1,256)&&LOCALES.has(c.displayLocale),'title and display locale');
  check(['source_verified','translation_verified'].includes(c.displayEvidenceStatus),'display proof');
  obj(c.path,['status','alternatives'],'path');
  check(['verified','unverified'].includes(c.path.status)&&Array.isArray(c.path.alternatives)&&c.path.alternatives.length<=5,'path status/arrays');
  if(c.path.status==='unverified')check(c.path.alternatives.length===0,'unverified path must remain empty');
  else {check(c.path.alternatives.length>=1,'verified path requires evidence');for(const p of c.path.alternatives){
   check(Array.isArray(p)&&p.length>0&&p.length<=15,'path length');const local=new Set();for(const s of p){
    obj(s,['objectId','title'],'path segment');check(UUID.test(s.objectId)&&isString(s.title,1,256),'path segment fields');
    check(!local.has(s.objectId.toLowerCase()),'path cycle');local.add(s.objectId.toLowerCase());
   } check(p[p.length-1].objectId.toLowerCase()===c.objectId.toLowerCase(),'path must end at candidate');
  }}
  obj(c.score,['value','semantics','status','calibrated','comparisonScope'],'score');
  check(c.score.semantics===SEM[c.match_class]&&c.score.calibrated===false&&c.score.comparisonScope==='within_match_class_only','score semantics/scale');
  check(['computed','not_computed'].includes(c.score.status),'score status');
  if(c.score.status==='not_computed')check(c.score.value===null,'unknown score must be null');
  else{const v=c.score.value;check(typeof v==='number'&&Number.isFinite(v),'computed score finite');
   if(['exact','alias'].includes(c.match_class))check(v===1,'binary exact/alias');
   if(c.match_class==='partial')check(v>=0&&v<=1,'partial coverage range');
   if(c.match_class==='vector')check(v>=-1&&v<=1,'cosine range');
   if(['lexical','graph'].includes(c.match_class))check(v>=0,'raw nonnegative');
  }
  const p=c.provenance;
  obj(p,['sourceTable','sourceField','sourceLocale','sourceVersion','sourceRecordHash','identityJoinVerified','scopeClass','serverAuthorizationVerified'],'provenance');
  check(PSEUDO.has(p.sourceTable)&&FIELDS.has(p.sourceField)&&LOCALES.has(p.sourceLocale),'source fields');
  check(p.sourceVersion===null||isString(p.sourceVersion,1,180),'source version');
  check(p.sourceRecordHash===null||(typeof p.sourceRecordHash==='string'&&SHA.test(p.sourceRecordHash)),'source hash');
  check(p.identityJoinVerified===true&&p.serverAuthorizationVerified===true,'verified join and server authorisation required');
  check(['global_public','owner_private'].includes(p.scopeClass),'scope');
  check(!(c.match_class==='alias'&&p.sourceTable!=='concept_aliases'),'alias provenance target');
  check(!(['derived_vector','derived_graph'].includes(p.sourceTable)&&!['vector','graph'].includes(c.match_class)),'derived source type');
  check(!(c.displayEvidenceStatus==='translation_verified'&&p.sourceTable!=='platform_localized_content_v1'),'translation identity source');
  check(!(c.displayEvidenceStatus==='translation_verified'&&p.sourceLocale!==c.displayLocale),'translation locale match');
  obj(c.version,['catalog_snapshot_hash','translation_version','definition_version'],'version');
  check(c.version.catalog_snapshot_hash===SNAP.catalog_snapshot_hash&&c.version.translation_version===SNAP.translation_version,'candidate version pinned');
  check(c.version.definition_version===null||(Number.isInteger(c.version.definition_version)&&c.version.definition_version>=1),'definition version');
 }
 for(let i=1;i<=r.candidates.length;i++)check(ranks.has(i),'ranks contiguous');
 return Object.freeze(JSON.parse(JSON.stringify(r)));
}
const ID1='11111111-1111-4111-8111-111111111111',ID2='22222222-2222-4222-8222-222222222222';
function makeCandidate(id=ID1,rank=1){return {objectId:id,rank,match_class:'exact',displayTitle:'Синтетический ОН',displayLocale:'ru',displayEvidenceStatus:'source_verified',path:{status:'unverified',alternatives:[]},score:{value:1,semantics:'exact_binary',status:'computed',calibrated:false,comparisonScope:'within_match_class_only'},provenance:{sourceTable:'value_objects',sourceField:'title',sourceLocale:'ru',sourceVersion:null,sourceRecordHash:null,identityJoinVerified:true,scopeClass:'global_public',serverAuthorizationVerified:true},version:{...SNAP,definition_version:null}}}
function makeSingle(){return {contract:'ARCTOR_SEMANTIC_SEARCH_RESULT_V1',queryLocale:'ru',outcome:'single_candidate',candidates:[makeCandidate()],clarificationQuestion:null,selectedObjectId:null,snapshot:{...SNAP}}}
function selftest(){
 const base=makeSingle();validateResult(base);
 const sample=[JSON.stringify(base),JSON.stringify(makeCandidate(ID2,2))];check(sample.length===2,'fixture sanity');
 const ambiguity=structuredClone(base);ambiguity.outcome='ambiguous';ambiguity.candidates.push(makeCandidate(ID2,2));ambiguity.clarificationQuestion='Какой именно объект вы имеете в виду?';validateResult(ambiguity);
 for(const status of ['no_match','blocked']){let a=structuredClone(base);a.outcome=status;a.candidates=[];validateResult(a)}
 const negative=[
  a=>{a.extra=true},a=>{a.outcome='ambiguous'},a=>{a.outcome='no_match'},a=>{a.selectedObjectId=ID1},
  a=>{a.snapshot.catalog_snapshot_hash='sha256:v1:fake'},a=>{a.queryLocale='fr'},a=>{a.candidates[0].objectId='not-a-uuid'},
  a=>{a.candidates[0].rank=0},a=>{a.candidates.push(makeCandidate(ID1,2))},a=>{a.candidates[0].match_class='fake'},
  a=>{a.candidates[0].score.semantics='vector_cosine'},a=>{a.candidates[0].score.value=0.8},
  a=>{a.candidates[0].score.value=null},a=>{a.candidates[0].score.calibrated=true},
  a=>{a.candidates[0].score.comparisonScope='cross_mode'},a=>{a.candidates[0].score.status='not_computed'},
  a=>{a.candidates[0].path.status='verified'},a=>{a.candidates[0].path.alternatives=[[{objectId:ID2,title:'Другой'}]]},
  a=>{a.candidates[0].provenance.serverAuthorizationVerified=false},a=>{a.candidates[0].provenance.identityJoinVerified=false},
  a=>{a.candidates[0].provenance.scopeClass='other_private'},a=>{a.candidates[0].provenance.sourceLocale='fr'},
  a=>{a.candidates[0].displayEvidenceStatus='translation_verified'},a=>{a.candidates[0].provenance.sourceRecordHash='abc'},
  a=>{a.candidates[0].version.definition_version=0},a=>{a.candidates[0].version.translation_version='changed'},
  a=>{a.candidates[0].provenance.privateOwnerId=ID2},a=>{a.candidates[0].displayTitle=' '},
  a=>{a.candidates[0].score.status='computed';a.candidates[0].score.value=NaN},
  a=>{a.candidates[0].match_class='alias';a.candidates[0].score.semantics='alias_binary'},
  a=>{a.candidates[0].match_class='vector';a.candidates[0].score.semantics='vector_cosine';a.candidates[0].score.value=1.5},
 ];
 for(let i=0;i<negative.length;i++){let a=structuredClone(base);negative[i](a);let failed=false;try{validateResult(a)}catch(e){failed=true}check(failed,'negative test '+(i+1)+' unexpectedly accepted')}
 check(SCHEMA.$schema==='https://json-schema.org/draft/2020-12/schema'&&SCHEMA.additionalProperties===false,'schema strict');
 console.log('M0098_REFERENCE_SELFTEST_PASS: '+negative.length+' negatives, four outcomes, pinned version and provenance gate');
 return {negativeTestCount:negative.length,positiveOutcomeCount:4};
}
if(require.main===module){try{selftest()}catch(e){console.error(e.stack);process.exitCode=1}}
module.exports={validateResult,selftest,makeSingle,makeCandidate,SNAP};
