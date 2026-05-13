begin;

-- Activity Processing Logs
-- Append-oriented technical log for processing raw signals, activity events, corrections, impacts and aggregates.
-- This table helps debug ingestion, normalization, deduplication, event creation, correction recalculation and impact processing.
-- Current architecture note:
-- Server API routes use SUPABASE_SERVICE_ROLE_KEY and must keep backend ownership checks.
-- Direct anon/authenticated access is blocked by RLS.

create table if not exists public.activity_processing_logs (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references public.app_users(id) on delete cascade,

  raw_signal_id uuid references public.raw_activity_signals(id) on delete set null,
  activity_event_id uuid references public.activity_events(id) on delete set null,
  activity_correction_id uuid references public.activity_corrections(id) on delete set null,

  processing_run_id uuid,
  processor_name text not null,
  processor_version text,

  processing_stage text not null,
  processing_status text not null default 'started',
  severity text not null default 'info',

  message text,

  input_json jsonb not null default '{}'::jsonb,
  output_json jsonb not null default '{}'::jsonb,
  error_json jsonb not null default '{}'::jsonb,
  metadata_json jsonb not null default '{}'::jsonb,

  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms integer,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint activity_processing_logs_processor_name_not_empty_check
    check (length(trim(processor_name)) > 0),

  constraint activity_processing_logs_processing_stage_check
    check (
      processing_stage in (
        'ingest',
        'parse',
        'normalize',
        'validate',
        'deduplicate',
        'create_event',
        'link_event',
        'process_impacts',
        'aggregate',
        'snapshot',
        'correction',
        'rollback',
        'timeline_check',
        'timeline_adjustment',
        'finalize',
        'error',
        'debug'
      )
    ),

  constraint activity_processing_logs_processing_status_check
    check (
      processing_status in (
        'started',
        'processing',
        'completed',
        'failed',
        'skipped',
        'warning',
        'retrying',
        'cancelled'
      )
    ),

  constraint activity_processing_logs_severity_check
    check (
      severity in (
        'debug',
        'info',
        'notice',
        'warning',
        'error',
        'critical'
      )
    ),

  constraint activity_processing_logs_duration_ms_check
    check (
      duration_ms is null
      or duration_ms >= 0
    ),

  constraint activity_processing_logs_time_order_check
    check (
      finished_at is null
      or finished_at >= started_at
    ),

  constraint activity_processing_logs_input_is_object_check
    check (jsonb_typeof(input_json) = 'object'),

  constraint activity_processing_logs_output_is_object_check
    check (jsonb_typeof(output_json) = 'object'),

  constraint activity_processing_logs_error_is_object_check
    check (jsonb_typeof(error_json) = 'object'),

  constraint activity_processing_logs_metadata_is_object_check
    check (jsonb_typeof(metadata_json) = 'object')
);

drop trigger if exists trg_activity_processing_logs_updated_at on public.activity_processing_logs;

create trigger trg_activity_processing_logs_updated_at
before update on public.activity_processing_logs
for each row
execute function public.set_activity_recording_updated_at();

create index if not exists idx_activity_processing_logs_user_created_at
on public.activity_processing_logs(user_id, created_at desc);

create index if not exists idx_activity_processing_logs_raw_signal_id
on public.activity_processing_logs(raw_signal_id, created_at desc);

create index if not exists idx_activity_processing_logs_activity_event_id
on public.activity_processing_logs(activity_event_id, created_at desc);

create index if not exists idx_activity_processing_logs_activity_correction_id
on public.activity_processing_logs(activity_correction_id, created_at desc);

create index if not exists idx_activity_processing_logs_processing_run_id
on public.activity_processing_logs(processing_run_id, created_at desc);

create index if not exists idx_activity_processing_logs_stage_status
on public.activity_processing_logs(processing_stage, processing_status, created_at desc);

create index if not exists idx_activity_processing_logs_severity
on public.activity_processing_logs(severity, created_at desc);

alter table public.activity_processing_logs enable row level security;

revoke all on table public.activity_processing_logs from anon, authenticated;

drop policy if exists "No direct public activity processing logs access" on public.activity_processing_logs;

create policy "No direct public activity processing logs access"
on public.activity_processing_logs
for all
to anon, authenticated
using (false)
with check (false);

commit;
