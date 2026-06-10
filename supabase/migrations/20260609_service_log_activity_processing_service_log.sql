-- GPT-APP / AI-NAVIGATOR
-- SERVICE_LOG_IMPLEMENTATION / Step 5
-- Migration draft only: activity_processing_service_log
--
-- Purpose:
--   Operational observability/audit log for the semantic activity pipeline.
--   This table is NOT the source of truth for activity_events, value_objects,
--   entity_classifications, contextual_categories, metrics, corrections or analytics.
--
-- Required order:
--   create table -> indexes -> trigger -> enable RLS -> policies -> explicit GRANT.
--
-- Safety posture:
--   - private by default
--   - no anon access
--   - no direct authenticated table access in v0; user-facing UI must go through controlled API
--   - no authenticated direct select/insert/update/delete in v0
--   - service_role may manage rows for backend/server controlled flows
--   - raw_message_text is never public-safe
--   - service log failure must not block the domain activity flow in v0

create table if not exists public.activity_processing_service_log (
  id uuid primary key default gen_random_uuid(),

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  -- Primary RLS boundary.
  user_id uuid not null,

  -- Optional app/domain ownership context.
  app_user_id uuid,
  actor_user_id uuid,
  selected_space_id uuid,
  organization_id uuid,

  -- Request/session correlation.
  session_id text,
  request_id text,
  correlation_id text,
  client_event_id text,

  -- Source surface and route.
  source_surface text not null default 'unknown',
  source_route text,
  source_component text,
  source_action text,
  http_method text,

  -- Raw user message / input.
  raw_message_text text,
  redacted_message_text text,
  message_language text,
  message_received_at timestamp with time zone,
  message_hash text,
  message_visibility_scope text not null default 'private',

  -- Processing stage.
  stage_key text not null,
  stage_status text not null default 'pending',
  processor_name text,
  processor_version text,
  processing_started_at timestamp with time zone,
  processing_finished_at timestamp with time zone,
  processing_duration_ms integer,

  -- Preview / no-write / write-result flags.
  is_preview boolean not null default false,
  is_write_attempted boolean not null default false,
  activity_event_created boolean not null default false,
  value_object_created boolean not null default false,
  activity_value_object_link_created boolean not null default false,
  classification_created boolean not null default false,
  aggregate_updated boolean not null default false,

  -- Candidate outputs.
  category_candidates_json jsonb not null default '[]'::jsonb,
  metric_candidates_json jsonb not null default '[]'::jsonb,
  value_object_candidates_json jsonb not null default '[]'::jsonb,
  exposure_candidates_json jsonb not null default '[]'::jsonb,
  state_delta_candidates_json jsonb not null default '[]'::jsonb,
  review_action_candidates_json jsonb not null default '[]'::jsonb,

  -- User review / correction.
  user_review_status text,
  user_review_action text,
  user_review_note text,
  corrected_message_text text,
  correction_id uuid,
  correction_type text,

  -- Domain persistence references. Nullable and intentionally not FK-bound in v0,
  -- so logging never blocks the domain flow if another table changes.
  activity_event_id uuid,
  activity_template_id uuid,
  derivation_run_id uuid,
  stable_bundle_id uuid,
  entity_classification_ids_json jsonb not null default '[]'::jsonb,
  value_object_ids_json jsonb not null default '[]'::jsonb,
  event_link_ids_json jsonb not null default '[]'::jsonb,
  aggregate_ids_json jsonb not null default '[]'::jsonb,

  -- Quantitative and qualitative metrics.
  duration_minutes_candidate numeric,
  duration_minutes_confirmed numeric,
  metric_summary_json jsonb not null default '{}'::jsonb,
  quantity_summary_json jsonb not null default '{}'::jsonb,
  quality_score_json jsonb not null default '{}'::jsonb,

  -- Privacy and safety.
  privacy_scope text not null default 'private',
  contains_sensitive_data boolean not null default false,
  public_safe boolean not null default false,
  raw_text_publicly_visible boolean not null default false,
  ai_output_publicly_visible boolean not null default false,
  safety_warnings_json jsonb not null default '[]'::jsonb,

  -- Diagnostics.
  error_code text,
  error_message text,
  warning_messages_json jsonb not null default '[]'::jsonb,
  skipped_reason text,
  debug_payload_json jsonb not null default '{}'::jsonb,
  evidence_json jsonb not null default '{}'::jsonb,

  -- UI display flags.
  display_title text,
  display_summary text,
  visible_in_service_log boolean not null default true,
  visible_in_activity_capture boolean not null default false,
  visible_in_today boolean not null default false,
  visible_in_value_object boolean not null default false,
  visible_in_analytics boolean not null default false,

  constraint activity_processing_service_log_user_id_not_null
    check (user_id is not null),

  constraint activity_processing_service_log_stage_key_not_empty
    check (length(trim(stage_key)) > 0),

  constraint activity_processing_service_log_source_surface_not_empty
    check (length(trim(source_surface)) > 0),

  constraint activity_processing_service_log_stage_status_allowed
    check (
      stage_status in (
        'pending',
        'received',
        'started',
        'completed',
        'skipped',
        'warning',
        'failed',
        'confirmed',
        'corrected',
        'rejected'
      )
    ),

  constraint activity_processing_service_log_message_visibility_scope_allowed
    check (
      message_visibility_scope in (
        'private',
        'internal_debug',
        'redacted',
        'public_safe'
      )
    ),

  constraint activity_processing_service_log_privacy_scope_allowed
    check (
      privacy_scope in (
        'private',
        'internal_debug',
        'team',
        'public_safe'
      )
    ),

  constraint activity_processing_service_log_http_method_allowed
    check (
      http_method is null
      or http_method in (
        'GET',
        'POST',
        'PATCH',
        'PUT',
        'DELETE'
      )
    ),

  constraint activity_processing_service_log_processing_duration_ms_nonnegative
    check (
      processing_duration_ms is null
      or processing_duration_ms >= 0
    ),

  constraint activity_processing_service_log_duration_candidate_nonnegative
    check (
      duration_minutes_candidate is null
      or duration_minutes_candidate >= 0
    ),

  constraint activity_processing_service_log_duration_confirmed_nonnegative
    check (
      duration_minutes_confirmed is null
      or duration_minutes_confirmed >= 0
    ),

  constraint activity_processing_service_log_processing_time_order
    check (
      processing_started_at is null
      or processing_finished_at is null
      or processing_finished_at >= processing_started_at
    ),

  constraint activity_processing_service_log_candidates_are_arrays
    check (
      jsonb_typeof(category_candidates_json) = 'array'
      and jsonb_typeof(metric_candidates_json) = 'array'
      and jsonb_typeof(value_object_candidates_json) = 'array'
      and jsonb_typeof(exposure_candidates_json) = 'array'
      and jsonb_typeof(state_delta_candidates_json) = 'array'
      and jsonb_typeof(review_action_candidates_json) = 'array'
    ),

  constraint activity_processing_service_log_reference_lists_are_arrays
    check (
      jsonb_typeof(entity_classification_ids_json) = 'array'
      and jsonb_typeof(value_object_ids_json) = 'array'
      and jsonb_typeof(event_link_ids_json) = 'array'
      and jsonb_typeof(aggregate_ids_json) = 'array'
    ),

  constraint activity_processing_service_log_summary_json_are_objects
    check (
      jsonb_typeof(metric_summary_json) = 'object'
      and jsonb_typeof(quantity_summary_json) = 'object'
      and jsonb_typeof(quality_score_json) = 'object'
      and jsonb_typeof(debug_payload_json) = 'object'
      and jsonb_typeof(evidence_json) = 'object'
    ),

  constraint activity_processing_service_log_warning_json_are_arrays
    check (
      jsonb_typeof(safety_warnings_json) = 'array'
      and jsonb_typeof(warning_messages_json) = 'array'
    ),

  constraint activity_processing_service_log_raw_text_not_public
    check (
      raw_text_publicly_visible = false
    ),

  constraint activity_processing_service_log_ai_output_not_public_by_default
    check (
      ai_output_publicly_visible = false
      or public_safe = true
    )
);

create index if not exists activity_processing_service_log_user_created_idx
on public.activity_processing_service_log (user_id, created_at desc);

create index if not exists activity_processing_service_log_correlation_idx
on public.activity_processing_service_log (correlation_id);

create index if not exists activity_processing_service_log_request_idx
on public.activity_processing_service_log (request_id);

create index if not exists activity_processing_service_log_client_event_idx
on public.activity_processing_service_log (client_event_id);

create index if not exists activity_processing_service_log_stage_idx
on public.activity_processing_service_log (stage_key, stage_status);

create index if not exists activity_processing_service_log_source_route_idx
on public.activity_processing_service_log (source_route);

create index if not exists activity_processing_service_log_activity_event_idx
on public.activity_processing_service_log (activity_event_id);

create index if not exists activity_processing_service_log_activity_template_idx
on public.activity_processing_service_log (activity_template_id);

create index if not exists activity_processing_service_log_derivation_run_idx
on public.activity_processing_service_log (derivation_run_id);

create index if not exists activity_processing_service_log_stable_bundle_idx
on public.activity_processing_service_log (stable_bundle_id);

create index if not exists activity_processing_service_log_privacy_idx
on public.activity_processing_service_log (
  privacy_scope,
  contains_sensitive_data,
  public_safe
);

create index if not exists activity_processing_service_log_processing_time_idx
on public.activity_processing_service_log (
  processing_started_at,
  processing_finished_at
);

create index if not exists activity_processing_service_log_category_candidates_gin_idx
on public.activity_processing_service_log
using gin (category_candidates_json);

create index if not exists activity_processing_service_log_metric_candidates_gin_idx
on public.activity_processing_service_log
using gin (metric_candidates_json);

create index if not exists activity_processing_service_log_value_object_candidates_gin_idx
on public.activity_processing_service_log
using gin (value_object_candidates_json);

create or replace function public.set_activity_processing_service_log_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_activity_processing_service_log_updated_at
on public.activity_processing_service_log;

create trigger trg_activity_processing_service_log_updated_at
before update on public.activity_processing_service_log
for each row
execute function public.set_activity_processing_service_log_updated_at();

alter table public.activity_processing_service_log enable row level security;

revoke all on table public.activity_processing_service_log from anon, authenticated;
revoke all on public.activity_processing_service_log from authenticated;

drop policy if exists activity_processing_service_log_authenticated_select_own
on public.activity_processing_service_log;

drop policy if exists activity_processing_service_log_authenticated_insert_own
on public.activity_processing_service_log;

drop policy if exists "No direct public activity processing service log access"
on public.activity_processing_service_log;

create policy "No direct public activity processing service log access"
on public.activity_processing_service_log
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists activity_processing_service_log_service_role_all
on public.activity_processing_service_log;

create policy activity_processing_service_log_service_role_all
on public.activity_processing_service_log
for all
to service_role
using (true)
with check (true);

grant select, insert, update, delete on table public.activity_processing_service_log to service_role;

comment on table public.activity_processing_service_log is
'Append-first private service log for verifying the semantic activity processing pipeline. Not a source-of-truth replacement for activity_events, value_objects, categories, metrics, corrections or analytics.';

comment on column public.activity_processing_service_log.user_id is
'Server-side ownership/filtering boundary for the service log. Direct authenticated table access is disabled in v0.';

comment on column public.activity_processing_service_log.raw_message_text is
'Private raw user input for debugging and audit. Must not be exposed publicly.';

comment on column public.activity_processing_service_log.redacted_message_text is
'Optional UI-safe/redacted version of raw user input.';

comment on column public.activity_processing_service_log.correlation_id is
'Groups all service-log rows created during one activity-processing cycle.';

comment on column public.activity_processing_service_log.stage_key is
'Machine-readable processing checkpoint, for example message_received, preview_completed, candidates_detected, write_gate_passed, activity_event_persisted, value_object_bridge_processed.';

comment on column public.activity_processing_service_log.stage_status is
'Processing status for this checkpoint. Allowed values: pending, received, started, completed, skipped, warning, failed, confirmed, corrected, rejected.';

comment on column public.activity_processing_service_log.debug_payload_json is
'Private debug payload. Do not expose through public UI/API.';

comment on column public.activity_processing_service_log.evidence_json is
'Structured proof/evidence for QA and acceptance checks.';
