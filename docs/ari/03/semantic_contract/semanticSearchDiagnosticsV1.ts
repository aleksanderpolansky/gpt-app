/** M0103: DESIGN-ONLY, never import as production implementation. */
export type UnresolvedReason = 'NO_VERIFIED_DIRECT_MATCH'|'NO_VERIFIED_ALIAS'|'NOT_EVALUATED_LIMIT'|'UNSUPPORTED_TOKENIZATION'|'NO_VERIFIED_LOCALE_TEXT';
export type UnresolvedToken = { text:string; startUtf16:number; endUtf16:number; reason:UnresolvedReason };
export type DiagnosticRationale = {
 valueObjectId:string; authorizationVerified:true; sourceVerified:true;
 matchClass:'exact'|'alias'|'partial'|'lexical'|'ancestor_expansion';
 reasonCode:'VERIFIED_STRICT_TITLE'|'VERIFIED_FULL_ALIAS'|'VERIFIED_PARTIAL_TITLE'|'VERIFIED_LEXICAL_TITLE'|'VERIFIED_STRUCTURAL_ANCESTOR';
 safeExplanation:string; selectionState:'UNCONFIRMED'; ancestorDepth?:1|2|3;
};
export type SearchDiagnosticEnvelope = {
 mode:'suggest_by_text'; query:{text:string;locale:'en'|'pl'|'es'|'de'|'cs'|'uk'|'ru'|'und'};
 outcome:'candidate'|'ambiguous'|'no_match'|'blocked'; diagnosticsStatus:'complete'|'partial'|'unavailable';
 unresolvedTokens:UnresolvedToken[];candidateRationales:DiagnosticRationale[];
 selectionState:'UNCONFIRMED';catalogSnapshotHash:string;translationVersion:string;
};
export const diagnosticDesignOnly = Object.freeze({ noAutoSelection:true, allowPrivateDisclosure:false, runtimeImplemented:false, utf16SpanRequired:true });
