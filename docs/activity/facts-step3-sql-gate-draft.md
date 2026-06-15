# GPT-APP / AI-NAVIGATOR — FACTS STEP 3/12

## SQL-Gate Draft for Activity Facts

Version: FACTS_STEP3_SQL_GATE_DRAFT_V1_20260615  
Status: draft only  
Scope: future SQL shape for Activity Facts Persistence Layer  
Non-scope: SQL execution, Supabase write, OpenAI call, commit, push

---

## 1. What was prepared

This step prepares a SQL draft under:

`docs/sql/FACTS_STEP3_activity_facts_schema_draft_v1.sql`

The draft is intentionally stored under `docs/sql`, not under `supabase/migrations`.

It is not an executable migration yet.

---

## 2. Tables drafted

| Table | Purpose |
|---|---|
| `activity_event_measures` | Direct extracted/derived measures from one Activity Event. |
| `activity_object_facts` | User-owned facts connected to semantic object keys and optional Value Objects. |
| `activity_fact_review_items` | Review decisions before/after confirmation. |
| `activity_fact_recalculation_queue` | Queue for analytic recalculation after fact/hierarchy changes. |

---

## 3. Main architectural decisions

| Decision | Meaning |
|---|---|
| Facts are user-owned | Every fact table includes `user_id` and optional `actor_id`. |
| Value Object is optional | `activity_object_facts.value_object_id` may be null. |
| Semantic key is required | `semantic_object_key` keeps candidate identity before VO link exists. |
| No chronological double counting | Exposure facts may repeat duration across objects, but chronological time remains in the source event. |
| Parent rollups are not materialized as permanent facts | Parent analytics should be derived through current hierarchy or recalculation cache. |
| Explicit GRANT is included in draft | Future executable migration must include GRANT near RLS policies. |

---

## 4. Why this is not executed now

The current project already has an `activity_events` layer and several semantic persistence/debug routes.

Before any real SQL migration, the project must audit:

1. Existing `activity_events` schema.
2. Existing ownership model: direct `auth.uid()` or app-user/actor mapping.
3. Existing Value Object table and UUID column names.
4. Existing helper functions and updated_at trigger names.
5. Existing RLS/GRANT style.
6. Whether raw candidates should be stored separately before confirmation.

---

## 5. Safety status

| Gate | Status |
|---|---|
| SQL executed | No |
| Supabase write | No |
| OpenAI call | No |
| Runtime code changed | No |
| Commit | No |
| Push | No |

---

## 6. Next step

FACTS STEP 4/12 should be a **schema compatibility audit**.

It should inspect existing local source code and SQL files to answer:

- What exact columns does `activity_events` use?
- How is the app user mapped to Supabase/auth/actor?
- What ownership checks are already used in activity APIs?
- Whether `value_objects.id` is the correct FK target.
- Whether the future SQL draft must use direct `user_id = auth.uid()` or an existing helper.

Only after that audit can SQL be safely converted into an executable migration.
