# C34-B.3 — User Choice + Action Candidate Package Model

Дата: 31.05.2026  
Статус: documentation draft / no runtime changes  
Ветка: C34-B — Weakest Direction + Next Best Action package  
Шаг: 3 из 5  

## 1. Назначение

Этот документ фиксирует модель user choice + action candidate package.

C34-B.3 НЕ реализует Weakest Direction engine.  
C34-B.3 НЕ реализует Next Best Action engine.  
C34-B.3 НЕ создаёт runtime route.  
C34-B.3 НЕ создаёт TypeScript adapter.  
C34-B.3 НЕ выполняет SQL.  
C34-B.3 НЕ читает и не пишет DB.  
C34-B.3 НЕ создаёт Value Objects, State Facts, State Deltas, State Snapshots or Semantic Capital.

Цель шага — описать безопасный пользовательский flow:

1. система показывает ranked directions;
2. пользователь выбирает направление;
3. система формирует package of action candidates;
4. каждый candidate объясняется;
5. пользователь подтверждает, изменяет, отклоняет или выбирает другой вариант.

## 2. Связь с C34-B.1 и C34-B.2

C34-B.1 зафиксировал:

- Weakest Direction is not NBA.
- NBA preview is downstream of user-selected direction.
- User choice is required.
- Similarity/Relevance are supporting inputs only.
- No final Next Best Action is created.

C34-B.2 зафиксировал:

- weak direction input model;
- direction registry draft;
- ranking policy;
- weakness score formula;
- confidence separated from weakness score;
- ranking is preview;
- no-write boundary.

C34-B.3 развивает слой между ranked directions and action candidate package.

## 3. Главная идея

Система не должна автоматически переходить от слабого направления к действию.

Правильный flow:

1. Build WeakDirectionRankingResult.
2. Show ranked directions with uncertainty.
3. Ask user to choose direction.
4. Build ActionCandidatePackage only for selected direction.
5. Show candidates with explanation and safety notes.
6. User chooses, edits, rejects or asks for alternatives.
7. No final NBA is written or executed automatically.

## 4. User choice boundary

User choice is required before action candidates are treated as direction-specific suggestions.

Allowed:

- user chooses one ranked direction;
- user chooses several directions;
- user overrides ranking;
- user asks to ignore a direction;
- user requests alternatives;
- user changes selected direction later.

Not allowed:

- system silently chooses direction;
- system treats top-ranked direction as user-selected;
- system creates final NBA without user choice;
- system writes state/action based only on ranking;
- system hides uncertainty.

## 5. User choice model

TYPE UserDirectionChoice:
- choiceId?: string
- selectedDirectionKey: string
- selectedDirectionTitle?: string
- source:
  - explicit_user_selection
  - user_override
  - user_selected_from_ranked_list
  - manual
- selectedAt?: string
- confidence?: number
- userComment?: string
- rejectedDirectionKeys?: string[]
- alternativeDirectionKeys?: string[]
- noWrite: true

Rules:

- selectedDirectionKey must be explicit.
- If user has not chosen, action package must be marked as preview_pending_user_choice.
- User can override the ranking.
- User choice does not create state fact.
- User choice does not create final NBA.

## 6. Direction selection state

TYPE DirectionSelectionState:
- rankedDirections?: WeakDirectionRankingResult
- userChoice?: UserDirectionChoice
- selectionStatus:
  - no_ranking
  - ranking_ready
  - user_choice_required
  - user_selected
  - user_rejected_all
  - alternatives_requested
- warnings?: string[]
- blockers?: string[]
- noWrite: true

Selection state is UI/workflow state for preview only.

It must not write to DB in C34-B.3.

## 7. Action candidate package input

TYPE ActionCandidatePackageInput:
- selectedDirection: UserDirectionChoice
- directionRankingResult?: WeakDirectionRankingResult
- relevanceContext?: RelevanceContextSummary
- similaritySupport?: SimilaritySupportSummary[]
- recentActivity?: RecentActivitySummary
- stateHooks?: StateHookSignal[]
- availableTime?: TimeWindowSignal
- environment?: EnvironmentSignal
- userPreferences?: UserPreferenceSignal[]
- unresolvedConcepts?: UnresolvedConceptSignal[]
- safetyContext?: SafetySignal
- packagePolicy?: ActionCandidatePackagePolicy

Rules:

- selectedDirection is required.
- Missing context reduces confidence.
- Unresolved concepts reduce confidence or create blocker.
- Safety context may block strong recommendations.
- No DB read is required.
- No write is allowed.

## 8. Action candidate package policy

TYPE ActionCandidatePackagePolicy:
- maxCandidates?: number
- requireUserConfirmation?: true
- explanationMode?: compact | full
- safetyMode?: normal | cautious | strict
- allowLowConfidenceCandidates?: boolean
- allowRecoveryCandidates?: boolean
- allowReviewActions?: boolean
- unresolvedConceptHandling?:
  - reduce_confidence
  - prefer_review_action
  - block_strong_claim

Default policy:

- maxCandidates: 5
- requireUserConfirmation: true
- explanationMode: full
- safetyMode: cautious
- allowLowConfidenceCandidates: true if clearly marked
- allowRecoveryCandidates: true
- allowReviewActions: true
- unresolvedConceptHandling: prefer_review_action

## 9. Action candidate package output

TYPE ActionCandidatePackage:
- packageId?: string
- selectedDirection: UserDirectionChoice
- packageStatus:
  - ready
  - partial
  - blocked
  - user_choice_required
  - review_needed
- candidates: ActionCandidatePreview[]
- explanation: ActionCandidatePackageExplanation
- warnings: ActionCandidateWarning[]
- blockers: ActionCandidateBlocker[]
- noWrite: true

The package is not a final NBA.

It is a structured list of candidates for user review.

## 10. Action candidate preview

TYPE ActionCandidatePreview:
- candidateKey?: string
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
- selectedDirectionKey: string
- estimatedDurationMinutes?: number
- estimatedLoad?: low | medium | high | unknown
- requiredTools?: string[]
- requiredEnvironment?: string[]
- expectedSupport?: string[]
- risksOrCosts?: string[]
- confidence?: number
- candidateBand?: low | medium | high
- whyThisMayFit?: string[]
- whyThisMayNotFit?: string[]
- missingContext?: string[]
- requiresConfirmation: true
- noWrite: true

Important:

- candidateBand is not final NBA rank.
- confidence is not guarantee.
- requiresConfirmation must be true.
- noWrite must be true.

## 11. Candidate sources

Action candidates may come from:

- static templates;
- user-defined goals;
- recent activity gaps;
- relevance preview;
- similarity preview;
- recovery/safety heuristics;
- review-needed unresolved concepts;
- manual user instruction.

Candidate sources must be visible in explanation.

The system must not invent factual user history.

## 12. Candidate source model

TYPE ActionCandidateSource:
- sourceType:
  - static_template
  - user_goal
  - recent_activity_gap
  - relevance_preview
  - similarity_preview
  - recovery_heuristic
  - unresolved_concept_review
  - manual_user_input
  - system_estimate
- sourceLabel?: string
- confidence?: number
- evidence?: string[]
- isUserConfirmed?: boolean

Rules:

- manual_user_input and explicit user goal can have strong weight.
- system_estimate must be labeled.
- unresolved_concept_review may generate safe review actions.
- similarity_preview cannot create NBA by itself.
- relevance_preview cannot create NBA by itself.

## 13. Candidate grouping

Candidate package should group actions by practical mode:

- quick_action
- deep_action
- recovery_action
- review_action
- low_energy_action
- high_focus_action
- social_or_family_action
- commercial_action

This helps user choose based on context and energy.

## 14. Candidate package explanation

TYPE ActionCandidatePackageExplanation:
- short: string
- whyThisDirection: string[]
- howCandidatesWereGenerated: string[]
- whatIncreasedCandidateFit: string[]
- whatReducedCandidateFit: string[]
- uncertainty: string[]
- safetyNotes: string[]
- noWriteNotes: string[]
- userChoiceNotes: string[]

Minimum explanation:

- which direction user selected;
- why candidates are attached to this direction;
- which context influenced the package;
- what is missing;
- why user confirmation is required;
- why this is not final NBA;
- why no writes were created.

## 15. Candidate scoring draft

Candidate score should remain an internal planning signal.

Possible components:

- directionFit
- goalAlignment
- relevanceSupport
- similaritySupport
- timeFit
- environmentFit
- loadFit
- userPreferenceFit
- recoveryCompatibility
- unresolvedConceptPenalty
- safetyPenalty
- missingContextPenalty

Draft formula:

candidatePreviewScore(candidate) =
directionFit
+ goalAlignment
+ relevanceSupport
+ similaritySupport
+ timeFit
+ environmentFit
+ loadFit
+ userPreferenceFit
+ recoveryCompatibility
- unresolvedConceptPenalty
- safetyPenalty
- missingContextPenalty

Important:

- candidatePreviewScore is not final NBA score.
- It must not be shown as objective truth.
- It must be explainable.
- It must not create writes.

## 16. Candidate bands

Draft candidate bands:

- low
- medium
- high

Meaning:

- low: candidate may be relevant but has weak support or missing context;
- medium: candidate plausibly fits selected direction;
- high: candidate appears to fit selected direction and context, but still requires confirmation.

High candidate band does not mean "do this now".

## 17. Confirmation model

TYPE ActionCandidateConfirmation:
- candidateKey?: string
- confirmationStatus:
  - not_requested
  - requested
  - accepted
  - rejected
  - edited
  - postponed
  - alternative_requested
- userComment?: string
- editedTitle?: string
- editedDurationMinutes?: number
- noWrite: true

In C34-B.3, confirmation remains a no-write preview concept.

Later implementation may define what happens after acceptance, but that requires a separate gate.

## 18. Candidate blockers

Possible blockers:

- selected_direction_missing
- user_choice_required
- unresolved_concepts_too_high
- missing_required_context
- unsafe_claim_risk
- privacy_scope_mismatch
- no_safe_candidate_available
- high_risk_action_without_gate
- db_write_required_but_gate_closed

Blockers should prevent strong candidate claims.

## 19. Candidate warnings

Possible warnings:

- package_is_preview
- candidate_not_final_nba
- user_confirmation_required
- similarity_not_nba
- relevance_not_nba
- state_hook_not_state_fact
- unresolved_concepts_reduce_confidence
- safety_caution_required
- missing_context_reduces_confidence
- no_write_mode

## 20. Example — languages

Selected direction:

- languages

Context:

- German job readiness is important.
- Available time: 20 minutes.
- Fatigue signal: medium.
- Recent German activity low.

Candidate package:

1. Passive German listening practice, 15–20 minutes.
2. Review 5 German job-interview phrases.
3. Low-energy shadowing for 10 minutes.
4. Review uncertain vocabulary from previous activity.

Explanation:

- All candidates support selected language direction.
- Passive listening may fit fatigue better than intense grammar.
- Phrase review fits job-readiness goal.
- This is not final NBA and requires user confirmation.

## 21. Example — health/recovery

Selected direction:

- health_recovery

Context:

- high physical load today.
- fatigue signal suggested.
- recent training already completed.

Candidate package:

1. 5-minute mobility / breathing.
2. Short walk with low intensity.
3. Hydration and recovery check.
4. Skip intense upper-body set.

Explanation:

- Recovery candidates fit current load better than intense training.
- This is not medical advice.
- State hooks are not state facts.
- User confirmation is required.

## 22. Example — commercial

Selected direction:

- commercial

Context:

- business development goal active.
- commercial activity low.
- unresolved ICP concept exists.

Candidate package:

1. Review and confirm ICP.
2. Draft one B2B outreach variant.
3. Prepare 3 objection-handling bullets.
4. Update target segment notes.

Explanation:

- Review ICP may be safer than immediate outreach because concept is unresolved.
- Outreach draft can remain a draft, not production send.
- This is not financial advice.
- User confirmation is required.

## 23. No-write boundary

C34-B.3 output is planning-only.

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

## 24. Acceptance criteria for C34-B.3

C34-B.3 is complete when:

- User direction choice model is documented.
- Direction selection state is documented.
- Action candidate package input is documented.
- Action candidate package output is documented.
- Candidate preview model is documented.
- Candidate sources are documented.
- Candidate scoring draft is documented.
- Confirmation model is documented.
- Blockers and warnings are documented.
- Examples are documented.
- User confirmation is required.
- No-write boundary is preserved.
- C34-B.4 can define no-write NBA preview route / adapter contract.

## 25. Next step

C34-B.4 — No-write NBA preview route / adapter contract.

C34-B.4 should define:

- future no-write preview endpoint;
- request/response model;
- explicit false write flags;
- user choice requirement;
- candidate package response shape;
- safety and no-final-NBA boundary.

## 26. Final status

C34-B.3 is documentation-only.

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
