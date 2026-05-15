-- GPT-APP / P4.7.4 Value Object State Foundation
-- Date: 2026-05-15
-- Scope:
--   Additive bridge from Activity Event to Value Object Instance and Value Object State.
--
-- Important:
--   - Do not drop, rename or rewrite existing tables.
--   - Do not replace impact_events / daily_aggregates / current_snapshots.
--   - Do not modify commercial lifecycle tables.
--   - Do not create derived state for imported_pending events before confirm.
--   - Direct public access is denied through RLS policies.
--
-- Pipeline:
--   activity_events
--     -> value_object_instances
--     -> activity_event_value_object_instance_links
--     -> value_object_state_deltas
--     -> value_object_daily_aggregates / value_object_state_snapshots

create table if not exists public.value_object_instances (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references public.app_users(id),
  value_object_id uuid not null references public.value_objects(id),

  source_event_id uuid references public.activity_events(id),
  owner_actor_id uuid references public.actors(id),
  organization_id uuid references public.organizations(id),

  status text not null default 'completed',

  started_at timestamptz,
  ended_at timestamptz,
  duration_minutes integer,

  instance_title text,
  instance_note text,
  result_status text,

  quality_score numeric,
  confidence numeric not null default 1,

  source text not null default 'rule',
  metadata_json jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint value_object_instances_status_check
    check (
      status in (
        'draft',
        'planned',
        'active',
        'completed',
        'cancelled',
        'archived'
      )
    ),

  constraint value_object_instances_duration_check
    check (
      duration_minutes is null
      or duration_minutes >= 0
    ),

  constraint value_object_instances_quality_score_check
    check (
      quality_score is null
      or (
        quality_score >= 0
        and quality_score <= 1
      )
    ),

  constraint value_object_instances_confidence_check
    check (
      confidence >= 0
      and confidence <= 1
    ),

  constraint value_object_instances_source_check
    check (
      source in (
        'rule',
        'manual',
        'ai_draft',
        'api',
        'system',
        'correction',
        'commercial'
      )
    ),

  constraint value_object_instances_time_order_check
    check (
      started_at is null
      or ended_at is null
      or ended_at >= started_at
    ),

  constraint value_object_instances_metadata_is_object_check
    check (
      jsonb_typeof(metadata_json) = 'object'
    )
);

create index if not exists value_object_instances_user_created_at_idx
  on public.value_object_instances(user_id, created_at desc);

create index if not exists value_object_instances_value_object_id_idx
  on public.value_object_instances(value_object_id);

create index if not exists value_object_instances_source_event_id_idx
  on public.value_object_instances(source_event_id);

create index if not exists value_object_instances_status_idx
  on public.value_object_instances(status);

alter table public.value_object_instances enable row level security;

drop policy if exists "No direct public value object instances access"
  on public.value_object_instances;

create policy "No direct public value object instances access"
  on public.value_object_instances
  for all
  to anon, authenticated
  using (false)
  with check (false);


create table if not exists public.activity_event_value_object_instance_links (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references public.app_users(id),
  event_id uuid not null references public.activity_events(id),
  value_object_instance_id uuid not null references public.value_object_instances(id),

  relation_type text not null default 'executes',
  weight numeric not null default 1,
  confidence numeric not null default 1,
  source text not null default 'rule',

  metadata_json jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint activity_event_voi_links_relation_type_check
    check (
      relation_type in (
        'executes',
        'creates',
        'uses',
        'supports',
        'consumes',
        'updates_state',
        'commercial_source',
        'related_to'
      )
    ),

  constraint activity_event_voi_links_weight_check
    check (
      weight >= 0
      and weight <= 1
    ),

  constraint activity_event_voi_links_confidence_check
    check (
      confidence >= 0
      and confidence <= 1
    ),

  constraint activity_event_voi_links_source_check
    check (
      source in (
        'rule',
        'manual',
        'ai_draft',
        'api',
        'system',
        'correction',
        'commercial'
      )
    ),

  constraint activity_event_voi_links_metadata_is_object_check
    check (
      jsonb_typeof(metadata_json) = 'object'
    ),

  constraint activity_event_voi_links_unique
    unique (
      event_id,
      value_object_instance_id,
      relation_type
    )
);

create index if not exists activity_event_voi_links_user_event_idx
  on public.activity_event_value_object_instance_links(user_id, event_id);

create index if not exists activity_event_voi_links_event_id_idx
  on public.activity_event_value_object_instance_links(event_id);

create index if not exists activity_event_voi_links_voi_id_idx
  on public.activity_event_value_object_instance_links(value_object_instance_id);

alter table public.activity_event_value_object_instance_links enable row level security;

drop policy if exists "No direct public activity event value object instance links access"
  on public.activity_event_value_object_instance_links;

create policy "No direct public activity event value object instance links access"
  on public.activity_event_value_object_instance_links
  for all
  to anon, authenticated
  using (false)
  with check (false);


create table if not exists public.value_object_state_deltas (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references public.app_users(id),
  event_id uuid not null references public.activity_events(id),
  value_object_instance_id uuid not null references public.value_object_instances(id),
  value_object_id uuid not null references public.value_objects(id),

  rule_id uuid references public.impact_rules(id),

  metric_key text not null,
  delta_value_numeric numeric,
  delta_value_text text,
  metric_unit text,
  delta_direction text not null default 'neutral',

  source text not null default 'rule',
  confidence numeric not null default 1,

  metadata_json jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint value_object_state_deltas_direction_check
    check (
      delta_direction in (
        'increase',
        'decrease',
        'neutral',
        'set'
      )
    ),

  constraint value_object_state_deltas_confidence_check
    check (
      confidence >= 0
      and confidence <= 1
    ),

  constraint value_object_state_deltas_source_check
    check (
      source in (
        'rule',
        'manual',
        'ai_draft',
        'api',
        'system',
        'correction',
        'commercial'
      )
    ),

  constraint value_object_state_deltas_metric_value_presence_check
    check (
      delta_value_numeric is not null
      or delta_value_text is not null
    ),

  constraint value_object_state_deltas_metadata_is_object_check
    check (
      jsonb_typeof(metadata_json) = 'object'
    )
);

create index if not exists value_object_state_deltas_user_created_at_idx
  on public.value_object_state_deltas(user_id, created_at desc);

create index if not exists value_object_state_deltas_event_id_idx
  on public.value_object_state_deltas(event_id);

create index if not exists value_object_state_deltas_voi_id_idx
  on public.value_object_state_deltas(value_object_instance_id);

create index if not exists value_object_state_deltas_value_metric_idx
  on public.value_object_state_deltas(value_object_id, metric_key);

alter table public.value_object_state_deltas enable row level security;

drop policy if exists "No direct public value object state deltas access"
  on public.value_object_state_deltas;

create policy "No direct public value object state deltas access"
  on public.value_object_state_deltas
  for all
  to anon, authenticated
  using (false)
  with check (false);


create table if not exists public.value_object_state_snapshots (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references public.app_users(id),
  value_object_id uuid not null references public.value_objects(id),

  metric_key text not null,
  metric_value_numeric numeric,
  metric_value_text text,
  metric_unit text,

  last_event_id uuid references public.activity_events(id),
  last_state_delta_id uuid references public.value_object_state_deltas(id),

  source text not null default 'rule',
  metadata_json jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint value_object_state_snapshots_source_check
    check (
      source in (
        'rule',
        'manual',
        'ai_draft',
        'api',
        'system',
        'correction',
        'commercial'
      )
    ),

  constraint value_object_state_snapshots_metric_value_presence_check
    check (
      metric_value_numeric is not null
      or metric_value_text is not null
    ),

  constraint value_object_state_snapshots_metadata_is_object_check
    check (
      jsonb_typeof(metadata_json) = 'object'
    ),

  constraint value_object_state_snapshots_user_value_metric_unique
    unique (
      user_id,
      value_object_id,
      metric_key
    )
);

create index if not exists value_object_state_snapshots_user_value_idx
  on public.value_object_state_snapshots(user_id, value_object_id);

create index if not exists value_object_state_snapshots_metric_idx
  on public.value_object_state_snapshots(metric_key);

alter table public.value_object_state_snapshots enable row level security;

drop policy if exists "No direct public value object state snapshots access"
  on public.value_object_state_snapshots;

create policy "No direct public value object state snapshots access"
  on public.value_object_state_snapshots
  for all
  to anon, authenticated
  using (false)
  with check (false);


create table if not exists public.value_object_daily_aggregates (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references public.app_users(id),
  value_object_id uuid not null references public.value_objects(id),

  aggregate_date date not null,
  aggregate_type text not null default 'value_object',
  aggregate_key text not null,

  metric_key text not null,
  metric_value_numeric numeric not null default 0,
  metric_value_text text,
  metric_unit text,

  source text not null default 'rule',
  last_event_id uuid references public.activity_events(id),
  last_state_delta_id uuid references public.value_object_state_deltas(id),

  metadata_json jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint value_object_daily_aggregates_source_check
    check (
      source in (
        'rule',
        'manual',
        'ai_draft',
        'api',
        'system',
        'correction',
        'commercial'
      )
    ),

  constraint value_object_daily_aggregates_metadata_is_object_check
    check (
      jsonb_typeof(metadata_json) = 'object'
    ),

  constraint value_object_daily_aggregates_unique
    unique (
      user_id,
      value_object_id,
      aggregate_date,
      aggregate_type,
      aggregate_key,
      metric_key
    )
);

create index if not exists value_object_daily_aggregates_user_date_idx
  on public.value_object_daily_aggregates(user_id, aggregate_date desc);

create index if not exists value_object_daily_aggregates_value_date_idx
  on public.value_object_daily_aggregates(value_object_id, aggregate_date desc);

create index if not exists value_object_daily_aggregates_metric_idx
  on public.value_object_daily_aggregates(metric_key);

alter table public.value_object_daily_aggregates enable row level security;

drop policy if exists "No direct public value object daily aggregates access"
  on public.value_object_daily_aggregates;

create policy "No direct public value object daily aggregates access"
  on public.value_object_daily_aggregates
  for all
  to anon, authenticated
  using (false)
  with check (false);
