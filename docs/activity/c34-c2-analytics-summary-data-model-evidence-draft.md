# C34-C.2 — Analytics Summary Data Model and Evidence Draft

Дата: 31.05.2026  
Статус: documentation draft / no runtime changes  
Ветка: C34-C — Analytics / Semantic Capital / Audit  
Шаг: 2 из 5  

## 1. Назначение

Этот документ фиксирует черновую модель Analytics Summary и Evidence для будущего no-write analytics layer.

C34-C.2 НЕ реализует analytics engine.  
C34-C.2 НЕ реализует Semantic Capital engine.  
C34-C.2 НЕ создаёт audit runtime.  
C34-C.2 НЕ создаёт correction runtime.  
C34-C.2 НЕ создаёт runtime route.  
C34-C.2 НЕ создаёт TypeScript adapter.  
C34-C.2 НЕ выполняет SQL.  
C34-C.2 НЕ читает и не пишет DB.  
C34-C.2 НЕ создаёт Value Objects, State Facts, State Deltas, State Snapshots or Semantic Capital.

Цель шага — описать, как будущая система сможет формировать объяснимую аналитику на основании evidence, не превращая аналитику в истину и не создавая скрытых записей.

## 2. Связь с C34-C.1

C34-C.1 зафиксировал:

- Analytics is not truth.
- Semantic Capital is planning signal, not money, points, financial value or productivity truth.
- Audit is explainable record, not automatic correction.
- Correction candidate is not applied correction.
- Evidence trail must remain labeled.
- Feedback is not automatically Semantic Capital or State Fact.
- No hidden writes.

C34-C.2 развивает только analytics summary data model and evidence draft.

## 3. Что отвечает Analytics Summary

Analytics Summary отвечает на вопрос:

> "Что можно осторожно увидеть по доступным данным и evidence?"

Analytics Summary НЕ отвечает на вопросы:

- что объективно продуктивно;
- что гарантированно полезно для здоровья;
- что финансово оптимально;
- что является диагнозом;
- что пользователь обязан сделать;
- что является final Next Best Action;
- что должно быть записано как State Fact без отдельного gate.

## 4. Analytics Summary is not truth

Analytics Summary is not truth.

Analytics Summary is a cautious interpretation of available evidence.

Rules:

- summary may describe patterns;
- summary may estimate tendencies;
- summary may show direction balance;
- summary may show uncertainty;
- summary may suggest review;
- summary must not claim objective productivity truth;
- summary must not create State Facts;
- summary must not create Semantic Capital writes;
- summary must not create final NBA;
- summary must not execute action.

## 5. Input model

TYPE AnalyticsSummaryInput:
- scope: AnalyticsSummaryScope
- evidenceItems: AnalyticsEvidenceItem[]
- directionContext?: AnalyticsDirectionContext
- categoryContext?: AnalyticsCategoryContext
- stateHookContext?: AnalyticsStateHookContext
- userChoiceContext?: AnalyticsUserChoiceContext
- feedbackContext?: AnalyticsFeedbackContext
- privacyContext?: AnalyticsPrivacyContext
- policy?: AnalyticsSummaryPolicy

All input may be partial.

Missing input must reduce confidence instead of being silently invented.

## 6. Analytics summary scope

TYPE AnalyticsSummaryScope:
- scopeType:
  - activity_event
  - session
  - day
  - week
  - direction
  - category
  - value_object
  - candidate_package
  - custom
- subjectId?: string
- startsAt?: string
- endsAt?: string
- timezone?: string
- actorScope?: user | organization | system_reference
- ownerId?: string

Rules:

- scope defines the frame of interpretation.
- scope does not grant permission to read DB.
- scope does not create cross-user analytics.
- organization scope requires organization-approved boundary later.

## 7. Evidence item model

TYPE AnalyticsEvidenceItem:
- evidenceId?: string
- evidenceType:
  - user_input
  - activity_event
  - category_signature
  - similarity_preview
  - relevance_preview
  - weak_direction_ranking
  - user_direction_choice
  - action_candidate_package
  - user_confirmation
  - state_hook_signal
  - manual_correction
  - audit_note
  - explicit_feedback
  - system_estimate
  - other
- title?: string
- summary?: string
- sourceRef?: AnalyticsEvidenceSourceRef
- relatedDirectionKey?: string
- relatedCategoryKey?: string
- relatedCandidateKey?: string
- confidence?: number
- evidenceStrength?: number
- isUserConfirmed?: boolean
- isSystemEstimate?: boolean
- isSensitive?: boolean
- isFact?: boolean
- createdAt?: string

Rules:

- system_estimate must be labeled.
- user input may carry higher confidence but still requires context.
- state_hook_signal is not State Fact.
- weak_direction_ranking is not truth.
- action_candidate_package is not final NBA.
- explicit_feedback is not automatically Semantic Capital.
- evidence item does not create writes.

## 8. Evidence source reference

TYPE AnalyticsEvidenceSourceRef:
- sourceType:
  - request_payload
  - current_preview
  - markdown_contract
  - activity_log_reference
  - user_message
  - manual_input
  - test_fixture
  - other
- sourceId?: string
- sourcePath?: string
- sourceLabel?: string
- noDbReadRequired?: boolean

Rules:

- sourceRef is a reference, not a DB read.
- sourcePath must not be treated as proof of runtime persistence.
- noDbReadRequired should be true for no-write previews.

## 9. Direction context

TYPE AnalyticsDirectionContext:
- directionSummaries: AnalyticsDirectionSummary[]
- rankingReference?: string
- selectedDirectionKey?: string
- userChoiceRequired?: boolean
- confidence?: number

TYPE AnalyticsDirectionSummary:
- directionKey: string
- title?: string
- attentionSignal?: number
- weaknessSignal?: number
- overloadSignal?: number
- recoveryNeedSignal?: number
- evidenceCount?: number
- confidence?: number
- summary?: string
- warnings?: string[]

Rules:

- direction summary is a signal, not final truth.
- weaknessSignal is not NBA.
- overloadSignal is not diagnosis.
- recoveryNeedSignal is not medical advice.
- user choice remains required for action package interpretation.

## 10. Category context

TYPE AnalyticsCategoryContext:
- categorySummaries: AnalyticsCategorySummary[]
- unresolvedCategoryCount?: number
- suggestedCategoryCount?: number
- confirmedCategoryCount?: number
- confidence?: number

TYPE AnalyticsCategorySummary:
- categoryKey: string
- label?: string
- categoryType?: string
- occurrenceSignal?: number
- confidence?: number
- resolutionStatus?:
  - confirmed
  - user_confirmed
  - system_resolved
  - suggested
  - external_suggested
  - unresolved
  - rejected
- summary?: string

Rules:

- suggested and external_suggested categories must be marked.
- unresolved categories reduce confidence.
- rejected categories must not support positive conclusions.
- category context does not create Value Objects.

## 11. State hook context

TYPE AnalyticsStateHookContext:
- hooks: AnalyticsStateHookSummary[]
- confidence?: number
- cautionRequired?: boolean

TYPE AnalyticsStateHookSummary:
- hookKey: string
- hookType:
  - fatigue_signal
  - recovery_need
  - stress_load
  - cognitive_load
  - physical_load
  - pain_signal
  - focus_signal
  - emotional_load
  - family_care_load
  - financial_pressure_signal
  - obligation_pressure
  - risk_flag
  - other
- direction?: positive | negative | neutral
- strength?: number
- confidence?: number
- summary?: string
- isFact?: false

Rules:

- State hook is not State Fact.
- Analytics may mention state hooks cautiously.
- Pain/fatigue/stress hooks must not become diagnosis.
- State hook context must not create State Fact / Delta / Snapshot.

## 12. User choice context

TYPE AnalyticsUserChoiceContext:
- selectedDirectionKey?: string
- rejectedDirectionKeys?: string[]
- selectedCandidateKey?: string
- rejectedCandidateKeys?: string[]
- editedCandidateKeys?: string[]
- confirmationStatus?:
  - not_requested
  - requested
  - accepted
  - rejected
  - edited
  - postponed
  - alternative_requested
- confidence?: number

Rules:

- user choice can strengthen interpretation.
- user rejection is evidence, not failure.
- candidate acceptance is not automatic Semantic Capital.
- candidate acceptance is not automatic State Fact.

## 13. Feedback context

TYPE AnalyticsFeedbackContext:
- feedbackItems: AnalyticsFeedbackItem[]
- confidence?: number

TYPE AnalyticsFeedbackItem:
- feedbackType:
  - accepted_candidate
  - rejected_candidate
  - edited_candidate
  - confirmed_category
  - rejected_category
  - corrected_duration
  - useful_explanation
  - wrong_explanation
  - manual_note
  - other
- targetType?:
  - direction
  - category
  - candidate
  - summary
  - state_hook
  - value_object
  - other
- targetKey?: string
- userComment?: string
- confidence?: number
- createdAt?: string

Rules:

- feedback may improve future scoring.
- feedback is not automatically State Fact.
- feedback is not automatically Semantic Capital.
- feedback write requires a separate gate.

## 14. Privacy context

TYPE AnalyticsPrivacyContext:
- inputPrivacyLevel?: public | internal | private | sensitive
- outputPrivacyLevel?: public | internal | private | sensitive
- sensitiveDomains?: string[]
- requiresPrivateExplanation?: boolean
- hideSensitiveDetails?: boolean
- userConfirmationRequired?: boolean

Rules:

- private data stays private.
- sensitive details must not leak into public output.
- health/family/finance signals require cautious wording.
- cross-user analytics is forbidden by default.

## 15. Analytics summary policy

TYPE AnalyticsSummaryPolicy:
- explanationMode?: compact | full
- confidenceMode?: cautious | normal
- includeEvidenceTrail?: boolean
- includeUncertainty?: boolean
- includeSuggestedReviewItems?: boolean
- includeSemanticCapitalPreview?: boolean
- allowSystemEstimates?: boolean
- allowSensitiveDetails?: boolean
- noWrite?: true

Default policy:

- explanationMode: full
- confidenceMode: cautious
- includeEvidenceTrail: true
- includeUncertainty: true
- includeSuggestedReviewItems: true
- includeSemanticCapitalPreview: false in C34-C.2
- allowSystemEstimates: true if labeled
- allowSensitiveDetails: false unless private output
- noWrite: true

## 16. Output model

TYPE AnalyticsSummaryResult:
- scope: AnalyticsSummaryScope
- summaryStatus:
  - ready
  - partial
  - blocked
  - review_needed
- shortSummary: string
- directionSummary?: AnalyticsDirectionContext
- categorySummary?: AnalyticsCategoryContext
- stateHookSummary?: AnalyticsStateHookContext
- evidenceTrail?: AnalyticsEvidenceTrail
- uncertainty?: AnalyticsUncertaintySummary
- suggestedReviewItems?: AnalyticsReviewItem[]
- warnings?: AnalyticsWarning[]
- blockers?: AnalyticsBlocker[]
- safety?: AnalyticsSafetySummary
- noWrite: true

AnalyticsSummaryResult is not State Fact.

AnalyticsSummaryResult is not Semantic Capital.

AnalyticsSummaryResult is not final NBA.

## 17. Evidence trail model

TYPE AnalyticsEvidenceTrail:
- evidenceItems: AnalyticsEvidenceItem[]
- includedEvidenceCount: number
- excludedEvidenceCount?: number
- excludedReasons?: string[]
- strongestEvidence?: string[]
- weakestEvidence?: string[]
- systemEstimatesUsed?: boolean
- userConfirmedEvidenceUsed?: boolean

Rules:

- evidence trail must explain what was used.
- evidence trail must explain what was excluded.
- system estimates must be visible.
- uncertainty must be visible.

## 18. Uncertainty summary

TYPE AnalyticsUncertaintySummary:
- confidence?: number
- missingInputs?: string[]
- lowConfidenceEvidence?: string[]
- unresolvedConcepts?: string[]
- sensitiveHiddenDetails?: string[]
- requiresUserReview?: boolean
- uncertaintyNotes?: string[]

Rules:

- uncertainty is required when data is partial.
- missing data must not be invented.
- unresolved concepts may produce review items.
- sensitive hidden details reduce public explanation precision.

## 19. Suggested review item

TYPE AnalyticsReviewItem:
- reviewItemType:
  - confirm_category
  - review_direction_mapping
  - review_state_hook
  - review_candidate_explanation
  - review_activity_duration
  - review_semantic_interpretation
  - review_privacy_level
  - other
- targetKey?: string
- title: string
- reason?: string
- confidence?: number
- noWrite: true

Rules:

- suggested review item is not applied correction.
- suggested review item does not write correction row.
- user confirmation requires a later gate.
- review item may be shown in UI later.

## 20. Warnings

Possible warnings:

- analytics_is_preview
- analytics_not_truth
- evidence_partial
- system_estimate_used
- unresolved_concepts_reduce_confidence
- sensitive_context_hidden
- state_hook_not_state_fact
- weak_direction_not_nba
- candidate_not_final_nba
- semantic_capital_not_written
- no_write_mode

## 21. Blockers

Possible blockers:

- missing_scope
- no_evidence_available
- privacy_scope_mismatch
- unsafe_claim_risk
- unresolved_concepts_too_high
- sensitive_output_not_allowed
- db_read_required_but_gate_closed
- db_write_required_but_gate_closed
- semantic_capital_write_required_but_gate_closed

Blockers prevent strong analytics claims.

## 22. Safety summary

TYPE AnalyticsSafetySummary:
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
- noAuditRowWritten: true
- noCorrectionRowWritten: true
- noFeedbackRowWritten: true
- noFinalNextBestActionCreated: true
- noActionExecuted: true
- noMedicalDiagnosisCreated: true
- noFinancialAdviceCreated: true
- noProductivityTruthCreated: true

## 23. Example — day summary

Scope:

- day

Evidence:

- activity events;
- direction summaries;
- state hooks;
- user choices.

Allowed summary:

- "Today, language-related activity appears more represented than commercial activity based on available evidence."
- "Commercial direction may need review if it remains a current goal."
- "Some evidence is incomplete, so confidence is medium."

Forbidden summary:

- "Your productivity was objectively 82%."
- "You failed commercial work."
- "This proves what you must do next."

## 24. Example — category usage summary

Scope:

- category

Evidence:

- category signatures;
- confirmed and suggested categories.

Allowed summary:

- "Confirmed language-learning categories appear frequently in this scope."
- "Some suggested categories should be reviewed before being used for strong conclusions."

Forbidden summary:

- "This category is definitely the user's priority."
- "Create Value Object automatically."

## 25. Example — state hook summary

Scope:

- session

Evidence:

- fatigue_signal;
- cognitive_load;
- recovery_need.

Allowed summary:

- "Available state hooks suggest possible fatigue or recovery need."
- "This should be treated cautiously and is not a diagnosis."

Forbidden summary:

- "The user is medically fatigued."
- "Create State Fact."

## 26. No-write boundary

C34-C.2 output is planning-only.

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
- no audit row write;
- no correction row write;
- no feedback row write;
- no production analytics;
- no final Next Best Action;
- no action execution.

## 27. Acceptance criteria for C34-C.2

C34-C.2 is complete when:

- AnalyticsSummaryInput is documented.
- AnalyticsSummaryScope is documented.
- AnalyticsEvidenceItem is documented.
- EvidenceSourceRef is documented.
- Direction/category/state hook/user choice/feedback contexts are documented.
- AnalyticsSummaryPolicy is documented.
- AnalyticsSummaryResult is documented.
- EvidenceTrail is documented.
- Uncertainty model is documented.
- Suggested review item model is documented.
- Warnings/blockers are documented.
- Examples are documented.
- No-write boundary is preserved.
- C34-C.3 can define Semantic Capital planning model separately.

## 28. Next step

C34-C.3 — Semantic Capital planning model and no-write scoring draft.

C34-C.3 should define:

- semantic capital dimensions;
- evidence sources;
- no-write scoring components;
- confidence and uncertainty;
- why Semantic Capital is not money/points/productivity truth;
- why no Semantic Capital write occurs.

## 29. Final status

C34-C.2 is documentation-only.

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
No audit row writes.  
No correction row writes.  
No feedback row writes.  
No final Next Best Action.  
No action execution.
