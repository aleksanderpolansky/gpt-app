# C34-A.5 — Similarity / Relevance Final Lock and Next Branch Decision

Дата: 31.05.2026  
Статус: final lock / documentation-only / no runtime changes  
Ветка: C34-A — Similarity/Relevance resolvers  
Шаг: 5 из 5  

## 1. Назначение

Этот документ закрывает блок C34-A — Similarity/Relevance resolvers.

C34-A.5 фиксирует:

- что было сделано в C34-A.1–C34-A.4;
- что именно считается закрытым;
- что не было реализовано;
- какие gates остаются закрытыми;
- что можно не проверять повторно;
- какой следующий блок возможен после C34-A.

C34-A.5 НЕ реализует resolver.  
C34-A.5 НЕ создаёт runtime route.  
C34-A.5 НЕ создаёт TypeScript adapter.  
C34-A.5 НЕ выполняет SQL.  
C34-A.5 НЕ читает и не пишет DB.  
C34-A.5 НЕ создаёт Value Objects, State Facts, State Deltas, State Snapshots or Semantic Capital.

## 2. Итог C34-A

C34-A был создан как новая ветка после фактического C33-U, чтобы не смешивать старый смысл Roadmap v2, где C33-U означал Similarity/Relevance, с фактическим C33-U, который был использован как State schema draft / persistence readiness.

C34-A закрывает только planning/contract layer для Similarity/Relevance.

C34-A не открывает production implementation.

## 3. Закрытые шаги C34-A

### C34-A.1 — Similarity/Relevance contract

Файл:

docs/activity/c34-a1-similarity-relevance-contract.md

Смысл:

- Similarity и Relevance явно разделены.
- Similarity определён как structural similarity by weighted category overlap.
- Relevance определён как context-sensitive applicability.
- Similarity не может напрямую производить Next Best Action.
- Relevance не является Next Best Action by itself.
- Similarity/Relevance не являются medical, financial or productivity truth.
- No-write boundary сохранён.

### C34-A.2 — Similarity resolver data model and scoring draft

Файл:

docs/activity/c34-a2-similarity-resolver-data-model.md

Смысл:

- Описана модель comparable entity.
- Описана category signature.
- Описана category item model.
- Описана weighted Jaccard similarity formula.
- Описаны draft weights and resolution multipliers.
- Описан output model.
- Описана explanation model.
- Score отделён от confidence.
- Similarity остаётся отделённой от Relevance and NBA.
- No-write boundary сохранён.

### C34-A.3 — Relevance resolver context model and scoring draft

Файл:

docs/activity/c34-a3-relevance-resolver-context-model.md

Смысл:

- Описана Relevance context model.
- Описана Relevance candidate model.
- Similarity support разрешён только как один из inputs.
- State hooks зафиксированы как signals, not facts.
- Weak directions разрешены как input, но не реализуются в C34-A.3.
- Описаны draft scoring components.
- Описаны blockers and warnings.
- Relevance cannot diagnose, guarantee outcomes or claim objective productivity truth.
- Relevance не становится final NBA.
- No-write boundary сохранён.

### C34-A.4 — No-write preview route / adapter contract

Файл:

docs/activity/c34-a4-no-write-preview-route-adapter-contract.md

Смысл:

- Описан future route candidate:
  POST /api/activity/similarity-relevance/preview
- Описан future route mode:
  similarity_relevance_preview_no_write_v0
- Описан future adapter candidate:
  similarityRelevancePreviewAdapterV0
- Описана request/response boundary.
- Описаны explicit false write flags.
- Описан privacy / unresolved concept / state hook / NBA boundary.
- Route/adapter is not NBA.
- Implementation gate НЕ открыт.
- No-write boundary сохранён.

## 4. Что считается готовым после C34-A

После C34-A готово:

1. Conceptual separation of Similarity and Relevance.
2. Similarity data model draft.
3. Similarity scoring draft.
4. Relevance context model draft.
5. Relevance scoring component draft.
6. Future no-write preview route/adapter contract.
7. Explicit safety flags for future preview response.
8. Boundary that Similarity/Relevance do not create NBA.
9. Boundary that state hooks are not state facts.
10. Boundary that no medical/financial/productivity truth is created.
11. Boundary that no hidden writes are allowed.

## 5. Что НЕ сделано в C34-A

C34-A does not implement:

- actual TypeScript similarity resolver;
- actual TypeScript relevance resolver;
- route file;
- adapter file;
- tests;
- runtime smoke;
- DB schema;
- SQL migration;
- DB read;
- DB write;
- State Fact / Delta / Snapshot write;
- Value Object write;
- Semantic Capital write;
- Next Best Action engine;
- Weakest Direction engine;
- Analytics/Semantic Capital engine;
- Review UI.

## 6. Gates that remain closed

The following gates remain closed:

- SQL execution gate;
- migration creation gate;
- DB read gate;
- DB write gate;
- runtime route creation gate;
- TypeScript implementation gate;
- State Fact write gate;
- State Delta write gate;
- State Snapshot write gate;
- Value Object creation/linking gate;
- Semantic Capital write gate;
- production recommendation gate;
- medical/financial/productivity truth gate.

## 7. Anti-retest rules

Do not repeat without meaningful changes:

- C34-A.1 conceptual separation review;
- C34-A.2 Similarity model review;
- C34-A.3 Relevance context model review;
- C34-A.4 route/adapter contract review;
- documentation-only anchor checks already performed before commits;
- commit/push verification for C34-A.1–C34-A.4.

Repeat only if:

- documents are edited;
- route implementation begins;
- adapter implementation begins;
- scoring formulas are changed;
- safety flags are changed;
- privacy or unresolved concept boundary changes;
- DB/SQL/schema gates are opened separately.

## 8. Safety summary

C34-A final state:

- sqlExecuted: false
- dbReadExecuted: false
- dbWriteExecuted: false
- migrationCreated: false
- routeCreated: false
- adapterCreated: false
- typeScriptImplementationCreated: false
- stateFactCreated: false
- stateDeltaCreated: false
- stateSnapshotCreated: false
- valueObjectCreated: false
- semanticCapitalWritten: false
- medicalDiagnosisCreated: false
- financialAdviceCreated: false
- productivityTruthCreated: false
- productionRecommendationCreated: false

## 9. Relation to later branches

C34-A prepares a safe Similarity/Relevance foundation.

It does not replace later branches.

### C34-B — Weakest Direction + Next Best Action package

C34-B may use outputs from C34-A as inputs.

But C34-B must not treat Similarity/Relevance as final NBA.

Expected C34-B focus:

- weak direction ranking contract;
- user choice of direction;
- action candidate package;
- explanation of why now;
- safety and uncertainty;
- no medical/financial/productivity truth;
- no hidden writes.

### C34-C — Analytics / Semantic Capital / Audit

C34-C may later define:

- analytics summary;
- feedback/audit;
- correction rows;
- semantic capital rules.

C34-A does not write Semantic Capital.

### C34-D — Review UI / Workspace integration MVP

C34-D may later define how Similarity/Relevance explanations appear in UI.

C34-A does not create UI.

### C34-E — Final Semantic Block Readiness Lock

C34-E may later consolidate final semantic readiness.

C34-A is only the Similarity/Relevance contract layer.

## 10. Recommended next branch

Recommended next branch after C34-A:

C34-B — Weakest Direction + Next Best Action package.

Reason:

- C34-A separates Similarity and Relevance.
- Next product-level need is to decide weak direction and candidate actions.
- C34-B must ask/select direction and rank action candidates safely.
- C34-B must not claim final truth without explanation and user-visible uncertainty.

However, this document does not start C34-B implementation automatically.

After C34-A.5 commit/push, the next dialogue decision should confirm whether to continue with C34-B.1.

## 11. C34-A acceptance criteria

C34-A is complete when:

- C34-A.1 is committed and pushed.
- C34-A.2 is committed and pushed.
- C34-A.3 is committed and pushed.
- C34-A.4 is committed and pushed.
- C34-A.5 final lock is committed and pushed.
- All C34-A outputs remain documentation-only.
- No SQL/DB/runtime/write gates were opened.
- Next branch decision is explicitly stated.

## 12. Final C34-A status

C34-A status after this document is committed:

SIMILARITY_RELEVANCE_RESOLVERS_PLANNING_BLOCK_COMPLETE

C34 branch status after this document is committed:

5/25 complete, 20 steps left.

Next possible branch:

C34-B — Weakest Direction + Next Best Action package.

## 13. Final no-write lock

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
No State Fact writes.  
No State Delta writes.  
No State Snapshot writes.  
No Semantic Capital writes.  
No medical diagnosis.  
No financial advice.  
No productivity truth.  
No final Next Best Action.
