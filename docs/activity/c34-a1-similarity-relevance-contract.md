# C34-A.1 — Similarity / Relevance Contract

Дата: 31.05.2026  
Статус: documentation contract / no runtime changes  
Ветка: C34-A — Similarity/Relevance resolvers  
Шаг: 1 из 5  

## 1. Назначение

Этот документ фиксирует базовый контракт различия между Similarity и Relevance для GPT-APP / AI-NAVIGATOR.

Цель C34-A.1 — не реализовать resolver, а зафиксировать правила, которые не позволят смешать:

- похожесть объектов;
- применимость объекта или действия сейчас;
- рекомендацию следующего действия;
- медицинскую, финансовую или продуктивностную "истину".

## 2. Контекст после C33-U

Фактическая точка перед C34:

- C33-O–C33-U закрыты в фактической backend/product/state-readiness логике.
- C33-U был использован как State schema draft / persistence readiness.
- Старый смысл Roadmap v2, где C33-U означал Similarity/Relevance, перенесён в новую ветку C34-A.
- Production writes закрыты.
- SQL/migration/DB write gates закрыты.
- State Fact / Delta / Snapshot writes закрыты.
- Value Object writes and Semantic Capital writes закрыты.
- C34-A начинается как no-write semantic resolver planning branch.

## 3. Неприкосновенные правила

1. Activity Event remains source of truth.
2. AI output is candidate, not truth.
3. External concept is not internal category.
4. Category is not State Fact.
5. State hook is not State Fact / Delta / Snapshot.
6. Unified Value Object remains unified; no hard subtypes.
7. Similarity is not Relevance.
8. Relevance is not Next Best Action by itself.
9. Next Best Action must not be medical, financial or productivity truth.
10. No hidden writes.

## 4. Similarity — определение

Similarity означает структурную похожесть двух объектов, действий, активностей или Value Objects.

Similarity отвечает на вопрос:

> "На что это похоже по смысловой структуре?"

Similarity считается по пересечению и весам категорий.

Пример:

- "немецкий язык B2 listening practice"
- "английский язык listening comprehension"

Они могут быть похожи, потому что имеют общие semantic dimensions:

- language learning;
- listening;
- comprehension;
- skill training;
- study activity.

Similarity не означает, что одно действие сейчас полезно, безопасно или приоритетно.

## 5. Relevance — определение

Relevance означает применимость, важность или уместность объекта/действия в текущем контексте пользователя.

Relevance отвечает на вопрос:

> "Насколько это имеет смысл именно сейчас, с учётом целей, состояния, ограничений и контекста?"

Relevance зависит от:

- goals;
- current weak directions;
- state hooks;
- available time;
- energy / fatigue / recovery signals;
- obligations;
- environment;
- user-selected direction;
- privacy/safety flags;
- unresolved concepts;
- historical usefulness;
- current constraints.

Пример:

Две активности могут быть очень похожи по Similarity:

- "30 минут немецкого listening"
- "30 минут английского listening"

Но Relevance может быть разной:

- если сейчас слабое направление — German job readiness, немецкий может быть релевантнее;
- если завтра English interview, английский может быть релевантнее;
- если пользователь устал, passive listening может быть релевантнее active grammar drill;
- если activity contains unresolved terms, recommendation confidence must decrease.

## 6. Что Similarity НЕ делает

Similarity не должна:

- выбирать следующее лучшее действие;
- утверждать полезность действия;
- утверждать безопасность действия;
- утверждать приоритетность действия;
- создавать State Fact / Delta / Snapshot;
- создавать Value Object;
- создавать Semantic Capital;
- делать medical/financial/productivity claims;
- заменять user confirmation.

## 7. Что Relevance НЕ делает

Relevance не должна:

- подменять diagnosis;
- подменять financial advice;
- подменять professional productivity judgment;
- автоматически создавать write operations;
- утверждать причинность без evidence;
- превращать state hook в state fact;
- игнорировать unresolved semantic candidates;
- игнорировать privacy/safety boundaries.

## 8. Базовая модель Similarity Score

Similarity score может быть рассчитан как weighted overlap между category signatures.

Черновая формула:

similarity(A, B) =
weighted_intersection(A.categories, B.categories)
/
weighted_union(A.categories, B.categories)

Где category weights могут учитывать:

- semantic_layer;
- category_type;
- confidence;
- resolution_status;
- evidence strength;
- user-confirmed status;
- domain importance.

## 9. Категории для Similarity

Similarity может использовать категории типа:

- action;
- object;
- context;
- role;
- duty;
- care;
- purpose;
- metric;
- domain;
- participant;
- language;
- skill;
- physical load;
- cognitive load;
- commercial context;
- family context.

Но unresolved / suggested categories must have lower weight or be excluded depending on resolver policy.

## 10. Базовая модель Relevance Score

Relevance score не должен считаться только по category overlap.

Relevance должен учитывать:

1. Similarity as one possible input.
2. Current weak direction.
3. User-selected direction.
4. State hooks and risk flags.
5. Available time window.
6. Current location / environment.
7. Obligations and schedule.
8. Energy and recovery signals.
9. Goal priority.
10. Recent activity history.
11. Privacy and safety constraints.
12. Confidence and evidence.
13. Unresolved semantic concepts.
14. User feedback history.

Черновая структура:

relevance(candidate, context) =
goal_alignment
+ weak_direction_impact
+ state_compatibility
+ time_window_fit
+ environment_fit
+ user_preference_fit
+ historical_effectiveness
+ similarity_support
- safety_penalty
- unresolved_concept_penalty
- overload_penalty
- privacy_risk_penalty

## 11. Similarity vs Relevance examples

### Example 1 — language learning

Activity A:
"German listening practice for B2 job interview"

Activity B:
"English listening practice for general comprehension"

Similarity:
High enough, because both are language listening/comprehension activities.

Relevance:
Different. German may be more relevant if the user's current strategic goal is German job readiness.

### Example 2 — physical activity

Activity A:
"Pull-ups"

Activity B:
"Lat pulldown"

Similarity:
High, because both involve back/pulling movement.

Relevance:
Different. Pull-ups may be less relevant if fatigue/risk hooks indicate overload or joint strain.

### Example 3 — commercial work

Activity A:
"Write B2B outbound email"

Activity B:
"Prepare discovery call script"

Similarity:
Medium/high, because both relate to B2B sales.

Relevance:
Depends on pipeline stage, current goal, available time and whether a real client contact exists.

### Example 4 — family care

Activity A:
"Teach math with child"

Activity B:
"Study math alone"

Similarity:
Medium, because both involve math learning.

Relevance:
Different because "teach math with child" includes caregiving / parental care / family duty meaning.

## 12. Resolver output boundary

C34-A resolver outputs must remain no-write until later gates.

Allowed output:

- similarity candidates;
- similarity score;
- relevance candidates;
- relevance score;
- explanation;
- confidence;
- evidence list;
- missing data;
- safety notes;
- unresolved blockers.

Not allowed:

- creating or updating Value Objects;
- writing state facts;
- writing state deltas;
- writing state snapshots;
- writing Semantic Capital;
- making production recommendations without user-visible explanation;
- hidden writes.

## 13. Required explanation fields

Every future Similarity/Relevance result should be explainable.

Minimum explanation:

- why similar;
- which categories overlapped;
- which categories were different;
- why relevant now;
- which constraints affected relevance;
- what evidence was used;
- what is uncertain;
- whether user confirmation is needed.

## 14. Safety language

The system must use cautious language.

Allowed:

- "may be relevant";
- "looks similar because...";
- "could be useful if your current priority is...";
- "confidence is low because...";
- "requires confirmation";
- "this is a signal, not a confirmed fact".

Not allowed:

- "this will improve your health";
- "this proves fatigue";
- "this is the best action";
- "this guarantees productivity";
- "this is financially optimal";
- "this is a diagnosis".

## 15. C34-A block plan

C34-A.1 — Similarity/Relevance contract  
C34-A.2 — Similarity resolver data model and scoring draft  
C34-A.3 — Relevance resolver context model and scoring draft  
C34-A.4 — No-write preview route / adapter contract  
C34-A.5 — Final lock and next branch decision

## 16. Acceptance criteria for C34-A.1

C34-A.1 is complete when:

- Similarity and Relevance are explicitly separated.
- Similarity is defined as weighted category overlap.
- Relevance is defined as context-sensitive applicability.
- Similarity is forbidden from directly producing NBA.
- Relevance is forbidden from acting as medical/financial/productivity truth.
- No-write boundary is preserved.
- Future C34-A.2/C34-A.3 implementation direction is clear.

## 17. Final status

C34-A.1 is a documentation-only contract.

No runtime changes.
No SQL.
No migration.
No DB reads.
No DB writes.
No production behavior changes.
No Value Object writes.
No State Fact / Delta / Snapshot writes.
No Semantic Capital writes.
