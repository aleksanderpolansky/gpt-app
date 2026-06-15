-- GPT-APP / AI-NAVIGATOR
-- FACTS STEP 3/12 — Activity Facts Persistence SQL Gate Draft
--
-- Status:
--   DRAFT ONLY. DO NOT EXECUTE IN THIS STEP.
--
-- Purpose:
--   Prepare the future SQL gate for the Activity Facts Persistence Layer.
--   This draft adds user-owned fact tables around the already existing activity_events table.
--
-- Safety:
--   This file is stored under docs/sql and is not a Supabase migration.
--   This step does not execute SQL.
--   This step does not write to Supabase.
--   This step does not call OpenAI.
--
-- Core principle:
--   Value Objects and user facts are separated.
--   value_objects can be shared/system/global references.
--   activity_object_facts rows are private user-owned facts.
--
-- Future execution gate:
--   Before execution, run a schema compatibility audit for:
--     - activity_events primary key and ownership columns
--     - value_objects primary key and visibility model
--     - app user / actor table naming
--     - existing RLS helper functions
--     - existing grants and Supabase Data API exposure policy
--
-- Supabase 2026 rule:
--   In an executable migration, explicit GRANT statements must be placed
--   near RLS policies. GRANT does not replace RLS.

begin;

-- ============================================================
-- 1. activity_event_measures
-- ============================================================
-- Direct extracted or derived measures from one activity event.
-- Examples:
--   "Ездил на велосипеде 2 часа" -> duration = 120 minute
--   "Прошёл 3 км" -> distance = 3 kilometer
--   "Сделал 8 подтягиваний" -> repetitions = 8 repetition
--
-- This table describes the source event, not yet the semantic/object exposure.
-- Object exposure is stored in activity_object_facts.

create table if not exists public.activity_event_measures (
  id uuid primary key default gen_random_uuid(),

  activity_event_id uuid not null references public.activity_events(id) on delete cascade,

  user_id uuid not null,
  actor_id uuid null,

  measure_type text not null,
  value_numeric numeric null,
  value_text text null,
  value_boolean boolean null,
  unit text not null,

  source_type text not null default 'user_text',
  confidence numeric not null default 1.0,
  is_derived boolean not null default false,

  raw_fragment text null,
  normalized_fragment text null,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint activity_event_measures_measure_type_check
    check (
      measure_type in (
        'duration',
        'distance',
        'count',
        'volume',
        'mass',
        'money',
        'energy',
        'repetitions',
        'state_score',
        'state_text',
        'boolean_state',
        'role',
        'context_tag',
        'derived_metric'
      )
    ),

  constraint activity_event_measures_unit_check
    check (
      unit in (
        'minute',
        'hour',
        'meter',
        'kilometer',
        'count',
        'repetition',
        'set',
        'milliliter',
        'liter',
        'gram',
        'kilogram',
        'kcal',
        'pln',
        'eur',
        'usd',
        'score_0_10',
        'boolean',
        'text',
        'tag',
        'role',
        'km_per_hour'
      )
    ),

  constraint activity_event_measures_source_type_check
    check (
      source_type in (
        'user_text',
        'user_edit',
        'ai_extraction',
        'rule_based',
        'tracker_import',
        'derived_calculation',
        'system_default'
      )
    ),

  constraint activity_event_measures_confidence_check
    check (confidence >= 0 and confidence <= 1),

  constraint activity_event_measures_one_value_check
    check (
      (
        case when value_numeric is not null then 1 else 0 end +
        case when value_text is not null then 1 else 0 end +
        case when value_boolean is not null then 1 else 0 end
      ) = 1
    )
);

create index if not exists activity_event_measures_event_idx
  on public.activity_event_measures(activity_event_id);

create index if not exists activity_event_measures_user_created_idx
  on public.activity_event_measures(user_id, created_at desc);

create index if not exists activity_event_measures_type_unit_idx
  on public.activity_event_measures(measure_type, unit);

alter table public.activity_event_measures enable row level security;

-- RLS DRAFT:
-- Replace auth.uid() mapping if the project uses app_users / actors indirection.
-- Keep this as draft until the ownership model is audited.

create policy activity_event_measures_select_own
  on public.activity_event_measures
  for select
  using (user_id = auth.uid());

create policy activity_event_measures_insert_own
  on public.activity_event_measures
  for insert
  with check (user_id = auth.uid());

create policy activity_event_measures_update_own
  on public.activity_event_measures
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy activity_event_measures_delete_own
  on public.activity_event_measures
  for delete
  using (user_id = auth.uid());

grant select, insert, update, delete on public.activity_event_measures to authenticated;
grant select, insert, update, delete on public.activity_event_measures to service_role;

-- ============================================================
-- 2. activity_object_facts
-- ============================================================
-- User-owned facts by semantic object / Value Object.
--
-- Example:
-- One event "Ездил на велосипеде 2 часа" can create:
--   cycling -> 120 minute
--   physical_activity -> 120 minute
--   leg_work -> 120 minute
--   cardio_load -> 120 minute
--
-- This is exposure/influence analysis, not chronological time duplication.
-- The user's chronological time remains 120 minutes.

create table if not exists public.activity_object_facts (
  id uuid primary key default gen_random_uuid(),

  activity_event_id uuid not null references public.activity_events(id) on delete cascade,
  measure_id uuid null references public.activity_event_measures(id) on delete set null,

  user_id uuid not null,
  actor_id uuid null,

  value_object_id uuid null references public.value_objects(id) on delete set null,

  semantic_object_key text not null,
  semantic_object_label text not null,

  measure_type text not null,
  value_numeric numeric null,
  value_text text null,
  value_boolean boolean null,
  unit text not null,

  period_start timestamptz null,
  period_end timestamptz null,

  fact_status text not null default 'proposed',
  confidence numeric not null default 1.0,

  source_type text not null default 'ai_extraction',

  is_chronological_primary boolean not null default false,
  is_exposure_fact boolean not null default true,
  is_user_confirmed boolean not null default false,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint activity_object_facts_semantic_key_check
    check (semantic_object_key ~ '^[a-z][a-z0-9_]{1,79}$'),

  constraint activity_object_facts_measure_type_check
    check (
      measure_type in (
        'duration',
        'distance',
        'count',
        'volume',
        'mass',
        'money',
        'energy',
        'repetitions',
        'state_score',
        'state_text',
        'boolean_state',
        'role',
        'context_tag',
        'derived_metric'
      )
    ),

  constraint activity_object_facts_unit_check
    check (
      unit in (
        'minute',
        'hour',
        'meter',
        'kilometer',
        'count',
        'repetition',
        'set',
        'milliliter',
        'liter',
        'gram',
        'kilogram',
        'kcal',
        'pln',
        'eur',
        'usd',
        'score_0_10',
        'boolean',
        'text',
        'tag',
        'role',
        'km_per_hour'
      )
    ),

  constraint activity_object_facts_status_check
    check (
      fact_status in (
        'proposed',
        'needs_review',
        'confirmed',
        'corrected',
        'rejected',
        'superseded',
        'deleted'
      )
    ),

  constraint activity_object_facts_source_type_check
    check (
      source_type in (
        'user_text',
        'user_edit',
        'ai_extraction',
        'rule_based',
        'tracker_import',
        'derived_calculation',
        'system_default'
      )
    ),

  constraint activity_object_facts_confidence_check
    check (confidence >= 0 and confidence <= 1),

  constraint activity_object_facts_one_value_check
    check (
      (
        case when value_numeric is not null then 1 else 0 end +
        case when value_text is not null then 1 else 0 end +
        case when value_boolean is not null then 1 else 0 end
      ) = 1
    )
);

create index if not exists activity_object_facts_event_idx
  on public.activity_object_facts(activity_event_id);

create index if not exists activity_object_facts_user_created_idx
  on public.activity_object_facts(user_id, created_at desc);

create index if not exists activity_object_facts_user_semantic_idx
  on public.activity_object_facts(user_id, semantic_object_key, created_at desc);

create index if not exists activity_object_facts_user_value_object_idx
  on public.activity_object_facts(user_id, value_object_id, created_at desc)
  where value_object_id is not null;

create index if not exists activity_object_facts_status_idx
  on public.activity_object_facts(user_id, fact_status, created_at desc);

alter table public.activity_object_facts enable row level security;

create policy activity_object_facts_select_own
  on public.activity_object_facts
  for select
  using (user_id = auth.uid());

create policy activity_object_facts_insert_own
  on public.activity_object_facts
  for insert
  with check (user_id = auth.uid());

create policy activity_object_facts_update_own
  on public.activity_object_facts
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy activity_object_facts_delete_own
  on public.activity_object_facts
  for delete
  using (user_id = auth.uid());

grant select, insert, update, delete on public.activity_object_facts to authenticated;
grant select, insert, update, delete on public.activity_object_facts to service_role;

-- ============================================================
-- 3. activity_fact_review_items
-- ============================================================
-- Stores review decisions for proposed facts.
-- This is the bridge between AI extraction and explicit user confirmation/correction.

create table if not exists public.activity_fact_review_items (
  id uuid primary key default gen_random_uuid(),

  activity_event_id uuid not null references public.activity_events(id) on delete cascade,
  fact_id uuid null references public.activity_object_facts(id) on delete set null,
  measure_id uuid null references public.activity_event_measures(id) on delete set null,

  user_id uuid not null,
  actor_id uuid null,

  proposed_label text not null,
  proposed_value_numeric numeric null,
  proposed_value_text text null,
  proposed_value_boolean boolean null,
  proposed_unit text not null,

  user_decision text not null default 'pending',

  edited_value_numeric numeric null,
  edited_value_text text null,
  edited_value_boolean boolean null,
  edited_unit text null,

  rejected_reason text null,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint activity_fact_review_items_user_decision_check
    check (
      user_decision in (
        'pending',
        'accepted',
        'edited',
        'rejected',
        'ignored'
      )
    ),

  constraint activity_fact_review_items_proposed_one_value_check
    check (
      (
        case when proposed_value_numeric is not null then 1 else 0 end +
        case when proposed_value_text is not null then 1 else 0 end +
        case when proposed_value_boolean is not null then 1 else 0 end
      ) = 1
    ),

  constraint activity_fact_review_items_edited_value_check
    check (
      user_decision <> 'edited'
      or (
        (
          case when edited_value_numeric is not null then 1 else 0 end +
          case when edited_value_text is not null then 1 else 0 end +
          case when edited_value_boolean is not null then 1 else 0 end
        ) = 1
      )
    )
);

create index if not exists activity_fact_review_items_event_idx
  on public.activity_fact_review_items(activity_event_id);

create index if not exists activity_fact_review_items_user_decision_idx
  on public.activity_fact_review_items(user_id, user_decision, created_at desc);

alter table public.activity_fact_review_items enable row level security;

create policy activity_fact_review_items_select_own
  on public.activity_fact_review_items
  for select
  using (user_id = auth.uid());

create policy activity_fact_review_items_insert_own
  on public.activity_fact_review_items
  for insert
  with check (user_id = auth.uid());

create policy activity_fact_review_items_update_own
  on public.activity_fact_review_items
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy activity_fact_review_items_delete_own
  on public.activity_fact_review_items
  for delete
  using (user_id = auth.uid());

grant select, insert, update, delete on public.activity_fact_review_items to authenticated;
grant select, insert, update, delete on public.activity_fact_review_items to service_role;

-- ============================================================
-- 4. activity_fact_recalculation_queue
-- ============================================================
-- Queues analytics recalculation after fact or hierarchy changes.
-- Parent Value Object rollups should be derived through the current hierarchy,
-- not permanently duplicated into stale parent facts.

create table if not exists public.activity_fact_recalculation_queue (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null,
  actor_id uuid null,

  activity_event_id uuid null references public.activity_events(id) on delete cascade,
  value_object_id uuid null references public.value_objects(id) on delete set null,

  semantic_object_key text null,

  reason text not null,
  queue_status text not null default 'queued',

  scheduled_at timestamptz not null default now(),
  processed_at timestamptz null,

  error_message text null,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint activity_fact_recalculation_queue_semantic_key_check
    check (
      semantic_object_key is null
      or semantic_object_key ~ '^[a-z][a-z0-9_]{1,79}$'
    ),

  constraint activity_fact_recalculation_queue_reason_check
    check (
      reason in (
        'fact_created',
        'fact_corrected',
        'fact_rejected',
        'fact_deleted',
        'value_object_linked',
        'value_object_unlinked',
        'hierarchy_changed',
        'standard_changed'
      )
    ),

  constraint activity_fact_recalculation_queue_status_check
    check (
      queue_status in (
        'queued',
        'processing',
        'completed',
        'failed',
        'cancelled'
      )
    )
);

create index if not exists activity_fact_recalculation_queue_status_idx
  on public.activity_fact_recalculation_queue(queue_status, scheduled_at asc);

create index if not exists activity_fact_recalculation_queue_user_idx
  on public.activity_fact_recalculation_queue(user_id, created_at desc);

create index if not exists activity_fact_recalculation_queue_value_object_idx
  on public.activity_fact_recalculation_queue(value_object_id, created_at desc)
  where value_object_id is not null;

alter table public.activity_fact_recalculation_queue enable row level security;

create policy activity_fact_recalculation_queue_select_own
  on public.activity_fact_recalculation_queue
  for select
  using (user_id = auth.uid());

create policy activity_fact_recalculation_queue_insert_own
  on public.activity_fact_recalculation_queue
  for insert
  with check (user_id = auth.uid());

create policy activity_fact_recalculation_queue_update_own
  on public.activity_fact_recalculation_queue
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy activity_fact_recalculation_queue_delete_own
  on public.activity_fact_recalculation_queue
  for delete
  using (user_id = auth.uid());

grant select, insert, update, delete on public.activity_fact_recalculation_queue to authenticated;
grant select, insert, update, delete on public.activity_fact_recalculation_queue to service_role;

-- ============================================================
-- 5. updated_at helper trigger draft
-- ============================================================
-- This block assumes a generic updated_at function may already exist.
-- Before execution, audit existing project functions to avoid duplicates.
--
-- If no helper exists, use:
--
-- create or replace function public.set_updated_at()
-- returns trigger
-- language plpgsql
-- as $$
-- begin
--   new.updated_at = now();
--   return new;
-- end;
-- $$;
--
-- create trigger activity_event_measures_set_updated_at
--   before update on public.activity_event_measures
--   for each row execute function public.set_updated_at();
--
-- create trigger activity_object_facts_set_updated_at
--   before update on public.activity_object_facts
--   for each row execute function public.set_updated_at();
--
-- create trigger activity_fact_review_items_set_updated_at
--   before update on public.activity_fact_review_items
--   for each row execute function public.set_updated_at();
--
-- create trigger activity_fact_recalculation_queue_set_updated_at
--   before update on public.activity_fact_recalculation_queue
--   for each row execute function public.set_updated_at();

-- ============================================================
-- 6. execution blockers before real migration
-- ============================================================
-- BLOCKER-01:
--   Confirm that public.activity_events(id) exists and uses uuid.
--
-- BLOCKER-02:
--   Confirm the correct user ownership model:
--   auth.uid() direct user_id OR app_users/auth0/actors indirection.
--
-- BLOCKER-03:
--   Confirm public.value_objects(id) exists and uses uuid.
--
-- BLOCKER-04:
--   Confirm whether actor_id should reference actors(id), app_actors(id),
--   or remain nullable without FK for MVP.
--
-- BLOCKER-05:
--   Confirm that these table names do not conflict with existing future drafts:
--     - activity_event_measures
--     - activity_object_facts
--     - activity_fact_review_items
--     - activity_fact_recalculation_queue
--
-- BLOCKER-06:
--   Confirm project policy for anon:
--   These private fact tables should not be granted to anon.
--
-- BLOCKER-07:
--   Confirm whether service_role explicit grant is required in migration style
--   or omitted because service_role bypasses RLS by default.
--
-- BLOCKER-08:
--   Confirm whether raw AI extraction candidates should be stored in these tables
--   or in a separate candidate/shadow table before user confirmation.

rollback;

-- End of draft.
-- rollback is intentional because this file is a non-executable draft.
-- A future executable migration must remove rollback/transaction guard
-- and must pass SQL/security review first.
