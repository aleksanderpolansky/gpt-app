# C34-D.4 — No-write UI Integration Adapter / Fixture Contract

Дата: 31.05.2026  
Статус: documentation contract / no runtime changes  
Ветка: C34-D — Review UI / Workspace integration MVP  
Шаг: 4 из 5  

## 1. Назначение

Этот документ фиксирует контракт будущего no-write UI integration adapter / fixture layer.

C34-D.4 НЕ реализует UI.  
C34-D.4 НЕ создаёт React component.  
C34-D.4 НЕ создаёт page.  
C34-D.4 НЕ создаёт click handlers.  
C34-D.4 НЕ создаёт runtime route.  
C34-D.4 НЕ создаёт TypeScript adapter.  
C34-D.4 НЕ создаёт fixture files.  
C34-D.4 НЕ выполняет SQL.  
C34-D.4 НЕ читает и не пишет DB.  
C34-D.4 НЕ создаёт Value Objects, State Facts, State Deltas, State Snapshots or Semantic Capital.  
C34-D.4 НЕ создаёт audit rows, correction rows or feedback rows.  
C34-D.4 НЕ применяет correction.  
C34-D.4 НЕ создаёт final Next Best Action.  
C34-D.4 НЕ выполняет action.

Цель шага — описать будущий безопасный слой, который сможет соединить Review UI с mock/fixture preview data и no-write interaction package без side effects.

## 2. Связь с C34-D.1–C34-D.3

C34-D.1 зафиксировал:

- Review UI is preview-first workspace.
- UI is not truth.
- User choice and confirmation are required.
- Evidence and uncertainty must be visible.
- No hidden writes.

C34-D.2 зафиксировал:

- WorkspaceReviewScreenModel.
- Workspace blocks and panels.
- Evidence drawer.
- Warning/blocker models.
- WorkspaceUserActionModel.
- Display copy requirements.
- Empty / partial states.

C34-D.3 зафиксировал:

- WorkspaceInteractionState.
- Direction choice flow.
- Candidate confirmation flow.
- Candidate edit/reject flow.
- Correction review flow.
- Feedback preview flow.
- Evidence/audit drawer flow.
- Disabled states.
- Confirmation wording requirements.
- No-write interaction behavior.

C34-D.4 развивает только future no-write UI adapter / fixture contract.

## 3. Главная граница C34-D.4

C34-D.4 отвечает на вопрос:

> "Как будущий UI сможет безопасно получить preview package, fixture data, disabled states and no-write interaction data без DB read/write и без production route?"

C34-D.4 НЕ отвечает на вопрос:

> "Как реализовать React-компонент или endpoint?"

C34-D.4 должен сохранить:

- fixture-first testing possibility;
- no-write adapter boundary;
- no DB reads;
- no DB writes;
- no runtime route creation;
- no UI implementation;
- visible safety flags;
- disabled execution-like actions;
- user confirmation boundary;
- no hidden writes.

## 4. Future adapter candidate

Future adapter candidate name:

reviewWorkspaceNoWriteAdapterV0

Future file candidate:

lib/activity/reviewWorkspace/reviewWorkspaceNoWriteAdapterV0.ts

This is only a contract proposal.

C34-D.4 does not create this adapter.

## 5. Future fixture package candidate

Future fixture package candidate name:

reviewWorkspacePreviewFixtureV0

Future file candidate:

lib/activity/reviewWorkspace/fixtures/reviewWorkspacePreviewFixtureV0.ts

This is only a contract proposal.

C34-D.4 does not create fixture files.

## 6. Future UI integration mode

Future UI integration mode:

review_workspace_no_write_fixture_v0

Expected behavior:

- accepts local fixture input;
- returns WorkspaceReviewScreenModel;
- returns WorkspaceInteractionFlowPackage;
- returns NoWriteSafetyFooterModel;
- returns disabled execution-like actions;
- returns warnings/blockers;
- does not fetch DB;
- does not write DB;
- does not call runtime production routes;
- does not execute action.

## 7. Adapter input model

TYPE ReviewWorkspaceNoWriteAdapterInput:
- previewPackage?: ReviewWorkspacePreviewPackage
- screenModel?: WorkspaceReviewScreenModel
- interactionFlowPackage?: WorkspaceInteractionFlowPackage
- fixtures?: ReviewWorkspaceFixturePackage
- options?: ReviewWorkspaceAdapterOptions

TYPE ReviewWorkspaceAdapterOptions:
- mode:
  - review_workspace_no_write_fixture_v0
- explanationMode?: compact | full
- privacyMode?: public | internal | private | sensitive
- includeEvidenceDrawer?: boolean
- includeAuditDrawer?: boolean
- includeSemanticCapitalPreview?: boolean
- includeDisabledActions?: boolean
- noWrite?: true

Rules:

- noWrite must be true.
- mode must be fixture/no-write mode.
- missing preview data must create empty/partial states.
- adapter input must not require DB.
- adapter input must not create persistence.

## 8. Fixture package model

TYPE ReviewWorkspaceFixturePackage:
- fixtureId?: string
- fixtureName: string
- fixtureScenario:
  - direction_choice_required
  - candidate_review_ready
  - low_confidence_blocked
  - correction_review_ready
  - feedback_preview_ready
  - semantic_capital_preview_ready
  - privacy_restricted
  - empty_state
  - full_demo
- directionFixtures?: DirectionReviewBlockData
- candidateFixtures?: CandidateReviewBlockData
- analyticsFixtures?: AnalyticsSummaryBlockData
- semanticCapitalFixtures?: SemanticCapitalPreviewBlockData
- auditCorrectionFeedbackFixtures?: AuditCorrectionFeedbackBlockData
- evidenceDrawerFixtures?: WorkspaceEvidenceDrawerData
- uncertaintyFixtures?: WorkspaceUncertaintyPanelData
- disabledActionFixtures?: WorkspaceDisabledStateModel[]
- warningFixtures?: WorkspaceWarningModel[]
- blockerFixtures?: WorkspaceBlockerModel[]
- noWrite: true

Rules:

- fixture package is test/demo data.
- fixture package is not production data.
- fixture package is not DB seed.
- fixture package must not be treated as persisted state.
- fixture package must include noWrite: true.

## 9. Adapter output model

TYPE ReviewWorkspaceNoWriteAdapterResult:
- ok: boolean
- mode: review_workspace_no_write_fixture_v0
- screen: WorkspaceReviewScreenModel
- interaction?: WorkspaceInteractionFlowPackage
- safety: ReviewWorkspaceAdapterSafetySummary
- warnings?: WorkspaceWarningModel[]
- blockers?: WorkspaceBlockerModel[]
- debug?: ReviewWorkspaceAdapterDebugSummary
- noWrite: true

Rules:

- output is preview-only.
- output is not persisted.
- output is not final NBA.
- output does not execute action.
- blockers must disable execution-like UI.
- safety summary must be present.

## 10. Adapter safety summary

TYPE ReviewWorkspaceAdapterSafetySummary:
- noSqlExecuted: true
- noDbReadExecuted: true
- noDbWriteExecuted: true
- noMigrationCreated: true
- noRouteCreatedInThisStep: true
- noAdapterCreatedInThisStep: true
- noReactComponentCreatedInThisStep: true
- noPageCreatedInThisStep: true
- noClickHandlersCreatedInThisStep: true
- noStateFactCreated: true
- noStateDeltaCreated: true
- noStateSnapshotCreated: true
- noValueObjectCreated: true
- noSemanticCapitalWritten: true
- noAuditRowWritten: true
- noCorrectionRowWritten: true
- noFeedbackRowWritten: true
- noAppliedCorrectionCreated: true
- noFinalNextBestActionCreated: true
- noActionExecuted: true
- noMedicalDiagnosisCreated: true
- noFinancialAdviceCreated: true
- noProductivityTruthCreated: true

## 11. Adapter debug summary

TYPE ReviewWorkspaceAdapterDebugSummary:
- fixtureScenario?: string
- inputBlocksCount?: number
- outputBlocksCount?: number
- disabledActionsCount?: number
- warningsCount?: number
- blockersCount?: number
- emptyStatesCount?: number
- evidenceDrawerIncluded?: boolean
- auditDrawerIncluded?: boolean
- noWriteModeVerified?: boolean

Rules:

- debug summary is optional.
- debug summary must not expose sensitive data.
- debug summary is not audit row.
- debug summary is not persisted.

## 12. Required fixture scenarios

Future fixtures should include at least:

1. direction_choice_required.
2. candidate_review_ready.
3. low_confidence_blocked.
4. correction_review_ready.
5. feedback_preview_ready.
6. semantic_capital_preview_ready.
7. privacy_restricted.
8. empty_state.
9. full_demo.

C34-D.4 does not create these fixtures.

## 13. direction_choice_required fixture

Purpose:

- verify top-ranked direction is not auto-selected;
- verify user_choice_required blocker/warning;
- verify candidate package remains unavailable;
- verify no-write strip is visible.

Expected UI state:

- screenMode: direction_choice_required;
- direction block ready;
- candidate block status: not_available_user_choice_required;
- select_direction action enabled;
- final NBA actions disabled;
- noWrite: true.

Forbidden:

- auto-select direction;
- show final action;
- hide uncertainty.

## 14. candidate_review_ready fixture

Purpose:

- verify selected direction unlocks candidate preview;
- verify candidates remain candidates;
- verify confirmation is required;
- verify accept action does not execute.

Expected UI state:

- screenMode: candidate_review;
- selectedDirectionKey present;
- candidates visible;
- accept_candidate_preview enabled;
- action execution disabled;
- candidate confirmation prompt available;
- noWrite: true.

Forbidden:

- execute candidate;
- create final NBA;
- write acceptance.

## 15. low_confidence_blocked fixture

Purpose:

- verify low confidence blocks strong claims;
- verify unresolved concepts are visible;
- verify blockers disable execution-like actions.

Expected UI state:

- screenMode: blocked;
- uncertainty panel visible;
- blockers visible;
- candidate accept disabled if unsafe;
- evidence drawer available if safe;
- noWrite: true.

Forbidden:

- hide blockers;
- visually disguise low confidence;
- suggest execution.

## 16. correction_review_ready fixture

Purpose:

- verify correction candidates can be reviewed;
- verify accepting correction preview does not apply correction;
- verify applied correction remains gated.

Expected UI state:

- correction candidates visible;
- current/proposed values visible;
- accept_correction_preview action enabled as preview only;
- apply correction action absent or disabled;
- noWrite: true.

Forbidden:

- write correction row;
- mutate category/activity;
- create State Delta;
- recalculate aggregates.

## 17. feedback_preview_ready fixture

Purpose:

- verify feedback preview is visible;
- verify feedback is not saved;
- verify interpreted effect is preview-only.

Expected UI state:

- feedback preview card visible;
- edit/cancel feedback preview actions available;
- feedback save action absent or disabled;
- noWrite: true.

Forbidden:

- write feedback row;
- update score;
- create Semantic Capital.

## 18. semantic_capital_preview_ready fixture

Purpose:

- verify Semantic Capital is shown as preview;
- verify it is not money, points or productivity truth;
- verify no Semantic Capital write occurs.

Expected UI state:

- Semantic Capital preview card visible;
- scoreBand visible as preview;
- confidence visible;
- warning semantic_capital_not_written visible;
- noWrite: true.

Forbidden:

- show points balance;
- show money value;
- show productivity truth;
- write Semantic Capital.

## 19. privacy_restricted fixture

Purpose:

- verify sensitive details are hidden or summarized;
- verify privacy warnings appear;
- verify evidence drawer respects displayPolicy.

Expected UI state:

- sensitive evidence hidden or summary-only;
- privacy notice visible;
- public/internal output does not reveal sensitive details;
- noWrite: true.

Forbidden:

- leak sensitive details;
- expose hidden evidence;
- use hidden details for public strong claims.

## 20. empty_state fixture

Purpose:

- verify empty states explain missing preview data;
- verify UI does not invent missing data;
- verify no DB fetch happens.

Expected UI state:

- no preview package available message;
- direction/candidate/analytics empty states visible as needed;
- no silent DB fetch;
- noWrite: true.

Forbidden:

- invent preview data;
- fetch DB silently;
- show misleading readiness.

## 21. full_demo fixture

Purpose:

- demonstrate complete review workspace with all panels.

Expected UI state:

- no-write strip visible;
- direction block visible;
- candidate block visible;
- analytics summary visible;
- Semantic Capital preview visible;
- audit/correction/feedback block visible;
- evidence drawer available;
- uncertainty visible;
- disabled execution-like actions visible;
- noWrite: true.

Forbidden:

- production execution;
- persistence;
- final NBA creation.

## 22. Disabled action fixture requirements

TYPE DisabledActionFixture:
- actionType:
  - execute_action
  - create_final_nba
  - save_to_state
  - apply_correction
  - write_feedback
  - write_semantic_capital
  - create_value_object
  - create_state_fact
  - other
- disabledReason:
  - write_gate_closed
  - action_execution_gate_closed
  - final_nba_gate_closed
  - db_gate_closed
  - unsafe_claim_risk
  - user_confirmation_required
  - privacy_scope_mismatch
  - other
- userVisibleMessage: string
- expectedEnabled: false
- noWrite: true

Rules:

- execution-like actions must be disabled or absent.
- disabled reason must be visible.
- disabled actions are test expectations.
- disabled actions do not imply implementation.

## 23. Preview-only interaction fixture requirements

TYPE PreviewOnlyInteractionFixture:
- interactionType:
  - select_direction
  - accept_candidate_preview
  - reject_candidate_preview
  - edit_candidate_preview
  - accept_correction_preview
  - provide_feedback_preview
  - open_evidence
  - open_audit
- expectedLocalStateChange?: string
- expectedPersistence: false
- expectedDbRead: false
- expectedDbWrite: false
- expectedActionExecution: false
- noWrite: true

Rules:

- local state changes may happen in future UI implementation.
- persistence remains false in no-write mode.
- opening evidence/audit does not read DB in fixture mode.
- accepting preview does not execute action.

## 24. No-write test expectations

Future no-write tests should verify:

- adapter output includes noWrite true;
- no SQL is executed;
- no DB read is executed;
- no DB write is executed;
- no route is created by fixture mode;
- no React component is created by this planning step;
- no State Fact / Delta / Snapshot is created;
- no Value Object is created;
- no Semantic Capital is written;
- no audit row is written;
- no correction row is written;
- no feedback row is written;
- no applied correction is created;
- no final NBA is created;
- no action is executed;
- disabled execution-like actions remain disabled;
- user choice is required before direction-specific candidates;
- confirmation is required for candidate preview acceptance;
- correction acceptance remains preview-only;
- feedback remains preview-only;
- privacy fixture hides sensitive details.

C34-D.4 does not create tests.

## 25. Adapter responsibility boundary

Future adapter may:

- convert fixture package into WorkspaceReviewScreenModel;
- attach no-write safety summary;
- attach disabled action fixtures;
- attach warnings and blockers;
- attach empty/partial states;
- attach drawer references;
- attach interaction flow package;
- normalize display labels;
- ensure forbidden copy is absent.

Future adapter must not:

- import DB clients;
- call Supabase;
- fetch persisted activity;
- call production analytics;
- call production NBA route;
- write anything;
- execute action;
- create route;
- create final NBA.

## 26. Copy safety expectations

Future adapter / fixture validation should reject or warn on forbidden copy:

Forbidden examples:

- "This is the best action."
- "Do this now."
- "Saved to your state."
- "Semantic Capital increased."
- "Points created."
- "Correction applied."
- "Feedback saved."
- "Action executed."
- "Final NBA created."

Allowed examples:

- "Preview only."
- "Requires your choice."
- "Requires confirmation."
- "This candidate may fit."
- "This summary is based on available evidence."
- "No changes were written."

## 27. Future implementation gate requirements

Before real no-write UI adapter / fixture implementation, a separate gate must define:

- exact adapter file path;
- exact fixture file path;
- exact exported functions;
- exact TypeScript imports;
- exact relationship to existing types;
- whether implementation uses pure functions only;
- exact test file paths;
- exact fixture scenarios;
- exact npm/typecheck/test commands;
- whether app route/page imports fixture;
- whether DB imports are forbidden by lint/test;
- commit/push gate.

C34-D.4 does not open implementation gate.

## 28. No-write boundary

C34-D.4 output is planning-only.

Forbidden side effects:

- no React component creation;
- no page creation;
- no click handler creation;
- no fixture file creation;
- no TypeScript adapter creation;
- no SQL execution;
- no migration creation;
- no DB read;
- no DB write;
- no route creation;
- no adapter creation;
- no TypeScript implementation;
- no State Fact creation;
- no State Delta creation;
- no State Snapshot creation;
- no Value Object creation;
- no Semantic Capital write;
- no audit row write;
- no correction row write;
- no feedback row write;
- no applied correction;
- no final Next Best Action;
- no action execution.

## 29. Acceptance criteria for C34-D.4

C34-D.4 is complete when:

- future adapter candidate is documented;
- future fixture package candidate is documented;
- UI integration mode is documented;
- adapter input model is documented;
- fixture package model is documented;
- adapter output model is documented;
- safety summary is documented;
- debug summary is documented;
- required fixture scenarios are documented;
- disabled action fixture requirements are documented;
- preview-only interaction fixture requirements are documented;
- no-write test expectations are documented;
- adapter responsibility boundary is documented;
- copy safety expectations are documented;
- implementation gate requirements are documented;
- no-write boundary is preserved;
- C34-D.5 can close C34-D block.

## 30. Next step

C34-D.5 — Final lock and next branch decision.

C34-D.5 should summarize:

- C34-D.1 Review UI / Workspace boundary;
- C34-D.2 workspace screen blocks and panel data model;
- C34-D.3 user interaction and confirmation UX;
- C34-D.4 no-write UI integration adapter / fixture contract;
- gates that remain closed;
- decision whether to move to C34-E.

## 31. Final status

C34-D.4 is documentation-only.

No runtime changes.  
No React component.  
No page creation.  
No click handlers.  
No fixture files.  
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
No audit row writes.  
No correction row writes.  
No feedback row writes.  
No applied correction.  
No final Next Best Action.  
No action execution.
