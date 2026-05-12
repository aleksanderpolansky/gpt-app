create table if not exists public.activity_corrections (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null,
  event_id uuid not null,

  correction_type text not null default 'manual_patch',
  correction_status text not null default 'applied',

  changed_fields text[] not null default array[]::text[],

  previous_event_json jsonb not null default '{}'::jsonb,
  new_event_json jsonb not null default '{}'::jsonb,

  previous_impact_events_json jsonb not null default '[]'::jsonb,
  previous_daily_aggregates_json jsonb not null default '[]'::jsonb,
  previous_current_snapshots_json jsonb not null default '[]'::jsonb,

  recalculation_result_json jsonb not null default '{}'::jsonb,

  reason text null,
  source text not null default 'api_patch',

  created_at timestamptz not null default now()
);

create index if not exists activity_corrections_user_id_created_at_idx
  on public.activity_corrections (user_id, created_at desc);

create index if not exists activity_corrections_event_id_created_at_idx
  on public.activity_corrections (event_id, created_at desc);

create index if not exists activity_corrections_status_idx
  on public.activity_corrections (correction_status);

do $$
begin
  alter table public.activity_corrections
    add constraint activity_corrections_correction_type_check
    check (
      correction_type in (
        'manual_patch',
        'duration_correction',
        'status_correction',
        'comment_correction',
        'timing_correction',
        'recalculation',
        'system_fix'
      )
    );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.activity_corrections
    add constraint activity_corrections_correction_status_check
    check (
      correction_status in (
        'applied',
        'failed',
        'rolled_back',
        'superseded'
      )
    );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.activity_corrections
    add constraint activity_corrections_source_check
    check (
      source in (
        'api_patch',
        'admin_tool',
        'system',
        'migration',
        'manual_sql'
      )
    );
exception
  when duplicate_object then null;
end $$;

comment on table public.activity_corrections is
  'Audit log for Activity Recording Layer corrections. Stores previous event state, previous impacts/aggregates/snapshots and recalculation result.';

comment on column public.activity_corrections.previous_event_json is
  'Full event row before correction. Used for audit and possible rollback.';

comment on column public.activity_corrections.previous_impact_events_json is
  'Impact events attached to the activity event before correction.';

comment on column public.activity_corrections.previous_daily_aggregates_json is
  'Daily aggregate rows related to the previous impact events before correction.';

comment on column public.activity_corrections.recalculation_result_json is
  'Result of correction recalculation: deleted impacts, aggregate rollback, new impacts, snapshots, processor counts.';