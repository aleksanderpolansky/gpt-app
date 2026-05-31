# C34-C.1 — Analytics / Semantic Capital / Audit Boundary Contract

Дата: 31.05.2026  
Статус: documentation contract / no runtime changes  
Ветка: C34-C — Analytics / Semantic Capital / Audit  
Шаг: 1 из 5  

## 1. Назначение

Этот документ открывает блок C34-C.

C34-C.1 фиксирует базовые границы между:

- analytics summary;
- semantic capital planning signal;
- evidence trail;
- audit trail;
- correction candidate;
- applied correction;
- feedback loop.

C34-C.1 НЕ реализует analytics engine.  
C34-C.1 НЕ реализует Semantic Capital engine.  
C34-C.1 НЕ создаёт audit runtime.  
C34-C.1 НЕ создаёт correction runtime.  
C34-C.1 НЕ создаёт runtime route.  
C34-C.1 НЕ создаёт TypeScript adapter.  
C34-C.1 НЕ выполняет SQL.  
C34-C.1 НЕ читает и не пишет DB.  
C34-C.1 НЕ создаёт Value Objects, State Facts, State Deltas, State Snapshots or Semantic Capital.

## 2. Контекст после C34-A и C34-B

C34-A закрыл planning layer для Similarity/Relevance:

- Similarity is not Relevance.
- Similarity is not NBA.
- Relevance is not NBA.
- Similarity/Relevance do not create writes.

C34-B закрыл planning layer для Weakest Direction / NBA package:

- Weakest Direction is not NBA.
- Candidate package is not final NBA.
- User choice and confirmation are required.
- No final Next Best Action is created.
- No action is executed.

C34-C должен определить analytics / audit / semantic capital boundaries без открытия write gates.

## 3. Главная граница C34-C

C34-C должен описать, как система может анализировать:

- что было сделано;
- какие направления получили внимание;
- какие сигналы выглядят полезными;
- какие действия могли создать ценность;
- какие выводы требуют проверки;
- какие corrections возможны;
- какие evidence items использованы;
- где нужна ручная валидация.

C34-C не должен превращать аналитику в истину.

## 4. Analytics — определение

Analytics означает интерпретацию activity, direction, candidate, context and feedback signals для построения объяснимых summary.

Analytics отвечает на вопросы:

- что видно по доступным данным;
- какие направления были активнее или слабее;
- какие действия повторялись;
- где есть неопределённость;
- какие данные отсутствуют;
- какие выводы являются предварительными.

Analytics НЕ отвечает на вопросы:

- что объективно продуктивно;
- что гарантированно полезно для здоровья;
- что финансово оптимально;
- что является диагнозом;
- что пользователь обязан сделать;
- что должно быть записано как факт без gate.

## 5. Analytics is not truth

Analytics is not truth.

Analytics summary is a cautious interpretation of available evidence.

Rules:

- analytics may describe patterns;
- analytics may estimate tendencies;
- analytics may show uncertainty;
- analytics may recommend review;
- analytics must not claim objective productivity truth;
- analytics must not create State Facts;
- analytics must not create Semantic Capital writes;
- analytics must not create final NBA.

## 6. Semantic Capital — planning definition

Semantic Capital в C34-C означает planning signal about accumulated meaningful value, learning, improvement, evidence, contribution, repeated effort or confirmed usefulness.

Semantic Capital may later help answer:

- which actions created reusable value;
- which repeated activities improved user/project understanding;
- which categories gained stronger evidence;
- which directions accumulated confirmed progress;
- which outputs deserve higher trust after feedback.

In C34-C.1 this is only a planning concept.

Semantic Capital is not money.

Semantic Capital is not platform points.

Semantic Capital is not financial value.

Semantic Capital is not productivity truth.

Semantic Capital is not automatically written.

## 7. Semantic Capital write boundary

Semantic Capital may be discussed as a future model, but C34-C.1 must not write it.

Forbidden:

- no semantic capital insert;
- no semantic capital update;
- no semantic capital score persistence;
- no hidden capital accumulation;
- no points-like conversion;
- no financial claim;
- no leaderboard;
- no public reputation change.

Allowed:

- planning contract;
- possible dimensions;
- possible evidence sources;
- no-write scoring draft later;
- audit requirements;
- correction requirements.

## 8. Audit — definition

Audit means an explainable record of why the system produced a certain preview, score, candidate, summary or warning.

Audit answers:

- what input was used;
- what evidence was considered;
- what assumptions were made;
- what was uncertain;
- what was excluded;
- which gates were closed;
- why no write happened.

Audit is not automatic correction.

Audit is not user blame.

Audit is not hidden surveillance.

Audit must be explainable and privacy-aware.

## 9. Correction — definition

Correction means a user/system-reviewed adjustment to an earlier candidate, category, state hook, analytics summary or semantic interpretation.

Correction candidate is not applied correction.

Correction candidate may say:

- this category may be wrong;
- this direction mapping may be wrong;
- this candidate explanation may be incomplete;
- this state hook should be reviewed;
- this analytics summary needs confirmation.

Applied correction requires a separate gate.

C34-C.1 does not apply corrections.

## 10. Evidence trail — definition

Evidence trail means a structured explanation of the signals used for analytics, audit or semantic capital preview.

Evidence may include:

- user input;
- activity event;
- reviewed category;
- state hook signal;
- weak direction ranking;
- relevance preview;
- similarity preview;
- user choice;
- user confirmation;
- manual correction;
- system estimate.

Evidence must remain labeled.

System estimate must be labeled as system estimate.

State hook must remain signal, not fact.

## 11. Feedback loop — definition

Feedback loop means user/system feedback that may later improve scoring, ranking, category mapping, relevance or analytics.

Feedback may include:

- user accepted candidate;
- user rejected candidate;
- user edited candidate;
- user confirmed category;
- user rejected category;
- user corrected duration;
- user marked explanation as useful;
- user marked explanation as wrong.

Feedback is not automatically Semantic Capital.

Feedback is not automatically State Fact.

Feedback write requires a separate gate.

## 12. Analytics input boundary

Future analytics may use:

- activity events;
- category signatures;
- similarity results;
- relevance results;
- weak direction rankings;
- user direction choices;
- action candidate packages;
- user confirmations;
- state hooks;
- manual corrections;
- audit rows;
- explicit feedback.

But in C34-C.1:

- no DB read;
- no DB write;
- no runtime query;
- no production analytics.

## 13. Analytics output boundary

Future analytics output may include:

- daily summary;
- direction balance summary;
- category usage summary;
- weak/strong direction summary;
- uncertainty summary;
- evidence summary;
- suggested review items;
- candidate correction items;
- semantic capital preview.

But it must not include:

- objective productivity truth;
- health diagnosis;
- financial guarantee;
- final NBA;
- hidden state writes;
- hidden Semantic Capital writes.

## 14. Privacy boundary

Analytics, audit and semantic capital may include sensitive context.

Default rule:

- private data stays private;
- sensitive data requires cautious explanation;
- health/family/finance signals require careful language;
- public output must not include private/sensitive details;
- cross-user analytics is forbidden by default;
- organization analytics requires organization-approved boundary.

## 15. State boundary

C34-C may use state hooks as signals.

But:

- State hook is not State Fact.
- Analytics summary is not State Fact.
- Semantic Capital preview is not State Fact.
- Correction candidate is not State Delta.
- Audit explanation is not State Snapshot.
- No State Fact / Delta / Snapshot write is allowed in C34-C.1.

## 16. Relationship to C34-A

C34-A Similarity/Relevance results may become evidence for analytics.

But:

- Similarity is not truth.
- Relevance is not truth.
- Similarity/Relevance cannot write Semantic Capital.
- Similarity/Relevance cannot create analytics truth.
- Similarity/Relevance cannot create final NBA.

## 17. Relationship to C34-B

C34-B Weakest Direction and candidate packages may become evidence for analytics.

But:

- Weakness score is not truth.
- Candidate package is not final NBA.
- User confirmation is required for stronger interpretation.
- Candidate acceptance/rejection may be feedback but not automatic capital.

## 18. No hidden writes

No hidden writes.

C34-C.1 must preserve:

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
- no final Next Best Action;
- no action execution.

## 19. C34-C block plan

C34-C.1 — Analytics / Semantic Capital / Audit boundary contract  
C34-C.2 — Analytics summary data model and evidence draft  
C34-C.3 — Semantic Capital planning model and no-write scoring draft  
C34-C.4 — Audit / correction / feedback trail contract  
C34-C.5 — Final lock and next branch decision

## 20. Acceptance criteria for C34-C.1

C34-C.1 is complete when:

- Analytics is defined.
- Analytics is separated from truth.
- Semantic Capital is defined as planning signal.
- Semantic Capital is separated from money/points/productivity truth.
- Semantic Capital write boundary is documented.
- Audit is defined.
- Correction candidate is separated from applied correction.
- Evidence trail is defined.
- Feedback loop is defined.
- Privacy/state boundaries are documented.
- No hidden writes boundary is preserved.
- C34-C.2 can define analytics summary model separately.

## 21. Final status

C34-C.1 is documentation-only.

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
