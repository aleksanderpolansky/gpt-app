# C34-D.1 — Review UI / Workspace Integration MVP Boundary Contract

Дата: 31.05.2026  
Статус: documentation contract / no runtime changes  
Ветка: C34-D — Review UI / Workspace integration MVP  
Шаг: 1 из 5  

## 1. Назначение

Этот документ открывает блок C34-D.

C34-D.1 фиксирует базовые границы будущего Review UI / Workspace integration MVP.

C34-D должен описать, как результаты C34-A, C34-B и C34-C могут быть показаны пользователю в reviewable workspace без скрытых записей, без автоматического выполнения действий и без превращения preview в truth.

C34-D.1 НЕ реализует UI.  
C34-D.1 НЕ создаёт React component.  
C34-D.1 НЕ создаёт page.  
C34-D.1 НЕ создаёт runtime route.  
C34-D.1 НЕ создаёт TypeScript adapter.  
C34-D.1 НЕ выполняет SQL.  
C34-D.1 НЕ читает и не пишет DB.  
C34-D.1 НЕ создаёт Value Objects, State Facts, State Deltas, State Snapshots or Semantic Capital.  
C34-D.1 НЕ создаёт audit rows, correction rows or feedback rows.  
C34-D.1 НЕ создаёт final Next Best Action.  
C34-D.1 НЕ выполняет action.

## 2. Контекст после C34-A, C34-B, C34-C

C34-A закрыл planning layer для Similarity/Relevance:

- Similarity is not Relevance.
- Similarity is not NBA.
- Relevance is not NBA.
- Similarity/Relevance do not create writes.

C34-B закрыл planning layer для Weakest Direction / NBA package:

- Weakest Direction is not NBA.
- User choice is required.
- Candidate package is not final NBA.
- User confirmation is required.
- No final Next Best Action is created.

C34-C закрыл planning layer для Analytics / Semantic Capital / Audit:

- Analytics is not truth.
- Semantic Capital is planning signal.
- Semantic Capital is not money, points or productivity truth.
- Audit is explainable record.
- Correction candidate is not applied correction.
- Feedback is not automatically Semantic Capital.
- No hidden writes.

C34-D должен определить, как всё это безопасно показать в UI/workspace.

## 3. Главная граница C34-D

C34-D отвечает на вопрос:

> "Как пользователь должен видеть, проверять, выбирать, подтверждать, отклонять и корректировать semantic previews?"

C34-D НЕ отвечает на вопрос:

> "Как автоматически выполнить действие или записать результат?"

C34-D должен сохранить:

- preview-first UX;
- user choice;
- user confirmation;
- visible uncertainty;
- visible evidence;
- visible warnings/blockers;
- no hidden writes;
- no automatic final NBA;
- no action execution.

## 4. Review UI — definition

Review UI means a user-facing workspace where semantic previews are displayed as reviewable, explainable and reversible-looking information.

Review UI may show:

- ranked directions;
- selected direction;
- action candidate packages;
- analytics summary;
- evidence trail;
- uncertainty summary;
- Semantic Capital preview;
- audit trail preview;
- correction candidates;
- feedback previews;
- safety warnings;
- blockers;
- no-write status.

Review UI must not silently write anything.

## 5. Workspace integration — definition

Workspace integration means connecting semantic preview outputs to visible workspace blocks/panels.

Workspace integration may later include:

- dashboard block;
- review panel;
- candidate cards;
- evidence drawer;
- uncertainty banner;
- correction review panel;
- feedback buttons;
- confirmation modal;
- audit trail drawer;
- no-write safety footer.

C34-D.1 only defines the contract.

No UI implementation is created in this step.

## 6. UI is not truth

UI is not truth.

A displayed score, rank, candidate, summary or semantic-capital preview must not be presented as objective fact.

Rules:

- ranked direction is a preview;
- weakness score is not truth;
- candidate package is not final NBA;
- analytics summary is not truth;
- Semantic Capital preview is not money/points/productivity truth;
- correction candidate is not applied correction;
- feedback preview is not written feedback;
- no final action is executed.

## 7. Primary user flow

Future Review UI should follow this safe flow:

1. Show semantic preview package.
2. Show uncertainty and evidence.
3. Ask user to choose a direction if needed.
4. Show action candidates only as candidates.
5. Ask user to confirm, reject, edit or request alternatives.
6. Show correction candidates as review items.
7. Show feedback as preview unless a write gate is opened later.
8. Keep no-write state visible.
9. Never execute action automatically.

## 8. Required user agency boundary

Allowed:

- user chooses direction;
- user rejects top-ranked direction;
- user selects action candidate;
- user edits candidate;
- user rejects candidate;
- user requests alternatives;
- user opens evidence;
- user opens audit trail;
- user reviews correction candidate;
- user gives feedback;
- user cancels.

Not allowed:

- system silently selects direction;
- system silently chooses action;
- UI hides uncertainty;
- UI hides no-write status;
- UI treats preview as completed action;
- UI writes correction automatically;
- UI writes feedback automatically;
- UI creates final NBA automatically.

## 9. Review workspace package

TYPE ReviewWorkspacePreviewPackage:
- packageId?: string
- packageStatus:
  - ready
  - partial
  - blocked
  - user_choice_required
  - review_needed
- directionReview?: DirectionReviewPanelModel
- candidateReview?: CandidateReviewPanelModel
- analyticsReview?: AnalyticsReviewPanelModel
- semanticCapitalReview?: SemanticCapitalReviewPanelModel
- auditCorrectionFeedbackReview?: AuditCorrectionFeedbackReviewPanelModel
- warnings?: ReviewWorkspaceWarning[]
- blockers?: ReviewWorkspaceBlocker[]
- safety?: ReviewWorkspaceSafetySummary
- noWrite: true

ReviewWorkspacePreviewPackage is not persisted.

ReviewWorkspacePreviewPackage is not final NBA.

## 10. Direction review panel

TYPE DirectionReviewPanelModel:
- rankedDirections?: RankedDirection[]
- selectedDirectionKey?: string
- selectionStatus:
  - no_ranking
  - ranking_ready
  - user_choice_required
  - user_selected
  - user_rejected_all
  - alternatives_requested
- explanation?: string[]
- uncertainty?: string[]
- userActions:
  - select_direction
  - reject_direction
  - request_alternatives
  - open_evidence
- noWrite: true

Rules:

- top-ranked direction is not auto-selected.
- user choice is required.
- weakness score is not truth.
- direction selection is preview workflow state unless future write gate exists.

## 11. Candidate review panel

TYPE CandidateReviewPanelModel:
- selectedDirectionKey?: string
- candidatePackageStatus:
  - not_available_user_choice_required
  - ready
  - partial
  - blocked
  - review_needed
- candidates?: ActionCandidatePreview[]
- selectedCandidateKey?: string
- explanation?: string[]
- uncertainty?: string[]
- userActions:
  - accept_candidate
  - reject_candidate
  - edit_candidate
  - postpone_candidate
  - request_alternative
  - open_evidence
  - open_audit
- noWrite: true

Rules:

- candidate is not final NBA.
- accepting candidate in preview does not execute action.
- editing candidate in preview does not write DB.
- rejection is useful feedback, not user failure.

## 12. Analytics review panel

TYPE AnalyticsReviewPanelModel:
- analyticsStatus:
  - not_available
  - ready
  - partial
  - blocked
  - review_needed
- shortSummary?: string
- directionSummary?: string[]
- categorySummary?: string[]
- stateHookSummary?: string[]
- evidenceTrailAvailable?: boolean
- uncertaintyAvailable?: boolean
- suggestedReviewItems?: AnalyticsReviewItem[]
- warnings?: string[]
- noWrite: true

Rules:

- analytics summary is not truth.
- state hook is not State Fact.
- suggested review item is not applied correction.
- public UI must not expose sensitive details.

## 13. Semantic Capital review panel

TYPE SemanticCapitalReviewPanelModel:
- semanticCapitalStatus:
  - not_available
  - ready
  - partial
  - blocked
  - review_needed
- previews?: SemanticCapitalPreviewResult[]
- explanation?: string[]
- evidenceTrailAvailable?: boolean
- uncertainty?: string[]
- warnings?: string[]
- noWrite: true

Rules:

- Semantic Capital preview is not money.
- Semantic Capital preview is not points.
- Semantic Capital preview is not productivity truth.
- Semantic Capital preview is not persisted.
- UI must show no-write state clearly.

## 14. Audit / correction / feedback review panel

TYPE AuditCorrectionFeedbackReviewPanelModel:
- auditTrail?: AuditTrailPreview
- correctionCandidates?: CorrectionCandidatePreview[]
- feedbackPreviews?: FeedbackTrailPreview[]
- trailPackageStatus:
  - not_available
  - ready
  - partial
  - blocked
  - review_needed
- userActions:
  - open_audit
  - review_correction_candidate
  - accept_correction_preview
  - reject_correction_preview
  - provide_feedback_preview
  - cancel
- noWrite: true

Rules:

- audit preview is not audit row.
- correction candidate is not applied correction.
- feedback preview is not feedback row.
- accept_correction_preview does not apply correction in C34-D planning.
- applied correction requires separate future write gate.

## 15. Evidence drawer

TYPE EvidenceDrawerModel:
- evidenceItems?: AnalyticsEvidenceItem[] | AuditEvidenceItem[] | SemanticCapitalEvidenceItem[]
- includedEvidenceCount?: number
- excludedEvidenceCount?: number
- strongestEvidence?: string[]
- weakestEvidence?: string[]
- systemEstimatesUsed?: boolean
- sensitiveEvidenceHidden?: boolean
- noWrite: true

Rules:

- evidence drawer must label system estimates.
- hidden sensitive evidence must not be revealed in public output.
- evidence does not create truth.
- evidence does not create writes.

## 16. Uncertainty banner

TYPE UncertaintyBannerModel:
- confidence?: number
- confidenceBand?: low | medium | high | unknown
- missingInputs?: string[]
- unresolvedConcepts?: string[]
- sensitiveHiddenDetails?: string[]
- uncertaintyNotes?: string[]
- recommendedUserReview?: boolean

Rules:

- uncertainty must be visible when data is partial.
- missing data must not be invented.
- low confidence must block strong claims.
- sensitive hidden details must reduce precision.

## 17. Safety / no-write footer

TYPE NoWriteSafetyFooterModel:
- noWrite: true
- noSqlExecuted: true
- noDbReadExecuted: true
- noDbWriteExecuted: true
- noRouteCreatedInThisStep: true
- noAdapterCreatedInThisStep: true
- noStateFactCreated: true
- noStateDeltaCreated: true
- noStateSnapshotCreated: true
- noValueObjectCreated: true
- noSemanticCapitalWritten: true
- noAuditRowWritten: true
- noCorrectionRowWritten: true
- noFeedbackRowWritten: true
- noFinalNextBestActionCreated: true
- noActionExecuted: true

Rules:

- no-write state should be visible in review mode.
- hidden writes are forbidden.
- user should understand that preview is not execution.

## 18. UI warning types

Possible warnings:

- preview_only
- user_choice_required
- user_confirmation_required
- analytics_not_truth
- semantic_capital_not_money
- semantic_capital_not_points
- semantic_capital_not_productivity_truth
- semantic_capital_not_written
- candidate_not_final_nba
- correction_candidate_not_applied
- feedback_not_written
- state_hook_not_state_fact
- sensitive_context_hidden
- unresolved_concepts_reduce_confidence
- no_write_mode

## 19. UI blocker types

Possible blockers:

- missing_preview_package
- user_choice_required
- no_safe_candidate_available
- insufficient_evidence
- privacy_scope_mismatch
- unsafe_claim_risk
- unresolved_concepts_too_high
- db_read_required_but_gate_closed
- db_write_required_but_gate_closed
- applied_correction_required_but_gate_closed
- action_execution_required_but_gate_closed

Blockers should prevent strong claims and execution-like UI.

## 20. Privacy boundary

Default UI privacy rules:

- private/sensitive data stays private;
- public workspace must hide sensitive details;
- health/family/finance signals require cautious language;
- cross-user comparison is forbidden by default;
- organization workspace requires organization-approved boundary;
- evidence drawer must respect outputPrivacyLevel.

## 21. Interaction boundary

C34-D.1 only defines interaction contracts.

No click handlers are implemented.

No UI components are created.

No route is created.

No adapter is created.

No data is fetched.

No write is performed.

## 22. Relationship to C34-A

C34-A Similarity/Relevance may appear in UI as supporting evidence.

But UI must show:

- Similarity is not Relevance.
- Similarity is not NBA.
- Relevance is not NBA.
- Similarity/Relevance are supporting previews only.

## 23. Relationship to C34-B

C34-B Weakest Direction / user choice / candidate package may appear in UI.

But UI must show:

- Weakest Direction is not NBA.
- User choice is required.
- Candidate package is not final NBA.
- User confirmation is required.
- No final Next Best Action created.

## 24. Relationship to C34-C

C34-C Analytics / Semantic Capital / Audit may appear in UI.

But UI must show:

- Analytics is not truth.
- Semantic Capital is not money.
- Semantic Capital is not points.
- Semantic Capital is not productivity truth.
- Correction candidate is not applied correction.
- Feedback preview is not written feedback.
- No hidden writes.

## 25. Future implementation gate requirements

Before real UI implementation, a separate implementation gate must define:

- exact page or component paths;
- exact TypeScript types imported or created;
- whether mock fixtures are used;
- whether API route is used;
- whether DB reads are allowed;
- whether writes are allowed;
- exact user actions enabled;
- exact disabled states;
- safety copy;
- tests;
- npm/typecheck commands;
- commit/push gate.

C34-D.1 does not open implementation gate.

## 26. C34-D block plan

C34-D.1 — Review UI / Workspace integration MVP boundary contract  
C34-D.2 — Workspace screen blocks and panel data model draft  
C34-D.3 — User interaction flow, confirmation and correction UX contract  
C34-D.4 — No-write UI integration adapter / fixture contract  
C34-D.5 — Final lock and next branch decision

## 27. Acceptance criteria for C34-D.1

C34-D.1 is complete when:

- Review UI is defined.
- Workspace integration is defined.
- UI is separated from truth.
- Review workspace package is documented.
- Direction review panel is documented.
- Candidate review panel is documented.
- Analytics review panel is documented.
- Semantic Capital review panel is documented.
- Audit/correction/feedback review panel is documented.
- Evidence drawer is documented.
- Uncertainty banner is documented.
- No-write safety footer is documented.
- Warning/blocker types are documented.
- Privacy boundary is documented.
- No-write boundary is preserved.
- C34-D.2 can define workspace screen blocks and panel data model separately.

## 28. Next step

C34-D.2 — Workspace screen blocks and panel data model draft.

C34-D.2 should define:

- MVP screen structure;
- dashboard/workspace blocks;
- direction review card;
- candidate review card;
- analytics summary card;
- Semantic Capital preview card;
- audit/correction/feedback panel;
- evidence drawer;
- uncertainty/warning/blocker UI models.

## 29. Final status

C34-D.1 is documentation-only.

No runtime changes.  
No React component.  
No page creation.  
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
