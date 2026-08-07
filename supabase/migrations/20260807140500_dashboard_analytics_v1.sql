-- ARCTor Dashboard Analytics V1
-- Persistent user/profile dashboard blocks.
-- Initial executable data contract:
-- activities -> duration_minutes -> sum -> day -> 7/14/30 days
-- Visualizations enabled in runtime: line, bar, metric.

begin;

create table if not exists public.dashboard_analytics_blocks (
  id uuid primary key default gen_random_uuid(),

  owner_user_id uuid not null
    references public.app_users(id) on delete cascade,
  owner_actor_id uuid not null
    references public.actors(id) on delete cascade,

  title text null,
  visualization_type text not null,
  source_type text not null,
  metric_key text not null,
  aggregation_key text not null,
  group_by_key text not null,
  period_days integer not null,

  sort_order integer not null default 0,
  is_visible boolean not null default true,
  config_json jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),

  constraint dashboard_analytics_blocks_title_check
    check (title is null or char_length(title) <= 120),

  constraint dashboard_analytics_blocks_visualization_check
    check (
      visualization_type in (
        'line',
        'bar',
        'metric',
        'donut',
        'radar',
        'heatmap',
        'scatter',
        'progress'
      )
    ),

  constraint dashboard_analytics_blocks_source_check
    check (
      source_type in (
        'activities',
        'facts',
        'observation_objects',
        'calendar',
        'commerce',
        'points',
        'certificates'
      )
    ),

  constraint dashboard_analytics_blocks_aggregation_check
    check (
      aggregation_key in (
        'sum',
        'average',
        'count',
        'min',
        'max',
        'latest',
        'change'
      )
    ),

  constraint dashboard_analytics_blocks_grouping_check
    check (
      group_by_key in (
        'day',
        'week',
        'month',
        'category',
        'observation_object',
        'profile'
      )
    ),

  constraint dashboard_analytics_blocks_period_check
    check (period_days between 1 and 3660),

  constraint dashboard_analytics_blocks_sort_order_check
    check (sort_order >= 0),

  constraint dashboard_analytics_blocks_config_object_check
    check (jsonb_typeof(config_json) = 'object')
);

create index if not exists dashboard_analytics_blocks_owner_actor_idx
  on public.dashboard_analytics_blocks (
    owner_user_id,
    owner_actor_id,
    is_visible,
    sort_order,
    created_at
  );

alter table public.dashboard_analytics_blocks enable row level security;

revoke all on table public.dashboard_analytics_blocks
  from public, anon, authenticated;

grant select, insert, update, delete
  on table public.dashboard_analytics_blocks
  to service_role;

comment on table public.dashboard_analytics_blocks is
  'Persistent per-account/per-active-profile dashboard analytics configuration. Query execution is server-mediated. V1 executes activity duration grouped by day; the schema already reserves the approved visualization/source vocabulary for later analytics sources.';

commit;
