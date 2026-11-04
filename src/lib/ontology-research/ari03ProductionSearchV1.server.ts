/**
 * ARI-03 / M-0146. Production adapter for the already accepted M-0130 pure ranker.
 * Auth is NOT provided here; call ONLY from an admin-guarded API.
 * Global active/system ON only. Never uses owner/private records, AI-generated aliases,
 * derived graph relations, or unverified hits as exact evidence.
 * The live DB is the source of truth for ON membership, not this vector table.
 */
import { createHash } from 'node:crypto';
import { supabase } from '../../../lib/supabase';
import { createArctorAri03Embedding } from '../../../lib/ai/openaiClient';
import { rankHybridCandidatesStableTiesV1, type HybridLocaleV1 } from './hybridRankerV1';

export const ARI03_PRODUCTION_CONTRACT = 'ARCTOR_ARI03_PRODUCTION_GLOBAL_SYSTEM_V1' as const;
export const ARI03_MODEL = 'text-embedding-3-small' as const;
export const ARI03_SOURCE_CONTRACT = 'ARI03_CONTENT_V1' as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Ari03SourceOn = {
  id: string; title: string | null; description: string | null; canonical_key: string | null;
};
export type Ari03Lexical = {
  id: string; title: string; role: string; path: string; description: string; score: number;
};
export type Ari03Result = {
  contract: typeof ARI03_PRODUCTION_CONTRACT;
  status: 'FULL_HYBRID' | 'LEXICAL_FALLBACK';
  fullHybridReady: boolean;
  embeddingAttempted: boolean;
  model: typeof ARI03_MODEL;
  indexedCount: number;
  catalogCount: number;
  vectorHitCount: number;
  lexicalHitCount: number;
  rankerContract: string | null;
  reason: string | null;
  ids: string[];
  ranked: Array<{ id:string; rank:number; lexicalRank:number|null; vectorRank:number|null; matchKind:string|null }>;
};
export function ari03SourceText(r:Ari03SourceOn):string {
  return [r.title?.trim(),r.description?.trim(),r.canonical_key?.trim()].filter(Boolean).join('\n').slice(0,12000);
}
export function ari03ContentSha(r:Ari03SourceOn):string {
  return createHash('sha256').update(ARI03_SOURCE_CONTRACT+'\n'+ari03SourceText(r),'utf8').digest('hex').toUpperCase();
}
function fallback(reason:string,catalogCount:number,lexical:Ari03Lexical[],limit:number,indexedCount=0,embeddingAttempted=false):Ari03Result {
  return {contract:ARI03_PRODUCTION_CONTRACT,status:'LEXICAL_FALLBACK',fullHybridReady:false,embeddingAttempted,
    model:ARI03_MODEL,indexedCount,catalogCount,vectorHitCount:0,
    lexicalHitCount:lexical.length,rankerContract:null,reason,ids:lexical.slice(0,limit).map(x=>x.id),
    ranked:lexical.slice(0,limit).map((x,i)=>({id:x.id,rank:i+1,lexicalRank:i+1,vectorRank:null,matchKind:null}))};
}
async function indexStatus(rows:Ari03SourceOn[]):Promise<{ready:boolean;indexedCount:number;reason:string|null}> {
  const index = new Map<string,string>();
  for(let start=0;start<100000;start+=1000) {
    const {data,error}=await supabase.from('ari03_on_embeddings_v1')
      .select('on_id,source_sha256').eq('locale','und').eq('model_id',ARI03_MODEL)
      .order('on_id',{ascending:true}).range(start,start+999);
    if(error) return {ready:false,indexedCount:index.size,reason:'EMBEDDING_TABLE_UNAVAILABLE'};
    const batch=(data??[]) as Array<{on_id:string;source_sha256:string}>;
    for(const r of batch) index.set(r.on_id.toLowerCase(),r.source_sha256.toUpperCase());
    if(batch.length<1000)break;
  }
  if(index.size!==rows.length)return {ready:false,indexedCount:index.size,reason:'INDEX_COVERAGE_INCOMPLETE'};
  for(const row of rows) if(index.get(row.id.toLowerCase())!==ari03ContentSha(row))
    return {ready:false,indexedCount:index.size,reason:'INDEX_SOURCE_STALE'};
  return {ready:true,indexedCount:index.size,reason:null};
}

export async function rankAri03ProductionGlobalOn(args:{
  query:string;locale:HybridLocaleV1;rows:Ari03SourceOn[];lexical:Ari03Lexical[];limit:number;
}):Promise<Ari03Result> {
  const {query,locale,rows,lexical,limit}=args;
  if(!Number.isSafeInteger(limit)||limit<1||limit>100||!query.trim()||query.length>180)
    return fallback('INVALID_QUERY_OR_LIMIT',rows.length,lexical,Math.max(0,Math.min(100,limit||0)));
  const all=new Map(rows.filter(r=>UUID.test(r.id)).map(x=>[x.id.toLowerCase(),x]));
  if(all.size!==rows.length)return fallback('SOURCE_IDS_INVALID',rows.length,lexical,limit);
  let index:{ready:boolean;indexedCount:number;reason:string|null};
  try {index=await indexStatus(rows);}catch {return fallback('INDEX_STATUS_CHECK_FAILED',rows.length,lexical,limit);}
  if(!index.ready)return fallback(index.reason??'INDEX_NOT_READY',rows.length,lexical,limit,index.indexedCount);
  let embedding:number[];
  try {embedding=await createArctorAri03Embedding(query,ARI03_MODEL);}catch {
    return fallback('QUERY_EMBEDDING_FAILED',rows.length,lexical,limit,index.indexedCount,true);
  }
  if(embedding.length!==1536||!embedding.every(Number.isFinite))
    return fallback('QUERY_EMBEDDING_DIMENSIONS_INVALID',rows.length,lexical,limit,index.indexedCount,true);
  const {data,error}=await supabase.rpc('ari03_match_global_system_v1',{
    p_query_embedding:'['+embedding.join(',')+']',p_limit:200,
  });
  if(error)return fallback('VECTOR_RPC_FAILED',rows.length,lexical,limit,index.indexedCount,true);
  const raw=(data??[]) as Array<{on_id:string;source_sha256:string;similarity:number}>;
  const seen=new Set<string>();
  const eligible=raw.filter(row=>{
    const id=typeof row.on_id==='string'?row.on_id.toLowerCase():'';
    if(!UUID.test(id)||seen.has(id))return false;
    const on=all.get(id);if(!on||row.source_sha256?.toUpperCase()!==ari03ContentSha(on))return false;
    seen.add(id);return true;
  });
  const lexicalCandidates=lexical.slice(0,5000).filter(x=>all.has(x.id.toLowerCase()))
    .map((x,i)=>({onId:x.id,rank:i+1,locale,scope:{kind:'global_system' as const}}));
  const vectorCandidates=eligible.map((x,i)=>({onId:x.on_id,rank:i+1,locale,scope:{kind:'global_system' as const}}));
  const candidateIds=new Set([...lexicalCandidates,...vectorCandidates].map(x=>x.onId.toLowerCase()));
  // An exact canonical title, not a guessed synonym, is the only source of exact evidence.
  const evidence=rows.filter(x=>candidateIds.has(x.id.toLowerCase())&&
     x.title?.normalize('NFKC').trim().toLocaleLowerCase(locale)===query.normalize('NFKC').trim().toLocaleLowerCase(locale))
    .map(x=>({onId:x.id,scope:{kind:'global_system' as const},locale,text:x.title!,kind:'canonical_title' as const}));
  const result=rankHybridCandidatesStableTiesV1({lexical:lexicalCandidates,vector:vectorCandidates,
    query:{text:query,locale},evidence,enableExactPriority:true,graphExpansion:{requestedDepth:0}});
  if(!result.ok)return fallback('RANKER_REJECTED_'+result.reason,rows.length,lexical,limit,index.indexedCount,true);
  const selected=result.candidates.slice(0,limit);
  return {contract:ARI03_PRODUCTION_CONTRACT,status:'FULL_HYBRID',fullHybridReady:true,embeddingAttempted:true,model:ARI03_MODEL,
    indexedCount:index.indexedCount,catalogCount:rows.length,vectorHitCount:eligible.length,
    lexicalHitCount:lexicalCandidates.length,rankerContract:result.contract,reason:null,
    ids:selected.map(x=>x.onId),ranked:selected.map(x=>({id:x.onId,rank:x.finalRank,
      lexicalRank:x.lexicalRank,vectorRank:x.vectorRank,matchKind:x.matchKind}))};
}
