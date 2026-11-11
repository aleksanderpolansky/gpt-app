/** ARCTor M0101 - DESIGN ONLY, not imported into production. */
export type PhraseEvidence =
  | 'strict_title_full_phrase'
  | 'strict_alias_full_phrase'
  | 'token_partial'
  | 'lexical_partial'
  | 'soft_fold_candidate'
  | 'other_retrieval_candidate';
export type CandidateGate = {
  valueObjectId: string;
  evidenceClass: PhraseEvidence;
  authorizationVerified: true;
  sourceVerified: true;
  localeVerified: true;
  activeVerified: true;
};
export type PhrasePriorityResponse = {
  mode: 'suggest_by_text';
  query: {text: string; locale: 'en'|'pl'|'es'|'de'|'cs'|'uk'|'ru'|'und'};
  eligibleCandidates: CandidateGate[];
  priorityRule: 'FULL_STRICT_TITLE_THEN_VERIFIED_FULL_ALIAS_BEFORE_TOKEN_OR_PARTIAL';
  selectionState: 'UNCONFIRMED';
};
// Strict title FULL phrase dominates strict verified alias FULL phrase,
// which dominates token/lexical/soft recall; neither dominance nor score confirms a UUID.
// If distinct UUIDs have competing verified full-phrase evidence,
// clarification is required, even when the direct-title evidence is first.
