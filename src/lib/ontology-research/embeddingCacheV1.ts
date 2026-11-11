/**
 * ARI-03.05.05 / M-0122 — DESIGN ONLY, server-side, fail-closed versioned embedding cache policy.
 * Takes M-0119's already-approved deterministic embedding unit. Does NOT call providers,
 * read/write DB, change RLS, generate vectors, approve models or enable vector search.
 * Production callers MUST verify real RLS and authorization and use lexical-only fallback.
 */
import { createHash } from 'node:crypto';
import type { EmbeddingUnitDraftV1 } from './vectorRetrievalV1';

export const EMBEDDING_CACHE_CONTRACT_V1 = 'ARCTOR_EMBEDDING_CACHE_PLAN_V1' as const;
export const EMBEDDING_CACHE_PREPROCESSING_V1 = 'ARCTOR_EMBEDDING_UNIT_JSON_NFC_V1' as const;
export type EmbeddingModelV1 = { modelId: string; modelVersion: string; dimensions: number };
export type EmbeddingCacheIdentityV1 = {
  contract: typeof EMBEDDING_CACHE_CONTRACT_V1;
  onId: string;
  locale: EmbeddingUnitDraftV1['locale'];
  scopeKind: 'global_system' | 'owner_private';
  ownerActorId: string | null;
  ontologyVersion: string;
  dictionaryVersion: string;
  modelId: string;
  modelVersion: string;
  dimensions: number;
  preprocessingVersion: typeof EMBEDDING_CACHE_PREPROCESSING_V1;
  contentSha256: string;
  versionedLogicalKey: string;
  reusableVectorKey: string;
};
export type EmbeddingCacheRecordV1 = {
  versionedLogicalKey: string;
  reusableVectorKey: string;
  onId: string;
  locale: EmbeddingUnitDraftV1['locale'];
  scopeKind: 'global_system' | 'owner_private';
  ownerActorId: string | null;
  modelId: string;
  modelVersion: string;
  dimensions: number;
  contentSha256: string;
  state: 'ready' | 'stale' | 'revoked' | 'pending';
  hasVector: boolean;
};
export type EmbeddingCacheDecisionV1 =
  | { ok: true; decision: 'REUSE_READY'; plan: EmbeddingCacheIdentityV1; versionAliasRequired: boolean;
      vectorGenerated: false; dbWritesPerformed: false; aiCallsPerformed: false }
  | { ok: true; decision: 'RECALCULATE_REQUIRES_APPROVAL' | 'LEXICAL_ONLY'; plan: EmbeddingCacheIdentityV1;
      reason: 'CACHE_MISS' | 'SOURCE_CHANGED' | 'MODEL_CHANGED' | 'UNAVAILABLE';
      vectorGenerated: false; dbWritesPerformed: false; aiCallsPerformed: false }
  | { ok: false; decision: 'BLOCKED'; reason: 'INVALID_UNIT' | 'INVALID_MODEL' | 'INVALID_RECORD' | 'SCOPE_MISMATCH' | 'REVOKED_RECORD';
      vectorGenerated: false; dbWritesPerformed: false; aiCallsPerformed: false };

const hash = (v: string) => createHash('sha256').update(v, 'utf8').digest('hex').toUpperCase();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const version = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}$/;
const modelName = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/;
const digest = /^[0-9A-F]{64}$/;
const block = (reason: Extract<EmbeddingCacheDecisionV1,{ok:false}>['reason']): EmbeddingCacheDecisionV1 =>
  ({ok:false,decision:'BLOCKED',reason,vectorGenerated:false,dbWritesPerformed:false,aiCallsPerformed:false});

/** For invalid input, fail closed. The identity is not a permission grant. */
export function describeEmbeddingCacheKeyV1(unit: EmbeddingUnitDraftV1, model: EmbeddingModelV1):
  {ok:true; plan:EmbeddingCacheIdentityV1} | {ok:false; reason:'INVALID_UNIT'|'INVALID_MODEL'} {
  if(!unit || unit.contract !== 'ARCTOR_EMBEDDING_UNIT_DRAFT_V1' ||
     !uuid.test(unit.onId) || !['en','pl','es','de','cs','uk','ru'].includes(unit.locale) ||
     !version.test(unit.ontologyVersion) || !version.test(unit.dictionaryVersion) ||
     !unit.scope || !['global_system','owner_private'].includes(unit.scope.kind) ||
     (unit.scope.kind==='owner_private' && !uuid.test(unit.scope.ownerActorId)) ||
     typeof unit.title!=='string' || typeof unit.definition!=='string' ||
     !unit.title.trim() || !unit.definition.trim() || !Array.isArray(unit.approvedAliases) ||
     !unit.approvedAliases.every(v=>typeof v==='string' && !!v.trim()) ||
     typeof unit.textForEmbedding!=='string' || !unit.requiresOwnerAuthorizationAtCaller || unit.generatedEmbeddings!==false ||
     !Array.isArray(unit.sourceIds) || unit.sourceIds.length<1) return {ok:false,reason:'INVALID_UNIT'};
  // Recompute canonical text: caller cannot substitute hidden/private strings or alter the payload unnoticed.
  const payload=JSON.stringify({title:unit.title,definition:unit.definition,approvedAliases:unit.approvedAliases});
  if(payload!==unit.textForEmbedding || payload.length>16000 || unit.onId!==unit.onId.toLowerCase() ||
     new Set(unit.approvedAliases).size!==unit.approvedAliases.length ||
     !unit.approvedAliases.every((v,i,a)=>i===0 || a[i-1]<v) ||
     (unit.scope.kind==='owner_private' && unit.scope.ownerActorId!==unit.scope.ownerActorId.toLowerCase()))
    return {ok:false,reason:'INVALID_UNIT'};
  if(!model || !modelName.test(model.modelId) || !version.test(model.modelVersion) ||
     !Number.isInteger(model.dimensions) || model.dimensions<1 || model.dimensions>65536)
    return {ok:false,reason:'INVALID_MODEL'};
  const onId=unit.onId;
  const ownerActorId=unit.scope.kind==='owner_private'?unit.scope.ownerActorId:null;
  const shared=[onId,unit.locale,unit.scope.kind,ownerActorId,model.modelId,model.modelVersion,
    model.dimensions,EMBEDDING_CACHE_PREPROCESSING_V1];
  const contentSha256=hash(payload);
  // Reuse key deliberately omits the *labels* of ontology and dictionary versions:
  // if all approved content bytes are identical, no new paid embedding is needed.
  // It still includes ON UUID, locale, full privacy scope, model identity/dimensions and content hash.
  const reusableVectorKey=hash(JSON.stringify(['REUSE_V1',...shared,contentSha256]));
  const versionedLogicalKey=hash(JSON.stringify(['VERSION_V1',...shared,unit.ontologyVersion,unit.dictionaryVersion,contentSha256]));
  return {ok:true,plan:{contract:EMBEDDING_CACHE_CONTRACT_V1,onId,locale:unit.locale,
    scopeKind:unit.scope.kind,ownerActorId,ontologyVersion:unit.ontologyVersion,
    dictionaryVersion:unit.dictionaryVersion,modelId:model.modelId,modelVersion:model.modelVersion,
    dimensions:model.dimensions,preprocessingVersion:EMBEDDING_CACHE_PREPROCESSING_V1,
    contentSha256,versionedLogicalKey,reusableVectorKey}};
}

/** Pure plan: `existing` must be a caller-authorized row. Never returns vectors. */
export function decideEmbeddingCacheV1(unit: EmbeddingUnitDraftV1,model: EmbeddingModelV1,
  existing: EmbeddingCacheRecordV1 | null,{providerAvailable=false}:{providerAvailable?:boolean}={}):EmbeddingCacheDecisionV1 {
  const built=describeEmbeddingCacheKeyV1(unit,model);
  if(!built.ok)return block(built.reason);
  const plan=built.plan;
  const common={ok:true as const,plan,vectorGenerated:false as const,dbWritesPerformed:false as const,aiCallsPerformed:false as const};
  if(existing){
    if(typeof existing!=='object' || !uuid.test(existing.onId) || !['en','pl','es','de','cs','uk','ru'].includes(existing.locale) ||
       !['global_system','owner_private'].includes(existing.scopeKind) ||
       (existing.scopeKind==='owner_private'&&!uuid.test(existing.ownerActorId || '')) ||
       !modelName.test(existing.modelId) || !version.test(existing.modelVersion) ||
       !Number.isInteger(existing.dimensions) || !digest.test(existing.contentSha256) ||
       !digest.test(existing.reusableVectorKey) || !digest.test(existing.versionedLogicalKey) ||
       !['ready','stale','revoked','pending'].includes(existing.state) || typeof existing.hasVector!=='boolean')
      return block('INVALID_RECORD');
    if(existing.onId!==plan.onId || existing.locale!==plan.locale ||
       existing.scopeKind!==plan.scopeKind || existing.ownerActorId!==plan.ownerActorId)
      return block('SCOPE_MISMATCH');
    if(existing.state==='revoked') return block('REVOKED_RECORD');
    if(existing.state==='ready' && existing.hasVector && existing.reusableVectorKey===plan.reusableVectorKey &&
       existing.modelId===plan.modelId && existing.modelVersion===plan.modelVersion &&
       existing.dimensions===plan.dimensions && existing.contentSha256===plan.contentSha256)
      return {...common,decision:'REUSE_READY',versionAliasRequired:existing.versionedLogicalKey!==plan.versionedLogicalKey};
  }
  const reason = !existing ? 'CACHE_MISS' as const :
    existing.modelId!==plan.modelId || existing.modelVersion!==plan.modelVersion || existing.dimensions!==plan.dimensions
    ? 'MODEL_CHANGED' as const : existing.contentSha256!==plan.contentSha256 ? 'SOURCE_CHANGED' as const : 'UNAVAILABLE' as const;
  if(!providerAvailable)return {...common,decision:'LEXICAL_ONLY',reason:'UNAVAILABLE'};
  // This is a proposal, not an authorization or a billable call.
  return {...common,decision:'RECALCULATE_REQUIRES_APPROVAL',reason};
}
