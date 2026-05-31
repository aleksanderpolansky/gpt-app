# C34-A.3 — Relevance Resolver Context Model and Scoring Draft

Дата: 31.05.2026  
Статус: documentation draft / no runtime changes  
Ветка: C34-A — Similarity/Relevance resolvers  
Шаг: 3 из 5  

## 1. Назначение

Этот документ фиксирует черновую context model and scoring draft для Relevance resolver.

C34-A.3 не реализует production resolver.  
C34-A.3 не создаёт runtime route.  
C34-A.3 не выполняет SQL.  
C34-A.3 не читает и не пишет DB.  
C34-A.3 не создаёт Value Objects, State Facts, State Deltas, State Snapshots or Semantic Capital.

Цель шага — отделить Relevance от Similarity и подготовить безопасный контракт, по которому позже можно будет реализовать no-write preview adapter.

## 2. Связь с C34-A.1 и C34-A.2

C34-A.1 зафиксировал базовое различие:

- Similarity = structural similarity by weighted category overlap.
- Relevance = context-sensitive applicability.
- Similarity is not Relevance.
- Relevance is not Next Best Action by itself.
- Next Best Action must not be medical, financial or productivity truth.

C34-A.2 описал Similarity resolver data model.

C34-A.3 описывает только Relevance resolver context model.

## 3. Что отвечает Relevance resolver

Relevance resolver отвечает на вопрос:

> "Насколько этот объект, действие или candidate имеет смысл сейчас, с учётом целей, слабых направлений, состояния, времени, ограничений, среды и пользовательского выбора?"

Relevance resolver НЕ отвечает на вопросы:

- что гарантированно улучшит здоровье;
- что является диагнозом;
- что финансово оптимально;
- что гарантирует продуктивность;
- что пользователь обязан сделать;
- что является final Next Best Action без отдельного NBA layer;
- что можно записать в state facts без write gate.

## 4. Relevance is not Similarity

Similarity показывает структурную похожесть.

Relevance показывает уместность в текущем контексте.

Пример:

- "German listening practice" and "English listening practice" can be similar.
- German may be more relevant if the current weak direction is German job readiness.
- English may be more relevant if tomorrow there is an English interview.
- Passive listening may be more relevant if fatigue/recovery signals are high.
- Active grammar drill may be less relevant if cognitive load is high.

Therefore:

- Similarity score may be one input into Relevance.
- Similarity score must not be copied as Relevance score.
- High Similarity must not automatically produce high Relevance.
- High Relevance must not automatically become Next Best Action.

## 5. Input model

TYPE RelevanceResolverInput:
- candidate: RelevanceCandidate
- context: RelevanceContext
- policy?: RelevancePolicy
- explanationMode?: compact | full

The input must support no-write preview data.

## 6. Relevance candidate

TYPE RelevanceCandidate:
- candidateId?: string
- candidateType:
  - activity_candidate
  - value_object
  - semantic_bundle
  - action_template
  - review_item
  - goal_related_action
  - recovery_action
  - learning_action
  - commercial_action
  - family_action
  - other
- title?: string
- rawText?: string
- categorySignature?: object
- similaritySupport?: SimilaritySupport
- expectedStateHooks?: RelevanceStateHookCandidate[]
- estimatedLoad?: RelevanceLoadEstimate
- estimatedDurationMinutes?: number
- requiredEnvironment?: string[]
- requiredTools?: string[]
- unresolvedConcepts?: string[]
- privacyLevel?: public | internal | private | sensitive

Boundary:

- candidateId is optional because preview candidates may not be persisted.
- similaritySupport is optional and cannot decide relevance alone.
- expectedStateHooks are signals, not facts.
- unresolvedConcepts must reduce confidence or create a blocker.

## 7. Similarity support

TYPE SimilaritySupport:
- score?: number
- scoreBand?: very_low | low | medium | high | very_high
- confidence?: number
- matchedCategories?: string[]
- caution?: string

Rule:

- SimilaritySupport can support relevance.
- SimilaritySupport cannot replace relevance calculation.
- SimilaritySupport cannot create NBA.
- SimilaritySupport cannot create writes.

## 8. Relevance context

TYPE RelevanceContext:
- actorId?: string
- currentTime?: string
- timezone?: string
- selectedDirection?: RelevanceDirection
- weakDirections?: RelevanceWeakDirection[]
- goals?: RelevanceGoal[]
- currentStateHooks?: RelevanceStateHookCandidate[]
- availableTimeWindow?: RelevanceTimeWindow
- environment?: RelevanceEnvironment
- obligations?: RelevanceObligation[]
- recentActivitySummary?: RelevanceRecentActivitySummary
- privacyContext?: RelevancePrivacyContext
- unresolvedSemanticContext?: RelevanceUnresolvedSemanticContext
- userPreferenceContext?: RelevanceUserPreferenceContext
- safetyContext?: RelevanceSafetyContext

Important:

- This context may be partial.
- Missing context must reduce confidence.
- Missing context must not be silently replaced by invented facts.

## 9. Directions

TYPE RelevanceDirection:
- directionKey: string
- title?: string
- domain:
  - health_recovery
  - family
  - finance
  - career
  - languages
  - project
  - work
  - social
  - rest
  - commercial
  - other
- userSelected?: boolean

Weakest direction logic is not implemented in C34-A.3.

C34-A.3 may receive weakDirections as input, but it must not claim that it has calculated them unless a later block implements that logic.

## 10. Weak direction

TYPE RelevanceWeakDirection:
- directionKey: string
- weaknessScore?: number
- urgencyBand?: low | medium | high
- evidence?: string[]
- confidence?: number
- source?: user_selected | rules_preview | analytics_preview | manual

Rule:

- weakDirection can influence relevance.
- weakDirection is not itself an instruction to act.
- weakDirection must be explainable.
- weakDirection must not be medical/financial/productivity truth.

## 11. Goals

TYPE RelevanceGoal:
- goalKey?: string
- title?: string
- priority?: number
- horizon?: now | today | week | month | long_term
- domain?: string
- status?: active | paused | suggested | unresolved
- evidence?: string[]

Goal alignment can increase relevance only if the goal is active or user-selected.

Suggested/unresolved goals must have reduced influence.

## 12. State hooks

TYPE RelevanceStateHookCandidate:
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
- evidence?: string[]
- isFact?: false

Rule:

- State hook is not State Fact.
- State hook can affect relevance.
- State hook cannot create State Fact / Delta / Snapshot.
- Health-related hooks require cautious language.
- Pain/fatigue/stress hooks must not become diagnosis.

## 13. Time window

TYPE RelevanceTimeWindow:
- availableMinutes?: number
- startsAt?: string
- endsAt?: string
- flexibility?: fixed | flexible | unknown
- multitaskingAllowed?: boolean
- interruptionRisk?: low | medium | high | unknown

Fit logic:

- short action can become more relevant in short windows;
- deep work can become less relevant in fragmented windows;
- recovery action can become more relevant when time is short and load is high;
- if available time is unknown, confidence decreases.

## 14. Environment

TYPE RelevanceEnvironment:
- locationType?: home | workplace | theatre | outside | transit | unknown
- noiseLevel?: low | medium | high | unknown
- toolsAvailable?: string[]
- peopleAround?: alone | family | coworkers | public | unknown
- energyDemandAllowed?: low | medium | high | unknown

Environment may affect relevance.

Examples:

- active speaking practice may be less relevant in public/noisy context;
- passive listening may be more relevant during low-attention work;
- physical training may depend on equipment and space;
- family care action may be more relevant when child/family context is present.

## 15. Obligations

TYPE RelevanceObligation:
- obligationKey?: string
- title?: string
- dueAt?: string
- urgency?: low | medium | high
- domain?: work | family | health | finance | project | other
- evidence?: string[]

Obligations can increase relevance when an action reduces risk, deadline pressure or neglected duty.

Obligations must not be treated as moral judgment.

## 16. Recent activity summary

TYPE RelevanceRecentActivitySummary:
- last3h?: string[]
- today?: string[]
- recentDomains?: string[]
- overloadSignals?: string[]
- neglectedDirections?: string[]
- repeatedPatterns?: string[]
- confidence?: number

Recent activity can:

- reduce relevance for overused directions;
- increase relevance for neglected directions;
- increase recovery relevance after load;
- reduce active cognitive task relevance after long cognitive load.

## 17. Privacy context

TYPE RelevancePrivacyContext:
- candidatePrivacyLevel?: public | internal | private | sensitive
- outputPrivacyLevel?: public | internal | private | sensitive
- requiresPrivateExplanation?: boolean
- hideSensitiveDetails?: boolean
- userConfirmationRequired?: boolean

Rule:

- private/sensitive context must not leak into public explanation.
- health/family/finance sensitive signals require cautious output.
- user confirmation may be required before surfacing sensitive relevance explanations.

## 18. Unresolved semantic context

TYPE RelevanceUnresolvedSemanticContext:
- unresolvedConcepts?: string[]
- suggestedCategories?: string[]
- externalConceptsNotConfirmed?: string[]
- needsReview?: boolean

Rule:

- unresolved concepts reduce confidence;
- unresolved concepts may block strong relevance claims;
- unresolved concepts may turn the next useful action into "review/confirm meaning";
- unresolved concepts must not be silently treated as confirmed internal categories.

## 19. User preference context

TYPE RelevanceUserPreferenceContext:
- preferredModes?: string[]
- avoidedModes?: string[]
- preferredLanguages?: string[]
- preferredIntensity?: low | medium | high | unknown
- knownEffectiveActions?: string[]
- knownIneffectiveActions?: string[]
- recentFeedback?: string[]

User preference can modify relevance.

But user preference alone must not override safety, privacy or unresolved-concept blockers.

## 20. Safety context

TYPE RelevanceSafetyContext:
- medicalCautionRequired?: boolean
- financialCautionRequired?: boolean
- productivityCautionRequired?: boolean
- highRiskAction?: boolean
- requiresProfessionalAdvice?: boolean
- disallowedClaimTypes?: string[]

Rule:

- Relevance can rank candidate usefulness cautiously.
- Relevance cannot diagnose.
- Relevance cannot guarantee outcomes.
- Relevance cannot give financial certainty.
- Relevance cannot claim objective productivity truth.

## 21. Draft scoring structure

Relevance score should be composed from multiple interpretable components.

Draft components:

- goalAlignment
- weakDirectionImpact
- stateCompatibility
- timeWindowFit
- environmentFit
- obligationFit
- recentHistoryBalance
- userPreferenceFit
- similaritySupport
- semanticConfidence
- safetyPenalty
- overloadPenalty
- unresolvedConceptPenalty
- privacyPenalty

Draft formula:

relevance(candidate, context) =
goalAlignment
+ weakDirectionImpact
+ stateCompatibility
+ timeWindowFit
+ environmentFit
+ obligationFit
+ recentHistoryBalance
+ userPreferenceFit
+ similaritySupport
+ semanticConfidence
- safetyPenalty
- overloadPenalty
- unresolvedConceptPenalty
- privacyPenalty

Important:

- This is a draft scoring model.
- The numbers are not final truth.
- The score must be explainable.
- The score must not create hidden writes.
- The score must not directly become NBA.

## 22. Draft component ranges

Suggested internal ranges:

- goalAlignment: 0.0 to 1.5
- weakDirectionImpact: 0.0 to 1.5
- stateCompatibility: -1.5 to 1.5
- timeWindowFit: -1.0 to 1.0
- environmentFit: -1.0 to 1.0
- obligationFit: 0.0 to 1.2
- recentHistoryBalance: -1.0 to 1.0
- userPreferenceFit: -0.8 to 0.8
- similaritySupport: 0.0 to 0.8
- semanticConfidence: -0.8 to 0.5
- safetyPenalty: 0.0 to 2.0
- overloadPenalty: 0.0 to 1.5
- unresolvedConceptPenalty: 0.0 to 1.5
- privacyPenalty: 0.0 to 1.0

These ranges are planning defaults and must be tuned later.

## 23. Score bands

Draft bands:

- very_low
- low
- medium
- high
- very_high

The final numeric thresholds should be defined later in implementation/testing.

A high relevance band means:

- "This candidate may fit the current context."

It does NOT mean:

- "This is the best action."
- "This will improve health."
- "This is financially optimal."
- "This guarantees productivity."
- "This should be written as a state fact."

## 24. Output model

TYPE RelevanceResolverResult:
- candidate: RelevanceCandidate
- score?: number
- scoreBand?: very_low | low | medium | high | very_high
- confidence?: number
- components?: RelevanceComponentBreakdown
- explanation?: RelevanceExplanation
- blockers?: RelevanceBlocker[]
- warnings?: RelevanceWarning[]
- noWrite: true

TYPE RelevanceComponentBreakdown:
- goalAlignment?: number
- weakDirectionImpact?: number
- stateCompatibility?: number
- timeWindowFit?: number
- environmentFit?: number
- obligationFit?: number
- recentHistoryBalance?: number
- userPreferenceFit?: number
- similaritySupport?: number
- semanticConfidence?: number
- safetyPenalty?: number
- overloadPenalty?: number
- unresolvedConceptPenalty?: number
- privacyPenalty?: number

## 25. Explanation model

TYPE RelevanceExplanation:
- short: string
- whyRelevantNow: string[]
- whatIncreasedRelevance: string[]
- whatReducedRelevance: string[]
- uncertainty: string[]
- userVisibleCaution: string[]
- confirmationNeeded?: string[]

Minimum explanation must answer:

- why relevant now;
- which goals or directions were used;
- which state hooks influenced the score;
- which constraints reduced relevance;
- what is uncertain;
- why this is not a final NBA decision.

## 26. Blockers

Possible blockers:

- missing_candidate
- missing_context
- unresolved_concepts_too_high
- unsafe_claim_risk
- privacy_scope_mismatch
- unsupported_candidate_type
- missing_user_confirmation
- high_risk_action_without_gate
- state_fact_required_but_gate_closed

Blockers can prevent high-confidence relevance output.

## 27. Warnings

Possible warnings:

- relevance_not_similarity
- relevance_not_nba
- state_hook_not_state_fact
- unresolved_concepts_reduce_confidence
- safety_caution_required
- privacy_caution_required
- no_write_mode
- requires_user_review

## 28. Example — language learning

Candidate:

- German listening practice for 20 minutes.

Context:

- current weak direction: German job readiness;
- available time: 25 minutes;
- fatigue signal: medium;
- environment: home, low noise;
- recent activity: little German today.

Relevance:

- may be high.

Explanation:

- It fits the selected language direction.
- It fits the available time window.
- Passive listening may be compatible with medium fatigue.
- This is not a guarantee and not a final NBA decision.

## 29. Example — physical training

Candidate:

- Pull-ups.

Context:

- physical_load hook high;
- shoulder/back fatigue signal suggested;
- available time: 5 minutes;
- recent activity includes upper-body training.

Relevance:

- may decrease.

Explanation:

- The action is structurally relevant to training goals.
- Current load/fatigue signals may reduce relevance.
- A lower-load recovery or mobility action may be safer to suggest later.
- This is not medical advice.

## 30. Example — family care

Candidate:

- Teach math with child.

Context:

- family direction neglected today;
- child is available;
- available time: 30 minutes;
- cognitive load medium;
- caregiving / parental care category confirmed.

Relevance:

- may increase.

Explanation:

- It supports family/care direction.
- It fits the available time window.
- It includes both learning and parental care meaning.
- This is not a moral judgment.

## 31. Example — commercial work

Candidate:

- Write B2B outbound email.

Context:

- business development direction weak;
- available time 15 minutes;
- unresolved ICP concept exists;
- user has not confirmed target segment.

Relevance:

- medium or blocked for strong claim.

Explanation:

- It supports business development.
- But unresolved ICP reduces confidence.
- A review/confirm ICP action may be more appropriate before strong outreach.

## 32. No-write boundary

C34-A.3 output is planning-only.

Forbidden side effects:

- no SQL execution;
- no migration creation;
- no DB read;
- no DB write;
- no route creation;
- no State Fact creation;
- no State Delta creation;
- no State Snapshot creation;
- no Value Object creation;
- no Semantic Capital write;
- no production recommendation.

## 33. Acceptance criteria for C34-A.3

C34-A.3 is complete when:

- Relevance context model is documented.
- Relevance candidate model is documented.
- Similarity support is allowed only as one input.
- State hooks are treated as signals, not facts.
- Weak directions are allowed as input but not implemented here.
- Draft scoring components are documented.
- Output model is documented.
- Explanation model is documented.
- Blockers and warnings are documented.
- No-write boundary is preserved.
- C34-A.4 can define no-write preview route / adapter contract.

## 34. Next step

C34-A.4 — No-write preview route / adapter contract.

C34-A.4 may prepare a route/adapter contract, but must not open production writes.

## 35. Final status

C34-A.3 is documentation-only.

No runtime changes.  
No SQL.  
No migration.  
No DB reads.  
No DB writes.  
No route creation.  
No production behavior changes.  
No Value Object writes.  
No State Fact / Delta / Snapshot writes.  
No Semantic Capital writes.
