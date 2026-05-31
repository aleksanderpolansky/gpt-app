# C34-D.3 — User Interaction Flow, Confirmation and Correction UX Contract

Дата: 31.05.2026  
Статус: documentation contract / no runtime changes  
Ветка: C34-D — Review UI / Workspace integration MVP  
Шаг: 3 из 5  

## 1. Назначение

Этот документ фиксирует контракт будущих user interaction flows для Review UI / Workspace MVP.

C34-D.3 НЕ реализует UI.  
C34-D.3 НЕ создаёт React component.  
C34-D.3 НЕ создаёт page.  
C34-D.3 НЕ создаёт click handlers.  
C34-D.3 НЕ создаёт runtime route.  
C34-D.3 НЕ создаёт TypeScript adapter.  
C34-D.3 НЕ выполняет SQL.  
C34-D.3 НЕ читает и не пишет DB.  
C34-D.3 НЕ создаёт Value Objects, State Facts, State Deltas, State Snapshots or Semantic Capital.  
C34-D.3 НЕ создаёт audit rows, correction rows or feedback rows.  
C34-D.3 НЕ применяет correction.  
C34-D.3 НЕ создаёт final Next Best Action.  
C34-D.3 НЕ выполняет action.

Цель шага — описать, как пользователь должен выбирать направление, подтверждать или отклонять кандидаты, редактировать preview, просматривать evidence/audit, работать с correction candidates и feedback previews без side effects.

## 2. Связь с C34-D.1 и C34-D.2

C34-D.1 зафиксировал:

- Review UI is preview-first workspace.
- UI is not truth.
- User choice is required.
- User confirmation is required.
- Candidate is not final NBA.
- Correction candidate is not applied correction.
- Feedback preview is not feedback row.
- No hidden writes.

C34-D.2 зафиксировал:

- WorkspaceReviewScreenModel.
- DirectionReviewBlockData.
- CandidateReviewBlockData.
- AnalyticsSummaryBlockData.
- SemanticCapitalPreviewBlockData.
- AuditCorrectionFeedbackBlockData.
- Evidence drawer model.
- WorkspaceUserActionModel.
- Display copy requirements.
- Empty / partial states.
- No-write boundary.

C34-D.3 развивает только interaction flow and UX confirmation contract.

## 3. Главная UX-граница

Будущий workspace должен вести пользователя по цепочке:

1. посмотреть preview;
2. понять неопределённость;
3. выбрать направление;
4. просмотреть кандидаты;
5. подтвердить, отклонить, отредактировать или запросить альтернативы;
6. просмотреть evidence/audit;
7. рассмотреть correction candidates;
8. оставить feedback preview;
9. увидеть, что ничего не было записано;
10. не получить автоматическое выполнение действия.

UX не должен превращать preview в выполнение.

## 4. Interaction state model

TYPE WorkspaceInteractionState:
- interactionId?: string
- screenMode:
  - semantic_review_preview
  - direction_choice_required
  - direction_selected
  - candidate_review
  - candidate_confirmation_required
  - correction_review
  - feedback_preview
  - blocked
- selectedDirectionKey?: string
- selectedCandidateKey?: string
- activeCorrectionCandidateKey?: string
- activeFeedbackPreviewKey?: string
- activeDrawer?:
  - evidence
  - audit
  - correction
  - semantic_capital_details
  - none
- pendingConfirmation?: ConfirmationPromptModel
- warnings?: WorkspaceWarningModel[]
- blockers?: WorkspaceBlockerModel[]
- noWrite: true

Rules:

- interaction state is UI/workflow state only.
- it is not persisted in C34-D.3.
- selectedDirectionKey does not create State Fact.
- selectedCandidateKey does not create final NBA.
- pendingConfirmation does not execute action.

## 5. Direction choice flow

Flow name:

direction_choice_flow

Steps:

1. UI shows ranked directions.
2. UI states: top rank is not auto-selected.
3. UI shows uncertainty and evidence link.
4. User chooses one direction, rejects all, or requests alternatives.
5. If user chooses direction, UI unlocks candidate preview for that direction.
6. If user rejects all, UI shows alternatives/review-needed state.
7. If user requests alternatives, UI stays no-write and asks for preference/context.

Allowed user actions:

- select_direction
- reject_direction
- request_alternatives
- open_evidence
- cancel

Forbidden:

- auto-select top-ranked direction;
- silently create final NBA;
- write selected direction to DB;
- treat direction choice as State Fact;
- hide uncertainty.

## 6. Direction choice confirmation model

TYPE DirectionChoiceInteraction:
- directionKey: string
- action:
  - select_direction
  - reject_direction
  - request_alternatives
- confirmationRequired?: boolean
- confirmationText?: string
- resultState:
  - direction_selected
  - user_rejected_all
  - alternatives_requested
  - cancelled
- noWrite: true

Default:

- select_direction does not require heavy confirmation if clearly preview-only;
- reject_direction does not require heavy confirmation;
- request_alternatives does not require heavy confirmation;
- all remain no-write.

UX copy:

Allowed:

- "Use this direction for candidate preview."
- "Show candidates for this direction."
- "Reject this direction for now."
- "Request alternatives."

Forbidden:

- "Save this direction."
- "This is now your priority."
- "Start action."
- "Create Next Best Action."

## 7. Candidate confirmation flow

Flow name:

candidate_confirmation_flow

Steps:

1. UI shows candidate package for selected direction.
2. Each candidate shows why it may fit and why it may not fit.
3. User chooses accept preview, reject, edit, postpone or request alternative.
4. If user chooses accept preview, UI must show confirmation prompt.
5. Confirmation prompt must state no action will be executed in C34-D preview.
6. If confirmed, UI marks candidate as selected preview only.
7. UI may generate feedback preview but must not write feedback.
8. UI keeps no-write footer visible.

Allowed user actions:

- accept_candidate_preview
- reject_candidate_preview
- edit_candidate_preview
- postpone_candidate_preview
- request_alternative
- open_evidence
- open_audit
- cancel

Forbidden:

- execute candidate;
- create final NBA;
- write candidate acceptance to DB;
- schedule task/calendar/email;
- create State Fact / Delta / Snapshot;
- create Semantic Capital;
- treat rejection as failure.

## 8. Candidate confirmation prompt model

TYPE CandidateConfirmationPromptModel:
- promptType: candidate_confirmation
- candidateKey: string
- title: string
- message: string
- confirmationRequired: true
- confirmsPreviewOnly: true
- primaryActionLabel: string
- secondaryActionLabel?: string
- cancelActionLabel?: string
- safetyNotes?: string[]
- noWrite: true

Required message meaning:

- candidate is not final NBA;
- confirmation does not execute action;
- no DB write happens;
- user can still edit or cancel.

Allowed primary labels:

- "Confirm preview selection"
- "Use as selected preview"
- "Keep this candidate for review"

Forbidden primary labels:

- "Do it now"
- "Execute"
- "Save to state"
- "Create final NBA"
- "Apply action"

## 9. Candidate edit flow

Flow name:

candidate_edit_flow

Steps:

1. User opens edit candidate preview.
2. UI shows editable fields such as title, duration, load, notes.
3. UI labels changes as preview edits only.
4. User can save preview edit, cancel, or request alternative.
5. Saving preview edit updates local preview state only.
6. No DB write occurs.
7. No correction row is written.

Editable preview fields may include:

- title;
- estimated duration;
- estimated load;
- user note;
- why it may fit;
- why it may not fit;
- missing context note.

Forbidden:

- mutate persisted candidate;
- mutate activity;
- write correction;
- write feedback;
- create audit row.

## 10. Candidate edit model

TYPE CandidatePreviewEditModel:
- candidateKey: string
- editableFields:
  - title
  - estimatedDurationMinutes
  - estimatedLoad
  - userNote
  - whyThisMayFit
  - whyThisMayNotFit
  - missingContext
- editedValues?: Record<string, string>
- editStatus:
  - not_started
  - editing
  - preview_saved
  - cancelled
- noWrite: true

Rules:

- preview_saved is local UI state.
- preview_saved is not DB persistence.
- edited candidate is not final NBA.
- edited values may later become feedback/correction only after future gate.

## 11. Candidate reject flow

Flow name:

candidate_reject_flow

Steps:

1. User rejects candidate.
2. UI may ask optional reason.
3. UI records rejection as feedback preview only.
4. UI may suggest alternative candidate.
5. UI must not penalize user.
6. UI must not write feedback row.
7. UI must not create negative Semantic Capital.

Optional rejection reasons:

- not_relevant
- too_hard_now
- too_easy
- wrong_context
- not_enough_time
- low_energy
- unsafe_or_uncomfortable
- already_done
- unclear
- other

Allowed copy:

- "Thanks, this helps improve the preview."
- "This rejection is feedback, not failure."
- "No changes were written."

Forbidden copy:

- "You failed this action."
- "Negative score applied."
- "Feedback saved."
- "Semantic Capital decreased."

## 12. Candidate reject model

TYPE CandidateRejectPreviewModel:
- candidateKey: string
- rejectionReason?:
  - not_relevant
  - too_hard_now
  - too_easy
  - wrong_context
  - not_enough_time
  - low_energy
  - unsafe_or_uncomfortable
  - already_done
  - unclear
  - other
- userComment?: string
- createsFeedbackPreview?: boolean
- createsCorrectionCandidatePreview?: boolean
- noWrite: true

Rules:

- createsFeedbackPreview is preview only.
- createsCorrectionCandidatePreview is preview only.
- no feedback row write.
- no correction row write.
- no Semantic Capital write.

## 13. Correction review flow

Flow name:

correction_review_flow

Steps:

1. UI shows correction candidates.
2. UI explains correction candidate is not applied correction.
3. User opens candidate details.
4. UI shows current value, proposed value, reason and evidence.
5. User can accept correction preview, reject correction preview, request change, or cancel.
6. Accepting correction preview does not apply correction in C34-D planning.
7. Future applied correction requires separate write gate.

Allowed user actions:

- review_correction_candidate
- accept_correction_preview
- reject_correction_preview
- open_evidence
- open_audit
- cancel

Forbidden:

- apply correction;
- mutate category;
- mutate activity duration;
- shift timeline;
- write correction row;
- create State Delta;
- recalculate aggregates.

## 14. Correction confirmation prompt model

TYPE CorrectionConfirmationPromptModel:
- promptType: correction_preview_confirmation
- correctionCandidateKey: string
- targetType: string
- proposedChangeType: string
- currentValue?: string
- proposedValue?: string
- message: string
- confirmationRequired: true
- confirmsPreviewOnly: true
- noWrite: true

Required message meaning:

- accepting preview does not apply correction;
- applied correction requires future gate;
- no DB write happens;
- user can cancel.

Allowed labels:

- "Accept correction preview"
- "Keep for later review"
- "Reject correction preview"
- "Cancel"

Forbidden labels:

- "Apply correction"
- "Save correction"
- "Write change"
- "Fix timeline now"

## 15. Feedback preview flow

Flow name:

feedback_preview_flow

Steps:

1. User gives feedback on candidate, explanation, category, direction or summary.
2. UI labels feedback as preview unless write gate is open.
3. UI may show interpreted effect.
4. User can edit or cancel feedback preview.
5. UI does not write feedback row.
6. Feedback does not automatically create Semantic Capital.

Feedback types:

- useful_explanation
- wrong_explanation
- accepted_candidate
- rejected_candidate
- edited_candidate
- confirmed_category
- rejected_category
- privacy_issue
- manual_note
- other

Forbidden:

- save feedback silently;
- update scores;
- create Semantic Capital;
- create State Fact;
- mutate user profile;
- hide feedback interpretation.

## 16. Feedback preview model

TYPE FeedbackPreviewInteractionModel:
- feedbackPreviewKey?: string
- feedbackType:
  - useful_explanation
  - wrong_explanation
  - accepted_candidate
  - rejected_candidate
  - edited_candidate
  - confirmed_category
  - rejected_category
  - privacy_issue
  - manual_note
  - other
- targetType:
  - direction
  - candidate
  - explanation
  - category
  - analytics_summary
  - semantic_capital_preview
  - state_hook
  - other
- targetKey?: string
- userComment?: string
- interpretedEffect?: string[]
- feedbackStatus:
  - draft
  - preview_ready
  - cancelled
- noWrite: true

Rules:

- feedback preview is not feedback row.
- interpreted effect is not score mutation.
- feedback can later inform scoring only after future gate.

## 17. Evidence / audit drawer flow

Flow name:

evidence_audit_drawer_flow

Steps:

1. User opens evidence or audit drawer.
2. UI shows labeled evidence.
3. System estimates are visibly labeled.
4. Sensitive evidence is hidden or summarized according to display policy.
5. User can close drawer or open related review item.
6. Opening drawer does not read DB in C34-D.3.
7. Opening drawer does not write audit row.

Forbidden:

- silently fetch DB;
- reveal sensitive details in public/internal scope;
- treat evidence as truth;
- write audit row;
- mutate confidence.

## 18. Disabled states

Disabled actions must be explicit.

TYPE WorkspaceDisabledStateModel:
- actionType: string
- disabled: true
- disabledReason:
  - user_choice_required
  - confirmation_required
  - insufficient_evidence
  - privacy_scope_mismatch
  - unsafe_claim_risk
  - write_gate_closed
  - db_gate_closed
  - action_execution_gate_closed
  - unresolved_concepts_too_high
  - no_safe_candidate_available
  - other
- userVisibleMessage: string
- noWrite: true

Rules:

- disabled reason must be visible.
- disabled state must not be bypassed by UI.
- disabled execution-like actions stay disabled until future gate.
- disabled state is not error by itself.

## 19. Confirmation wording requirements

All confirmation prompts must state:

- what is being confirmed;
- whether this is preview-only;
- whether anything will be written;
- whether action will be executed;
- what happens next;
- how to cancel.

Required wording fragments:

- "Preview only."
- "No changes will be written."
- "This does not execute the action."
- "You can cancel."

Forbidden wording fragments:

- "Saved."
- "Applied."
- "Executed."
- "Final action created."
- "State updated."
- "Semantic Capital written."

## 20. No-write interaction behavior

Every interaction in C34-D.3 must preserve:

- noSqlExecuted: true
- noDbReadExecuted: true
- noDbWriteExecuted: true
- noRouteCreatedInThisStep: true
- noAdapterCreatedInThisStep: true
- noReactComponentCreated: true
- noPageCreated: true
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

## 21. Interaction package model

TYPE WorkspaceInteractionFlowPackage:
- interactionState: WorkspaceInteractionState
- directionChoiceFlow?: DirectionChoiceInteraction
- candidateConfirmationPrompt?: CandidateConfirmationPromptModel
- candidateEdit?: CandidatePreviewEditModel
- candidateReject?: CandidateRejectPreviewModel
- correctionConfirmationPrompt?: CorrectionConfirmationPromptModel
- feedbackPreview?: FeedbackPreviewInteractionModel
- disabledStates?: WorkspaceDisabledStateModel[]
- warnings?: WorkspaceWarningModel[]
- blockers?: WorkspaceBlockerModel[]
- noWrite: true

Rules:

- package is not persisted.
- package does not create final NBA.
- package does not execute action.
- package does not apply correction.
- package does not write feedback.

## 22. Future implementation gate requirements

Before real interaction implementation, a separate gate must define:

- exact UI component/page paths;
- exact local state model;
- exact event handlers;
- exact modal copy;
- exact disabled states;
- whether fixture data is used;
- whether API route is called;
- whether DB reads are allowed;
- whether DB writes are allowed;
- how no-write behavior is tested;
- how confirmation flows are tested;
- npm/typecheck/test commands;
- commit/push gate.

C34-D.3 does not open implementation gate.

## 23. No-write boundary

C34-D.3 output is planning-only.

Forbidden side effects:

- no React component creation;
- no page creation;
- no click handler creation;
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

## 24. Acceptance criteria for C34-D.3

C34-D.3 is complete when:

- WorkspaceInteractionState is documented.
- Direction choice flow is documented.
- Candidate confirmation flow is documented.
- Candidate edit flow is documented.
- Candidate reject flow is documented.
- Correction review flow is documented.
- Feedback preview flow is documented.
- Evidence/audit drawer flow is documented.
- Disabled states are documented.
- Confirmation wording requirements are documented.
- No-write interaction behavior is documented.
- WorkspaceInteractionFlowPackage is documented.
- No-write boundary is preserved.
- C34-D.4 can define no-write UI integration adapter / fixture contract.

## 25. Next step

C34-D.4 — No-write UI integration adapter / fixture contract.

C34-D.4 should define:

- future UI fixture package;
- adapter boundary;
- mock preview data;
- no-write test expectations;
- disabled action fixtures;
- preview-only interaction fixtures;
- implementation gate requirements.

## 26. Final status

C34-D.3 is documentation-only.

No runtime changes.  
No React component.  
No page creation.  
No click handlers.  
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
