-- GPT-APP / AI-NAVIGATOR
-- FACTS STEP 5/12 — Activity Facts SQL Draft v2: Server-Mediated Private Facts
--
-- DRAFT ONLY. DO NOT EXECUTE IN THIS STEP.
-- Stored under docs/sql, not supabase/migrations.
--
-- Decision:
-- Activity facts are private user-owned records.
-- Access path: guarded API/service role, not direct browser Data API writes.
--
-- Safety:
-- No SQL execution in this step.
-- No Supabase write in this step.
-- No OpenAI call in this step.

begin;

-- ============================================================
-- 1. activity_event_measures
-- ============================================================

create table if not exists public.activity_event_measures (
  id uuid primary key default gen_random_uuid(),
  activity_event_id uuid not null references public.activity_events(id) on delete cascade,
  user_id uuid not null,
  performed_by_actor_id uuid null,
  acting_as_actor_id uuid null,
  acting_for_actor_id uuid null,
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
  constraint activity_event_measures_confidence_check check (confidence >= 0 and confidence <= 1),
  constraint activity_event_measures_one_value_check check (
    (case when value_numeric is not null then 1 else 0 end +
     case when value_text is not null then 1 else 0 end +
     case when value_boolean is not null then 1 else 0 end) = 1
  )
);

create index if not exists activity_event_measures_event_idx on public.activity_event_measures(activity_event_id);
create index if not exists activity_event_measures_user_created_idx on public.activity_event_measures(user_id, created_at desc);
create index if not exists activity_event_measures_type_unit_idx on public.activity_event_measures(measure_type, unit);

alter table public.activity_event_measures enable row level security;
revoke all on table public.activity_event_measures from anon, authenticated;
grant select, insert, update, delete on public.activity_event_measures to service_role;
drop policy if exists no_direct_public_activity_event_measures_access on public.activity_event_measures;
create policy no_direct_public_activity_event_measures_access on public.activity_event_measures for all using (false) with check (false);

-- ============================================================
-- 2. activity_object_facts
-- ============================================================

create table if not exists public.activity_object_facts (
  id uuid primary key default gen_random_uuid(),
  activity_event_id uuid not null references public.activity_events(id) on delete cascade,
  measure_id uuid null references public.activity_event_measures(id) on delete set null,
  user_id uuid not null,
  performed_by_actor_id uuid null,
  acting_as_actor_id uuid null,
  acting_for_actor_id uuid null,
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
  constraint activity_object_facts_semantic_key_check check (semantic_object_key ~ '^[a-z][a-z0-9_]{1,79}$'),
  constraint activity_object_facts_confidence_check check (confidence >= 0 and confidence <= 1),
  constraint activity_object_facts_one_value_check check (
    (case when value_numeric is not null then 1 else 0 end +
     case when value_text is not null then 1 else 0 end +
     case when value_boolean is not null then 1 else 0 end) = 1
  )
);

create index if not exists activity_object_facts_event_idx on public.activity_object_facts(activity_event_id);
create index if not exists activity_object_facts_user_created_idx on public.activity_object_facts(user_id, created_at desc);
create index if not exists activity_object_facts_user_semantic_idx on public.activity_object_facts(user_id, semantic_object_key, created_at desc);
create index if not exists activity_object_facts_user_value_object_idx on public.activity_object_facts(user_id, value_object_id, created_at desc) where value_object_id is not null;

alter table public.activity_object_facts enable row level security;
revoke all on table public.activity_object_facts from anon, authenticated;
grant select, insert, update, delete on public.activity_object_facts to service_role;
drop policy if exists no_direct_public_activity_object_facts_access on public.activity_object_facts;
create policy no_direct_public_activity_object_facts_access on public.activity_object_facts for all using (false) with check (false);

-- ============================================================
-- 3. activity_fact_review_items
-- ============================================================

create table if not exists public.activity_fact_review_items (
  id uuid primary key default gen_random_uuid(),
  activity_event_id uuid not null references public.activity_events(id) on delete cascade,
  fact_id uuid null references public.activity_object_facts(id) on delete set null,
  measure_id uuid null references public.activity_event_measures(id) on delete set null,
  user_id uuid not null,
  performed_by_actor_id uuid null,
  acting_as_actor_id uuid null,
  acting_for_actor_id uuid null,
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
  updated_at timestamptz not null default now()
);

create index if not exists activity_fact_review_items_event_idx on public.activity_fact_review_items(activity_event_id);
create index if not exists activity_fact_review_items_user_decision_idx on public.activity_fact_review_items(user_id, user_decision, created_at desc);

alter table public.activity_fact_review_items enable row level security;
revoke all on table public.activity_fact_review_items from anon, authenticated;
grant select, insert, update, delete on public.activity_fact_review_items to service_role;
drop policy if exists no_direct_public_activity_fact_review_items_access on public.activity_fact_review_items;
create policy no_direct_public_activity_fact_review_items_access on public.activity_fact_review_items for all using (false) with check (false);

-- ============================================================
-- 4. activity_fact_recalculation_queue
-- ============================================================

create table if not exists public.activity_fact_recalculation_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  performed_by_actor_id uuid null,
  acting_as_actor_id uuid null,
  acting_for_actor_id uuid null,
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
  constraint activity_fact_recalculation_queue_semantic_key_check check (semantic_object_key is null or semantic_object_key ~ '^[a-z][a-z0-9_]{1,79}$')
);

create index if not exists activity_fact_recalculation_queue_status_idx on public.activity_fact_recalculation_queue(queue_status, scheduled_at asc);
create index if not exists activity_fact_recalculation_queue_user_idx on public.activity_fact_recalculation_queue(user_id, created_at desc);

alter table public.activity_fact_recalculation_queue enable row level security;
revoke all on table public.activity_fact_recalculation_queue from anon, authenticated;
grant select, insert, update, delete on public.activity_fact_recalculation_queue to service_role;
drop policy if exists no_direct_public_activity_fact_recalculation_queue_access on public.activity_fact_recalculation_queue;
create policy no_direct_public_activity_fact_recalculation_queue_access on public.activity_fact_recalculation_queue for all using (false) with check (false);

-- This file is intentionally non-executable draft.
-- Future executable migration must remove rollback and pass SELECT-only schema inspection first.

rollback;
