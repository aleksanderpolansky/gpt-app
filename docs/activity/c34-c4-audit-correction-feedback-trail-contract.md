# C34-C.4 — Audit / Correction / Feedback Trail Contract

Дата: 31.05.2026  
Статус: documentation contract / no runtime changes  
Ветка: C34-C — Analytics / Semantic Capital / Audit  
Шаг: 4 из 5  

## 1. Назначение

Этот документ фиксирует контракт будущих audit / correction / feedback trail mechanisms.

C34-C.4 НЕ реализует audit runtime.  
C34-C.4 НЕ реализует correction runtime.  
C34-C.4 НЕ реализует feedback runtime.  
C34-C.4 НЕ реализует analytics engine.  
C34-C.4 НЕ реализует Semantic Capital engine.  
C34-C.4 НЕ создаёт runtime route.  
C34-C.4 НЕ создаёт TypeScript adapter.  
C34-C.4 НЕ выполняет SQL.  
C34-C.4 НЕ читает и не пишет DB.  
C34-C.4 НЕ создаёт Value Objects, State Facts, State Deltas, State Snapshots or Semantic Capital.

Цель шага — описать, как в будущем система сможет объяснимо фиксировать причины preview-результатов, предлагать correction candidates и учитывать feedback без скрытых записей и без превращения preview в применённое изменение.

## 2. Связь с C34-C.1–C34-C.3

C34-C.1 зафиксировал:

- Analytics is not truth.
- Semantic Capital is planning signal.
- Audit is explainable record, not automatic correction.
- Correction candidate is not applied correction.
- Feedback is not automatically Semantic Capital.
- No hidden writes.

C34-C.2 зафиксировал:

- AnalyticsSummaryInput.
- AnalyticsEvidenceItem.
- AnalyticsEvidenceTrail.
- AnalyticsUncertaintySummary.
- AnalyticsReviewItem.
- AnalyticsSummaryResult is not State Fact.
- semantic_capital_not_written.
- no_write_mode.

C34-C.3 зафиксировал:

- SemanticCapitalTarget.
- SemanticCapitalPreviewInput.
- SemanticCapitalEvidenceItem.
- semanticCapitalPreviewScore(target).
- Semantic Capital confidence is separate from score.
- SemanticCapitalPreviewResult is not money, points or productivity truth.
- noSemanticCapitalWritten: true.
- noPointsCreated: true.
- noMoneyValueCreated: true.

C34-C.4 развивает только audit / correction / feedback trail contract.

## 3. Audit trail — definition

Audit trail means an explainable trace of why a preview, score, warning, blocker, candidate, summary or semantic-capital signal was produced.

Audit trail answers:

- which input was used;
- which evidence was included;
- which evidence was excluded;
- which assumptions were made;
- which uncertainty remained;
- which safety gates were closed;
- why no write happened;
- why a claim was weakened or blocked.

Audit trail is not:

- automatic correction;
- hidden surveillance;
- user blame;
- productivity judgment;
- medical / financial / legal truth;
- persistence by default.

## 4. Audit trail model

TYPE AuditTrailPreview:
- auditId?: string
- auditScope: AuditScope
- subjectType:
  - analytics_summary
  - semantic_capital_preview
  - weak_direction_ranking
  - action_candidate_package
  - similarity_preview
  - relevance_preview
  - state_hook_signal
  - category_resolution
  - correction_candidate
  - feedback_preview
  - other
- subjectKey?: string
- evidenceItems?: AuditEvidenceItem[]
- assumptions?: AuditAssumption[]
- excludedEvidence?: AuditExcludedEvidence[]
- warnings?: AuditWarning[]
- blockers?: AuditBlocker[]
- gates?: AuditGateSummary
- explanation?: AuditExplanation
- noWrite: true

AuditTrailPreview is not an audit row.

AuditTrailPreview is not persisted in C34-C.4.

## 5. Audit scope

TYPE AuditScope:
- scopeType:
  - request
  - preview
  - session
  - activity_event
  - day
  - direction
  - category
  - candidate
  - custom
- scopeKey?: string
- startsAt?: string
- endsAt?: string
- timezone?: string
- ownerScope?: user | organization | system_reference
- privacyLevel?: public | internal | private | sensitive

Rules:

- scope defines what is being explained.
- scope does not grant DB read permission.
- organization scope requires separate organization-approved boundary.
- sensitive/private scope must not leak into public output.

## 6. Audit evidence item

TYPE AuditEvidenceItem:
- evidenceId?: string
- evidenceType:
  - user_input
  - activity_event
  - category_signature
  - state_hook_signal
  - similarity_preview
  - relevance_preview
  - weak_direction_ranking
  - user_choice
  - candidate_package
  - analytics_summary
  - semantic_capital_preview
  - manual_correction
  - explicit_feedback
  - system_estimate
  - other
- title?: string
- summary?: string
- sourceLabel?: string
- confidence?: number
- evidenceStrength?: number
- isUserConfirmed?: boolean
- isSystemEstimate?: boolean
- isSensitive?: boolean
- isFact?: boolean

Rules:

- system_estimate must be labeled.
- state_hook_signal is not State Fact.
- weak_direction_ranking is not truth.
- candidate_package is not final NBA.
- semantic_capital_preview is not Semantic Capital write.
- evidence item does not create persistence.

## 7. Audit assumption

TYPE AuditAssumption:
- assumptionKey?: string
- title: string
- reason?: string
- confidence?: number
- riskLevel?: low | medium | high
- needsUserReview?: boolean
- isSystemEstimate?: boolean

Rules:

- assumptions must be visible.
- low-confidence assumptions should reduce confidence.
- high-risk assumptions should create warnings or blockers.
- assumptions must not become facts.

## 8. Excluded evidence

TYPE AuditExcludedEvidence:
- evidenceId?: string
- evidenceType?: string
- reason:
  - low_confidence
  - privacy_restricted
  - sensitive_output_hidden
  - unresolved_concept
  - conflicting_evidence
  - rejected_by_user
  - out_of_scope
  - unsupported_source
  - other
- explanation?: string

Rules:

- excluded evidence should be explainable.
- privacy exclusions must not reveal hidden sensitive details.
- rejected evidence must not support positive conclusions.

## 9. Audit gate summary

TYPE AuditGateSummary:
- sqlExecutionGateOpen: false
- migrationGateOpen: false
- dbReadGateOpen: false
- dbWriteGateOpen: false
- runtimeRouteGateOpen: false
- typeScriptImplementationGateOpen: false
- stateFactWriteGateOpen: false
- stateDeltaWriteGateOpen: false
- stateSnapshotWriteGateOpen: false
- valueObjectWriteGateOpen: false
- semanticCapitalWriteGateOpen: false
- auditWriteGateOpen: false
- correctionWriteGateOpen: false
- feedbackWriteGateOpen: false
- finalNbaGateOpen: false
- actionExecutionGateOpen: false

Rules:

- C34-C.4 keeps all gates closed.
- Any future write requires a separate explicit gate.
- Preview audit must state why no write occurred.

## 10. Audit explanation

TYPE AuditExplanation:
- short: string
- whyProduced: string[]
- evidenceUsed: string[]
- evidenceExcluded: string[]
- assumptions: string[]
- uncertainty: string[]
- gateNotes: string[]
- noWriteNotes: string[]

Minimum explanation must show:

- why output was produced;
- what evidence was used;
- what was uncertain;
- which gates were closed;
- why no audit/correction/feedback row was written.

## 11. Correction candidate — definition

Correction candidate means a possible adjustment that requires review before becoming an applied correction.

Correction candidate may suggest:

- category mapping may be wrong;
- direction mapping may be wrong;
- state hook interpretation may be weak;
- candidate explanation may be incomplete;
- semantic capital preview may overclaim;
- analytics summary may need correction;
- duration or timing may need review.

Correction candidate is not applied correction.

Correction candidate is not State Delta.

Correction candidate is not DB write.

## 12. Correction candidate model

TYPE CorrectionCandidatePreview:
- correctionCandidateId?: string
- targetType:
  - category
  - direction_mapping
  - state_hook
  - candidate_explanation
  - analytics_summary
  - semantic_capital_preview
  - duration
  - timing
  - privacy_level
  - evidence_item
  - other
- targetKey?: string
- proposedChangeType:
  - relabel
  - merge
  - split
  - reject
  - downgrade_confidence
  - upgrade_confidence
  - add_evidence
  - remove_evidence
  - change_duration
  - change_time_range
  - change_privacy
  - request_user_review
  - other
- currentValue?: string
- proposedValue?: string
- reason?: string
- confidence?: number
- evidence?: AuditEvidenceItem[]
- requiresUserConfirmation: true
- noWrite: true

Rules:

- correction candidate must require user confirmation.
- correction candidate does not apply change.
- correction candidate does not write correction row.
- correction candidate does not create State Delta.
- correction candidate does not mutate Value Object or Category.

## 13. Applied correction boundary

Applied correction means a reviewed and accepted correction that changes persisted state, category mapping, timing, evidence or analytics interpretation.

C34-C.4 does not apply corrections.

Applied correction requires separate future gate defining:

- exact data model;
- write table;
- owner scope;
- RLS/security;
- audit row;
- before/after values;
- rollback behavior;
- tests;
- commit/push gate.

Forbidden in C34-C.4:

- no applied correction;
- no correction row write;
- no category mutation;
- no state delta write;
- no activity duration mutation;
- no timeline conflict handling;
- no rollback creation.

## 14. Feedback trail — definition

Feedback trail means a structured record of user/system feedback that may later improve previews, ranking, explanations, category resolution, semantic capital scoring or analytics.

Feedback may include:

- user accepted candidate;
- user rejected candidate;
- user edited candidate;
- user confirmed category;
- user rejected category;
- user corrected duration;
- user marked explanation useful;
- user marked explanation wrong;
- user requested alternative;
- user flagged privacy issue.

Feedback trail is not automatically Semantic Capital.

Feedback trail is not automatically State Fact.

Feedback trail write requires a separate gate.

## 15. Feedback preview model

TYPE FeedbackTrailPreview:
- feedbackPreviewId?: string
- feedbackType:
  - accepted_candidate
  - rejected_candidate
  - edited_candidate
  - confirmed_category
  - rejected_category
  - corrected_duration
  - useful_explanation
  - wrong_explanation
  - alternative_requested
  - privacy_issue
  - manual_note
  - other
- targetType:
  - direction
  - category
  - candidate
  - explanation
  - analytics_summary
  - semantic_capital_preview
  - state_hook
  - activity_event
  - other
- targetKey?: string
- userComment?: string
- interpretedEffect?: FeedbackInterpretedEffect
- confidence?: number
- requiresReview?: boolean
- noWrite: true

Rules:

- feedback preview does not write feedback row.
- accepted candidate does not become Semantic Capital automatically.
- rejected candidate is useful evidence, not user failure.
- wrong explanation may reduce explanation quality.
- privacy issue should increase caution or block public output.

## 16. Feedback interpreted effect

TYPE FeedbackInterpretedEffect:
- mayIncreaseConfidence?: boolean
- mayReduceConfidence?: boolean
- mayImproveFutureRanking?: boolean
- mayTriggerCorrectionCandidate?: boolean
- mayAffectSemanticCapitalPreview?: boolean
- mayAffectExplanationQuality?: boolean
- notes?: string[]

Rules:

- interpreted effect is preview only.
- interpreted effect must not change persisted scoring.
- interpreted effect must not create Semantic Capital write.
- interpreted effect must not create State Fact.

## 17. Feedback write boundary

C34-C.4 does not write feedback.

Future feedback write requires separate gate defining:

- exact table or event model;
- owner scope;
- privacy level;
- source event;
- target reference;
- deduplication;
- abuse/spam handling;
- security/RLS;
- tests.

Forbidden in C34-C.4:

- no feedback row write;
- no user profile mutation;
- no score mutation;
- no Semantic Capital write;
- no state write;
- no category mutation.

## 18. Relationship between audit, correction and feedback

Audit explains what happened.

Correction candidate suggests what may need change.

Feedback preview captures user/system response.

Applied correction changes something only after a future write gate.

Semantic Capital preview may use feedback/corrections later, but does not write capital automatically.

## 19. Trail package model

TYPE AuditCorrectionFeedbackTrailPackage:
- auditTrail?: AuditTrailPreview
- correctionCandidates?: CorrectionCandidatePreview[]
- feedbackPreviews?: FeedbackTrailPreview[]
- warnings?: TrailWarning[]
- blockers?: TrailBlocker[]
- safety?: TrailSafetySummary
- noWrite: true

The package is not persisted.

The package is a reviewable preview.

## 20. Trail warnings

Possible warnings:

- audit_preview_only
- correction_candidate_not_applied
- feedback_not_written
- feedback_not_automatic_semantic_capital
- state_hook_not_state_fact
- analytics_not_truth
- semantic_capital_not_written
- user_confirmation_required
- privacy_caution_required
- no_write_mode

## 21. Trail blockers

Possible blockers:

- missing_target
- no_evidence_available
- privacy_scope_mismatch
- unsafe_claim_risk
- correction_write_required_but_gate_closed
- feedback_write_required_but_gate_closed
- audit_write_required_but_gate_closed
- state_write_required_but_gate_closed
- semantic_capital_write_required_but_gate_closed
- db_read_required_but_gate_closed
- db_write_required_but_gate_closed

Blockers prevent persistence and strong claims.

## 22. Trail safety summary

TYPE TrailSafetySummary:
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
- noSemanticCapitalLedgerWritten: true
- noAuditRowWritten: true
- noCorrectionRowWritten: true
- noFeedbackRowWritten: true
- noAppliedCorrectionCreated: true
- noFinalNextBestActionCreated: true
- noActionExecuted: true
- noMedicalDiagnosisCreated: true
- noFinancialAdviceCreated: true
- noProductivityTruthCreated: true

## 23. Example — wrong candidate explanation

Scenario:

- user rejects a candidate;
- user says explanation was wrong;
- candidate package used weak evidence.

Allowed:

- create FeedbackTrailPreview in memory;
- create CorrectionCandidatePreview suggesting review_candidate_explanation;
- audit explains evidence was weak;
- noWrite remains true.

Forbidden:

- write negative score;
- blame user;
- mutate candidate history;
- create Semantic Capital penalty;
- create applied correction.

## 24. Example — confirmed category

Scenario:

- user confirms a suggested category.

Allowed:

- feedback preview may indicate confirmed_category;
- correction candidate may suggest category confidence increase;
- semantic capital preview may later treat confirmation as evidence;
- all remains no-write.

Forbidden:

- immediately mutate category;
- create Value Object;
- write Semantic Capital;
- create State Fact;
- make category public.

## 25. Example — corrected duration

Scenario:

- user says activity duration was wrong.

Allowed:

- correction candidate may propose change_duration;
- audit trail may show current and proposed values;
- future applied correction gate may handle timeline impacts.

Forbidden in C34-C.4:

- change duration;
- recalculate aggregates;
- write correction row;
- shift timeline;
- create State Delta.

## 26. Future implementation gate requirements

Before implementation, a separate gate must define:

- exact route or service boundary;
- exact TypeScript types;
- whether no-write in-memory preview only;
- whether DB reads are allowed;
- whether writes are allowed;
- exact table names if writes are later opened;
- RLS/security;
- privacy model;
- tests;
- rollback requirements;
- commit/push gate.

C34-C.4 does not open implementation gate.

## 27. No-write boundary

C34-C.4 output is planning-only.

Forbidden side effects:

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
- no Semantic Capital ledger write;
- no audit row write;
- no correction row write;
- no feedback row write;
- no applied correction;
- no production analytics;
- no final Next Best Action;
- no action execution.

## 28. Acceptance criteria for C34-C.4

C34-C.4 is complete when:

- Audit trail definition is documented.
- AuditTrailPreview is documented.
- Audit evidence/assumption/excluded evidence models are documented.
- AuditGateSummary is documented.
- Correction candidate is separated from applied correction.
- CorrectionCandidatePreview is documented.
- Applied correction boundary is documented.
- Feedback trail definition is documented.
- FeedbackTrailPreview is documented.
- FeedbackInterpretedEffect is documented.
- Feedback write boundary is documented.
- Audit/correction/feedback relationship is documented.
- Trail package model is documented.
- Warnings and blockers are documented.
- Safety summary is documented.
- Examples are documented.
- No-write boundary is preserved.
- C34-C.5 can close C34-C block.

## 29. Next step

C34-C.5 — Final lock and next branch decision.

C34-C.5 should summarize:

- C34-C.1 boundary contract;
- C34-C.2 analytics summary evidence model;
- C34-C.3 semantic capital planning model;
- C34-C.4 audit / correction / feedback trail contract;
- gates that remain closed;
- decision whether to move to C34-D.

## 30. Final status

C34-C.4 is documentation-only.

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
No Semantic Capital ledger writes.  
No audit row writes.  
No correction row writes.  
No feedback row writes.  
No applied correction.  
No final Next Best Action.  
No action execution.
