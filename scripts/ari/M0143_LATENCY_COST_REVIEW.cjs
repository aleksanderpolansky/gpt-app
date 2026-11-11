'use strict';
/** M-0143: evidence-only latency/provider-cost/index comparison. No network, no DB. */
const crypto=require('node:crypto');
const CONTRACT='ARCTOR_ARI03_M0143_LATENCY_COST_UNKNOWNS_V1';
const MODELS=['text-embedding-3-small','text-embedding-3-large'];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const fail=k=>{throw Error('M0143_REVIEW_'+k)};
const ensure=(b,k)=>{if(!b)fail(k)};
const measured=(v,unit,source)=>{ensure(typeof v==='number'&&Number.isFinite(v)&&v>=0,'BAD_MEASURED_'+source);return {status:'MEASURED',value:v,unit,source};};
const estimate=(v,unit,source)=>{ensure(typeof v==='number'&&Number.isFinite(v)&&v>=0,'BAD_ESTIMATE_'+source);return {status:'ESTIMATED_SCENARIO',value:v,unit,source};};
const unknown=(unit,reason)=>({status:'UNKNOWN',value:null,unit,reason});
function compareInputs({latency,cost,quality,freeze,receipt}){
 ensure(latency?.contract==='ARCTOR_ARI03_M0138_MEASURED_LOCAL_SEARCH_V1','M0138_CONTRACT');
 ensure(latency.queryCount===36&&latency.candidateCount===18&&latency.verifiedAgainstM0131===true,'M0138_SCOPE');
 ensure(latency.localOfflineOnly!==false&&latency.noApiKey===true&&latency.paidApiCalls===0&&latency.sqlExecuted===false,'M0138_SAFETY');
 ensure(cost?.contract==='ARCTOR_ARI_M0124_EMBEDDING_COST_REPORT_V1','M0124_CONTRACT');
 ensure(cost.actualCostsFromBillingVerified===false&&cost.gate?.default==='DENY'&&cost.gate?.approvalIssued===false,'M0124_DENY');
 ensure(cost.historicalMeasuredPilot?.length===2&&cost.variants?.length>=6,'M0124_COST_PROVENANCE');
 ensure(quality?.contract==='ARCTOR_ARI03_M0131_HOLDOUT_QUALITY_COMPARISON_V1'&&quality.queryCount===36&&quality.exactQueryCount===18&&quality.ownerApprovedNotIndependentGold===true,'M0131_SCOPE');
 ensure(freeze?.contract==='ARCTOR_ARI03_M0142_STAGE_HOLDOUT_SOURCE_INDEX_FREEZE_V1'&&freeze.stage?.queryCount===18&&freeze.holdout?.queryCount===18&&freeze.holdout?.independent===false,'M0142_SCOPE');
 ensure(freeze.qualityGate?.noNewBlockingRegressionAgainstPriorApprovedOfflineChecks===true&&freeze.qualityGate?.globalCatalogOrRlsVerified===false,'M0142_GATE');
 ensure(receipt?.contract==='ARCTOR_ARI_M0138_COLD_WARM_LATENCY_ACCEPTANCE_V1'&&receipt.benchmarkContract===latency.contract&&receipt.localOfflineOnly===true,'M0138_RECEIPT');
 ensure(receipt.liveHttpEndToEndMeasured===false&&receipt.databaseRlsVerified===false&&receipt.sqlExecuted===false&&receipt.paidApiCalls===0,'M0138_LIMITS');
 ensure(freeze.sourceIndexInventory?.liveIndexSha256===null,'INDEX_NOT_LIVE');
 const latencyRows=[];
 for(const model of MODELS){
  const d=latency.models?.[model],r=receipt.metrics?.[model];ensure(d&&r,'M0138_MISSING_MODEL_'+model);
  for(const temp of ['cold','warm']){
   const z=d[temp],v=r[temp];ensure(z&&v&&z.count===v.count&&z.count===(temp==='cold'?36:180),'SAMPLE_COUNT_'+model+'_'+temp);
   for(const x of ['p50Ms','p95Ms'])ensure(Number.isFinite(z[x])&&Math.abs(z[x]-v[x])<1e-7,'RECEIPT_METRIC_MISMATCH_'+model+'_'+temp+'_'+x);
   ensure(z.p50Ms<=z.p95Ms&&z.p95Ms>=0,'BAD_LATENCY_'+model+'_'+temp);
  }
  latencyRows.push({model,measureScope:'LOCAL_APPLICATION_PIPELINE_18_ON_36_QUERIES',
    coldP50Ms:measured(d.cold.p50Ms,'ms','M0138_LOCAL_COLD'),coldP95Ms:measured(d.cold.p95Ms,'ms','M0138_LOCAL_COLD'),
    warmP50Ms:measured(d.warm.p50Ms,'ms','M0138_LOCAL_WARM'),warmP95Ms:measured(d.warm.p95Ms,'ms','M0138_LOCAL_WARM'),
    baselineAri02ComparableP95Ms:unknown('ms','NO_MATCHED_BASELINE_BENCHMARK'),
    livePostgresqlIndexP95Ms:unknown('ms','PGVECTOR_INDEX_NOT_MEASURED'),
    liveHttpP95Ms:unknown('ms','LIVE_HTTP_E2E_NOT_MEASURED'),
    coldOsDiskCacheP95Ms:unknown('ms','OS_CACHE_NOT_CLEARED')});
 }
 const b=quality.metrics?.ari02;ensure(b&&b.queries===36,'BASELINE_METRICS');
 const qualityRows=[];
 for(const m of MODELS){
  const q=quality.metrics[m];ensure(q?.queries===36,'QUALITY_MODEL_'+m);
  const metrics=['hitAt1','exactHitAt1','ndcgAt5','falsePositiveAt1','missAt1','fpShareOfReturnedTop5'];
  const deltas={};
  for(const k of metrics){ensure(Number.isFinite(q[k])&&Number.isFinite(b[k]),'QUALITY_NUMBER_'+k);deltas[k]=Number((q[k]-b[k]).toFixed(12));}
  qualityRows.push({model:m,scope:'M0131_OWNER_APPROVED_36_NOT_INDEPENDENT',baseline:b,modelMetrics:q,deltas,
   improvedTop1:q.hitAt1>=b.hitAt1&&q.falsePositiveAt1<=b.falsePositiveAt1,
   top5FalseCandidateShareWorse:q.fpShareOfReturnedTop5>b.fpShareOfReturnedTop5});
 }
 const costRows=[];
 for(const row of cost.variants){
  if(!MODELS.includes(row.modelId))continue;
  ensure(Number.isFinite(row.monthlyQueriesStandardUSD)&&Number.isFinite(row.steadyStateMonthlyUSD),'COST_VALUE');
  const base={scenario:row.scenario,model:row.modelId,assumedTokensPerInput:row.assumedTokensPerInput,
   monthlyQueries:row.monthlyQueries,queryCacheHitPct:row.assumedQueryCacheHitPercent,
   queryEmbeddingProviderUSDPerMonth:estimate(row.monthlyQueriesStandardUSD,'USD/month','M0124_OWNER_SCENARIO'),
   initialCorpusEmbeddingUSD:estimate(row.initialCorpusStandardUSD,'USD','M0124_OWNER_SCENARIO'),
   changedCorpusBatchUSDPerMonth:estimate(row.monthlyChangedONTrueBatchApiUSD,'USD/month','M0124_TRUE_BATCH_SCENARIO'),
   providerOnlySteadyStateUSDPerMonth:estimate(row.steadyStateMonthlyUSD,'USD/month','M0124_OWNER_SCENARIO'),
   postgresComputeUSDPerMonth:unknown('USD/month','POSTGRES_DB_COMPUTE_NOT_METERED'),
   indexBuildAndMaintenanceUSD:unknown('USD/month','PHYSICAL_INDEX_NOT_BENCHMARKED'),
   networkHttpComputeUSD:unknown('USD/month','NETWORK_AND_RUNTIME_NOT_METERED'),
   actualProviderInvoiceUSD:unknown('USD','NO_BILLING_RECONCILIATION')};
  costRows.push(base);
 }
 const output={contract:CONTRACT,step:'M-0143',roadmapId:'ARI-03.08.05',mode:'REVIEW',
  task:'Сравнить latency/cost, включая индекс и запросы, не выдавать неизвестное за нуль.',
  provenance:{m0138:'REAL_LOCAL_OFFLINE_MEASUREMENTS',m0124:'HISTORICAL_PRICES_PLUS_HYPOTHETICAL_SCENARIOS',
   m0131:'OWNER_APPROVED_NOT_INDEPENDENT_GOLD',m0142:'SCOPED_SOURCE_AND_INDEX_CODE_SHA_NOT_PHYSICAL_DB_INDEX',
   priceSnapshot:cost.prices.date,sourceIndexCodeSHA:freeze.sourceIndexInventory.indexTreeSha256,
   liveIndexSHA:null},
  latencyRows,qualityRows,costRows,
  qualityGate:{priorLimitedOfflineBlockingControlsPass:true,top1QualityNoWorseOnApprovedSet:qualityRows.every(r=>r.improvedTop1),
   top5FalseCandidateShareWorse:qualityRows.some(r=>r.top5FalseCandidateShareWorse),
   allQualityMetricsNoWorse:false,independentHoldoutProven:false,globalCatalogValidated:false,
   liveProductionQualityGatePassed:false},
  costs:{scope:'PROVIDER_ONLY_ESTIMATES_EXCLUDING_UNKNOWN_DB_INDEX_NETWORK_RUNTIME',
   automaticBillableFlowAllowed:false,paidCallsMadeNow:0,actualInvoiceVerified:false,
   missingNeverZero:true},
  verdict:{limitedOfflineEvidenceAcceptable:true,productionReleaseAllowed:false,
   decision:'LIMITED_REVIEW_ONLY_OPEN_TOP5_FP_AND_UNKNOWN_PRODUCTION_LATENCY_AND_COST',
   blockersToProduction:['TOP5_FALSE_CANDIDATE_SHARE_WORSE_THAN_ARI02_BASELINE',
    'NO_MATCHED_ARI02_LATENCY_BASELINE','NO_LIVE_PGVECTOR_INDEX_LATENCY_OR_COST','NO_LIVE_HTTP_E2E',
    'NO_INDEPENDENT_HOLDOUT','NO_ACTUAL_INFRA_BILLING']},
  sqlExecuted:false,openAiCalls:0,paidApiCalls:0,commitPushDeploy:false};
 ensure(output.costRows.length===cost.variants.length,'COST_VARIANTS_MISSING');
 return output;
}
function auditUnknowns(value){
 let checked=0;
 function walk(x){
  if(Array.isArray(x)){for(const v of x)walk(v);return;}
  if(x&&typeof x==='object'){
   if(x.status==='UNKNOWN'){ensure(x.value===null&&typeof x.reason==='string'&&x.reason.length>0,'UNKNOWN_REPLACED_WITH_NUMBER');checked++;}
   for(const v of Object.values(x))walk(v);
  }
 }
 walk(value);ensure(checked>=15,'INSUFFICIENT_UNKNOWNS');return checked;
}
module.exports={CONTRACT,MODELS,sha,measured,estimate,unknown,compareInputs,auditUnknowns};
