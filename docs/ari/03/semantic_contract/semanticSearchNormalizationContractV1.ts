/** ARCTor ARI-03.02.04 · M-0100. DESIGN ONLY, not imported by production. */
export type SemanticLocale = 'en'|'pl'|'es'|'de'|'cs'|'uk'|'ru'|'und';
export type NormalizationRequest = Readonly<{
  mode: 'suggest_by_text'; text: string; locale: SemanticLocale;
}>;
export type NormalizedKeys = Readonly<{
  strictKey: string;
  candidateOnlyKeys: readonly string[];
  candidateMode: 'RECALL_ONLY_NOT_EXACT';
  identityResolution: 'NEVER_AUTO_SELECT_OR_MERGE';
  sourceLocale: SemanticLocale;
}>;
/** Strict key: NFC + explicit locale + conservative lowercase + whitespace normalization.
 * Do NOT fold ё/е, strip diacritics, normalize punctuation or transliterate for exact title matches.
 * Key equality does NOT imply identical Observation Object UUID (semantic homonyms).
 * Authorization and identity confirmation are separate server-side decisions.
 */
export type StrictTextKey = string;
/** Optional recall-only folds. Never authoritative for identity or automatic selection. */
export type RecallOnlyKey = string;
export type CandidateIdentityResolution = 'SINGLE_UNCONFIRMED'|'AMBIGUOUS_REQUIRES_QUESTION'|'NO_MATCH';
/** No normalization applies to exact_uuid_lookup objectId (M-0099). */
export type ExactUuidLookupNormalization = 'NOT_APPLICABLE';
