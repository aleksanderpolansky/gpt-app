# C34-E.3 — Implementation Gate Candidates and Priority Order

Дата: 31.05.2026  
Статус: documentation contract / no runtime changes  
Ветка: C34-E — Final Semantic Block Readiness Lock  
Шаг: 3 из 5  

## 1. Назначение

Этот документ фиксирует future implementation gate candidates and priority order после завершения planning/readiness блоков C34-A, C34-B, C34-C, C34-D и C34-E.1–E.2.

Цель C34-E.3:

- определить возможные будущие implementation tracks;
- выстроить безопасный порядок реализации;
- закрепить no-write-first strategy;
- определить, какие gates нужны каждому track;
- определить, что проверять перед coding;
- определить, какие tracks явно отложены;
- предотвратить преждевременное открытие write gates.

C34-E.3 НЕ реализует Semantic Block.  
C34-E.3 НЕ создаёт runtime.  
C34-E.3 НЕ создаёт route.  
C34-E.3 НЕ создаёт TypeScript adapter.  
C34-E.3 НЕ создаёт React component.  
C34-E.3 НЕ создаёт page.  
C34-E.3 НЕ создаёт fixture files.  
C34-E.3 НЕ выполняет SQL.  
C34-E.3 НЕ читает и не пишет DB.  
C34-E.3 НЕ создаёт Value Objects, State Facts, State Deltas, State Snapshots or Semantic Capital.  
C34-E.3 НЕ создаёт audit rows, correction rows or feedback rows.  
C34-E.3 НЕ создаёт final Next Best Action.  
C34-E.3 НЕ выполняет action.

## 2. Main rule

Implementation must start from no-write, fixture-first, pure-function-first tracks.

No implementation track may begin from:

- DB writes;
- Semantic Capital writes;
- State Fact/Delta/Snapshot writes;
- correction application;
- feedback persistence;
- final Next Best Action;
- action execution;
- production analytics;
- production recommendation;
- medical/financial/productivity truth.

## 3. No-write-first strategy

No-write-first strategy means:

1. Start with pure contracts and shared types.
2. Add fixture package.
3. Add pure no-write adapter.
4. Add UI connected only to fixtures.
5. Add no-write preview route only after UI/adapter safety is clear.
6. Add read-only DB bridge only after no-write route is stable.
7. Add write gates only after separate final authorization.
8. Never mix preview implementation and persistence implementation in one step.

This strategy reduces risk because every layer can be verified before persistence exists.

## 4. Priority order

Recommended implementation priority after C34-E.5:

1. Track 0 — Implementation gate protocol.
2. Track 1 — Shared contract types.
3. Track 2 — Fixture package.
4. Track 3 — No-write adapter.
5. Track 4 — Review UI fixture workspace.
6. Track 5 — No-write preview route.
7. Track 6 — Similarity/Relevance pure implementation.
8. Track 7 — Weakest Direction and candidate package preview.
9. Track 8 — Analytics / Semantic Capital / Audit preview.
10. Track 9 — Read-only DB bridge.
11. Track 10 — Write-gated flows.

Tracks 0–8 should remain no-write.  
Track 9 may allow DB reads only after a separate read gate.  
Track 10 remains deferred.

## 5. Track 0 — Implementation gate protocol

Purpose:

- create a repeatable protocol for every future implementation step;
- force exact scope;
- force exact file list;
- force exact tests;
- force exact no-write/write status;
- force exact commit/push confirmation phrase.

Allowed:

- documentation;
- gate template;
- checklist;
- no-write/read/write labels.

Forbidden:

- code implementation;
- SQL;
- DB access;
- route creation;
- UI implementation.

Required gate:

- documentation-only gate.

Priority:

- highest.

Reason:

- all future implementation depends on predictable gate structure.

## 6. Track 1 — Shared contract types

Purpose:

- translate locked documentation models into TypeScript types/interfaces;
- keep types pure;
- avoid runtime logic;
- avoid DB imports;
- avoid UI implementation.

Possible future files:

- lib/activity/semantic-readiness/types.ts
- lib/activity/reviewWorkspace/types.ts
- lib/activity/semanticPreview/types.ts

Allowed:

- TypeScript type/interface creation;
- literal union types;
- exported readonly constants for labels/statuses if needed;
- no runtime side effects.

Forbidden:

- DB client import;
- route creation;
- React component;
- fixture data;
- production computation;
- writes;
- action execution.

Required gate:

- TypeScript implementation gate;
- no-write gate;
- typecheck gate.

Priority:

- very high.

## 7. Track 2 — Fixture package

Purpose:

- create fixture data matching C34-D.4 scenarios;
- enable UI/adapter testing without DB;
- represent direction, candidate, analytics, Semantic Capital, audit/correction/feedback previews.

Required fixture scenarios:

- direction_choice_required;
- candidate_review_ready;
- low_confidence_blocked;
- correction_review_ready;
- feedback_preview_ready;
- semantic_capital_preview_ready;
- privacy_restricted;
- empty_state;
- full_demo.

Allowed:

- static fixture objects;
- mock preview packages;
- no-write safety summaries;
- disabled action fixtures;
- warning/blocker fixtures.

Forbidden:

- DB seed data;
- production data;
- Supabase calls;
- route calls;
- user-specific real data;
- writes.

Required gate:

- fixture implementation gate;
- no-write gate;
- typecheck gate;
- fixture validation gate.

Priority:

- very high.

## 8. Track 3 — No-write adapter

Purpose:

- convert fixture/preview package into WorkspaceReviewScreenModel;
- attach safety summary;
- attach disabled actions;
- attach warnings/blockers;
- keep all output preview-only.

Possible future adapter:

- reviewWorkspaceNoWriteAdapterV0

Allowed:

- pure function;
- deterministic conversion;
- input validation;
- forbidden copy detection;
- no-write safety summary.

Forbidden:

- DB imports;
- route calls;
- production analytics;
- final NBA creation;
- action execution;
- write operations.

Required gate:

- TypeScript implementation gate;
- no-write adapter gate;
- unit test gate;
- no DB import verification.

Priority:

- very high.

## 9. Track 4 — Review UI fixture workspace

Purpose:

- create UI/page/component that displays fixture-backed review workspace;
- test screen blocks, panels, drawers, warnings, blockers and disabled actions;
- prove preview-first UX before backend integration.

Allowed:

- React component;
- page/component creation;
- fixture import;
- local UI state;
- confirmation modal preview;
- disabled action display;
- no-write footer.

Forbidden:

- production route call;
- DB call;
- final NBA creation;
- action execution;
- feedback persistence;
- correction application;
- Semantic Capital write.

Required gate:

- React/UI implementation gate;
- fixture-only gate;
- no DB/no route verification;
- typecheck/test gate.

Priority:

- high.

## 10. Track 5 — No-write preview route

Purpose:

- provide a route that returns preview package without writes;
- initially may return fixture/mock data;
- later may call pure processors only.

Allowed only after:

- Track 1 types complete;
- Track 2 fixtures complete;
- Track 3 no-write adapter complete;
- Track 4 fixture UI stable or explicitly deferred.

Allowed:

- route creation;
- no-write response;
- fixture or pure computed preview;
- safety summary;
- warnings/blockers.

Forbidden:

- DB writes;
- Semantic Capital writes;
- audit/correction/feedback writes;
- final NBA creation;
- action execution.

Required gate:

- runtime route creation gate;
- no-write route gate;
- route test gate;
- no DB write verification.

Priority:

- medium-high.

## 11. Track 6 — Similarity/Relevance pure implementation

Purpose:

- implement pure similarity/relevance scoring helpers;
- preserve Similarity is not Relevance;
- preserve Relevance is not NBA.

Allowed:

- pure functions;
- test fixtures;
- deterministic examples;
- confidence/uncertainty output.

Forbidden:

- final NBA;
- writes;
- action execution;
- production recommendation;
- DB access unless separate read gate is opened later.

Required gate:

- TypeScript implementation gate;
- pure-function gate;
- test gate;
- no-write gate.

Priority:

- medium.

## 12. Track 7 — Weakest Direction and candidate package preview

Purpose:

- implement no-write preview of weakest direction ranking and candidate package;
- preserve user choice required;
- preserve candidate package is not final NBA.

Allowed:

- pure ranking helpers;
- preview package;
- candidate package construction;
- blockers/warnings;
- confidence/uncertainty.

Forbidden:

- auto-select top direction;
- create final NBA;
- execute action;
- DB writes;
- hidden feedback/correction writes.

Required gate:

- no-write semantic preview gate;
- user-choice boundary test;
- candidate-not-final-NBA test.

Priority:

- medium.

## 13. Track 8 — Analytics / Semantic Capital / Audit preview

Purpose:

- implement no-write preview for analytics, Semantic Capital, audit/correction/feedback.
- preserve all C34-C boundaries.

Allowed:

- preview analytics summaries;
- Semantic Capital preview only;
- audit explanation preview;
- correction candidate preview;
- feedback preview.

Forbidden:

- Semantic Capital writes;
- audit row writes;
- correction row writes;
- feedback row writes;
- applied correction;
- productivity truth;
- money/points display.

Required gate:

- no-write analytics preview gate;
- Semantic Capital boundary test;
- audit/correction/feedback no-write test.

Priority:

- medium.

## 14. Track 9 — Read-only DB bridge

Purpose:

- connect no-write preview logic to real read-only data after pure/fixture layers are stable.

Allowed only after:

- no-write fixture layer is stable;
- no-write adapter is stable;
- no-write route is stable;
- read-only gate is explicitly opened.

Allowed:

- DB reads;
- RLS-safe queries;
- read-only adapters;
- sanitized evidence;
- privacy-aware summaries.

Forbidden:

- DB writes;
- mutation;
- State/Semantic Capital writes;
- correction application;
- feedback persistence;
- final NBA;
- action execution.

Required gate:

- DB read gate;
- RLS/security review gate;
- no DB write verification;
- privacy boundary gate.

Priority:

- lower than no-write tracks.

## 15. Track 10 — Write-gated flows

Purpose:

- eventually persist user-confirmed facts, corrections, feedback, Semantic Capital or final NBA.

Status:

- explicitly deferred.

May include later:

- feedback persistence;
- correction application;
- audit row write;
- State Fact write;
- State Delta write;
- State Snapshot write;
- Semantic Capital write;
- final NBA write;
- action execution.

Forbidden now:

- all write-gated flows.

Required future gates:

- write gate;
- SQL/migration gate if schema changes;
- RLS/security gate;
- audit gate;
- rollback gate;
- user-confirmation gate;
- production safety gate.

Priority:

- deferred until after no-write/read-only validation.

## 16. Deferred tracks

Explicitly deferred:

- write-gated State Fact persistence;
- write-gated State Delta persistence;
- write-gated State Snapshot persistence;
- Semantic Capital write;
- audit row write;
- correction row write;
- feedback row write;
- applied correction;
- final Next Best Action;
- action execution;
- medical diagnosis;
- financial advice;
- productivity truth claims.

These tracks cannot be opened by implication.

They require explicit future decision.

## 17. Gate requirements by track

Every implementation gate must state:

- track number;
- implementation goal;
- exact files to create/edit;
- exact files that must not be touched;
- no-write/read-only/write status;
- DB read status;
- DB write status;
- route status;
- adapter status;
- UI status;
- fixture status;
- test commands;
- safety checks;
- rollback plan;
- expected git status;
- exact commit message;
- exact commit/push confirmation phrase.

## 18. Pre-coding verification

Before any coding track:

1. Confirm clean git status.
2. Confirm latest final readiness commit.
3. Read source-of-truth documents for the track.
4. Identify final lock document.
5. Define allowed files.
6. Define forbidden files.
7. Define no-write/read/write boundary.
8. Define tests.
9. Define expected output.
10. Define commit/push gate phrase.

No coding should start without these.

## 19. Risk order

Lowest risk:

- documentation-only gates;
- shared types;
- fixtures;
- pure no-write adapter.

Medium risk:

- UI fixture workspace;
- no-write preview route;
- pure similarity/relevance functions;
- no-write weakest direction preview.

Higher risk:

- read-only DB bridge;
- production route integration.

Highest risk:

- DB writes;
- Semantic Capital writes;
- correction application;
- feedback persistence;
- final NBA;
- action execution.

Implementation should move from lowest risk to higher risk.

## 20. How to avoid opening write gates too early

Rules:

- never add persistence to a preview step;
- never mix read-only bridge and write logic;
- never hide write behavior behind user confirmation copy;
- never treat UI confirmation as DB write permission;
- never convert correction preview into applied correction without separate gate;
- never convert feedback preview into feedback row without separate gate;
- never convert candidate package into final NBA without separate gate;
- never execute external action from review UI without separate gate.

## 21. Recommended next implementation after C34-E

Recommended first real implementation after C34-E.5:

Track 0 — Implementation gate protocol.

Reason:

- before writing code, the project needs a repeatable gate format;
- current workflow already uses explicit confirmations;
- this should become a reusable development protocol;
- it reduces risk of accidental SQL/DB/UI/write work.

Second recommended implementation:

Track 1 — Shared contract types.

Third recommended implementation:

Track 2 — Fixture package.

Fourth recommended implementation:

Track 3 — No-write adapter.

Only after that should UI or routes be considered.

## 22. C34-E.3 acceptance criteria

C34-E.3 is complete when:

- implementation gate candidates are documented;
- no-write-first strategy is documented;
- priority order is documented;
- Track 0 through Track 10 are documented;
- deferred tracks are listed;
- gate requirements by track are documented;
- pre-coding verification is documented;
- risk order is documented;
- write-gate delay rules are documented;
- C34-E.4 can define anti-regression / anti-retest / final safety checklist.

## 23. Next step

C34-E.4 — Anti-regression / anti-retest / final safety checklist.

C34-E.4 should define:

- final checklist before closing Semantic Block readiness;
- what must not regress;
- what checks are already complete;
- what checks to repeat only after changes;
- final no-write safety checklist;
- commit/push and implementation safety rules.

## 24. Final status

C34-E.3 is documentation-only.

No runtime changes.  
No React component.  
No page creation.  
No click handlers.  
No fixture files.  
No TypeScript implementation.  
No route creation.  
No adapter creation.  
No UI adapter implementation.  
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
No audit row writes.  
No correction row writes.  
No feedback row writes.  
No applied correction.  
No production analytics.  
No production recommendation.  
No final Next Best Action.  
No action execution.  
No medical diagnosis.  
No financial advice.  
No productivity truth.
