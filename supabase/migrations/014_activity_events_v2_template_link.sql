-- 014_activity_events_v2_template_link.sql
-- Activity Recording Layer v2 compatibility patch.
--
-- Purpose:
-- activity_events.template_id from migration 012 points to legacy activity_code_templates.
-- New v2 template-first model uses activity_templates.
-- Therefore we add activity_events.activity_template_id instead of overloading template_id.
--
-- This migration is additive and does not modify legacy activities, bookings,
-- activity_participants, activity_links, time_blocks, value_objects or commercial core.

create extension if not exists "pgcrypto";

alter table public.activity_events
add column if not exists activity_template_id uuid
references public.activity_templates(id)
on delete set null;

create index if not exists idx_activity_events_activity_template_id
on public.activity_events(activity_template_id);

drop trigger if exists trg_activity_events_updated_at on public.activity_events;

create trigger trg_activity_events_updated_at
before update on public.activity_events
for each row
execute function public.set_activity_recording_updated_at();

alter table public.activity_events
drop constraint if exists activity_events_source_check;

alter table public.activity_events
add constraint activity_events_source_check
check (
  source in (
    -- legacy/source values from 012
    'manual',
    'chat_ai',
    'calendar',
    'booking',
    'rule',
    'import',
    'system',

    -- v2 source_type values
    'manual_form',
    'manual_chat',
    'voice_input',
    'app_action',
    'system_event',
    'api_webhook',
    'nfc_sensor',
    'wearable_import',
    'calendar_import',
    'ai_suggested',
    'legacy_code'
  )
);

alter table public.activity_events
drop constraint if exists activity_events_status_check;

alter table public.activity_events
add constraint activity_events_status_check
check (
  status in (
    -- legacy statuses
    'draft',
    'planned',
    'confirmed',
    'completed',
    'cancelled',
    'missed',
    'corrected',

    -- v2 lifecycle statuses
    'started',
    'paused',
    'imported_pending',
    'archived'
  )
);

comment on column public.activity_events.activity_template_id is
'Activity Recording Layer v2 template reference. Do not confuse with legacy template_id, which points to activity_code_templates from migration 012.';

comment on constraint activity_events_source_check on public.activity_events is
'Allows both legacy source values and Activity Recording Layer v2 source_type values.';

comment on constraint activity_events_status_check on public.activity_events is
'Allows both legacy activity statuses and Activity Recording Layer v2 lifecycle statuses.';