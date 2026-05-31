# C34-C.3 — Semantic Capital Planning Model and No-write Scoring Draft

Дата: 31.05.2026  
Статус: documentation draft / no runtime changes  
Ветка: C34-C — Analytics / Semantic Capital / Audit  
Шаг: 3 из 5  

## 1. Назначение

Этот документ фиксирует черновую модель Semantic Capital planning signal и no-write scoring draft.

C34-C.3 НЕ реализует Semantic Capital engine.  
C34-C.3 НЕ реализует analytics engine.  
C34-C.3 НЕ создаёт audit runtime.  
C34-C.3 НЕ создаёт correction runtime.  
C34-C.3 НЕ создаёт runtime route.  
C34-C.3 НЕ создаёт TypeScript adapter.  
C34-C.3 НЕ выполняет SQL.  
C34-C.3 НЕ читает и не пишет DB.  
C34-C.3 НЕ создаёт Value Objects, State Facts, State Deltas, State Snapshots or Semantic Capital.

Цель шага — описать, как в будущем можно осторожно оценивать накопленную смысловую ценность действий, знаний, подтверждений и повторяющихся паттернов без записи Semantic Capital и без превращения его в деньги, баллы, продуктивностную истину или репутацию.

## 2. Связь с C34-C.1 и C34-C.2

C34-C.1 зафиксировал:

- Analytics is not truth.
- Semantic Capital is planning signal.
- Semantic Capital is not money.
- Semantic Capital is not platform points.
- Semantic Capital write boundary is closed.
- Audit is not automatic correction.
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
- AnalyticsSummaryResult is not Semantic Capital.
- semantic_capital_not_written.
- no_write_mode.

C34-C.3 развивает только Semantic Capital planning model and no-write scoring draft.

## 3. Semantic Capital — рабочее определение

Semantic Capital означает планировочный сигнал о накопленной смысловой ценности, подтверждённости, полезности, повторяемости, обучающем эффекте или вкладе действия/категории/направления/кандидата.

Semantic Capital may help later answer:

- какие действия создают повторно используемую ценность;
- какие действия усиливают понимание пользователя или проекта;
- какие категории становятся лучше подтверждёнными;
- какие направления получают устойчивый прогресс;
- какие объяснения или кандидаты получают положительный feedback;
- какие семантические связи становятся более надёжными.

В C34-C.3 Semantic Capital является только no-write planning signal.

## 4. Semantic Capital is not money

Semantic Capital is not money.

Semantic Capital is not:

- currency;
- platform points;
- financial value;
- investment value;
- payment unit;
- reward balance;
- public reputation;
- leaderboard score;
- productivity truth;
- medical truth;
- final Next Best Action.

Semantic Capital must not be converted to money or points in C34-C.3.

## 5. Semantic Capital is not truth

Semantic Capital is not truth.

Semantic Capital score means:

> "Available evidence suggests this item may have accumulated meaningful value."

It does NOT mean:

- this action objectively created value;
- this user is more productive;
- this category is permanently important;
- this direction is objectively better;
- this action should be repeated automatically;
- this should be written as State Fact;
- this should create public reputation.

## 6. No-write semantic capital boundary

C34-C.3 must not write Semantic Capital.

Forbidden side effects:

- no semantic capital insert;
- no semantic capital update;
- no semantic capital score persistence;
- no semantic capital aggregate write;
- no Semantic Capital ledger write;
- no score-to-points conversion;
- no financial conversion;
- no public ranking;
- no reputation update;
- no hidden capital accumulation.

Allowed:

- planning dimensions;
- no-write score draft;
- evidence model;
- confidence model;
- uncertainty model;
- blockers and warnings;
- future gate requirements.

## 7. Semantic Capital target model

TYPE SemanticCapitalTarget:
- targetKey?: string
- targetType:
  - activity_event
  - category
  - direction
  - value_object
  - action_candidate
  - user_choice
  - confirmation
  - explanation
  - review_item
  - correction_candidate
  - analytics_summary
  - other
- title?: string
- relatedDirectionKey?: string
- relatedCategoryKeys?: string[]
- relatedCandidateKey?: string
- privacyLevel?: public | internal | private | sensitive
- isUserConfirmed?: boolean
- isSystemEstimate?: boolean

Rules:

- target may be transient and not persisted.
- targetKey is optional for preview.
- targetType does not create DB records.
- value_object target does not create Value Object.
- category target does not confirm category by itself.

## 8. Semantic Capital input model

TYPE SemanticCapitalPreviewInput:
- target: SemanticCapitalTarget
- evidenceItems: SemanticCapitalEvidenceItem[]
- analyticsSummary?: AnalyticsSummaryResult
- feedbackContext?: SemanticCapitalFeedbackContext
- confidenceContext?: SemanticCapitalConfidenceContext
- privacyContext?: SemanticCapitalPrivacyContext
- policy?: SemanticCapitalPreviewPolicy

Rules:

- all input may be partial;
- missing input reduces confidence;
- evidence must remain labeled;
- system estimates must be visible;
- feedback is not automatically capital;
- no DB read is required;
- no write is allowed.

## 9. Evidence item model

TYPE SemanticCapitalEvidenceItem:
- evidenceId?: string
- evidenceType:
  - user_input
  - activity_event
  - category_signature
  - confirmed_category
  - repeated_action
  - completed_action
  - accepted_candidate
  - rejected_candidate
  - edited_candidate
  - useful_explanation
  - wrong_explanation
  - manual_correction
  - relevance_preview
  - similarity_preview
  - weak_direction_ranking
  - analytics_summary
  - audit_note
  - system_estimate
  - other
- title?: string
- summary?: string
- relatedTargetKey?: string
- evidenceStrength?: number
- confidence?: number
- isUserConfirmed?: boolean
- isSystemEstimate?: boolean
- isSensitive?: boolean
- isFact?: boolean
- createdAt?: string

Rules:

- accepted_candidate may support usefulness but does not create capital automatically.
- repeated_action may support repetition but does not prove value.
- useful_explanation may support explanatory value.
- wrong_explanation may reduce trust or trigger review.
- system_estimate must be labeled.
- evidence item does not write anything.

## 10. Semantic Capital dimensions

Draft dimensions:

- reuseValue
- learningValue
- goalSupportValue
- evidenceStrengthValue
- confirmationValue
- feedbackValue
- categoryResolutionValue
- directionBalanceValue
- explanationQualityValue
- correctionLearningValue
- continuityValue
- transferabilityValue

Each dimension is a planning signal.

No dimension is objective truth.

## 11. Reuse value

reuseValue means:

> The target may be useful again or reusable in future contexts.

Examples:

- reusable B2B email template;
- confirmed category mapping;
- useful language phrase set;
- repeated recovery action;
- well-explained candidate package.

Risks:

- reuse does not mean universally good;
- reused pattern may be wrong;
- repeated action can be habit, not value.

## 12. Learning value

learningValue means:

> The target may improve user/system understanding.

Examples:

- user corrected category;
- user rejected a wrong candidate;
- user confirmed a useful explanation;
- analytics found missing context;
- audit captured uncertainty.

Risks:

- learning signal does not prove long-term improvement;
- single correction may be noisy;
- system estimate must remain labeled.

## 13. Goal support value

goalSupportValue means:

> The target appears to support an active or user-confirmed goal.

Examples:

- language task tied to job readiness;
- commercial review tied to B2B goal;
- recovery action tied to health/recovery direction;
- family action tied to caregiving direction.

Rules:

- active user-confirmed goal can increase score.
- suggested or unresolved goal must have lower influence.
- goal support is not final NBA.

## 14. Evidence strength value

evidenceStrengthValue means:

> The target has supporting evidence with sufficient quality and traceability.

Positive signals:

- user-confirmed evidence;
- multiple independent evidence items;
- high-confidence category resolution;
- explicit user feedback;
- consistent analytics summary.

Negative signals:

- unresolved categories;
- weak evidence;
- sensitive hidden details;
- system estimate only;
- contradictory feedback.

## 15. Confirmation value

confirmationValue means:

> The user explicitly confirmed, accepted, edited or validated something.

Examples:

- accepted candidate;
- confirmed category;
- corrected duration;
- marked explanation useful;
- selected direction.

Rules:

- confirmation strengthens interpretation.
- confirmation does not create automatic Semantic Capital write.
- rejection is also useful evidence, not failure.

## 16. Feedback value

feedbackValue means:

> Feedback may improve future scoring, explanations or candidate generation.

Positive feedback may increase confidence.

Negative feedback may increase correctionLearningValue or reduce explanationQualityValue.

Feedback must not become Semantic Capital automatically.

Feedback write requires a separate gate.

## 17. Category resolution value

categoryResolutionValue means:

> Category meaning became clearer or more reliable.

Examples:

- suggested category confirmed;
- external concept mapped safely;
- rejected category removed from strong conclusions;
- category conflict identified.

Rules:

- category resolution does not create Value Object.
- category resolution does not create State Fact.
- external concepts must not become internal categories without confirmation.

## 18. Direction balance value

directionBalanceValue means:

> The target supports healthier balance across directions.

Examples:

- neglected direction receives attention;
- overused direction is recognized as overloaded;
- recovery need is considered after physical load;
- commercial direction is reviewed after long neglect.

Rules:

- balance is a planning signal.
- balance is not productivity truth.
- balance is not moral judgment.

## 19. Explanation quality value

explanationQualityValue means:

> The system explanation was understandable, useful, cautious and evidence-linked.

Positive signals:

- user marked explanation useful;
- explanation cites uncertainty;
- explanation shows evidence;
- explanation avoids forbidden claims.

Negative signals:

- user marked explanation wrong;
- explanation overclaims;
- explanation hides uncertainty;
- explanation leaks sensitive details.

## 20. Correction learning value

correctionLearningValue means:

> A correction or rejected assumption improved future interpretation.

Examples:

- user corrected category;
- user rejected wrong direction;
- user edited candidate;
- user corrected duration;
- audit detected missing context.

Rules:

- correction candidate is not applied correction.
- applied correction requires a separate gate.
- correction value is no-write in C34-C.3.

## 21. Continuity value

continuityValue means:

> The target helps maintain coherent progress over time.

Examples:

- repeated language practice;
- recurring commercial planning;
- stable category taxonomy;
- consistent direction tracking;
- repeated use of a reliable candidate template.

Rules:

- continuity does not mean intensity should increase.
- excessive repetition may trigger overload or imbalance warnings.

## 22. Transferability value

transferabilityValue means:

> The target may be useful in more than one context.

Examples:

- phrase usable in German/English sales context;
- B2B objection template reusable across clients;
- category mapping reusable for similar activities;
- recovery pattern reusable after similar load.

Rules:

- transferability requires caution.
- context mismatch reduces confidence.

## 23. No-write scoring components

Draft components:

- reuseValue
- learningValue
- goalSupportValue
- evidenceStrengthValue
- confirmationValue
- feedbackValue
- categoryResolutionValue
- directionBalanceValue
- explanationQualityValue
- correctionLearningValue
- continuityValue
- transferabilityValue
- uncertaintyPenalty
- privacyPenalty
- safetyPenalty
- overclaimPenalty
- unresolvedConceptPenalty

Draft formula:

semanticCapitalPreviewScore(target) =
reuseValue
+ learningValue
+ goalSupportValue
+ evidenceStrengthValue
+ confirmationValue
+ feedbackValue
+ categoryResolutionValue
+ directionBalanceValue
+ explanationQualityValue
+ correctionLearningValue
+ continuityValue
+ transferabilityValue
- uncertaintyPenalty
- privacyPenalty
- safetyPenalty
- overclaimPenalty
- unresolvedConceptPenalty

Important:

- this is no-write preview score;
- it is not money;
- it is not points;
- it is not productivity truth;
- it is not persisted;
- it must be explainable.

## 24. Draft component ranges

Suggested planning ranges:

- reuseValue: 0.0 to 1.5
- learningValue: 0.0 to 1.5
- goalSupportValue: 0.0 to 1.5
- evidenceStrengthValue: 0.0 to 2.0
- confirmationValue: 0.0 to 2.0
- feedbackValue: -1.0 to 1.5
- categoryResolutionValue: 0.0 to 1.2
- directionBalanceValue: -0.8 to 1.2
- explanationQualityValue: -1.2 to 1.2
- correctionLearningValue: 0.0 to 1.5
- continuityValue: -0.8 to 1.0
- transferabilityValue: 0.0 to 1.0
- uncertaintyPenalty: 0.0 to 2.0
- privacyPenalty: 0.0 to 1.5
- safetyPenalty: 0.0 to 2.0
- overclaimPenalty: 0.0 to 2.0
- unresolvedConceptPenalty: 0.0 to 1.5

These ranges are not production values.

## 25. Score bands

Draft bands:

- very_low
- low
- medium
- high
- very_high

Meaning:

- very_low: little evidence of accumulated semantic value.
- low: weak or partial evidence.
- medium: plausible semantic value but needs caution.
- high: strong evidence of meaningful value, still preview.
- very_high: strong evidence plus confirmation, still no-write.

High or very_high does not create persistence.

## 26. Confidence model

Semantic Capital confidence is separate from score.

Score answers:

> How much semantic value appears to be present?

Confidence answers:

> How reliable is this estimate?

Confidence decreases when:

- evidence is missing;
- evidence is mostly system estimates;
- categories are unresolved;
- feedback is contradictory;
- sensitive details are hidden;
- privacy restrictions limit explanation;
- target is transient;
- context is incomplete.

## 27. Output model

TYPE SemanticCapitalPreviewResult:
- target: SemanticCapitalTarget
- score?: number
- scoreBand?: very_low | low | medium | high | very_high
- confidence?: number
- dimensions?: SemanticCapitalDimensionBreakdown
- evidenceTrail?: SemanticCapitalEvidenceTrail
- explanation?: SemanticCapitalExplanation
- warnings?: SemanticCapitalWarning[]
- blockers?: SemanticCapitalBlocker[]
- safety?: SemanticCapitalSafetySummary
- noWrite: true

SemanticCapitalPreviewResult is not persisted.

SemanticCapitalPreviewResult is not platform points.

SemanticCapitalPreviewResult is not money.

SemanticCapitalPreviewResult is not productivity truth.

## 28. Dimension breakdown

TYPE SemanticCapitalDimensionBreakdown:
- reuseValue?: number
- learningValue?: number
- goalSupportValue?: number
- evidenceStrengthValue?: number
- confirmationValue?: number
- feedbackValue?: number
- categoryResolutionValue?: number
- directionBalanceValue?: number
- explanationQualityValue?: number
- correctionLearningValue?: number
- continuityValue?: number
- transferabilityValue?: number
- uncertaintyPenalty?: number
- privacyPenalty?: number
- safetyPenalty?: number
- overclaimPenalty?: number
- unresolvedConceptPenalty?: number

## 29. Evidence trail

TYPE SemanticCapitalEvidenceTrail:
- evidenceItems: SemanticCapitalEvidenceItem[]
- includedEvidenceCount: number
- excludedEvidenceCount?: number
- excludedReasons?: string[]
- userConfirmedEvidenceCount?: number
- systemEstimateEvidenceCount?: number
- sensitiveEvidenceHidden?: boolean

Rules:

- evidence trail must show what was used.
- system estimates must be visible.
- hidden sensitive evidence must be acknowledged.
- excluded evidence must be explainable.

## 30. Explanation model

TYPE SemanticCapitalExplanation:
- short: string
- whyValueMayExist: string[]
- whatEvidenceSupportsIt: string[]
- whatReducedConfidence: string[]
- uncertainty: string[]
- privacyNotes: string[]
- safetyNotes: string[]
- noWriteNotes: string[]

Minimum explanation must show:

- why score is only preview;
- why this is not money/points/productivity truth;
- what evidence was used;
- what is uncertain;
- why no Semantic Capital write occurred.

## 31. Warnings

Possible warnings:

- semantic_capital_preview_only
- semantic_capital_not_money
- semantic_capital_not_points
- semantic_capital_not_productivity_truth
- semantic_capital_not_written
- evidence_partial
- system_estimate_used
- unresolved_concepts_reduce_confidence
- sensitive_context_hidden
- feedback_not_automatic_capital
- no_write_mode

## 32. Blockers

Possible blockers:

- missing_target
- no_evidence_available
- privacy_scope_mismatch
- unsafe_claim_risk
- unresolved_concepts_too_high
- sensitive_output_not_allowed
- semantic_capital_write_required_but_gate_closed
- db_read_required_but_gate_closed
- db_write_required_but_gate_closed
- financial_conversion_requested_but_disallowed

Blockers prevent strong claims or persistence.

## 33. Safety summary

TYPE SemanticCapitalSafetySummary:
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
- noPointsCreated: true
- noMoneyValueCreated: true
- noReputationUpdated: true
- noAuditRowWritten: true
- noCorrectionRowWritten: true
- noFeedbackRowWritten: true
- noFinalNextBestActionCreated: true
- noActionExecuted: true
- noMedicalDiagnosisCreated: true
- noFinancialAdviceCreated: true
- noProductivityTruthCreated: true

## 34. Example — useful language phrase set

Target:

- category or action_candidate related to German job interview phrases.

Evidence:

- user selected language direction;
- phrase set reused;
- user marked explanation useful;
- active goal supports German job readiness.

Allowed output:

- "This phrase set may have medium/high semantic value because it is reusable, goal-aligned and received positive feedback."

Forbidden output:

- "This created 10 points."
- "This proves language productivity."
- "Persist Semantic Capital."

## 35. Example — rejected candidate

Target:

- action candidate rejected by user.

Evidence:

- user rejected candidate;
- explanation may have been wrong or context mismatch existed.

Allowed output:

- "The rejection may still create correction learning value because it helps improve candidate generation."

Forbidden output:

- "The user failed this action."
- "Create negative productivity score."
- "Write Semantic Capital penalty."

## 36. Example — category confirmation

Target:

- suggested category confirmed by user.

Evidence:

- user confirmed category;
- category was used in analytics;
- direction mapping became clearer.

Allowed output:

- "Category confirmation may increase semantic confidence and category resolution value."

Forbidden output:

- "Create Value Object automatically."
- "Make this category public."
- "Write Semantic Capital."

## 37. No-write boundary

C34-C.3 output is planning-only.

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
- no points creation;
- no money value creation;
- no reputation update;
- no audit row write;
- no correction row write;
- no feedback row write;
- no production analytics;
- no final Next Best Action;
- no action execution.

## 38. Acceptance criteria for C34-C.3

C34-C.3 is complete when:

- Semantic Capital planning definition is documented.
- Semantic Capital is separated from money/points/productivity truth.
- Semantic Capital no-write boundary is documented.
- SemanticCapitalTarget is documented.
- SemanticCapitalPreviewInput is documented.
- SemanticCapitalEvidenceItem is documented.
- dimensions are documented.
- no-write scoring formula is documented.
- score is separated from confidence.
- output model is documented.
- evidence trail is documented.
- explanation model is documented.
- warnings and blockers are documented.
- safety summary is documented.
- examples are documented.
- C34-C.4 can define audit / correction / feedback trail contract.

## 39. Next step

C34-C.4 — Audit / correction / feedback trail contract.

C34-C.4 should define:

- audit trail model;
- correction candidate model;
- applied correction boundary;
- feedback trail model;
- no-write vs write-gated audit/correction/feedback;
- future implementation gate requirements.

## 40. Final status

C34-C.3 is documentation-only.

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
No points creation.  
No money value creation.  
No reputation update.  
No audit row writes.  
No correction row writes.  
No feedback row writes.  
No final Next Best Action.  
No action execution.
