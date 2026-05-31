# C34-A.2 — Similarity Resolver Data Model and Scoring Draft

Дата: 31.05.2026  
Статус: documentation draft / no runtime changes  
Ветка: C34-A — Similarity/Relevance resolvers  
Шаг: 2 из 5  

## 1. Назначение

Этот документ фиксирует черновую модель данных и scoring draft для Similarity resolver.

C34-A.2 не реализует production resolver.  
C34-A.2 не создаёт runtime route.  
C34-A.2 не выполняет SQL.  
C34-A.2 не читает и не пишет DB.  
C34-A.2 не создаёт Value Objects, State Facts, State Deltas, State Snapshots or Semantic Capital.

Цель шага — подготовить безопасный контракт данных, по которому позже можно будет реализовать no-write preview adapter.

## 2. Связь с C34-A.1

C34-A.1 зафиксировал принцип:

- Similarity = structural similarity by weighted category overlap.
- Relevance = context-sensitive applicability.
- Similarity is not Relevance.
- Relevance is not Next Best Action by itself.
- Neither Similarity nor Relevance may act as medical, financial or productivity truth.

C34-A.2 развивает только Similarity part.

## 3. Что отвечает Similarity resolver

Similarity resolver отвечает на вопрос:

> "Насколько эти два объекта / действия / активности / Value Objects похожи по смысловой структуре?"

Similarity resolver НЕ отвечает на вопросы:

- что лучше сделать сейчас;
- что полезнее для здоровья;
- что продуктивнее;
- что финансово оптимально;
- что является приоритетом;
- что является диагнозом;
- что пользователь обязан сделать.

## 4. Input model

Черновая структура входа:

TYPE SimilarityResolverInput:
- source: SimilarityComparableEntity
- candidates: SimilarityComparableEntity[]
- policy?: SimilarityPolicy
- explanationMode?: compact | full

## 5. Comparable entity

TYPE SimilarityComparableEntity:
- entityId?: string
- entityType:
  - activity_event
  - value_object
  - semantic_bundle
  - action_candidate
  - category_signature
- title?: string
- rawText?: string
- categorySignature: SimilarityCategorySignature
- metadata?:
  - actorId?: string
  - ownerScope?: user | organization | system_reference
  - privacyLevel?: public | internal | private | sensitive
  - sourceRoute?: string
  - createdAt?: string

Boundary:

- entityId is optional because C34-A.2 must support dry/no-write preview objects.
- rawText is optional and must not override resolved categories.
- categorySignature is required.
- privacyLevel may later prevent unsafe cross-object comparison.

## 6. Category signature

TYPE SimilarityCategorySignature:
- categories: SimilarityCategoryItem[]
- signatureStatus:
  - resolved
  - partially_resolved
  - suggested
  - unresolved
- evidenceSummary?: string

The signature may come from:

- stable semantic bundle;
- product semantic preview;
- activity capture review;
- value object semantic profile;
- resolver candidate preview.

## 7. Category item

TYPE SimilarityCategoryItem:
- categoryKey: string
- canonicalSlug?: string
- label?: string
- categoryType:
  - action
  - object
  - context
  - role
  - duty
  - care
  - purpose
  - metric
  - domain
  - participant
  - language
  - skill
  - physical_load
  - cognitive_load
  - commercial_context
  - family_context
  - other
- semanticLayer?:
  - raw
  - normalized
  - local_category
  - external_concept
  - resolved_category
  - bundle
- resolutionStatus:
  - confirmed
  - user_confirmed
  - system_resolved
  - suggested
  - external_suggested
  - unresolved
  - rejected
- confidence?: number
- evidenceStrength?: number
- userConfirmed?: boolean
- source?: local_seed | user_history | external_concept | llm_candidate | manual
- weightOverride?: number

## 8. Category status policy

Similarity resolver must not treat every category equally.

Draft policy:

- confirmed: include with normal weight.
- user_confirmed: include with strong weight.
- system_resolved: include with normal/medium weight.
- suggested: include with reduced weight or require policy flag.
- external_suggested: include with reduced weight only.
- unresolved: exclude or include with near-zero weight.
- rejected: exclude.

Rationale:

- AI output is candidate, not truth.
- External concept is not internal category.
- Unresolved terms should not dominate similarity.
- User correction / confirmation should increase local trust.

## 9. Draft category weights

Initial draft weights are policy-level defaults, not final business truth.

Draft base weights:

- action: 1.2
- object: 1.2
- purpose: 1.1
- domain: 1.0
- context: 0.8
- role: 1.0
- duty: 1.0
- care: 1.0
- metric: 0.9
- participant: 0.7
- language: 1.0
- skill: 1.0
- physical_load: 0.9
- cognitive_load: 0.9
- commercial_context: 0.8
- family_context: 0.8
- other: 0.5

Draft resolution multipliers:

- confirmed: 1.0
- user_confirmed: 1.15
- system_resolved: 0.9
- suggested: 0.45
- external_suggested: 0.35
- unresolved: 0.0
- rejected: 0.0

Draft semantic layer multipliers:

- raw: 0.2
- normalized: 0.4
- local_category: 0.8
- external_concept: 0.35
- resolved_category: 1.0
- bundle: 1.0

Important:

- These numbers are draft defaults.
- They must be tuned later with tests and feedback.
- They must not create hidden recommendations.
- They must not become medical/financial/productivity truth.

## 10. Scoring formula

Draft formula: weighted Jaccard similarity.

similarity(A, B) =
weighted_intersection(A.categories, B.categories)
/
weighted_union(A.categories, B.categories)

Where:

- intersection is based on canonicalSlug or categoryKey;
- union includes all included comparable categories;
- each category has a final computed weight;
- rejected and unresolved categories are excluded by default;
- suggested categories have reduced influence;
- user-confirmed categories may have stronger local weight.

## 11. Matching rules

Basic exact match:

A.categoryKey == B.categoryKey

Preferred match:

A.canonicalSlug == B.canonicalSlug

Future compatible match:

category_external_mapping confirms that both terms refer to the same internal controlled category.

Examples:

- bicycle / bike / rower / Fahrrad / bicicleta / велосипед may map to the same controlled internal category.
- math with child and math alone may overlap on math, learning, study, but differ on caregiving / parental care.
- pull-ups and lat pulldown may overlap on pulling movement and back training, but differ by equipment/context/bodyweight.

## 12. Output model

TYPE SimilarityResolverResult:
- source: SimilarityComparableEntity
- results: SimilarityCandidateResult[]
- policyUsed: SimilarityPolicySummary
- warnings: SimilarityWarning[]
- noWrite: true

TYPE SimilarityCandidateResult:
- candidate: SimilarityComparableEntity
- score: number
- scoreBand: very_low | low | medium | high | very_high
- confidence: number
- overlap: SimilarityOverlapBreakdown
- explanation: SimilarityExplanation
- blockers?: SimilarityBlocker[]

## 13. Score bands

Draft bands:

- 0.00–0.19: very_low
- 0.20–0.39: low
- 0.40–0.59: medium
- 0.60–0.79: high
- 0.80–1.00: very_high

Important:

- high similarity does not mean high relevance;
- high similarity does not mean safe recommendation;
- high similarity does not mean next best action;
- high similarity does not mean user should perform the action.

## 14. Overlap breakdown

TYPE SimilarityOverlapBreakdown:
- matchedCategories: SimilarityCategoryMatch[]
- sourceOnlyCategories: SimilarityCategoryItem[]
- candidateOnlyCategories: SimilarityCategoryItem[]
- ignoredCategories: SimilarityIgnoredCategory[]
- weightedIntersection: number
- weightedUnion: number

The explanation must show:

- which categories matched;
- which important categories were different;
- which categories were ignored and why;
- whether suggested/unresolved categories affected confidence.

## 15. Explanation model

TYPE SimilarityExplanation:
- short: string
- whySimilar: string[]
- whyDifferent: string[]
- uncertainty: string[]
- userVisibleCaution: string[]

Example explanation:

- short: These activities look similar because both are language listening practice.
- whySimilar:
  - Both include language learning.
  - Both include listening comprehension.
  - Both are study activities.
- whyDifferent:
  - One is German-focused and the other is English-focused.
  - One is job-interview oriented and the other is general comprehension.
- uncertainty:
  - Some purpose categories are suggested, not user-confirmed.
- userVisibleCaution:
  - Similarity does not mean this is the best action now.

## 16. Confidence model

Similarity score and confidence are separate.

Score answers:

> How similar are these semantic signatures?

Confidence answers:

> How reliable is this similarity estimate?

Confidence may decrease when:

- many categories are unresolved;
- categories are only external_suggested;
- evidence is weak;
- raw text is ambiguous;
- language detection is uncertain;
- category signature is partial;
- privacy constraints hide important details;
- category mapping is not confirmed.

## 17. Blockers and warnings

Possible blockers:

- missing_category_signature
- all_categories_unresolved
- privacy_scope_mismatch
- rejected_category_present
- insufficient_evidence
- unsupported_entity_type

Possible warnings:

- suggested_categories_downweighted
- external_concepts_not_confirmed
- similarity_not_relevance
- no_write_mode
- requires_user_review

## 18. Privacy and ownership boundary

Similarity resolver must not compare sensitive/private user objects across users or organizations unless a later explicit policy allows it.

Default rule:

- same user private objects can be compared in user-local context;
- organization objects can be compared in organization-approved context;
- public/reference objects can be compared as reference;
- sensitive health/family/finance details require cautious explanation and no public exposure.

## 19. No-write boundary

C34-A.2 output is planning-only.

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

## 20. Example — language learning

Source:

- German listening practice for B2 job interview

Candidate:

- English listening practice for general comprehension

Likely matched categories:

- language learning;
- listening;
- comprehension;
- study activity.

Different categories:

- German vs English;
- job interview vs general comprehension.

Similarity:

- medium/high.

Relevance:

- not decided here.

## 21. Example — family care

Source:

- Teach math with child

Candidate:

- Study math alone

Matched:

- math;
- learning;
- study.

Different:

- caregiving;
- parental care;
- family duty;
- participant child.

Similarity:

- medium.

Important:

- without role/duty/care categories, this comparison would be misleading.

## 22. Example — physical training

Source:

- Pull-ups

Candidate:

- Lat pulldown

Matched:

- pulling movement;
- back training;
- upper body strength.

Different:

- bodyweight vs machine/external load;
- home/training context may differ;
- fatigue/risk relevance is not decided here.

Similarity:

- high.

Relevance:

- not decided here.

## 23. Acceptance criteria for C34-A.2

C34-A.2 is complete when:

- Comparable entity model is documented.
- Category signature model is documented.
- Category item model is documented.
- Similarity scoring formula is documented.
- Weight policy draft is documented.
- Output model is documented.
- Explanation model is documented.
- Confidence is separated from score.
- Similarity remains separated from Relevance and NBA.
- No-write boundary is preserved.
- C34-A.3 can define Relevance context model separately.

## 24. Next step

C34-A.3 — Relevance resolver context model and scoring draft.

C34-A.3 must not reuse Similarity score as relevance score.  
Similarity may be one input into Relevance, but not the decision itself.

## 25. Final status

C34-A.2 is documentation-only.

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
