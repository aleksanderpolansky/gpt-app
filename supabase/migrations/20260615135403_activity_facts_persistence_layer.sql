-- GPT-APP / AI-NAVIGATOR
-- FACTS STEP 9/12 — Activity Facts Persistence Layer
-- Executable migration file created, but not executed by this step.
--
-- Security model:
-- - server-mediated private facts
-- - no direct anon/authenticated Data API access
-- - service_role only for table-level access
-- - guarded API routes must enforce app user / actor ownership
--
-- Live schema decisions from Step 8:
-- - user_id references public.app_users(id)
-- - actor columns reference public.actors(id)
-- - activity_event_id references public.activity_events(id)
-- - value_object_id references public.value_objects(id)
-- - updated_at trigger uses public.set_activity_recording_updated_at()

begin;

-- ============================================================
-- 1. activity_event_measures
-- ============================================================

create table if not exists public.activity_event_measures (
  id uuid primary key default gen_random_uuid(),
  activity_event_id uuid not null references public.activity_events(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  performed_by_actor_id uuid null references public.actors(id) on delete set null,
  acting_as_actor_id uuid null references public.actors(id) on delete set null,
  acting_for_actor_id uuid null references public.actors(id) on delete set null,
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
  constraint activity_event_measures_measure_type_check check (
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
  constraint activity_event_measures_unit_check check (
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
  constraint activity_event_measures_source_type_check check (
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
create index if not exists activity_event_measures_performed_actor_idx on public.activity_event_measures(performed_by_actor_id, created_at desc) where performed_by_actor_id is not null;

drop trigger if exists trg_activity_event_measures_updated_at on public.activity_event_measures;
create trigger trg_activity_event_measures_updated_at
before update on public.activity_event_measures
for each row
execute function public.set_activity_recording_updated_at();

alter table public.activity_event_measures enable row level security;
revoke all on table public.activity_event_measures from anon, authenticated;
grant select, insert, update, delete on table public.activity_event_measures to service_role;
drop policy if exists no_direct_public_activity_event_measures_access on public.activity_event_measures;
create policy no_direct_public_activity_event_measures_access
on public.activity_event_measures
for all
to anon, authenticated
using (false)
with check (false);

comment on table public.activity_event_measures is 'Private server-mediated measures extracted from activity_events. No direct browser Data API access.';

-- ============================================================
-- 2. activity_object_facts
-- ============================================================

create table if not exists public.activity_object_facts (
  id uuid primary key default gen_random_uuid(),
  activity_event_id uuid not null references public.activity_events(id) on delete cascade,
  measure_id uuid null references public.activity_event_measures(id) on delete set null,
  user_id uuid not null references public.app_users(id) on delete cascade,
  performed_by_actor_id uuid null references public.actors(id) on delete set null,
  acting_as_actor_id uuid null references public.actors(id) on delete set null,
  acting_for_actor_id uuid null references public.actors(id) on delete set null,
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
  constraint activity_object_facts_measure_type_check check (
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
  constraint activity_object_facts_unit_check check (
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
  constraint activity_object_facts_status_check check (
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
  constraint activity_object_facts_source_type_check check (
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
create index if not exists activity_object_facts_status_idx on public.activity_object_facts(user_id, fact_status, created_at desc);
create index if not exists activity_object_facts_performed_actor_idx on public.activity_object_facts(performed_by_actor_id, created_at desc) where performed_by_actor_id is not null;

drop trigger if exists trg_activity_object_facts_updated_at on public.activity_object_facts;
create trigger trg_activity_object_facts_updated_at
before update on public.activity_object_facts
for each row
execute function public.set_activity_recording_updated_at();

alter table public.activity_object_facts enable row level security;
revoke all on table public.activity_object_facts from anon, authenticated;
grant select, insert, update, delete on table public.activity_object_facts to service_role;
drop policy if exists no_direct_public_activity_object_facts_access on public.activity_object_facts;
create policy no_direct_public_activity_object_facts_access
on public.activity_object_facts
for all
to anon, authenticated
using (false)
with check (false);

comment on table public.activity_object_facts is 'Private user-owned object facts derived from activity_events. Shared Value Objects are references only; fact rows remain private.';
comment on column public.activity_object_facts.semantic_object_key is 'Stable lower snake_case semantic object/category key used when value_object_id is null or as stable analytic key.';
comment on column public.activity_object_facts.value_object_id is 'Optional link to public.value_objects(id). Nullable so facts can exist before a Value Object is linked.';

-- ============================================================
-- 3. activity_fact_review_items
-- ============================================================

create table if not exists public.activity_fact_review_items (
  id uuid primary key default gen_random_uuid(),
  activity_event_id uuid not null references public.activity_events(id) on delete cascade,
  fact_id uuid null references public.activity_object_facts(id) on delete set null,
  measure_id uuid null references public.activity_event_measures(id) on delete set null,
  user_id uuid not null references public.app_users(id) on delete cascade,
  performed_by_actor_id uuid null references public.actors(id) on delete set null,
  acting_as_actor_id uuid null references public.actors(id) on delete set null,
  acting_for_actor_id uuid null references public.actors(id) on delete set null,
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
  constraint activity_fact_review_items_decision_check check (
    user_decision in ('pending', 'accepted', 'edited', 'rejected', 'ignored')
  ),
  constraint activity_fact_review_items_proposed_one_value_check check (
    (case when proposed_value_numeric is not null then 1 else 0 end +
     case when proposed_value_text is not null then 1 else 0 end +
     case when proposed_value_boolean is not null then 1 else 0 end) = 1
  ),
  constraint activity_fact_review_items_edited_value_check check (
    user_decision <> 'edited'
    or (case when edited_value_numeric is not null then 1 else 0 end +
        case when edited_value_text is not null then 1 else 0 end +
        case when edited_value_boolean is not null then 1 else 0 end) = 1
  )
);

create index if not exists activity_fact_review_items_event_idx on public.activity_fact_review_items(activity_event_id);
create index if not exists activity_fact_review_items_user_decision_idx on public.activity_fact_review_items(user_id, user_decision, created_at desc);

drop trigger if exists trg_activity_fact_review_items_updated_at on public.activity_fact_review_items;
create trigger trg_activity_fact_review_items_updated_at
before update on public.activity_fact_review_items
for each row
execute function public.set_activity_recording_updated_at();

alter table public.activity_fact_review_items enable row level security;
revoke all on table public.activity_fact_review_items from anon, authenticated;
grant select, insert, update, delete on table public.activity_fact_review_items to service_role;
drop policy if exists no_direct_public_activity_fact_review_items_access on public.activity_fact_review_items;
create policy no_direct_public_activity_fact_review_items_access
on public.activity_fact_review_items
for all
to anon, authenticated
using (false)
with check (false);

comment on table public.activity_fact_review_items is 'Private server-mediated review decisions for proposed activity facts.';

-- ============================================================
-- 4. activity_fact_recalculation_queue
-- ============================================================

create table if not exists public.activity_fact_recalculation_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  performed_by_actor_id uuid null references public.actors(id) on delete set null,
  acting_as_actor_id uuid null references public.actors(id) on delete set null,
  acting_for_actor_id uuid null references public.actors(id) on delete set null,
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
  constraint activity_fact_recalculation_queue_semantic_key_check check (
    semantic_object_key is null or semantic_object_key ~ '^[a-z][a-z0-9_]{1,79}$'
  ),
  constraint activity_fact_recalculation_queue_reason_check check (
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
  constraint activity_fact_recalculation_queue_status_check check (
    queue_status in ('queued', 'processing', 'completed', 'failed', 'cancelled')
  )
);

create index if not exists activity_fact_recalculation_queue_status_idx on public.activity_fact_recalculation_queue(queue_status, scheduled_at asc);
create index if not exists activity_fact_recalculation_queue_user_idx on public.activity_fact_recalculation_queue(user_id, created_at desc);
create index if not exists activity_fact_recalculation_queue_value_object_idx on public.activity_fact_recalculation_queue(value_object_id, created_at desc) where value_object_id is not null;

drop trigger if exists trg_activity_fact_recalculation_queue_updated_at on public.activity_fact_recalculation_queue;
create trigger trg_activity_fact_recalculation_queue_updated_at
before update on public.activity_fact_recalculation_queue
for each row
execute function public.set_activity_recording_updated_at();

alter table public.activity_fact_recalculation_queue enable row level security;
revoke all on table public.activity_fact_recalculation_queue from anon, authenticated;
grant select, insert, update, delete on table public.activity_fact_recalculation_queue to service_role;
drop policy if exists no_direct_public_activity_fact_recalculation_queue_access on public.activity_fact_recalculation_queue;
create policy no_direct_public_activity_fact_recalculation_queue_access
on public.activity_fact_recalculation_queue
for all
to anon, authenticated
using (false)
with check (false);

comment on table public.activity_fact_recalculation_queue is 'Private server-mediated queue for invalidating or recomputing analytics after fact or hierarchy changes.';

commit;
