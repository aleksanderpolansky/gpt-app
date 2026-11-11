/**
 * ARI-03.05.07 / M-0124. DESIGN-ONLY, fail-closed policy surface for embedding expenses.
 * No provider SDK, no environment/API key reading, no network, no DB, no writable approval.
 * Never treat a quote, API key, user role or UI action as an authorization to spend.
 */
export const EMBEDDING_SPEND_POLICY_CONTRACT_V1 = 'ARCTOR_M0124_EMBEDDING_SPEND_POLICY_DRY_RUN_V1' as const;
export type EmbeddingCandidateV1='text-embedding-3-small'|'text-embedding-3-large';
export type EmbeddingCostChannelV1='standard'|'batch_api';
export type EmbeddingCostScopeV1='corpus_initial'|'corpus_incremental'|'query';
export type EmbeddingCostPlanInputV1={
  modelId:EmbeddingCandidateV1; channel:EmbeddingCostChannelV1; purpose:EmbeddingCostScopeV1;
  inputs:number; assumedTokensPerInput:number; assumedCacheHitPercent:number;
};
export type EmbeddingSpendDecisionV1 = {
  contract:typeof EMBEDDING_SPEND_POLICY_CONTRACT_V1;
  decision:'ESTIMATE_ONLY_OWNER_APPROVAL_REQUIRED'|'BLOCKED_INVALID_INPUT';
  estimateUSD:number|null;
  estimatedChargeableTokens:number|null;
  callAllowed:false;
  automaticBillingAllowed:false;
  batchJobCreationAllowed:false;
  fallback:'LEXICAL_ONLY';
  paidCallsPerformed:0;
};
const prices:Readonly<Record<EmbeddingCandidateV1,number>>={
  'text-embedding-3-small':0.02,'text-embedding-3-large':0.13
};
const validInt=(x:number,max:number)=>Number.isSafeInteger(x)&&x>=0&&x<=max;
const blocked=():EmbeddingSpendDecisionV1=>({
  contract:EMBEDDING_SPEND_POLICY_CONTRACT_V1,decision:'BLOCKED_INVALID_INPUT',
  estimateUSD:null,estimatedChargeableTokens:null,callAllowed:false,
  automaticBillingAllowed:false,batchJobCreationAllowed:false,fallback:'LEXICAL_ONLY',paidCallsPerformed:0
});
/** A genuine asynchronous Batch API job receives the 0.5 pricing factor; a synchronous array doesn't. */
export function estimateEmbeddingSpendV1(input:EmbeddingCostPlanInputV1):EmbeddingSpendDecisionV1 {
  if(!input||!Object.prototype.hasOwnProperty.call(prices,input.modelId)||
    !['standard','batch_api'].includes(input.channel)||
    !['corpus_initial','corpus_incremental','query'].includes(input.purpose)||
    !validInt(input.inputs,1_000_000_000)||
    !validInt(input.assumedTokensPerInput,8192)||input.assumedTokensPerInput===0||
    !validInt(input.assumedCacheHitPercent,100)||
    // interactive user-query embeddings are NOT a Batch API request.
    (input.purpose==='query'&&input.channel==='batch_api'))return blocked();
  const chargeable=Math.ceil(input.inputs*(100-input.assumedCacheHitPercent)/100);
  const tokens=chargeable*input.assumedTokensPerInput;
  if(!validInt(tokens,1_000_000_000_000))return blocked();
  const price=prices[input.modelId]*(input.channel==='batch_api'?0.5:1);
  const estimateUSD=Math.round((tokens*price/1_000_000+Number.EPSILON)*1e12)/1e12;
  return {contract:EMBEDDING_SPEND_POLICY_CONTRACT_V1,
    decision:'ESTIMATE_ONLY_OWNER_APPROVAL_REQUIRED',estimateUSD,
    estimatedChargeableTokens:tokens,callAllowed:false,automaticBillingAllowed:false,
    batchJobCreationAllowed:false,fallback:'LEXICAL_ONLY',paidCallsPerformed:0};
}
/** Automatic search, refresh, or arbitrary "approved=true" flags NEVER authorize provider calls. */
export function rejectAutoBillableEmbeddingV1(_intent:unknown):{
  decision:'BLOCKED_AUTO_BILLABLE';callAllowed:false;batchJobCreationAllowed:false;fallback:'LEXICAL_ONLY'
} {return {decision:'BLOCKED_AUTO_BILLABLE',callAllowed:false,batchJobCreationAllowed:false,fallback:'LEXICAL_ONLY'};}
