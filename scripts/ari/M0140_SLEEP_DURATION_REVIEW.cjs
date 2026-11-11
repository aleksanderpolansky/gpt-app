'use strict';
/** M-0140 / ARI-03.08.02: owner Gold sleep duration whole-episode vs phases REVIEW. Does not alter production routing. */
const fs = require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const priorLocal=path.join(__dirname,'M0139_NIGHT_SLEEP_REVIEW.cjs');
const priorBundled=path.join(__dirname,'previous','M0139_NIGHT_SLEEP_REVIEW.cjs');
const previous=require(fs.existsSync(priorLocal)?priorLocal:priorBundled);
const CONTRACT='ARCTOR_ARI03_M0140_SLEEP_EPISODE_PHASE_DISTINCTION_REVIEW_V1';
const CASES=Object.freeze([
 {kind:'whole_night_episode',query:'Продолжительность ночного сна',en:'Night sleep duration',id:'84d2f41f-4068-518a-b9d9-047b0d0e0762'},
 {kind:'rem_phase',query:'Продолжительность REM-сна',en:'REM sleep duration',id:'a620cf08-9cdb-5c7a-b428-721f356e2d8e'},
 {kind:'deep_phase',query:'Продолжительность глубокого сна',en:'Deep sleep duration',id:'45d472b0-88fe-5642-b7d0-cbe2502c4ca9'},
 {kind:'light_phase',query:'Продолжительность лёгкого сна',en:'Light sleep duration',id:'607c0db7-d29d-5b5f-89a4-8317bb37fc62'}
]);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
function fail(c){throw Error('M0140_SLEEP_REVIEW_'+c);}
function must(v,c){if(!v)fail(c);}
function readJson(p){return JSON.parse(fs.readFileSync(p,'utf8').replace(/^\ufeff/,''));}
function validateGold(gold){
 previous.validateGold(gold);
 const ids=new Set();
 for(const c of CASES){
  const on=gold.candidates.find(o=>o.uuid===c.id);must(on&&on.title===c.en,'MISSING_CANDIDATE_'+c.kind);
  const g=gold.queries.filter(q=>q.locale==='ru'&&q.query===c.query);
  must(g.length===1&&g[0].relevantOnIds.length===1&&g[0].relevantOnIds[0]===c.id,'MISSING_APPROVED_QUERY_'+c.kind);
  const d=String(on.definition||'').toLowerCase();
  if(c.kind==='whole_night_episode')must(d.includes('total duration')&&d.includes('night-sleep episode'),'WHOLE_DEFINITION');
  else must(d.includes('duration within a night-sleep episode')&&d.includes(c.kind.split('_')[0].replace('rem','rem')),'PHASE_DEFINITION_'+c.kind);
  must(!ids.has(c.id),'DUPLICATE_CASE');ids.add(c.id);
 }
 const generic=gold.queries.filter(q=>q.query.toLowerCase()==='продолжительность сна');
 must(generic.length===0,'UNAPPROVED_GENERIC_QUERY_MISLABELED');
 return true;
}
function input(gold,c,options={}){
 const rest=gold.candidates.map(x=>x.uuid).filter(id=>id!==c.id).sort();
 if(options.reverse)rest.reverse();
 const all=rest.concat(c.id);
 const scope={kind:'global_system'};
 return {lexical:all.map((onId,i)=>({onId,rank:i+1,locale:'ru',scope})),vector:all.map((onId,i)=>({onId,rank:i+1,locale:'ru',scope}))};
}
function evidence(c,options={}){
 return {onId:c.id,scope:{kind:'global_system'},locale:options.locale||'ru',kind:options.kind||'canonical_title',text:options.text===undefined?c.query:options.text, ...(options.status?{aliasStatus:options.status}:{})};
}
function runCase(gold,hybrid,c,options={}){
 const q=options.query===undefined?c.query:options.query;
 const e=options.evidence===undefined?[evidence(c)]:options.evidence;
 return hybrid.rankHybridCandidatesStableTiesV1({...input(gold,c,{reverse:options.reverse}),query:{text:q,locale:'ru'},evidence:e,graphExpansion:{requestedDepth:0}});
}
function genericAmbiguity(gold,query){
 validateGold(gold);
 if(query.trim().toLocaleLowerCase('ru-RU')==='продолжительность сна'){
  return {query,requiresClarification:true,ownerApprovedExactLabel:false,forcedTargetUuid:null,
   options:CASES.map(c=>({kind:c.kind,onId:c.id,approvedQuery:c.query}))};
 }
 return {query,requiresClarification:false};
}
function execute(modulePath,goldPath){
 const raw=fs.readFileSync(goldPath),gold=JSON.parse(raw.toString('utf8').replace(/^\ufeff/,''));
 validateGold(gold);const hybrid=previous.loadHybrid(modulePath);
 const results=[];
 for(const c of CASES){
  const r=runCase(gold,hybrid,c),b=runCase(gold,hybrid,c,{evidence:[]}),p=runCase(gold,hybrid,c,{query:c.query+' (уточнить)'});
  const reversed=runCase(gold,hybrid,c,{reverse:true});
  must(r.ok&&r.orderVerified&&r.candidates.length===18&&r.candidates[0].onId===c.id&&
   r.candidates[0].matchKind==='canonical_title'&&r.candidates[0].finalRank===1,'WRONG_TOP_'+c.kind);
  must(b.ok&&b.candidates[0].onId!==c.id&&p.ok&&p.candidates.every(x=>x.matchPriority===0)&&
   reversed.ok&&reversed.candidates[0].onId===c.id,'NEGATIVE_CASE_'+c.kind);
  must(r.graphCandidatesAdded===0,'GRAPH_DEPTH_'+c.kind);
  results.push({kind:c.kind,query:c.query,expectedUuid:c.id,actualTopUuid:r.candidates[0].onId,
   rank:r.candidates[0].finalRank,matchKind:r.candidates[0].matchKind,allOtherTargetsNotTop:CASES.filter(x=>x.id!==c.id).every(x=>r.candidates[0].onId!==x.id),
   withoutExactEvidenceTopUuid:b.candidates[0].onId,sourcePermutationStable:true});
 }
 const ambiguous=genericAmbiguity(gold,'Продолжительность сна');
 must(ambiguous.requiresClarification&&ambiguous.forcedTargetUuid===null&&ambiguous.options.length===4,'GENERIC_AMBIGUITY');
 return {contract:CONTRACT,step:'M-0140',roadmapId:'ARI-03.08.02',mode:'REVIEW',
  acceptanceScope:'OWNER_APPROVED_RU_EXACT_GOLD_18_NOT_LIVE_UI',cases:results,
  exactTargetsVerified:results.length,exactRankOne:results.every(x=>x.rank===1&&x.allOtherTargetsNotTop),
  semanticDistinctions:{wholeEpisode:CASES[0].id,phaseDurationIds:CASES.slice(1).map(c=>c.id),
   phaseDurationsNotInterchangeable:true,phaseDurationsNotAssumedToSumToEpisode:true,
   genericUnqualifiedQuery:ambiguous},
  sources:{goldSha256:sha(raw),hybridSha256:sha(fs.readFileSync(modulePath))},
  limitations:['Four Russian exact queries explicitly approved by owner in Gold; generic query is NOT an independently approved label',
   'RRF candidates are controlled adversarial fixtures; tests verify exact-title ranker, not real retrieval or live DB',
   'The episode and REM/deep/light phase objects are distinct; no numeric summing or clinical inference is performed',
   'No live admin UI, HTTP E2E, RLS, embeddings generation, or database reads'],
  paidApiCalls:0,sqlExecuted:false,liveDiagnosticsVerified:false,liveHttpE2eVerified:false,databaseRlsVerified:false};
}
if(require.main===module){
 try{const [modulePath,goldPath,outPath]=process.argv.slice(2);
  must([modulePath,goldPath,outPath].every(Boolean),'ARGS');const report=execute(modulePath,goldPath);
  fs.writeFileSync(outPath,JSON.stringify(report,null,2)+'\n','utf8');
  console.log('M0140_SLEEP_EPISODE_PHASE_REVIEW_PASS: 4 exact + 1 ambiguous; not live DB');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
}
module.exports={CONTRACT,CASES,validateGold,input,evidence,runCase,genericAmbiguity,execute,loadHybrid:previous.loadHybrid};
