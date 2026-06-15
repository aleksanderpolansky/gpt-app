# GPT-APP / AI-NAVIGATOR — FACTS STEP 8/12

## Live Schema Analysis

Version: FACTS_STEP8_LIVE_SCHEMA_ANALYSIS_V1_20260615  
Status: live SELECT-only output analyzed  
Scope: migration shape decision for Activity Facts Persistence Layer  
Non-scope: SQL execution, Supabase write, OpenAI call, commit, push

## 1. Input

Input file from manual Supabase SELECT-only inspection:

`FACTS_STEP8_SINGLE_RESULT_SCHEMA_OUTPUT_20260615_HHMMSS.txt`

The output format is valid: one table with `section` and `payload`.

## 2. Confirmed live schema facts

### Existing base tables

| Table | Status | Meaning |
|---|---|---|
| `activity_events` | PRESENT | Existing chronological source of truth for activities. |
| `value_objects` | PRESENT | Existing Value Object reference table. |
| `actors` | PRESENT | Existing actor table. |
| `app_users` | PRESENT | Existing app user table. |
| `persons` | PRESENT | Existing person table. |

### Missing fact tables

| Table | Status | Meaning |
|---|---|---|
| `activity_event_measures` | MISSING | Safe to create as new table. |
| `activity_object_facts` | MISSING | Safe to create as new table. |
| `activity_fact_review_items` | MISSING | Safe to create as new table. |
| `activity_fact_recalculation_queue` | MISSING | Safe to create as new table. |

## 3. Confirmed FK targets

`activity_events` has:

- `id uuid not null default gen_random_uuid()`
- `user_id uuid not null`
- `performed_by_actor_id uuid null`
- `acting_as_actor_id uuid null`
- `acting_for_actor_id uuid null`
- `input_text text null`
- `started_at timestamptz null`
- `ended_at timestamptz null`
- `duration_minutes integer null`
- `source text not null default manual`
- `status text not null default completed`
- `privacy_scope text not null default private`
- `processing_status text not null default processed`
- `metadata_json jsonb not null default {}`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Confirmed constraints:

- `activity_events.id` is primary key.
- `activity_events.user_id` references `app_users(id)`.
- `activity_events.performed_by_actor_id` references `actors(id)`.
- `activity_events.acting_as_actor_id` references `actors(id)`.
- `activity_events.acting_for_actor_id` references `actors(id)`.

`value_objects` has:

- `id uuid not null default gen_random_uuid()`
- `parent_value_object_id uuid null`
- `owner_actor_id uuid null`
- `actor_id uuid null`
- `app_user_id uuid null`
- `owner_user_id uuid null`
- `created_by_actor_id uuid null`
- `visibility text default private`
- `source text default semantic_candidate`
- `usage_scope text null`

Confirmed constraints:

- `value_objects.id` is primary key.
- `value_objects.parent_value_object_id` references `value_objects(id)`.
- `value_objects.owner_actor_id` references `actors(id)`.
- `value_objects.actor_id` references `actors(id)`.
- `value_objects.created_by_actor_id` references `actors(id)`.
- `value_objects.app_user_id` references `app_users(id)`.
- `value_objects.owner_user_id` references `app_users(id)`.

## 4. Security analysis

`activity_events` security pattern is private and server-mediated:

- RLS enabled.
- `anon` privileges: none.
- `authenticated` privileges: none.
- Policy for `anon, authenticated`: no direct public access, `using false`, `with check false`.
- `service_role` has table privileges.

Therefore new fact tables should follow the same stricter pattern:

- enable RLS;
- revoke all from `anon` and `authenticated`;
- grant required table privileges to `service_role`;
- create no-direct-public-access policy for `anon, authenticated`;
- all browser access must go through guarded API routes.

## 5. updated_at helper

The live schema contains `set_activity_recording_updated_at()`.

Use this helper for new Activity Facts tables instead of creating a new helper.

## 6. Migration shape decision

Executable migration may be drafted in the next step with these decisions:

| Area | Decision |
|---|---|
| `user_id` FK | `references public.app_users(id)` |
| actor FKs | `performed_by_actor_id`, `acting_as_actor_id`, `acting_for_actor_id` reference `public.actors(id)` |
| source event FK | `activity_event_id references public.activity_events(id)` |
| Value Object FK | `value_object_id references public.value_objects(id)` |
| updated_at trigger | use `public.set_activity_recording_updated_at()` |
| RLS | enabled on all new fact tables |
| direct browser Data API access | blocked |
| server access | `service_role` only |
| SQL execution now | no |

## 7. Next step

FACTS STEP 9/12 should create the executable migration file under `supabase/migrations`.

It must still not execute SQL automatically.

The migration should be committed only after static audit and explicit commit gate.