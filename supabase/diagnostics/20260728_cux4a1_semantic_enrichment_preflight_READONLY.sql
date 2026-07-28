-- ARCTor.app
-- CUX4A1 preflight — READ ONLY

with checks as (
  select 10 as ord, 'app_users_exists' as check_code,
    to_regclass('public.app_users') is not null as passed,
    jsonb_build_object('regclass',to_regclass('public.app_users')::text) as details
  union all
  select 20,'actors_exists',
    to_regclass('public.actors') is not null,
    jsonb_build_object('regclass',to_regclass('public.actors')::text)
  union all
  select 30,'actor_public_profiles_exists',
    to_regclass('public.actor_public_profiles') is not null,
    jsonb_build_object('regclass',to_regclass('public.actor_public_profiles')::text)
  union all
  select 40,'activity_events_exists',
    to_regclass('public.activity_events') is not null,
    jsonb_build_object('regclass',to_regclass('public.activity_events')::text)
  union all
  select 50,'pp1_create_rpc_exists',
    to_regprocedure(
      'public.create_activity_event_pp1_v1(uuid,uuid,text,jsonb,uuid[])'
    ) is not null,
    jsonb_build_object(
      'procedure',
      to_regprocedure(
        'public.create_activity_event_pp1_v1(uuid,uuid,text,jsonb,uuid[])'
      )::text
    )
  union all
  select 60,'updated_at_function_exists',
    to_regprocedure('public.set_activity_recording_updated_at()') is not null,
    jsonb_build_object(
      'procedure',
      to_regprocedure('public.set_activity_recording_updated_at()')::text
    )
  union all
  select 70,'pgcrypto_digest_exists',
    to_regprocedure('extensions.digest(bytea,text)') is not null,
    jsonb_build_object(
      'procedure',
      to_regprocedure('extensions.digest(bytea,text)')::text
    )
  union all
  select 80,'no_table_collision',
    to_regclass('public.activity_semantic_enrichment_runs_cux4') is null,
    jsonb_build_object(
      'existing',
      to_regclass('public.activity_semantic_enrichment_runs_cux4')::text
    )
  union all
  select 90,'no_function_collision',
    not exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public'
        and p.proname in (
          'enforce_activity_semantic_enrichment_run_cux4',
          'create_activity_semantic_enrichment_run_cux4_v1',
          'claim_activity_semantic_enrichment_run_cux4_v1',
          'finish_activity_semantic_enrichment_run_cux4_v1'
        )
    ),
    coalesce((
      select jsonb_build_object(
        'functions',
        jsonb_agg(p.proname order by p.proname)
      )
      from pg_proc p
      join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public'
        and p.proname in (
          'enforce_activity_semantic_enrichment_run_cux4',
          'create_activity_semantic_enrichment_run_cux4_v1',
          'claim_activity_semantic_enrichment_run_cux4_v1',
          'finish_activity_semantic_enrichment_run_cux4_v1'
        )
    ), jsonb_build_object('functions','[]'::jsonb))
  union all
  select 100,'owned_active_actor_available',
    exists (
      select 1
      from public.actor_public_profiles profile
      join public.actors actor
        on actor.id=profile.actor_id
       and actor.status='active'
      join public.app_users app_user
        on app_user.id=profile.owner_user_id
      where coalesce(app_user.access_status,'active') <> 'blocked'
    ),
    jsonb_build_object(
      'count',
      (
        select count(*)
        from public.actor_public_profiles profile
        join public.actors actor
          on actor.id=profile.actor_id
         and actor.status='active'
        join public.app_users app_user
          on app_user.id=profile.owner_user_id
        where coalesce(app_user.access_status,'active') <> 'blocked'
      )
    )
  union all
  select 110,'info_test_activity_rows',
    true,
    jsonb_build_object(
      'activity_events',(select count(*) from public.activity_events),
      'calendar_events',(select count(*) from public.calendar_events),
      'write_operations',(
        select count(*) from public.activity_event_write_operations
      )
    )
)
select
  row_number() over(order by ord,check_code) as check_no,
  check_code,
  passed,
  details
from checks
order by ord,check_code;
