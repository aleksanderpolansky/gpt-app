# C34-B.2 — Weak Direction Data Model and Ranking Draft

Дата: 31.05.2026  
Статус: documentation draft / no runtime changes  
Ветка: C34-B — Weakest Direction + Next Best Action package  
Шаг: 2 из 5  

## 1. Назначение

Этот документ фиксирует черновую модель данных и ranking draft для Weak Direction.

C34-B.2 НЕ реализует Weakest Direction engine.  
C34-B.2 НЕ реализует Next Best Action engine.  
C34-B.2 НЕ создаёт runtime route.  
C34-B.2 НЕ создаёт TypeScript adapter.  
C34-B.2 НЕ выполняет SQL.  
C34-B.2 НЕ читает и не пишет DB.  
C34-B.2 НЕ создаёт Value Objects, State Facts, State Deltas, State Snapshots or Semantic Capital.

Цель шага — подготовить безопасную модель ранжирования направлений, чтобы позже C34-B.3 мог описать user choice + action candidate package.

## 2. Связь с C34-B.1

C34-B.1 зафиксировал:

- Weakest Direction is not NBA.
- NBA preview is downstream of user-selected direction.
- User choice is required.
- Similarity/Relevance are supporting inputs only.
- Weakest Direction must not become medical, financial or productivity truth.
- No hidden writes.

C34-B.2 развивает только weak direction ranking model.

## 3. Что отвечает Weak Direction ranking

Weak Direction ranking отвечает на вопрос:

> "Какие направления сейчас выглядят более слабыми, недополучившими внимания или требующими осторожного рассмотрения?"

Weak Direction ranking НЕ отвечает на вопрос:

> "Что пользователь должен сделать прямо сейчас?"

Weak Direction ranking НЕ создаёт:

- final Next Best Action;
- state fact;
- diagnosis;
- financial advice;
- productivity truth;
- moral judgment.

## 4. Direction registry draft

Initial direction registry:

TYPE DirectionRegistryItem:
- directionKey: string
- title: string
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
  - personal_admin
  - other
- defaultPriority?: number
- isUserVisible: boolean
- isSensitive?: boolean
- description?: string

Initial directions:

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
- personal_admin
- other

The registry is a draft and may later be connected to actual product taxonomy.

## 5. Input model

TYPE WeakDirectionRankingInput:
- directions: DirectionCandidate[]
- goals?: GoalSignal[]
- recentActivity?: RecentActivitySignal
- stateHooks?: StateHookSignal[]
- obligations?: ObligationSignal[]
- userPriorities?: UserPrioritySignal[]
- availableTime?: TimeWindowSignal
- environment?: EnvironmentSignal
- unresolvedConcepts?: UnresolvedConceptSignal[]
- safetyContext?: SafetySignal
- confidenceContext?: ConfidenceSignal
- rankingPolicy?: WeakDirectionRankingPolicy

All input may be partial.

Missing data must reduce confidence instead of being silently invented.

## 6. Direction candidate model

TYPE DirectionCandidate:
- directionKey: string
- title?: string
- currentAttentionScore?: number
- targetAttentionScore?: number
- neglectSignal?: number
- urgencySignal?: number
- userPrioritySignal?: number
- obligationSignal?: number
- stateHookImpact?: number
- recentOverloadSignal?: number
- recentRecoverySignal?: number
- unresolvedConceptPenalty?: number
- safetyPenalty?: number
- confidence?: number
- evidence?: DirectionEvidenceItem[]

Important:

- currentAttentionScore is not objective productivity truth.
- targetAttentionScore is a configurable planning reference, not a command.
- weaknessScore is a signal, not a fact.
- all scores must remain explainable.

## 7. Evidence model

TYPE DirectionEvidenceItem:
- evidenceKey?: string
- evidenceType:
  - recent_activity
  - missing_activity
  - goal_alignment
  - obligation
  - user_priority
  - state_hook
  - recovery_need
  - overload_signal
  - unresolved_concept
  - manual_note
  - system_estimate
  - other
- title?: string
- value?: string
- weight?: number
- confidence?: number
- source?: user_input | activity_log | preview | manual | system_estimate
- isFact?: boolean

Rules:

- user_input may be stronger than system_estimate.
- system_estimate must be labeled.
- state_hook evidence is not State Fact.
- health/fatigue/stress evidence must use cautious language.

## 8. Goal signal

TYPE GoalSignal:
- goalKey?: string
- title?: string
- directionKey?: string
- priority?: number
- horizon?: now | today | week | month | long_term
- status?: active | paused | suggested | unresolved
- confidence?: number
- evidence?: string[]

Rules:

- active and user-confirmed goals may increase direction importance.
- suggested or unresolved goals have reduced influence.
- goals do not create obligation by themselves.

## 9. Recent activity signal

TYPE RecentActivitySignal:
- windowLabel?: last_3h | today | week | custom
- directionMinutes?: Record<string, number>
- directionEventCounts?: Record<string, number>
- overloadDirections?: string[]
- neglectedDirections?: string[]
- recoverySignals?: string[]
- confidence?: number

Rules:

- recent activity can identify over-attended and neglected directions.
- lack of activity data reduces confidence.
- high activity in one direction may reduce its weakness score or increase overload/recovery need.
- low activity in another direction may increase neglect signal.

## 10. State hook signal

TYPE StateHookSignal:
- hookKey: string
- relatedDirectionKey?: string
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

Rules:

- State hook can affect ranking.
- State hook is not State Fact.
- State hook must not create State Fact / Delta / Snapshot.
- Pain/fatigue/stress hooks must not become diagnosis.

## 11. Obligation signal

TYPE ObligationSignal:
- obligationKey?: string
- title?: string
- directionKey?: string
- urgency?: low | medium | high
- dueAt?: string
- confidence?: number
- evidence?: string[]

Rules:

- obligations may increase urgency.
- obligations must not be moral judgment.
- missing due dates reduce confidence.

## 12. User priority signal

TYPE UserPrioritySignal:
- directionKey: string
- priority?: number
- source?: explicit_user_choice | profile_preference | recent_feedback | manual
- confidence?: number
- evidence?: string[]

Rules:

- explicit user choice has high influence.
- profile preference is weaker than explicit current choice.
- user may override ranking by choosing a different direction.

## 13. Ranking policy

TYPE WeakDirectionRankingPolicy:
- maxDirectionsToShow?: number
- requireUserChoice?: true
- allowSystemEstimate?: boolean
- allowSuggestedGoals?: boolean
- unresolvedConceptHandling?: reduce_confidence | block_strong_claim | ignore
- safetyMode?: normal | cautious | strict
- explanationMode?: compact | full

Default policy:

- maxDirectionsToShow: 7
- requireUserChoice: true
- allowSystemEstimate: true
- allowSuggestedGoals: true with reduced weight
- unresolvedConceptHandling: reduce_confidence
- safetyMode: cautious
- explanationMode: full

## 14. Draft scoring components

Weakness score should be composed from explainable components:

- neglectComponent
- goalPriorityComponent
- obligationUrgencyComponent
- userPriorityComponent
- stateHookNeedComponent
- recentBalanceComponent
- recoveryNeedComponent
- overloadPenalty
- unresolvedConceptPenalty
- safetyPenalty
- confidenceAdjustment

Draft formula:

weaknessScore(direction) =
neglectComponent
+ goalPriorityComponent
+ obligationUrgencyComponent
+ userPriorityComponent
+ stateHookNeedComponent
+ recentBalanceComponent
+ recoveryNeedComponent
- overloadPenalty
- unresolvedConceptPenalty
- safetyPenalty
+ confidenceAdjustment

Important:

- This score is a planning signal.
- It is not a final truth.
- It does not choose action by itself.
- It does not create NBA.
- It must be explainable.

## 15. Draft component ranges

Suggested internal planning ranges:

- neglectComponent: 0.0 to 2.0
- goalPriorityComponent: 0.0 to 1.5
- obligationUrgencyComponent: 0.0 to 1.5
- userPriorityComponent: 0.0 to 2.0
- stateHookNeedComponent: -1.0 to 1.5
- recentBalanceComponent: -1.0 to 1.0
- recoveryNeedComponent: 0.0 to 1.5
- overloadPenalty: 0.0 to 2.0
- unresolvedConceptPenalty: 0.0 to 1.5
- safetyPenalty: 0.0 to 2.0
- confidenceAdjustment: -1.0 to 0.5

These ranges are not final production values.

## 16. Ranking output model

TYPE WeakDirectionRankingResult:
- rankedDirections: RankedDirection[]
- summary: string
- explanation: WeakDirectionRankingExplanation
- warnings: WeakDirectionWarning[]
- blockers: WeakDirectionBlocker[]
- noWrite: true

TYPE RankedDirection:
- directionKey: string
- title?: string
- rank: number
- weaknessScore?: number
- weaknessBand?: very_low | low | medium | high | very_high
- urgencyBand?: low | medium | high
- confidence?: number
- components?: WeakDirectionComponentBreakdown
- whyWeak?: string[]
- whyLowerPriority?: string[]
- whyNotCertain?: string[]
- userChoiceRequired: true

## 17. Component breakdown

TYPE WeakDirectionComponentBreakdown:
- neglectComponent?: number
- goalPriorityComponent?: number
- obligationUrgencyComponent?: number
- userPriorityComponent?: number
- stateHookNeedComponent?: number
- recentBalanceComponent?: number
- recoveryNeedComponent?: number
- overloadPenalty?: number
- unresolvedConceptPenalty?: number
- safetyPenalty?: number
- confidenceAdjustment?: number

Every visible ranked direction should be explainable through component breakdown or natural-language summary.

## 18. Score bands

Draft bands:

- very_low
- low
- medium
- high
- very_high

Band meaning:

- very_low: direction does not currently look weak based on available data.
- low: slight signal of weakness or missing attention.
- medium: plausible weakness but requires confirmation.
- high: strong signal that direction may need attention.
- very_high: strong signal plus urgency, but still requires user choice.

High or very_high does not mean the user must act.

## 19. Confidence model

Confidence should be separated from weakness score.

Weakness score answers:

> How weak does this direction appear?

Confidence answers:

> How reliable is this estimate?

Confidence decreases when:

- recent activity data is missing;
- goals are suggested or unresolved;
- state hooks are low-confidence;
- obligations are unclear;
- user priority is unknown;
- many unresolved concepts exist;
- safety or privacy restrictions hide details.

## 20. Blockers

Possible blockers:

- no_directions_available
- missing_recent_activity_context
- unresolved_concepts_too_high
- unsafe_claim_risk
- privacy_scope_mismatch
- user_choice_required
- insufficient_evidence

Blockers should prevent strong claims, not necessarily prevent showing a cautious ranked list.

## 21. Warnings

Possible warnings:

- ranking_is_preview
- user_choice_required
- weakness_not_nba
- state_hook_not_state_fact
- unresolved_concepts_reduce_confidence
- safety_caution_required
- missing_context_reduces_confidence
- no_write_mode

## 22. Explanation model

TYPE WeakDirectionRankingExplanation:
- short: string
- whyTopDirectionsLookWeak: string[]
- whatReducedConfidence: string[]
- whatRequiresUserChoice: string[]
- safetyNotes: string[]
- noWriteNotes: string[]

Minimum explanation must show:

- why the top direction is ranked high;
- what evidence was used;
- what is missing;
- why user choice is required;
- why this is not final NBA;
- why no state facts or writes were created.

## 23. Example — languages

Direction:

- languages

Evidence:

- user goal: German job readiness;
- recent activity: little German today;
- available time: 20 minutes;
- fatigue signal: medium.

Possible ranking:

- languages may appear high.

Explanation:

- The direction aligns with an active goal.
- Recent activity may be low.
- Available time may fit a short language action.
- Fatigue reduces confidence for active drills.
- User must still choose the direction.

## 24. Example — health/recovery

Direction:

- health_recovery

Evidence:

- high physical load today;
- fatigue signal suggested;
- sleep quality low;
- recent physical training already completed.

Possible ranking:

- health_recovery may appear high as recovery need.
- intense training may be penalized.

Explanation:

- Recovery need can increase weakness/need score.
- Overload penalty reduces active training recommendation.
- This is not medical advice.
- State hooks are not state facts.

## 25. Example — commercial

Direction:

- commercial

Evidence:

- business development goal active;
- recent commercial activity low;
- unresolved ICP concept exists.

Possible ranking:

- commercial may appear medium/high.
- confidence reduced by unresolved ICP.

Explanation:

- The direction supports business development.
- But unresolved ICP reduces confidence.
- The next safe action may later be review/confirm ICP, not immediate outreach.

## 26. No-write boundary

C34-B.2 output is planning-only.

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
- no production recommendation;
- no final Next Best Action.

## 27. Acceptance criteria for C34-B.2

C34-B.2 is complete when:

- Direction registry draft is documented.
- Weak direction input model is documented.
- Direction candidate model is documented.
- Evidence model is documented.
- Ranking policy is documented.
- Draft scoring components are documented.
- Weakness score is separated from confidence.
- Output model is documented.
- Blockers and warnings are documented.
- Examples are documented.
- No-write boundary is preserved.
- C34-B.3 can define user choice + action candidate package separately.

## 28. Next step

C34-B.3 — User choice + action candidate package model.

C34-B.3 should define:

- how user chooses a direction;
- how action candidates are packaged;
- how Similarity/Relevance support may be attached;
- how safety and uncertainty are shown;
- how no final NBA is created before user confirmation.

## 29. Final status

C34-B.2 is documentation-only.

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
