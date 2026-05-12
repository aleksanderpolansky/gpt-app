-- 012_activity_recording_backbone.sql
-- Activity Recording Layer / Quick Activity Capture MVP
-- Additive backbone only. Does not modify existing activities, activity_participants,
-- activity_links, time_blocks, value_objects, organizations, offers, certificates or points.
--
-- Main rule:
-- one user action is recorded once in activity_events;
-- meanings, contexts, value objects, observed objects and impacts are recorded
-- through event_links, impact_events, snapshots and aggregates.

create extension if not exists "pgcrypto";

create or replace function public.set_activity_recording_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.activity_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text,
  status text not null default 'active',
  sort_order integer not null default 100,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activity_types_status_check
    check (status in ('active', 'inactive', 'archived'))
);

drop trigger if exists trg_activity_types_updated_at on public.activity_types;

create trigger trg_activity_types_updated_at
before update on public.activity_types
for each row
execute function public.set_activity_recording_updated_at();

create table if not exists public.activity_code_templates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text,
  activity_type_id uuid not null references public.activity_types(id),
  default_duration_minutes integer,
  primary_value_object_key text,
  primary_value_object_title text,
  default_context_keys text[] not null default '{}'::text[],
  default_observed_object_keys text[] not null default '{}'::text[],
  default_privacy_scope text not null default 'private',
  default_source text not null default 'manual',
  default_status text not null default 'completed',
  default_link_blueprint jsonb not null default '[]'::jsonb,
  default_impact_blueprint jsonb not null default '[]'::jsonb,
  default_duration_calculation_rule text,
  is_active boolean not null default true,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activity_code_templates_default_duration_check
    check (default_duration_minutes is null or default_duration_minutes >= 0),
  constraint activity_code_templates_privacy_scope_check
    check (default_privacy_scope in ('private', 'shared_with_org', 'public_masked', 'public')),
  constraint activity_code_templates_default_status_check
    check (default_status in ('draft', 'planned', 'confirmed', 'completed', 'cancelled', 'missed', 'corrected')),
  constraint activity_code_templates_default_source_check
    check (default_source in ('manual', 'chat_ai', 'calendar', 'booking', 'rule', 'import', 'system'))
);

drop trigger if exists trg_activity_code_templates_updated_at on public.activity_code_templates;

create trigger trg_activity_code_templates_updated_at
before update on public.activity_code_templates
for each row
execute function public.set_activity_recording_updated_at();

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id),
  performed_by_actor_id uuid references public.actors(id),
  acting_as_actor_id uuid references public.actors(id),
  acting_for_actor_id uuid references public.actors(id),
  activity_type_id uuid references public.activity_types(id),
  template_id uuid references public.activity_code_templates(id),
  event_code text,
  input_text text,
  title text,
  description text,
  started_at timestamptz,
  ended_at timestamptz,
  duration_minutes integer,
  source text not null default 'manual',
  status text not null default 'completed',
  privacy_scope text not null default 'private',
  processing_status text not null default 'processed',
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activity_events_duration_check
    check (duration_minutes is null or duration_minutes >= 0),
  constraint activity_events_time_order_check
    check (started_at is null or ended_at is null or ended_at >= started_at),
  constraint activity_events_source_check
    check (source in ('manual', 'chat_ai', 'calendar', 'booking', 'rule', 'import', 'system')),
  constraint activity_events_status_check
    check (status in ('draft', 'planned', 'confirmed', 'completed', 'cancelled', 'missed', 'corrected')),
  constraint activity_events_privacy_scope_check
    check (privacy_scope in ('private', 'shared_with_org', 'public_masked', 'public')),
  constraint activity_events_processing_status_check
    check (processing_status in ('pending', 'processed', 'failed', 'skipped'))
);

drop trigger if exists trg_activity_events_updated_at on public.activity_events;

create trigger trg_activity_events_updated_at
before update on public.activity_events
for each row
execute function public.set_activity_recording_updated_at();

create table if not exists public.event_links (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.activity_events(id) on delete cascade,
  linked_entity_type text not null,
  linked_entity_id uuid,
  linked_entity_key text,
  link_role text not null,
  relation_type text not null default 'related_to',
  weight numeric(10,4) not null default 1,
  confidence numeric(5,4) not null default 1,
  source text not null default 'rule',
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint event_links_entity_presence_check
    check (linked_entity_id is not null or linked_entity_key is not null),
  constraint event_links_confidence_check
    check (confidence >= 0 and confidence <= 1),
  constraint event_links_source_check
    check (source in ('manual', 'template', 'rule', 'ai', 'system', 'import'))
);

create table if not exists public.impact_rules (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.activity_code_templates(id) on delete cascade,
  activity_type_id uuid references public.activity_types(id),
  rule_code text not null,
  title text not null,
  description text,
  impact_target_type text not null,
  impact_target_key text not null,
  impact_metric text not null,
  impact_unit text,
  impact_value_mode text not null default 'duration_minutes',
  impact_value_numeric numeric(14,4),
  impact_value_text text,
  impact_direction text not null default 'neutral',
  intensity text,
  rule_source text not null default 'system_seed',
  is_active boolean not null default true,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint impact_rules_value_mode_check
    check (impact_value_mode in ('duration_minutes', 'fixed', 'multiplier', 'qualitative')),
  constraint impact_rules_direction_check
    check (impact_direction in ('positive', 'negative', 'neutral', 'mixed')),
  constraint impact_rules_rule_source_check
    check (rule_source in ('system_seed', 'manual', 'template', 'ai_suggested', 'imported'))
);

drop trigger if exists trg_impact_rules_updated_at on public.impact_rules;

create trigger trg_impact_rules_updated_at
before update on public.impact_rules
for each row
execute function public.set_activity_recording_updated_at();

create unique index if not exists idx_impact_rules_template_rule_code_unique
on public.impact_rules(template_id, rule_code)
where template_id is not null;

create table if not exists public.impact_events (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.activity_events(id) on delete cascade,
  rule_id uuid references public.impact_rules(id),
  impact_target_type text not null,
  impact_target_key text not null,
  impact_metric text not null,
  impact_value_numeric numeric(14,4),
  impact_value_text text,
  impact_unit text,
  impact_direction text not null default 'neutral',
  intensity text,
  source text not null default 'rule',
  confidence numeric(5,4) not null default 1,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint impact_events_direction_check
    check (impact_direction in ('positive', 'negative', 'neutral', 'mixed')),
  constraint impact_events_source_check
    check (source in ('rule', 'manual', 'ai', 'system', 'import')),
  constraint impact_events_confidence_check
    check (confidence >= 0 and confidence <= 1)
);

create table if not exists public.current_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id),
  snapshot_entity_type text not null,
  snapshot_entity_key text not null,
  metric_key text not null,
  metric_value_numeric numeric(14,4),
  metric_value_text text,
  metric_unit text,
  last_event_id uuid references public.activity_events(id),
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint current_snapshots_user_entity_metric_unique
    unique (user_id, snapshot_entity_type, snapshot_entity_key, metric_key)
);

drop trigger if exists trg_current_snapshots_updated_at on public.current_snapshots;

create trigger trg_current_snapshots_updated_at
before update on public.current_snapshots
for each row
execute function public.set_activity_recording_updated_at();

create table if not exists public.daily_aggregates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id),
  aggregate_date date not null,
  aggregate_type text not null,
  aggregate_key text not null,
  metric_key text not null,
  metric_value_numeric numeric(14,4) not null default 0,
  metric_value_text text,
  metric_unit text,
  source text not null default 'rule',
  last_event_id uuid references public.activity_events(id),
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_aggregates_source_check
    check (source in ('rule', 'manual', 'ai', 'system', 'import')),
  constraint daily_aggregates_user_date_metric_unique
    unique (user_id, aggregate_date, aggregate_type, aggregate_key, metric_key)
);

drop trigger if exists trg_daily_aggregates_updated_at on public.daily_aggregates;

create trigger trg_daily_aggregates_updated_at
before update on public.daily_aggregates
for each row
execute function public.set_activity_recording_updated_at();

create index if not exists idx_activity_code_templates_code_active
on public.activity_code_templates(code, is_active);

create index if not exists idx_activity_events_user_created_at
on public.activity_events(user_id, created_at desc);

create index if not exists idx_activity_events_user_started_at
on public.activity_events(user_id, started_at desc);

create index if not exists idx_activity_events_code
on public.activity_events(event_code);

create index if not exists idx_activity_events_template_id
on public.activity_events(template_id);

create index if not exists idx_event_links_event_id
on public.event_links(event_id);

create index if not exists idx_event_links_linked_entity
on public.event_links(linked_entity_type, linked_entity_id);

create index if not exists idx_event_links_linked_key
on public.event_links(linked_entity_type, linked_entity_key);

create index if not exists idx_impact_events_event_id
on public.impact_events(event_id);

create index if not exists idx_impact_events_target_metric
on public.impact_events(impact_target_type, impact_target_key, impact_metric);

create index if not exists idx_current_snapshots_user_entity
on public.current_snapshots(user_id, snapshot_entity_type, snapshot_entity_key);

create index if not exists idx_daily_aggregates_user_date
on public.daily_aggregates(user_id, aggregate_date desc);

create index if not exists idx_daily_aggregates_user_type_date
on public.daily_aggregates(user_id, aggregate_type, aggregate_date desc);

insert into public.activity_types (
  code,
  title,
  description,
  status,
  sort_order
)
values
  (
    'handwriting',
    'Handwriting',
    'Writing by hand, including language practice, notes and drafting.',
    'active',
    10
  ),
  (
    'typing',
    'Typing',
    'Typing on keyboard or mobile device.',
    'active',
    20
  ),
  (
    'reading',
    'Reading',
    'Reading text, documents, books or learning materials.',
    'active',
    30
  ),
  (
    'speaking',
    'Speaking',
    'Speaking practice, calls, conversations or presentations.',
    'active',
    40
  ),
  (
    'walking',
    'Walking',
    'Walking, commuting on foot or light movement.',
    'active',
    50
  ),
  (
    'waiting',
    'Waiting',
    'Waiting time that may influence availability, attention or productivity.',
    'active',
    60
  ),
  (
    'calling',
    'Calling',
    'Phone or video calls.',
    'active',
    70
  ),
  (
    'checking',
    'Checking',
    'Checking, reviewing, verifying or inspecting something.',
    'active',
    80
  )
on conflict (code) do update
set
  title = excluded.title,
  description = excluded.description,
  status = excluded.status,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.activity_code_templates (
  code,
  title,
  description,
  activity_type_id,
  default_duration_minutes,
  primary_value_object_key,
  primary_value_object_title,
  default_context_keys,
  default_observed_object_keys,
  default_privacy_scope,
  default_source,
  default_status,
  default_link_blueprint,
  default_impact_blueprint,
  default_duration_calculation_rule,
  is_active,
  metadata_json
)
select
  '11-341',
  'German marketing handwriting practice',
  'Quick capture template for German marketing writing practice by hand.',
  activity_types.id,
  25,
  'german_marketing_writing_practice',
  'German marketing writing practice',
  array[
    'learning',
    'marketing',
    'career',
    'productive_development'
  ]::text[],
  array[
    'german_skill',
    'marketing_skill',
    'right_hand',
    'wrist',
    'attention'
  ]::text[],
  'private',
  'manual',
  'completed',
  '[
    {
      "linked_entity_type": "value_object",
      "linked_entity_key": "german_marketing_writing_practice",
      "link_role": "primary_value_object",
      "relation_type": "creates_or_improves",
      "weight": 1,
      "confidence": 1,
      "source": "template"
    },
    {
      "linked_entity_type": "context",
      "linked_entity_key": "learning",
      "link_role": "context",
      "relation_type": "in_context",
      "weight": 1,
      "confidence": 1,
      "source": "template"
    },
    {
      "linked_entity_type": "context",
      "linked_entity_key": "marketing",
      "link_role": "context",
      "relation_type": "in_context",
      "weight": 1,
      "confidence": 1,
      "source": "template"
    },
    {
      "linked_entity_type": "context",
      "linked_entity_key": "career",
      "link_role": "context",
      "relation_type": "in_context",
      "weight": 1,
      "confidence": 1,
      "source": "template"
    },
    {
      "linked_entity_type": "context",
      "linked_entity_key": "productive_development",
      "link_role": "context",
      "relation_type": "in_context",
      "weight": 1,
      "confidence": 1,
      "source": "template"
    },
    {
      "linked_entity_type": "observed_object",
      "linked_entity_key": "german_skill",
      "link_role": "observed_object",
      "relation_type": "improves",
      "weight": 1,
      "confidence": 1,
      "source": "template"
    },
    {
      "linked_entity_type": "observed_object",
      "linked_entity_key": "marketing_skill",
      "link_role": "observed_object",
      "relation_type": "improves",
      "weight": 1,
      "confidence": 1,
      "source": "template"
    },
    {
      "linked_entity_type": "observed_object",
      "linked_entity_key": "right_hand",
      "link_role": "observed_object",
      "relation_type": "loads",
      "weight": 1,
      "confidence": 1,
      "source": "template"
    },
    {
      "linked_entity_type": "observed_object",
      "linked_entity_key": "wrist",
      "link_role": "observed_object",
      "relation_type": "loads",
      "weight": 1,
      "confidence": 1,
      "source": "template"
    },
    {
      "linked_entity_type": "observed_object",
      "linked_entity_key": "attention",
      "link_role": "observed_object",
      "relation_type": "uses",
      "weight": 1,
      "confidence": 1,
      "source": "template"
    }
  ]'::jsonb,
  '[
    {
      "rule_code": "de_writing_minutes",
      "impact_target_type": "skill",
      "impact_target_key": "german_skill",
      "impact_metric": "writing_practice_minutes",
      "impact_unit": "minutes",
      "impact_value_mode": "duration_minutes",
      "impact_direction": "positive",
      "daily_aggregate_type": "language_daily",
      "daily_aggregate_key": "de_writing_minutes",
      "daily_metric_key": "minutes"
    },
    {
      "rule_code": "marketing_exposure_minutes",
      "impact_target_type": "skill",
      "impact_target_key": "marketing_skill",
      "impact_metric": "exposure_minutes",
      "impact_unit": "minutes",
      "impact_value_mode": "duration_minutes",
      "impact_direction": "positive",
      "daily_aggregate_type": "business_learning_daily",
      "daily_aggregate_key": "marketing_exposure_minutes",
      "daily_metric_key": "minutes"
    },
    {
      "rule_code": "right_hand_load_minutes",
      "impact_target_type": "body_part",
      "impact_target_key": "right_hand",
      "impact_metric": "load_minutes",
      "impact_unit": "minutes",
      "impact_value_mode": "duration_minutes",
      "impact_direction": "neutral",
      "daily_aggregate_type": "body_load_daily",
      "daily_aggregate_key": "right_hand_load_minutes",
      "daily_metric_key": "minutes"
    },
    {
      "rule_code": "wrist_load_minutes",
      "impact_target_type": "body_part",
      "impact_target_key": "wrist",
      "impact_metric": "load_minutes",
      "impact_unit": "minutes",
      "impact_value_mode": "duration_minutes",
      "impact_direction": "neutral",
      "daily_aggregate_type": "body_load_daily",
      "daily_aggregate_key": "wrist_load_minutes",
      "daily_metric_key": "minutes"
    },
    {
      "rule_code": "cognitive_load_medium",
      "impact_target_type": "attention",
      "impact_target_key": "attention",
      "impact_metric": "cognitive_load",
      "impact_unit": "qualitative",
      "impact_value_mode": "qualitative",
      "impact_value_text": "medium",
      "impact_direction": "neutral",
      "daily_aggregate_type": "productivity_daily",
      "daily_aggregate_key": "medium_cognitive_load_events",
      "daily_metric_key": "count"
    }
  ]'::jsonb,
  'explicit_minutes_or_template_default',
  true,
  '{
    "mvp_seed": true,
    "known_code_event": true,
    "ai_required": false,
    "example_input": "11-341 25 ÐºÐ¾Ð¼Ð¼ÐµÑ€Ñ‡ÐµÑÐºÐ¾Ðµ Ð¿Ð¸ÑÑŒÐ¼Ð¾"
  }'::jsonb
from public.activity_types
where activity_types.code = 'handwriting'
on conflict (code) do update
set
  title = excluded.title,
  description = excluded.description,
  activity_type_id = excluded.activity_type_id,
  default_duration_minutes = excluded.default_duration_minutes,
  primary_value_object_key = excluded.primary_value_object_key,
  primary_value_object_title = excluded.primary_value_object_title,
  default_context_keys = excluded.default_context_keys,
  default_observed_object_keys = excluded.default_observed_object_keys,
  default_privacy_scope = excluded.default_privacy_scope,
  default_source = excluded.default_source,
  default_status = excluded.default_status,
  default_link_blueprint = excluded.default_link_blueprint,
  default_impact_blueprint = excluded.default_impact_blueprint,
  default_duration_calculation_rule = excluded.default_duration_calculation_rule,
  is_active = excluded.is_active,
  metadata_json = excluded.metadata_json,
  updated_at = now();

insert into public.impact_rules (
  template_id,
  activity_type_id,
  rule_code,
  title,
  description,
  impact_target_type,
  impact_target_key,
  impact_metric,
  impact_unit,
  impact_value_mode,
  impact_value_numeric,
  impact_value_text,
  impact_direction,
  intensity,
  rule_source,
  is_active,
  metadata_json
)
select
  templates.id,
  templates.activity_type_id,
  seed.rule_code,
  seed.title,
  seed.description,
  seed.impact_target_type,
  seed.impact_target_key,
  seed.impact_metric,
  seed.impact_unit,
  seed.impact_value_mode,
  seed.impact_value_numeric,
  seed.impact_value_text,
  seed.impact_direction,
  seed.intensity,
  'system_seed',
  true,
  seed.metadata_json
from public.activity_code_templates templates
cross join (
  values
    (
      'de_writing_minutes',
      'German writing practice minutes',
      'Adds duration minutes to German writing practice.',
      'skill',
      'german_skill',
      'writing_practice_minutes',
      'minutes',
      'duration_minutes',
      null::numeric,
      null::text,
      'positive',
      null::text,
      '{"daily_aggregate_type":"language_daily","daily_aggregate_key":"de_writing_minutes","daily_metric_key":"minutes"}'::jsonb
    ),
    (
      'marketing_exposure_minutes',
      'Marketing exposure minutes',
      'Adds duration minutes to marketing learning or exposure.',
      'skill',
      'marketing_skill',
      'exposure_minutes',
      'minutes',
      'duration_minutes',
      null::numeric,
      null::text,
      'positive',
      null::text,
      '{"daily_aggregate_type":"business_learning_daily","daily_aggregate_key":"marketing_exposure_minutes","daily_metric_key":"minutes"}'::jsonb
    ),
    (
      'right_hand_load_minutes',
      'Right hand load minutes',
      'Adds duration minutes to right hand load.',
      'body_part',
      'right_hand',
      'load_minutes',
      'minutes',
      'duration_minutes',
      null::numeric,
      null::text,
      'neutral',
      null::text,
      '{"daily_aggregate_type":"body_load_daily","daily_aggregate_key":"right_hand_load_minutes","daily_metric_key":"minutes"}'::jsonb
    ),
    (
      'wrist_load_minutes',
      'Wrist load minutes',
      'Adds duration minutes to wrist load.',
      'body_part',
      'wrist',
      'load_minutes',
      'minutes',
      'duration_minutes',
      null::numeric,
      null::text,
      'neutral',
      null::text,
      '{"daily_aggregate_type":"body_load_daily","daily_aggregate_key":"wrist_load_minutes","daily_metric_key":"minutes"}'::jsonb
    ),
    (
      'cognitive_load_medium',
      'Medium cognitive load',
      'Records medium cognitive load for this event.',
      'attention',
      'attention',
      'cognitive_load',
      'qualitative',
      'qualitative',
      null::numeric,
      'medium',
      'neutral',
      'medium',
      '{"daily_aggregate_type":"productivity_daily","daily_aggregate_key":"medium_cognitive_load_events","daily_metric_key":"count"}'::jsonb
    )
) as seed(
  rule_code,
  title,
  description,
  impact_target_type,
  impact_target_key,
  impact_metric,
  impact_unit,
  impact_value_mode,
  impact_value_numeric,
  impact_value_text,
  impact_direction,
  intensity,
  metadata_json
)
where templates.code = '11-341'
on conflict (template_id, rule_code) where template_id is not null do update
set
  activity_type_id = excluded.activity_type_id,
  title = excluded.title,
  description = excluded.description,
  impact_target_type = excluded.impact_target_type,
  impact_target_key = excluded.impact_target_key,
  impact_metric = excluded.impact_metric,
  impact_unit = excluded.impact_unit,
  impact_value_mode = excluded.impact_value_mode,
  impact_value_numeric = excluded.impact_value_numeric,
  impact_value_text = excluded.impact_value_text,
  impact_direction = excluded.impact_direction,
  intensity = excluded.intensity,
  rule_source = excluded.rule_source,
  is_active = excluded.is_active,
  metadata_json = excluded.metadata_json,
  updated_at = now();

comment on table public.activity_types is
'Activity Recording MVP dictionary of primitive activity types such as handwriting, typing, reading, speaking, walking, waiting, calling and checking.';

comment on table public.activity_code_templates is
'Quick activity capture templates. Known-code events such as 11-341 are processed rule-based and do not require AI.';

comment on table public.activity_events is
'Primary event log for Activity Recording Layer. One user action should be recorded once here.';

comment on table public.event_links is
'Universal links from activity_events to value objects, contexts, observed objects, actors or other entities.';

comment on table public.impact_rules is
'Rule-based impact definitions for activity templates and activity types.';

comment on table public.impact_events is
'Concrete calculated impacts created from activity_events, usually by applying impact_rules.';

comment on table public.current_snapshots is
'Latest per-user snapshot values by entity and metric. Used for fast current-state summaries.';

comment on table public.daily_aggregates is
'Per-user daily aggregate metrics derived from activity_events and impact_events.';
