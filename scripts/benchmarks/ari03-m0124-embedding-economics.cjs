'use strict';
/** M-0124 DESIGN-only. Pure arithmetic and auto-billable DENY. No API, SQL, ENV or IO. */
const CONTRACT='ARCTOR_ARI_M0124_EMBEDDING_COST_REPORT_V1';
const MODELS=Object.freeze({
  'text-embedding-3-small':Object.freeze({standardUSDperMillion:0.02,dimensions:1536}),
  'text-embedding-3-large':Object.freeze({standardUSDperMillion:0.13,dimensions:3072})
});
const PRICE_SNAPSHOT=Object.freeze({date:'2026-11-03',currency:'USD',perTokens:1000000,
  standardSource:'https://developers.openai.com/api/docs/models/text-embedding-3-small',
  largeSource:'https://developers.openai.com/api/docs/models/text-embedding-3-large',
  batchSource:'https://developers.openai.com/api/docs/guides/batch',
  batchApiDiscountFactor:0.5,
  notes:'Historical illustrative snapshot; verify actual pricing, eligibility and billing before ANY paid provider call. Embedding arrays in a synchronous /v1/embeddings request are NOT Batch API jobs.'});
const safeInt=(x,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
const invalid=x=>{throw new Error('M0124_INVALID_'+x)};
const round=(x)=>Math.round((x+Number.EPSILON)*1e12)/1e12;
function quote({modelId,channel,inputs,tokensPerInput,cacheHitPercent=0}){
  if(!Object.hasOwn(MODELS,modelId))invalid('MODEL');
  if(!['standard','batch_api'].includes(channel))invalid('CHANNEL');
  if(!safeInt(inputs,0,1000000000))invalid('INPUTS');
  if(!safeInt(tokensPerInput,1,8192))invalid('TOKENS_PER_INPUT');
  if(!safeInt(cacheHitPercent,0,100))invalid('CACHE_HIT');
  const chargeableInputs=Math.ceil(inputs*(100-cacheHitPercent)/100);
  const chargeableTokens=chargeableInputs*tokensPerInput;
  if(!safeInt(chargeableTokens,0,1000000000000))invalid('TOKENS_TOTAL');
  const unitRate=MODELS[modelId].standardUSDperMillion*(channel==='batch_api'?PRICE_SNAPSHOT.batchApiDiscountFactor:1);
  return {modelId,channel,inputs,tokensPerInput,cacheHitPercent,chargeableInputs,chargeableTokens,
    unitRateUSDperMillion:unitRate,estimateUSD:round(chargeableTokens*unitRate/1e6),
    cacheAvoidedInputs:inputs-chargeableInputs,isProviderBilling:false,approvalGranted:false};
}
function observed(m0121){
  if(m0121?.contract!=='ARCTOR_M0121_OWNER_APPROVED_TWO_MODEL_PILOT_RESULT_V1'||m0121.modelsCompared!==2||m0121.queriesCompared!==36||m0121.candidatesCompared!==18)invalid('PILOT_CONTRACT');
  const output=[];
  for(const modelId of Object.keys(MODELS)){
    const rows=m0121.usage.filter(x=>x.model===modelId);
    if(rows.length!==1||!safeInt(rows[0].promptTokens,1,100000)||rows[0].promptTokens!==896||rows[0].dimension!==MODELS[modelId].dimensions)invalid('PILOT_USAGE');
    const measuredCost=round(rows[0].promptTokens*MODELS[modelId].standardUSDperMillion/1e6);
    if(Math.abs(measuredCost-rows[0].estimatedAtPublishedRatesUSD)>1e-10)invalid('PILOT_RATE_MISMATCH');
    output.push({modelId,promptTokensMeasured:rows[0].promptTokens,sourceInputsMeasured:54,
      averageTokensAcrossMixedONAndQueries:round(rows[0].promptTokens/54),
      standardCostUSD:measuredCost,tokenAccountingSource:'M0121_REAL_PROVIDER_RESPONSE_USAGE_AGGREGATE',
      onVsQueryTokenSplitKnown:false});
  }
  return output;
}
/** All scenarios are forward-looking ASSUMPTIONS; no per-document/query counts were metered separately in M0121. */
function createReport(pilot,previousReceipt){
  const obs=observed(pilot);
  if(previousReceipt?.contract!=='ARCTOR_ARI_M0123_OFFLINE_HNSW_LIMITED_DESIGN_ACCEPTANCE_V1' ||
    previousReceipt.step!=='M-0123'||previousReceipt.nextStep!=='M-0124' ||
    previousReceipt.ledgerAfter!=='76EF2EB1189267A06EC515A96E684E776688CA78C953A8BB8881FA37DD320AA0' ||
    previousReceipt.completedCount!==121||previousReceipt.testsTotal!==1036)invalid('PREVIOUS_RECEIPT');
  const patterns=[
    {name:'PILOT_SCALE',globalON:18,monthlyQueries:36,changedONPercent:0,monthlyQueryCacheHitPercent:0},
    {name:'EARLY_PRODUCT_EXAMPLE',globalON:750,monthlyQueries:30000,changedONPercent:5,monthlyQueryCacheHitPercent:25},
    {name:'LARGE_SCALE_EXAMPLE',globalON:100000,monthlyQueries:1000000,changedONPercent:2,monthlyQueryCacheHitPercent:40}
  ];
  const variants=[];
  for(const tokensPerInput of [17,64,256]){
    for(const scenario of patterns){
      const changedON=Math.ceil(scenario.globalON*scenario.changedONPercent/100);
      for(const modelId of Object.keys(MODELS)){
        const initialStandard=quote({modelId,channel:'standard',inputs:scenario.globalON,tokensPerInput});
        const initialBatch=quote({modelId,channel:'batch_api',inputs:scenario.globalON,tokensPerInput});
        const incrementalBatch=quote({modelId,channel:'batch_api',inputs:changedON,tokensPerInput});
        const queryStandard=quote({modelId,channel:'standard',inputs:scenario.monthlyQueries,tokensPerInput,
          cacheHitPercent:scenario.monthlyQueryCacheHitPercent});
        variants.push({scenario:scenario.name,assumedTokensPerInput:tokensPerInput,modelId,
          onCount:scenario.globalON,monthlyQueries:scenario.monthlyQueries,changedON,
          assumedQueryCacheHitPercent:scenario.monthlyQueryCacheHitPercent,
          initialCorpusStandardUSD:initialStandard.estimateUSD,
          initialCorpusTrueBatchApiUSD:initialBatch.estimateUSD,
          monthlyChangedONTrueBatchApiUSD:incrementalBatch.estimateUSD,
          monthlyQueriesStandardUSD:queryStandard.estimateUSD,
          steadyStateMonthlyUSD:round(incrementalBatch.estimateUSD+queryStandard.estimateUSD),
          billingTriggered:false});
      }
    }
  }
  const guard=guardAutoBillable({kind:'auto',modelId:'text-embedding-3-small'});
  if(guard.decision!=='BLOCKED_AUTO_BILLABLE')invalid('GUARD');
  return {contract:CONTRACT,step:'M-0124',roadmapId:'ARI-03.05.07',mode:'DESIGN',
    historicalMeasuredPilot:obs,prices:PRICE_SNAPSHOT,modelPrices:MODELS,
    scenarios:patterns,variants,
    conditions:['Separate STANDARD synchronous embedding API from genuine /v1/batches processing; batch discount never applies to a synchronous input array.',
      'M0121 896 tokens/model were metered over mixed 18 ON + 36 queries; category averages, individual query tokens and full scale are not directly measured.',
      'Input-count, token-length, changed-object share and query-cache share are scenario assumptions, NOT observed usage.',
      'No projected price is a hard cap on actual provider billing; upstream billing can vary; pre-authorized envelope, runtime metering and kill switch required before execution.',
      'Never issue a paid call from search / index refresh automatically. Query path must fall back to lexical-only when missing provider approval.',
      'Versioned-cache reuse for unchanged definitions is a prerequisite; same changed ON should be queued once per model/scope/version.',
      'Future execution needs persisted authorization proof, idempotency, actual billing reconciliation, quota and owner approval; this DESIGN step does not execute paid jobs.'],
    gate:{default:'DENY',automaticSyncEmbedding:'BLOCKED',automaticBatchEmbedding:'BLOCKED',
      onCacheMiss:'LEXICAL_ONLY',onlineProviderCallsExecuted:0,sqlExecuted:false,
      approvalIssued:false,liveProviderIntegration:false,manualApprovalRequired:true,rollback:'LEXICAL_ONLY'},
    sourceEvidence:{pilotGoldHash:pilot.goldHash,pilotModelsCompared:pilot.modelsCompared,pilotDateUtc:pilot.runDateUtc,
      priorStep:previousReceipt.step,priorLedger:previousReceipt.ledgerAfter},
    calculationCurrency:'USD',actualCostsFromBillingVerified:false};
}
/** This guard cannot authorize anything even with an asserted approval: a separate persisted, bounded approval is mandatory. */
function guardAutoBillable(intent){
  if(!intent||!['auto','manual_review'].includes(intent.kind)||!Object.hasOwn(MODELS,intent.modelId))
    return {decision:'BLOCKED_INVALID_INTENT',canCallProvider:false,canCreateBatchJob:false,providerCalls:0,fallback:'LEXICAL_ONLY'};
  return {decision:intent.kind==='auto'?'BLOCKED_AUTO_BILLABLE':'BLOCKED_REQUIRES_PERSISTED_OWNER_APPROVAL',
    canCallProvider:false,canCreateBatchJob:false,providerCalls:0,fallback:'LEXICAL_ONLY'};
}
module.exports={CONTRACT,MODELS,PRICE_SNAPSHOT,quote,observed,createReport,guardAutoBillable};
