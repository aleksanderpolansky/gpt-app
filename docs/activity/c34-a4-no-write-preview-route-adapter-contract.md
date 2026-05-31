# C34-A.4 — No-write Preview Route / Adapter Contract

Дата: 31.05.2026  
Статус: documentation contract / no runtime changes  
Ветка: C34-A — Similarity/Relevance resolvers  
Шаг: 4 из 5  

## 1. Назначение

Этот документ фиксирует контракт будущего no-write preview route / adapter для Similarity/Relevance resolvers.

C34-A.4 НЕ создаёт runtime route.  
C34-A.4 НЕ создаёт TypeScript adapter.  
C34-A.4 НЕ выполняет SQL.  
C34-A.4 НЕ читает и не пишет DB.  
C34-A.4 НЕ создаёт Value Objects, State Facts, State Deltas, State Snapshots or Semantic Capital.

Цель шага — определить безопасную форму будущего preview endpoint/adapter, который сможет показать Similarity/Relevance result без side effects.

## 2. Связь с C34-A.1–C34-A.3

C34-A.1 зафиксировал:

- Similarity is not Relevance.
- Relevance is not Next Best Action by itself.
- No hidden writes.

C34-A.2 зафиксировал:

- Similarity resolver data model.
- Weighted Jaccard similarity.
- Similarity score and confidence are separate.
- Similarity cannot create NBA or production recommendation.

C34-A.3 зафиксировал:

- Relevance resolver context model.
- Similarity support is only one input.
- State hooks are signals, not facts.
- Relevance cannot diagnose, guarantee outcomes or claim objective productivity truth.

C34-A.4 определяет, как эти модели позже могут быть открыты через no-write preview contract.

## 3. Главная граница C34-A.4

Этот шаг не должен менять поведение приложения.

Allowed:

- documentation;
- route contract description;
- adapter input/output contract;
- safety flags;
- no-write expectations;
- future acceptance criteria.

Not allowed:

- create new route file;
- create new adapter file;
- execute TypeScript implementation;
- run DB queries;
- run SQL;
- create migration;
- write state facts;
- write state deltas;
- write state snapshots;
- write Value Objects;
- write Semantic Capital;
- create production recommendation;
- expose sensitive data.

## 4. Future route name

Future route candidate:

POST /api/activity/similarity-relevance/preview

Route mode:

similarity_relevance_preview_no_write_v0

This name is a contract proposal only.  
No route is created in C34-A.4.

## 5. Future route purpose

The future route should answer:

- which candidates are structurally similar to the source;
- why they are similar;
- whether a candidate may be relevant in the current context;
- why relevance increased or decreased;
- what is uncertain;
- what requires user confirmation;
- why the output is not a final Next Best Action.

The future route must not:

- select final NBA;
- create actions;
- create Value Objects;
- create state facts;
- persist Semantic Capital;
- create medical, financial or productivity truth.

## 6. Future request model

TYPE SimilarityRelevancePreviewRequest:
- source?: SimilarityComparableEntity
- candidates?: RelevanceCandidate[]
- context?: RelevanceContext
- options?:
  - includeSimilarity?: boolean
  - includeRelevance?: boolean
  - explanationMode?: compact | full
  - allowSuggestedCategories?: boolean
  - requireUserConfirmedCategories?: boolean
  - privacyMode?: normal | cautious | strict
  - dryRun?: true

Rules:

- dryRun must be true.
- If dryRun is absent, adapter must treat the request as dryRun true.
- Missing context must reduce confidence, not create invented facts.
- Unresolved concepts must reduce confidence or create blockers.
- Sensitive/private data must not leak into public explanation.

## 7. Future response model

TYPE SimilarityRelevancePreviewResponse:
- ok: boolean
- routeMode: similarity_relevance_preview_no_write_v0
- noWrite: true
- similarity?: SimilarityPreviewSection
- relevance?: RelevancePreviewSection
- warnings?: string[]
- blockers?: string[]
- safety?: SimilarityRelevanceSafetySummary
- debug?: SimilarityRelevanceDebugSummary

The response must always include:

- noWrite: true
- routeMode
- explicit write flags set to false
- safety summary
- explanation that this is preview, not final NBA

## 8. Similarity preview section

TYPE SimilarityPreviewSection:
- sourceSummary?: string
- candidateResults?: SimilarityCandidateResult[]
- policyUsed?: string
- explanation?: string[]
- warnings?: string[]

Required boundaries:

- Similarity may show structural overlap.
- Similarity may show matched categories.
- Similarity may show different categories.
- Similarity must not claim current usefulness.
- Similarity must not select final action.

## 9. Relevance preview section

TYPE RelevancePreviewSection:
- candidateResults?: RelevanceResolverResult[]
- contextSummary?: string
- explanation?: string[]
- warnings?: string[]
- blockers?: string[]

Required boundaries:

- Relevance may rank contextual fit cautiously.
- Relevance may use Similarity as one input.
- Relevance must not copy Similarity score.
- Relevance must not become final NBA.
- Relevance must not create state truth.
- Relevance must not make medical/financial/productivity claims.

## 10. Safety summary

TYPE SimilarityRelevanceSafetySummary:
- noSqlExecuted: true
- noDbReadExecuted: true
- noDbWriteExecuted: true
- noMigrationCreated: true
- noRouteCreatedInThisStep: true
- noStateFactCreated: true
- noStateDeltaCreated: true
- noStateSnapshotCreated: true
- noValueObjectCreated: true
- noSemanticCapitalWritten: true
- noMedicalDiagnosisCreated: true
- noFinancialAdviceCreated: true
- noProductivityTruthCreated: true
- requiresUserConfirmation?: boolean
- unresolvedConceptsPresent?: boolean
- sensitiveContextPresent?: boolean

## 11. Explicit false write flags

Future preview response must expose flags similar to earlier safe preview routes.

Required false flags:

- sqlExecuted: false
- dbReadExecuted: false
- dbWriteExecuted: false
- migrationCreated: false
- routeCreatedByPreview: false
- stateFactCreated: false
- stateDeltaCreated: false
- stateSnapshotCreated: false
- valueObjectCreated: false
- semanticCapitalWritten: false
- medicalDiagnosisCreated: false
- financialAdviceCreated: false
- productivityScoreCreated: false
- productionRecommendationCreated: false

## 12. Adapter boundary

Future adapter candidate name:

similarityRelevancePreviewAdapterV0

Future file candidate:

lib/activity/similarityRelevance/similarityRelevancePreviewAdapterV0.ts

This is only a future contract.

C34-A.4 does not create this file.

## 13. Adapter responsibilities

The future adapter should:

1. Accept source, candidates and context.
2. Normalize input into comparable preview objects.
3. Run similarity scoring in memory.
4. Run relevance scoring in memory.
5. Build explanation.
6. Build blockers and warnings.
7. Return noWrite response.
8. Return explicit false write flags.

The future adapter must not:

- import server DB clients;
- call Supabase;
- read DB;
- write DB;
- call persistence service;
- call Value Object creation service;
- call State Fact/Delta/Snapshot service;
- call Semantic Capital service.

## 14. Data source boundary

Future preview route may accept data from:

- request payload;
- existing no-write semantic preview result;
- activity capture review draft;
- product semantic preview draft;
- local in-memory fixtures for tests.

Future preview route must not silently fetch private data from DB.

If DB read is later needed, it requires a separate SELECT-only gate and must not be added implicitly.

## 15. Privacy boundary

Default privacy behavior:

- private input stays private;
- sensitive input requires cautious explanation;
- public output must not include private/sensitive details;
- user confirmation may be required before showing sensitive relevance reasons;
- cross-user comparison is forbidden by default;
- organization comparison requires organization-approved context.

## 16. Unresolved concept boundary

If unresolved concepts are present:

- similarity confidence decreases;
- relevance confidence decreases;
- strong relevance claims may be blocked;
- suggested categories must be marked as suggested;
- external concepts must not be treated as confirmed internal categories;
- the preview may suggest "review/confirm meaning" as a safe next review action, but not as final NBA.

## 17. State hook boundary

State hooks may influence relevance.

But:

- state hook is not state fact;
- state hook cannot create State Fact / Delta / Snapshot;
- fatigue/stress/pain hooks require cautious language;
- no diagnosis;
- no medical advice;
- no hidden state writes.

## 18. NBA boundary

This route/adapter is not NBA.

Allowed:

- "candidate may fit this context";
- "candidate has higher relevance preview";
- "requires confirmation";
- "confidence is low because...".

Not allowed:

- "this is the best action";
- "do this now";
- "this will improve your health";
- "this guarantees productivity";
- "this is financially optimal".

Final NBA belongs to later C34-B branch.

## 19. Future test matrix

When implemented later, tests should verify:

- route returns noWrite true;
- all write flags false;
- similarity result exists when includeSimilarity true;
- relevance result exists when includeRelevance true;
- high Similarity does not force high Relevance;
- high Relevance does not become NBA;
- unresolved concepts reduce confidence;
- safety claims are cautious;
- medical/financial/productivity truth is not created;
- no DB clients are imported;
- no persistence service is called.

## 20. Example preview request

Example:

- source: German listening practice for B2 interview
- candidates:
  - English listening practice
  - German grammar drill
  - rest / recovery action
- context:
  - selectedDirection: languages
  - weakDirection: German job readiness
  - availableMinutes: 20
  - fatigue_signal: medium
  - environment: home

Expected behavior:

- Similarity may rank English listening as structurally similar.
- Relevance may rank German listening or lighter passive practice higher.
- Recovery may become contextually relevant if fatigue is high.
- No candidate becomes final NBA in this route.

## 21. Example preview response explanation

Allowed explanation:

- "German listening practice may fit the current context because the selected direction is languages and the weak direction is German job readiness."
- "English listening is structurally similar, but may be less relevant to the current German-focused goal."
- "Because fatigue signal is present, active grammar drill receives a lower context fit score."
- "This is a preview, not a final Next Best Action."

## 22. Implementation gate rules

Before future implementation, a separate implementation gate must define:

- exact route path;
- exact adapter file;
- TypeScript types;
- test cases;
- whether fixtures are used;
- whether any existing no-write service is imported;
- explicit no DB import rule;
- expected npm/typecheck command;
- commit/push gate.

C34-A.4 does not open that implementation gate.

## 23. Acceptance criteria for C34-A.4

C34-A.4 is complete when:

- future route name is documented;
- route mode is documented;
- request model is documented;
- response model is documented;
- safety summary is documented;
- explicit false write flags are documented;
- adapter responsibility boundary is documented;
- DB/persistence prohibition is documented;
- privacy/unresolved/state/NBA boundaries are documented;
- future test matrix is documented;
- no-write boundary is preserved;
- C34-A.5 can close the C34-A block.

## 24. Next step

C34-A.5 — Final lock and next branch decision.

C34-A.5 should summarize:

- C34-A.1 contract;
- C34-A.2 Similarity model;
- C34-A.3 Relevance model;
- C34-A.4 no-write route/adapter contract;
- remaining implementation gates;
- decision whether to move to C34-B.

## 25. Final status

C34-A.4 is documentation-only.

No runtime changes.  
No TypeScript implementation.  
No route creation.  
No adapter creation.  
No SQL.  
No migration.  
No DB reads.  
No DB writes.  
No production behavior changes.  
No Value Object writes.  
No State Fact / Delta / Snapshot writes.  
No Semantic Capital writes.  
No medical diagnosis.  
No financial advice.  
No productivity truth.
