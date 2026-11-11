/** M-0099 DESIGN ONLY. No runtime API, no production source modification. */
import type { SearchResultV1 } from './semanticSearchResultContractV1'; // design-only reference, not production import
export type SearchLocaleV1 = 'en'|'pl'|'es'|'de'|'cs'|'uk'|'ru'|'und';
export type ActorScopeV1 = 'global_only'|'global_and_own';
export interface ExactUuidLookupV1 {
  readonly mode:'exact_uuid_lookup'; readonly objectId:string;
  readonly locale:SearchLocaleV1; readonly actorScope:ActorScopeV1;
}
export interface SuggestByTextV1 {
  readonly mode:'suggest_by_text';
  readonly query: {
    readonly text:string; readonly locale:SearchLocaleV1; readonly actorScope:ActorScopeV1;
    readonly intent:'identify'|'suggest'|'explore'; readonly limit:number;
    readonly filters:Readonly<Record<string,unknown>>;
  };
}
export type SemanticSearchDispatchRequestV1 = ExactUuidLookupV1 | SuggestByTextV1;
export type ExactLookupOutcomeV1 =
  | { readonly mode:'exact_uuid_lookup'; readonly outcome:'found'; readonly objectId:string; readonly selectedObjectId:null; readonly serverAuthorizationVerified:true; readonly identityJoinVerified:true }
  | { readonly mode:'exact_uuid_lookup'; readonly outcome:'not_available'; readonly objectId:null; readonly selectedObjectId:null; readonly serverAuthorizationVerified:true; readonly identityJoinVerified:true };
export type SuggestOutcomeV1 = { readonly mode:'suggest_by_text'; readonly searchResult:SearchResultV1; };
export type SemanticSearchDispatchResultV1 = ExactLookupOutcomeV1 | SuggestOutcomeV1;
/** Explicit mode only; server checks identity, visibility and joins. No lookup by raw text UUID; no text fallback after exact lookup failure. */
