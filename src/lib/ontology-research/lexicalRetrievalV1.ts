/**
 * ARI-03 M-0105: bounded pure lexical candidate scorer; NOT a public API or authorization layer.
 * The caller MUST filter candidates by authenticated actor scope before invoking this function.
 * Results are suggestions, never confirmed identities. No DB/RPC, embeddings, path inference or writes.
 * M-0106 adds exact, externally verified catalog-alias evidence only.
 * M-0107 limits definition and path matches to weak evidence: direct title always wins.
 * M-0108 adds explicit bounded scoped-input pagination. Input must already be preauthorized by server.
 * A client-supplied verification marker is NOT an authorization or database proof.
 * The server MUST create the authorized candidate and alias collection after RLS/ACL and
 * checking existence of the actual alias target in the verified catalog snapshot.
 */
export type LexicalLocaleV1 = 'en'|'pl'|'es'|'de'|'cs'|'uk'|'ru';
export type LexicalFieldV1 = 'title'|'alias'|'description'|'definition'|'path';
export type LexicalMatchV1 = 'exact_title'|'verified_exact_alias'|'phrase_prefix_title'|'partial_title'|'description_match'|'definition_match'|'path_only';
/** This structure is produced only by trusted server-side catalog materialization. */
export type CatalogAliasEvidenceV1 = {
  locale: LexicalLocaleV1; text: string; targetId: string;
  registry: 'concept_aliases'; registryStatus: 'published'|'draft'|'rejected'|'unknown';
  /** Only a server-side join to an existing, authorized catalog target may set true. */
  targetResolved: boolean;
  /** Only trusted catalog/curator verification may set this; AI conjectures are false. */
  curatorVerified: boolean;
};
export type LexicalCandidateV1 = {
  id: string;
  role: 'root'|'intermediate'|'leaf'|'structural'|'unknown';
  titles: ReadonlyArray<{locale: LexicalLocaleV1; text: string}>;
  descriptions?: ReadonlyArray<{locale: LexicalLocaleV1; text: string}>;
  /** Optional verified definition text; this is not a claim that database definition is linked. */
  definitions?: ReadonlyArray<{locale: LexicalLocaleV1; text: string}>;
  /** Display paths are weak textual evidence only; never structural proof of a parent. */
  paths?: ReadonlyArray<{locale: LexicalLocaleV1; text: string}>;
  /** Never accept this field from an untrusted client; strip/construct server-side. */
  aliases?: ReadonlyArray<CatalogAliasEvidenceV1>;
};
export type LexicalHitV1 = {
  id: string;
  role: LexicalCandidateV1['role'];
  score: number;
  matchClass: LexicalMatchV1;
  evidence: {field: LexicalFieldV1; locale: LexicalLocaleV1; text: string};
  /** Never set true from a lexical match. */
  confirmed: false;
};
export type LexicalResponseV1 = {
  contract: 'ARCTOR_ARI_M0105_WEIGHTED_LEXICAL_V1';
  results: LexicalHitV1[];
  evaluated: number;
  totalMatched: number;
  truncated: boolean;
  /** Page boundaries are only valid within the caller-supplied, preauthorized input. */
  page: {
    offset: number; limit: number; returned: number;
    hasPreviousWithinInput: boolean; hasMoreWithinInput: boolean;
    nextOffset: number|null; totalMatchedWithinInput: number;
  };
  scope: {
    requestedMode: 'preauthorized_global'|'preauthorized_global_and_own';
    authorizationVerifiedByScorer: false;
    catalogCoverage: 'UNVERIFIED_INPUT_ONLY';
    absenceProven: false;
    /** A zero-match result NEVER proves an ON absent from the full catalog. */
    callerMustFilterByActor: true;
  };
  autoSelected: false;
  authorizationVerifiedByScorer: false;
  aliasesConsidered: boolean;
  aliasRegistryVerifiedByScorer: false;
  note: string;
};
export const LEXICAL_FIELD_WEIGHTS_V1 = Object.freeze({
  exact_title: 1000,
  verified_exact_alias: 850,
  phrase_prefix_title: 650,
  partial_title: 340,
  description_match: 70,
  definition_match: 60,
  path_only: 20,
} as const);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOCALE = new Set<LexicalLocaleV1>(['en','pl','es','de','cs','uk','ru']);
const MAX_QUERY = 180, MAX_CANDIDATES = 2000, MAX_LIMIT = 20, MAX_OFFSET = 2000;
const SCOPE_MODES = new Set(['preauthorized_global','preauthorized_global_and_own']);
/** Strict Unicode normalization: accents, ё/е, punctuation and numeric signs retain identity. */
export function strictLexicalNormalizeV1(s: string): string {
  return s.normalize('NFC').toLocaleLowerCase('und').replace(/\s+/gu,' ').trim();
}
function words(s: string): string[] {
  // Do not turn C++ and C or ёлка and елка into the same phrase.
  return s.split(/\s+/u).filter(Boolean);
}
function assessField(query: string, value: string, field: LexicalFieldV1): {kind: LexicalMatchV1; weight: number}|null {
  if (!value) return null;
  const v = strictLexicalNormalizeV1(value);
  if (!v) return null;
  if (field === 'title' && v===query) return {kind:'exact_title',weight:LEXICAL_FIELD_WEIGHTS_V1.exact_title};
  if (field === 'title' && v.startsWith(query+' ')) return {kind:'phrase_prefix_title',weight:LEXICAL_FIELD_WEIGHTS_V1.phrase_prefix_title};
  // Word-aware matching with no arbitrary substring or morphology claims.
  const q=words(query),vwords=words(v);
  if (!q.length) return null;
  const present=q.every(w=>vwords.includes(w));
  if (!present) return null;
  if (field === 'title') return {kind:'partial_title',weight:LEXICAL_FIELD_WEIGHTS_V1.partial_title};
  if (field === 'description') return {kind:'description_match',weight:LEXICAL_FIELD_WEIGHTS_V1.description_match};
  if (field === 'definition') return {kind:'definition_match',weight:LEXICAL_FIELD_WEIGHTS_V1.definition_match};
  return {kind:'path_only',weight:LEXICAL_FIELD_WEIGHTS_V1.path_only};
}
/**
 * Pure ordered retrieval over PREAUTHORIZED rows. Rejection is fail-closed; no hidden topK truncation.
 * One identical UUID appears at most once. Duplicate UUIDs with conflicting content are rejected.
 * Locale is exact: no unknown-language-to-English guessing or implicit translation.
 */
export function retrieveWeightedLexicalV1(input: {
  query: string;
  locale: LexicalLocaleV1;
  limit: number;
  authorizedCandidates: readonly LexicalCandidateV1[];
  /** Zero-based offset into the full, deterministically ranked authorizedCandidates match set. */
  offset?: number;
  /** An audit label, NOT a permission grant: authorization is the server's duty. */
  scopeMode?: 'preauthorized_global'|'preauthorized_global_and_own';
}): LexicalResponseV1 {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('M0108_INVALID_SCOPE_INPUT');
  if (Object.keys(input).some(k=>!['query','locale','limit','authorizedCandidates','offset','scopeMode'].includes(k))) throw new Error('M0108_UNTRUSTED_QUERY_FIELD');
  const offset = input.offset === undefined ? 0 : input.offset;
  const scopeMode = input.scopeMode === undefined ? 'preauthorized_global' : input.scopeMode;
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > MAX_OFFSET || !SCOPE_MODES.has(scopeMode)) throw new Error('M0108_INVALID_PAGE_OR_SCOPE');
  if (typeof input.query !== 'string' || typeof input.locale !== 'string' ||
      !LOCALE.has(input.locale) || !Number.isInteger(input.limit) || input.limit < 1 || input.limit > MAX_LIMIT ||
      !Array.isArray(input.authorizedCandidates)) throw new Error('M0105_INVALID_INPUT');
  const query = strictLexicalNormalizeV1(input.query);
  if (!query || [...query].length > MAX_QUERY || /[\u0000-\u001f\u007f]/u.test(query)) throw new Error('M0105_INVALID_QUERY');
  if (input.authorizedCandidates.length > MAX_CANDIDATES) throw new Error('M0105_CANDIDATE_BOUND_EXCEEDED');
  const ids = new Set<string>();
  const hits: LexicalHitV1[] = [];
  for (const candidate of input.authorizedCandidates) {
    if (!candidate || typeof candidate.id !== 'string' || !UUID.test(candidate.id) ||
       !['root','intermediate','leaf','structural','unknown'].includes(candidate.role) ||
       !Array.isArray(candidate.titles) || !candidate.titles.length) throw new Error('M0105_INVALID_CANDIDATE');
    const id=candidate.id.toLowerCase();
    if (ids.has(id)) throw new Error('M0105_DUPLICATE_UUID');
    ids.add(id);
    let best: LexicalHitV1|null=null;
    const fields: Array<[LexicalFieldV1,ReadonlyArray<{locale:LexicalLocaleV1;text:string}>]> = [
      ['title',candidate.titles],['description',candidate.descriptions??[]],
      ['definition',candidate.definitions??[]],['path',candidate.paths??[]]
    ];
    for (const [field,variants] of fields) {
      if (!Array.isArray(variants) || variants.length > 32) throw new Error('M0105_INVALID_VARIANTS');
      for (const variant of variants) {
        if (!variant || typeof variant.text!=='string' || typeof variant.locale!=='string' ||
            !LOCALE.has(variant.locale) || variant.text.length > 4000) throw new Error('M0105_INVALID_TEXT');
        if (variant.locale!==input.locale) continue;
        const assessed=assessField(query,variant.text,field);
        if (!assessed) continue;
        const hit: LexicalHitV1={id,role:candidate.role,score:assessed.weight,matchClass:assessed.kind,
          evidence:{field,locale:variant.locale,text:variant.text},confirmed:false};
        if (!best || hit.score>best.score || (hit.score===best.score && hit.evidence.text<best.evidence.text)) best=hit;
      }
    }
    const aliasRecords=candidate.aliases??[];
    if (!Array.isArray(aliasRecords) || aliasRecords.length>32) throw new Error('M0106_INVALID_ALIASES');
    for (const alias of aliasRecords) {
      if (!alias || typeof alias.locale!=='string' || !LOCALE.has(alias.locale) ||
          typeof alias.text!=='string' || alias.text.length>4000 ||
          typeof alias.targetId!=='string' || !UUID.test(alias.targetId) ||
          alias.registry!=='concept_aliases' ||
          !['published','draft','rejected','unknown'].includes(alias.registryStatus) ||
          typeof alias.targetResolved!=='boolean' || typeof alias.curatorVerified!=='boolean')
          throw new Error('M0106_INVALID_ALIAS_RECORD');
      // A missing, unpublished, unverified or cross-target alias never supplies evidence.
      // In the live M0091 snapshot 89/89 aliases have unresolved targets; exclude ALL of them.
      if (alias.locale!==input.locale || alias.registryStatus!=='published' ||
          !alias.targetResolved || !alias.curatorVerified ||
          alias.targetId.toLowerCase()!==id) continue;
      if (strictLexicalNormalizeV1(alias.text)!==query) continue;
      const hit:LexicalHitV1={id,role:candidate.role,score:LEXICAL_FIELD_WEIGHTS_V1.verified_exact_alias,
        matchClass:'verified_exact_alias',evidence:{field:'alias',locale:alias.locale,text:alias.text},confirmed:false};
      if (!best || hit.score>best.score || (hit.score===best.score && hit.evidence.text<best.evidence.text)) best=hit;
    }
    if (best) hits.push(best);
  }
  hits.sort((a,b)=>b.score-a.score || a.id.localeCompare(b.id,'en'));
  const pageHits=hits.slice(offset,offset+input.limit);
  const hasMore=offset+input.limit<hits.length;
  return {contract:'ARCTOR_ARI_M0105_WEIGHTED_LEXICAL_V1',results:pageHits,
    evaluated:input.authorizedCandidates.length,totalMatched:hits.length,
    truncated:offset>0 || hasMore,
    page:{offset,limit:input.limit,returned:pageHits.length,hasPreviousWithinInput:offset>0,
      hasMoreWithinInput:hasMore,nextOffset:hasMore?offset+pageHits.length:null,totalMatchedWithinInput:hits.length},
    scope:{requestedMode:scopeMode as 'preauthorized_global'|'preauthorized_global_and_own',authorizationVerifiedByScorer:false,
      catalogCoverage:'UNVERIFIED_INPUT_ONLY',absenceProven:false,callerMustFilterByActor:true},
    autoSelected:false,authorizationVerifiedByScorer:false,
    aliasesConsidered:input.authorizedCandidates.some(c=>Array.isArray(c.aliases)&&c.aliases.some((a:CatalogAliasEvidenceV1)=>a?.registryStatus==='published'&&a?.targetResolved===true&&a?.curatorVerified===true&&a?.targetId?.toLowerCase()===c.id?.toLowerCase()&&a?.locale===input.locale)),
    aliasRegistryVerifiedByScorer:false,
    note:'Only preauthorized caller-supplied rows ranked. Page and zero results do not prove exhaustive catalog coverage, absence, identity or ACL.'};
}
