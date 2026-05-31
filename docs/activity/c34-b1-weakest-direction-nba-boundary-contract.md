# C34-B.1 — Weakest Direction / Next Best Action Boundary Contract

Дата: 31.05.2026  
Статус: documentation contract / no runtime changes  
Ветка: C34-B — Weakest Direction + Next Best Action package  
Шаг: 1 из 5  

## 1. Назначение

Этот документ открывает блок C34-B.

C34-B.1 фиксирует базовый контракт различия между:

- Weakest Direction;
- user-selected direction;
- action candidates;
- Next Best Action preview;
- final user decision.

C34-B.1 НЕ реализует Weakest Direction engine.  
C34-B.1 НЕ реализует Next Best Action engine.  
C34-B.1 НЕ создаёт runtime route.  
C34-B.1 НЕ создаёт TypeScript adapter.  
C34-B.1 НЕ выполняет SQL.  
C34-B.1 НЕ читает и не пишет DB.  
C34-B.1 НЕ создаёт Value Objects, State Facts, State Deltas, State Snapshots or Semantic Capital.

## 2. Контекст после C34-A

C34-A закрыл planning layer для Similarity/Relevance:

- Similarity = structural similarity by weighted category overlap.
- Relevance = context-sensitive applicability.
- Similarity is not Relevance.
- Relevance is not Next Best Action by itself.
- Similarity/Relevance do not create medical, financial or productivity truth.
- Similarity/Relevance do not create hidden writes.

C34-B может использовать C34-A outputs as inputs, but must not treat them as final Next Best Action.

## 3. Главная граница C34-B

C34-B должен построить безопасный слой выбора направления и кандидатов действий.

C34-B не должен сразу говорить:

- "это лучшее действие";
- "делай это сейчас";
- "это гарантированно улучшит здоровье";
- "это финансово оптимально";
- "это доказывает продуктивность";
- "это диагноз";
- "это объективная истина".

C34-B должен показывать:

- какое направление выглядит слабым;
- почему оно выглядит слабым;
- какая уверенность;
- какие данные отсутствуют;
- какие направления есть в списке;
- какое направление пользователь выбирает;
- какие action candidates подходят под выбранное направление;
- почему candidate может подойти;
- что является preview, not final truth.

## 4. Weakest Direction — определение

Weakest Direction означает направление, которое выглядит недополучающим внимания, ресурсов, восстановления или действий относительно целей, контекста и доступных сигналов.

Weakest Direction отвечает на вопрос:

> "Какое направление сейчас выглядит наиболее просевшим или требующим внимания?"

Weakest Direction НЕ отвечает на вопрос:

> "Что пользователь обязан сделать?"

Weakest Direction НЕ является:

- диагнозом;
- моральной оценкой;
- финансовым советом;
- продуктивностной истиной;
- final Next Best Action.

## 5. Direction list

Initial top-level direction candidates:

- health_recovery;
- family;
- finance;
- career;
- languages;
- project;
- work;
- social;
- rest;
- commercial;
- personal_admin;
- other.

The list may be expanded later.

Direction should be visible to the user in ranked form, but ranking must be explainable and cautious.

## 6. Weakness score boundary

Weakness score is a planning signal.

It may use:

- neglected activity signals;
- goal priority;
- recent activity balance;
- obligations;
- user-selected priorities;
- state hooks;
- available time;
- risk flags;
- unresolved concepts;
- manual user input.

It must not use invented data.

Missing data must reduce confidence.

## 7. User choice boundary

C34-B should not force a direction.

Correct flow:

1. System shows ranked directions from weaker to stronger.
2. System explains uncertainty.
3. User chooses which direction to work on.
4. System proposes candidate actions for the selected direction.
5. User may accept, reject, modify or choose another direction.

This preserves user agency.

## 8. Next Best Action preview — definition

Next Best Action preview means a cautious candidate recommendation.

It answers:

> "Which action may fit the selected direction and current context?"

It does NOT mean:

- objectively best action;
- command;
- guarantee;
- medical advice;
- financial advice;
- productivity truth;
- state fact;
- hidden write.

## 9. NBA is downstream of user-selected direction

NBA preview should normally happen after user selects direction.

Allowed:

- "For the selected language direction, this action may fit."
- "This candidate has lower load and fits the available time."
- "Confidence is low because context is missing."
- "This requires confirmation."

Not allowed:

- "The system selected this direction and action for you."
- "This is the best action."
- "Do this now."
- "This will fix the weak direction."
- "This proves fatigue/productivity/financial outcome."

## 10. Relationship to Similarity/Relevance

C34-A outputs may support C34-B.

Similarity can help find structurally similar actions.

Relevance can help evaluate contextual fit.

But:

- Similarity is not Direction weakness.
- Relevance is not Direction weakness.
- Similarity is not NBA.
- Relevance is not NBA.
- NBA must add user choice, direction context, explanation, safety and uncertainty.

## 11. Weak direction input model

TYPE WeakDirectionInput:
- directions?: DirectionCandidate[]
- goals?: GoalSignal[]
- recentActivitySummary?: RecentActivitySignal
- stateHooks?: StateHookSignal[]
- obligations?: ObligationSignal[]
- userSelectedPriority?: string[]
- availableTime?: TimeWindowSignal
- environment?: EnvironmentSignal
- unresolvedConcepts?: string[]
- safetyContext?: SafetySignal
- confidenceContext?: ConfidenceSignal

All input may be partial.

Partial input must not be silently completed by invented facts.

## 12. Direction candidate

TYPE DirectionCandidate:
- directionKey: string
- title?: string
- domain?: string
- currentAttentionScore?: number
- targetAttentionScore?: number
- neglectSignal?: number
- urgencySignal?: number
- userPrioritySignal?: number
- stateHookImpact?: number
- confidence?: number
- evidence?: string[]

## 13. Weak direction output model

TYPE WeakDirectionResult:
- rankedDirections: RankedDirection[]
- explanation: WeakDirectionExplanation
- warnings: string[]
- blockers: string[]
- noWrite: true

TYPE RankedDirection:
- directionKey: string
- rank: number
- weaknessScore?: number
- urgencyBand?: low | medium | high
- confidence?: number
- whyWeak?: string[]
- whyNotCertain?: string[]
- userChoiceRequired: true

## 14. Action candidate input model

TYPE ActionCandidateInput:
- selectedDirection: string
- directionResult?: WeakDirectionResult
- relevanceContext?: object
- similaritySupport?: object
- availableTime?: object
- stateHooks?: object[]
- unresolvedConcepts?: string[]
- userPreferences?: object
- safetyContext?: object

Action candidate generation must not require DB writes.

## 15. Action candidate output model

TYPE ActionCandidatePackage:
- selectedDirection: string
- candidates: ActionCandidatePreview[]
- explanation: string[]
- warnings: string[]
- blockers: string[]
- noWrite: true

TYPE ActionCandidatePreview:
- candidateKey?: string
- title: string
- estimatedDurationMinutes?: number
- estimatedLoad?: low | medium | high | unknown
- expectedSupport?: string[]
- risksOrCosts?: string[]
- confidence?: number
- whyThisMayFit?: string[]
- whyThisMayNotFit?: string[]
- requiresConfirmation?: boolean

## 16. Required explanation

Every weak direction / NBA preview must explain:

- why a direction is considered weak;
- which evidence was used;
- what is missing;
- whether user choice is required;
- why a candidate action may fit;
- what risks or uncertainty exist;
- why this is not final truth.

## 17. Safety language

Allowed phrases:

- "looks weaker";
- "may need attention";
- "could be a good candidate";
- "confidence is low because...";
- "requires confirmation";
- "this is a preview, not a final decision";
- "this is not medical/financial advice";
- "this does not create a state fact."

Forbidden phrases:

- "this is the best action";
- "you must do this";
- "this will improve your health";
- "this is financially optimal";
- "this proves productivity";
- "this is a diagnosis";
- "this has been written to your state."

## 18. No-write boundary

C34-B.1 output is planning-only.

Forbidden side effects:

- no SQL execution;
- no migration creation;
- no DB read;
- no DB write;
- no route creation;
- no adapter creation;
- no State Fact creation;
- no State Delta creation;
- no State Snapshot creation;
- no Value Object creation;
- no Semantic Capital write;
- no production recommendation;
- no final Next Best Action.

## 19. C34-B block plan

C34-B.1 — Weakest Direction / NBA boundary contract  
C34-B.2 — Weak direction data model and ranking draft  
C34-B.3 — User choice + action candidate package model  
C34-B.4 — No-write NBA preview route / adapter contract  
C34-B.5 — Final lock and next branch decision

## 20. Acceptance criteria for C34-B.1

C34-B.1 is complete when:

- Weakest Direction is defined.
- Weakest Direction is separated from NBA.
- NBA preview is separated from final user decision.
- User choice boundary is documented.
- Similarity/Relevance are only supporting inputs.
- Weak direction input/output model is drafted.
- Action candidate package model is drafted.
- Safety language is documented.
- No-write boundary is preserved.
- C34-B.2 can define weak direction ranking model separately.

## 21. Final status

C34-B.1 is documentation-only.

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
