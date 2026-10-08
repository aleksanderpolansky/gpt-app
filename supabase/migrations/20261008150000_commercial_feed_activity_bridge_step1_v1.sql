-- ARCTor
-- COMMERCIAL FEED -> EXISTING ACTIVITY PIPELINE
-- STEP 1 / V1
-- 2026-10-08
--
-- Purpose:
-- 1) add durable provenance/public-analytics fields to activity_events;
-- 2) allow an activity event to act as a user-controlled organization actor
--    by reusing the already-approved message_actor_controlled_by_user_v1()
--    ownership rule;
-- 3) DO NOT create a second activity container/table.
--
-- This migration does NOT create facts and does NOT expose private facts publicly.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '90s';

do $preflight$
begin
  if to_regclass('public.activity_events') is null
     or to_regclass('public.message_objects') is null
     or to_regprocedure(
       'public.message_actor_controlled_by_user_v1(uuid,uuid)'
     ) is null then
    raise exception using
      errcode = '42P01',
      message = 'ARCTOR_COMMERCIAL_FEED_BRIDGE_REQUIRED_FOUNDATION_MISSING';
  end if;
end
$preflight$;

alter table public.activity_events
  add column if not exists source_message_object_id uuid
    references public.message_objects(id) on delete set null,
  add column if not exists activity_context_code text
    not null default 'private',
  add column if not exists analytics_visibility_code text
    not null default 'private',
  add column if not exists commercial_processing_status text,
  add column if not exists commercial_processing_error text;

do $constraints$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'activity_events_context_code_check'
      and conrelid = 'public.activity_events'::regclass
  ) then
    alter table public.activity_events
      add constraint activity_events_context_code_check
      check (activity_context_code in ('private','commercial'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'activity_events_analytics_visibility_check'
      and conrelid = 'public.activity_events'::regclass
  ) then
    alter table public.activity_events
      add constraint activity_events_analytics_visibility_check
      check (analytics_visibility_code in ('private','public','withdrawn'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'activity_events_commercial_processing_status_check'
      and conrelid = 'public.activity_events'::regclass
  ) then
    alter table public.activity_events
      add constraint activity_events_commercial_processing_status_check
      check (
        commercial_processing_status is null
        or commercial_processing_status in (
          'pending',
          'analysis_ready',
          'auto_processed',
          'needs_review',
          'failed'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'activity_events_commercial_public_consistency_check'
      and conrelid = 'public.activity_events'::regclass
  ) then
    alter table public.activity_events
      add constraint activity_events_commercial_public_consistency_check
      check (
        activity_context_code <> 'commercial'
        or analytics_visibility_code in ('public','withdrawn')
      );
  end if;
end
$constraints$;

create index if not exists activity_events_source_message_object_idx
  on public.activity_events(source_message_object_id)
  where source_message_object_id is not null;

create index if not exists activity_events_commercial_status_idx
  on public.activity_events(
    commercial_processing_status,
    created_at desc
  )
  where activity_context_code = 'commercial';

create index if not exists activity_events_public_analytics_idx
  on public.activity_events(created_at desc)
  where activity_context_code = 'commercial'
    and analytics_visibility_code = 'public';

-- Reuse the message/publication actor-control contract for activity events.
-- This keeps person/avatar behavior and additionally permits organization
-- actors controlled by the same user through organizations.owner_actor_id.
create or replace function public.enforce_activity_event_actor_ownership_v2()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if new.user_id is null
     or new.performed_by_actor_id is null
     or new.acting_as_actor_id is null then
    raise exception using
      errcode = '23514',
      message = 'REALITY_V2_ACTIVITY_PRIMARY_ACTOR_CONTEXT_REQUIRED';
  end if;

  if exists (
    select 1
    from (
      values
        (new.performed_by_actor_id),
        (new.acting_as_actor_id),
        (new.acting_for_actor_id)
    ) referenced_actor(actor_id)
    where referenced_actor.actor_id is not null
      and not public.message_actor_controlled_by_user_v1(
        new.user_id,
        referenced_actor.actor_id
      )
  ) then
    raise exception using
      errcode = '42501',
      message = 'REALITY_V2_ACTIVITY_ACTOR_NOT_CONTROLLED_BY_USER';
  end if;

  return new;
end;
$function$;

comment on column public.activity_events.source_message_object_id is
  'Canonical feed/message_object provenance for a commercial publication activity.';
comment on column public.activity_events.activity_context_code is
  'private or commercial. Commercial uses the same activity_events container; this is not a second activity model.';
comment on column public.activity_events.analytics_visibility_code is
  'Whether a commercial activity may feed public analytics. Private activity defaults to private.';
comment on column public.activity_events.commercial_processing_status is
  'Commercial feed processing state: pending, analysis_ready, auto_processed, needs_review, failed.';

commit;

select jsonb_pretty(
  jsonb_build_object(
    'contract',
      'ARCTOR_COMMERCIAL_FEED_ACTIVITY_BRIDGE_STEP1_V1',
    'sourceMessageColumn',
      exists (
        select 1 from information_schema.columns
        where table_schema='public'
          and table_name='activity_events'
          and column_name='source_message_object_id'
      ),
    'contextColumn',
      exists (
        select 1 from information_schema.columns
        where table_schema='public'
          and table_name='activity_events'
          and column_name='activity_context_code'
      ),
    'analyticsVisibilityColumn',
      exists (
        select 1 from information_schema.columns
        where table_schema='public'
          and table_name='activity_events'
          and column_name='analytics_visibility_code'
      ),
    'commercialStatusColumn',
      exists (
        select 1 from information_schema.columns
        where table_schema='public'
          and table_name='activity_events'
          and column_name='commercial_processing_status'
      ),
    'actorControlHelperPresent',
      to_regprocedure(
        'public.message_actor_controlled_by_user_v1(uuid,uuid)'
      ) is not null,
    'activityOwnershipGuardPresent',
      to_regprocedure(
        'public.enforce_activity_event_actor_ownership_v2()'
      ) is not null
  )
) as arctor_commercial_feed_activity_bridge_step1_postcheck;
