/** M-0098 DESIGN ONLY. Not imported in running src or API. Never treat client-provided data as authorization. */
export type LocaleCodeV1 = 'en'|'pl'|'es'|'de'|'cs'|'uk'|'ru'|'und';
export type MatchClassV1 = 'exact'|'alias'|'partial'|'lexical'|'vector'|'graph';
export type ScoreSemanticsV1 = 'exact_binary'|'alias_binary'|'partial_coverage'|'lexical_bm25_raw'|'vector_cosine'|'graph_evidence_raw';
export type OutcomeV1 = 'single_candidate'|'ambiguous'|'no_match'|'blocked';
export interface SearchResultPathSegmentV1 {readonly objectId:string;readonly title:string;}
export interface SearchResultPathV1 {readonly status:'verified'|'unverified';readonly alternatives:readonly (readonly SearchResultPathSegmentV1[])[];}
export interface SearchResultScoreV1 {readonly value:number|null; readonly semantics:ScoreSemanticsV1;readonly status:'computed'|'not_computed';readonly calibrated:false;readonly comparisonScope:'within_match_class_only';}
export interface SearchResultProvenanceV1 {
 readonly sourceTable:'value_objects'|'concept_aliases'|'value_object_definition_versions'|'platform_localized_content_v1'|'derived_vector'|'derived_graph';
 readonly sourceField:'title'|'description'|'definition'|'canonical_key'|'alias'|'path'|'negative_context';
 readonly sourceLocale:LocaleCodeV1; readonly sourceVersion:string|null; readonly sourceRecordHash:string|null;
 readonly identityJoinVerified:true;readonly scopeClass:'global_public'|'owner_private'; readonly serverAuthorizationVerified:true;
}
export interface SearchResultVersionV1 {readonly catalog_snapshot_hash:string;readonly translation_version:string;readonly definition_version:number|null;}
export interface SearchCandidateV1 {
 readonly objectId:string;readonly rank:number;readonly match_class:MatchClassV1;
 readonly displayTitle:string;readonly displayLocale:LocaleCodeV1;
 readonly displayEvidenceStatus:'source_verified'|'translation_verified';
 readonly path:SearchResultPathV1;readonly score:SearchResultScoreV1;
 readonly provenance:SearchResultProvenanceV1;readonly version:SearchResultVersionV1;
}
export interface SearchResultV1 {
 readonly contract:'ARCTOR_SEMANTIC_SEARCH_RESULT_V1'; readonly queryLocale:LocaleCodeV1;
 readonly outcome:OutcomeV1; readonly candidates:readonly SearchCandidateV1[];
 readonly clarificationQuestion:string|null;readonly selectedObjectId:null;
 readonly snapshot:Pick<SearchResultVersionV1,'catalog_snapshot_hash'|'translation_version'>;
}
/** Source identity, ownership and version must be checked against authoritative server data, not supplied by caller. */
