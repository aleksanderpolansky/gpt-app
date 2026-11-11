'use strict';
/** M-0141 / ARI-03.08.03 — offline negative-match review using the EXISTING stable hybrid ranker.
 * No claims of full-catalog coverage; not a live HTTP, Supabase or RLS test.
 */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const priorLocal=path.join(__dirname,'M0140_SLEEP_DURATION_REVIEW.cjs');
const priorBundled=path.join(__dirname,'previous','M0140_SLEEP_DURATION_REVIEW.cjs');
const PRIOR=require(fs.existsSync(priorLocal)?priorLocal:priorBundled);
const CONTRACT='ARCTOR_ARI03_M0141_NEGATIVE_MATCH_REVIEW_V1';
const GOLD_WALK='97e3009b-7c77-5540-8cec-09339fbcdd72';
const GOLD_HUMAN_ORGANISM='fe24b4c3-5f46-5386-9c0a-0ee749d55fa3';
const GOLD_WALK_DURATION='6a0529b6-fe94-55da-bcd1-c38cf3665ada';
const GOLD_STEPS='ab9a2a69-3dfa-5841-9c37-dc4c3e788b7c';
const GOLD_STAIRS='40d541fc-9d68-5951-a918-fc34f0aff0af';
const TOPICS=Object.freeze([
 {key:'child',text:'ребёнок',variant:'ребенок',kind:'UNVERIFIED_IN_18_ON_FIXTURE',risk:'person vs age role vs child-related activity'},
 {key:'human',text:'человек',variant:'человека',kind:'BROAD_AMBIGUOUS_NOT_APPROVED_EXACT',risk:'person vs human organism vs human activity'},
 {key:'shops',text:'магазины',variant:'магазин',kind:'UNVERIFIED_IN_18_ON_FIXTURE',risk:'retail category vs physical store vs chain'},
 {key:'guitar',text:'гитара',variant:'игра на гитаре',kind:'UNVERIFIED_IN_18_ON_FIXTURE',risk:'instrument vs playing vs skill'},
 {key:'walking',text:'ходьба',variant:'ходьба с ребёнком',kind:'OWNER_APPROVED_EXACT',risk:'walking vs walking duration vs step count vs stairs'}
]);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const readJson=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\ufeff/,''));
const must=(v,c)=>{if(!v)throw Error('M0141_REVIEW_'+c);};
const normalize=s=>String(s).trim().normalize('NFC').toLocaleLowerCase('ru-RU');
function validateGold(gold){
 PRIOR.validateGold(gold);
 must(gold.candidates.length===18,'GOLD_CANDIDATE_COUNT');
 for(const id of [GOLD_WALK,GOLD_HUMAN_ORGANISM,GOLD_WALK_DURATION,GOLD_STEPS,GOLD_STAIRS])
  must(gold.candidates.some(x=>x.uuid===id),'GOLD_ANCHOR_MISSING_'+id);
 const walking=gold.queries.filter(x=>x.locale==='ru'&&x.query==='Ходьба');
 must(walking.length===1&&walking[0].relevantOnIds.length===1&&walking[0].relevantOnIds[0]===GOLD_WALK,'WALK_APPROVAL');
 for(const t of TOPICS.filter(x=>x.key!=='walking'))
  must(gold.queries.every(q=>!(q.locale==='ru'&&normalize(q.query)===normalize(t.text))),'UNAPPROVED_TOPIC_MISLABEL_'+t.key);
 return true;
}
function ownerApprovedTarget(gold,text,locale='ru'){
 const matches=gold.queries.filter(q=>q.locale===locale&&normalize(q.query)===normalize(text));
 if(matches.length!==1||matches[0].relevantOnIds.length!==1)return null;
 const target=matches[0].relevantOnIds[0];
 return gold.candidates.some(c=>c.uuid===target)?target:null;
}
function input(gold,opts={}){
 const ids=gold.candidates.map(x=>x.uuid).slice().sort();
 if(opts.reverse)ids.reverse();
 const scope={kind:'global_system'};
 const lexical=ids.map((onId,i)=>({onId,rank:i+1,locale:'ru',scope}));
 const vector=ids.slice().reverse().map((onId,i)=>({onId,rank:i+1,locale:'ru',scope}));
 return {lexical,vector};
}
function approvedEvidence(gold,query,locale='ru'){
 const id=ownerApprovedTarget(gold,query,locale);
 if(!id)return [];
 return [{onId:id,scope:{kind:'global_system'},locale,kind:'canonical_title',text:query}];
}
function rank(gold,hybrid,query,opts={}){
 return hybrid.rankHybridCandidatesStableTiesV1({
  ...input(gold,{reverse:!!opts.reverse}),query:{text:query,locale:'ru'},
  evidence:opts.evidence===undefined?approvedEvidence(gold,query):opts.evidence,
  graphExpansion:{requestedDepth:0}
 });
}
function decision(gold,query){
 const id=ownerApprovedTarget(gold,query);
 return id?{status:'OWNER_APPROVED_EXACT_ONLY',ownerApprovedExact:true,forcedTargetUuid:id,needsReview:false}:
 {status:'NO_APPROVED_EXACT_IN_LIMITED_FIXTURE',ownerApprovedExact:false,forcedTargetUuid:null,needsReview:true};
}
function evaluateTopic(gold,hybrid,topic){
 const approved=ownerApprovedTarget(gold,topic.text);
 const r=rank(gold,hybrid,topic.text),rRev=rank(gold,hybrid,topic.text,{reverse:true});
 must(r.ok&&rRev.ok&&r.orderVerified&&rRev.orderVerified,'RANKER_ERROR_'+topic.key);
 must(r.candidates.length===18&&new Set(r.candidates.map(x=>x.onId)).size===18,'CANDIDATES_'+topic.key);
 must(r.graphCandidatesAdded===0&&rRev.graphCandidatesAdded===0,'GRAPH_EXPANSION_'+topic.key);
 if(approved){must(topic.key==='walking'&&approved===GOLD_WALK,'UNEXPECTED_APPROVAL_'+topic.key);
  must(r.candidates[0].onId===GOLD_WALK&&r.candidates[0].matchKind==='canonical_title'&&r.candidates[0].finalRank===1,'WALK_TOP');
  must(rRev.candidates[0].onId===GOLD_WALK,'WALK_REVERSE_TOP');
  must(![GOLD_WALK_DURATION,GOLD_STEPS,GOLD_STAIRS].includes(r.candidates[0].onId),'WALK_CONFLATED');
 }else {
  must(r.candidates.every(x=>x.matchPriority===0)&&rRev.candidates.every(x=>x.matchPriority===0),'FALSE_EXACT_'+topic.key);
 }
 const pending={onId:GOLD_HUMAN_ORGANISM,scope:{kind:'global_system'},locale:'ru',kind:'alias',text:topic.text,aliasStatus:'pending'};
 const revoked={...pending,aliasStatus:'revoked'};
 const wrongLocale={onId:GOLD_HUMAN_ORGANISM,scope:{kind:'global_system'},locale:'de',kind:'canonical_title',text:topic.text};
 for(const [label, evidence] of [['pending',pending],['revoked',revoked],['wrong_locale',wrongLocale]]){
  const t=rank(gold,hybrid,topic.text,{evidence:[evidence]});
  must(t.ok&&t.candidates.every(x=>x.matchPriority===0),'FALSE_PROMOTION_'+label+'_'+topic.key);
 }
 const variant=rank(gold,hybrid,topic.variant);
 must(variant.ok&&variant.candidates.every(x=>x.matchPriority===0),'SUBSTRING_FALSE_EXACT_'+topic.key);
 const dec=decision(gold,topic.text);
 must((approved===null)===(dec.forcedTargetUuid===null),'REVIEW_DECISION_'+topic.key);
 return {topic:topic.text,key:topic.key,category:topic.kind,risk:topic.risk,
  approvedExactUuid:approved,rankerTopWithApprovedEvidence:r.candidates[0].onId,
  exactPriority:r.candidates[0].matchPriority,reviewDecision:dec,
  controlledCandidateCount:18,sourcePermutationChecked:true,
  unrelatedWalkingMeasurementsNotSelectedForExactWalk:topic.key==='walking'?true:null,
  pendingRevokedWrongLocaleAliasNotPromoted:true,
  contextVariantNotExact:topic.variant,
  coverage:approved?'SINGLE_OWNER_APPROVED_EXACT_IN_18_ON_GOLD':'NO_APPROVED_EXACT__NOT_PROOF_OF_GLOBAL_ABSENCE'};
}
function execute(modulePath,goldPath){
 const goldBytes=fs.readFileSync(goldPath),gold=readJson(goldPath);validateGold(gold);
 const h=PRIOR.loadHybrid(modulePath);
 const topics=TOPICS.map(t=>evaluateTopic(gold,h,t));
 const all=topics.every(x=>x.pendingRevokedWrongLocaleAliasNotPromoted&&x.sourcePermutationChecked);
 must(all,'NEGATIVE_CONTROLS');
 const walk=topics.find(x=>x.key==='walking');must(walk.approvedExactUuid===GOLD_WALK&&walk.reviewDecision.forcedTargetUuid===GOLD_WALK,'WALK_ASSERT');
 const humanGold=gold.queries.find(x=>x.locale==='ru'&&x.query==='Человеческий организм');
 must(humanGold&&humanGold.relevantOnIds[0]===GOLD_HUMAN_ORGANISM,'HUMAN_GOLD');
 const exactOrganism=rank(gold,h,'Человеческий организм');
 must(exactOrganism.ok&&exactOrganism.candidates[0].onId===GOLD_HUMAN_ORGANISM&&exactOrganism.candidates[0].matchKind==='canonical_title','HUMAN_POSITIVE_ANCHOR');
 return {contract:CONTRACT,step:'M-0141',roadmapId:'ARI-03.08.03',mode:'REVIEW',
   scope:'OFFLINE_NEGATIVE_CONTROLS_ON_OWNER_APPROVED_18_ON_GOLD__NOT_FULL_CATALOG',
   topics,topicsChecked:5,negativeControlFamilies:['unapproved exact', 'substring/context variation', 'pending alias', 'revoked alias', 'wrong-locale evidence'],
   approvedPositiveControls:{walking:GOLD_WALK,humanOrganism:GOLD_HUMAN_ORGANISM},
   qualityGate:{blockingFalseCanonicalBoostObserved:false,approvedWalkingExactMisrouted:false,controlledBaselineNotWorsened:true,
    fullCatalogRecallDetermined:false,fullCatalogNegativeMatchesVerified:false,liveDiagnosticsE2e:false,
    unapprovedTopicIdsInvented:false,unapprovedTopicAbsentFromCatalogClaimed:false},
   source:{goldSha256:sha(goldBytes),hybridSha256:sha(fs.readFileSync(modulePath))},
   limitations:['Child, shops and guitar have no owner-approved target in the 18-ON controlled corpus. Their absence here says nothing about the full catalog.',
    'Human is not the same owner-approved exact query as Human organism; requires contextual review.',
    'Only Walking has a directly approved exact query among five topics; it must not be conflated with duration, steps or stair ascent.',
    'The ranker always outputs ranked candidates; needsReview/forcedTargetUuid here is a REVIEW-side safety decision, NOT a deployed routing gate.',
    'No live Supabase, global catalog completeness, admin UI, RLS or HTTP E2E checked. Does not validate all production blocker categories.'],
   sqlExecuted:false,paidApiCalls:0,commitPushDeploy:false};
}
if(require.main===module){
 try{const [src,gold,dest]=process.argv.slice(2);must(src&&gold&&dest,'ARGS');const r=execute(src,gold);
 fs.writeFileSync(dest,JSON.stringify(r,null,2)+'\n');console.log('M0141_NEGATIVE_REVIEW_PASS: five topics; scoped to 18-ON Gold; not a live/catalog-wide test');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
}
module.exports={CONTRACT,TOPICS,GOLD_WALK,GOLD_HUMAN_ORGANISM,GOLD_WALK_DURATION,GOLD_STEPS,GOLD_STAIRS,validateGold,
 ownerApprovedTarget,input,approvedEvidence,rank,decision,evaluateTopic,execute,loadHybrid:PRIOR.loadHybrid};
