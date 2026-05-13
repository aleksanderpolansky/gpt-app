begin;

-- Activity Raw Signals
-- Stores original incoming signals before normalization into activity_events.
-- Examples: manual text, app action, API webhook, NFC tap, calendar import, wearable measurement, system event, AI-suggested draft.
-- Current architecture note:
-- Server API routes use SUPABASE_SERVICE_ROLE_KEY and must keep backend ownership checks.
-- Direct anon/authenticated access is blocked by RLS.

create table if not exists public.raw_activity_signals (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references public.app_users(id) on delete cascade,

  source_type text not null,
  source_event_id text,
  idempotency_key text,

  raw_payload jsonb not null default '{}'::jsonb,
  normalized_preview_json jsonb not null default '{}'::jsonb,

  received_at timestamptz not null default now(),
  occurred_at timestamptz,
  measured_at timestamptz,

  trust_level text not null default 'untrusted',
  privacy_scope text not null default 'private',
  processing_status text not null default 'received',
  processing_error text,

  output_event_id uuid references public.activity_events(id) on delete set null,

  metadata_json jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint raw_activity_signals_source_type_check
    check (
      source_type in (
        'manual_chat',
        'manual_form',
        'voice_input',
        'app_action',
        'system_event',
        'api_webhook',
        'nfc_sensor',
        'wearable_import',
        'calendar_import',
        'ai_suggested',
        'file_import',
        'external_import',
        'unknown'
      )
    ),

  constraint raw_activity_signals_trust_level_check
    check (
      trust_level in (
        'untrusted',
        'low',
        'medium',
        'high',
        'trusted',
        'system'
      )
    ),

  constraint raw_activity_signals_privacy_scope_check
    check (
      privacy_scope in (
        'private',
        'shared_with_org',
        'public_masked',
        'public'
      )
    ),

  constraint raw_activity_signals_processing_status_check
    check (
      processing_status in (
        'received',
        'pending',
        'processing',
        'processed',
        'failed',
        'skipped',
        'duplicate',
        'ignored'
      )
    ),

  constraint raw_activity_signals_payload_is_object_check
    check (jsonb_typeof(raw_payload) = 'object'),

  constraint raw_activity_signals_normalized_preview_is_object_check
    check (jsonb_typeof(normalized_preview_json) = 'object'),

  constraint raw_activity_signals_metadata_is_object_check
    check (jsonb_typeof(metadata_json) = 'object')
);

drop trigger if exists trg_raw_activity_signals_updated_at on public.raw_activity_signals;

create trigger trg_raw_activity_signals_updated_at
before update on public.raw_activity_signals
for each row
execute function public.set_activity_recording_updated_at();

create index if not exists idx_raw_activity_signals_user_received_at
on public.raw_activity_signals(user_id, received_at desc);

create index if not exists idx_raw_activity_signals_user_processing_status
on public.raw_activity_signals(user_id, processing_status, received_at desc);

create index if not exists idx_raw_activity_signals_source_type_received_at
on public.raw_activity_signals(source_type, received_at desc);

create index if not exists idx_raw_activity_signals_output_event_id
on public.raw_activity_signals(output_event_id);

create unique index if not exists idx_raw_activity_signals_user_source_event_unique
on public.raw_activity_signals(user_id, source_type, source_event_id)
where source_event_id is not null;

create unique index if not exists idx_raw_activity_signals_user_idempotency_key_unique
on public.raw_activity_signals(user_id, source_type, idempotency_key)
where idempotency_key is not null;

alter table public.raw_activity_signals enable row level security;

revoke all on table public.raw_activity_signals from anon, authenticated;

drop policy if exists "No direct public raw activity signals access" on public.raw_activity_signals;

create policy "No direct public raw activity signals access"
on public.raw_activity_signals
for all
to anon, authenticated
using (false)
with check (false);

commit;
