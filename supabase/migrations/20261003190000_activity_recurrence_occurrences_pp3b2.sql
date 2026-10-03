-- ARCTor.app
-- PP3B2 bounded recurrence occurrence materializer.
-- activity_events remains the only planned-activity entity.
-- No infinite future rows and no migration-time backfill.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '180s';

do $preflight$
begin
  if to_regclass('public.activity_events') is null
     or to_regclass('public.activity_recurrence_rules') is null
     or to_regclass('public.activity_value_object_links') is null
     or to_regclass('public.project_activity_links') is null
     or to_regclass('public.project_contexts') is null then
    raise exception using errcode='42P01', message='PP3B2_REQUIRED_ACTIVITY_FOUNDATION_MISSING';
  end if;

  if to_regprocedure('public.create_activity_event_pp1_v1(uuid,uuid,text,jsonb,uuid[])') is null then
    raise exception using errcode='42883', message='PP3B2_CANONICAL_PP1_CREATE_RPC_MISSING';
  end if;

  if to_regclass('public.activity_recurrence_occurrences') is not null then
    raise exception using errcode='42P07', message='PP3B2_ACTIVITY_RECURRENCE_OCCURRENCES_ALREADY_EXISTS';
  end if;
end;
$preflight$;

create table public.activity_recurrence_occurrences (
  id uuid primary key default gen_random_uuid(),
  recurrence_rule_id uuid not null references public.activity_recurrence_rules(id) on delete cascade,
  owner_user_id uuid not null references public.app_users(id) on delete cascade,
  owner_actor_id uuid not null references public.actors(id) on delete cascade,
  source_activity_event_id uuid not null references public.activity_events(id) on delete cascade,
  occurrence_ordinal integer not null,
  occurrence_key text not null,
  nominal_schedule_mode_code text not null,
  nominal_scheduled_date date,
  nominal_schedule_start_date date,
  nominal_schedule_end_date date,
  materialized_activity_event_id uuid not null references public.activity_events(id) on delete cascade,
  status_code text not null default 'active',
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),

  constraint activity_recurrence_occurrences_ordinal_pp3b2_check check (occurrence_ordinal >= 1),
  constraint activity_recurrence_occurrences_key_pp3b2_check check (char_length(btrim(occurrence_key)) between 1 and 160),
  constraint activity_recurrence_occurrences_mode_pp3b2_check check (nominal_schedule_mode_code in ('date_only','date_range')),
  constraint activity_recurrence_occurrences_schedule_shape_pp3b2_check check (
    (nominal_schedule_mode_code='date_only' and nominal_scheduled_date is not null and nominal_schedule_start_date is null and nominal_schedule_end_date is null)
    or
    (nominal_schedule_mode_code='date_range' and nominal_scheduled_date is null and nominal_schedule_start_date is not null and nominal_schedule_end_date is not null and nominal_schedule_end_date >= nominal_schedule_start_date)
  ),
  constraint activity_recurrence_occurrences_status_pp3b2_check check (status_code in ('active','skipped','rescheduled','cancelled')),
  constraint activity_recurrence_occurrences_metadata_pp3b2_check check (jsonb_typeof(metadata_json)='object'),
  constraint activity_recurrence_occurrences_rule_key_pp3b2_unique unique (recurrence_rule_id, occurrence_key),
  constraint activity_recurrence_occurrences_event_pp3b2_unique unique (materialized_activity_event_id)
);

create index activity_recurrence_occurrences_rule_window_pp3b2_idx
  on public.activity_recurrence_occurrences(recurrence_rule_id,status_code,nominal_schedule_start_date,nominal_scheduled_date,occurrence_ordinal);

create index activity_recurrence_occurrences_owner_window_pp3b2_idx
  on public.activity_recurrence_occurrences(owner_user_id,owner_actor_id,status_code,created_at desc);

create or replace function public.enforce_activity_recurrence_occurrence_pp3b2()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_rule public.activity_recurrence_rules%rowtype;
  v_source public.activity_events%rowtype;
  v_materialized public.activity_events%rowtype;
begin
  select * into v_rule from public.activity_recurrence_rules where id=new.recurrence_rule_id;
  if not found then
    raise exception using errcode='23503', message='PP3B2_RECURRENCE_RULE_NOT_FOUND';
  end if;

  if v_rule.owner_user_id is distinct from new.owner_user_id
     or v_rule.owner_actor_id is distinct from new.owner_actor_id
     or v_rule.source_activity_event_id is distinct from new.source_activity_event_id then
    raise exception using errcode='42501', message='PP3B2_OCCURRENCE_RULE_IDENTITY_MISMATCH';
  end if;

  select * into v_source from public.activity_events where id=new.source_activity_event_id;
  if not found or v_source.activity_role_code<>'planned'
     or v_source.user_id is distinct from new.owner_user_id
     or v_source.acting_as_actor_id is distinct from new.owner_actor_id then
    raise exception using errcode='23514', message='PP3B2_OCCURRENCE_SOURCE_ACTIVITY_INVALID';
  end if;

  select * into v_materialized from public.activity_events where id=new.materialized_activity_event_id;
  if not found or v_materialized.activity_role_code<>'planned'
     or v_materialized.user_id is distinct from new.owner_user_id
     or v_materialized.acting_as_actor_id is distinct from new.owner_actor_id then
    raise exception using errcode='23514', message='PP3B2_OCCURRENCE_MATERIALIZED_ACTIVITY_INVALID';
  end if;

  if tg_op='INSERT' then
    if new.nominal_schedule_mode_code='date_only' then
      if v_materialized.schedule_mode_code<>'date_only'
         or v_materialized.scheduled_date is distinct from new.nominal_scheduled_date then
        raise exception using errcode='23514', message='PP3B2_OCCURRENCE_DATE_ONLY_MISMATCH';
      end if;
    elsif new.nominal_schedule_mode_code='date_range' then
      if v_materialized.schedule_mode_code<>'date_range'
         or v_materialized.schedule_start_date is distinct from new.nominal_schedule_start_date
         or v_materialized.schedule_end_date is distinct from new.nominal_schedule_end_date then
        raise exception using errcode='23514', message='PP3B2_OCCURRENCE_DATE_RANGE_MISMATCH';
      end if;
    end if;
  end if;

  if tg_op='UPDATE' then
    if new.id is distinct from old.id
       or new.recurrence_rule_id is distinct from old.recurrence_rule_id
       or new.owner_user_id is distinct from old.owner_user_id
       or new.owner_actor_id is distinct from old.owner_actor_id
       or new.source_activity_event_id is distinct from old.source_activity_event_id
       or new.occurrence_ordinal is distinct from old.occurrence_ordinal
       or new.occurrence_key is distinct from old.occurrence_key
       or new.nominal_schedule_mode_code is distinct from old.nominal_schedule_mode_code
       or new.nominal_scheduled_date is distinct from old.nominal_scheduled_date
       or new.nominal_schedule_start_date is distinct from old.nominal_schedule_start_date
       or new.nominal_schedule_end_date is distinct from old.nominal_schedule_end_date
       or new.materialized_activity_event_id is distinct from old.materialized_activity_event_id
       or new.created_at is distinct from old.created_at then
      raise exception using errcode='23514', message='PP3B2_OCCURRENCE_IDENTITY_IS_IMMUTABLE';
    end if;
  end if;

  new.updated_at := clock_timestamp();
  return new;
end;
$function$;

create trigger activity_recurrence_occurrences_guard_pp3b2
before insert or update on public.activity_recurrence_occurrences
for each row execute function public.enforce_activity_recurrence_occurrence_pp3b2();

alter table public.activity_recurrence_occurrences enable row level security;

create policy activity_recurrence_occurrences_no_direct_public_pp3b2
on public.activity_recurrence_occurrences for all to anon,authenticated
using(false) with check(false);

create policy activity_recurrence_occurrences_service_role_all_pp3b2
on public.activity_recurrence_occurrences for all to service_role
using(true) with check(true);

revoke all on table public.activity_recurrence_occurrences from public,anon,authenticated;
grant select,insert,update,delete on table public.activity_recurrence_occurrences to service_role;
revoke all on function public.enforce_activity_recurrence_occurrence_pp3b2() from public,anon,authenticated;
grant execute on function public.enforce_activity_recurrence_occurrence_pp3b2() to service_role;

create or replace function public.materialize_activity_recurrence_rule_pp3b2(
  p_owner_user_id uuid,
  p_owner_actor_id uuid,
  p_rule_id uuid,
  p_horizon_days integer default 56,
  p_now timestamptz default clock_timestamp()
)
returns jsonb
language plpgsql
security definer
set search_path=public,extensions,pg_temp
as $function$
declare
  v_rule public.activity_recurrence_rules%rowtype;
  v_source public.activity_events%rowtype;
  v_targets uuid[] := '{}'::uuid[];
  v_window_start date;
  v_window_end date;
  v_first_start date;
  v_candidate_start date;
  v_candidate_end date;
  v_occurrence_ordinal integer;
  v_day_step integer;
  v_month_diff integer;
  v_occurrence_key text;
  v_idempotency_key text;
  v_request jsonb;
  v_result jsonb;
  v_event_id uuid;
  v_disposition text;
  v_created integer := 0;
  v_replayed integer := 0;
  v_considered integer := 0;
  v_event_ids jsonb := '[]'::jsonb;
begin
  if p_owner_user_id is null or p_owner_actor_id is null or p_rule_id is null then
    raise exception using errcode='22023', message='PP3B2_MATERIALIZER_IDENTITY_REQUIRED';
  end if;
  if p_horizon_days is null or p_horizon_days<1 or p_horizon_days>366 then
    raise exception using errcode='22023', message='PP3B2_MATERIALIZER_HORIZON_OUT_OF_RANGE';
  end if;

  select * into v_rule
  from public.activity_recurrence_rules
  where id=p_rule_id and owner_user_id=p_owner_user_id and owner_actor_id=p_owner_actor_id and status_code='active'
  for update;
  if not found then
    raise exception using errcode='42501', message='PP3B2_RECURRENCE_RULE_NOT_AVAILABLE';
  end if;
  if v_rule.recurrence_basis_code<>'calendar' then
    raise exception using errcode='0A000', message='PP3B2_AFTER_COMPLETION_BASIS_NOT_SUPPORTED';
  end if;
  if not exists(select 1 from pg_catalog.pg_timezone_names where name=v_rule.timezone) then
    raise exception using errcode='22023', message='PP3B2_RECURRENCE_TIMEZONE_INVALID';
  end if;

  select * into v_source
  from public.activity_events
  where id=v_rule.source_activity_event_id
    and user_id=p_owner_user_id
    and acting_as_actor_id=p_owner_actor_id
    and activity_role_code='planned'
    and status in ('draft','planned','confirmed');
  if not found then
    raise exception using errcode='23514', message='PP3B2_SOURCE_ACTIVITY_NOT_MATERIALIZABLE';
  end if;

  select coalesce(array_agg(distinct link.value_object_id order by link.value_object_id),'{}'::uuid[])
  into v_targets
  from public.activity_value_object_links link
  where link.activity_event_id=v_source.id and link.link_type='planned_target' and link.status='active';

  v_window_start := (p_now at time zone v_rule.timezone)::date;
  -- Exact bounded window: horizonDays=56 means 56 calendar dates including windowStart.
  v_window_end := v_window_start + (p_horizon_days - 1);

  if v_rule.frequency_code='daily' then
    v_first_start := v_rule.anchor_date;
    v_day_step := v_rule.interval_count;
    if v_window_start<=v_first_start then
      v_occurrence_ordinal := 1;
    else
      v_occurrence_ordinal := floor(((v_window_start-v_first_start)::numeric)/v_day_step)::integer + 1;
    end if;
  elsif v_rule.frequency_code='weekly' then
    -- Generic weekly recurrence is a full ISO week; a mid-week anchor starts next Monday.
    v_first_start := v_rule.anchor_date + mod(8-extract(isodow from v_rule.anchor_date)::integer,7);
    v_day_step := 7*v_rule.interval_count;
    if v_window_start<=v_first_start then
      v_occurrence_ordinal := 1;
    else
      v_occurrence_ordinal := floor(((v_window_start-v_first_start)::numeric)/v_day_step)::integer + 1;
    end if;
  elsif v_rule.frequency_code='monthly' then
    if extract(day from v_rule.anchor_date)::integer=1 then
      v_first_start := date_trunc('month',v_rule.anchor_date::timestamp)::date;
    else
      v_first_start := (date_trunc('month',v_rule.anchor_date::timestamp)+interval '1 month')::date;
    end if;
    if v_window_start<=v_first_start then
      v_occurrence_ordinal := 1;
    else
      v_month_diff := (extract(year from v_window_start)::integer*12+extract(month from v_window_start)::integer)
                    -(extract(year from v_first_start)::integer*12+extract(month from v_first_start)::integer);
      v_occurrence_ordinal := floor(greatest(0,v_month_diff)::numeric/v_rule.interval_count)::integer + 1;
    end if;
  else
    raise exception using errcode='23514', message='PP3B2_RECURRENCE_FREQUENCY_NOT_SUPPORTED';
  end if;

  loop
    if v_rule.frequency_code='daily' then
      v_candidate_start := v_first_start + ((v_occurrence_ordinal-1)*v_rule.interval_count);
      v_candidate_end := v_candidate_start;
    elsif v_rule.frequency_code='weekly' then
      v_candidate_start := v_first_start + ((v_occurrence_ordinal-1)*7*v_rule.interval_count);
      v_candidate_end := v_candidate_start + 6;
    else
      v_candidate_start := (v_first_start::timestamp + make_interval(months => (v_occurrence_ordinal-1)*v_rule.interval_count))::date;
      v_candidate_end := (date_trunc('month',v_candidate_start::timestamp)+interval '1 month'-interval '1 day')::date;
    end if;

    if v_candidate_start>v_window_end then exit; end if;
    if v_rule.end_mode_code='count' and v_rule.count_limit is not null and v_occurrence_ordinal>v_rule.count_limit then exit; end if;
    if v_rule.end_mode_code='until' and v_rule.until_date is not null and v_candidate_start>v_rule.until_date then exit; end if;

    if v_candidate_end>=v_window_start then
      v_considered := v_considered + 1;
      v_occurrence_key := format('%s:%s:%s',v_rule.frequency_code,v_occurrence_ordinal,to_char(v_candidate_start,'YYYY-MM-DD'));
      v_idempotency_key := 'pp3b2:'||v_rule.id::text||':'||v_occurrence_key;

      if v_rule.frequency_code='daily' then
        v_request := jsonb_build_object(
          'activityRoleCode','planned','title',v_source.title,'inputText',v_source.input_text,
          'description',v_source.description,'durationMinutes',v_source.duration_minutes,
          'source','system_event','privacyScope',v_source.privacy_scope,
          'status','planned','scheduleModeCode','date_only','scheduledDate',to_char(v_candidate_start,'YYYY-MM-DD'),
          'createCalendarProjection',false,
          'metadata',coalesce(v_source.metadata_json,'{}'::jsonb)||jsonb_build_object('eventSource','recurrence_materializer_pp3b2','recurrenceOccurrence',jsonb_build_object(
            'contract','ARCTOR_ACTIVITY_RECURRENCE_OCCURRENCE_PP3B2_V1','ruleId',v_rule.id,
            'sourceActivityEventId',v_source.id,'occurrenceOrdinal',v_occurrence_ordinal,
            'occurrenceKey',v_occurrence_key,'nominalScheduleModeCode','date_only',
            'nominalScheduledDate',to_char(v_candidate_start,'YYYY-MM-DD')))
        );
      else
        v_request := jsonb_build_object(
          'activityRoleCode','planned','title',v_source.title,'inputText',v_source.input_text,
          'description',v_source.description,'durationMinutes',v_source.duration_minutes,
          'source','system_event','privacyScope',v_source.privacy_scope,
          'status','planned','scheduleModeCode','date_range',
          'scheduleStartDate',to_char(v_candidate_start,'YYYY-MM-DD'),'scheduleEndDate',to_char(v_candidate_end,'YYYY-MM-DD'),
          'createCalendarProjection',false,
          'metadata',coalesce(v_source.metadata_json,'{}'::jsonb)||jsonb_build_object('eventSource','recurrence_materializer_pp3b2','recurrenceOccurrence',jsonb_build_object(
            'contract','ARCTOR_ACTIVITY_RECURRENCE_OCCURRENCE_PP3B2_V1','ruleId',v_rule.id,
            'sourceActivityEventId',v_source.id,'occurrenceOrdinal',v_occurrence_ordinal,
            'occurrenceKey',v_occurrence_key,'nominalScheduleModeCode','date_range',
            'nominalScheduleStartDate',to_char(v_candidate_start,'YYYY-MM-DD'),
            'nominalScheduleEndDate',to_char(v_candidate_end,'YYYY-MM-DD')))
        );
      end if;

      select public.create_activity_event_pp1_v1(p_owner_user_id,p_owner_actor_id,v_idempotency_key,v_request,v_targets)
      into v_result;
      if coalesce((v_result->>'ok')::boolean,false) is not true then
        raise exception using errcode='P0001', message='PP3B2_CANONICAL_ACTIVITY_CREATE_FAILED';
      end if;

      v_event_id := nullif(v_result->'activityEvent'->>'id','')::uuid;
      v_disposition := nullif(v_result->>'disposition','');
      if v_event_id is null then
        raise exception using errcode='P0001', message='PP3B2_CANONICAL_ACTIVITY_ID_MISSING';
      end if;

      -- Canonical project membership remains project_activity_links.  Each
      -- materialized occurrence inherits every active non-archived project
      -- membership of the recurrence source activity.  This keeps project
      -- calendar/Gantt filtering on the same membership contract instead of
      -- introducing an implicit second project-membership path.
      insert into public.project_activity_links(
        project_context_id,
        activity_event_id,
        status_code,
        provenance_code,
        metadata_json,
        created_by_actor_id
      )
      select
        source_link.project_context_id,
        v_event_id,
        'active',
        'system',
        jsonb_build_object(
          'contract','ARCTOR_RECURRENCE_PROJECT_MEMBERSHIP_PP3B2_V1',
          'sourceActivityEventId',v_source.id,
          'recurrenceRuleId',v_rule.id,
          'occurrenceKey',v_occurrence_key
        ),
        p_owner_actor_id
      from public.project_activity_links source_link
      join public.project_contexts project_context
        on project_context.id=source_link.project_context_id
      where source_link.activity_event_id=v_source.id
        and source_link.status_code='active'
        and project_context.status_code<>'archived'
        and not exists(
          select 1
          from public.project_activity_links existing_link
          where existing_link.project_context_id=source_link.project_context_id
            and existing_link.activity_event_id=v_event_id
            and existing_link.status_code='active'
        )
      on conflict do nothing;

      insert into public.activity_recurrence_occurrences(
        recurrence_rule_id,owner_user_id,owner_actor_id,source_activity_event_id,occurrence_ordinal,occurrence_key,
        nominal_schedule_mode_code,nominal_scheduled_date,nominal_schedule_start_date,nominal_schedule_end_date,
        materialized_activity_event_id,status_code,metadata_json
      ) values (
        v_rule.id,p_owner_user_id,p_owner_actor_id,v_source.id,v_occurrence_ordinal,v_occurrence_key,
        case when v_rule.frequency_code='daily' then 'date_only' else 'date_range' end,
        case when v_rule.frequency_code='daily' then v_candidate_start else null end,
        case when v_rule.frequency_code='daily' then null else v_candidate_start end,
        case when v_rule.frequency_code='daily' then null else v_candidate_end end,
        v_event_id,'active',jsonb_build_object('contract','ARCTOR_ACTIVITY_RECURRENCE_OCCURRENCE_PP3B2_V1','materializer','bounded_calendar_v1')
      ) on conflict (recurrence_rule_id,occurrence_key) do nothing;

      if v_disposition='created' then v_created:=v_created+1; else v_replayed:=v_replayed+1; end if;
      v_event_ids := v_event_ids || jsonb_build_array(v_event_id);
    end if;

    v_occurrence_ordinal := v_occurrence_ordinal + 1;
    if v_occurrence_ordinal>10000 then
      raise exception using errcode='54000', message='PP3B2_OCCURRENCE_ORDINAL_SAFETY_LIMIT';
    end if;
  end loop;

  return jsonb_build_object(
    'ok',true,'contractVersion','ARCTOR_ACTIVITY_RECURRENCE_MATERIALIZER_PP3B2_V1',
    'ruleId',v_rule.id,'sourceActivityEventId',v_source.id,'timezone',v_rule.timezone,
    'windowStart',v_window_start,'windowEnd',v_window_end,'horizonDays',p_horizon_days,
    'consideredCount',v_considered,'createdCount',v_created,'replayedCount',v_replayed,
    'materializedActivityEventIds',v_event_ids
  );
end;
$function$;

revoke all on function public.materialize_activity_recurrence_rule_pp3b2(uuid,uuid,uuid,integer,timestamptz)
  from public,anon,authenticated;
grant execute on function public.materialize_activity_recurrence_rule_pp3b2(uuid,uuid,uuid,integer,timestamptz)
  to service_role;

comment on table public.activity_recurrence_occurrences is
  'PP3B2 technical lineage between one recurrence definition and bounded canonical planned activity_events. This is not a Project Task entity.';
comment on function public.materialize_activity_recurrence_rule_pp3b2(uuid,uuid,uuid,integer,timestamptz) is
  'PP3B2 bounded materializer. Generic daily -> date_only; weekly/monthly -> date_range; canonical activity creation and canonical project_activity_links membership inheritance.';

do $postcheck$
begin
  if to_regclass('public.activity_recurrence_occurrences') is null then
    raise exception using errcode='P0001', message='PP3B2_POSTCHECK_OCCURRENCE_TABLE_MISSING';
  end if;
  if not exists(
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='activity_recurrence_occurrences' and c.relrowsecurity
  ) then
    raise exception using errcode='P0001', message='PP3B2_POSTCHECK_RLS_MISSING';
  end if;
end;
$postcheck$;

commit;
