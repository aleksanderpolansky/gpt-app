-- ARCTor.app
-- PP1A destructive controlled rebuild: canonical planned/actual activity foundation
-- Baseline: main @ 9d792aedd69a5657ab36a16ebae331b7a69a2871
--
-- This migration intentionally deletes experimental activity/calendar data.
-- It does not delete users, actors, Value Objects, P10 semantic relations,
-- branch policies, parameter registries or target standards.

begin;

do $migration_preflight$
declare
  v_bookings bigint;
  v_protected_count bigint;
begin
  if to_regclass('public.activities') is null
     or to_regclass('public.activity_events') is null
     or to_regclass('public.calendar_events') is null
     or to_regclass('public.activity_value_object_links') is null
     or to_regclass('public.value_objects') is null then
    raise exception using
      errcode='42P01',
      message='PP1A_REQUIRED_TABLE_MISSING';
  end if;

  select count(*) into v_bookings from public.bookings;
  if v_bookings <> 0 then
    raise exception using
      errcode='P0001',
      message='PP1A_LIVE_BOOKINGS_PRESENT';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema='public'
      and table_name='activity_events'
      and column_name='activity_role_code'
  ) then
    raise exception using
      errcode='42701',
      message='PP1A_ALREADY_APPLIED';
  end if;

  with recursive fk_edges as (
    select confrelid parent_oid, conrelid child_oid
    from pg_catalog.pg_constraint
    where contype='f'
  ), closure as (
    select anchor_oid, array[anchor_oid]::oid[] path
    from unnest(array[
      'public.activities'::regclass::oid,
      'public.activity_events'::regclass::oid,
      'public.calendar_events'::regclass::oid
    ]) anchor_oid
    union all
    select edge.child_oid, closure.path || edge.child_oid
    from closure join fk_edges edge on edge.parent_oid=closure.anchor_oid
    where not edge.child_oid=any(closure.path)
  )
  select count(*) into v_protected_count
  from closure
  join pg_catalog.pg_class class_row on class_row.oid=closure.anchor_oid
  join pg_catalog.pg_namespace namespace_row on namespace_row.oid=class_row.relnamespace
  where namespace_row.nspname='public'
    and class_row.relname in (
      'app_users', 'actors', 'actor_public_profiles', 'value_objects',
      'value_object_relations', 'value_object_relation_types',
      'value_object_branch_types', 'organizations'
    );

  if v_protected_count <> 0 then
    raise exception using
      errcode='P0001',
      message='PP1A_PROTECTED_TABLE_IN_TRUNCATE_CLOSURE';
  end if;
end
$migration_preflight$;

-- All current rows in these stores are explicitly classified as experimental.
-- CASCADE clears dependent recording/fact/state/link rows without touching
-- parent identity tables such as users, actors or Value Objects.
truncate table
  public.activities,
  public.activity_events,
  public.calendar_events
restart identity cascade;

-- activity_corrections.event_id is intentionally not a foreign key.
truncate table public.activity_corrections restart identity cascade;

create table public.activity_role_types (
  activity_role_code text primary key,
  title_key text not null,
  description_key text not null,
  display_order integer not null,
  status text not null default 'active',
  contract_version integer not null default 1,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint activity_role_types_status_check
    check (status in ('active','inactive','future')),
  constraint activity_role_types_contract_version_check
    check (contract_version >= 1)
);

create table public.activity_schedule_modes (
  schedule_mode_code text primary key,
  title_key text not null,
  description_key text not null,
  display_order integer not null,
  status text not null default 'active',
  contract_version integer not null default 1,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint activity_schedule_modes_status_check
    check (status in ('active','inactive','future')),
  constraint activity_schedule_modes_contract_version_check
    check (contract_version >= 1)
);

insert into public.activity_role_types (
  activity_role_code, title_key, description_key, display_order, status
) values
  ('planned','activity.role.planned.title','activity.role.planned.description',10,'active'),
  ('actual','activity.role.actual.title','activity.role.actual.description',20,'active');

insert into public.activity_schedule_modes (
  schedule_mode_code, title_key, description_key, display_order, status
) values
  ('unscheduled','activity.schedule.unscheduled.title','activity.schedule.unscheduled.description',10,'active'),
  ('date_only','activity.schedule.dateOnly.title','activity.schedule.dateOnly.description',20,'active'),
  ('date_range','activity.schedule.dateRange.title','activity.schedule.dateRange.description',30,'active'),
  ('deadline','activity.schedule.deadline.title','activity.schedule.deadline.description',40,'active'),
  ('exact','activity.schedule.exact.title','activity.schedule.exact.description',50,'active');

create trigger activity_role_types_updated_at_trg
before update on public.activity_role_types
for each row execute function public.set_activity_recording_updated_at();

create trigger activity_schedule_modes_updated_at_trg
before update on public.activity_schedule_modes
for each row execute function public.set_activity_recording_updated_at();

alter table public.activity_role_types enable row level security;
alter table public.activity_schedule_modes enable row level security;

revoke all on public.activity_role_types from public, anon, authenticated;
revoke all on public.activity_schedule_modes from public, anon, authenticated;
grant select on public.activity_role_types to anon, authenticated, service_role;
grant select on public.activity_schedule_modes to anon, authenticated, service_role;

create policy activity_role_types_public_read
on public.activity_role_types for select
using (true);

create policy activity_schedule_modes_public_read
on public.activity_schedule_modes for select
using (true);

alter table public.activity_events
  add column activity_role_code text,
  add column fulfills_planned_activity_event_id uuid,
  add column schedule_mode_code text,
  add column scheduled_date date,
  add column schedule_start_date date,
  add column schedule_end_date date,
  add column deadline_at timestamptz;

alter table public.activity_events
  add constraint activity_events_role_code_fk
    foreign key (activity_role_code)
    references public.activity_role_types(activity_role_code),
  add constraint activity_events_schedule_mode_code_fk
    foreign key (schedule_mode_code)
    references public.activity_schedule_modes(schedule_mode_code),
  add constraint activity_events_fulfills_plan_fk
    foreign key (fulfills_planned_activity_event_id)
    references public.activity_events(id)
    on delete set null,
  add constraint activity_events_no_self_fulfillment_check
    check (
      fulfills_planned_activity_event_id is null
      or fulfills_planned_activity_event_id <> id
    ),
  add constraint activity_events_schedule_range_order_check
    check (
      schedule_start_date is null
      or schedule_end_date is null
      or schedule_end_date >= schedule_start_date
    );

create or replace function public.enforce_activity_event_pp1a()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_plan public.activity_events%rowtype;
begin
  if tg_op = 'UPDATE'
     and old.activity_role_code is not null
     and new.activity_role_code is distinct from old.activity_role_code then
    raise exception using errcode='23514', message='PP1_ACTIVITY_ROLE_IMMUTABLE';
  end if;

  if new.activity_role_code is null then
    if new.temporal_direction = 'future'
       or new.status in ('planned','confirmed','missed') then
      new.activity_role_code := 'planned';
    else
      new.activity_role_code := 'actual';
    end if;
  end if;

  if new.activity_role_code = 'planned' then
    if new.schedule_mode_code is null then
      if new.started_at is not null then
        new.schedule_mode_code := 'exact';
      elsif new.deadline_at is not null then
        new.schedule_mode_code := 'deadline';
      elsif new.schedule_start_date is not null or new.schedule_end_date is not null then
        new.schedule_mode_code := 'date_range';
      elsif new.scheduled_date is not null then
        new.schedule_mode_code := 'date_only';
      else
        new.schedule_mode_code := 'unscheduled';
      end if;
    end if;

    if new.status not in ('draft','planned','confirmed','cancelled','missed','archived') then
      raise exception using errcode='23514', message='PP1_PLANNED_STATUS_NOT_ALLOWED';
    end if;

    if new.fulfills_planned_activity_event_id is not null then
      raise exception using errcode='23514', message='PP1_PLANNED_CANNOT_FULFILL_PLAN';
    end if;

    case new.schedule_mode_code
      when 'unscheduled' then
        if new.scheduled_date is not null
           or new.schedule_start_date is not null
           or new.schedule_end_date is not null
           or new.deadline_at is not null
           or new.started_at is not null
           or new.ended_at is not null then
          raise exception using errcode='23514', message='PP1_UNSCHEDULED_FIELDS_FORBIDDEN';
        end if;
      when 'date_only' then
        if new.scheduled_date is null
           or new.schedule_start_date is not null
           or new.schedule_end_date is not null
           or new.deadline_at is not null
           or new.started_at is not null
           or new.ended_at is not null then
          raise exception using errcode='23514', message='PP1_DATE_ONLY_FIELDS_INVALID';
        end if;
      when 'date_range' then
        if new.schedule_start_date is null
           or new.schedule_end_date is null
           or new.scheduled_date is not null
           or new.deadline_at is not null
           or new.started_at is not null
           or new.ended_at is not null then
          raise exception using errcode='23514', message='PP1_DATE_RANGE_FIELDS_INVALID';
        end if;
      when 'deadline' then
        if new.deadline_at is null
           or new.scheduled_date is not null
           or new.schedule_start_date is not null
           or new.schedule_end_date is not null
           or new.started_at is not null
           or new.ended_at is not null then
          raise exception using errcode='23514', message='PP1_DEADLINE_FIELDS_INVALID';
        end if;
      when 'exact' then
        if new.started_at is null
           or (new.ended_at is null and new.duration_minutes is null)
           or new.scheduled_date is not null
           or new.schedule_start_date is not null
           or new.schedule_end_date is not null
           or new.deadline_at is not null then
          raise exception using errcode='23514', message='PP1_EXACT_FIELDS_INVALID';
        end if;
      else
        raise exception using errcode='23514', message='PP1_SCHEDULE_MODE_NOT_ALLOWED';
    end case;

    if new.temporal_direction is null then
      new.temporal_direction := 'future';
    end if;
  elsif new.activity_role_code = 'actual' then
    if new.status not in (
      'draft','started','paused','completed','corrected','cancelled',
      'imported_pending','archived'
    ) then
      raise exception using errcode='23514', message='PP1_ACTUAL_STATUS_NOT_ALLOWED';
    end if;

    if new.schedule_mode_code is not null
       or new.scheduled_date is not null
       or new.schedule_start_date is not null
       or new.schedule_end_date is not null
       or new.deadline_at is not null then
      raise exception using errcode='23514', message='PP1_ACTUAL_SCHEDULE_FIELDS_FORBIDDEN';
    end if;

    if new.fulfills_planned_activity_event_id is not null then
      select * into v_plan
      from public.activity_events activity_event
      where activity_event.id = new.fulfills_planned_activity_event_id;

      if not found then
        raise exception using errcode='23503', message='PP1_PLANNED_ACTIVITY_NOT_FOUND';
      end if;

      if v_plan.activity_role_code <> 'planned' then
        raise exception using errcode='23514', message='PP1_FULFILL_TARGET_NOT_PLANNED';
      end if;

      if new.user_id is distinct from v_plan.user_id
         or new.acting_as_actor_id is distinct from v_plan.acting_as_actor_id then
        raise exception using errcode='42501', message='PP1_PLAN_ACTUAL_OWNER_MISMATCH';
      end if;
    end if;

    if new.temporal_direction is null
       and new.status in ('completed','corrected','cancelled','archived') then
      new.temporal_direction := 'past';
    end if;
  else
    raise exception using errcode='23514', message='PP1_ACTIVITY_ROLE_NOT_ALLOWED';
  end if;

  return new;
end
$function$;

create trigger activity_events_pp1a_contract_trg
before insert or update on public.activity_events
for each row execute function public.enforce_activity_event_pp1a();

alter table public.activity_events
  alter column activity_role_code set not null;

create index activity_events_role_status_idx
  on public.activity_events(user_id, activity_role_code, status, created_at desc);
create index activity_events_fulfills_plan_idx
  on public.activity_events(fulfills_planned_activity_event_id, created_at)
  where fulfills_planned_activity_event_id is not null;
create index activity_events_schedule_mode_idx
  on public.activity_events(user_id, schedule_mode_code, started_at, deadline_at)
  where activity_role_code='planned';

alter table public.calendar_events
  add column related_activity_event_id uuid;

alter table public.calendar_events
  add constraint calendar_events_related_activity_event_fk
    foreign key (related_activity_event_id)
    references public.activity_events(id)
    on delete set null;

create unique index calendar_events_related_activity_event_unique_idx
  on public.calendar_events(related_activity_event_id)
  where related_activity_event_id is not null;

create or replace function public.enforce_calendar_activity_projection_pp1a()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_activity public.activity_events%rowtype;
  v_expected_end timestamptz;
begin
  if new.related_activity_event_id is null then
    return new;
  end if;

  select * into v_activity
  from public.activity_events activity_event
  where activity_event.id = new.related_activity_event_id;

  if not found then
    raise exception using errcode='23503', message='PP1_CALENDAR_ACTIVITY_NOT_FOUND';
  end if;

  if v_activity.activity_role_code <> 'planned'
     or v_activity.schedule_mode_code <> 'exact' then
    raise exception using errcode='23514', message='PP1_CALENDAR_REQUIRES_EXACT_PLANNED_ACTIVITY';
  end if;

  if new.user_id is null then new.user_id := v_activity.user_id; end if;
  if new.actor_id is null then new.actor_id := v_activity.acting_as_actor_id; end if;

  if new.user_id is distinct from v_activity.user_id
     or new.actor_id is distinct from v_activity.acting_as_actor_id then
    raise exception using errcode='42501', message='PP1_CALENDAR_ACTIVITY_OWNER_MISMATCH';
  end if;

  if new.event_type <> 'planned_activity' then
    raise exception using errcode='23514', message='PP1_CALENDAR_EVENT_TYPE_INVALID';
  end if;

  v_expected_end := coalesce(
    v_activity.ended_at,
    v_activity.started_at + make_interval(mins => v_activity.duration_minutes)
  );

  if new.start_time is distinct from v_activity.started_at
     or new.end_time is distinct from v_expected_end then
    raise exception using errcode='23514', message='PP1_CALENDAR_PROJECTION_TIME_MISMATCH';
  end if;

  new.temporal_direction := 'future';
  return new;
end
$function$;

create trigger calendar_events_pp1a_projection_trg
before insert or update on public.calendar_events
for each row execute function public.enforce_calendar_activity_projection_pp1a();

alter table public.activity_value_object_links
  add column status text not null default 'active',
  add column provenance_code text not null default 'manual',
  add column created_by_actor_id uuid references public.actors(id) on delete set null,
  add column deactivated_at timestamptz;

alter table public.activity_value_object_links
  add constraint activity_value_object_links_type_pp1_check
    check (link_type in ('semantic_exposure','planned_target')),
  add constraint activity_value_object_links_status_pp1_check
    check (status in ('active','inactive')),
  add constraint activity_value_object_links_provenance_pp1_check
    check (provenance_code in ('manual','ai_suggested','import','system','legacy'));

create or replace function public.enforce_activity_value_object_link_pp1a()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_activity public.activity_events%rowtype;
  v_value_object public.value_objects%rowtype;
begin
  if new.status = 'active' then
    new.deactivated_at := null;
  elsif new.deactivated_at is null then
    new.deactivated_at := clock_timestamp();
  end if;

  if new.link_type <> 'planned_target' then
    return new;
  end if;

  select * into v_activity
  from public.activity_events activity_event
  where activity_event.id = new.activity_event_id;

  if not found then
    raise exception using errcode='23503', message='PP1_PLANNED_TARGET_ACTIVITY_NOT_FOUND';
  end if;

  if v_activity.activity_role_code <> 'planned' then
    raise exception using errcode='23514', message='PP1_PLANNED_TARGET_REQUIRES_PLANNED_ACTIVITY';
  end if;

  select * into v_value_object
  from public.value_objects value_object
  where value_object.id = new.value_object_id;

  if not found then
    raise exception using errcode='23503', message='PP1_PLANNED_TARGET_VALUE_OBJECT_NOT_FOUND';
  end if;

  if new.app_user_id is null then new.app_user_id := v_activity.user_id; end if;
  if new.actor_id is null then new.actor_id := v_activity.acting_as_actor_id; end if;
  if new.created_by_actor_id is null then new.created_by_actor_id := v_activity.acting_as_actor_id; end if;

  if new.app_user_id is distinct from v_activity.user_id
     or new.actor_id is distinct from v_activity.acting_as_actor_id
     or v_value_object.owner_user_id is distinct from v_activity.user_id
     or v_value_object.owner_actor_id is distinct from v_activity.acting_as_actor_id then
    raise exception using errcode='42501', message='PP1_PLANNED_TARGET_OWNER_MISMATCH';
  end if;

  return new;
end
$function$;

create trigger activity_value_object_links_pp1a_contract_trg
before insert or update on public.activity_value_object_links
for each row execute function public.enforce_activity_value_object_link_pp1a();

create trigger activity_value_object_links_pp1a_updated_at_trg
before update on public.activity_value_object_links
for each row execute function public.set_activity_recording_updated_at();

create index activity_value_object_links_planned_target_idx
  on public.activity_value_object_links(activity_event_id, status, created_at)
  where link_type='planned_target';

create table public.activity_event_write_operations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.app_users(id) on delete cascade,
  owner_actor_id uuid not null references public.actors(id) on delete cascade,
  operation_type text not null,
  idempotency_key text not null,
  request_hash text not null,
  activity_event_id uuid references public.activity_events(id) on delete set null,
  calendar_event_id uuid references public.calendar_events(id) on delete set null,
  created_at timestamptz not null default clock_timestamp(),
  constraint activity_event_write_operations_type_check
    check (operation_type in ('create_planned','create_actual')),
  constraint activity_event_write_operations_identity_unique
    unique (owner_user_id, owner_actor_id, operation_type, idempotency_key)
);

alter table public.activity_event_write_operations enable row level security;
revoke all on public.activity_event_write_operations from public, anon, authenticated;
grant select on public.activity_event_write_operations to service_role;

create index activity_event_write_operations_event_idx
  on public.activity_event_write_operations(activity_event_id, created_at desc);

create or replace function public.create_activity_event_pp1_v1(
  p_owner_user_id uuid,
  p_owner_actor_id uuid,
  p_idempotency_key text,
  p_activity jsonb,
  p_planned_target_ids uuid[] default '{}'::uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $function$
declare
  v_role text;
  v_operation_type text;
  v_request_hash text;
  v_existing_operation public.activity_event_write_operations%rowtype;
  v_activity public.activity_events%rowtype;
  v_calendar public.calendar_events%rowtype;
  v_title text;
  v_target_id uuid;
  v_create_projection boolean;
  v_expected_end timestamptz;
begin
  if p_owner_user_id is null or p_owner_actor_id is null then
    raise exception using errcode='22023', message='PP1_OWNER_CONTEXT_REQUIRED';
  end if;

  if nullif(btrim(p_idempotency_key), '') is null then
    raise exception using errcode='22023', message='PP1_IDEMPOTENCY_KEY_REQUIRED';
  end if;

  if p_activity is null or jsonb_typeof(p_activity) <> 'object' then
    raise exception using errcode='22023', message='PP1_ACTIVITY_OBJECT_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.actor_public_profiles profile
    join public.actors actor on actor.id=profile.actor_id and actor.status='active'
    join public.app_users app_user on app_user.id=profile.owner_user_id
    where profile.owner_user_id=p_owner_user_id
      and profile.actor_id=p_owner_actor_id
      and coalesce(app_user.access_status,'active') <> 'blocked'
  ) then
    raise exception using errcode='42501', message='PP1_OWNER_ACTOR_NOT_AVAILABLE';
  end if;

  v_role := nullif(btrim(p_activity->>'activityRoleCode'), '');
  if v_role not in ('planned','actual') then
    raise exception using errcode='22023', message='PP1_ACTIVITY_ROLE_REQUIRED';
  end if;

  v_operation_type := 'create_' || v_role;
  v_request_hash := encode(
    extensions.digest(
      convert_to(
        p_activity::text || '|' || coalesce(
          (
            select string_agg(target_id::text, ',' order by target_id)
            from (
              select distinct target_id
              from unnest(coalesce(p_planned_target_ids, '{}'::uuid[])) target_id
              where target_id is not null
            ) canonical_targets
          ),
          ''
        ),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  select * into v_existing_operation
  from public.activity_event_write_operations operation
  where operation.owner_user_id=p_owner_user_id
    and operation.owner_actor_id=p_owner_actor_id
    and operation.operation_type=v_operation_type
    and operation.idempotency_key=p_idempotency_key;

  if found then
    if v_existing_operation.request_hash <> v_request_hash then
      raise exception using errcode='23505', message='PP1_IDEMPOTENCY_CONFLICT';
    end if;

    select * into v_activity
    from public.activity_events
    where id=v_existing_operation.activity_event_id;

    if v_existing_operation.calendar_event_id is not null then
      select * into v_calendar
      from public.calendar_events
      where id=v_existing_operation.calendar_event_id;
    end if;

    return jsonb_build_object(
      'ok', true,
      'disposition', 'idempotent_replay',
      'activityEvent', to_jsonb(v_activity),
      'calendarEvent', case when v_calendar.id is null then null else to_jsonb(v_calendar) end,
      'plannedTargetValueObjectIds', coalesce(
        (select jsonb_agg(link.value_object_id order by link.value_object_id)
         from public.activity_value_object_links link
         where link.activity_event_id=v_activity.id
           and link.link_type='planned_target'
           and link.status='active'),
        '[]'::jsonb
      )
    );
  end if;

  v_title := coalesce(
    nullif(btrim(p_activity->>'title'), ''),
    nullif(btrim(p_activity->>'inputText'), '')
  );

  if v_title is null then
    raise exception using errcode='22023', message='PP1_ACTIVITY_TITLE_REQUIRED';
  end if;

  insert into public.activity_events (
    user_id,
    performed_by_actor_id,
    acting_as_actor_id,
    acting_for_actor_id,
    event_code,
    input_text,
    title,
    description,
    started_at,
    ended_at,
    duration_minutes,
    source,
    status,
    privacy_scope,
    processing_status,
    metadata_json,
    temporal_direction,
    activity_role_code,
    fulfills_planned_activity_event_id,
    schedule_mode_code,
    scheduled_date,
    schedule_start_date,
    schedule_end_date,
    deadline_at
  ) values (
    p_owner_user_id,
    p_owner_actor_id,
    p_owner_actor_id,
    null,
    'pp1:' || v_role || ':' || p_idempotency_key,
    nullif(p_activity->>'inputText',''),
    v_title,
    nullif(p_activity->>'description',''),
    nullif(p_activity->>'startedAt','')::timestamptz,
    nullif(p_activity->>'endedAt','')::timestamptz,
    nullif(p_activity->>'durationMinutes','')::integer,
    coalesce(nullif(p_activity->>'source',''), 'manual_form'),
    coalesce(
      nullif(p_activity->>'status',''),
      case when v_role='planned' then 'planned' else 'completed' end
    ),
    coalesce(nullif(p_activity->>'privacyScope',''), 'private'),
    'processed',
    coalesce(p_activity->'metadata','{}'::jsonb)
      || jsonb_build_object('pp1Contract','activity-model-v1'),
    coalesce(
      nullif(p_activity->>'temporalDirection',''),
      case when v_role='planned' then 'future' else 'past' end
    ),
    v_role,
    nullif(p_activity->>'fulfillsPlannedActivityEventId','')::uuid,
    nullif(p_activity->>'scheduleModeCode',''),
    nullif(p_activity->>'scheduledDate','')::date,
    nullif(p_activity->>'scheduleStartDate','')::date,
    nullif(p_activity->>'scheduleEndDate','')::date,
    nullif(p_activity->>'deadlineAt','')::timestamptz
  ) returning * into v_activity;

  if v_role='actual' and cardinality(coalesce(p_planned_target_ids, '{}'::uuid[])) > 0 then
    raise exception using errcode='23514', message='PP1_ACTUAL_CANNOT_HAVE_PLANNED_TARGETS';
  end if;

  if v_role='planned' then
    for v_target_id in
      select distinct target_id
      from unnest(coalesce(p_planned_target_ids, '{}'::uuid[])) target_id
      where target_id is not null
    loop
      insert into public.activity_value_object_links (
        activity_event_id,
        value_object_id,
        actor_id,
        app_user_id,
        link_type,
        status,
        provenance_code,
        created_by_actor_id,
        confidence,
        evidence,
        metadata
      ) values (
        v_activity.id,
        v_target_id,
        p_owner_actor_id,
        p_owner_user_id,
        'planned_target',
        'active',
        'manual',
        p_owner_actor_id,
        1,
        jsonb_build_object('source','create_activity_event_pp1_v1'),
        jsonb_build_object('pp1Contract','activity-model-v1')
      );
    end loop;

    v_create_projection := coalesce((p_activity->>'createCalendarProjection')::boolean, true);

    if v_activity.schedule_mode_code='exact' and v_create_projection then
      v_expected_end := coalesce(
        v_activity.ended_at,
        v_activity.started_at + make_interval(mins => v_activity.duration_minutes)
      );

      insert into public.calendar_events (
        user_id,
        actor_id,
        event_type,
        title,
        description,
        start_time,
        end_time,
        duration_minutes,
        status,
        source,
        temporal_direction,
        related_activity_event_id
      ) values (
        p_owner_user_id,
        p_owner_actor_id,
        'planned_activity',
        v_activity.title,
        v_activity.description,
        v_activity.started_at,
        v_expected_end,
        coalesce(
          v_activity.duration_minutes,
          floor(extract(epoch from (v_expected_end-v_activity.started_at))/60)::integer
        ),
        case when v_activity.status='cancelled' then 'cancelled' else 'planned' end,
        'activity_projection_pp1_v1',
        'future',
        v_activity.id
      ) returning * into v_calendar;
    end if;
  end if;

  insert into public.activity_event_write_operations (
    owner_user_id,
    owner_actor_id,
    operation_type,
    idempotency_key,
    request_hash,
    activity_event_id,
    calendar_event_id
  ) values (
    p_owner_user_id,
    p_owner_actor_id,
    v_operation_type,
    p_idempotency_key,
    v_request_hash,
    v_activity.id,
    v_calendar.id
  );

  return jsonb_build_object(
    'ok', true,
    'disposition', 'created',
    'activityEvent', to_jsonb(v_activity),
    'calendarEvent', case when v_calendar.id is null then null else to_jsonb(v_calendar) end,
    'plannedTargetValueObjectIds', coalesce(
      (select jsonb_agg(link.value_object_id order by link.value_object_id)
       from public.activity_value_object_links link
       where link.activity_event_id=v_activity.id
         and link.link_type='planned_target'
         and link.status='active'),
      '[]'::jsonb
    )
  );
end
$function$;

revoke all on function public.create_activity_event_pp1_v1(uuid,uuid,text,jsonb,uuid[]) from public, anon, authenticated;
grant execute on function public.create_activity_event_pp1_v1(uuid,uuid,text,jsonb,uuid[]) to service_role;

comment on function public.create_activity_event_pp1_v1(uuid,uuid,text,jsonb,uuid[]) is
'PP1 controlled idempotent creation of canonical planned or actual activity_events rows, optional planned targets and exact calendar projection.';

comment on column public.activity_events.activity_role_code is
'PP1 stable record role. Planned and actual are separate rows.';
comment on column public.activity_events.fulfills_planned_activity_event_id is
'Optional plan fulfilled by this actual activity. One plan may have many actual executions.';
comment on column public.activity_events.schedule_mode_code is
'PP1 planned schedule mode: unscheduled, date_only, date_range, deadline or exact.';
comment on column public.calendar_events.related_activity_event_id is
'Canonical activity_events reference for a calendar projection. Legacy related_activity_id remains temporary.';
comment on column public.activity_value_object_links.link_type is
'PP1 planned_target links a planned activity to root/intermediate/leaf Value Objects. semantic_exposure remains separate.';

commit;
