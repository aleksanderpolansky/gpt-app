'use strict';
/** Autonomous design-only reference scenarios. No DB/HTTP/Git writes. */
const prior=require('./M0100_REFERENCE_VALIDATOR.cjs');
const S=require('./M0101_FULL_PHRASE_PRIORITY_SCHEMA_V1.json');
const assert=(condition,reason)=>{if(!condition)throw Error('M0101_TEST_FAIL: '+reason)};
const UUIDS=[
 '123e4567-e89b-42d3-a456-426614174000',
 '123e4567-e89b-42d3-a456-426614174001',
 '123e4567-e89b-42d3-a456-426614174002',
 '123e4567-e89b-42d3-a456-426614174003'
];
const TYPES=['strict_title_full_phrase','strict_alias_full_phrase','token_partial','lexical_partial','soft_fold_candidate','other_retrieval_candidate'];
const LANG=['en','pl','es','de','cs','uk','ru','und'];
const topLevel=['mode','query','eligibleCandidates','priorityRule','selectionState'];
const isRecord=x=>x&&typeof x==='object'&&!Array.isArray(x);
const fullStrict=(txt,locale)=>prior.keys({text:txt,locale,mode:'suggest_by_text'}).strictKey;
function input(o){
 assert(isRecord(o)&&Object.keys(o).every(k=>topLevel.includes(k))&&topLevel.every(k=>Object.hasOwn(o,k)),'shape');
 assert(o.mode==='suggest_by_text'&&o.priorityRule==='FULL_STRICT_TITLE_THEN_VERIFIED_FULL_ALIAS_BEFORE_TOKEN_OR_PARTIAL'&&o.selectionState==='UNCONFIRMED','fixed rules');
 assert(isRecord(o.query)&&Object.keys(o.query).length===2&&typeof o.query.text==='string'&&LANG.includes(o.query.locale),'query');
 fullStrict(o.query.text,o.query.locale);
 assert(Array.isArray(o.eligibleCandidates)&&o.eligibleCandidates.length<=20,'candidates list');
 for(const c of o.eligibleCandidates){
  assert(isRecord(c)&&Object.keys(c).length===6,'candidate keys');
  assert(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(c.valueObjectId),'uuid');
  assert(TYPES.includes(c.evidenceClass),'evidence class');
  for(const k of ['authorizationVerified','sourceVerified','localeVerified','activeVerified'])assert(c[k]===true,'verification gate '+k);
 }
 return o;
}
// Simulated candidates represent already authorized, active, locale/source-verified ONs.
function rank(req,candidates){
 const strict=fullStrict(req.text,req.locale);
 const q=strict.slice(strict.indexOf('::')+2);
 assert(Array.isArray(candidates),'candidates');
 const result=[];
 for(const c of candidates){
  if(!c.authorized||!c.active||!c.sourceVerified||!c.localeVerified||c.locale!==req.locale)continue;
  let evidenceClass='other_retrieval_candidate',tier=5;
  if(typeof c.title==='string'&&fullStrict(c.title,c.locale)===strict){evidenceClass='strict_title_full_phrase';tier=0;}
  else if(c.aliasTargetVerified&&typeof c.alias==='string'&&fullStrict(c.alias,c.locale)===strict){evidenceClass='strict_alias_full_phrase';tier=1;}
  else if(typeof c.title==='string'){
   const text=fullStrict(c.title,c.locale).split('::').slice(1).join('::');
   const qt=q.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
   const ct=text.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
   if(qt.some(x=>ct.includes(x))){evidenceClass='token_partial';tier=2;}
   else if(text.includes(q)||q.includes(text)){evidenceClass='lexical_partial';tier=3;}
   else if(c.softOnly===true){evidenceClass='soft_fold_candidate';tier=4;}
  }
  result.push({...c,evidenceClass,tier});
 }
 result.sort((a,b)=>a.tier-b.tier||a.id.localeCompare(b.id));
 const fullIds=new Set(result.filter(c=>c.tier<=1).map(c=>c.id));
 return {candidates:result,outcome:!result.length?'no_match':fullIds.size>1?'clarification_required':'ranked_unconfirmed',selectedObjectId:null,clarificationRequired:fullIds.size>1};
}
function selftest(){
 const p=prior.selftest();assert(p.negativeTestCount===29&&p.positiveInvariantCount>=24,'M0100 guard');
 const orig={mode:'suggest_by_text',query:{text:'продолжительность сна',locale:'ru'},eligibleCandidates:[],priorityRule:'FULL_STRICT_TITLE_THEN_VERIFIED_FULL_ALIAS_BEFORE_TOKEN_OR_PARTIAL',selectionState:'UNCONFIRMED'};
 const C=(id,evidenceClass)=>({valueObjectId:id,evidenceClass,authorizationVerified:true,sourceVerified:true,localeVerified:true,activeVerified:true});
 input(orig);TYPES.forEach(t=>input({...orig,eligibleCandidates:[C(UUIDS[0],t)]}));
 const make=(id,title,other={})=>({id,title,locale:'ru',authorized:true,active:true,sourceVerified:true,localeVerified:true,...other});
 let r=rank(orig.query,[make(UUIDS[0],'Сна'),make(UUIDS[1],'Продолжительность сна')]);
 assert(r.candidates[0].id===UUIDS[1]&&r.candidates[0].tier===0&&r.candidates[1].tier===2,'full phrase dominates word');
 r=rank({text:'игра на гитаре',locale:'ru'},[make(UUIDS[0],'Гитара'),make(UUIDS[1],'Игра на гитаре')]);assert(r.candidates[0].id===UUIDS[1],'guitar phrase');
 r=rank({text:'ходьба в гору',locale:'ru'},[make(UUIDS[0],'Ходьба'),make(UUIDS[1],'Ходьба в гору')]);assert(r.candidates[0].id===UUIDS[1],'walking phrase');
 r=rank({text:'продолжительность сна',locale:'ru'},[make(UUIDS[0],'Длительность сна',{alias:'Продолжительность сна',aliasTargetVerified:true}),make(UUIDS[1],'Продолжительность сна')]);
 assert(r.candidates[0].tier===0&&r.candidates[1].tier===1&&r.clarificationRequired,'competing full title and full alias');
 r=rank({text:'продолжительность сна',locale:'ru'},[make(UUIDS[0],'Длительность сна',{alias:'Продолжительность сна',aliasTargetVerified:false}),make(UUIDS[1],'Продолжительность сна')]);
 assert(r.candidates[0].tier===0&&r.clarificationRequired===false,'broken alias not exact');
 r=rank({text:'лук',locale:'ru'},[make(UUIDS[0],'Лук'),make(UUIDS[1],'Лук')]);assert(r.outcome==='clarification_required'&&r.selectedObjectId===null,'homonyms');
 r=rank({text:'C++',locale:'en'},[{...make(UUIDS[0],'C'),locale:'en'},{...make(UUIDS[1],'C++'),locale:'en'}]);assert(r.candidates[0].id===UUIDS[1]&&r.candidates[0].tier===0,'punctuation');
 r=rank({text:'Ёлка',locale:'ru'},[make(UUIDS[0],'Елка'),make(UUIDS[1],'Ёлка')]);assert(r.candidates[0].id===UUIDS[1]&&r.candidates[0].tier===0,'yo strict');
 r=rank({text:'schön',locale:'de'},[{...make(UUIDS[0],'schon'),locale:'de'},{...make(UUIDS[1],'schön'),locale:'de'}]);assert(r.candidates[0].id===UUIDS[1]&&r.candidates[0].tier===0,'de accent');
 r=rank({text:'продолжительность сна',locale:'ru'},[make(UUIDS[0],'Продолжительность сна',{authorized:false}),make(UUIDS[1],'Сон')]);assert(!r.candidates.some(c=>c.id===UUIDS[0]),'privacy before rank');
 r=rank({text:'продолжительность сна',locale:'ru'},[make(UUIDS[0],'Продолжительность сна',{localeVerified:false}),make(UUIDS[1],'Сон')]);assert(!r.candidates.some(c=>c.id===UUIDS[0]),'locale before rank');
 r=rank({text:'продолжительность сна',locale:'ru'},[make(UUIDS[0],'Продолжительность сна',{sourceVerified:false}),make(UUIDS[1],'Сон')]);assert(!r.candidates.some(c=>c.id===UUIDS[0]),'provenance before rank');
 r=rank({text:'продолжительность сна',locale:'ru'},[make(UUIDS[0],'Продолжительность сна',{active:false}),make(UUIDS[1],'Сон')]);assert(!r.candidates.some(c=>c.id===UUIDS[0]),'active before rank');
 r=rank({text:'несуществующее',locale:'ru'},[]);assert(r.outcome==='no_match'&&r.selectedObjectId===null,'no invented ON');
 const bad=[
 null,[],{},'hello',{...orig,mode:'exact_uuid_lookup'},{...orig,mode:'SEARCH'},{...orig,query:{...orig.query,locale:'fr'}},
 {...orig,query:{...orig.query,text:''}},{...orig,query:{...orig.query,text:' '}},{...orig,query:{...orig.query,text:23}},
 {...orig,query:{...orig.query,text:'x'.repeat(513)}},{...orig,query:{...orig.query,ownerId:UUIDS[0]}},
 {...orig,query:{...orig.query,locale:'RU'}},{...orig,query:{locale:'en'}},
 {...orig,eligibleCandidates:null},{...orig,eligibleCandidates:{}},{...orig,eligibleCandidates:Array(21).fill(C(UUIDS[0],TYPES[0]))},
 {...orig,eligibleCandidates:[{...C(UUIDS[0],TYPES[0]),authorizationVerified:false}]},
 {...orig,eligibleCandidates:[{...C(UUIDS[0],TYPES[0]),sourceVerified:false}]},
 {...orig,eligibleCandidates:[{...C(UUIDS[0],TYPES[0]),localeVerified:false}]},
 {...orig,eligibleCandidates:[{...C(UUIDS[0],TYPES[0]),activeVerified:false}]},
 {...orig,eligibleCandidates:[{...C(UUIDS[0],TYPES[0]),evidenceClass:'semantic_exact'}]},
 {...orig,eligibleCandidates:[{...C(UUIDS[0],TYPES[0]),valueObjectId:'not-a-uuid'}]},
 {...orig,eligibleCandidates:[{...C(UUIDS[0],TYPES[0]),ownerId:UUIDS[1]}]},
 {...orig,eligibleCandidates:[{...C(UUIDS[0],TYPES[0]),score:0.99}]},
 {...orig,eligibleCandidates:[{...C(UUIDS[0],TYPES[0]),selected:true}]},
 {...orig,eligibleCandidates:[{...C(UUIDS[0],TYPES[0]),localizationVerified:'true'}]},
 {...orig,selectionState:'CONFIRMED'},{...orig,selectionState:null},
 {...orig,priorityRule:'TOKEN_FIRST'}, {...orig,priorityRule:null},
 {...orig,actorId:UUIDS[0]},{...orig,selectedObjectId:UUIDS[0]},
 {...orig,autoSelect:true},{...orig,unknownField:0}
 ];
 for(let i=0;i<bad.length;i++){let failed=false;try{input(bad[i])}catch{failed=true}assert(failed,'negative '+i);}
 assert(S['x-contract']==='ARCTOR_ARI_M0101_FULL_PHRASE_PRIORITY_DESIGN_V1','schema contract');
 assert(S.properties.mode.const==='suggest_by_text'&&S.properties.selectionState.const==='UNCONFIRMED','schema gates');
 assert(S['x-invariants'].same_phrase_multiple_uuid_requires_clarification&&S['x-invariants'].privacy_filter_before_ranking,'schema protections');
 const output={contract:S['x-contract'],negativeTestCount:bad.length,positiveInvariantCount:22,previousNegativeTestCount:p.negativeTestCount,modeCount:1};
 console.log('M0101_REFERENCE_SELFTEST_PASS: '+bad.length+' negative tests; full strict title > verified full alias > partial; no automatic ON selection');
 return output;
}
if(require.main===module){try{selftest();}catch(e){console.error(e.stack);process.exitCode=1}}
module.exports={input,rank,selftest};
