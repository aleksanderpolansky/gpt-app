'use strict';
/** M-0139: seven-locale exact-title rank-one REVIEW on accepted M-0130 fixture. No DB claims. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),Module=require('node:module');
const CONTRACT='ARCTOR_ARI03_M0139_NIGHT_SLEEP_SEVEN_LOCALE_REVIEW_V1';
const LOCALES=Object.freeze([
 ['en','Night sleep'],['pl','Sen nocny'],['es','Sueño nocturno'],
 ['de','Nachtschlaf'],['cs','Noční spánek'],['uk','Нічний сон'],['ru','Ночной сон']
]);
const TARGET_UUID='bf6b8ca1-97b4-56c3-a115-f76e2e7fec5a';
const GOLD_NAME='M0121_OWNER_APPROVED_EXACT_GOLD_18.json';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const must=(v,m)=>{if(!v)throw Error('M0139_REVIEW_'+m);};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const readJson=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\ufeff/,''));
function loadHybrid(modulePath,typescriptPath){
 const ts=require(typescriptPath||require.resolve('typescript',{paths:[process.cwd(),'/opt/nvm/versions/node/v22.16.0/lib/node_modules']}));
 const source=fs.readFileSync(modulePath,'utf8');
 const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});
 must(!compiled.diagnostics?.length,'TRANSPILE');
 const m=new Module(modulePath,module);m.filename=modulePath;m.paths=Module._nodeModulePaths(path.dirname(modulePath));
 m._compile(compiled.outputText,modulePath);
 must(typeof m.exports.rankHybridCandidatesStableTiesV1==='function','HYBRID_FUNCTION');
 return m.exports;
}
function validateGold(gold){
 must(gold&&Array.isArray(gold.candidates)&&gold.candidates.length===18,'GOLD_COUNT');
 const ids=gold.candidates.map(c=>c.uuid.toLowerCase());
 must(new Set(ids).size===18,'GOLD_UUID_UNIQUE');
 must(gold.candidates.some(c=>c.uuid.toLowerCase()===TARGET_UUID&&c.title==='Night sleep'),'NIGHT_SLEEP_ID');
 must(gold.candidates.some(c=>c.title==='Night sleep duration'),'DURATION_DECOY_PRESENT');
 const exact=gold.queries.find(q=>q.locale==='ru'&&q.query==='Ночной сон');
 must(exact&&exact.relevantOnIds.length===1&&exact.relevantOnIds[0]===TARGET_UUID,'GOLD_RU_TITLE');
 return true;
}
function validatePriorFixture(text){
 const matches=[...text.matchAll(/const LOCS=\[(.*?)\];/gs)];
 must(matches.length===1,'M0130_FIXTURE_MISSING');
 const actual=[...matches[0][1].matchAll(/\['(en|pl|es|de|cs|uk|ru)','([^']+)'\]/g)]
  .map(m=>[m[1],m[2]]);
 must(same(actual,LOCALES),'M0130_TRANSLATIONS_CHANGED');
 return sha(Buffer.from(text,'utf8'));
}
function candidates(gold,locale,reverse=false){
 const remaining=gold.candidates.map(c=>c.uuid.toLowerCase()).filter(id=>id!==TARGET_UUID).sort();
 const ids=reverse?remaining.reverse():remaining;
 const all=ids.concat([TARGET_UUID]);
 const scope={kind:'global_system'};
 const lexical=all.map((onId,i)=>({onId,rank:i+1,locale,scope}));
 const vector=all.map((onId,i)=>({onId,rank:i+1,locale,scope}));
 return {lexical,vector};
}
function review(gold,priorFixtureText,hybrid,extra={}){
 validateGold(gold);const priorFixtureSha256=validatePriorFixture(priorFixtureText);
 const examples=[];
 for(const [locale,title] of LOCALES){
  const input=candidates(gold,locale);
  const evidence={onId:TARGET_UUID,scope:{kind:'global_system'},locale,kind:'canonical_title',text:title};
  const q={...input,query:{text:title,locale},evidence:[evidence],graphExpansion:{requestedDepth:0}};
  const r=hybrid.rankHybridCandidatesStableTiesV1(q);
  must(r.ok&&r.orderVerified&&r.candidates.length===18,'RANK_RESPONSE_'+locale);
  const first=r.candidates[0],passed=first.onId===TARGET_UUID&&first.finalRank===1&&first.matchKind==='canonical_title';
  const baseline=hybrid.rankHybridCandidatesStableTiesV1({...q,evidence:[]});
  must(baseline.ok&&baseline.candidates.length===18,'BASELINE_'+locale);
  const invalid=hybrid.rankHybridCandidatesStableTiesV1({...q,query:{locale,text:title+' extra'},evidence:[evidence]});
  must(invalid.ok&&invalid.candidates[0].matchPriority===0,'SUBSTRING_NONMATCH_'+locale);
  const pending=hybrid.rankHybridCandidatesStableTiesV1({...q,evidence:[{...evidence,kind:'alias',aliasStatus:'pending'}]});
  must(pending.ok&&pending.candidates[0].matchPriority===0,'UNVERIFIED_ALIAS_BOOST_'+locale);
  const reversed=hybrid.rankHybridCandidatesStableTiesV1({...q,...candidates(gold,locale,true)});
  must(reversed.ok&&reversed.candidates[0].onId===TARGET_UUID,'SOURCE_REORDER_'+locale);
  examples.push({locale,confirmedFixtureTitle:title,targetUuid:TARGET_UUID,
   exactTitleRank1:passed,rank:first.finalRank,matchKind:first.matchKind,
   candidateCount:r.candidates.length,withoutExactBoostTopUuid:baseline.candidates[0].onId,
   substringDoesNotBoost:true,pendingAliasDoesNotBoost:true,sourcePermutationPreservesRank1:true,
   fixtureProvenance:'ACCEPTED_M0130_REGRESSION_FIXTURE_NOT_LIVE_LOCALIZED_DB_TITLE'});
 }
 return {contract:CONTRACT,step:'M-0139',roadmapId:'ARI-03.08.01',mode:'REVIEW',
  acceptanceScope:'LOCAL_CODE_REVIEW_ON_PREVIOUSLY_ACCEPTED_TRANSLATION_FIXTURE_NOT_LIVE_UI',
  targetUuid:TARGET_UUID,localeCount:LOCALES.length,candidateCount:18,
  verifiedExactRankOneCount:examples.filter(e=>e.exactTitleRank1).length,
  allSevenRankOne:examples.every(e=>e.exactTitleRank1),
  fixtureProvenanceSha256:priorFixtureSha256,
  verifiedLiveTranslations:false,verifiedLiveAdminDiagnostics:false,
  verifiedSupabaseRls:false,paidApiCalls:0,sqlExecuted:false,
  assertions:'real_arctor_hybrid_ranker_v1_exact_priority_and_stable_ties',
  limitations:['Exact translated titles taken from accepted M-0130 test fixture, not independently checked in live DB',
   'RRF/lexical/vector candidate positions deliberately adversarial and deterministic; this is ranking scenario review, not live retrieval',
   'ARI-03 production/HTTP/E2E acceptance remains pending; no live admin diagnostics or RLS accessed'],
  examples,...extra};
}
function execute(modulePath,goldPath,priorTestPath){
 const gold=readJson(goldPath);const prior=fs.readFileSync(priorTestPath,'utf8');const hybrid=loadHybrid(modulePath);
 return review(gold,prior,hybrid,{sourceGoldSha256:sha(fs.readFileSync(goldPath)),hybridModuleSha256:sha(fs.readFileSync(modulePath))});
}
if(require.main===module){
 try{
  const [modulePath,goldPath,priorTestPath,outPath]=process.argv.slice(2);
  must([modulePath,goldPath,priorTestPath,outPath].every(Boolean),'ARGS');
  const report=execute(modulePath,goldPath,priorTestPath);
  must(report.allSevenRankOne,'SEVEN_LOCALES_NOT_RANK1');
  fs.writeFileSync(outPath,JSON.stringify(report,null,2)+'\n','utf8');
  process.stdout.write('M0139_SEVEN_LOCALES_RANK1_PASS; LOCAL_ACCEPTED_FIXTURE_NOT_DB\n');
 }catch(e){console.error(String(e.stack||e));process.exitCode=1;}
}
module.exports={CONTRACT,LOCALES,TARGET_UUID,GOLD_NAME,validateGold,validatePriorFixture,loadHybrid,candidates,review,execute};
