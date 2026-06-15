# GPT-APP / AI-NAVIGATOR — FACTS STEP 2/12

## Activity Facts Vocabulary Lock

Version: FACTS_VOCABULARY_LOCK_V1_20260615  
Status: source/doc vocabulary lock  
Scope: Activity Event facts, measures, semantic object candidates, review statuses  
Non-scope: SQL execution, Supabase write, OpenAI call, final analytics rollup

---

## 1. Purpose

This document locks the vocabulary for the Activity Facts layer before SQL/API implementation.

The user writes a natural message in the right AI panel, for example:

- “Ездил на велосипеде 2 часа”
- “Спал 8 часов”
- “Выпил 3 стакана воды”
- “Разговаривал с ребёнком 30 минут”
- “Сделал 8 подтягиваний”

The system must classify the message, extract measures, propose object facts, show a review card, and create records only after explicit user confirmation.

---

## 2. Non-negotiable rules

| Rule | Meaning |
|---|---|
| No hidden write | No Activity Event or Fact row is created before explicit confirmation. |
| User-owned facts | Every confirmed fact must contain user/actor ownership. |
| Value Object is optional at first | A fact may have `value_object_id = null` and keep `semantic_object_key`. |
| Candidate is not truth | AI extraction creates candidates, not final facts. |
| Time exposure is not chronological double-counting | One 120-minute activity may expose 120 minutes to cycling, legs and cardio, but chronological time remains 120 minutes. |
| Standards are not facts | Value Object standards/targets are stored separately from personal facts. |

---

## 3. Classifier kinds

| Kind | Meaning |
|---|---|
| ordinary_chat | Normal chat; no activity fact flow. |
| obvious_activity | The message clearly describes a completed/current activity. |
| ambiguous_activity | The message may describe activity/state, but needs confirmation. |
| dual_intent_question_activity | The message asks a question and also contains activity-like content. |

---

## 4. Lifecycle statuses

| Status | Meaning | Persistence |
|---|---|---|
| ordinary_chat | Message is not an activity. | No fact persistence. |
| activity_candidate | Activity was detected as candidate. | Review only. |
| activity_review | Measures/categories are shown to user. | Review only. |
| confirmed_fact | User confirmed saving. | Creates Activity Event and fact rows. |
| corrected_fact | User corrected saved fact. | Creates correction/audit and invalidates analytics. |
| rejected_candidate | User rejected candidate. | No analytic fact; optional rejected audit later. |

---

## 5. Event statuses

| Status | Meaning |
|---|---|
| draft | Local/server draft before final confirmation. |
| review | Waiting for user review. |
| confirmed | User confirmed and save is valid. |
| corrected | Later correction exists. |
| rejected | User rejected candidate. |
| superseded | Replaced by correction/new version. |
| deleted | User deleted or removed from active analytics. |

---

## 6. Measure types and units

| measure_type | Allowed units | Examples |
|---|---|---|
| duration | minute, hour | sleep, work, cycling, German study |
| distance | meter, kilometer | walk, run, cycling |
| count | count | glasses, tasks, cigarettes |
| volume | milliliter, liter | water, drinks |
| mass | gram, kilogram | food, protein, creatine |
| money | pln, eur, usd | expense, income, sale |
| energy | kcal | nutrition, estimated burn |
| repetitions | repetition, set, count | pull-ups, dips, squats |
| state_score | score_0_10 | fatigue, energy, focus |
| state_text | text | pain note, mood note |
| boolean_state | boolean | yes/no state |
| role | role, text | childcare, sales role, family duty |
| context_tag | tag, text | outside, with dog, home, opera |
| derived_metric | km_per_hour, kcal, score_0_10, text | average speed, derived estimate |

---

## 7. Source types

| Source | Meaning |
|---|---|
| user_text | Directly stated by user. |
| user_edit | Edited by user in review/correction. |
| ai_extraction | Extracted from natural text by AI. |
| rule_based | Extracted by deterministic parser/rules. |
| tracker_import | Imported from external tracker/device. |
| derived_calculation | Calculated from other measures. |
| system_default | Default/system suggestion, not user fact by itself. |

---

## 8. Semantic object key

`semantic_object_key` is a stable lower snake_case key for semantic object/category candidate when `value_object_id` is not available yet.

Rules:

- Format: `^[a-z][a-z0-9_]{1,79}$`
- Use English technical keys.
- Keep user-facing label separately in `semantic_object_label`.
- Do not create a Value Object automatically only because a key exists.

Examples:

| semantic_object_key | semantic_object_label |
|---|---|
| cycling | Велосипед |
| physical_activity | Физическая активность |
| leg_work | Работа ногами |
| cardio_load | Кардионагрузка |
| fresh_air | Свежий воздух |
| sleep | Сон |
| water_intake | Вода / потребление воды |
| childcare | Опека / забота о ребёнке |
| business_negotiation | Переговоры с клиентом |

---

## 9. Nullable Value Object link

A fact row must support both cases:

| Case | value_object_id | semantic_object_key | Meaning |
|---|---|---|---|
| Existing Value Object found | UUID | key also stored | Fact is linked to known Value Object. |
| No Value Object yet | null | required | Fact remains semantic candidate and can be linked later. |

This avoids forcing automatic Value Object creation during the first fact persistence layer.

---

## 10. Minimal future tables

This step does not execute SQL. The future SQL draft should use these logical layers:

| Table / layer | Purpose |
|---|---|
| activity_events | Source event from user message/action. |
| activity_event_measures | Direct measures of the event. |
| activity_object_facts | User-owned facts by semantic object / Value Object. |
| activity_fact_review_items | Review candidates, decisions and corrections. |
| recalculation_queue | Analytics recalculation requests after confirmed/corrected facts. |

---

## 11. Example: “Ездил на велосипеде 2 часа”

| Row type | Object / measure | Value |
|---|---|---|
| Activity Event | raw_text | Ездил на велосипеде 2 часа |
| Measure | duration | 120 minute |
| Fact | cycling | 120 minute |
| Fact | physical_activity | 120 minute |
| Fact | leg_work | 120 minute |
| Fact | cardio_load | 120 minute |
| Candidate | fresh_air | 120 minute only if context supports it |
| Candidate / needs data | distance | Do not save if user did not provide distance or tracker data |
| Derived measure | average_speed | Only if distance and duration exist |

---

## 12. Step 2 Definition of Done

- `src/types/activity-facts.ts` exists.
- `docs/activity/facts-vocabulary-lock.md` exists.
- Vocabulary includes measure types, units, statuses, semantic key rules and nullable Value Object link rule.
- No SQL is executed.
- No Supabase write is performed.
- No OpenAI call is performed.
- No commit/push is performed.
- Next step is FACTS STEP 3/12 — SQL-gate draft for facts.
