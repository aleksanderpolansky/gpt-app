-- ARCTor.app
-- CUX4A1 runtime acceptance
--
-- Creates one fixture planned activity and one enrichment run.
-- The helper self-cleans fixture rows before returning.
-- It leaves only the helper function, removed by the next cleanup script.

create or replace function public.cux4a1_runtime_acceptance_helper_20260728()
returns table(
  check_no integer,
  check_code text,
  passed boolean,
  details jsonb
)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $function$
declare
  v_owner_user_id uuid;
  v_owner_actor_id uuid;
  v_activity_result jsonb;
  v_activity_id uuid;
  v_create_result jsonb;
  v_replay_result jsonb;
  v_claim_result jsonb;
  v_finish_result jsonb;
  v_run_id uuid;
  v_fixture_key text;
  v_conflict_rejected boolean := false;
  v_checks jsonb := '[]'::jsonb;
  v_residual_runs bigint;
  v_residual_activities bigint;
  v_residual_operations bigint;
begin
  select profile.owner_user_id, profile.actor_id
  into v_owner_user_id, v_owner_actor_id
  from public.actor_public_profiles profile
  join public.actors actor
    on actor.id=profile.actor_id
   and actor.status='active'
  join public.app_users app_user
    on app_user.id=profile.owner_user_id
  where coalesce(app_user.access_status,'active') <> 'blocked'
  order by profile.actor_id
  limit 1;

  v_checks := v_checks || jsonb_build_array(
    jsonb_build_object(
      'check_code','owned_actor_available',
      'passed',v_owner_user_id is not null and v_owner_actor_id is not null,
      'details',jsonb_build_object(
        'ownerUserId',v_owner_user_id,
        'ownerActorId',v_owner_actor_id
      )
    )
  );

  if v_owner_user_id is null or v_owner_actor_id is null then
    return query
    select
      row_number() over()::integer,
      item->>'check_code',
      coalesce((item->>'passed')::boolean,false),
      coalesce(item->'details','{}'::jsonb)
    from jsonb_array_elements(v_checks) item;
    return;
  end if;

  v_fixture_key :=
    'cux4a1-runtime-20260728-'
    || replace(gen_random_uuid()::text,'-','');

  select public.create_activity_event_pp1_v1(
    v_owner_user_id,
    v_owner_actor_id,
    v_fixture_key,
    jsonb_build_object(
      'activityRoleCode','planned',
      'title','CUX4A1 runtime fixture',
      'inputText','CUX4A1 runtime fixture',
      'source','system',
      'status','planned',
      'privacyScope','private',
      'scheduleModeCode','unscheduled',
      'createCalendarProjection',false,
      'metadata',jsonb_build_object(
        'cux4a1RuntimeFixture',true,
        'fixtureKey',v_fixture_key
      )
    ),
    '{}'::uuid[]
  )
  into v_activity_result;

  v_activity_id := nullif(
    v_activity_result->'activityEvent'->>'id',
    ''
  )::uuid;

  v_checks := v_checks || jsonb_build_array(
    jsonb_build_object(
      'check_code','fixture_activity_created',
      'passed',
        v_activity_result->>'disposition'='created'
        and v_activity_id is not null,
      'details',v_activity_result
    )
  );

  select public.create_activity_semantic_enrichment_run_cux4_v1(
    v_owner_user_id,
    v_owner_actor_id,
    v_activity_id,
    v_fixture_key || ':analysis',
    'ru',
    'CUX4A1 runtime fixture',
    jsonb_build_object(
      'title',true,
      'schedule',true
    ),
    array['planned_target_links']::text[],
    jsonb_build_object(
      'fixture',true,
      'fixtureKey',v_fixture_key
    )
  )
  into v_create_result;

  v_run_id := nullif(v_create_result->'run'->>'id','')::uuid;

  v_checks := v_checks || jsonb_build_array(
    jsonb_build_object(
      'check_code','run_created_pending',
      'passed',
        v_create_result->>'disposition'='created'
        and v_create_result->'run'->>'status'='pending'
        and v_run_id is not null,
      'details',v_create_result
    )
  );

  select public.create_activity_semantic_enrichment_run_cux4_v1(
    v_owner_user_id,
    v_owner_actor_id,
    v_activity_id,
    v_fixture_key || ':analysis',
    'ru',
    'CUX4A1 runtime fixture',
    jsonb_build_object(
      'title',true,
      'schedule',true
    ),
    array['planned_target_links']::text[],
    jsonb_build_object(
      'fixture',true,
      'fixtureKey',v_fixture_key
    )
  )
  into v_replay_result;

  v_checks := v_checks || jsonb_build_array(
    jsonb_build_object(
      'check_code','run_idempotent_replay',
      'passed',
        v_replay_result->>'disposition'='idempotent_replay'
        and v_replay_result->'run'->>'id'=v_run_id::text,
      'details',v_replay_result
    )
  );

  begin
    perform public.create_activity_semantic_enrichment_run_cux4_v1(
      v_owner_user_id,
      v_owner_actor_id,
      v_activity_id,
      v_fixture_key || ':analysis',
      'ru',
      'DIFFERENT PAYLOAD',
      '{}'::jsonb,
      '{}'::text[],
      '{}'::jsonb
    );
  exception
    when others then
      v_conflict_rejected :=
        sqlerrm like '%CUX4A1_RUN_IDEMPOTENCY_CONFLICT%';
  end;

  v_checks := v_checks || jsonb_build_array(
    jsonb_build_object(
      'check_code','idempotency_conflict_rejected',
      'passed',v_conflict_rejected,
      'details',jsonb_build_object(
        'expected','CUX4A1_RUN_IDEMPOTENCY_CONFLICT'
      )
    )
  );

  select public.claim_activity_semantic_enrichment_run_cux4_v1(
    v_owner_user_id,
    v_owner_actor_id,
    v_run_id
  )
  into v_claim_result;

  v_checks := v_checks || jsonb_build_array(
    jsonb_build_object(
      'check_code','run_claimed_processing',
      'passed',
        coalesce((v_claim_result->>'claimed')::boolean,false)
        and v_claim_result->'run'->>'status'='processing'
        and (v_claim_result->'run'->>'attempt_no')::integer=1,
      'details',v_claim_result
    )
  );

  select public.finish_activity_semantic_enrichment_run_cux4_v1(
    v_owner_user_id,
    v_owner_actor_id,
    v_run_id,
    'processed',
    jsonb_build_object(
      'activityTitle','CUX4A1 normalized fixture',
      'timingDraft',jsonb_build_object(
        'scheduleModeCode','unscheduled'
      )
    ),
    null
  )
  into v_finish_result;

  v_checks := v_checks || jsonb_build_array(
    jsonb_build_object(
      'check_code','run_finished_processed',
      'passed',
        v_finish_result->>'disposition'='finished'
        and v_finish_result->'run'->>'status'='processed'
        and v_finish_result->'run'->'result_json'
          ->>'activityTitle'='CUX4A1 normalized fixture',
      'details',v_finish_result
    )
  );

  delete from public.activity_semantic_enrichment_runs_cux4
  where activity_event_id=v_activity_id;

  delete from public.activity_event_write_operations
  where activity_event_id=v_activity_id;

  delete from public.calendar_events
  where related_activity_event_id=v_activity_id;

  delete from public.activity_value_object_links
  where activity_event_id=v_activity_id;

  delete from public.activity_events
  where id=v_activity_id;

  select count(*)
  into v_residual_runs
  from public.activity_semantic_enrichment_runs_cux4
  where input_snapshot_json->>'fixtureKey'=v_fixture_key;

  select count(*)
  into v_residual_activities
  from public.activity_events
  where metadata_json->>'fixtureKey'=v_fixture_key;

  select count(*)
  into v_residual_operations
  from public.activity_event_write_operations
  where idempotency_key=v_fixture_key;

  v_checks := v_checks || jsonb_build_array(
    jsonb_build_object(
      'check_code','fixture_run_cleanup',
      'passed',v_residual_runs=0,
      'details',jsonb_build_object('residual',v_residual_runs)
    ),
    jsonb_build_object(
      'check_code','fixture_activity_cleanup',
      'passed',v_residual_activities=0,
      'details',jsonb_build_object('residual',v_residual_activities)
    ),
    jsonb_build_object(
      'check_code','fixture_operation_cleanup',
      'passed',v_residual_operations=0,
      'details',jsonb_build_object('residual',v_residual_operations)
    )
  );

  return query
  select
    row_number() over()::integer,
    item->>'check_code',
    coalesce((item->>'passed')::boolean,false),
    coalesce(item->'details','{}'::jsonb)
  from jsonb_array_elements(v_checks) item;
end
$function$;

revoke all
on function public.cux4a1_runtime_acceptance_helper_20260728()
from public, anon, authenticated;

grant execute
on function public.cux4a1_runtime_acceptance_helper_20260728()
to service_role;

select *
from public.cux4a1_runtime_acceptance_helper_20260728();
