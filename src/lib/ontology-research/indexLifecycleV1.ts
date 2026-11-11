/**
 * ARCTor / ARI-03.07.01 / M-0132. Versioned index lifecycle, PURE planning.
 * This module never executes SQL, calls paid APIs, publishes an index or grants ACL.
 * Future M-0133: dry-run/rebuild; M-0134: ACL; M-0135: pending replay; M-0136: fallback orchestration.
 */
import { createHash } from 'node:crypto';

export const INDEX_LIFECYCLE_CONTRACT_V1 = 'ARCTOR_ARI03_INDEX_LIFECYCLE_V1' as const;
export type IndexStatusV1 = 'fresh' | 'stale' | 'building' | 'failed';
export type IndexScopeV1 = { kind: 'global_system'; ownerActorId: null } |
  { kind: 'owner_private'; ownerActorId: string };

export type IndexSourceUnitV1 = {
  onId: string;
  locale: 'en' | 'pl' | 'es' | 'de' | 'cs' | 'uk' | 'ru';
  contentSha256: string;
};
export type IndexSourceDescriptionV1 = {
  scope: IndexScopeV1;
  modelId: string;
  modelVersion: string;
  preprocessingVersion: string;
  units: readonly IndexSourceUnitV1[];
};
export type IndexLifecycleRecordV1 = {
  contract: typeof INDEX_LIFECYCLE_CONTRACT_V1;
  index_id: string;
  scope: IndexScopeV1;
  model_id: string;
  model_version: string;
  index_generation: number;
  source_hash: string;
  status: IndexStatusV1;
  published_generation: number;
  published_source_hash: string | null;
  building_generation: number | null;
  building_source_hash: string | null;
  last_failure_code: string | null;
};
export type IndexLifecycleEventV1 =
  | { kind: 'SOURCE_CHANGED'; source_hash: string }
  | { kind: 'BUILD_STARTED' }
  | { kind: 'BUILD_SUCCEEDED'; generation: number; source_hash: string }
  | { kind: 'BUILD_FAILED'; generation: number; source_hash: string; failure_code: string };
export type IndexLifecycleDecisionV1 =
  | { ok: true; record: IndexLifecycleRecordV1; changed: boolean; writesPerformed: false; paidCallsPerformed: false }
  | { ok: false; reason: 'INVALID_RECORD' | 'INVALID_EVENT' | 'INVALID_TRANSITION' | 'STALE_COMPLETION' | 'GENERATION_EXHAUSTED'; writesPerformed: false; paidCallsPerformed: false };
export type IndexDiagnosticV1 = {
  index_id: string; status: IndexStatusV1; index_generation: number; source_hash: string;
  published_generation: number; published_source_hash: string | null;
  pending_generation: number | null; needs_rebuild: boolean;
  vector_path_eligible: boolean; fallback: 'lexical_only' | 'index_ready_for_future_authorized_read';
  last_failure_code: string | null; databaseVerified: false; aclVerified: false;
};

const digest = /^[A-F0-9]{64}$/;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ident = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}$/;
const model = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/;
const validGeneration = (n: unknown): n is number => Number.isSafeInteger(n) && (n as number) >= 0;
const sha = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex').toUpperCase();
const invalid = (reason: Extract<IndexLifecycleDecisionV1,{ok:false}>['reason']):IndexLifecycleDecisionV1 =>
  ({ok:false,reason,writesPerformed:false,paidCallsPerformed:false});
const scopeOkay = (v: unknown): v is IndexScopeV1 => {
  if (!v || typeof v !== 'object') return false;
  const s = v as Partial<IndexScopeV1>;
  return (s.kind === 'global_system' && s.ownerActorId === null) ||
    (s.kind === 'owner_private' && typeof s.ownerActorId === 'string' && uuid.test(s.ownerActorId));
};

/** Stable source snapshot fingerprint: sorted immutable units, scoped to model and owner. */
export function calculateIndexSourceHashV1(source: IndexSourceDescriptionV1):
  { ok: true; source_hash: string; unit_count: number } | { ok: false; reason: 'INVALID_SOURCE' } {
  if (!source || !scopeOkay(source.scope) || !model.test(source.modelId) ||
    !ident.test(source.modelVersion) || !ident.test(source.preprocessingVersion) ||
    !Array.isArray(source.units) || source.units.length > 200000) return {ok:false,reason:'INVALID_SOURCE'};
  const ids = new Set<string>();
  const entries: string[] = [];
  for (const v of source.units) {
    if (!v || typeof v.onId !== 'string' || !uuid.test(v.onId) ||
      !['en','pl','es','de','cs','uk','ru'].includes(v.locale) || !digest.test(v.contentSha256))
      return {ok:false,reason:'INVALID_SOURCE'};
    const key = JSON.stringify([v.onId,v.locale]);
    if (ids.has(key)) return {ok:false,reason:'INVALID_SOURCE'};
    ids.add(key);
    entries.push(JSON.stringify([v.onId,v.locale,v.contentSha256]));
  }
  entries.sort();
  const serialized = JSON.stringify([INDEX_LIFECYCLE_CONTRACT_V1,source.scope.kind,
    source.scope.ownerActorId,source.modelId,source.modelVersion,source.preprocessingVersion,entries]);
  return {ok:true,source_hash:sha(serialized),unit_count:entries.length};
}

/** New indexes always start stale, with NO published generation. */
export function createIndexLifecycleV1(indexId: string, source: IndexSourceDescriptionV1):
  { ok:true;record:IndexLifecycleRecordV1 } | { ok:false;reason:'INVALID_SOURCE'|'INVALID_INDEX_ID' } {
  if (typeof indexId !== 'string' || !ident.test(indexId)) return {ok:false,reason:'INVALID_INDEX_ID'};
  const result=calculateIndexSourceHashV1(source);
  if (!result.ok) return result;
  return {ok:true,record:{
    contract:INDEX_LIFECYCLE_CONTRACT_V1,index_id:indexId,scope:{...source.scope},
    model_id:source.modelId,model_version:source.modelVersion,index_generation:0,
    source_hash:result.source_hash,status:'stale',published_generation:0,published_source_hash:null,
    building_generation:null,building_source_hash:null,last_failure_code:null
  }};
}

export function validateIndexLifecycleV1(r: unknown): r is IndexLifecycleRecordV1 {
  if (!r || typeof r !== 'object') return false;
  const a=r as IndexLifecycleRecordV1;
  if (a.contract!==INDEX_LIFECYCLE_CONTRACT_V1 || !ident.test(a.index_id) || !scopeOkay(a.scope) ||
    !model.test(a.model_id) || !ident.test(a.model_version) ||
    !validGeneration(a.index_generation) || !digest.test(a.source_hash) ||
    !['fresh','stale','building','failed'].includes(a.status) ||
    !validGeneration(a.published_generation) || a.published_generation>a.index_generation ||
    (a.published_source_hash!==null && !digest.test(a.published_source_hash)) ||
    ((a.published_generation===0)!==(a.published_source_hash===null)) ||
    (a.building_generation!==null && (!validGeneration(a.building_generation) || a.building_generation===0)) ||
    (a.building_source_hash!==null && !digest.test(a.building_source_hash)) ||
    ((a.building_generation===null)!==(a.building_source_hash===null)) ||
    a.last_failure_code!==null && (typeof a.last_failure_code!=='string' || !ident.test(a.last_failure_code)))return false;
  if (a.status==='building') return a.building_generation===a.index_generation &&
    a.building_source_hash===a.source_hash && a.index_generation>a.published_generation &&
    a.last_failure_code===null;
  if (a.building_generation!==null || a.building_source_hash!==null) return false;
  if (a.status==='fresh') return a.published_generation===a.index_generation &&
    a.published_generation>0 && a.published_source_hash===a.source_hash && a.last_failure_code===null;
  if (a.status==='failed')return a.index_generation>0 && a.last_failure_code!==null;
  if (a.status==='stale')return a.last_failure_code===null;
  return false;
}

/** Pure transition, no index publish/SQL/job scheduling. All stale completions are rejected. */
export function transitionIndexLifecycleV1(record: IndexLifecycleRecordV1,event: IndexLifecycleEventV1):IndexLifecycleDecisionV1 {
  if (!validateIndexLifecycleV1(record))return invalid('INVALID_RECORD');
  if (!event || typeof event!=='object' || !('kind' in event))return invalid('INVALID_EVENT');
  const copy=(patch:Partial<IndexLifecycleRecordV1>):IndexLifecycleDecisionV1 => ({ok:true,changed:true,
    record:{...record,scope:{...record.scope},...patch},writesPerformed:false,paidCallsPerformed:false});
  if(event.kind==='SOURCE_CHANGED'){
    if (typeof event.source_hash!=='string' || !digest.test(event.source_hash))return invalid('INVALID_EVENT');
    if(event.source_hash===record.source_hash)return {ok:true,record:{...record,scope:{...record.scope}},changed:false,writesPerformed:false,paidCallsPerformed:false};
    return copy({source_hash:event.source_hash,status:'stale',building_generation:null,
      building_source_hash:null,last_failure_code:null});
  }
  if(event.kind==='BUILD_STARTED'){
    if(!['stale','failed'].includes(record.status))return invalid('INVALID_TRANSITION');
    if(record.index_generation>=Number.MAX_SAFE_INTEGER)return invalid('GENERATION_EXHAUSTED');
    return copy({index_generation:record.index_generation+1,status:'building',
      building_generation:record.index_generation+1,building_source_hash:record.source_hash,last_failure_code:null});
  }
  if(event.kind==='BUILD_SUCCEEDED' || event.kind==='BUILD_FAILED'){
    if(!validGeneration(event.generation) || event.generation===0 ||
      typeof event.source_hash!=='string' || !digest.test(event.source_hash) ||
      (event.kind==='BUILD_FAILED' && (typeof event.failure_code!=='string' || !ident.test(event.failure_code))))
      return invalid('INVALID_EVENT');
    if(record.status!=='building' || record.building_generation!==event.generation ||
      record.building_source_hash!==event.source_hash || record.source_hash!==event.source_hash)
      return invalid('STALE_COMPLETION');
    if(event.kind==='BUILD_SUCCEEDED')return copy({status:'fresh',published_generation:event.generation,
      published_source_hash:event.source_hash,building_generation:null,building_source_hash:null,last_failure_code:null});
    return copy({status:'failed',building_generation:null,building_source_hash:null,
      last_failure_code:event.failure_code});
  }
  return invalid('INVALID_EVENT');
}

/** Admin diagnostics only: "eligible" never grants a read or claims real database/RLS checks. */
export function describeIndexLifecycleV1(record: IndexLifecycleRecordV1):
  {ok:true;diagnostic:IndexDiagnosticV1}|{ok:false;reason:'INVALID_RECORD'}{
  if(!validateIndexLifecycleV1(record))return {ok:false,reason:'INVALID_RECORD'};
  const eligible=record.status==='fresh';
  return {ok:true,diagnostic:{index_id:record.index_id,status:record.status,
    index_generation:record.index_generation,source_hash:record.source_hash,
    published_generation:record.published_generation,published_source_hash:record.published_source_hash,
    pending_generation:record.building_generation,needs_rebuild:!eligible,
    vector_path_eligible:eligible,
    fallback:eligible?'index_ready_for_future_authorized_read':'lexical_only',
    last_failure_code:record.last_failure_code,databaseVerified:false,aclVerified:false}};
}

/** M-0133 / ARI-03.07.02 — read-only index rebuild preview, not a rebuild command. */
export const INDEX_REBUILD_PREVIEW_CONTRACT_V1 = 'ARCTOR_ARI03_INDEX_REBUILD_PREVIEW_V1' as const;
export type IndexRebuildPreviewV1 = {
  contract: typeof INDEX_REBUILD_PREVIEW_CONTRACT_V1;
  index_id: string;
  index_generation: number;
  status: IndexStatusV1;
  published_generation: number;
  source_hash: string;
  published_source_hash: string | null;
  added_on_count: number;
  modified_on_count: number;
  removed_on_count: number;
  unchanged_on_count: number;
  affected_on_count: number;
  added_unit_count: number;
  modified_unit_count: number;
  removed_unit_count: number;
  unchanged_unit_count: number;
  embeddings_to_calculate: number;
  needs_rebuild: boolean;
  suggested_action: 'NO_REBUILD' | 'WAIT_FOR_CURRENT_BUILD' | 'REBUILD_REQUIRES_APPROVAL';
  baseline_verified: boolean;
  target_verified: true;
  dry_run: true;
  writesPerformed: false;
  paidCallsPerformed: false;
  sqlExecuted: false;
  indexRebuilt: false;
  approvalGranted: false;
  aclVerified: false;
};
export type IndexRebuildPreviewDecisionV1 =
  | {ok:true;preview:IndexRebuildPreviewV1}
  | {ok:false;reason:'INVALID_RECORD'|'INVALID_SOURCE'|'SOURCE_SCOPE_MISMATCH'|
     'SOURCE_MODEL_MISMATCH'|'TARGET_HASH_MISMATCH'|'PUBLISHED_SNAPSHOT_REQUIRED'|
     'UNEXPECTED_PUBLISHED_SNAPSHOT'|'PUBLISHED_HASH_MISMATCH'};

/** Counts ONs and locale-specific embedding units without publishing or charging.
 *  A complete published snapshot is mandatory whenever published_generation > 0.
 *  Missing/contradictory baselines fail closed rather than treating all records as new.
 */
export function previewIndexRebuildV1(
  record: IndexLifecycleRecordV1,
  publishedSource: IndexSourceDescriptionV1 | null,
  desiredSource: IndexSourceDescriptionV1
): IndexRebuildPreviewDecisionV1 {
  if (!validateIndexLifecycleV1(record)) return {ok:false,reason:'INVALID_RECORD'};
  if (!desiredSource || !calculateIndexSourceHashV1(desiredSource).ok)
    return {ok:false,reason:'INVALID_SOURCE'};
  const scopeEq = (s: IndexScopeV1): boolean =>
    s.kind===record.scope.kind && s.ownerActorId===record.scope.ownerActorId;
  if (!scopeEq(desiredSource.scope)) return {ok:false,reason:'SOURCE_SCOPE_MISMATCH'};
  if (desiredSource.modelId!==record.model_id || desiredSource.modelVersion!==record.model_version)
    return {ok:false,reason:'SOURCE_MODEL_MISMATCH'};
  const targetHash=calculateIndexSourceHashV1(desiredSource);
  if (!targetHash.ok) return {ok:false,reason:'INVALID_SOURCE'};
  if (targetHash.source_hash!==record.source_hash)
    return {ok:false,reason:'TARGET_HASH_MISMATCH'};
  if (record.published_generation===0 && publishedSource!==null)
    return {ok:false,reason:'UNEXPECTED_PUBLISHED_SNAPSHOT'};
  if (record.published_generation>0 && publishedSource===null)
    return {ok:false,reason:'PUBLISHED_SNAPSHOT_REQUIRED'};
  if (publishedSource!==null) {
    const publishedHash=calculateIndexSourceHashV1(publishedSource);
    if (!publishedHash.ok) return {ok:false,reason:'INVALID_SOURCE'};
    if (!scopeEq(publishedSource.scope)) return {ok:false,reason:'SOURCE_SCOPE_MISMATCH'};
    if (publishedSource.modelId!==record.model_id || publishedSource.modelVersion!==record.model_version)
      return {ok:false,reason:'SOURCE_MODEL_MISMATCH'};
    if (publishedHash.source_hash!==record.published_source_hash)
      return {ok:false,reason:'PUBLISHED_HASH_MISMATCH'};
  }
  const toUnits=(s:IndexSourceDescriptionV1|null):Map<string,string> =>
    new Map((s?.units ?? []).map(u=>[JSON.stringify([u.onId,u.locale]),u.contentSha256]));
  const oldUnits=toUnits(publishedSource),newUnits=toUnits(desiredSource);
  const oldONs=new Map<string,Map<string,string>>(),newONs=new Map<string,Map<string,string>>();
  const mapON=(s:IndexSourceDescriptionV1|null,m:Map<string,Map<string,string>>)=>{
    for(const u of s?.units ?? []){
      const loc=m.get(u.onId) ?? new Map<string,string>();
      loc.set(u.locale,u.contentSha256);m.set(u.onId,loc);
    }
  };
  mapON(publishedSource,oldONs);mapON(desiredSource,newONs);
  let addedUnits=0,modifiedUnits=0,removedUnits=0,unchangedUnits=0;
  for(const [key,h] of newUnits){
    if(!oldUnits.has(key))addedUnits++;
    else if(oldUnits.get(key)!==h)modifiedUnits++;
    else unchangedUnits++;
  }
  for(const key of oldUnits.keys())if(!newUnits.has(key))removedUnits++;
  let addedONs=0,modifiedONs=0,removedONs=0,unchangedONs=0;
  for(const [onId,newLoc] of newONs){
    const oldLoc=oldONs.get(onId);
    if(!oldLoc){addedONs++;continue;}
    const equal=oldLoc.size===newLoc.size && [...newLoc].every(([loc,h])=>oldLoc.get(loc)===h);
    if(equal)unchangedONs++;else modifiedONs++;
  }
  for(const onId of oldONs.keys())if(!newONs.has(onId))removedONs++;
  const affected=addedONs+modifiedONs+removedONs;
  const needs=record.status!=='fresh'||record.published_source_hash!==record.source_hash||affected>0;
  const action=record.status==='building' ? 'WAIT_FOR_CURRENT_BUILD' :
    needs ? 'REBUILD_REQUIRES_APPROVAL' : 'NO_REBUILD';
  return {ok:true,preview:{
    contract:INDEX_REBUILD_PREVIEW_CONTRACT_V1,index_id:record.index_id,
    index_generation:record.index_generation,status:record.status,
    published_generation:record.published_generation,source_hash:record.source_hash,
    published_source_hash:record.published_source_hash,
    added_on_count:addedONs,modified_on_count:modifiedONs,removed_on_count:removedONs,
    unchanged_on_count:unchangedONs,affected_on_count:affected,
    added_unit_count:addedUnits,modified_unit_count:modifiedUnits,
    removed_unit_count:removedUnits,unchanged_unit_count:unchangedUnits,
    embeddings_to_calculate:addedUnits+modifiedUnits,needs_rebuild:needs,
    suggested_action:action,baseline_verified:publishedSource!==null||record.published_generation===0,
    target_verified:true,dry_run:true,writesPerformed:false,paidCallsPerformed:false,
    sqlExecuted:false,indexRebuilt:false,approvalGranted:false,aclVerified:false
  }};
}

/**
 * M-0134 / ARI-03.07.03 — scoped ACL guard for search suggestions and embedding hits.
 * This is a pure server-side boundary contract. The authenticated actor MUST be
 * resolved from the verified session, never supplied as an authorization claim by a client.
 * Never execute vector search against an index excluded by the pre-search plan.
 * Subsequent DB RLS and E2E verification remain M-0137 and later acceptance work.
 */
export const INDEX_SEARCH_ACL_CONTRACT_V1 = 'ARCTOR_ARI03_SEARCH_ACL_V1' as const;
export type AclSearchLocaleV1 = IndexSourceUnitV1['locale'];
export type AclSearchChannelV1 = 'suggestion' | 'embedding';
export type AclSearchHitV1 = {
  index_id: string;
  index_generation: number;
  source_hash: string;
  on_id: string;
  locale: AclSearchLocaleV1;
  channel: AclSearchChannelV1;
  label?: string;
  score?: number;
};
export type AclSearchReadPlanV1 = {
  contract: typeof INDEX_SEARCH_ACL_CONTRACT_V1;
  allowed_indexes: readonly { index_id: string; index_generation: number; source_hash: string }[];
  authorized: true;
  databaseAclVerified: false;
  writesPerformed: false;
  paidCallsPerformed: false;
};
export type AclSearchResultV1 = {
  contract: typeof INDEX_SEARCH_ACL_CONTRACT_V1;
  suggestions: readonly { index_id: string; on_id: string; locale: AclSearchLocaleV1; label: string }[];
  embeddings: readonly { index_id: string; on_id: string; locale: AclSearchLocaleV1; score: number }[];
  authorized: true;
  rawVectorsReturned: false;
  databaseAclVerified: false;
  writesPerformed: false;
  paidCallsPerformed: false;
};
export type AclSearchErrorV1 = {
  ok: false;
  reason: 'INVALID_ACTOR' | 'INVALID_INDEX_CATALOG' | 'INVALID_HITS' | 'UNAUTHORIZED_RESULT';
  writesPerformed: false;
  paidCallsPerformed: false;
};
const denySearchAclV1 = (reason: AclSearchErrorV1['reason']): AclSearchErrorV1 =>
  ({ok:false,reason,writesPerformed:false,paidCallsPerformed:false});
const aclActorValidV1 = (id: unknown): id is string|null =>
  id === null || (typeof id === 'string' && uuid.test(id));
const indexReadableForActorV1 = (index: IndexLifecycleRecordV1, actor: string|null): boolean =>
  index.status === 'fresh' && (
    (index.scope.kind === 'global_system' && index.scope.ownerActorId === null) ||
    (index.scope.kind === 'owner_private' && actor !== null && index.scope.ownerActorId === actor)
  );
/** Authorize index partitions BEFORE search; do not return identifiers of denied partitions. */
export function prepareScopedIndexReadV1(authenticatedActorId: string|null,
  indexes: readonly IndexLifecycleRecordV1[]):
  {ok:true;plan:AclSearchReadPlanV1}|AclSearchErrorV1 {
  if (!aclActorValidV1(authenticatedActorId)) return denySearchAclV1('INVALID_ACTOR');
  if (!Array.isArray(indexes) || indexes.length>20000) return denySearchAclV1('INVALID_INDEX_CATALOG');
  const ids=new Set<string>();
  const allowed: {index_id:string;index_generation:number;source_hash:string}[]=[];
  for (const index of indexes) {
    if (!validateIndexLifecycleV1(index) || ids.has(index.index_id))
      return denySearchAclV1('INVALID_INDEX_CATALOG');
    ids.add(index.index_id);
    if (indexReadableForActorV1(index,authenticatedActorId)) {
      allowed.push({index_id:index.index_id,index_generation:index.published_generation,
        source_hash:index.published_source_hash!});
    }
  }
  allowed.sort((a,b)=>a.index_id<b.index_id?-1:a.index_id>b.index_id?1:0);
  return {ok:true,plan:{contract:INDEX_SEARCH_ACL_CONTRACT_V1,allowed_indexes:allowed,
    authorized:true,databaseAclVerified:false,writesPerformed:false,paidCallsPerformed:false}};
}
const aclLocaleV1 = (v: unknown): v is AclSearchLocaleV1 =>
  typeof v==='string' && ['en','pl','es','de','cs','uk','ru'].includes(v);
const aclHitValidV1 = (v: unknown): v is AclSearchHitV1 => {
  if (!v || typeof v!=='object' || Array.isArray(v)) return false;
  const r=v as Record<string,unknown>;
  const fields=Object.keys(r);
  const legal=['index_id','index_generation','source_hash','on_id','locale','channel','label','score'];
  if(fields.some(f=>!legal.includes(f)) || !ident.test(String(r.index_id||'')) ||
    !validGeneration(r.index_generation) || !digest.test(String(r.source_hash||'')) ||
    typeof r.on_id!=='string' || !uuid.test(r.on_id) || !aclLocaleV1(r.locale))return false;
  if(r.channel==='suggestion')return typeof r.label==='string' && r.label.trim().length>0 &&
    r.label.length<=512 && !fields.includes('score');
  if(r.channel==='embedding')return typeof r.score==='number' && Number.isFinite(r.score) &&
    r.score>=-1 && r.score<=1 && !fields.includes('label');
  return false;
};
/** Strict post-search gate. Foreign/stale/unknown index hits fail the entire response. */
export function validateScopedSearchHitsV1(authenticatedActorId: string|null,
  indexes: readonly IndexLifecycleRecordV1[], rawHits: readonly AclSearchHitV1[]):
  {ok:true;result:AclSearchResultV1}|AclSearchErrorV1 {
  const gate=prepareScopedIndexReadV1(authenticatedActorId,indexes);
  if(!gate.ok)return gate;
  if(!Array.isArray(rawHits) || rawHits.length>20000)return denySearchAclV1('INVALID_HITS');
  const access=new Map(gate.plan.allowed_indexes.map(i=>[i.index_id,i]));
  const suggestions: {index_id:string;on_id:string;locale:AclSearchLocaleV1;label:string}[]=[];
  const embeddings: {index_id:string;on_id:string;locale:AclSearchLocaleV1;score:number}[]=[];
  const dedup=new Set<string>();
  for(const h of rawHits){
    if(!aclHitValidV1(h))return denySearchAclV1('INVALID_HITS');
    const match=access.get(h.index_id);
    if(!match || match.index_generation!==h.index_generation || match.source_hash!==h.source_hash)
      return denySearchAclV1('UNAUTHORIZED_RESULT');
    const key=JSON.stringify([h.channel,h.index_id,h.on_id,h.locale]);
    if(dedup.has(key))return denySearchAclV1('INVALID_HITS');
    dedup.add(key);
    if(h.channel==='suggestion')suggestions.push({index_id:h.index_id,on_id:h.on_id,locale:h.locale,label:h.label!});
    else embeddings.push({index_id:h.index_id,on_id:h.on_id,locale:h.locale,score:h.score!});
  }
  return {ok:true,result:{contract:INDEX_SEARCH_ACL_CONTRACT_V1,suggestions,embeddings,
    authorized:true,rawVectorsReturned:false,databaseAclVerified:false,
    writesPerformed:false,paidCallsPerformed:false}};
}
/**
 * M-0135 / ARI-03.07.04 — deterministic, non-executing replay plan for pending index updates.
 * A failed indexing job cannot automatically resume, pay for embeddings, or publish an index.
 * The executor must later enforce session auth, owner approval and backend idempotency.
 */
export const INDEX_PENDING_REPLAY_CONTRACT_V1 = 'ARCTOR_ARI03_PENDING_INDEX_REPLAY_V1' as const;
export type PendingUpdateStateV1 = 'pending' | 'in_flight' | 'failed' | 'applied' | 'dead_letter';
export type PendingUpdateOperationV1 = 'UPSERT' | 'DELETE';
export type PendingIndexUpdateV1 = {
  update_id: string;
  index_id: string;
  scope: IndexScopeV1;
  source_hash: string;
  on_id: string;
  locale: IndexSourceUnitV1['locale'];
  sequence: number;
  operation: PendingUpdateOperationV1;
  content_sha256: string | null;
  state: PendingUpdateStateV1;
  attempts: number;
};
export type PendingReplayOptionsV1 = { maxBatch: number; maxAttempts: number };
export type PendingIndexReplayItemV1 = {
  update_id: string;
  on_id: string;
  locale: IndexSourceUnitV1['locale'];
  sequence: number;
  operation: PendingUpdateOperationV1;
  content_sha256: string | null;
  attempts_so_far: number;
  /** Stable idempotency identity for a future authorized executor. */
  replay_key: string;
};
export type PendingIndexReplayPlanV1 = {
  contract: typeof INDEX_PENDING_REPLAY_CONTRACT_V1;
  index_id: string;
  scope: IndexScopeV1;
  source_hash: string;
  failed_generation: number;
  proposed_generation: number;
  index_status: 'stale' | 'failed';
  pending_update_count: number;
  superseded_count: number;
  stale_source_count: number;
  applied_count: number;
  dead_letter_count: number;
  attempts_exhausted_count: number;
  unconfirmed_in_flight_count: number;
  total_replayable_count: number;
  remaining_replayable_count: number;
  replay_items: readonly PendingIndexReplayItemV1[];
  action: 'NO_PENDING_UPDATES' | 'REQUIRES_EXPLICIT_JOB_APPROVAL' | 'MANUAL_REVIEW_REQUIRED';
  fallback: 'lexical_only';
  requiresExplicitJobApproval: true;
  executorMustRevalidateSourceAndGeneration: true;
  rawEmbeddingsIncluded: false;
  writesPerformed: false;
  paidCallsPerformed: false;
  sqlExecuted: false;
  indexRebuilt: false;
  jobStarted: false;
};
export type PendingReplayDecisionV1 =
  | { ok: true; plan: PendingIndexReplayPlanV1 }
  | {ok: false; reason: 'INVALID_INDEX' | 'INDEX_NOT_RECOVERABLE' | 'GENERATION_EXHAUSTED' |
    'INVALID_OPTIONS' | 'INVALID_QUEUE' | 'MIXED_INDEX_OR_OWNER' | 'AMBIGUOUS_SEQUENCE'};
const replayFailV1 = (reason: Extract<PendingReplayDecisionV1,{ok:false}>['reason']):PendingReplayDecisionV1 =>
  ({ok:false,reason});
const pendingStatesV1:readonly string[] = ['pending','in_flight','failed','applied','dead_letter'];
const localesForReplayV1:readonly string[] = ['en','pl','es','de','cs','uk','ru'];

/**
 * Read-only recovery: process only the latest mutation per (ON, locale), never an old
 * mutation before a later applied/tombstone mutation. Old source-hash entries are
 * quarantined; in-flight entries require an index that has actually FAILED.
 * No replay job, SQL, vector/embedding generation, or payment is initiated here.
 */
export function planPendingIndexReplayV1(record: IndexLifecycleRecordV1,
  updates: readonly PendingIndexUpdateV1[], options: PendingReplayOptionsV1):PendingReplayDecisionV1 {
  if (!validateIndexLifecycleV1(record)) return replayFailV1('INVALID_INDEX');
  if (record.status!=='stale' && record.status!=='failed') return replayFailV1('INDEX_NOT_RECOVERABLE');
  if (record.index_generation===Number.MAX_SAFE_INTEGER) return replayFailV1('GENERATION_EXHAUSTED');
  if (!options || !Number.isSafeInteger(options.maxBatch) || options.maxBatch<1 || options.maxBatch>500 ||
      !Number.isSafeInteger(options.maxAttempts) || options.maxAttempts<1 || options.maxAttempts>20)
    return replayFailV1('INVALID_OPTIONS');
  if (!Array.isArray(updates) || updates.length>20000) return replayFailV1('INVALID_QUEUE');
  const ids=new Set<string>(),units=new Map<string,PendingIndexUpdateV1[]>();
  for (const u of updates) {
    if (!u || typeof u!=='object' || Array.isArray(u) ||
        typeof u.update_id!=='string' || !ident.test(u.update_id) ||
        typeof u.index_id!=='string' || !ident.test(u.index_id) ||
        !scopeOkay(u.scope) || typeof u.source_hash!=='string' || !digest.test(u.source_hash) ||
        typeof u.on_id!=='string' || !uuid.test(u.on_id) ||
        !localesForReplayV1.includes(u.locale) || !Number.isSafeInteger(u.sequence) || u.sequence<1 ||
        (u.operation!=='UPSERT' && u.operation!=='DELETE') ||
        (u.operation==='UPSERT' ? typeof u.content_sha256!=='string' || !digest.test(u.content_sha256) : u.content_sha256!==null) ||
        !pendingStatesV1.includes(u.state) || !Number.isSafeInteger(u.attempts) ||
        u.attempts<0 || u.attempts>100000 || ids.has(u.update_id) ||
        Object.keys(u).some(k=>!['update_id','index_id','scope','source_hash','on_id','locale','sequence','operation','content_sha256','state','attempts'].includes(k)))
      return replayFailV1('INVALID_QUEUE');
    if (u.index_id!==record.index_id || u.scope.kind!==record.scope.kind ||
        u.scope.ownerActorId!==record.scope.ownerActorId) return replayFailV1('MIXED_INDEX_OR_OWNER');
    ids.add(u.update_id);
    const key=JSON.stringify([u.on_id,u.locale]);
    const rows=units.get(key) ?? [];
    rows.push(u);units.set(key,rows);
  }
  let superseded=0,stale=0,applied=0,dead=0,exhausted=0,unconfirmed=0;
  const eligible:PendingIndexUpdateV1[]=[];
  for(const rows of units.values()){
    rows.sort((a,b)=>b.sequence-a.sequence || (a.update_id<b.update_id?-1:a.update_id>b.update_id?1:0));
    if(rows.length>1 && rows[0].sequence===rows[1].sequence) return replayFailV1('AMBIGUOUS_SEQUENCE');
    superseded+=rows.length-1;
    const u=rows[0];
    if(u.source_hash!==record.source_hash){stale++;continue;}
    if(u.state==='applied'){applied++;continue;}
    if(u.state==='dead_letter'){dead++;continue;}
    if(u.attempts>=options.maxAttempts){exhausted++;continue;}
    if(u.state==='in_flight' && record.status!=='failed'){unconfirmed++;continue;}
    eligible.push(u);
  }
  eligible.sort((a,b)=>a.sequence-b.sequence || (a.update_id<b.update_id?-1:a.update_id>b.update_id?1:0));
  const batch=eligible.slice(0,options.maxBatch).map(u=>({
    update_id:u.update_id,on_id:u.on_id,locale:u.locale,sequence:u.sequence,
    operation:u.operation,content_sha256:u.content_sha256,attempts_so_far:u.attempts,
    replay_key:sha(JSON.stringify([INDEX_PENDING_REPLAY_CONTRACT_V1,record.index_id,
      record.scope.kind,record.scope.ownerActorId,record.source_hash,u.update_id,u.sequence,
      u.operation,u.on_id,u.locale,u.content_sha256]))
  }));
  const uncertain=dead+exhausted+unconfirmed+stale;
  const action=uncertain>0 ? 'MANUAL_REVIEW_REQUIRED' :
    batch.length>0 ? 'REQUIRES_EXPLICIT_JOB_APPROVAL' : 'NO_PENDING_UPDATES';
  return {ok:true,plan:{
    contract:INDEX_PENDING_REPLAY_CONTRACT_V1,index_id:record.index_id,scope:{...record.scope},
    source_hash:record.source_hash,failed_generation:record.index_generation,
    proposed_generation:record.index_generation+1,index_status:record.status,
    pending_update_count:updates.length,superseded_count:superseded,stale_source_count:stale,
    applied_count:applied,dead_letter_count:dead,attempts_exhausted_count:exhausted,
    unconfirmed_in_flight_count:unconfirmed,total_replayable_count:eligible.length,
    remaining_replayable_count:eligible.length-batch.length,replay_items:batch,action,
    fallback:'lexical_only',requiresExplicitJobApproval:true,
    executorMustRevalidateSourceAndGeneration:true,rawEmbeddingsIncluded:false,
    writesPerformed:false,paidCallsPerformed:false,sqlExecuted:false,indexRebuilt:false,jobStarted:false
  }};
}
/**
 * M-0136 / ARI-03.07.05: bounded, read-only vector -> lexical failover.
 * Adapters MUST be read-only, scope-filtered, abort-aware and non-billable.
 * This module invokes NO SQL, embeddings API, writes, index rebuilds or payments.
 * Local breaker is process-scoped; shared multi-instance coordination and DB E2E
 * verification are deliberately NOT claimed here.
 */
export const INDEX_READ_FALLBACK_CONTRACT_V1 = 'ARCTOR_ARI03_READ_ONLY_FALLBACK_V1' as const;
export type IndexFallbackOptionsV1 = {
  vectorTimeoutMs: number;
  lexicalTimeoutMs: number;
  failureThreshold: number;
  cooldownMs: number;
  maxHits: number;
};
export type IndexReadOnlyContextV1 = {
  readonly allowedIndexIds: readonly string[];
  readonly authenticatedActorId: string | null;
  readonly signal: AbortSignal;
};
export type IndexReadOnlyAdaptersV1 = {
  readonly vectorRead: (context: IndexReadOnlyContextV1) => Promise<readonly AclSearchHitV1[]>;
  readonly lexicalRead: (context: IndexReadOnlyContextV1) => Promise<readonly AclSearchHitV1[]>;
};
export type IndexReadOnlyRequestV1 = {
  authenticatedActorId: string | null;
  indexes: readonly IndexLifecycleRecordV1[];
  vectorIndexId: string;
  /** Caller supplies deterministic request clock; must be monotonic within one breaker. */
  nowMs: number;
  /** Explicit authorization is for read-only vector retrieval; never for paid embedding generation. */
  vectorReadApproved: boolean;
};
export type IndexReadOnlyHitV1 = {
  index_id: string; on_id: string; locale: AclSearchLocaleV1;
  channel: AclSearchChannelV1;
  label?: string; score?: number;
};
export type IndexReadFallbackSuccessV1 = {
  ok: true;
  contract: typeof INDEX_READ_FALLBACK_CONTRACT_V1;
  path: 'vector_read_only' | 'lexical_read_only';
  reason: 'VECTOR_OK' | 'VECTOR_NOT_AUTHORIZED' | 'VECTOR_NOT_FRESH' |
    'VECTOR_NOT_APPROVED' | 'CIRCUIT_OPEN' | 'CIRCUIT_PROBE_BUSY' |
    'VECTOR_TIMEOUT' | 'VECTOR_FAILURE' | 'VECTOR_INVALID_HITS';
  hits: readonly IndexReadOnlyHitV1[];
  breaker: {state: 'closed' | 'open' | 'half_open'; failureCount: number; openedAtMs: number | null};
  databaseAclVerified: false;
  rawVectorsReturned: false;
  writesPerformed: false;
  paidCallsPerformed: false;
  indexRebuilt: false;
};
export type IndexReadFallbackErrorV1 = {
  ok: false;
  reason: 'INVALID_OPTIONS'|'INVALID_REQUEST'|'INVALID_INDEX_CATALOG'|
    'INVALID_ACTOR'|'INVALID_ADAPTER'|'LEXICAL_TIMEOUT'|
    'LEXICAL_FAILURE'|'LEXICAL_INVALID_HITS';
  writesPerformed: false;
  paidCallsPerformed: false;
};
export type IndexReadFallbackDecisionV1 = IndexReadFallbackSuccessV1 | IndexReadFallbackErrorV1;
export type IndexReadFallbackControllerV1 = {
  read(request: IndexReadOnlyRequestV1): Promise<IndexReadFallbackDecisionV1>;
  /** Diagnostic only. Not a durable distributed circuit breaker. */
  diagnostic(authenticatedActorId: string | null, vectorIndexId: string):
    {state: 'closed' | 'open' | 'half_open'; failureCount: number; openedAtMs: number|null};
};
const fallbackErrorV1 = (reason: IndexReadFallbackErrorV1['reason']): IndexReadFallbackErrorV1 =>
  ({ok:false,reason,writesPerformed:false,paidCallsPerformed:false});
const clockValidV1 = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const fallbackOptionsValidV1 = (x: IndexFallbackOptionsV1): boolean =>
  !!x && Number.isSafeInteger(x.vectorTimeoutMs) && x.vectorTimeoutMs >= 1 && x.vectorTimeoutMs <= 60000 &&
  Number.isSafeInteger(x.lexicalTimeoutMs) && x.lexicalTimeoutMs >= 1 && x.lexicalTimeoutMs <= 60000 &&
  Number.isSafeInteger(x.failureThreshold) && x.failureThreshold >= 1 && x.failureThreshold <= 20 &&
  Number.isSafeInteger(x.cooldownMs) && x.cooldownMs >= 1 && x.cooldownMs <= 3600000 &&
  Number.isSafeInteger(x.maxHits) && x.maxHits >= 1 && x.maxHits <= 1000;
type InternalBreakerV1 = {state:'closed'|'open'|'half_open';failures:number;openedAtMs:number|null;probeBusy:boolean;lastNowMs:number};
const initBreakerV1 = ():InternalBreakerV1 => ({state:'closed',failures:0,openedAtMs:null,probeBusy:false,lastNowMs:0});
const breakerCopyV1 = (b:InternalBreakerV1) => ({state:b.state,failureCount:b.failures,openedAtMs:b.openedAtMs});
/** A late success after a timeout cannot close a circuit; Promise.race is final. */
async function boundedReadV1(
  callback: (context: IndexReadOnlyContextV1) => Promise<readonly AclSearchHitV1[]>,
  actor: string|null, allowed:readonly string[], timeoutMs:number
):Promise<{kind:'ok';hits:readonly AclSearchHitV1[]}|{kind:'timeout'|'failure'}>{
  const controller=new AbortController();
  let timer:ReturnType<typeof setTimeout>|undefined;
  const timed=new Promise<{kind:'timeout'|'failure'}>(resolve => {
    timer=setTimeout(()=>{controller.abort();resolve({kind:'timeout'});},timeoutMs);
  });
  const invoked=Promise.resolve().then(()=>callback({authenticatedActorId:actor,allowedIndexIds:Object.freeze([...allowed]),signal:controller.signal}));
  const settled=invoked.then(hits=>({kind:'ok' as const,hits}),()=>({kind:'failure' as const}));
  try { return await Promise.race([settled,timed]); }
  finally { if(timer!==undefined) clearTimeout(timer); controller.abort(); }
}
/**
 * A per-controller in-memory breaker, partitioned by (actor, vector index). Not
 * process-shared. The production caller must give trusted session actor + indexed
 * read-only adapters, and enforce backend RLS separately (M-0137).
 */
export function createIndexReadFallbackV1(options:IndexFallbackOptionsV1,
  adapters:IndexReadOnlyAdaptersV1):IndexReadFallbackControllerV1 | IndexReadFallbackErrorV1 {
  if(!fallbackOptionsValidV1(options))return fallbackErrorV1('INVALID_OPTIONS');
  if(!adapters || typeof adapters.vectorRead!=='function' || typeof adapters.lexicalRead!=='function')
    return fallbackErrorV1('INVALID_ADAPTER');
  const breakers=new Map<string,InternalBreakerV1>();
  const keyFor=(actor:string|null,indexId:string)=>JSON.stringify([actor,indexId]);
  const stateFor=(key:string)=>{
    let b=breakers.get(key);if(!b){b=initBreakerV1();breakers.set(key,b);}return b;
  };
  return {
    diagnostic(actor,indexId){
      if(!(actor===null || typeof actor==='string'&&uuid.test(actor)) ||
        typeof indexId!=='string'||!ident.test(indexId))return breakerCopyV1(initBreakerV1());
      return breakerCopyV1(breakers.get(keyFor(actor,indexId))??initBreakerV1());
    },
    async read(request):Promise<IndexReadFallbackDecisionV1>{
      if(!request || !clockValidV1(request.nowMs) || typeof request.vectorReadApproved!=='boolean' ||
        typeof request.vectorIndexId!=='string' || !ident.test(request.vectorIndexId))
        return fallbackErrorV1('INVALID_REQUEST');
      const gate=prepareScopedIndexReadV1(request.authenticatedActorId,request.indexes);
      if(!gate.ok)return fallbackErrorV1(gate.reason==='INVALID_ACTOR'?'INVALID_ACTOR':'INVALID_INDEX_CATALOG');
      const allowed=gate.plan.allowed_indexes.map(i=>i.index_id);
      const target=request.indexes.find(i=>i.index_id===request.vectorIndexId);
      const key=keyFor(request.authenticatedActorId,request.vectorIndexId);
      const breaker=stateFor(key);
      if(request.nowMs<breaker.lastNowMs)return fallbackErrorV1('INVALID_REQUEST');
      breaker.lastNowMs=request.nowMs;
      let reason:IndexReadFallbackSuccessV1['reason']='VECTOR_NOT_APPROVED';
      let tryVector=Boolean(request.vectorReadApproved);
      if(!tryVector)reason='VECTOR_NOT_APPROVED';
      else if(!target || target.status!=='fresh'){tryVector=false;reason='VECTOR_NOT_FRESH';}
      else if(!allowed.includes(request.vectorIndexId)){tryVector=false;reason='VECTOR_NOT_AUTHORIZED';}
      if(tryVector && breaker.state==='open'){
        if(breaker.openedAtMs===null || request.nowMs-breaker.openedAtMs<options.cooldownMs){
          tryVector=false;reason='CIRCUIT_OPEN';
        } else { breaker.state='half_open';breaker.probeBusy=false; }
      }
      if(tryVector && breaker.state==='half_open'){
        if(breaker.probeBusy){tryVector=false;reason='CIRCUIT_PROBE_BUSY';}
        else breaker.probeBusy=true;
      }
      if(tryVector){
        const result=await boundedReadV1(adapters.vectorRead,request.authenticatedActorId,
          [request.vectorIndexId],options.vectorTimeoutMs);
        let validated:ReturnType<typeof validateScopedSearchHitsV1>|null=null;
        if(result.kind==='ok'){
          validated=validateScopedSearchHitsV1(request.authenticatedActorId,request.indexes,result.hits);
          if(validated.ok && (result.hits.length>options.maxHits || result.hits.some(h=>h.channel!=='embedding'||h.index_id!==request.vectorIndexId)))
            validated=null;
        }
        if(result.kind==='ok' && validated?.ok){
          breaker.state='closed';breaker.failures=0;breaker.openedAtMs=null;breaker.probeBusy=false;
          return {ok:true,contract:INDEX_READ_FALLBACK_CONTRACT_V1,path:'vector_read_only',reason:'VECTOR_OK',
            hits:result.hits.map(h=>({index_id:h.index_id,on_id:h.on_id,locale:h.locale,channel:h.channel,score:h.score})),
            breaker:breakerCopyV1(breaker),databaseAclVerified:false,rawVectorsReturned:false,
            writesPerformed:false,paidCallsPerformed:false,indexRebuilt:false};
        }
        reason=result.kind==='timeout'?'VECTOR_TIMEOUT':result.kind==='failure'?'VECTOR_FAILURE':'VECTOR_INVALID_HITS';
        breaker.failures=Math.min(breaker.failures+1,options.failureThreshold);
        if(breaker.state==='half_open'||breaker.failures>=options.failureThreshold){
          breaker.state='open';breaker.openedAtMs=request.nowMs;
        }
        breaker.probeBusy=false;
      }
      // Lexical retrieval is a separate read-only, already authorized adapter.
      // An invalid/unauthorized result FAILS CLOSED; do not show unchecked hits.
      const lexical=await boundedReadV1(adapters.lexicalRead,request.authenticatedActorId,
        allowed,options.lexicalTimeoutMs);
      if(lexical.kind==='timeout')return fallbackErrorV1('LEXICAL_TIMEOUT');
      if(lexical.kind!=='ok')return fallbackErrorV1('LEXICAL_FAILURE');
      const checked=validateScopedSearchHitsV1(request.authenticatedActorId,request.indexes,lexical.hits);
      if(!checked.ok || lexical.hits.length>options.maxHits ||
        lexical.hits.some(h=>h.channel!=='suggestion'))return fallbackErrorV1('LEXICAL_INVALID_HITS');
      return {ok:true,contract:INDEX_READ_FALLBACK_CONTRACT_V1,path:'lexical_read_only',reason,
        hits:lexical.hits.map(h=>({index_id:h.index_id,on_id:h.on_id,locale:h.locale,channel:h.channel,label:h.label})),
        breaker:breakerCopyV1(breaker),databaseAclVerified:false,rawVectorsReturned:false,
        writesPerformed:false,paidCallsPerformed:false,indexRebuilt:false};
    }
  };
}


/** ARCTor ARI-03.07.06 / M-0137: migration-time public table GRANT+RLS policy gate.
 * Pure CODE audit; this does not query PostgreSQL or infer live database safety.
 */
export const PUBLIC_TABLE_ACL_GATE_CONTRACT_V1 = 'ARCTOR_ARI03_PUBLIC_TABLE_ACL_GATE_V1' as const;
export type PublicTableAclIssueV1 = {
  file: string; table: string; code: string;
};
export type PublicMigrationSqlV1 = { path: string; sql: string };
export type PublicTableAclGateResultV1 = {
  contract: typeof PUBLIC_TABLE_ACL_GATE_CONTRACT_V1;
  ok: boolean; cutoffYYYYMMDD: string; scannedFiles: number;
  checkedPublicTables: number; tables: readonly string[];
  issues: readonly PublicTableAclIssueV1[];
  liveDatabaseVerified: false; sqlExecuted: false; writesPerformed: false;
};

// Split statements outside SQL comments, quoted strings and dollar-quoted blocks.
// Unknown dynamic-DDL remains a blocker. No SQL is ever executed.
function splitMigrationStatementsV1(sql: string): string[] {
  if (typeof sql !== 'string' || sql.length > 2_000_000) throw new Error('SQL_SIZE');
  const result: string[] = [];
  let text = '', i = 0, mode: 'plain' | 'single' | 'double' | 'line' | 'block' | 'dollar' = 'plain';
  let blockDepth = 0, dollar = '';
  while (i < sql.length) {
    const ch = sql[i], next = sql[i + 1] ?? '';
    if (mode === 'line') {
      if (ch === '\n') { text += '\n'; mode = 'plain'; } i++; continue;
    }
    if (mode === 'block') {
      if (ch === '/' && next === '*') { blockDepth++; i += 2; continue; }
      if (ch === '*' && next === '/') { blockDepth--; i += 2; if (!blockDepth) mode = 'plain'; continue; }
      if (ch === '\n') text += '\n'; i++; continue;
    }
    if (mode === 'single') {
      text += ch; i++;
      if (ch === "'" && sql[i] === "'") { text += sql[i]; i++; }
      else if (ch === "'") mode = 'plain';
      continue;
    }
    if (mode === 'double') {
      text += ch; i++;
      if (ch === '"' && sql[i] === '"') { text += sql[i]; i++; }
      else if (ch === '"') mode = 'plain';
      continue;
    }
    if (mode === 'dollar') {
      if (sql.startsWith(dollar, i)) { text += dollar; i += dollar.length; mode = 'plain'; }
      else { text += ch; i++; }
      continue;
    }
    if (ch === '-' && next === '-') { mode = 'line'; i += 2; text += ' '; continue; }
    if (ch === '/' && next === '*') { mode = 'block'; blockDepth = 1; i += 2; text += ' '; continue; }
    if (ch === "'") { mode = 'single'; text += ch; i++; continue; }
    if (ch === '"') { mode = 'double'; text += ch; i++; continue; }
    if (ch === '$') {
      const found = /^\$[A-Za-z_0-9]*\$/.exec(sql.slice(i));
      if (found) { dollar = found[0]; text += dollar; i += dollar.length; mode = 'dollar'; continue; }
    }
    if (ch === ';') { if (text.trim()) result.push(text.trim()); text = ''; i++; continue; }
    text += ch; i++;
  }
  if (mode === 'single' || mode === 'double' || mode === 'dollar' || mode === 'block') {
    throw new Error('SQL_UNTERMINATED');
  }
  if (text.trim()) result.push(text.trim());
  return result;
}
const PUBLIC_IDENTIFIER_V1 = '(?:"(?:[^"]|"")*"|[A-Za-z_][A-Za-z_0-9]*)';
const PUBLIC_TABLE_NAME_RE_V1 = new RegExp('^(' + PUBLIC_IDENTIFIER_V1 + ')(?:\\s*\\.\\s*(' + PUBLIC_IDENTIFIER_V1 + '))?');
function tableNameFromV1(raw: string): { name: string; schema: string } | null {
  const m = PUBLIC_TABLE_NAME_RE_V1.exec(raw.trim()); if (!m) return null;
  const norm = (n: string): string => n.startsWith('"') ? n.slice(1, -1).replace(/""/g, '"') : n.toLowerCase();
  const schema = m[2] ? norm(m[1]) : '';
  return { schema, name: norm(m[2] || m[1]) };
}
function listedRolesV1(text: string): string[] {
  return text.split(',').map(v => v.trim().replace(/^"(.*)"$/, '$1').toLowerCase()).filter(Boolean);
}
export function auditPublicTableMigrationsV1(
  files: readonly PublicMigrationSqlV1[], cutoffYYYYMMDD = '20261030',
): PublicTableAclGateResultV1 {
  if (!Array.isArray(files) || files.length > 5000 || !/^\d{8}$/.test(cutoffYYYYMMDD)) throw new Error('AUDIT_INPUT');
  const issues: PublicTableAclIssueV1[] = [], collected = new Set<string>();
  const seenFilePaths = new Set<string>();
  let scanned = 0;
  for (const file of files) {
    if (!file || typeof file.path !== 'string' || typeof file.sql !== 'string' || file.path.length > 512 ||
        !/^[A-Za-z0-9_.\/-]+$/.test(file.path) || file.path.includes('..') || !file.path.endsWith('.sql')) {
      throw new Error('INVALID_MIGRATION_FILE');
    }
    if (file.sql.length > 2_000_000) throw new Error('SQL_SIZE');
    if (seenFilePaths.has(file.path)) throw new Error('DUPLICATE_MIGRATION_FILE');
    seenFilePaths.add(file.path);
    const filename = file.path.split('/').pop() ?? '';
    const dateMatch = /^(\d{8})(?:\d{6})?_/.exec(filename);
    if (!dateMatch) { issues.push({ file: file.path, table: '*', code: 'UNKNOWN_MIGRATION_DATE' }); continue; }
    if (dateMatch[1] < cutoffYYYYMMDD) continue;
    scanned++;
    let statements: string[];
    try { statements = splitMigrationStatementsV1(file.sql); }
    catch { issues.push({ file: file.path, table: '*', code: 'UNPARSABLE_SQL' }); continue; }
    type Entry = { grant: boolean; rls: boolean; policy: boolean; disabled: boolean };
    const tables = new Map<string, Entry>();
    const resolve = (s: string): string | null => {
      const t = tableNameFromV1(s);
      return t && t.schema === 'public' ? 'public.' + t.name : null;
    };
    const createRe = /^create\s+(?:unlogged\s+)?table\s+(?:if\s+not\s+exists\s+)?([\s\S]+)$/i;
    const alterRlsRe = /^alter\s+table\s+(?:if\s+exists\s+)?([\s\S]+?)\s+(enable|disable)\s+row\s+level\s+security\s*$/i;
    const policyRe = /^create\s+policy\s+(?:"(?:[^"]|"")*"|[A-Za-z_][A-Za-z_0-9]*)\s+on\s+([\s\S]+?)\s*(?:as\s+\w+\s*)?(?:for\s+\w+\s*)?(?:to\s+[\s\S]*)?$/i;
    const grantsRe = /^(grant|revoke)\s+([\s\S]+?)\s+on\s+(?:table\s+)?([\s\S]+?)\s+(?:to|from)\s+([\s\S]+)$/i;
    for (const stmt of statements) {
      const cr = createRe.exec(stmt);
      if (cr) {
        const target = resolve(cr[1]);
        const table = tableNameFromV1(cr[1]);
        if (!table || !table.schema) { issues.push({ file: file.path, table: table?.name || '*', code: 'UNQUALIFIED_CREATE_TABLE' }); continue; }
        if (table.schema !== 'public') continue;
        if (!/^\s*(?:"(?:[^"]|"")*"|[A-Za-z_][A-Za-z_0-9]*)\s*(?:\.|\s)/.test(cr[1])) {
          issues.push({ file: file.path, table: target || '*', code: 'UNSUPPORTED_CREATE_TABLE' }); continue;
        }
        if (!target || tables.has(target)) { issues.push({file: file.path, table: target || '*',code: 'DUPLICATE_CREATE_TABLE'});continue; }
        tables.set(target, {grant:false,rls:false,policy:false,disabled:false});collected.add(target);
        continue;
      }
      if (/^(?:do\b|execute\b|create\s+(?:or\s+replace\s+)?function\b)/i.test(stmt) &&
          /\bcreate\s+(?:unlogged\s+)?table\b/i.test(stmt)) {
        issues.push({file:file.path,table:'*',code:'DYNAMIC_DDL_UNAUDITABLE'});continue;
      }
      const alt = alterRlsRe.exec(stmt);
      if (alt) {
        const table = resolve(alt[1]);if(table && tables.has(table)) {
          const t=tables.get(table)!;t.rls=alt[2].toLowerCase()==='enable';t.disabled=!t.rls;
        } continue;
      }
      const pol = policyRe.exec(stmt);
      if (pol) {
        const table=resolve(pol[1]);if(table && tables.has(table))tables.get(table)!.policy=true;
        continue;
      }
      const grant = grantsRe.exec(stmt);
      if (grant) {
        const table=resolve(grant[3]);
        if(!table || !tables.has(table))continue;
        const verbs=grant[2].toLowerCase().replace(/\s+/g,' ').trim();
        const roles=listedRolesV1(grant[4].replace(/\s+with\s+grant\s+option\s*$/i,''));
        if(roles.includes('public') || /\ball\b/.test(verbs) || roles.some(r=>!['anon','authenticated','service_role'].includes(r))) {
          issues.push({file:file.path,table,code:'BROAD_OR_UNKNOWN_GRANT'});continue;
        }
        if(grant[1].toLowerCase()==='grant' && roles.length>0 &&
           verbs.split(',').every(v=>['select','insert','update','delete'].includes(v.trim())))tables.get(table)!.grant=true;
        if(grant[1].toLowerCase()==='revoke') tables.get(table)!.grant=false;
      }
    }
    for (const [table,t] of tables) {
      if (!t.grant) issues.push({file:file.path,table,code:'MISSING_EXPLICIT_GRANT'});
      if (!t.rls || t.disabled) issues.push({file:file.path,table,code:'RLS_NOT_ENABLED'});
      if (!t.policy) issues.push({file:file.path,table,code:'MISSING_RLS_POLICY'});
    }
  }
  issues.sort((a,b)=>[a.file,a.table,a.code].join('|').localeCompare([b.file,b.table,b.code].join('|'),'en'));
  return {contract: PUBLIC_TABLE_ACL_GATE_CONTRACT_V1,ok:issues.length===0,cutoffYYYYMMDD,
    scannedFiles:scanned,checkedPublicTables:collected.size,tables:[...collected].sort(),
    issues,liveDatabaseVerified:false,sqlExecuted:false,writesPerformed:false};
}

export type PublicCatalogAclRowV1 = {
  schema_name: string; table_name: string; rls_enabled: boolean;
  policy_count: number; anon_select: boolean; authenticated_select: boolean;
  service_role_select: boolean;
};
export function evaluatePublicCatalogAclV1(rows: readonly PublicCatalogAclRowV1[]) {
  if(!Array.isArray(rows)||rows.length>100000)throw new Error('CATALOG_INPUT');
  const issues: {table:string;code:string}[]=[];
  const names=new Set<string>();
  for(const row of rows){
    if(!row||row.schema_name!=='public'||typeof row.table_name!=='string'||row.table_name.length>200||
       !Number.isInteger(row.policy_count)||row.policy_count<0 ||
       typeof row.rls_enabled!=='boolean'||typeof row.anon_select!=='boolean'||
       typeof row.authenticated_select!=='boolean'||typeof row.service_role_select!=='boolean')throw new Error('CATALOG_ROW_INVALID');
    const table='public.'+row.table_name;
    if(names.has(table))throw new Error('CATALOG_DUPLICATE');names.add(table);
    if(!row.rls_enabled)issues.push({table,code:'RLS_NOT_ENABLED'});
    if(row.policy_count===0 && (row.anon_select||row.authenticated_select))issues.push({table,code:'CLIENT_GRANT_NO_POLICY'});
    if(!row.service_role_select)issues.push({table,code:'SERVICE_ROLE_SELECT_MISSING'});
  }
  issues.sort((a,b)=>a.table.localeCompare(b.table)||a.code.localeCompare(b.code));
  return {contract:'ARCTOR_ARI03_PUBLIC_CATALOG_ACL_AUDIT_V1' as const,ok:issues.length===0,
    auditedTables:names.size,issues, databaseSnapshotSupplied:true,
    cannotProveGrantStatementsFromCurrentAcl:true, cannotDetermineTableCreationDate:true,
    writesPerformed:false};
}

/** M-0138 / ARI-03.07.07: measured local-search latency, no synthetic durations. */
export const LOCAL_CATALOG_LATENCY_CONTRACT_V1 = 'ARCTOR_ARI03_M0138_LOCAL_COLD_WARM_LATENCY_V1' as const;
export type LocalCatalogLatencySummaryV1 = {
  count: number; p50Ms: number; p95Ms: number; minMs: number; maxMs: number;
  meanMs: number; method: 'nearest_rank';
};
/** Nearest-rank quantile for observed wall-clock samples; never interpolate invented latencies. */
export function summarizeCatalogLatencySamplesV1(samples: readonly number[]): LocalCatalogLatencySummaryV1 {
  if (!Array.isArray(samples) || samples.length < 1 || samples.length > 100000) throw new Error('LATENCY_SAMPLE_COUNT');
  if (samples.some(v => typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 3_600_000)) {
    throw new Error('LATENCY_SAMPLE_INVALID');
  }
  const sorted = [...samples].sort((a,b) => a-b);
  const percentile = (p:number) => sorted[Math.ceil(sorted.length*p/100)-1];
  const summary = {count:sorted.length,p50Ms:percentile(50),p95Ms:percentile(95),
    minMs:sorted[0],maxMs:sorted[sorted.length-1],
    meanMs:sorted.reduce((a,b)=>a+b,0)/sorted.length,method:'nearest_rank' as const};
  return summary;
}
export type LocalCatalogLatencyReportV1 = {
  contract: typeof LOCAL_CATALOG_LATENCY_CONTRACT_V1;
  model: string; catalogEntries: number; queryCount: number;
  cold: LocalCatalogLatencySummaryV1; warm: LocalCatalogLatencySummaryV1;
  measurement: 'local_offline_real_sources_no_network';
  coldDefinition: 'fresh_application_catalog_objects_per_request_os_file_cache_not_cleared';
  warmDefinition: 'previously_loaded_application_catalog_objects';
  trueOsColdCacheMeasured: false; liveHttpEndToEndMeasured: false;
  sqlExecuted: false; paidApiCalls: 0;
};
export function summarizeColdWarmCatalogLatencyV1(args: {
  model: string; catalogEntries: number; queryCount: number;
  coldMs: readonly number[]; warmMs: readonly number[];
}): LocalCatalogLatencyReportV1 {
  if (!args || typeof args.model !== 'string' || !/^[a-z0-9-]{1,80}$/.test(args.model) ||
    !Number.isInteger(args.catalogEntries) || args.catalogEntries < 1 || args.catalogEntries > 10000000 ||
    !Number.isInteger(args.queryCount) || args.queryCount < 1 || args.queryCount > 1000000 ||
    !Array.isArray(args.coldMs) || !Array.isArray(args.warmMs) ||
    args.coldMs.length !== args.queryCount || args.warmMs.length < args.queryCount) {
    throw new Error('LATENCY_REPORT_INPUT');
  }
  return {contract:LOCAL_CATALOG_LATENCY_CONTRACT_V1,model:args.model,catalogEntries:args.catalogEntries,
    queryCount:args.queryCount,cold:summarizeCatalogLatencySamplesV1(args.coldMs),
    warm:summarizeCatalogLatencySamplesV1(args.warmMs),
    measurement:'local_offline_real_sources_no_network',
    coldDefinition:'fresh_application_catalog_objects_per_request_os_file_cache_not_cleared',
    warmDefinition:'previously_loaded_application_catalog_objects',
    trueOsColdCacheMeasured:false,liveHttpEndToEndMeasured:false,sqlExecuted:false,paidApiCalls:0};
}
