# C34-D.2 — Workspace Screen Blocks and Panel Data Model Draft

Дата: 31.05.2026  
Статус: documentation draft / no runtime changes  
Ветка: C34-D — Review UI / Workspace integration MVP  
Шаг: 2 из 5  

## 1. Назначение

Этот документ фиксирует черновую структуру MVP workspace screen blocks and panel data models.

C34-D.2 НЕ реализует UI.  
C34-D.2 НЕ создаёт React component.  
C34-D.2 НЕ создаёт page.  
C34-D.2 НЕ создаёт runtime route.  
C34-D.2 НЕ создаёт TypeScript adapter.  
C34-D.2 НЕ выполняет SQL.  
C34-D.2 НЕ читает и не пишет DB.  
C34-D.2 НЕ создаёт Value Objects, State Facts, State Deltas, State Snapshots or Semantic Capital.  
C34-D.2 НЕ создаёт audit rows, correction rows or feedback rows.  
C34-D.2 НЕ создаёт final Next Best Action.  
C34-D.2 НЕ выполняет action.

Цель шага — описать, какие блоки и панели должны быть в будущем review workspace, какие данные они получают, какие состояния показывают и какие действия пользователя только предлагают, не выполняя side effects.

## 2. Связь с C34-D.1

C34-D.1 зафиксировал:

- Review UI is preview-first workspace.
- UI is not truth.
- User choice is required.
- User confirmation is required.
- Evidence and uncertainty must be visible.
- Candidate is not final NBA.
- Correction candidate is not applied correction.
- Feedback preview is not feedback row.
- No-write status must be visible.
- No hidden writes.

C34-D.2 развивает только screen blocks and panel data model.

## 3. MVP workspace screen — high-level structure

Future MVP workspace may contain:

1. Header / context bar.
2. No-write safety strip.
3. Direction review block.
4. Candidate review block.
5. Analytics summary block.
6. Semantic Capital preview block.
7. Audit / correction / feedback block.
8. Evidence drawer.
9. Uncertainty / warnings / blockers area.
10. Footer with disabled production actions.

This is a data model draft only.

No screen is implemented in C34-D.2.

## 4. Workspace screen model

TYPE WorkspaceReviewScreenModel:
- screenId?: string
- screenMode:
  - semantic_review_preview
  - direction_choice_required
  - candidate_review
  - analytics_review
  - correction_review
  - blocked
- title?: string
- subtitle?: string
- contextBar?: WorkspaceContextBarModel
- noWriteStrip?: WorkspaceNoWriteStripModel
- layout?: WorkspaceLayoutModel
- blocks: WorkspaceBlockModel[]
- drawers?: WorkspaceDrawerModel[]
- globalWarnings?: WorkspaceWarningModel[]
- globalBlockers?: WorkspaceBlockerModel[]
- footer?: WorkspaceFooterModel
- noWrite: true

Rules:

- screenMode is UI state, not DB state.
- blocks are review containers, not persisted entities.
- noWrite must be true.
- blocked mode must prevent execution-like UI.

## 5. Context bar model

TYPE WorkspaceContextBarModel:
- scopeLabel?: string
- scopeType?:
  - activity_event
  - session
  - day
  - week
  - direction
  - candidate_package
  - custom
- timeRangeLabel?: string
- selectedDirectionLabel?: string
- confidenceLabel?: low | medium | high | unknown
- privacyLabel?: public | internal | private | sensitive
- statusBadges?: WorkspaceStatusBadge[]
- noWrite: true

Purpose:

- show what the preview is about;
- show current scope;
- show whether user choice is still required;
- show privacy mode;
- show no-write status.

## 6. No-write strip model

TYPE WorkspaceNoWriteStripModel:
- visible: true
- label: string
- message: string
- flags:
  - noSqlExecuted
  - noDbReadExecuted
  - noDbWriteExecuted
  - noStateFactCreated
  - noSemanticCapitalWritten
  - noAuditRowWritten
  - noCorrectionRowWritten
  - noFeedbackRowWritten
  - noFinalNextBestActionCreated
  - noActionExecuted
- severity:
  - info
  - caution
  - blocked
- noWrite: true

Rules:

- no-write strip must be visible in preview mode.
- it must not imply production readiness.
- if any future write gate opens, the strip must be redesigned.

## 7. Layout model

TYPE WorkspaceLayoutModel:
- layoutType:
  - single_column
  - two_column
  - dashboard_grid
  - review_focus
- primaryColumn?: WorkspaceColumnModel
- secondaryColumn?: WorkspaceColumnModel
- mobileBehavior?:
  - stack_blocks
  - collapse_secondary
  - drawer_only
- noWrite: true

TYPE WorkspaceColumnModel:
- columnKey: string
- title?: string
- blockKeys: string[]

Rules:

- layout is display-only.
- layout does not determine semantic priority.
- UI order must not imply final NBA.

## 8. Generic block model

TYPE WorkspaceBlockModel:
- blockKey: string
- blockType:
  - direction_review
  - candidate_review
  - analytics_summary
  - semantic_capital_preview
  - audit_correction_feedback
  - evidence_summary
  - uncertainty_summary
  - warning_blocker_summary
  - safety_footer
  - custom
- title: string
- subtitle?: string
- status:
  - not_available
  - ready
  - partial
  - blocked
  - user_choice_required
  - review_needed
- priorityHint?: low | medium | high
- collapsedByDefault?: boolean
- visible: boolean
- dataRef?: string
- userActions?: WorkspaceUserActionModel[]
- warnings?: WorkspaceWarningModel[]
- blockers?: WorkspaceBlockerModel[]
- noWrite: true

Rules:

- priorityHint is display hint, not action priority.
- block status is UI status, not state fact.
- userActions are allowed actions, not executed actions.
- hidden blocks must not hide safety blockers.

## 9. Direction review block data model

TYPE DirectionReviewBlockData:
- rankedDirections: DirectionReviewCardModel[]
- selectedDirectionKey?: string
- selectionStatus:
  - no_ranking
  - ranking_ready
  - user_choice_required
  - user_selected
  - user_rejected_all
  - alternatives_requested
- topRankNotice?: string
- explanation?: string[]
- uncertainty?: string[]
- evidenceDrawerRef?: string
- noWrite: true

TYPE DirectionReviewCardModel:
- directionKey: string
- title: string
- rank?: number
- weaknessSignal?: number
- confidence?: number
- confidenceBand?: low | medium | high | unknown
- shortReason?: string
- supportingEvidenceCount?: number
- missingContext?: string[]
- warnings?: string[]
- userActions:
  - select_direction
  - reject_direction
  - request_alternatives
  - open_evidence
- selected?: boolean
- noWrite: true

Rules:

- rank is not command.
- top ranked direction is not auto-selected.
- weaknessSignal is not truth.
- user selection is required before candidate package is treated as direction-specific.

## 10. Candidate review block data model

TYPE CandidateReviewBlockData:
- selectedDirectionKey?: string
- selectedDirectionTitle?: string
- packageStatus:
  - not_available_user_choice_required
  - ready
  - partial
  - blocked
  - review_needed
- candidates: CandidateReviewCardModel[]
- selectedCandidateKey?: string
- explanation?: string[]
- uncertainty?: string[]
- evidenceDrawerRef?: string
- auditDrawerRef?: string
- noWrite: true

TYPE CandidateReviewCardModel:
- candidateKey: string
- title: string
- candidateType:
  - learning_action
  - recovery_action
  - work_action
  - family_action
  - commercial_action
  - admin_action
  - review_action
  - rest_action
  - other
- estimatedDurationMinutes?: number
- estimatedLoad?: low | medium | high | unknown
- confidence?: number
- candidateBand?: low | medium | high
- whyThisMayFit?: string[]
- whyThisMayNotFit?: string[]
- missingContext?: string[]
- warnings?: string[]
- userActions:
  - accept_candidate_preview
  - reject_candidate_preview
  - edit_candidate_preview
  - postpone_candidate_preview
  - request_alternative
  - open_evidence
  - open_audit
- selected?: boolean
- requiresConfirmation: true
- noWrite: true

Rules:

- candidate is not final NBA.
- accept_candidate_preview does not execute action.
- edit_candidate_preview does not write DB.
- reject_candidate_preview is feedback preview, not negative scoring.

## 11. Analytics summary block data model

TYPE AnalyticsSummaryBlockData:
- analyticsStatus:
  - not_available
  - ready
  - partial
  - blocked
  - review_needed
- shortSummary?: string
- summaryCards?: AnalyticsMiniCardModel[]
- suggestedReviewItems?: AnalyticsReviewItemCardModel[]
- uncertainty?: string[]
- evidenceDrawerRef?: string
- noWrite: true

TYPE AnalyticsMiniCardModel:
- cardKey: string
- title: string
- summary: string
- domain?:
  - direction
  - category
  - state_hook
  - feedback
  - activity
  - other
- confidence?: number
- warnings?: string[]
- noWrite: true

TYPE AnalyticsReviewItemCardModel:
- reviewItemKey?: string
- title: string
- reason?: string
- targetKey?: string
- reviewItemType:
  - confirm_category
  - review_direction_mapping
  - review_state_hook
  - review_candidate_explanation
  - review_activity_duration
  - review_semantic_interpretation
  - review_privacy_level
  - other
- confidence?: number
- userActions:
  - open_review_item
  - dismiss_review_preview
  - open_evidence
- noWrite: true

Rules:

- analytics summary is not truth.
- suggested review item is not applied correction.
- state hook is not State Fact.
- analytics card must show uncertainty when needed.

## 12. Semantic Capital preview block data model

TYPE SemanticCapitalPreviewBlockData:
- semanticCapitalStatus:
  - not_available
  - ready
  - partial
  - blocked
  - review_needed
- previewCards: SemanticCapitalPreviewCardModel[]
- explanation?: string[]
- uncertainty?: string[]
- evidenceDrawerRef?: string
- noWrite: true

TYPE SemanticCapitalPreviewCardModel:
- previewKey?: string
- targetTitle: string
- targetType:
  - activity_event
  - category
  - direction
  - value_object
  - action_candidate
  - explanation
  - analytics_summary
  - other
- scoreBand?: very_low | low | medium | high | very_high
- confidence?: number
- dimensionHighlights?: string[]
- warnings?: string[]
- userActions:
  - open_semantic_capital_details
  - open_evidence
  - dismiss_preview
- noWrite: true

Rules:

- Semantic Capital preview is not money.
- Semantic Capital preview is not points.
- Semantic Capital preview is not productivity truth.
- Semantic Capital preview is not persisted.
- value_object target does not create Value Object.

## 13. Audit / correction / feedback block data model

TYPE AuditCorrectionFeedbackBlockData:
- trailStatus:
  - not_available
  - ready
  - partial
  - blocked
  - review_needed
- auditSummary?: AuditSummaryCardModel
- correctionCandidates?: CorrectionCandidateCardModel[]
- feedbackPreviews?: FeedbackPreviewCardModel[]
- evidenceDrawerRef?: string
- noWrite: true

TYPE AuditSummaryCardModel:
- title: string
- short: string
- evidenceCount?: number
- assumptionsCount?: number
- excludedEvidenceCount?: number
- gatesClosedCount?: number
- warnings?: string[]
- userActions:
  - open_audit_drawer
  - open_evidence
- noWrite: true

TYPE CorrectionCandidateCardModel:
- correctionCandidateKey?: string
- title: string
- targetType: string
- proposedChangeType: string
- currentValue?: string
- proposedValue?: string
- reason?: string
- confidence?: number
- requiresUserConfirmation: true
- userActions:
  - review_correction_candidate
  - accept_correction_preview
  - reject_correction_preview
  - open_evidence
- noWrite: true

TYPE FeedbackPreviewCardModel:
- feedbackPreviewKey?: string
- feedbackType: string
- targetType: string
- interpretedEffect?: string[]
- confidence?: number
- userActions:
  - provide_feedback_preview
  - edit_feedback_preview
  - cancel_feedback_preview
- noWrite: true

Rules:

- audit summary is not audit row.
- correction candidate is not applied correction.
- accept_correction_preview does not apply correction.
- feedback preview is not feedback row.
- feedback is not automatic Semantic Capital.

## 14. Evidence drawer data model

TYPE WorkspaceEvidenceDrawerData:
- drawerKey: string
- title?: string
- evidenceGroups?: EvidenceGroupModel[]
- includedEvidenceCount?: number
- excludedEvidenceCount?: number
- systemEstimatesUsed?: boolean
- sensitiveEvidenceHidden?: boolean
- privacyNotice?: string
- noWrite: true

TYPE EvidenceGroupModel:
- groupKey: string
- title: string
- evidenceItems: EvidenceDisplayItemModel[]

TYPE EvidenceDisplayItemModel:
- evidenceKey?: string
- evidenceType: string
- title?: string
- summary?: string
- confidence?: number
- evidenceStrength?: number
- isUserConfirmed?: boolean
- isSystemEstimate?: boolean
- isSensitive?: boolean
- displayPolicy:
  - show
  - show_summary_only
  - hide_sensitive_details
  - hidden
- noWrite: true

Rules:

- system estimates must be labeled.
- sensitive evidence must respect displayPolicy.
- evidence does not create truth.
- opening drawer does not read DB in C34-D.2.

## 15. Uncertainty and warnings panel model

TYPE WorkspaceUncertaintyPanelData:
- confidence?: number
- confidenceBand?: low | medium | high | unknown
- missingInputs?: string[]
- unresolvedConcepts?: string[]
- sensitiveHiddenDetails?: string[]
- uncertaintyNotes?: string[]
- recommendedUserReview?: boolean
- noWrite: true

TYPE WorkspaceWarningModel:
- warningKey?: string
- warningType:
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
  - other
- message: string
- severity:
  - info
  - caution
  - warning
- noWrite: true

TYPE WorkspaceBlockerModel:
- blockerKey?: string
- blockerType:
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
  - other
- message: string
- blocksExecutionLikeUi: true
- noWrite: true

Rules:

- blockers prevent execution-like UI.
- warnings must not be hidden if safety-relevant.
- low confidence must not be visually disguised as high certainty.

## 16. User action model

TYPE WorkspaceUserActionModel:
- actionKey: string
- actionType:
  - select_direction
  - reject_direction
  - request_alternatives
  - accept_candidate_preview
  - reject_candidate_preview
  - edit_candidate_preview
  - postpone_candidate_preview
  - open_evidence
  - open_audit_drawer
  - review_correction_candidate
  - accept_correction_preview
  - reject_correction_preview
  - provide_feedback_preview
  - dismiss_preview
  - cancel
- label: string
- enabled: boolean
- disabledReason?: string
- requiresConfirmation?: boolean
- isWriteAction?: false
- noWrite: true

Rules:

- all actions in C34-D.2 are preview/workflow actions.
- isWriteAction must be false.
- requiresConfirmation should be true for candidate/correction acceptance.
- action labels must not imply execution.

## 17. Footer model

TYPE WorkspaceFooterModel:
- leftNote?: string
- rightNote?: string
- primaryAction?: WorkspaceUserActionModel
- secondaryActions?: WorkspaceUserActionModel[]
- safetyFooter?: NoWriteSafetyFooterModel
- noWrite: true

Rules:

- footer must not offer production execution.
- primaryAction cannot be final execute action in C34-D.2.
- safetyFooter should remain visible or reachable.

## 18. Display copy requirements

Allowed copy patterns:

- "Preview only."
- "Requires your choice."
- "Requires confirmation."
- "This candidate may fit."
- "This summary is based on available evidence."
- "Confidence is limited because..."
- "No changes were written."

Forbidden copy patterns:

- "This is the best action."
- "Do this now."
- "Saved to your state."
- "Semantic Capital increased."
- "Points created."
- "Correction applied."
- "Feedback saved."
- "Action executed."

## 19. MVP screen block order

Recommended default order:

1. No-write safety strip.
2. Direction review block.
3. Candidate review block.
4. Analytics summary block.
5. Semantic Capital preview block.
6. Audit/correction/feedback block.
7. Evidence / uncertainty drawers.
8. Footer.

This order is not semantic truth.

It is only review UX order.

## 20. Empty / partial states

Required empty states:

- no preview package available;
- user choice required;
- candidate package unavailable before direction choice;
- analytics unavailable;
- Semantic Capital preview unavailable;
- evidence unavailable;
- correction candidates unavailable;
- feedback preview unavailable.

Rules:

- empty state must explain why it is empty.
- empty state must not invent missing data.
- empty state must not silently fetch DB.

## 21. Privacy boundary

UI blocks must respect privacy.

Rules:

- sensitive details hidden by default in public/internal output;
- private output may show more detail only within allowed scope;
- family/health/finance signals require cautious language;
- cross-user comparisons are forbidden by default;
- organization workspace requires organization-approved boundary;
- evidence displayPolicy must be obeyed.

## 22. No-write boundary

C34-D.2 output is planning-only.

Forbidden side effects:

- no React component creation;
- no page creation;
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

## 23. Acceptance criteria for C34-D.2

C34-D.2 is complete when:

- WorkspaceReviewScreenModel is documented.
- Context bar model is documented.
- No-write strip model is documented.
- Layout model is documented.
- Generic block model is documented.
- Direction review block data model is documented.
- Candidate review block data model is documented.
- Analytics summary block data model is documented.
- Semantic Capital preview block data model is documented.
- Audit/correction/feedback block data model is documented.
- Evidence drawer model is documented.
- Uncertainty/warnings/blockers model is documented.
- User action model is documented.
- Footer model is documented.
- Display copy requirements are documented.
- Empty/partial states are documented.
- Privacy boundary is documented.
- No-write boundary is preserved.
- C34-D.3 can define user interaction flow separately.

## 24. Next step

C34-D.3 — User interaction flow, confirmation and correction UX contract.

C34-D.3 should define:

- exact user flows;
- direction choice flow;
- candidate confirmation flow;
- candidate edit/reject flow;
- correction review flow;
- feedback preview flow;
- disabled states;
- confirmation wording;
- no-write interaction behavior.

## 25. Final status

C34-D.2 is documentation-only.

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
