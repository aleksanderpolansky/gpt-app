# C34-B.4 — No-write NBA Preview Route / Adapter Contract

Дата: 31.05.2026  
Статус: documentation contract / no runtime changes  
Ветка: C34-B — Weakest Direction + Next Best Action package  
Шаг: 4 из 5  

## 1. Назначение

Этот документ фиксирует контракт будущего no-write NBA preview route / adapter.

C34-B.4 НЕ реализует Weakest Direction engine.  
C34-B.4 НЕ реализует Next Best Action engine.  
C34-B.4 НЕ создаёт runtime route.  
C34-B.4 НЕ создаёт TypeScript adapter.  
C34-B.4 НЕ выполняет SQL.  
C34-B.4 НЕ читает и не пишет DB.  
C34-B.4 НЕ создаёт Value Objects, State Facts, State Deltas, State Snapshots or Semantic Capital.

Цель шага — описать безопасный будущий endpoint/adapter, который сможет вернуть preview-пакет направлений и action candidates без side effects.

## 2. Связь с C34-B.1–C34-B.3

C34-B.1 зафиксировал:

- Weakest Direction is not NBA.
- NBA preview is downstream of user-selected direction.
- User choice is required.
- Similarity/Relevance are supporting inputs only.
- No final Next Best Action is created.

C34-B.2 зафиксировал:

- weak direction ranking model;
- weakness score as planning signal;
- confidence separated from weakness score;
- ranking_is_preview;
- weakness_not_nba.

C34-B.3 зафиксировал:

- UserDirectionChoice model;
- DirectionSelectionState model;
- ActionCandidatePackage model;
- ActionCandidatePreview model;
- ActionCandidateConfirmation model;
- user_confirmation_required;
- candidate_not_final_nba.

C34-B.4 определяет будущую no-write route/adapter boundary для этих моделей.

## 3. Future route name

Future route candidate:

POST /api/activity/next-best-action/preview

Future route mode:

nba_preview_no_write_v0

This is only a contract proposal.

C34-B.4 does not create this route.

## 4. Future adapter name

Future adapter candidate:

nextBestActionPreviewAdapterV0

Future file candidate:

lib/activity/nextBestAction/nextBestActionPreviewAdapterV0.ts

This is only a contract proposal.

C34-B.4 does not create this adapter.

## 5. Main route purpose

The future preview route should answer:

- which directions currently look weaker;
- why these directions look weaker;
- whether user choice is required;
- which direction was selected by the user;
- which action candidates may fit the selected direction;
- why each candidate may fit;
- what reduces confidence;
- what requires confirmation;
- why this is not final NBA;
- why no writes were created.

The route must not:

- silently select a direction;
- silently choose an action;
- create final Next Best Action;
- create state facts;
- create Value Objects;
- write Semantic Capital;
- execute action;
- produce medical, financial or productivity truth.

## 6. Future request model

TYPE NbaPreviewRequest:
- rankingInput?: WeakDirectionRankingInput
- directionSelection?: DirectionSelectionState
- userChoice?: UserDirectionChoice
- candidatePackageInput?: ActionCandidatePackageInput
- options?:
  - includeRanking?: boolean
  - includeCandidatePackage?: boolean
  - requireUserChoice?: true
  - explanationMode?: compact | full
  - safetyMode?: normal | cautious | strict
  - dryRun?: true
  - privacyMode?: normal | cautious | strict

Rules:

- dryRun must be true.
- If dryRun is missing, adapter must treat it as true.
- requireUserChoice must be true.
- If userChoice is missing, route may return ranking and user_choice_required state only.
- ActionCandidatePackage must not be produced as selected-direction package unless userChoice is explicit.
- Missing context reduces confidence.
- Unresolved concepts reduce confidence or create blockers.
- No DB read is required.
- No write is allowed.

## 7. Future response model

TYPE NbaPreviewResponse:
- ok: boolean
- routeMode: nba_preview_no_write_v0
- noWrite: true
- ranking?: WeakDirectionRankingResult
- selectionState?: DirectionSelectionState
- candidatePackage?: ActionCandidatePackage
- warnings?: NbaPreviewWarning[]
- blockers?: NbaPreviewBlocker[]
- safety?: NbaPreviewSafetySummary
- debug?: NbaPreviewDebugSummary

The response must always include:

- noWrite: true
- routeMode
- explicit false write flags
- user choice status
- final NBA status
- safety summary

## 8. Required route-level statuses

TYPE NbaPreviewStatus:
- rankingStatus:
  - not_requested
  - ready
  - partial
  - blocked
- userChoiceStatus:
  - required
  - provided
  - rejected_all
  - alternatives_requested
- candidatePackageStatus:
  - not_requested
  - not_available_user_choice_required
  - ready
  - partial
  - blocked
  - review_needed
- finalNbaStatus:
  - not_created

Rules:

- finalNbaStatus must be not_created.
- If userChoiceStatus is required, candidatePackageStatus should be not_available_user_choice_required or partial.
- If blockers exist, response must not make strong candidate claims.

## 9. Explicit false write flags

Future response must include explicit false flags:

- sqlExecuted: false
- dbReadExecuted: false
- dbWriteExecuted: false
- migrationCreated: false
- routeCreatedByPreview: false
- adapterCreatedByPreview: false
- stateFactCreated: false
- stateDeltaCreated: false
- stateSnapshotCreated: false
- valueObjectCreated: false
- semanticCapitalWritten: false
- productionRecommendationCreated: false
- finalNextBestActionCreated: false
- actionExecuted: false
- medicalDiagnosisCreated: false
- financialAdviceCreated: false
- productivityTruthCreated: false

## 10. Safety summary

TYPE NbaPreviewSafetySummary:
- noSqlExecuted: true
- noDbReadExecuted: true
- noDbWriteExecuted: true
- noMigrationCreated: true
- noRouteCreatedInThisStep: true
- noAdapterCreatedInThisStep: true
- noStateFactCreated: true
- noStateDeltaCreated: true
- noStateSnapshotCreated: true
- noValueObjectCreated: true
- noSemanticCapitalWritten: true
- noProductionRecommendationCreated: true
- noFinalNextBestActionCreated: true
- noActionExecuted: true
- noMedicalDiagnosisCreated: true
- noFinancialAdviceCreated: true
- noProductivityTruthCreated: true
- userChoiceRequired: true
- userConfirmationRequired: true

## 11. Adapter responsibilities

The future adapter should:

1. Accept request payload.
2. Normalize ranking input.
3. Build WeakDirectionRankingResult in memory.
4. Build DirectionSelectionState.
5. Check whether user choice is explicit.
6. If user choice is missing, return user_choice_required.
7. If user choice is explicit, build ActionCandidatePackage in memory.
8. Attach warnings, blockers and safety summary.
9. Return explicit false write flags.
10. Return finalNbaStatus: not_created.

The future adapter must not:

- import server DB clients;
- call Supabase;
- read DB;
- write DB;
- call persistence service;
- create Value Object;
- create State Fact / Delta / Snapshot;
- write Semantic Capital;
- execute an action;
- send messages or emails;
- schedule calendar events;
- create production recommendation.

## 12. Data source boundary

Future preview route may accept data from:

- request payload;
- no-write similarity/relevance preview;
- no-write weak direction ranking draft;
- no-write activity capture review draft;
- no-write product semantic preview draft;
- local in-memory fixtures for tests;
- explicit manual user input.

Future route must not silently fetch private data from DB.

If DB read is later required, it needs a separate SELECT-only gate.

If DB write is later required, it needs a separate write gate.

## 13. User choice boundary

The route must preserve user agency.

Allowed:

- return ranked directions;
- ask user to choose direction;
- return candidate package after user choice;
- mark candidates as requiring confirmation;
- show alternatives;
- show low-confidence candidates if clearly marked.

Not allowed:

- treat top-ranked direction as selected automatically;
- create final NBA without explicit user confirmation;
- write action based on preview;
- hide uncertainty;
- convert preview into command.

## 14. Candidate package boundary

Candidate package may include:

- learning_action;
- recovery_action;
- work_action;
- family_action;
- commercial_action;
- admin_action;
- review_action;
- rest_action;
- other.

But each candidate must include:

- whyThisMayFit;
- whyThisMayNotFit or uncertainty;
- confidence;
- requiresConfirmation: true;
- noWrite: true.

## 15. Final NBA boundary

This route is not final NBA.

Allowed phrases:

- "This candidate may fit the selected direction."
- "This is a preview."
- "User confirmation is required."
- "Confidence is low because..."
- "This may be a safe review action before stronger action."

Forbidden phrases:

- "This is the best action."
- "Do this now."
- "The system has chosen this for you."
- "This will improve your health."
- "This is financially optimal."
- "This proves productivity."
- "This has been written to your state."
- "Final NBA created."

## 16. Relationship to C34-A

C34-A outputs may be used as support:

- Similarity may help find structurally related actions.
- Relevance may help evaluate contextual fit.

But:

- Similarity is not NBA.
- Relevance is not NBA.
- Similarity/Relevance cannot replace user choice.
- Similarity/Relevance cannot create final NBA.
- Similarity/Relevance cannot create writes.

## 17. Relationship to C34-B.2

Weak direction ranking may be used to show direction order.

But:

- Weakness score is not final truth.
- Weakness score does not choose action.
- Weakness score does not create final NBA.
- Weakness score must show uncertainty and confidence.
- User choice is still required.

## 18. Relationship to C34-B.3

ActionCandidatePackage may be returned only after explicit user choice, or as partial preview with user_choice_required.

Candidate package must preserve:

- candidate_not_final_nba;
- user_confirmation_required;
- no_write_mode;
- safety_caution_required;
- missing_context_reduces_confidence;
- unresolved_concepts_reduce_confidence.

## 19. Privacy boundary

Default privacy behavior:

- private input stays private;
- sensitive input requires cautious explanation;
- public output must not include private/sensitive details;
- health/family/finance signals require cautious wording;
- cross-user comparison is forbidden by default;
- organization context requires organization-approved boundary.

## 20. Unresolved concept boundary

If unresolved concepts are present:

- ranking confidence decreases;
- candidate confidence decreases;
- strong recommendation language is blocked;
- review_action may be preferred;
- external concepts must not become confirmed internal categories;
- unresolved concepts must not create hidden Value Objects.

## 21. State hook boundary

State hooks may influence ranking and candidate package.

But:

- State hook is not State Fact.
- State hook cannot create State Fact / Delta / Snapshot.
- Fatigue/stress/pain hooks require cautious language.
- No diagnosis.
- No medical advice.
- No hidden state writes.

## 22. Example request — no user choice yet

Input:

- includeRanking: true
- no userChoice
- available time: 20 minutes
- recent activity summary present
- state hook: fatigue_signal medium

Expected response:

- rankingStatus: ready or partial
- userChoiceStatus: required
- candidatePackageStatus: not_available_user_choice_required
- finalNbaStatus: not_created
- noWrite: true

Explanation:

- "Directions are shown as a preview."
- "Please choose a direction before candidate actions are packaged."
- "No final Next Best Action was created."

## 23. Example request — user selected languages

Input:

- userChoice selectedDirectionKey: languages
- available time: 20 minutes
- fatigue signal: medium
- goal: German job readiness

Expected response:

- userChoiceStatus: provided
- candidatePackageStatus: ready or partial
- candidate package includes language-related candidates
- all candidates require confirmation
- finalNbaStatus: not_created
- noWrite: true

Explanation:

- "The candidate package is based on your selected direction."
- "Passive German listening may fit the time window and fatigue signal."
- "This is not final NBA and requires confirmation."

## 24. Future test matrix

When implemented later, tests should verify:

- response includes noWrite true;
- all explicit write flags are false;
- no DB clients are imported;
- no persistence service is called;
- no route is treated as production recommendation;
- no final NBA is created;
- no action is executed;
- no State Fact / Delta / Snapshot is created;
- no Value Object is created;
- no Semantic Capital is written;
- userChoiceStatus is required when no user choice exists;
- candidatePackageStatus is not_available_user_choice_required without user choice;
- candidate package requires confirmation when user choice exists;
- high weakness score does not create final NBA;
- high candidate band does not create final NBA;
- unresolved concepts reduce confidence;
- safety claims remain cautious.

## 25. Implementation gate rules

Before future implementation, a separate implementation gate must define:

- exact route path;
- exact adapter file;
- exact TypeScript types;
- test cases;
- fixtures or mock data;
- explicit no DB import rule;
- whether any existing no-write service is imported;
- expected npm/typecheck/test commands;
- commit/push gate.

C34-B.4 does not open implementation gate.

## 26. Acceptance criteria for C34-B.4

C34-B.4 is complete when:

- future route name is documented;
- future adapter name is documented;
- request model is documented;
- response model is documented;
- explicit false write flags are documented;
- safety summary is documented;
- user choice boundary is documented;
- candidate package boundary is documented;
- final NBA boundary is documented;
- privacy/unresolved/state hook boundaries are documented;
- future test matrix is documented;
- no-write boundary is preserved;
- C34-B.5 can close C34-B block.

## 27. Next step

C34-B.5 — Final lock and next branch decision.

C34-B.5 should summarize:

- C34-B.1 boundary contract;
- C34-B.2 weak direction ranking model;
- C34-B.3 user choice + candidate package model;
- C34-B.4 no-write NBA preview route/adapter contract;
- gates that remain closed;
- decision whether to move to C34-C.

## 28. Final status

C34-B.4 is documentation-only.

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
No final Next Best Action.  
No action execution.
