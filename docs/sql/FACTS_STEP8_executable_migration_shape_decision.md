# GPT-APP / AI-NAVIGATOR — FACTS STEP 8/12

## Executable Migration Shape Decision

Version: FACTS_STEP8_EXECUTABLE_MIGRATION_SHAPE_DECISION_V1_20260615  
Status: decision only, no migration created in this step

## 1. Decision

The live schema supports creating the Activity Facts Persistence Layer as new private server-mediated tables.

## 2. Tables to create in Step 9

1. `public.activity_event_measures`
2. `public.activity_object_facts`
3. `public.activity_fact_review_items`
4. `public.activity_fact_recalculation_queue`

## 3. Required FK strategy

| New column | FK target |
|---|---|
| `user_id` | `public.app_users(id)` |
| `performed_by_actor_id` | `public.actors(id)` |
| `acting_as_actor_id` | `public.actors(id)` |
| `acting_for_actor_id` | `public.actors(id)` |
| `activity_event_id` | `public.activity_events(id)` |
| `value_object_id` | `public.value_objects(id)` |

## 4. Required security strategy

Use the `activity_events` security model:

- RLS enabled.
- no direct `anon` access.
- no direct `authenticated` access.
- service-role access only.
- browser uses guarded API route.

## 5. Required updated_at strategy

Reuse:

`public.set_activity_recording_updated_at()`

Do not create a duplicate updated_at helper.

## 6. Step 9 output

Step 9 should create:

`supabase/migrations/YYYYMMDDHHMMSS_activity_facts_persistence_layer.sql`

but must not run it automatically.

## 7. Safety status

| Gate | Status |
|---|---|
| SQL executed | No |
| Supabase write | No |
| OpenAI call | No |
| Runtime code changed | No |
| Commit | No |
| Push | No |