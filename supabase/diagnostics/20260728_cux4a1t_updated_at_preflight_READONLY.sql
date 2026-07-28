-- ARCTor.app
-- CUX4A1T updated_at correction preflight — READ ONLY

with checks as (
  select
    10 as ord,
    'cux4a1_table_exists' as check_code,
    to_regclass(
      'public.activity_semantic_enrichment_runs_cux4'
    ) is not null as passed,
    jsonb_build_object(
      'regclass',
      to_regclass(
        'public.activity_semantic_enrichment_runs_cux4'
      )::text
    ) as details

  union all

  select
    20,
    'current_updated_at_trigger_exists',
    exists (
      select 1
      from pg_trigger trigger_row
      join pg_class table_row
        on table_row.oid=trigger_row.tgrelid
      join pg_namespace namespace_row
        on namespace_row.oid=table_row.relnamespace
      where namespace_row.nspname='public'
        and table_row.relname='activity_semantic_enrichment_runs_cux4'
        and trigger_row.tgname=
          'activity_semantic_enrichment_runs_cux4_updated_at_trg'
        and not trigger_row.tgisinternal
    ),
    coalesce((
      select jsonb_build_object(
        'definition',
        pg_get_triggerdef(trigger_row.oid, true)
      )
      from pg_trigger trigger_row
      join pg_class table_row
        on table_row.oid=trigger_row.tgrelid
      join pg_namespace namespace_row
        on namespace_row.oid=table_row.relnamespace
      where namespace_row.nspname='public'
        and table_row.relname='activity_semantic_enrichment_runs_cux4'
        and trigger_row.tgname=
          'activity_semantic_enrichment_runs_cux4_updated_at_trg'
        and not trigger_row.tgisinternal
      limit 1
    ), '{}'::jsonb)

  union all

  select
    30,
    'shared_updated_at_function_exists',
    to_regprocedure(
      'public.set_activity_recording_updated_at()'
    ) is not null,
    jsonb_build_object(
      'procedure',
      to_regprocedure(
        'public.set_activity_recording_updated_at()'
      )::text
    )

  union all

  select
    40,
    'dedicated_function_collision_safe',
    to_regprocedure(
      'public.set_activity_semantic_enrichment_updated_at_cux4()'
    ) is null
    or pg_get_functiondef(
      to_regprocedure(
        'public.set_activity_semantic_enrichment_updated_at_cux4()'
      )
    ) ilike '%clock_timestamp()%',
    jsonb_build_object(
      'procedure',
      to_regprocedure(
        'public.set_activity_semantic_enrichment_updated_at_cux4()'
      )::text
    )

  union all

  select
    50,
    'no_existing_enrichment_rows',
    not exists (
      select 1
      from public.activity_semantic_enrichment_runs_cux4
    ),
    jsonb_build_object(
      'rows',
      (
        select count(*)
        from public.activity_semantic_enrichment_runs_cux4
      )
    )

  union all

  select
    60,
    'owned_planned_activity_available',
    exists (
      select 1
      from public.activity_events activity_event
      join public.actors actor
        on actor.id=activity_event.acting_as_actor_id
       and actor.status='active'
      join public.app_users app_user
        on app_user.id=activity_event.user_id
      where activity_event.activity_role_code='planned'
        and coalesce(app_user.access_status,'active') <> 'blocked'
    ),
    jsonb_build_object(
      'count',
      (
        select count(*)
        from public.activity_events activity_event
        join public.actors actor
          on actor.id=activity_event.acting_as_actor_id
         and actor.status='active'
        join public.app_users app_user
          on app_user.id=activity_event.user_id
        where activity_event.activity_role_code='planned'
          and coalesce(app_user.access_status,'active') <> 'blocked'
      )
    )
)
select
  row_number() over(order by ord) as check_no,
  check_code,
  passed,
  details
from checks
order by ord;
