/**
 * ARCTor ARI-03 M-0097 — DESIGN REFERENCE, not wired to runtime.
 * Intended future target: src/lib/ontology-research/semanticSearchContractV1.ts.
 * The actual runtime validator must conform to M0097_QUERY_REQUEST_SCHEMA_V1.json.
 * actorScope is the CLIENT REQUEST, not an authorization decision.
 */
export type SemanticLocaleV1 = 'en' | 'pl' | 'es' | 'de' | 'cs' | 'uk' | 'ru' | 'und';
export type RequestedActorScopeV1 = 'global_only' | 'global_and_own';
export type SemanticIntentV1 = 'identify' | 'suggest' | 'explore';

export interface SemanticFiltersV1 {
  readonly rootObjectId?: string;
  readonly parentObjectId?: string;
  readonly objectKindCodes?: readonly string[];
  readonly nodeRoleCodes?: readonly string[];
}

export interface QueryRequestV1 {
  readonly text: string;
  readonly locale: SemanticLocaleV1;
  readonly actorScope: RequestedActorScopeV1;
  readonly intent: SemanticIntentV1;
  readonly limit: number; // integer in [1,20]
  readonly filters: Readonly<SemanticFiltersV1>;
}

// Authorization context is SERVER-ONLY, never part of a client QueryRequest.
// Authentication may narrow actorScope; it never widens it.
// A service-role code path must enforce the owner predicate explicitly.
// Unknown privacy/scope => excluded. Global public candidates are not approved for indexing.
// 'und' => unknown language; no implicit fallback to English or any other locale.
// exact / alias / partial / lexical / vector / graph are match methods (future result contract), NOT intents.
// UUID-only query text must NOT be silently routed to exact UUID lookup (separate M-0099).
// Ambiguous recognition must return candidates + a clarification question (future M-0098 response design).
// Validate and deep-freeze a copy at the SERVER boundary; TS readonly alone does not freeze runtime data.
