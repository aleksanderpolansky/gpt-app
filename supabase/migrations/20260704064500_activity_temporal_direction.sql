-- ARCTor.app Activity Container temporal direction
-- One semantic field for the same Activity Container process:
--   calendar entry point => future => calendar_events
--   activity journal entry point => past => activity_events
--
-- This migration intentionally does not create a new table.
-- Old pre-container activity_events remain NULL unless they were created
-- by the new activity journal review gate.

alter table public.activity_events
  add column if not exists temporal_direction text;

alter table public.calendar_events
  add column if not exists temporal_direction text;

alter table public.activity_events
  drop constraint if exists activity_events_temporal_direction_check;

alter table public.calendar_events
  drop constraint if exists calendar_events_temporal_direction_check;

alter table public.activity_events
  add constraint activity_events_temporal_direction_check
  check (
    temporal_direction is null
    or temporal_direction in ('past', 'future')
  );

alter table public.calendar_events
  add constraint calendar_events_temporal_direction_check
  check (
    temporal_direction is null
    or temporal_direction in ('past', 'future')
  );

comment on column public.activity_events.temporal_direction is
  'Activity Container time direction. past = created from My Activity Journal. future is reserved but normally stored in calendar_events. NULL = legacy/pre-container row.';

comment on column public.calendar_events.temporal_direction is
  'Activity Container time direction. future = created from Calendar as planned activity. NULL = legacy/non-container row.';

update public.activity_events
set temporal_direction = 'past'
where temporal_direction is null
  and source = 'manual_form'
  and (
    metadata_json ->> 'temporal_direction' = 'past'
    or metadata_json ->> 'save_gate' = 'activity_journal_review_add_gate_v1'
  );

update public.calendar_events
set temporal_direction = 'future'
where temporal_direction is null
  and event_type = 'planned_activity';

create index if not exists activity_events_user_temporal_started_idx
  on public.activity_events (user_id, temporal_direction, started_at desc)
  where temporal_direction is not null;

create index if not exists calendar_events_user_temporal_start_idx
  on public.calendar_events (user_id, temporal_direction, start_time desc)
  where temporal_direction is not null;