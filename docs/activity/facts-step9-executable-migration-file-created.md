# GPT-APP / AI-NAVIGATOR — FACTS STEP 9/12

## Executable migration file created

Version: FACTS_STEP9_EXECUTABLE_MIGRATION_FILE_CREATED_V1_20260615
Status: migration file created, not executed
Scope: Activity Facts Persistence Layer migration file
Non-scope: SQL execution, Supabase write, OpenAI call, commit, push

## 1. Created migration

supabase\migrations\20260615135403_activity_facts_persistence_layer.sql

## 2. Tables included

1. public.activity_event_measures
2. public.activity_object_facts
3. public.activity_fact_review_items
4. public.activity_fact_recalculation_queue

## 3. Security model

The migration follows the existing private activity_events model:

- RLS enabled.
- direct anon table access revoked.
- direct authenticated table access revoked.
- service_role table access granted.
- no-direct-public-access policies for anon, authenticated.
- browser access must go through guarded API routes.

## 4. FK model

- user_id references public.app_users(id).
- actor columns reference public.actors(id).
- activity_event_id references public.activity_events(id).
- value_object_id references public.value_objects(id).

## 5. updated_at model

Uses existing public.set_activity_recording_updated_at().

## 6. Safety status

| Gate | Status |
|---|---|
| Migration file created | Yes |
| SQL executed | No |
| Supabase write | No |
| OpenAI call | No |
| Commit | No |
| Push | No |

## 7. Next step

FACTS STEP 10/12 should perform static audit of the migration file before any execution gate.
