-- ARCTor.app
-- PP3B1 additive recurrence-rule foundation.
-- Recurrence is orthogonal to PP1 schedule_mode_code.
-- This migration does NOT create future occurrences yet.

begin;

do $preflight$
begin
  if to_regclass('public.activity_events') is null then
    raise exception using
      errcode = '42P01',
      message = 'PP3B1_ACTIVITY_EVENTS_MISSING';
  end if;

  if to_regclass('public.activity_recurrence_rules') is not null then
    raise exception using
      errcode = '42P07',
      message = 'PP3B1_ACTIVITY_RECURRENCE_RULES_ALREADY_EXISTS';
  end if;
end;
$preflight$;

create table public.activity_recurrence_rules (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null
    references public.app_users(id) on delete cascade,
  owner_actor_id uuid not null
    references public.actors(id) on delete cascade,
  source_activity_event_id uuid not null
    references public.activity_events(id) on delete cascade,

  frequency_code text not null,
  interval_count integer not null default 1,
  anchor_date date not null,
  timezone text not null default 'UTC',

  recurrence_basis_code text not null default 'calendar',
  end_mode_code text not null default 'never',
  until_date date,
  count_limit integer,

  status_code text not null default 'active',
  source_text text,
  source_pattern_code text,
  metadata_json jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),

  constraint activity_recurrence_rules_source_unique
    unique (source_activity_event_id),

  constraint activity_recurrence_rules_frequency_check
    check (frequency_code in ('daily','weekly','monthly')),

  constraint activity_recurrence_rules_interval_check
    check (interval_count between 1 and 365),

  constraint activity_recurrence_rules_basis_check
    check (recurrence_basis_code in ('calendar','after_completion')),

  constraint activity_recurrence_rules_end_mode_check
    check (end_mode_code in ('never','until','count')),

  constraint activity_recurrence_rules_end_contract_check
    check (
      (end_mode_code = 'never' and until_date is null and count_limit is null)
      or
      (end_mode_code = 'until' and until_date is not null and count_limit is null)
      or
      (end_mode_code = 'count' and until_date is null and count_limit is not null)
    ),

  constraint activity_recurrence_rules_count_limit_check
    check (count_limit is null or count_limit between 1 and 10000),

  constraint activity_recurrence_rules_until_order_check
    check (until_date is null or until_date >= anchor_date),

  constraint activity_recurrence_rules_status_check
    check (status_code in ('active','paused','ended')),

  constraint activity_recurrence_rules_metadata_object_check
    check (jsonb_typeof(metadata_json) = 'object')
);

create index activity_recurrence_rules_owner_status_idx
  on public.activity_recurrence_rules (
    owner_user_id,
    owner_actor_id,
    status_code,
    frequency_code,
    anchor_date
  );

create index activity_recurrence_rules_anchor_idx
  on public.activity_recurrence_rules (
    anchor_date,
    frequency_code,
    interval_count
  )
  where status_code = 'active';

create or replace function public.enforce_activity_recurrence_rule_pp3b1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_activity public.activity_events%rowtype;
begin
  select *
  into v_activity
  from public.activity_events
  where id = new.source_activity_event_id;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'PP3B1_SOURCE_ACTIVITY_NOT_FOUND';
  end if;

  if v_activity.activity_role_code <> 'planned' then
    raise exception using
      errcode = '23514',
      message = 'PP3B1_RECURRENCE_REQUIRES_PLANNED_ACTIVITY';
  end if;

  if v_activity.user_id is distinct from new.owner_user_id
     or v_activity.acting_as_actor_id is distinct from new.owner_actor_id then
    raise exception using
      errcode = '42501',
      message = 'PP3B1_RECURRENCE_OWNER_MISMATCH';
  end if;

  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
       or new.owner_user_id is distinct from old.owner_user_id
       or new.owner_actor_id is distinct from old.owner_actor_id
       or new.source_activity_event_id is distinct from old.source_activity_event_id
       or new.created_at is distinct from old.created_at then
      raise exception using
        errcode = '23514',
        message = 'PP3B1_RECURRENCE_IDENTITY_IS_IMMUTABLE';
    end if;
  end if;

  new.updated_at := clock_timestamp();
  return new;
end;
$function$;

create trigger activity_recurrence_rules_guard_pp3b1
before insert or update
on public.activity_recurrence_rules
for each row
execute function public.enforce_activity_recurrence_rule_pp3b1();

alter table public.activity_recurrence_rules enable row level security;

create policy activity_recurrence_rules_no_direct_public_pp3b1
on public.activity_recurrence_rules
for all
to anon, authenticated
using (false)
with check (false);

create policy activity_recurrence_rules_service_role_all_pp3b1
on public.activity_recurrence_rules
for all
to service_role
using (true)
with check (true);

revoke all on table public.activity_recurrence_rules
  from public, anon, authenticated;

grant select, insert, update, delete
  on table public.activity_recurrence_rules
  to service_role;

revoke all on function public.enforce_activity_recurrence_rule_pp3b1()
  from public, anon, authenticated;

grant execute on function public.enforce_activity_recurrence_rule_pp3b1()
  to service_role;

comment on table public.activity_recurrence_rules is
  'PP3B recurrence definition attached to one canonical planned activity. Recurrence remains orthogonal to PP1 schedule mode. Future occurrence materialization is a later bounded executor step.';

comment on column public.activity_recurrence_rules.source_activity_event_id is
  'Canonical planned activity that owns the recurrence definition. It is not a separate project-task entity.';

comment on column public.activity_recurrence_rules.anchor_date is
  'Calendar anchor for cadence calculation. It does not force schedule_mode_code on the source activity.';

do $postcheck$
begin
  if to_regclass('public.activity_recurrence_rules') is null then
    raise exception using
      errcode = 'P0001',
      message = 'PP3B1_POSTCHECK_TABLE_MISSING';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'activity_recurrence_rules'
      and c.relrowsecurity
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'PP3B1_POSTCHECK_RLS_MISSING';
  end if;
end;
$postcheck$;

commit;
