/**
 * ARI-03.06.01 / M-0125 — deterministic lexical/vector candidate union by ON UUID.
 * CODE implementation, intentionally NOT RRF or exact-match boost (M-0126/M-0127).
 * This is NOT an authorization boundary: caller must apply visibility/RLS first.
 * No provider, network, database, paid API, runtime feature flag or side effects.
 */
export const HYBRID_MERGE_CONTRACT_V1 = 'ARCTOR_ARI03_M0125_UUID_CANDIDATE_MERGE_V1' as const;
export type HybridLocaleV1='en'|'pl'|'es'|'de'|'cs'|'uk'|'ru';
export type HybridScopeV1={kind:'global_system'}|{kind:'owner_private';ownerActorId:string};
/** rank refers to the rank WITHIN each source only, never a comparable score. */
export type HybridCandidateV1={
  onId:string; rank:number; locale:HybridLocaleV1; scope:HybridScopeV1;
  // The retrieval adapter may supply original scores; they are deliberately ignored here.
  rawScore?:number;
};
export type HybridMergeInputV1={lexical:readonly HybridCandidateV1[];vector:readonly HybridCandidateV1[]};
export type HybridMergedCandidateV1={
  onId:string; scope:HybridScopeV1; locales:HybridLocaleV1[];
  lexicalRank:number|null; vectorRank:number|null;
  inLexical:boolean; inVector:boolean;
  occurrencesInLexical:number;occurrencesInVector:number;
};
export type HybridMergeReasonV1='INVALID_INPUT'|'TOO_MANY_CANDIDATES'|'INVALID_CANDIDATE'|
  'INVALID_UUID'|'INVALID_RANK'|'INVALID_LOCALE'|'INVALID_SCOPE'|'SCOPE_CONFLICT';
export type HybridMergeResultV1=
 | {ok:true;contract:typeof HYBRID_MERGE_CONTRACT_V1;rankPolicy:'LEXICAL_THEN_VECTOR_ONLY_UNRANKED';
    rrfApplied:false;exactBoostApplied:false;authorizationEnforced:false;
    lexicalInputCount:number;vectorInputCount:number;deduplicatedCount:number;
    candidates:HybridMergedCandidateV1[]}
 | {ok:false;contract:typeof HYBRID_MERGE_CONTRACT_V1;reason:HybridMergeReasonV1;
    candidates:[];authorizationEnforced:false};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const locs=['en','pl','es','de','cs','uk','ru'] as const;
const fail=(reason:HybridMergeReasonV1):HybridMergeResultV1=>({
  ok:false,contract:HYBRID_MERGE_CONTRACT_V1,reason,candidates:[],authorizationEnforced:false
});
type Work={onId:string;scope:HybridScopeV1;scopeKey:string;locales:Set<HybridLocaleV1>;
 lexicalRank:number|null;vectorRank:number|null;occurrencesInLexical:number;occurrencesInVector:number};
const isObj=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==='object'&&!Array.isArray(x);
function scopeOf(x:unknown):{scope:HybridScopeV1;key:string}|null{
 if(!isObj(x))return null;
 if(x.kind==='global_system')return {scope:{kind:'global_system'},key:'global_system'};
 if(x.kind==='owner_private'&&typeof x.ownerActorId==='string'&&uuid.test(x.ownerActorId)){
  const ownerActorId=x.ownerActorId.toLowerCase();
  return {scope:{kind:'owner_private',ownerActorId},key:'owner_private:'+ownerActorId};
 }
 return null;
}
/**
 * Fail-closed on malformed input / scope collision. Duplicate entries in each stream
 * are allowed; their lowest (best) source rank is retained. Mixed source raw scores
 * are never added, compared, normalized, or exposed. Unicode titles are not used as IDs.
 * Output order is a deterministic *provisional* lexical-first enumeration, not a
 * hybrid relevance ranking. M-0126 must implement RRF; M-0127 handles exact priority.
 */
export function mergeHybridCandidatesByUuidV1(input:HybridMergeInputV1):HybridMergeResultV1{
 if(!isObj(input)||!Array.isArray(input.lexical)||!Array.isArray(input.vector))return fail('INVALID_INPUT');
 const lexical=input.lexical,vector=input.vector;
 if(lexical.length>5000||vector.length>5000)return fail('TOO_MANY_CANDIDATES');
 const map=new Map<string,Work>();
 for(const [source,list] of [['lexical',lexical],['vector',vector]] as const){
  for(const c of list){
   if(!isObj(c))return fail('INVALID_CANDIDATE');
   if(typeof c.onId!=='string'||!uuid.test(c.onId))return fail('INVALID_UUID');
   if(typeof c.rank!=='number'||!Number.isSafeInteger(c.rank)||c.rank<1||c.rank>1_000_000)return fail('INVALID_RANK');
   if(typeof c.locale!=='string'||!(locs as readonly string[]).includes(c.locale))return fail('INVALID_LOCALE');
   const s=scopeOf(c.scope);if(!s)return fail('INVALID_SCOPE');
   const onId=c.onId.toLowerCase(),locale=c.locale as HybridLocaleV1;
   let w=map.get(onId);
   if(w&&w.scopeKey!==s.key)return fail('SCOPE_CONFLICT');
   if(!w){w={onId,scope:s.scope,scopeKey:s.key,locales:new Set(),lexicalRank:null,vectorRank:null,
     occurrencesInLexical:0,occurrencesInVector:0};map.set(onId,w);}
   w.locales.add(locale);
   if(source==='lexical'){
    w.lexicalRank=w.lexicalRank===null?c.rank:Math.min(w.lexicalRank,c.rank);
    w.occurrencesInLexical++;
   }else{
    w.vectorRank=w.vectorRank===null?c.rank:Math.min(w.vectorRank,c.rank);
    w.occurrencesInVector++;
   }
  }
 }
 // Deterministic enumeration only: lexical ranks first, then vector-only ranks, UUID tie break.
 const work=[...map.values()].sort((a,b)=>{
  const ac=a.lexicalRank!==null,bc=b.lexicalRank!==null;
  if(ac!==bc)return ac?-1:1;
  const rankA=ac?a.lexicalRank!:a.vectorRank!,rankB=bc?b.lexicalRank!:b.vectorRank!;
  return rankA-rankB||(a.onId<b.onId?-1:a.onId>b.onId?1:0);
 });
 return {ok:true,contract:HYBRID_MERGE_CONTRACT_V1,
   rankPolicy:'LEXICAL_THEN_VECTOR_ONLY_UNRANKED',rrfApplied:false,exactBoostApplied:false,
   authorizationEnforced:false,lexicalInputCount:lexical.length,vectorInputCount:vector.length,
   deduplicatedCount:lexical.length+vector.length-work.length,
   candidates:work.map(w=>({onId:w.onId,scope:w.scope,locales:[...w.locales].sort(),
     lexicalRank:w.lexicalRank,vectorRank:w.vectorRank,
     inLexical:w.lexicalRank!==null,inVector:w.vectorRank!==null,
     occurrencesInLexical:w.occurrencesInLexical,occurrencesInVector:w.occurrencesInVector}))};
}

/**
 * ARI-03.06.02 / M-0126 — deterministic RRF over the M-0125 UUID union.
 * Exactly one contribution per source per UUID: duplicate source rows cannot
 * inflate the score. Source rawScore is never read, normalized or combined.
 * M-0127 will add a separate post-boost for verified exact/alias matches.
 * This function DOES NOT authorize inputs or enforce RLS: pre-filter upstream.
 */
export const HYBRID_RRF_CONTRACT_V1='ARCTOR_ARI03_M0126_RRF_K60_V1' as const;
export const HYBRID_RRF_K_V1=60 as const;
export type HybridRrfCandidateV1=HybridMergedCandidateV1 & {
  rrfRank:number;
  rrfScore:number;
  lexicalRrfContribution:number;
  vectorRrfContribution:number;
};
export type HybridRrfResultV1=
 | {ok:true;contract:typeof HYBRID_RRF_CONTRACT_V1;
    rankPolicy:'RRF_K60_THEN_LEXICAL_THEN_VECTOR_THEN_UUID';
    scoreKind:'RECIPROCAL_RANK_FUSION';rrfK:typeof HYBRID_RRF_K_V1;
    rrfApplied:true;exactBoostApplied:false;authorizationEnforced:false;
    lexicalInputCount:number;vectorInputCount:number;deduplicatedCount:number;
    candidates:HybridRrfCandidateV1[]}
 | {ok:false;contract:typeof HYBRID_RRF_CONTRACT_V1;reason:HybridMergeReasonV1;
    rrfApplied:false;exactBoostApplied:false;authorizationEnforced:false;candidates:[]};

export function rankHybridCandidatesRrfV1(input:HybridMergeInputV1):HybridRrfResultV1{
  const merged=mergeHybridCandidatesByUuidV1(input);
  if(!merged.ok){
    return {ok:false,contract:HYBRID_RRF_CONTRACT_V1,reason:merged.reason,
      rrfApplied:false,exactBoostApplied:false,authorizationEnforced:false,candidates:[]};
  }
  const rows=merged.candidates.map(c=>{
    const lexicalRrfContribution=c.lexicalRank===null?0:1/(HYBRID_RRF_K_V1+c.lexicalRank);
    const vectorRrfContribution=c.vectorRank===null?0:1/(HYBRID_RRF_K_V1+c.vectorRank);
    return {...c,scope:{...c.scope} as HybridScopeV1,locales:[...c.locales],
      lexicalRrfContribution,vectorRrfContribution,
      rrfScore:lexicalRrfContribution+vectorRrfContribution,rrfRank:0};
  });
  const missingLast=(rank:number|null)=>rank===null?Number.POSITIVE_INFINITY:rank;
  rows.sort((a,b)=>b.rrfScore-a.rrfScore||
    missingLast(a.lexicalRank)-missingLast(b.lexicalRank)||
    missingLast(a.vectorRank)-missingLast(b.vectorRank)||
    (a.onId<b.onId?-1:a.onId>b.onId?1:0));
  rows.forEach((r,i)=>{r.rrfRank=i+1;});
  return {ok:true,contract:HYBRID_RRF_CONTRACT_V1,
    rankPolicy:'RRF_K60_THEN_LEXICAL_THEN_VECTOR_THEN_UUID',
    scoreKind:'RECIPROCAL_RANK_FUSION',rrfK:HYBRID_RRF_K_V1,
    rrfApplied:true,exactBoostApplied:false,authorizationEnforced:false,
    lexicalInputCount:merged.lexicalInputCount,vectorInputCount:merged.vectorInputCount,
    deduplicatedCount:merged.deduplicatedCount,candidates:rows};
}

/**
 * ARI-03.06.03 / M-0127 — deterministic post-RRF priority of a complete query
 * equal to an authoritative canonical title or an ACTIVE VERIFIED alias.
 * This pure ranker does not fetch metadata or verify RLS: the caller MUST take
 * match evidence only from an authorized, versioned ontology catalog. A user
 * message, unverified synonym or model-generated guess is NOT match evidence.
 * RRF and M0125 functions are retained above unchanged. No API or SQL here.
 */
export const HYBRID_EXACT_PRIORITY_CONTRACT_V1 = 'ARCTOR_ARI03_M0127_EXACT_VERIFIED_ALIAS_PRIORITY_V1' as const;
export type HybridExactEvidenceV1 = {
  onId:string;
  scope:HybridScopeV1;
  locale:HybridLocaleV1;
  text:string;
  kind:'canonical_title'|'alias';
  /** Only an active, already verified alias may receive priority. */
  aliasStatus?:'verified_active'|'pending'|'revoked';
};
export type HybridExactPriorityInputV1 = HybridMergeInputV1 & {
  query:{text:string;locale:HybridLocaleV1};
  evidence:readonly HybridExactEvidenceV1[];
  /** Emergency rollback: false preserves the exact M0126 RRF order. */
  enableExactPriority?:boolean;
};
export type HybridExactPriorityReasonV1=HybridMergeReasonV1|'INVALID_QUERY'|'INVALID_EVIDENCE'|
  'TOO_MANY_EVIDENCE'|'EVIDENCE_UNKNOWN_UUID'|'EVIDENCE_SCOPE_CONFLICT';
export type HybridExactPriorityCandidateV1=HybridRrfCandidateV1 & {
  finalRank:number;
  matchPriority:0|1|2;
  matchKind:null|'verified_alias'|'canonical_title';
};
export type HybridExactPriorityResultV1=
  | {ok:true;contract:typeof HYBRID_EXACT_PRIORITY_CONTRACT_V1;
     rankPolicy:'CANONICAL_EXACT_THEN_VERIFIED_ALIAS_THEN_RRF'|'RRF_K60_ROLLBACK';
     rrfApplied:true;exactBoostApplied:boolean;exactPriorityEnabled:boolean;
     authorizationEnforced:false;deduplicatedCount:number;
     candidates:HybridExactPriorityCandidateV1[]}
  | {ok:false;contract:typeof HYBRID_EXACT_PRIORITY_CONTRACT_V1;
     reason:HybridExactPriorityReasonV1;rrfApplied:false;exactBoostApplied:false;
     authorizationEnforced:false;candidates:[]};
const failExact=(reason:HybridExactPriorityReasonV1):HybridExactPriorityResultV1=>({
  ok:false,contract:HYBRID_EXACT_PRIORITY_CONTRACT_V1,reason,
  rrfApplied:false,exactBoostApplied:false,authorizationEnforced:false,candidates:[]
});
// Full-string equality only. No transliteration, stemming, accent-stripping,
// substring matching, fuzzy score or automatic promotion of an alias.
const canonicalExact=(s:string,locale:HybridLocaleV1):string=>
  s.normalize('NFKC').trim().replace(/\s+/gu,' ').toLocaleLowerCase(locale);
const validText=(x:unknown):x is string=>typeof x==='string'&&x.trim().length>0&&x.length<=2000;
const localeOk=(x:unknown):x is HybridLocaleV1=>typeof x==='string'&&(locs as readonly string[]).includes(x);

export function rankHybridCandidatesWithExactPriorityV1(input:HybridExactPriorityInputV1):HybridExactPriorityResultV1{
  // Always apply the previously accepted UUID/scope validation before matching.
  const rrf=rankHybridCandidatesRrfV1(input);
  if(!rrf.ok)return failExact(rrf.reason);
  if(!isObj(input)||!isObj(input.query)||!validText(input.query.text)||!localeOk(input.query.locale))
    return failExact('INVALID_QUERY');
  if(input.enableExactPriority!==undefined&&typeof input.enableExactPriority!=='boolean')
    return failExact('INVALID_QUERY');
  const enabled=input.enableExactPriority!==false;
  // Rollback works even if an upstream evidence feed has become broken.
  if(!enabled){return {ok:true,contract:HYBRID_EXACT_PRIORITY_CONTRACT_V1,
    rankPolicy:'RRF_K60_ROLLBACK',rrfApplied:true,exactBoostApplied:false,exactPriorityEnabled:false,
    authorizationEnforced:false,deduplicatedCount:rrf.deduplicatedCount,
    candidates:rrf.candidates.map(x=>({...x,finalRank:x.rrfRank,matchPriority:0,matchKind:null}))};}
  if(!Array.isArray(input.evidence))return failExact('INVALID_EVIDENCE');
  if(input.evidence.length>5000)return failExact('TOO_MANY_EVIDENCE');
  const candidates=new Map(rrf.candidates.map(x=>[x.onId,x]));
  const priorities=new Map<string,0|1|2>();
  const q=canonicalExact(input.query.text,input.query.locale);
  for(const e of input.evidence){
    if(!isObj(e)||typeof e.onId!=='string'||!uuid.test(e.onId)||!localeOk(e.locale)||
       !validText(e.text)||(e.kind!=='canonical_title'&&e.kind!=='alias'))return failExact('INVALID_EVIDENCE');
    if(e.kind==='canonical_title'&&e.aliasStatus!==undefined)return failExact('INVALID_EVIDENCE');
    if(e.kind==='alias'&&!['verified_active','pending','revoked'].includes(String(e.aliasStatus)))
      return failExact('INVALID_EVIDENCE');
    const s=scopeOf(e.scope);if(!s)return failExact('INVALID_EVIDENCE');
    const id=e.onId.toLowerCase(),candidate=candidates.get(id);
    if(!candidate)return failExact('EVIDENCE_UNKNOWN_UUID');
    const canonicalScope=scopeOf(candidate.scope);
    if(!canonicalScope||canonicalScope.key!==s.key)return failExact('EVIDENCE_SCOPE_CONFLICT');
    if(e.locale!==input.query.locale||canonicalExact(e.text,e.locale)!==q)continue;
    const newPriority:0|1|2=e.kind==='canonical_title'?2:e.aliasStatus==='verified_active'?1:0;
    if(newPriority>(priorities.get(id)??0))priorities.set(id,newPriority);
  }
  const rows:HybridExactPriorityCandidateV1[]=rrf.candidates.map(x=>{
    const matchPriority=priorities.get(x.onId)??0;
    return {...x,finalRank:0,matchPriority,
      matchKind:matchPriority===2?'canonical_title':matchPriority===1?'verified_alias':null};
  });
  // Lexicographic priority tiers, *not* an arbitrary number added to RRF.
  // Within each tier keep the precise M0126 RRF order (including ties).
  rows.sort((a,b)=>b.matchPriority-a.matchPriority||a.rrfRank-b.rrfRank);
  rows.forEach((x,i)=>{x.finalRank=i+1;});
  return {ok:true,contract:HYBRID_EXACT_PRIORITY_CONTRACT_V1,
    rankPolicy:'CANONICAL_EXACT_THEN_VERIFIED_ALIAS_THEN_RRF',
    rrfApplied:true,exactBoostApplied:rows.some(x=>x.matchPriority!==0),exactPriorityEnabled:true,
    authorizationEnforced:false,deduplicatedCount:rrf.deduplicatedCount,candidates:rows};
}

/**
 * ARI-03.06.04 / M-0128 — an auditable EXPLANATION, not a new scoring stage.
 * Source/field/version provenance MUST come from the already-authorized catalog
 * and retrieval adapters. This pure function cannot verify DB truth or RLS.
 * Never infer lexical hit fields from a rank or a vector similarity score.
 */
export const HYBRID_EXPLANATION_CONTRACT_V1='ARCTOR_ARI03_M0128_VERSIONED_FIELD_EXPLANATION_V1' as const;
export type HybridVersionedFieldV1='canonical_title'|'verified_alias'|'definition'|'unspecified';
export type HybridLexicalTraceV1={indexVersion:string;matchedFields:readonly HybridVersionedFieldV1[]};
export type HybridVectorTraceV1={indexVersion:string;embeddingVersion:string;modelId:string;
  /** Fields EMBEDDED into the vector, not claims of causal exact matches. */
  embeddedFields:readonly HybridVersionedFieldV1[]};
export type HybridExactTraceV1={kind:'canonical_title'|'verified_alias';locale:HybridLocaleV1;
  matchedText:string;fieldVersion:string;aliasId?:string};
export type HybridCandidateProvenanceV1={onId:string;scope:HybridScopeV1;catalogVersion:string;
  lexical?:HybridLexicalTraceV1;vector?:HybridVectorTraceV1;exact?:HybridExactTraceV1};
export type HybridExplanationInputV1=HybridExactPriorityInputV1 & {
  /** One entry PER returned UUID; no implicit fallback to a guessed version. */
  provenance:readonly HybridCandidateProvenanceV1[];
};
export type HybridExplanationReasonV1='lexical_rank'|'vector_rank'|'canonical_title_exact'|'verified_alias_exact';
export type HybridCandidateExplanationV1={
  catalogVersion:string;
  finalRank:number;rrfRank:number;rrfK:typeof HYBRID_RRF_K_V1;
  rrfScore:number;
  rankPolicy:'CANONICAL_EXACT_THEN_VERIFIED_ALIAS_THEN_RRF'|'RRF_K60_ROLLBACK';
  reasons:HybridExplanationReasonV1[];
  lexical:null|{rank:number;rrfContribution:number;indexVersion:string;matchedFields:HybridVersionedFieldV1[]};
  vector:null|{rank:number;rrfContribution:number;indexVersion:string;embeddingVersion:string;
    modelId:string;embeddedFields:HybridVersionedFieldV1[]};
  exact:null|{kind:'canonical_title'|'verified_alias';locale:HybridLocaleV1;
    fieldVersion:string;aliasId:string|null};
};
export type HybridExplainedCandidateV1=HybridExactPriorityCandidateV1 & {
  explanation:HybridCandidateExplanationV1;
};
export type HybridExplanationErrorV1=HybridExactPriorityReasonV1|'INVALID_PROVENANCE'|
  'TOO_MANY_PROVENANCE'|'PROVENANCE_UNKNOWN_UUID'|'PROVENANCE_DUPLICATE_UUID'|
  'PROVENANCE_SCOPE_CONFLICT'|'PROVENANCE_SOURCE_MISMATCH'|'PROVENANCE_MISSING_UUID'|
  'INVALID_PROVENANCE_VERSION'|'EXACT_FIELD_PROVENANCE_MISMATCH';
export type HybridExplanationResultV1=
  | {ok:true;contract:typeof HYBRID_EXPLANATION_CONTRACT_V1;
    rankPolicy:'CANONICAL_EXACT_THEN_VERIFIED_ALIAS_THEN_RRF'|'RRF_K60_ROLLBACK';
    rrfApplied:true;exactBoostApplied:boolean;deduplicatedCount:number;
    authorizationEnforced:false;provenanceVerifiedByCaller:false;
    candidates:HybridExplainedCandidateV1[]}
  | {ok:false;contract:typeof HYBRID_EXPLANATION_CONTRACT_V1;
    reason:HybridExplanationErrorV1;authorizationEnforced:false;
    provenanceVerifiedByCaller:false;candidates:[]};
const failExplain=(reason:HybridExplanationErrorV1):HybridExplanationResultV1=>({
  ok:false,contract:HYBRID_EXPLANATION_CONTRACT_V1,reason,
  authorizationEnforced:false,provenanceVerifiedByCaller:false,candidates:[]
});
const versionOk=(x:unknown):x is string=>typeof x==='string'&&
  /^[a-z0-9][a-z0-9._:-]{0,127}$/i.test(x);
const fieldsOk=(x:unknown):x is readonly HybridVersionedFieldV1[]=>
  Array.isArray(x)&&x.length>0&&x.length<=8&&x.every(v=>
    v==='canonical_title'||v==='verified_alias'||v==='definition'||v==='unspecified');
const sortedFields=(x:readonly HybridVersionedFieldV1[]):HybridVersionedFieldV1[]=>[...new Set(x)].sort();

/** Produce explanations strictly from validated ranker output and supplied versioned provenance. */
export function explainHybridCandidatesV1(input:HybridExplanationInputV1):HybridExplanationResultV1{
  const ranked=rankHybridCandidatesWithExactPriorityV1(input);
  if(!ranked.ok)return failExplain(ranked.reason);
  if(!isObj(input)||!Array.isArray(input.provenance))return failExplain('INVALID_PROVENANCE');
  if(input.provenance.length>5000)return failExplain('TOO_MANY_PROVENANCE');
  const candidates=new Map(ranked.candidates.map(c=>[c.onId,c]));
  const traces=new Map<string,HybridCandidateProvenanceV1>();
  for(const p of input.provenance){
    if(!isObj(p)||typeof p.onId!=='string'||!uuid.test(p.onId))return failExplain('INVALID_PROVENANCE');
    const id=p.onId.toLowerCase();
    if(!candidates.has(id))return failExplain('PROVENANCE_UNKNOWN_UUID');
    if(traces.has(id))return failExplain('PROVENANCE_DUPLICATE_UUID');
    const scope=scopeOf(p.scope),actualScope=scopeOf(candidates.get(id)!.scope);
    if(!scope)return failExplain('INVALID_PROVENANCE');
    if(!actualScope||scope.key!==actualScope.key)return failExplain('PROVENANCE_SCOPE_CONFLICT');
    if(!versionOk(p.catalogVersion))return failExplain('INVALID_PROVENANCE_VERSION');
    const candidate=candidates.get(id)!;
    if(Boolean(p.lexical)!==candidate.inLexical||Boolean(p.vector)!==candidate.inVector)
      return failExplain('PROVENANCE_SOURCE_MISMATCH');
    if(p.lexical!==undefined){
      if(!isObj(p.lexical)||!versionOk(p.lexical.indexVersion)||!fieldsOk(p.lexical.matchedFields))
        return failExplain('INVALID_PROVENANCE');
    }
    if(p.vector!==undefined){
      if(!isObj(p.vector)||!versionOk(p.vector.indexVersion)||
         !versionOk(p.vector.embeddingVersion)||!versionOk(p.vector.modelId)||
         !fieldsOk(p.vector.embeddedFields))return failExplain('INVALID_PROVENANCE');
    }
    if(candidate.matchKind===null){
      if(p.exact!==undefined)return failExplain('EXACT_FIELD_PROVENANCE_MISMATCH');
    }else{
      if(!isObj(p.exact)||p.exact.kind!==candidate.matchKind||
        !localeOk(p.exact.locale)||p.exact.locale!==input.query.locale||
        !validText(p.exact.matchedText)||!versionOk(p.exact.fieldVersion)||
        canonicalExact(p.exact.matchedText,p.exact.locale)!==canonicalExact(input.query.text,input.query.locale))
        return failExplain('EXACT_FIELD_PROVENANCE_MISMATCH');
      if(candidate.matchKind==='verified_alias'){
        if(typeof p.exact.aliasId!=='string'||!uuid.test(p.exact.aliasId))
          return failExplain('EXACT_FIELD_PROVENANCE_MISMATCH');
      }else if(p.exact.aliasId!==undefined)return failExplain('EXACT_FIELD_PROVENANCE_MISMATCH');
      const validatedExact=p.exact as HybridExactTraceV1;
      const matches=input.evidence.some(e=>e.onId.toLowerCase()===id&&e.locale===validatedExact.locale&&
        canonicalExact(e.text,e.locale)===canonicalExact(validatedExact.matchedText,validatedExact.locale)&&
        ((candidate.matchKind==='canonical_title'&&e.kind==='canonical_title')||
         (candidate.matchKind==='verified_alias'&&e.kind==='alias'&&e.aliasStatus==='verified_active')));
      if(!matches)return failExplain('EXACT_FIELD_PROVENANCE_MISMATCH');
    }
    traces.set(id,p as HybridCandidateProvenanceV1);
  }
  if(traces.size!==ranked.candidates.length)return failExplain('PROVENANCE_MISSING_UUID');
  const rows:HybridExplainedCandidateV1[]=ranked.candidates.map(c=>{
    const p=traces.get(c.onId)!;
    const lexical=c.lexicalRank===null?null:{rank:c.lexicalRank,rrfContribution:c.lexicalRrfContribution,
      indexVersion:p.lexical!.indexVersion,matchedFields:sortedFields(p.lexical!.matchedFields)};
    const vector=c.vectorRank===null?null:{rank:c.vectorRank,rrfContribution:c.vectorRrfContribution,
      indexVersion:p.vector!.indexVersion,embeddingVersion:p.vector!.embeddingVersion,
      modelId:p.vector!.modelId,embeddedFields:sortedFields(p.vector!.embeddedFields)};
    const reasons:HybridExplanationReasonV1[]=[];
    if(lexical)reasons.push('lexical_rank');
    if(vector)reasons.push('vector_rank');
    if(c.matchKind==='canonical_title')reasons.push('canonical_title_exact');
    if(c.matchKind==='verified_alias')reasons.push('verified_alias_exact');
    const exact=c.matchKind===null?null:{kind:c.matchKind,locale:p.exact!.locale,
      fieldVersion:p.exact!.fieldVersion,aliasId:p.exact!.aliasId?.toLowerCase()??null};
    return {...c,explanation:{catalogVersion:p.catalogVersion,finalRank:c.finalRank,rrfRank:c.rrfRank,
      rrfK:HYBRID_RRF_K_V1,rrfScore:c.rrfScore,rankPolicy:ranked.rankPolicy,
      reasons,lexical,vector,exact}};
  });
  return {ok:true,contract:HYBRID_EXPLANATION_CONTRACT_V1,rankPolicy:ranked.rankPolicy,
    rrfApplied:true,exactBoostApplied:ranked.exactBoostApplied,deduplicatedCount:ranked.deduplicatedCount,
    authorizationEnforced:false,provenanceVerifiedByCaller:false,candidates:rows};
}

/**
 * ARI-03.06.05 / M-0129 — hard boundary between hybrid retrieval and ARI-04.
 * GRAPH EXPANSION IS NOT YET A SOURCE OF CANDIDATES OR ONTOLOGY FACTS.
 *
 * This pure wrapper reuses M-0127 ranking with NO changed scoring/order and
 * explicitly rejects any request to expand a graph. Do not treat a candidate
 * returned by lexical/vector as proof of a graph relationship. The query adapter
 * must supply authorized lexical/vector candidates, not graph-derived entries.
 * The release boundary is intentionally fixed; a caller-provided phase/flag may
 * NOT unlock this before a distinct, audited ARI-04 implementation is accepted.
 */
export const HYBRID_GRAPH_GATE_CONTRACT_V1='ARCTOR_ARI03_M0129_GRAPH_DEPTH_ZERO_V1' as const;
export const HYBRID_MAX_GRAPH_DEPTH_V1=0 as const;
export const HYBRID_GRAPH_EXPANSION_DEFERRED_UNTIL_V1='ARI-04' as const;
export type HybridGraphExpansionRequestV1={
  /** Depth zero is the ONLY accepted value in ARI-03. */
  requestedDepth:0;
};
export type HybridGraphGatedInputV1=HybridExactPriorityInputV1 & {
  /** Optional explicit depth-zero request; no edge/candidate fields accepted. */
  graphExpansion?:HybridGraphExpansionRequestV1;
};
export type HybridGraphGateReasonV1=HybridExactPriorityReasonV1|
  'INVALID_GRAPH_REQUEST'|'GRAPH_EXPANSION_DEFERRED_UNTIL_ARI04'|
  'GRAPH_PAYLOAD_NOT_ALLOWED';
export type HybridGraphGateResultV1=
 | {ok:true;contract:typeof HYBRID_GRAPH_GATE_CONTRACT_V1;
   maxGraphDepth:typeof HYBRID_MAX_GRAPH_DEPTH_V1;graphExpansionApplied:false;
   graphCandidatesAdded:0;relationsAsserted:false;
   deferredUntil:typeof HYBRID_GRAPH_EXPANSION_DEFERRED_UNTIL_V1;
   authorizationEnforced:false;rankPolicy:'CANONICAL_EXACT_THEN_VERIFIED_ALIAS_THEN_RRF'|'RRF_K60_ROLLBACK';
   rrfApplied:true;exactBoostApplied:boolean;deduplicatedCount:number;
   candidates:HybridExactPriorityCandidateV1[]}
 | {ok:false;contract:typeof HYBRID_GRAPH_GATE_CONTRACT_V1;
   reason:HybridGraphGateReasonV1;
   maxGraphDepth:typeof HYBRID_MAX_GRAPH_DEPTH_V1;graphExpansionApplied:false;
   graphCandidatesAdded:0;relationsAsserted:false;
   deferredUntil:typeof HYBRID_GRAPH_EXPANSION_DEFERRED_UNTIL_V1;
   authorizationEnforced:false;candidates:[]};
const failGraph=(reason:HybridGraphGateReasonV1):HybridGraphGateResultV1=>({
  ok:false,contract:HYBRID_GRAPH_GATE_CONTRACT_V1,reason,
  maxGraphDepth:HYBRID_MAX_GRAPH_DEPTH_V1,graphExpansionApplied:false,
  graphCandidatesAdded:0,relationsAsserted:false,
  deferredUntil:HYBRID_GRAPH_EXPANSION_DEFERRED_UNTIL_V1,
  authorizationEnforced:false,candidates:[]
});
/**
 * Do not silently discard proposed edges or neighbor candidates: that would
 * produce misleading success and may make a caller think graph edges were
 * validated. Rejection is explicit and has NO output candidates.
 */
export function rankHybridCandidatesGraphGatedV1(input:HybridGraphGatedInputV1):HybridGraphGateResultV1{
  if(!isObj(input))return failGraph('INVALID_GRAPH_REQUEST');
  if(Object.prototype.hasOwnProperty.call(input,'graphExpansion')){
    const req=input.graphExpansion;
    if(!isObj(req))return failGraph('INVALID_GRAPH_REQUEST');
    const keys=Object.keys(req);
    if(keys.some(k=>k!=='requestedDepth'))return failGraph('GRAPH_PAYLOAD_NOT_ALLOWED');
    if(!Object.prototype.hasOwnProperty.call(req,'requestedDepth')||
      typeof req.requestedDepth!=='number'||!Number.isSafeInteger(req.requestedDepth)||
      req.requestedDepth<0)return failGraph('INVALID_GRAPH_REQUEST');
    if(req.requestedDepth>HYBRID_MAX_GRAPH_DEPTH_V1)
      return failGraph('GRAPH_EXPANSION_DEFERRED_UNTIL_ARI04');
  }
  // The M-0127 algorithm is the sole source of the ranking. In particular,
  // a graph request must never influence exact-title and verified-alias tiers.
  const ranked=rankHybridCandidatesWithExactPriorityV1(input);
  if(!ranked.ok)return failGraph(ranked.reason);
  return {ok:true,contract:HYBRID_GRAPH_GATE_CONTRACT_V1,
    maxGraphDepth:HYBRID_MAX_GRAPH_DEPTH_V1,graphExpansionApplied:false,
    graphCandidatesAdded:0,relationsAsserted:false,
    deferredUntil:HYBRID_GRAPH_EXPANSION_DEFERRED_UNTIL_V1,
    authorizationEnforced:false,rankPolicy:ranked.rankPolicy,
    rrfApplied:true,exactBoostApplied:ranked.exactBoostApplied,
    deduplicatedCount:ranked.deduplicatedCount,
    candidates:ranked.candidates};
}

/**
 * ARI-03.06.06 / M-0130 — deterministic tie-order audit on the existing hybrid ranker.
 * Ranking relevance is NOT changed.  This wrapper independently verifies that
 * M-0126 RRF, M-0127 exact/verified-alias priority and M-0129 graph depth zero
 * remain sorted across all supported query locales and input permutations.
 *
 * Tie resolution is independent of Unicode collation / Intl locale settings:
 *   exact tier > verified alias tier > ordinary RRF;
 *   RRF score desc > lexical source rank asc > vector source rank asc > UUID asc.
 * UUIDs are canonical ASCII; neither translated titles nor raw scores are used.
 * No DB, network, provider calls, RLS bypass, graph inference, or mutations.
 */
export const HYBRID_STABLE_TIES_CONTRACT_V1='ARCTOR_ARI03_M0130_STABLE_TIES_V1' as const;
export const HYBRID_STABLE_TIES_POLICY_V1='EXACT_TIER_RRF_LEXICAL_VECTOR_ASCII_UUID' as const;
export type HybridStableTiesInputV1=HybridGraphGatedInputV1;
export type HybridStableTiesErrorV1=HybridGraphGateReasonV1|'TIE_ORDER_DRIFT';
export type HybridStableTiesResultV1 =
 | {ok:true;contract:typeof HYBRID_STABLE_TIES_CONTRACT_V1;
    tiePolicy:typeof HYBRID_STABLE_TIES_POLICY_V1;localeCollationUsed:false;
    orderVerified:true;tiesDetected:number;tieGroups:number;
    rrfApplied:true;exactBoostApplied:boolean;deduplicatedCount:number;
    rankPolicy:'CANONICAL_EXACT_THEN_VERIFIED_ALIAS_THEN_RRF'|'RRF_K60_ROLLBACK';
    authorizationEnforced:false;maxGraphDepth:0;graphCandidatesAdded:0;relationsAsserted:false;
    candidates:HybridExactPriorityCandidateV1[]}
 | {ok:false;contract:typeof HYBRID_STABLE_TIES_CONTRACT_V1;
    tiePolicy:typeof HYBRID_STABLE_TIES_POLICY_V1;localeCollationUsed:false;
    orderVerified:false;reason:HybridStableTiesErrorV1;
    authorizationEnforced:false;maxGraphDepth:0;graphCandidatesAdded:0;relationsAsserted:false;
    candidates:[]};
const tieMissingRankCompare=(a:number|null,b:number|null):number=>
  a===b?0:a===null?1:b===null?-1:a-b;
const tieCandidateCompare=(a:HybridExactPriorityCandidateV1,b:HybridExactPriorityCandidateV1):number=>
  b.matchPriority-a.matchPriority ||
  b.rrfScore-a.rrfScore ||
  tieMissingRankCompare(a.lexicalRank,b.lexicalRank) ||
  tieMissingRankCompare(a.vectorRank,b.vectorRank) ||
  (a.onId<b.onId?-1:a.onId>b.onId?1:0);
const tieError=(reason:HybridStableTiesErrorV1):HybridStableTiesResultV1=>({
  ok:false,contract:HYBRID_STABLE_TIES_CONTRACT_V1,
  tiePolicy:HYBRID_STABLE_TIES_POLICY_V1,localeCollationUsed:false,orderVerified:false,
  reason,authorizationEnforced:false,maxGraphDepth:0,graphCandidatesAdded:0,
  relationsAsserted:false,candidates:[]
});
/** Audit prior result WITHOUT sorting again: order must be identical byte-for-byte in JSON. */
export function rankHybridCandidatesStableTiesV1(input:HybridStableTiesInputV1):HybridStableTiesResultV1{
  const prior=rankHybridCandidatesGraphGatedV1(input);
  if(!prior.ok)return tieError(prior.reason);
  let tiesDetected=0,tieGroups=0,insideTieGroup=false;
  for(let i=0;i<prior.candidates.length;i++){
    const c=prior.candidates[i];
    if(c.finalRank!==i+1||!Number.isFinite(c.rrfScore)||
      (i>0&&tieCandidateCompare(prior.candidates[i-1],c)>0))
      return tieError('TIE_ORDER_DRIFT');
    if(i===0)continue;
    const p=prior.candidates[i-1];
    const equal=p.matchPriority===c.matchPriority&&p.rrfScore===c.rrfScore;
    if(equal){tiesDetected++;if(!insideTieGroup){tieGroups++;insideTieGroup=true;}}
    else insideTieGroup=false;
  }
  return {ok:true,contract:HYBRID_STABLE_TIES_CONTRACT_V1,
    tiePolicy:HYBRID_STABLE_TIES_POLICY_V1,localeCollationUsed:false,
    orderVerified:true,tiesDetected,tieGroups,
    rrfApplied:true,exactBoostApplied:prior.exactBoostApplied,
    deduplicatedCount:prior.deduplicatedCount,rankPolicy:prior.rankPolicy,
    authorizationEnforced:false,maxGraphDepth:0,graphCandidatesAdded:0,
    relationsAsserted:false,candidates:prior.candidates};
}

/**
 * ARI-03.06.07 / M-0131 — offline holdout ranking metrics.
 * Does NOT rank, generate embeddings, relabel Gold, or claim production quality.
 * Compares already-ranked, UUID-keyed outputs on exactly the same labeled queries.
 */
export const HYBRID_HOLDOUT_QUALITY_CONTRACT_V1='ARCTOR_ARI03_M0131_HOLDOUT_QUALITY_V1' as const;
export type HybridHoldoutQueryV1={id:string;locale:HybridLocaleV1;relevantOnIds:string[];exactTitle:boolean};
export type HybridHoldoutRankingV1={queryId:string;onIds:string[]};
export type HybridHoldoutInputV1={queries:HybridHoldoutQueryV1[];candidateIds:string[];rankings:HybridHoldoutRankingV1[]};
export type HybridHoldoutErrorV1='INVALID_INPUT'|'INVALID_QUERY'|'INVALID_CANDIDATES'|'INVALID_LABELS'|'INVALID_RANKINGS'|'UNKNOWN_UUID';
export type HybridHoldoutRatesV1={queries:number;exactQueries:number;hitAt1:number;exactHitAt1:number|null;ndcgAt5:number;
  falsePositiveAt1:number;missAt1:number;fpShareOfReturnedTop5:number|null;coverageAt1:number;
  falsePositiveCountAt1:number;missingOrWrongCountAt1:number;falsePositiveCountAt5:number;returnedCountAt5:number};
export type HybridHoldoutRowV1={queryId:string;locale:HybridLocaleV1;expected:string[];first:string|null;top5:string[];
  hit1:boolean;ndcg5:number;exact:boolean};
export type HybridHoldoutResultV1=
 | {ok:true;contract:typeof HYBRID_HOLDOUT_QUALITY_CONTRACT_V1;metrics:HybridHoldoutRatesV1;
    perLocale:Partial<Record<HybridLocaleV1,HybridHoldoutRatesV1>>;perQuery:HybridHoldoutRowV1[];
    independentGoldProven:false;authorizationEnforced:false;}
 | {ok:false;contract:typeof HYBRID_HOLDOUT_QUALITY_CONTRACT_V1;reason:HybridHoldoutErrorV1;
    perQuery:[];independentGoldProven:false;authorizationEnforced:false};
const holdoutFail=(reason:HybridHoldoutErrorV1):HybridHoldoutResultV1=>({
 ok:false,contract:HYBRID_HOLDOUT_QUALITY_CONTRACT_V1,reason,perQuery:[],independentGoldProven:false,authorizationEnforced:false
});
type CountH={n:number;exact:number;hit:number;exactHit:number;ndcg:number;fp1:number;miss1:number;fp5:number;returned:number;covered:number};
const zeroH=():CountH=>({n:0,exact:0,hit:0,exactHit:0,ndcg:0,fp1:0,miss1:0,fp5:0,returned:0,covered:0});
const rateH=(x:CountH):HybridHoldoutRatesV1=>({queries:x.n,exactQueries:x.exact,hitAt1:x.hit/x.n,
 exactHitAt1:x.exact?x.exactHit/x.exact:null,ndcgAt5:x.ndcg/x.n,
 falsePositiveAt1:x.fp1/x.n,missAt1:x.miss1/x.n,
 fpShareOfReturnedTop5:x.returned?x.fp5/x.returned:null,coverageAt1:x.covered/x.n,
 falsePositiveCountAt1:x.fp1,missingOrWrongCountAt1:x.miss1,
 falsePositiveCountAt5:x.fp5,returnedCountAt5:x.returned});
/** FP@1 counts a returned wrong object. Empty returns are missed matches, not false positives. */
export function scoreHybridHoldoutV1(input:HybridHoldoutInputV1):HybridHoldoutResultV1{
 if(!isObj(input)||!Array.isArray(input.queries)||!Array.isArray(input.candidateIds)||!Array.isArray(input.rankings))return holdoutFail('INVALID_INPUT');
 const {queries,candidateIds,rankings}=input;
 if(!queries.length||queries.length>2000||candidateIds.length<2||candidateIds.length>100000||rankings.length!==queries.length)
  return holdoutFail('INVALID_INPUT');
 const validId=(s:unknown):s is string=>typeof s==='string'&&uuid.test(s)&&s===s.toLowerCase();
 if(!candidateIds.every(validId)||new Set(candidateIds).size!==candidateIds.length)return holdoutFail('INVALID_CANDIDATES');
 const allowed=new Set(candidateIds),seen=new Set<string>();const result:HybridHoldoutRowV1[]=[];
 const total=zeroH(),locales=new Map<HybridLocaleV1,CountH>();
 for(let i=0;i<queries.length;i++){
  const q=queries[i];
  if(!isObj(q)||typeof q.id!=='string'||!q.id||seen.has(q.id)||
    typeof q.locale!=='string'||!(locs as readonly string[]).includes(q.locale)||typeof q.exactTitle!=='boolean')
    return holdoutFail('INVALID_QUERY');
  seen.add(q.id);
  if(!Array.isArray(q.relevantOnIds)||!q.relevantOnIds.length||new Set(q.relevantOnIds).size!==q.relevantOnIds.length||
    !q.relevantOnIds.every((id:unknown)=>validId(id)&&allowed.has(id)))return holdoutFail('INVALID_LABELS');
  const row=rankings[i];
  if(!isObj(row)||row.queryId!==q.id||!Array.isArray(row.onIds)||row.onIds.length>candidateIds.length||
    new Set(row.onIds).size!==row.onIds.length)return holdoutFail('INVALID_RANKINGS');
  if(!row.onIds.every((id:unknown)=>validId(id)&&allowed.has(id)))return holdoutFail('UNKNOWN_UUID');
  const expected=new Set(q.relevantOnIds),top=row.onIds.slice(0,5),hit=top.length>0&&expected.has(top[0])?1:0;
  const k=Math.min(expected.size,5);let ideal=0;for(let j=0;j<k;j++)ideal+=1/Math.log2(j+2);
  const dcg=top.reduce((s,id,j)=>s+(expected.has(id)?1/Math.log2(j+2):0),0)/ideal;
  const count=(x:CountH)=>{x.n++;x.hit+=hit;x.exact+=q.exactTitle?1:0;x.exactHit+=q.exactTitle?hit:0;
   x.ndcg+=dcg;x.fp1+=top.length&&!hit?1:0;x.miss1+=!hit?1:0;
   x.fp5+=top.filter(id=>!expected.has(id)).length;x.returned+=top.length;x.covered+=top.length?1:0;};
  count(total);const loc=q.locale as HybridLocaleV1;const sub=locales.get(loc)||zeroH();count(sub);locales.set(loc,sub);
  result.push({queryId:q.id,locale:loc,expected:[...q.relevantOnIds],first:top[0]||null,top5:[...top],hit1:Boolean(hit),ndcg5:dcg,exact:q.exactTitle});
 }
 return {ok:true,contract:HYBRID_HOLDOUT_QUALITY_CONTRACT_V1,metrics:rateH(total),
  perLocale:Object.fromEntries([...locales.entries()].map(([k,v])=>[k,rateH(v)])) as Partial<Record<HybridLocaleV1,HybridHoldoutRatesV1>>,
  perQuery:result,independentGoldProven:false,authorizationEnforced:false};
}
