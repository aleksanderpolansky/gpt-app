-- ARCTor.app
-- PP1A planned/actual activity foundation — destructive rebuild preflight
-- READ ONLY against public schema/data.
-- Creates only a session-local TEMP result table.

create temporary table if not exists pg_temp.pp1a_preflight_results (
  sort_order integer primary key,
  check_name text not null,
  passed boolean not null,
  details jsonb not null default '{}'::jsonb
) on commit preserve rows;

truncate table pg_temp.pp1a_preflight_results;

do $preflight$
declare
  v_count bigint;
  v_details jsonb;
  v_protected_hits jsonb;
begin
  insert into pg_temp.pp1a_preflight_results
  values (
    1,
    '01_required_tables_exist',
    to_regclass('public.activities') is not null
      and to_regclass('public.activity_events') is not null
      and to_regclass('public.calendar_events') is not null
      and to_regclass('public.activity_value_object_links') is not null
      and to_regclass('public.value_objects') is not null
      and to_regclass('public.actor_public_profiles') is not null,
    jsonb_build_object(
      'activities', to_regclass('public.activities'),
      'activityEvents', to_regclass('public.activity_events'),
      'calendarEvents', to_regclass('public.calendar_events'),
      'activityValueObjectLinks', to_regclass('public.activity_value_object_links'),
      'valueObjects', to_regclass('public.value_objects')
    )
  );

  select count(*) into v_count from public.bookings;
  insert into pg_temp.pp1a_preflight_results
  values (2, '02_no_live_bookings', v_count = 0, jsonb_build_object('rowCount', v_count));

  select jsonb_build_object(
    'activities', (select count(*) from public.activities),
    'activityParticipants', (select count(*) from public.activity_participants),
    'activityLinks', (select count(*) from public.activity_links),
    'activityEvents', (select count(*) from public.activity_events),
    'calendarEvents', (select count(*) from public.calendar_events),
    'calendarEventLogs', (select count(*) from public.calendar_event_logs),
    'activityCorrections', (select count(*) from public.activity_corrections),
    'activityMeasures', (select count(*) from public.activity_event_measures),
    'activityFacts', (select count(*) from public.activity_object_facts),
    'reviewItems', (select count(*) from public.activity_fact_review_items),
    'recalculationQueue', (select count(*) from public.activity_fact_recalculation_queue)
  ) into v_details;

  insert into pg_temp.pp1a_preflight_results
  values (3, '03_destructive_counts_captured', true, v_details);

  insert into pg_temp.pp1a_preflight_results
  select
    4,
    '04_pp1a_columns_absent',
    count(*) = 0,
    jsonb_build_object('existingColumns', coalesce(jsonb_agg(column_name), '[]'::jsonb))
  from information_schema.columns
  where table_schema = 'public'
    and (
      (table_name = 'activity_events' and column_name in (
        'activity_role_code',
        'fulfills_planned_activity_event_id',
        'schedule_mode_code',
        'scheduled_date',
        'schedule_start_date',
        'schedule_end_date',
        'deadline_at'
      ))
      or (table_name = 'calendar_events' and column_name = 'related_activity_event_id')
    );

  insert into pg_temp.pp1a_preflight_results
  values (
    5,
    '05_pp1a_registry_tables_absent',
    to_regclass('public.activity_role_types') is null
      and to_regclass('public.activity_schedule_modes') is null
      and to_regclass('public.activity_event_write_operations') is null,
    jsonb_build_object(
      'activityRoleTypes', to_regclass('public.activity_role_types'),
      'activityScheduleModes', to_regclass('public.activity_schedule_modes'),
      'writeOperations', to_regclass('public.activity_event_write_operations')
    )
  );

  insert into pg_temp.pp1a_preflight_results
  values (
    6,
    '06_pp1a_rpc_absent',
    to_regprocedure('public.create_activity_event_pp1_v1(uuid,uuid,text,jsonb,uuid[])') is null,
    jsonb_build_object(
      'procedure', to_regprocedure('public.create_activity_event_pp1_v1(uuid,uuid,text,jsonb,uuid[])')
    )
  );

  insert into pg_temp.pp1a_preflight_results
  values (
    7,
    '07_pgcrypto_digest_available',
    to_regprocedure('extensions.digest(bytea,text)') is not null,
    jsonb_build_object('procedure', to_regprocedure('extensions.digest(bytea,text)'))
  );

  insert into pg_temp.pp1a_preflight_results
  values (
    8,
    '08_existing_actor_guard_available',
    to_regprocedure('public.enforce_activity_event_actor_ownership_v2()') is not null,
    jsonb_build_object('procedure', to_regprocedure('public.enforce_activity_event_actor_ownership_v2()'))
  );

  select count(*) into v_count
  from public.actor_public_profiles profile
  join public.actors actor on actor.id = profile.actor_id and actor.status = 'active'
  join public.app_users app_user on app_user.id = profile.owner_user_id
  where coalesce(app_user.access_status, 'active') <> 'blocked';

  insert into pg_temp.pp1a_preflight_results
  values (9, '09_active_owner_actor_pair_available', v_count > 0, jsonb_build_object('pairCount', v_count));

  select count(*) into v_count from public.value_objects;
  insert into pg_temp.pp1a_preflight_results
  values (10, '10_value_objects_preserved_and_available', v_count > 0, jsonb_build_object('rowCount', v_count));

  select count(*) into v_count from public.activity_value_object_links;
  insert into pg_temp.pp1a_preflight_results
  values (11, '11_activity_value_object_links_empty', v_count = 0, jsonb_build_object('rowCount', v_count));

  insert into pg_temp.pp1a_preflight_results
  select
    12,
    '12_activity_value_object_link_columns_available',
    count(*) = 7,
    jsonb_build_object('columns', jsonb_agg(column_name order by column_name))
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'activity_value_object_links'
    and column_name in (
      'activity_event_id', 'value_object_id', 'actor_id', 'app_user_id',
      'link_type', 'created_at', 'updated_at'
    );

  insert into pg_temp.pp1a_preflight_results
  values (
    13,
    '13_calendar_exact_time_columns_not_null',
    (select is_nullable = 'NO' from information_schema.columns
      where table_schema='public' and table_name='calendar_events' and column_name='start_time')
    and
    (select is_nullable = 'NO' from information_schema.columns
      where table_schema='public' and table_name='calendar_events' and column_name='end_time'),
    jsonb_build_object(
      'startTimeNullable', (select is_nullable from information_schema.columns
        where table_schema='public' and table_name='calendar_events' and column_name='start_time'),
      'endTimeNullable', (select is_nullable from information_schema.columns
        where table_schema='public' and table_name='calendar_events' and column_name='end_time')
    )
  );

  insert into pg_temp.pp1a_preflight_results
  values (
    14,
    '14_reality_save_rpc_available',
    to_regprocedure('public.save_reality_activity_v1(uuid,text,jsonb,jsonb,jsonb)') is not null,
    jsonb_build_object(
      'procedure', to_regprocedure('public.save_reality_activity_v1(uuid,text,jsonb,jsonb,jsonb)')
    )
  );

  insert into pg_temp.pp1a_preflight_results
  values (
    15,
    '15_p10_semantic_relations_preserved',
    to_regclass('public.value_object_relations') is not null,
    jsonb_build_object(
      'table', to_regclass('public.value_object_relations'),
      'rowCount', case when to_regclass('public.value_object_relations') is null
        then null else (select count(*) from public.value_object_relations) end
    )
  );

  with recursive fk_edges as (
    select
      constraint_row.confrelid as parent_oid,
      constraint_row.conrelid as child_oid
    from pg_catalog.pg_constraint constraint_row
    where constraint_row.contype = 'f'
  ),
  closure as (
    select anchor_oid, array[anchor_oid]::oid[] as path
    from unnest(array[
      'public.activities'::regclass::oid,
      'public.activity_events'::regclass::oid,
      'public.calendar_events'::regclass::oid
    ]) anchor_oid
    union all
    select edge.child_oid, closure.path || edge.child_oid
    from closure
    join fk_edges edge on edge.parent_oid = closure.anchor_oid
    where not edge.child_oid = any(closure.path)
  ),
  protected_hits as (
    select distinct class_row.relname
    from closure
    join pg_catalog.pg_class class_row on class_row.oid = closure.anchor_oid
    join pg_catalog.pg_namespace namespace_row on namespace_row.oid = class_row.relnamespace
    where namespace_row.nspname = 'public'
      and class_row.relname in (
        'app_users', 'actors', 'actor_public_profiles', 'value_objects',
        'value_object_relations', 'value_object_relation_types',
        'value_object_branch_types', 'organizations'
      )
  )
  select coalesce(jsonb_agg(relname order by relname), '[]'::jsonb)
  into v_protected_hits
  from protected_hits;

  insert into pg_temp.pp1a_preflight_results
  values (
    16,
    '16_truncate_cascade_does_not_reach_protected_tables',
    jsonb_array_length(v_protected_hits) = 0,
    jsonb_build_object('protectedHits', v_protected_hits)
  );

  with recursive fk_edges as (
    select constraint_row.confrelid parent_oid, constraint_row.conrelid child_oid
    from pg_catalog.pg_constraint constraint_row
    where constraint_row.contype='f'
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
  select coalesce(jsonb_agg(distinct class_row.relname order by class_row.relname), '[]'::jsonb)
  into v_details
  from closure
  join pg_catalog.pg_class class_row on class_row.oid=closure.anchor_oid
  join pg_catalog.pg_namespace namespace_row on namespace_row.oid=class_row.relnamespace
  where namespace_row.nspname='public';

  insert into pg_temp.pp1a_preflight_results
  values (17, '17_truncate_cascade_closure_captured', true, jsonb_build_object('tables', v_details));

  select count(*) into v_count
  from public.calendar_events
  where event_type='planned_activity' and temporal_direction='future';
  insert into pg_temp.pp1a_preflight_results
  values (18, '18_experimental_calendar_plans_acknowledged', true, jsonb_build_object('rowCount', v_count));

  select count(*) into v_count
  from public.activities;
  insert into pg_temp.pp1a_preflight_results
  values (19, '19_legacy_activity_rows_acknowledged', true, jsonb_build_object('rowCount', v_count));

  insert into pg_temp.pp1a_preflight_results
  values (20, '20_destructive_policy_explicitly_required', true,
    jsonb_build_object('policy', 'experimental activity/calendar data may be deleted; no backfill required'));
end
$preflight$;

select sort_order, check_name, passed, details
from pg_temp.pp1a_preflight_results
order by sort_order;
